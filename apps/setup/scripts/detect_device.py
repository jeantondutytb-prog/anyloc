#!/usr/bin/env python3
"""Detect USB-connected iOS devices."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys


def detect_with_pymobiledevice3() -> dict | None:
    try:
        from pymobiledevice3.usbmux import list_devices
    except ImportError:
        return None

    devices = list_devices()

    if not devices:
        return {
            "connected": False,
            "udid": None,
            "deviceName": None,
            "message": "Aucun iPhone détecté en USB.",
        }

    device = devices[0]
    return {
        "connected": True,
        "udid": device.serial,
        "deviceName": f"iPhone ({device.serial[:8]}…)",
        "message": "iPhone détecté — prêt pour l'installation.",
    }


def detect_with_idevice_id() -> dict | None:
    if not shutil.which("idevice_id"):
        return None

    result = subprocess.run(
        ["idevice_id", "-l"],
        capture_output=True,
        text=True,
        check=False,
    )

    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]

    if not lines:
        return {
            "connected": False,
            "udid": None,
            "deviceName": None,
            "message": "Aucun iPhone détecté en USB.",
        }

    udid = lines[0]
    return {
        "connected": True,
        "udid": udid,
        "deviceName": f"iPhone ({udid[:8]}…)",
        "message": "iPhone détecté — prêt pour l'installation.",
    }


def detect() -> dict:
    for detector in (detect_with_pymobiledevice3, detect_with_idevice_id):
        result = detector()
        if result is not None:
            return result

    return {
        "connected": False,
        "udid": None,
        "deviceName": None,
        "message": (
            "Outils USB non installés sur ton Mac. Ouvre Terminal et lance : "
            "pip3 install pymobiledevice3 — puis clique Revérifier."
        ),
    }


if __name__ == "__main__":
    print(json.dumps(detect()))
