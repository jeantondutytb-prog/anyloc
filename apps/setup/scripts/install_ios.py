#!/usr/bin/env python3
"""Install Anyloc iOS app on a connected device."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def install_with_pymobiledevice3(ipa_path: Path, udid: str | None) -> dict:
    if not shutil.which("pymobiledevice3"):
        return {
            "ok": False,
            "message": "pymobiledevice3 non installé. Lance: pip install pymobiledevice3",
        }

    command = ["pymobiledevice3", "apps", "install", str(ipa_path)]

    if udid:
        command.extend(["--udid", udid])

    result = subprocess.run(command, capture_output=True, text=True, check=False)

    if result.returncode == 0:
        return {
            "ok": True,
            "message": "Anyloc installé sur ton iPhone. Ouvre l'app et colle ton token.",
            "udid": udid,
            "output": result.stdout.strip(),
        }

    error_output = (result.stderr or result.stdout or "").strip()

    return {
        "ok": False,
        "message": error_output or "Échec de l'installation. Vérifie le mode développeur et la confiance USB.",
        "udid": udid,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ipa", required=True)
    parser.add_argument("--udid")
    args = parser.parse_args()

    ipa_path = Path(args.ipa)

    if not ipa_path.exists():
        print(
            json.dumps(
                {
                    "ok": False,
                    "message": (
                        f"IPA introuvable: {ipa_path}. "
                        "Build l'app iOS depuis apps/ios/ puis exporte vers apps/ios/dist/Anyloc.ipa"
                    ),
                }
            )
        )
        return 1

    result = install_with_pymobiledevice3(ipa_path, args.udid)
    print(json.dumps(result))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
