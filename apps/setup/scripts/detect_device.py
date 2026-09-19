#!/usr/bin/env python3
"""Detect USB-connected iOS devices."""

from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
import sys


from pmd3_cmd import pmd3_argv


def run_cli(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, capture_output=True, text=True, check=False)


def detect_with_pymobiledevice3_cli() -> dict | None:
    result = run_cli(pmd3_argv("usbmux", "list"))
    if result.returncode != 0:
        return None

    try:
        devices = json.loads(result.stdout or "[]")
    except json.JSONDecodeError:
        return None

    if not devices:
        return {
            "connected": False,
            "udid": None,
            "deviceName": None,
            "message": (
                "Aucun iPhone en USB. Déverrouille l'iPhone, branche-le, appuie sur "
                "« Faire confiance », puis Revérifier."
            ),
        }

    device = devices[0]
    udid = device.get("UniqueDeviceID") or device.get("Identifier")
    name = device.get("DeviceName") or f"iPhone ({str(udid)[:8]}…)"

    return {
        "connected": True,
        "udid": udid,
        "deviceName": name,
        "message": "iPhone détecté — prêt pour l'installation.",
    }


def detect_with_pymobiledevice3_api() -> dict | None:
    try:
        from pymobiledevice3.usbmux import list_devices
    except ImportError:
        return None

    async def fetch_devices():
        result = list_devices()
        if asyncio.iscoroutine(result):
            return await result
        return result

    try:
        devices = asyncio.run(fetch_devices())
    except Exception:
        return None

    if not devices:
        return {
            "connected": False,
            "udid": None,
            "deviceName": None,
            "message": "Aucun iPhone détecté en USB.",
        }

    device = devices[0]
    serial = getattr(device, "serial", None) or str(device)

    return {
        "connected": True,
        "udid": serial,
        "deviceName": f"iPhone ({serial[:8]}…)",
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
                "Aucun iPhone en USB. Branche-le, déverrouille, appuie sur « Faire confiance »."
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
    for detector in (
        detect_with_pymobiledevice3_cli,
        detect_with_pymobiledevice3_api,
        detect_with_idevice_id,
    ):
        result = detector()
        if result is not None:
            return result

    return {
        "connected": False,
        "udid": None,
        "deviceName": None,
        "message": (
            "Outils USB non installés. Sur Windows : installe Python 3 (coche Add to PATH) "
            "et Apple Devices, puis relance Anyloc. Sur Mac : pip3 install pymobiledevice3."
        ),
    }


if __name__ == "__main__":
    print(json.dumps(detect()))
