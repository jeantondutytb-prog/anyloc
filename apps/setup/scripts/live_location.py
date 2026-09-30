#!/usr/bin/env python3
"""
Keep one DVT location-simulation session open and move the iPhone for every
"lat lng" line read on stdin. Walking used to respawn `simulate-location set`
(and its tunnel) for each step, which made the position jump every ~2 s.

pymobiledevice3's own `simulate-location set/play` block their asyncio loop in
wait_return() once done, which starves the --userspace tunnel: the iPhone goes
back to its real position after a few seconds. Here the loop keeps running and
the session holds until stdin closes.

Prints "ready" once connected and "applied" after each location is set.

Usage: python3 live_location.py stream --userspace [--udid UDID]
       python3 live_location.py play --userspace [--udid UDID] ROUTE.gpx
"""

import asyncio
import sys
from pathlib import Path
from typing import Annotated

import typer
from typer_injector import InjectingTyper

from pymobiledevice3.cli.cli_common import ServiceProviderDep, async_command
from pymobiledevice3.services.dvt.instruments.dvt_provider import DvtProvider
from pymobiledevice3.services.dvt.instruments.location_simulation import LocationSimulation

cli = InjectingTyper(name="live-location", no_args_is_help=True)


async def wait_stdin_closed(loop: asyncio.AbstractEventLoop) -> None:
    while await loop.run_in_executor(None, sys.stdin.readline):
        pass


@cli.command("stream")
@async_command
async def stream(service_provider: ServiceProviderDep) -> None:
    """Apply each "lat lng" stdin line; exit when stdin closes."""
    loop = asyncio.get_running_loop()
    async with DvtProvider(service_provider) as dvt, LocationSimulation(dvt) as location_simulation:
        print("ready", flush=True)
        while True:
            line = await loop.run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            parts = line.split()
            if len(parts) != 2:
                continue
            try:
                lat, lng = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            await location_simulation.set(lat, lng)
            print("applied", flush=True)


@cli.command("play")
@async_command
async def play(
    service_provider: ServiceProviderDep,
    filename: Annotated[Path, typer.Argument(exists=True, file_okay=True, dir_okay=False)],
) -> None:
    """Replay a GPX route, then hold its last point until stdin closes."""
    loop = asyncio.get_running_loop()
    async with DvtProvider(service_provider) as dvt, LocationSimulation(dvt) as location_simulation:
        print("ready", flush=True)
        await location_simulation.play_gpx_file(str(filename))
        print("done", flush=True)
        await wait_stdin_closed(loop)


if __name__ == "__main__":
    cli()
