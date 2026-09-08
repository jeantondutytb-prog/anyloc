#!/usr/bin/env python3
"""Install Anyloc iOS app on a connected device (scaffold)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def install_with_pymobiledevice3(ipa_path: Path, udid: str | None) -> dict:
    try:
        from pymobiledevice3.cli.cli import cli
    except ImportError:
        return {
            "ok": False,
            "message": "pymobiledevice3 non installé. Lance: pip install pymobiledevice3",
        }

    # Scaffold: real install will call pymobiledevice3 apps install.
    return {
        "ok": False,
        "message": (
            f"IPA trouvé ({ipa_path.name}) — branchement install pymobiledevice3 à finaliser. "
            "Build l'app iOS depuis apps/ios/ puis place Anyloc.ipa dans apps/ios/dist/."
        ),
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
                    "message": f"IPA introuvable: {ipa_path}",
                }
            )
        )
        return 1

    result = install_with_pymobiledevice3(ipa_path, args.udid)
    print(json.dumps(result))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
