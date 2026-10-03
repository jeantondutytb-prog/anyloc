#!/usr/bin/env python3
"""Make the iPhone trust this computer, right at the "plug" step.

`usbmux list` never asks for trust, so without this the "Faire confiance"
prompt only appeared later, in the middle of another step. Prints one JSON
line: {"trusted": true} or {"trusted": false, "reason": "..."}.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import time

from pymobiledevice3.exceptions import (
    PairingDialogResponsePendingError,
    PasswordRequiredError,
    UserDeniedPairingError,
)
from pymobiledevice3.lockdown import create_using_usbmux


async def trust(udid: str | None, wait: float) -> dict:
    deadline = time.time() + wait
    reason = "pending"

    while time.time() < deadline:
        lockdown = await create_using_usbmux(serial=udid, autopair=False)
        try:
            if lockdown.paired:
                return {"trusted": True}
            try:
                await lockdown.pair(timeout=max(1.0, deadline - time.time()))
                return {"trusted": True}
            except PasswordRequiredError:
                # Pairing needs the iPhone unlocked: wait for the customer.
                reason = "locked"
            except UserDeniedPairingError:
                return {"trusted": False, "reason": "denied"}
            except PairingDialogResponsePendingError:
                reason = "pending"
        finally:
            await lockdown.close()
        await asyncio.sleep(2)

    return {"trusted": False, "reason": reason}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--udid")
    parser.add_argument("--wait", type=float, default=60)
    args = parser.parse_args()

    try:
        result = asyncio.run(trust(args.udid, args.wait))
    except Exception as error:  # noqa: BLE001 - reported to the app as JSON
        result = {"trusted": False, "reason": "error", "error": f"{type(error).__name__}: {error}"}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
