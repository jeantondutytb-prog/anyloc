#!/usr/bin/env python3
"""Relève pour le skill /hook (lancé à la main ou la nuit) : vidéos de nos comptes et des concurrents.

  collect.py <dossier> [jours]

Écrit dans <dossier> :
  videos.json       nos vidéos des <jours> derniers jours (7 par défaut) : compte, date, créneau, vues, id
  competitors.json  les 6 meilleures vidéos de chaque concurrent sur 45 jours
  ours-N.png        planches de miniatures de nos vidéos, triées par créneau (le hook est écrit dessus)
  comp.png          planche des miniatures des concurrents
Chaque miniature porte en jaune : compte, date et heure, vues. Il faut Pillow et yt-dlp.
"""
import io, json, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tiktok-views"))
from track import ACCOUNTS  # noqa: E402  même liste que le relevé des vues

COMPETITORS = ["faketaloc", "usewiped.com", "getvanish", "ghostly.gps", "ilyes.flex", "rayaan.locaflex"]
TZ = ZoneInfo("Europe/Paris")
W = 240


def videos(account, limit=40):
    out = subprocess.run(["yt-dlp", "--flat-playlist", "-j", "--playlist-end", str(limit), f"https://www.tiktok.com/@{account}"],
                         capture_output=True, text=True, timeout=300).stdout
    return [json.loads(line) for line in out.splitlines() if line.strip()]


def tile(account, v):
    url = (v.get("thumbnails") or [{}])[-1].get("url")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=20).read())).convert("RGB")
    im = im.resize((W, int(W * im.height / im.width)))
    t = datetime.fromtimestamp(v["timestamp"], TZ)
    out = Image.new("RGB", (W, im.height + 22))
    ImageDraw.Draw(out).text((3, 5), f"{account[:9]} {t:%d/%m %H:%M} {v.get('view_count')}", fill=(255, 255, 0))
    out.paste(im, (0, 22))
    return out


def sheets(tiles, path, per=16, cols=8):
    for n in range(0, len(tiles), per):
        chunk = tiles[n:n + per]
        h = max(t.height for t in chunk)
        sheet = Image.new("RGB", (W * cols, h * ((len(chunk) + cols - 1) // cols)), "white")
        for i, t in enumerate(chunk):
            sheet.paste(t, ((i % cols) * W, (i // cols) * h))
        sheet.save(path.format(n=n // per))


def main():
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    since = datetime.now(TZ) - timedelta(days=int(sys.argv[2]) if len(sys.argv) > 2 else 7)
    with ThreadPoolExecutor(8) as pool:
        ours = dict(zip(ACCOUNTS, pool.map(videos, ACCOUNTS)))
        theirs = dict(zip(COMPETITORS, pool.map(videos, COMPETITORS)))

    rows = []
    for account, vs in ours.items():
        if not vs:
            print(f"⚠️ rien reçu pour @{account}", file=sys.stderr)
        for v in vs:
            t = datetime.fromtimestamp(v["timestamp"], TZ)
            if t >= since:
                rows.append((t, account, v))
    rows.sort(key=lambda r: (r[0].strftime("%m%d%H"), r[1]))
    (out / "videos.json").write_text(json.dumps([
        {"account": a, "date": t.date().isoformat(), "slot": t.strftime("%H:%M"), "views": v.get("view_count") or 0,
         "video_id": v["id"], "description": v.get("description") or ""} for t, a, v in rows], ensure_ascii=False, indent=1))

    recent = datetime.now(TZ) - timedelta(days=45)
    best = []
    for account, vs in theirs.items():
        vs = [v for v in vs if datetime.fromtimestamp(v["timestamp"], TZ) >= recent]
        best += [(account, v) for v in sorted(vs, key=lambda v: -(v.get("view_count") or 0))[:6]]
    (out / "competitors.json").write_text(json.dumps([
        {"account": a, "date": datetime.fromtimestamp(v["timestamp"], TZ).date().isoformat(), "views": v.get("view_count") or 0,
         "video_id": v["id"], "description": v.get("description") or ""} for a, v in best], ensure_ascii=False, indent=1))

    with ThreadPoolExecutor(8) as pool:
        sheets(list(pool.map(lambda r: tile(r[1], r[2]), rows)), str(out / "ours-{n}.png"))
        sheets(list(pool.map(lambda r: tile(*r), best)), str(out / "comp{n}.png"), per=24)
    print(json.dumps({"videos": len(rows), "competitors": len(best), "dir": str(out)}))


if __name__ == "__main__":
    main()
