#!/usr/bin/env python3
"""Deploy pairing.plist into the Anyloc iOS app container (macOS + devicectl)."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

BUNDLE_ID = "io.anyloc.app"
PAIRING_DEST = "Documents/pairing.plist"


def run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, check=False)


def find_pair_host() -> str | None:
    for candidate in ("pair_host", "/opt/homebrew/bin/pair_host"):
        if shutil.which(candidate):
            return candidate
    return None


def generate_pairing(host_tool: str, udid: str | None) -> Path | None:
    temp_dir = Path(tempfile.mkdtemp(prefix="anyloc-pairing-"))
    output = temp_dir / "pairing.plist"

    command = [host_tool, "--name", "Anyloc", "--out", str(output)]
    if udid:
        command.extend(["--udid", udid])

    result = run(command)
    if result.returncode != 0 or not output.exists():
        return None

    return output


def deploy_with_devicectl(pairing_path: Path, udid: str | None) -> dict:
    if not shutil.which("xcrun"):
        return {
            "ok": False,
            "message": "xcrun introuvable — pairing.plist non copié.",
        }

    command = [
        "xcrun",
        "devicectl",
        "device",
        "copy",
        "to",
        "--domain-type",
        "appDataContainer",
        "--domain-identifier",
        BUNDLE_ID,
        "--source",
        str(pairing_path),
        "--destination",
        PAIRING_DEST,
    ]

    if udid:
        command.extend(["--device", udid])

    result = run(command)

    if result.returncode == 0:
        return {
            "ok": True,
            "message": "pairing.plist copié dans Anyloc — LocalDevVPN requis pour le GPS.",
        }

    output = (result.stderr or result.stdout or "").strip()
    return {
        "ok": False,
        "message": output or "Échec de la copie pairing.plist via devicectl.",
    }


def main() -> int:
    args = sys.argv[1:]
    udid = None
    if "--udid" in args:
        index = args.index("--udid")
        if index + 1 < len(args):
            udid = args[index + 1]

    host_tool = find_pair_host()
    if not host_tool:
        print(
            json.dumps(
                {
                    "ok": False,
                    "message": (
                        "pair_host introuvable. Installe jkcoxson/idevice ou "
                        "ajoute pairing.plist manuellement dans Anyloc."
                    ),
                }
            )
        )
        return 1

    pairing_path = generate_pairing(host_tool, udid)
    if not pairing_path:
        print(
            json.dumps(
                {
                    "ok": False,
                    "message": "Impossible de générer pairing.plist pour cet iPhone.",
                }
            )
        )
        return 1

    result = deploy_with_devicectl(pairing_path, udid)
    print(json.dumps(result))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
