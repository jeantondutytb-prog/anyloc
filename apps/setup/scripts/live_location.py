#!/usr/bin/env python3
"""
Keep one DVT location-simulation session open and move the iPhone for every
"lat lng" line read on stdin. Walking used to respawn `simulate-location set`
(and its tunnel) for each step, which made the position jump every ~2 s.

Usage: python3 live_location.py stream --userspace [--udid UDID]
"""

import asyncio
import sys

from typer_injector import InjectingTyper

from pymobiledevice3.cli.cli_common import ServiceProviderDep, async_command
from pymobiledevice3.services.dvt.instruments.dvt_provider import DvtProvider
from pymobiledevice3.services.dvt.instruments.location_simulation import LocationSimulation

cli = InjectingTyper(name="live-location", no_args_is_help=True)


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


@cli.command("noop", hidden=True)
def noop() -> None:
    """Keeps typer in multi-command mode so `stream` stays a subcommand."""


if __name__ == "__main__":
    cli()
