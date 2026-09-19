"""Resolve pymobiledevice3 on Mac and Windows."""

from __future__ import annotations

import shutil
import sys


def pmd3_argv(*args: str) -> list[str]:
    cli = shutil.which("pymobiledevice3")
    if cli:
        return [cli, *args]
    return [sys.executable, "-m", "pymobiledevice3", *args]
