#!/usr/bin/env python3
"""
Spawn pymobiledevice3 CLI to simulate GPS and keep the connection alive.
The CLI's `dvt simulate-location set` waits for stdin before exiting,
which keeps the DVT tunnel open and the location locked.
"""

import json
import subprocess
import shutil
import signal
import sys
import time


def find_pmd3():
    paths = [
        "/Library/Frameworks/Python.framework/Versions/3.14/bin/pymobiledevice3",
        "/Library/Frameworks/Python.framework/Versions/3.13/bin/pymobiledevice3",
        "/Library/Frameworks/Python.framework/Versions/3.12/bin/pymobiledevice3",
        "/opt/homebrew/bin/pymobiledevice3",
        "/usr/local/bin/pymobiledevice3",
    ]
    for p in paths:
        if shutil.which(p):
            return p
    return shutil.which("pymobiledevice3")


def main():
    udid = None
    lat = None
    lng = None

    for arg in sys.argv[1:]:
        if arg.startswith("--udid="):
            udid = arg.split("=", 1)[1]
        elif arg.startswith("--lat="):
            lat = arg.split("=", 1)[1]
        elif arg.startswith("--lng="):
            lng = arg.split("=", 1)[1]

    if lat is None or lng is None:
        print(json.dumps({"ok": False, "message": "Missing --lat= or --lng="}))
        sys.exit(1)

    pmd3 = find_pmd3()
    if not pmd3:
        print(json.dumps({"ok": False, "message": "pymobiledevice3 introuvable."}))
        sys.exit(1)

    cmd = [pmd3, "developer", "dvt", "simulate-location", "set"]
    if udid:
        cmd.extend(["--udid", udid])
    cmd.extend(["--", lat, lng])

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Wait a bit for the process to start and check it didn't crash
    time.sleep(3)
    ret = proc.poll()

    if ret is not None:
        stderr = proc.stderr.read().decode(errors="replace").strip()
        print(json.dumps({"ok": False, "message": stderr or "Échec simulate-location."}))
        sys.exit(1)

    # Process is running — location is being simulated
    print(json.dumps({"ok": True, "message": f"GPS actif : {lat}, {lng}"}), flush=True)

    # Keep alive until SIGTERM/SIGINT
    def handle_signal(sig, frame):
        proc.stdin.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    try:
        proc.wait()
    except KeyboardInterrupt:
        handle_signal(None, None)


if __name__ == "__main__":
    main()
