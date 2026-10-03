#!/usr/bin/env python3
"""
Keep one DVT location-simulation session open and move the iPhone for every
"lat lng" line read on stdin. Walking used to respawn `simulate-location set`
(and its tunnel) for each step, which made the position jump every ~2 s.

pymobiledevice3's own `simulate-location set/play` block their asyncio loop in
wait_return() once done, which starves the userspace tunnel: the iPhone goes
back to its real position after a few seconds. Here the loop keeps running and
the session holds until stdin closes.

The iPhone is reached over USB when it is plugged in, otherwise over Wi-Fi
(same network) through the RemotePairing record `lockdown remotepairing --pair`
wrote while it was plugged in. Both use the no-root userspace tunnel.

Prints "ready" once connected, "applied" after each location is set and
"cleared" after a "clear" line.

Usage: python3 live_location.py stream [--udid UDID]
       python3 live_location.py play [--udid UDID] ROUTE.gpx
       python3 live_location.py clear [--udid UDID]
"""

import asyncio
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Optional

import typer

from packaging.version import Version
from pymobiledevice3 import usbmux
from pymobiledevice3.exceptions import AlreadyMountedError, DeveloperModeIsNotEnabledError
from pymobiledevice3.pair_records import iter_remote_paired_identifiers
from pymobiledevice3.remote import tunnel_service, userspace_tunnel
from pymobiledevice3.services.dvt.instruments.dvt_provider import DvtProvider
from pymobiledevice3.services.dvt.instruments.location_simulation import LocationSimulation
from pymobiledevice3.services.mobile_image_mounter import (
    DeveloperDiskImageMounter,
    PersonalizedImageMounter,
    auto_mount,
)

cli = typer.Typer(name="live-location", no_args_is_help=True)

UdidOption = Annotated[Optional[str], typer.Option("--udid", help="Target device UDID")]

# Matched by humanizePmd3Error in src/usb.js.
NO_DEVICE_MESSAGE = (
    "AnylocNoDevice: iPhone not found over USB nor on this Wi-Fi network."
)
DDI_FAILED_MESSAGE = "AnylocDdiFailed: could not mount the Developer Disk Image."


async def _wifi_tunnel_provider(serial, autopair, remotepairing_fallback=True):
    # Same contract as userspace_tunnel._create_no_root_tunnel_provider, but
    # skips usbmux and goes straight to RemotePairing over bonjour (Wi-Fi).
    services = await tunnel_service.get_remote_pairing_tunnel_services(udid=serial)
    if not services:
        raise ConnectionError(NO_DEVICE_MESSAGE)
    return services[0], None


async def _usb_serial(udid: Optional[str]) -> Optional[str]:
    try:
        device = await usbmux.select_device(udid, connection_type="USB")
    except Exception:
        # No usbmuxd (e.g. Windows without Apple Devices): Wi-Fi only.
        return None
    return device.serial if device else None


@asynccontextmanager
async def location_simulation(udid: Optional[str]):
    serial = await _usb_serial(udid)
    if serial is None:
        if not any(True for _ in iter_remote_paired_identifiers()):
            raise ConnectionError(NO_DEVICE_MESSAGE)
        # pymobiledevice3 10.10.3 has no public hook to pick the RemotePairing
        # provider; the version is pinned in src/python-setup.js.
        userspace_tunnel._create_no_root_tunnel_provider = _wifi_tunnel_provider
        # None lets any paired iPhone found on the network answer.
        serial = udid

    # The location service only exists once Apple's Developer Disk Image is
    # mounted. Xcode does it on a developer's iPhone; a customer's iPhone never
    # had it, and a reboot unmounts it. The device lists its services when the
    # tunnel opens, so after a fresh mount the tunnel is opened again.
    async with userspace_tunnel.UserspaceRsdTunnel(serial=serial) as rsd:
        mounted_now = await ensure_developer_image(rsd)
        if not mounted_now:
            async with DvtProvider(rsd) as dvt, LocationSimulation(dvt) as simulation:
                yield simulation
            return

    async with (
        userspace_tunnel.UserspaceRsdTunnel(serial=serial) as rsd,
        DvtProvider(rsd) as dvt,
        LocationSimulation(dvt) as simulation,
    ):
        yield simulation


async def ensure_developer_image(provider) -> bool:
    """Mount the Developer Disk Image if needed; True when it was mounted now."""
    personalized = Version(provider.product_version) >= Version("17.0")
    mounter = (PersonalizedImageMounter if personalized else DeveloperDiskImageMounter)(provider)
    if await mounter.is_image_mounted(mounter.IMAGE_TYPE):
        return False
    try:
        # Downloads the image once (cached in ~/.pymobiledevice3), then Apple
        # signs it for this iPhone: needs internet the first time.
        await auto_mount(provider)
    except AlreadyMountedError:
        return False
    except DeveloperModeIsNotEnabledError:
        raise
    except Exception as error:
        raise RuntimeError(f"{DDI_FAILED_MESSAGE} ({type(error).__name__}: {error})") from error
    return True


async def wait_stdin_closed(loop: asyncio.AbstractEventLoop) -> None:
    while await loop.run_in_executor(None, sys.stdin.readline):
        pass


async def _stream(udid: Optional[str]) -> None:
    loop = asyncio.get_running_loop()
    async with location_simulation(udid) as simulation:
        print("ready", flush=True)
        while True:
            line = await loop.run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            parts = line.split()
            if parts == ["clear"]:
                await simulation.clear()
                print("cleared", flush=True)
                continue
            if len(parts) != 2:
                continue
            try:
                lat, lng = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            await simulation.set(lat, lng)
            print("applied", flush=True)


async def _play(udid: Optional[str], filename: Path) -> None:
    loop = asyncio.get_running_loop()
    async with location_simulation(udid) as simulation:
        print("ready", flush=True)
        await simulation.play_gpx_file(str(filename))
        print("done", flush=True)
        await wait_stdin_closed(loop)


async def _clear(udid: Optional[str]) -> None:
    async with location_simulation(udid) as simulation:
        await simulation.clear()
        print("cleared", flush=True)


@cli.command("stream")
def stream(udid: UdidOption = None) -> None:
    """Apply each "lat lng" (or "clear") stdin line; exit when stdin closes."""
    asyncio.run(_stream(udid))


@cli.command("play")
def play(
    filename: Annotated[Path, typer.Argument(exists=True, file_okay=True, dir_okay=False)],
    udid: UdidOption = None,
) -> None:
    """Replay a GPX route, then hold its last point until stdin closes."""
    asyncio.run(_play(udid, filename))


@cli.command("clear")
def clear(udid: UdidOption = None) -> None:
    """Stop simulating the location."""
    asyncio.run(_clear(udid))


if __name__ == "__main__":
    cli()
