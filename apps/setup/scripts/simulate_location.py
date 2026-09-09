#!/usr/bin/env python3
"""Fetch Anyloc dashboard location and apply it on a connected iPhone via USB."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import urllib.error
import urllib.request


def fetch_location(api_base_url: str, token: str) -> dict:
    url = f"{api_base_url.rstrip('/')}/api/device/location"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")

        try:
            payload = json.loads(body)
            message = payload.get("error") or body
        except json.JSONDecodeError:
            message = body or f"Erreur HTTP {error.code}"

        return {
            "ok": False,
            "message": message,
        }
    except urllib.error.URLError as error:
        return {
            "ok": False,
            "message": f"Impossible de joindre l'API Anyloc : {error.reason}",
        }


def run_pmd3(command: list[str]) -> dict:
    if not shutil.which("pymobiledevice3"):
        return {
            "ok": False,
            "message": "pymobiledevice3 introuvable. Terminal : pip3 install pymobiledevice3",
        }

    result = subprocess.run(command, capture_output=True, text=True, check=False)
    output = (result.stderr or result.stdout or "").strip()

    if result.returncode == 0:
        return {
            "ok": True,
            "output": output,
        }

    return {
        "ok": False,
        "message": output or "Échec de la commande pymobiledevice3.",
    }


def build_location_command(
    action: str,
    udid: str | None,
    userspace: bool,
    latitude: float | None = None,
    longitude: float | None = None,
) -> list[str]:
    command = ["pymobiledevice3", "developer", "dvt", "simulate-location", action]

    if userspace:
        command.append("--userspace")

    if udid:
        command.extend(["--udid", udid])

    if action == "set" and latitude is not None and longitude is not None:
        command.extend(["--", str(latitude), str(longitude)])

    return command


def clear_location(udid: str | None, userspace: bool) -> dict:
    return run_pmd3(build_location_command("clear", udid, userspace))


def set_location(
    latitude: float,
    longitude: float,
    udid: str | None,
    userspace: bool,
) -> dict:
    return run_pmd3(
        build_location_command("set", udid, userspace, latitude, longitude)
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-base-url", default="https://anyloc.io")
    parser.add_argument("--token", required=True)
    parser.add_argument("--udid")
    parser.add_argument("--userspace", action="store_true", default=True)
    parser.add_argument("--no-userspace", action="store_false", dest="userspace")
    args = parser.parse_args()

    payload = fetch_location(args.api_base_url, args.token)

    if payload.get("ok") is False:
        print(json.dumps(payload))
        return 1

    location = payload.get("location") or {}
    device = payload.get("device") or {}

    if not location.get("isActive"):
        result = clear_location(args.udid, args.userspace)

        if not result.get("ok"):
            print(json.dumps(result))
            return 1

        print(
            json.dumps(
                {
                    "ok": True,
                    "action": "cleared",
                    "message": "Position simulée désactivée sur l'iPhone.",
                    "location": location,
                    "device": device,
                }
            )
        )
        return 0

    latitude = location.get("lat")
    longitude = location.get("lng")

    if latitude is None or longitude is None:
        print(
            json.dumps(
                {
                    "ok": False,
                    "message": "Aucune coordonnée GPS active sur ton dashboard.",
                }
            )
        )
        return 1

    result = set_location(latitude, longitude, args.udid, args.userspace)

    if not result.get("ok"):
        print(json.dumps(result))
        return 1

    location_name = location.get("name") or "Position choisie"

    print(
        json.dumps(
            {
                "ok": True,
                "action": "set",
                "message": f"GPS appliqué : {location_name} ({latitude}, {longitude})",
                "location": location,
                "device": device,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
