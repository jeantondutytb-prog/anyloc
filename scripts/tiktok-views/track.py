#!/usr/bin/env python3
"""Relève les vues TikTok des comptes Anyloc pour l'onglet « Vues TikTok ».

  track.py backfill  -> vues par date de publication jusqu'à hier, et pose la base
  track.py daily     -> vues gagnées depuis le dernier relevé, datées de la veille
  track.py videos    -> chaque vidéo avec ses vues, likes, commentaires et partages, pour l'onglet
                        « Vidéos » de HQ (POST /api/ingest/videos). Se lance quand on veut, 4 fois par jour
                        par com.anyloc.tiktok-videos.plist.

Sort du JSON sur stdout ; l'état (dernier cumul par compte) est dans state.json.

Envoie aussi les vues à Anyloc HQ (POST /api/ingest/tiktok) si HQ_URL et HQ_INGEST_TOKEN
sont dans l'environnement ou dans .env à côté du script. Un envoi raté ne bloque rien :
il est gardé dans hq_pending.json et renvoyé au prochain lancement. Le champ "hq" du JSON
dit ce qui s'est passé.
"""
import json, os, subprocess, sys, urllib.error, urllib.request
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ACCOUNTS = ["kyliantropa", "tristanpauki", "mariusgreto", "gabrielhelau"]  # depuis le 16/10/2026 (gabrielhelau depuis le 26/10) ; anciens : antoine.ckts chloe.rtps emma.ftpl emma.srtp margaux.fgts mateo.ltpr
TZ = ZoneInfo("Europe/Paris")
STATE = Path(__file__).with_name("state.json")
HQ_ENV = Path(__file__).with_name(".env")
HQ_PENDING = Path(__file__).with_name("hq_pending.json")


MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
          "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]


def month_cells(day):
    """Cases du jour dans l'onglet du mois : une semaine tous les 13 rangs à partir du rang 3,
    lundi→dimanche en colonnes B E H K N Q T ; sous la date : Revenu, Utilisateurs, Vues totales, Coût influx, Clients,
    valeurs une colonne à droite."""
    slot = day.replace(day=1).weekday() + day.day - 1
    week, col = divmod(slot, 7)
    row = 3 + 13 * week
    tab = f"'{MONTHS[day.month - 1]} {day.year}'"
    return {
        "label_cell": f"{tab}!{'BEHKNQT'[col]}{row}",
        "label": f"{WEEKDAYS[day.weekday()]} {day.strftime('%d/%m')}",
        "revenue_cell": f"{tab}!{'CFILORU'[col]}{row + 1}",
        "users_cell": f"{tab}!{'CFILORU'[col]}{row + 2}",
        "views_cell": f"{tab}!{'CFILORU'[col]}{row + 3}",
        "cost_cell": f"{tab}!{'CFILORU'[col]}{row + 4}",
        "clients_cell": f"{tab}!{'CFILORU'[col]}{row + 5}",
    }


def hq_config():
    """(url, token) d'Anyloc HQ, ou None si non configuré."""
    values = {}
    if HQ_ENV.exists():
        for line in HQ_ENV.read_text().splitlines():
            key, sep, value = line.partition("=")
            if sep and not key.strip().startswith("#"):
                values[key.strip()] = value.strip().strip('"').strip("'")
    url = os.environ.get("HQ_URL") or values.get("HQ_URL")
    token = os.environ.get("HQ_INGEST_TOKEN") or values.get("HQ_INGEST_TOKEN")
    return (url.rstrip("/"), token) if url and token else None


def hq_post(config, payload):
    url, token = config
    request = urllib.request.Request(
        f"{url}/api/ingest/tiktok",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30):
            return None
    except urllib.error.HTTPError as e:
        # 400 = refusé par HQ (compte inconnu…) : le renvoyer ne changera rien.
        return f"HTTP {e.code} {e.read().decode(errors='replace')[:200]}", e.code < 500
    except (urllib.error.URLError, TimeoutError) as e:
        return f"{e}", False


def send_to_hq(days):
    """Envoie {date ISO: {compte: vues}} à HQ, plus les envois en attente. Ne lève jamais."""
    config = hq_config()
    if config is None:
        return "non configuré (HQ_URL / HQ_INGEST_TOKEN)"
    pending = json.loads(HQ_PENDING.read_text()) if HQ_PENDING.exists() else {}
    # Le dernier relevé d'un jour remplace un envoi en attente du même jour.
    pending.update({d: v for d, v in days.items() if v})
    kept, errors = {}, []
    for date in sorted(pending):
        result = hq_post(config, {"date": date, "views": pending[date]})
        if result is None:
            continue
        message, final = result
        errors.append(f"{date}: {message}")
        if not final:
            kept[date] = pending[date]
    if kept:
        HQ_PENDING.write_text(json.dumps(kept, indent=2))
    elif HQ_PENDING.exists():
        HQ_PENDING.unlink()
    if not errors:
        return f"ok ({len(pending)} jour(s) envoyé(s))"
    return "échec : " + " ; ".join(errors) + (f" — {len(kept)} jour(s) en attente" if kept else "")


def fetch_raw(account):
    """Les vidéos du compte telles que yt-dlp les lit, ou None si TikTok n'a rien renvoyé."""
    out = subprocess.run(
        ["yt-dlp", "--flat-playlist", "-j", f"https://www.tiktok.com/@{account}"],
        capture_output=True, text=True, timeout=300,
    ).stdout
    videos = [json.loads(line) for line in out.splitlines() if line.strip()]
    return videos or None


def fetch(account):
    """Liste (date de publication, vues) de chaque vidéo, ou None si TikTok n'a rien renvoyé."""
    videos = fetch_raw(account)
    if videos is None:
        return None
    return [(datetime.fromtimestamp(v["timestamp"], TZ).date(), v.get("view_count") or 0) for v in videos]


def backfill():
    today = datetime.now(TZ).date()
    by_day = defaultdict(lambda: dict.fromkeys(ACCOUNTS, 0))
    baseline = {}
    for a in ACCOUNTS:
        videos = fetch(a)
        if videos is None:
            sys.exit(f"échec de la récupération pour {a}")
        # Les vidéos d'aujourd'hui restent hors de la base : le relevé de demain les comptera.
        baseline[a] = sum(views for day, views in videos if day < today)
        for day, views in videos:
            if day < today:
                by_day[day][a] += views
    STATE.write_text(json.dumps({"date": today.isoformat(), "cumul": baseline}, indent=2))
    rows = [{"date": d.strftime("%d/%m/%Y"), **by_day[d]} for d in sorted(by_day)]
    hq = send_to_hq({d.isoformat(): by_day[d] for d in sorted(by_day)})
    print(json.dumps({"rows": rows, "cumul": baseline, "hq": hq}, ensure_ascii=False))


def daily():
    state = json.loads(STATE.read_text())
    if state["date"] == datetime.now(TZ).date().isoformat():
        sys.exit("déjà relevé aujourd'hui, rien à faire")
    yesterday = datetime.now(TZ).date() - timedelta(days=1)
    row, errors = {"date": yesterday.strftime("%d/%m/%Y")}, []
    for a in ACCOUNTS:
        videos = fetch(a)
        if videos is None:
            # On garde l'ancien cumul : les vues manquées tomberont dans le prochain relevé.
            row[a], errors = "", errors + [a]
            continue
        total = sum(views for _, views in videos)
        row[a] = total - state["cumul"].get(a, 0)
        state["cumul"][a] = total
    state["date"] = datetime.now(TZ).date().isoformat()
    STATE.write_text(json.dumps(state, indent=2))
    total = sum(v for k, v in row.items() if k != "date" and v != "")
    # HQ refuse les vues négatives (vidéo supprimée) : 0 pour ce jour-là. Les comptes en échec ne sont pas envoyés.
    hq = send_to_hq({yesterday.isoformat(): {a: max(0, v) for a, v in row.items() if a != "date" and v != ""}})
    print(json.dumps({"row": row, "total": total, "errors": errors, "month": month_cells(yesterday),
                      "cumul": state["cumul"], "hq": hq}, ensure_ascii=False))


VIDEO_FIELDS = ["id", "timestamp", "view_count", "like_count", "comment_count", "repost_count", "duration", "title"]


def videos():
    """Envoie à HQ chaque vidéo de chaque compte. Un compte qui ne répond pas est signalé, pas compté à 0."""
    config = hq_config()
    if config is None:
        sys.exit("HQ non configuré (HQ_URL / HQ_INGEST_TOKEN)")
    accounts, failed = {}, []
    for a in ACCOUNTS:
        raw = fetch_raw(a)
        if raw is None:
            failed.append(a)
            continue
        accounts[a] = [{k: v.get(k) for k in VIDEO_FIELDS} for v in raw if v.get("timestamp")]
    url, token = config
    request = urllib.request.Request(
        f"{url}/api/ingest/videos",
        data=json.dumps({"accounts": accounts, "failed": failed}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            hq = json.loads(response.read())
    except urllib.error.HTTPError as e:
        hq = f"HTTP {e.code} {e.read().decode(errors='replace')[:200]}"
    except (urllib.error.URLError, TimeoutError) as e:
        hq = f"échec : {e}"
    print(json.dumps({"videos": {a: len(v) for a, v in accounts.items()}, "failed": failed, "hq": hq}, ensure_ascii=False))


if __name__ == "__main__":
    {"backfill": backfill, "daily": daily, "videos": videos}[sys.argv[1]]()
