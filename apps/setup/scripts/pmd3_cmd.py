"""Resolve pymobiledevice3 on Mac and Windows."""

from __future__ import annotations

import importlib.util
import shutil
import sys


def pmd3_argv(*args: str) -> list[str]:
    # The interpreter running us (the one bundled with Anyloc) has the pinned
    # version: prefer it over whatever pymobiledevice3 happens to be on PATH.
    if importlib.util.find_spec("pymobiledevice3") is not None:
        return [sys.executable, "-m", "pymobiledevice3", *args]
    cli = shutil.which("pymobiledevice3")
    if cli:
        return [cli, *args]
    return [sys.executable, "-m", "pymobiledevice3", *args]
