#!/usr/bin/env python3
"""Detect USB-connected iOS devices."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys


def run_cli(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, capture_output=True, text=True, check=False)


def detect_with_pymobiledevice3() -> dict | None:
    try:
        from pymobiledevice3.usbmux import list_devices
        from pymobiledevice3.lockdown import create_using_usbmux
        from pymobiledevice3.exceptions import NotPairedError
    except ImportError:
        return None

    devices = list_devices()

    if not devices:
        cli = shutil.which("pymobiledevice3")
        if cli:
            result = run_cli([cli, "usbmux", "list"])
            if result.stdout.strip() and result.stdout.strip() not in ("[]", ""):
                return {
                    "connected": False,
                    "udid": None,
                    "deviceName": None,
                    "message": (
                        "iPhone branché mais pas appairé. Ouvre Xcode ou le Finder, "
                        "puis dans Terminal : pymobiledevice3 lockdown pair"
                    ),
                }

        return {
            "connected": False,
            "udid": None,
            "deviceName": None,
            "message": (
                "Aucun iPhone en USB. Déverrouille l'iPhone, branche-le, ouvre le Finder "
                "(ou Xcode) pour déclencher « Faire confiance », puis Revérifier."
            ),
        }

    device = devices[0]

    try:
        create_using_usbmux(device.serial, autopair=True)
    except NotPairedError:
        return {
            "connected": False,
            "udid": device.serial,
            "deviceName": f"iPhone ({device.serial[:8]}…)",
            "message": (
                "iPhone visible mais pas appairé. Lance : pymobiledevice3 lockdown pair "
                "— accepte sur l'iPhone si demandé."
            ),
        }
    except Exception:
        pass

    return {
        "connected": True,
        "udid": device.serial,
        "deviceName": f"iPhone ({device.serial[:8]}…)",
        "message": "iPhone détecté — prêt pour l'installation.",
    }


def detect_with_idevice_id() -> dict | None:
    if not shutil.which("idevice_id"):
        return None

    result = run_cli(["idevice_id", "-l"])
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]

    if not lines:
        return {
            "connected": False,
            "udid": None,
            "deviceName": None,
            "message": (
                "Aucun iPhone en USB. Ouvre le Finder avec l'iPhone branché pour "
                "déclencher « Faire confiance »."
            ),
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
            "pip3 install pymobiledevice3 — puis relance Anyloc Setup."
        ),
    }


if __name__ == "__main__":
    print(json.dumps(detect()))
