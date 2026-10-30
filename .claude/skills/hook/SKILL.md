---
name: hook
description: Génère les hooks TikTok Anyloc du jour (hook + description courte) pour chaque compte, après avoir analysé ce qui a été posté, ce qui a marché, ce qui n'a pas marché, ce qu'on teste et ce qu'on ne teste plus. Déclenche dès que l'utilisateur tape /hook, ou demande « les hooks du jour », « mes hooks pour aujourd'hui », « X hooks pour demain ».
---

# /hook — hooks TikTok du jour

Tout se fait en français, ton direct, tutoiement. Le résultat final est une liste prête à copier-coller.

## Fichier mémoire

`marketing/hooks/journal.md` est la source de vérité entre les sessions : comptes, règles apprises, gagnants, perdants, tests en cours, angles abandonnés, historique de ce qui a été posté. **Lis-le en entier avant tout.** Mets-le à jour à la fin (étape 5).

## Étape 0 — Combien de vidéos ?

- Si l'utilisateur donne un nombre (« /hook 36 », « 7 par compte »), utilise-le.
- Sinon, reprends le « Rythme actuel » du journal (depuis le 28/10 : 3 par compte, 10h sûr · 15h test · 20h sûr).
- Répartis toujours équitablement entre les comptes actifs du journal.

## Mode nuit (tâche planifiée de 00h01)

Quand le skill est lancé par la tâche planifiée « hooks-nuit » (personne devant l'écran) :
- **Ne pose aucune question**, ne demande rien, va au bout. Le plan est pour **le jour qui vient de commencer** (date de Paris).
- Étapes 1 et 1 bis : utilise `python3 scripts/hooks/collect.py /tmp/hooks-nuit 7` puis lis `videos.json`, `competitors.json` et les planches PNG avec Read (le hook est écrit sur les miniatures). Le navigateur est facultatif : si TikTok ne charge pas, la planche suffit.
- Étape 5 bis (envoi à HQ) est obligatoire : c'est ce que l'utilisateur lit le matin sur /hooks. Marque `now` sur le hook de 10h de chaque compte. Les vues, HQ les relie seul : n'envoie pas de `results`.
- Mets à jour le journal, mais **ne commite rien**.
- Si l'envoi à HQ échoue, réessaie une fois après 1 minute, puis écris l'erreur en tête du journal.

## Mode tranche (tâche planifiée de 8h40, 13h40 et 18h40)

Quand le skill est lancé par la tâche planifiée « hooks-tranche », Jean va tourner la prochaine vidéo vers 9h, 14h ou 19h (postée à 10h, 15h ou 20h) : le résultat doit être prêt une vingtaine de minutes avant. Le passage est **léger** : quelques minutes, pas de veille, pas de navigateur, pas de `collect.py`, pas de `frames.py`. **Ne pose aucune question**, va au bout, et **ne commite rien**.

On ne touche qu'aux hooks encore « À filmer » : étape `null` ou `a_filmer`, et `views` à `null`. Un hook Filmé, Monté, Posté ou Sauté ne se réécrit pas, ne se supprime pas et ne se renvoie pas.

1. **Relevé tout frais** (timeout 10 minutes) :
   ```bash
   cd /Users/jean/anyloc && python3 scripts/tiktok-views/track.py videos
   ```
   S'il plante, note-le et continue avec ce que HQ a déjà, mais à l'étape 3, tout compte dont `lastVideo.last_seen_at` a **plus de 90 minutes** est en **garder le plan**, avec `reason` « relevé trop vieux (track.py a planté) ».
2. **État du jour**, avec la même URL et le même jeton que l'étape 5 bis :
   ```bash
   set -a; . ~/anyloc/scripts/tiktok-views/.env; set +a
   curl -sS "$HQ_URL/api/hooks/today" -H "Authorization: Bearer $HQ_INGEST_TOKEN" > /tmp/hooks-today.json
   ```
   Réponse : `{"date": "AAAA-MM-JJ", "accounts": [{"account", "hooks": […], "lastVideo": …}]}`.
   - `hooks` : les hooks du jour du compte, chacun avec `id`, `slot`, `kind`, `hook`, `description`, `inspiration`, `source_url`, `script`, `reason`, `now`, `step`, `posted_at`, `video_id`, `views`.
   - `lastVideo` : la dernière vidéo du compte (aujourd'hui ou hier), ou `null`. `views`, `ageMs` (âge en ms), `usual` (l'habitude du compte au même âge), `ratio`, `read` (`fort`, `normal`, `faible` ou `pas_assez_de_recul`), `hookId` (le hook relié, ou `null`), `kind` (`sur` ou `test` du hook relié), `published_at`, `last_seen_at` (heure du dernier relevé : `views` et `ageMs` sont pris à ce moment-là).
   Le passage de 8h40 n'a souvent que la vidéo de 20h la veille (environ 12 h d'âge) : c'est normal, elle est comparée à l'habitude au même âge.
3. **Décider, compte par compte**, à partir de `lastVideo` :

   | Dernière vidéo | Prochaine vidéo |
   |---|---|
   | `null`, ou `hookId` à `null` | **garder le plan** ; `reason` le dit (« dernière vidéo pas encore cochée Posté », ou « pas encore de vidéo à lire »). Ne pas deviner le hook. |
   | reliée à un ancien `hors_plan` | **garder le plan** |
   | test **fort** | une **variante de ce test** : même idée, autre formulation |
   | test **faible** | un **sûr** |
   | sûr **fort** | **garder le plan** : le sûr marche, on continue |
   | sûr **faible** | **changer de sûr** : une autre formule des Gagnants, pas le même angle |
   | **normal** ou **pas assez de recul** | **garder le plan** |

   Tu peux t'écarter de ces règles si tu le justifies dans `reason`. Un nouveau hook **remplace** un « À filmer », il ne s'ajoute pas : **jamais plus de 3 hooks par compte et par jour**, en comptant ceux qui ont avancé. Il suit les règles strictes de l'étape 4 (pas mot pour mot sur un compte où il est déjà passé, « elle », Snap Map, rien d'« Abandonné »). Pour sa vidéo à refaire et son script, reprends ceux du test qu'il varie ou de la formule du sûr (journal, Gagnants) : pas de nouvelle vidéo à regarder.
4. **Créneaux et hook du moment.** Ordre conseillé : **10h sûr · 15h test · 20h sûr**. Recalcule les créneaux des hooks restants autour de ce qui est déjà posté (si le test est parti à 10h, il reste deux sûrs, à 15h et 20h). Deux hooks du même compte peuvent avoir le même créneau : ce n'est pas une erreur. Mets `now: true` sur **un seul** hook par compte, celui à tourner tout de suite (passage de 8h40 → la vidéo de 10h, 13h40 → 15h, 18h40 → 20h).
5. **Envoyer à HQ**, comme à l'étape 5 bis : `date` = `date` de `/tmp/hooks-today.json`, et dans `hooks`, pour chaque compte qui a encore des « À filmer », **tous** ses « À filmer », réécrits ou gardés tels quels (un hook gardé mais pas renvoyé serait supprimé). Chacun avec sa `reason` (une phrase, 300 caractères au plus) et `now`. Pas de `results`, pas de `notes`. Un compte qui n'a plus de « À filmer » n'apparaît pas dans l'envoi.
6. **Journal** : une ligne courte par compte sous le « Prévu le JJ/MM » du jour dans « Historique », par exemple « 13h40 — @kyliantropa : test de 10h ×1,8 → variante ». Rien d'autre, pas de commit.
7. **Si l'envoi échoue** : sur un **400**, ne renvoie pas le même corps ; relis `GET /api/hooks/today` (étape 2), refais le corps à partir de cet état frais (étapes 3 à 5) et renvoie-le une seule fois. Sur une autre erreur, réessaie une fois après 1 minute. Si cette seconde tentative échoue aussi, écris l'erreur en tête du journal (sous « Dernière analyse »).

Termine par une ligne par compte : le hook à tourner maintenant et sa raison, puis le résultat de l'envoi à HQ.

## Étape 1 — Relever les comptes

**Le plus rapide (et la nuit) :** `python3 scripts/hooks/collect.py /tmp/hooks-nuit 7` relève nos comptes et les concurrents avec yt-dlp et fait des planches de miniatures (compte, date et heure, vues en jaune). Lis les PNG avec Read pour lire les hooks. Sinon, le navigateur :

Pour chaque compte actif, avec le navigateur intégré (`mcp__Claude_Browser__*`) :

1. `navigate` vers `https://www.tiktok.com/@<handle>`, attendre ~6 s.
2. Prendre un `screenshot` (obligatoire avant tout clic par coordonnées).
   - Bannière cookies → cliquer « Refuser les cookies facultatifs » (~556,446 en repère 800x605).
   - « Une erreur est survenue » → cliquer « Actualiser » (~428,494), attendre 6 s. Recommencer une fois si besoin. Le clic en JS ne marche pas, il faut un vrai clic.
   - « Ce compte est privé » → **le signaler en premier dans la réponse** (un compte privé ne passe pas sur le « Pour toi »).
3. Lire les vidéos en JS :
   ```js
   [...document.querySelectorAll('a[href*="/video/"]')].slice(0,20).map((a,i)=>i+' | '+a.href.split('/').pop()+' | '+a.innerText.trim().replace('\n',' ')+' | '+(a.querySelector('img')?.alt||''))
   ```
   Le texte `alt` contient la description.
4. **Le hook est écrit dans l'image, pas dans le texte.** Pour le lire, faire défiler la grille (`scrollIntoView` sur la vidéo voulue) et prendre un `screenshot` : le hook est lisible sur les miniatures. Ne pas ouvrir les vidéos une par une, TikTok affiche une fenêtre de connexion (ne jamais s'inscrire ni se connecter).
5. Ne relever le hook que des vidéos **postées depuis la dernière session** et des **vidéos au-dessus de 8K**. Le reste est déjà dans le journal.

Si un compte ne charge pas après 2 essais, le dire et continuer avec les autres.

## Étape 1 bis — Veille TikTok (concurrents et autres niches)

Les tests du jour viennent de ce qui marche **ailleurs** sur TikTok, pas de notre imagination. À chaque /hook, avec le navigateur intégré :

1. `navigate` vers une recherche vidéo, attendre ~7 s : `https://www.tiktok.com/search/video?q=<mots>`. Faire 2 à 4 recherches, par exemple :
   - **l'international d'abord** (les concurrents FR font peu de vues, les US font des millions) : `parents track my location pov`, `snap map larp location`, `fake location snapchat`, et les profils des concurrents US triés par « Populaire » (`https://www.tiktok.com/@getvanish`, `@usewiped.com`, `@ghostly.gps` — voir « Concurrents » dans le journal) ;
   - la niche FR : `changer sa localisation snap`, `locaflex` ;
   - une niche voisine dont on peut adapter le format : `pov parents`, `pov girlfriend`, `astuce snap`.
   Les hooks étrangers se traduisent en français au plus près du texte d'origine (même idée, mêmes mots quand ça passe).
   Sur un profil : cliquer « Populaire » (~654,192 en repère 800x605) pour voir ses meilleures vidéos.
2. Une fenêtre « Connecte-toi » apparaît souvent : appuyer sur `Escape` ou cliquer sur la croix (~540,106). **Ne jamais se connecter ni s'inscrire.** Ne pas faire défiler (ça relance la fenêtre) : les 6 à 8 premiers résultats suffisent.
3. Prendre un `screenshot` pleine taille : le hook se lit sur les miniatures, les ♥ en bas à gauche donnent les likes (les vues sont environ 10× plus). Relever aussi **le lien de chaque vidéo** :
   ```js
   [...document.querySelectorAll('a[href*="/video/"]')].slice(0,10).map((a,i)=>i+' | '+a.href)
   ```
   (dans l'ordre des miniatures). La nuit, le lien est dans `competitors.json` (`url`).
4. Retenir **3 à 5 formats** qui dépassent ~5K likes, et noter pour chacun : le hook, le compte, les likes, **le lien de la vidéo**, et comment l'adapter à Anyloc (Snap Map, pov court). Les ajouter dans « Veille » du journal avec la date et le lien.

Si la recherche ne charge pas, utiliser les formats déjà notés dans « Veille » du journal.

5. **Vidéos du clipper.** Le clipper poste sur ses propres comptes des vidéos **uniquement en enregistrement d'écran** (capture du téléphone : Snap Map, appli, écran d'accueil ; jamais de face cam ni de téléphone filmé à la main). Parmi tout ce que tu as vu (`competitors.json`, recherches, « Veille » du journal), choisis les **5 meilleures vidéos en enregistrement d'écran**, de la plus forte à la moins forte (vues d'abord).

   **Uniquement des vidéos de concurrents, et uniquement dans notre niche : changer / fausser sa localisation** (Snap Map, loc Snap, position iPhone, GPS, « je suis à… », loc d'un pote, se cacher d'un ex ou des parents par la loc). Avant de garder une vidéo, vérifie que **la vidéo elle-même** parle de localisation, pas seulement le compte : on doit voir une carte, une loc qui bouge ou un Bitmoji déplacé, ou le hook doit parler de loc. Une vidéo qui parle de Snap sans parler de loc (débloquer Snap, « je peux enfin utiliser Snap », filtres, streaks, appli de nettoyage, VPN…) est **hors niche : ne l'envoie pas**, même si elle vient d'un concurrent et a beaucoup de vues. Jamais une vidéo de nos comptes ni du clipper. Dans le doute, prends la suivante : mieux vaut 4 vidéos dans la niche que 5 avec une hors sujet.

   Pour chacune : le lien (jamais inventé), le hook écrit dessus, les textes à l'écran traduits en français, et comment la refaire en capture d'écran (ce qu'on montre, les gestes, la durée). Évite de reprendre deux fois la même vidéo d'un jour à l'autre (regarde « Clipper » dans le journal) ; s'il n'y en a pas 5 nouvelles, complète avec les meilleures déjà données.

## Étape 2 — Classer

| Statut | Vues |
|---|---|
| 🔥 Hit | ≥ 20K |
| ✅ Au-dessus | 7K – 20K |
| ➖ Moyenne | 3,5K – 7K (le plancher habituel est autour de 4,5-5K) |
| ❌ Flop | < 3,5K |
| ⏳ Trop tôt | posté il y a moins de 48 h. **Un gagnant peut mettre 2 à 3 jours à décoller** (13,4K → 89,7K en 2 jours). |

Compare chaque hook à ses versions précédentes, sur le même compte et sur les autres.

## Étape 3 — Tirer les leçons

Mets à jour les règles du journal **seulement si les chiffres le justifient** : au moins 2 points de données, ou un hit net. Un résultat isolé reste « en test ». Garde un œil sur :
- l'angle : parents, rupture/ex, couple, « QUI SAVAIT » ;
- le pronom : tous les comptes sont des gars, donc « elle », « ta copine », « ta meuf » ;
- la présence d'un chiffre, d'un âge ou d'un moment fort, plutôt qu'une simple fréquence ;

## Étape 4 — Générer

Pour chaque compte, N vidéos avec **hook / description**.

**Répartition : moitié sûr, moitié test** (pour 3 vidéos par compte : 2 sûrs à 10h et 20h, 1 test à 15h ; les hits sortent entre 10h et 15h, règle 15).
- **3 hooks sûrs** : uniquement des formules déjà prouvées dans « 🔥 Gagnants » et « Règles apprises » (parent + âge, couple + durée, rupture sur Gabin…). On peut les refaire tant qu'elles marchent, en changeant le chiffre, l'âge ou la formulation. Jamais un hook mot pour mot sur un compte où il est déjà passé.
- **3 hooks tests** : des formats repérés à l'étape 1 bis (concurrents ou autre niche), adaptés à Anyloc. En priorité ceux de la « Veille » qui n'ont pas encore été testés, puis « Idées à tester ». Indiquer d'où vient chaque test (ex. « Locaflex, 27K likes »).
- Ordre : **10h sûr · 15h test · 20h sûr**. Le sûr le plus fort va à 10h : il assure la journée. Le test de 15h reste dans la fenêtre des hits, et on sait déjà comment le sûr a démarré.
- Un test qui fait ✅ ou 🔥 sur 2 comptes passe dans les Gagnants : il devient un hook sûr.

**Rien à l'aveugle : chaque hook a sa vidéo à refaire et son script.**
- **Vidéo à refaire** (`source_url`) : pour un test, le lien de la vidéo du concurrent repérée à l'étape 1 bis ; pour un sûr, le lien de **notre** meilleure vidéo sur cette formule (`url` dans `videos.json`, ou `https://www.tiktok.com/@<compte>/video/<id>`). Jamais un lien inventé : si tu n'as pas le lien, mets `null` et dis-le dans les alertes.
- **Script** (`script`) : regarde la vidéo source avec `python3 scripts/hooks/frames.py <lien> /tmp/hooks-frames/<n>.png` (planche d'une image par seconde, plus durée et description), lis la planche avec Read, puis écris en 3 à 5 lignes courtes comment la refaire pour Anyloc :
  1. ce qu'on filme (écran du téléphone sur la Snap Map, téléphone filmé à la main, face cam…) et d'où part la loc ;
  2. le déroulé seconde par seconde (ex. « 0-3 s : hook sur la carte · 3-8 s : la loc part de chez toi vers Dubaï · 8-12 s : zoom sur le Bitmoji ») ;
  3. les textes à l'écran après le hook, **les mêmes que la vidéo source, traduits en français** ;
  4. la durée visée et **la même musique ou le même son** que la vidéo source.
  Pour un test, on copie la vidéo source clairement : même plan, même musique, même texte traduit. On ne la réinvente pas.
  Une même vidéo source sert à plusieurs hooks : ne la regarde qu'une fois, réutilise le script.

**Règles strictes :**
- **Ne jamais reposter mot pour mot un hook sur un compte où il est déjà passé**, ça flope (2,4K). Le reformuler.
- **Tous les comptes sont des gars**, même ceux qui ont un nom de fille (Chloé, Margaux). Couple et rupture : toujours « elle », « ta copine », « ta meuf ». Jamais « il », « ton copain », « ton mec ». (« il » reste possible seulement pour parler du père.)
- Pas le même hook à la même heure sur deux comptes.
- Rien de ce qui est dans « Abandonné ».
- Hook court, minuscules, comme le 26/10 : la découverte avec « !?!?? » pour les sûrs (« depuis quand y'a ça sur snap !?!?? », « genre on peut bouger sa loc snap !?!?? »), une situation avec un emoji pour les tests (« tes darons doivent pas savoir que t'es sorti ce soir 🤫 »). Pas de `pov :` imposé.
- Uniquement Snap Map, sauf si le journal dit le contraire.

**Description :** comme le 26/10 : une réaction courte, avec un emoji si ça passe, qui va avec le hook. Exemples du 26/10 : « vous avez ça vous aussi ?? », « c'est une dinguerie 🤣 », « j'étais le seul à pas savoir ?? », « depuis quand wsh 😭 », « je suis choqué 🤯 », « la pauvre 😅 », « ils croient que je dors 😭 », « mes potes me croient à dubaï 🤣 », « heureusement que j'ai trouvé ça 😭 ». **Pas de hashtags, pas d'anyloc.io, pas de CTA.** Varier d'une vidéo à l'autre.

**Horaires :** reprendre ceux du journal.

Dans les tableaux de la réponse, ajoute une colonne « À refaire » avec le lien et une ligne de script.

## Étape 5 — Mettre à jour le journal

Avant de répondre, édite `marketing/hooks/journal.md` :
- ajoute les vues relevées dans « Historique » (date, compte, hook, vues) ;
- déplace les hooks entre Gagnants, Perdants, En test et Abandonné selon les chiffres ;
- ajoute les hooks générés aujourd'hui dans « Historique » avec le statut `prévu` et le type (sûr / test) ;
- ajoute les formats repérés à l'étape 1 bis dans « Veille » ;
- mets à jour la date « Dernière analyse ».

## Étape 5 bis — Envoyer au dashboard Anyloc HQ (onglet Hooks)

Le dashboard `/hooks` d'Anyloc HQ affiche le plan du jour, le bilan et la veille. Il ne lit que ce que tu lui envoies. Les vues, il les relie seul : chaque vidéo va au hook que Jean a coché « Posté ». N'envoie donc **jamais** de `results` (HQ refuse tout l'envoi avec une 400).

1. Écris le corps dans `/tmp/hooks-hq.json` :
   ```json
   {
     "date": "AAAA-MM-JJ",
     "hooks": [{"account": "kyliantropa", "slot": "10:00", "kind": "sur", "hook": "…", "description": "…", "inspiration": null,
                "source_url": "https://www.tiktok.com/@kyliantropa/video/74…", "script": "Écran Snap Map…\n0-3 s : …",
                "reason": "le sûr le plus fort du moment, pour assurer la journée", "now": true}],
     "notes": [
       {"kind": "veille", "text": "hook vu ailleurs", "source": "@getvanish", "likes": 27000, "adaptation": "pov : … pour nous",
        "source_url": "https://www.tiktok.com/@getvanish/video/76…"},
       {"kind": "lecon", "text": "règle apprise aujourd'hui"}
     ],
     "clips": [
       {"source_url": "https://www.tiktok.com/@ghostly.gps/video/76…", "hook": "I just found this app 💀",
        "on_screen": "je viens de trouver ça pour snap 💀", "script": "Capture d'écran sur la Snap Map, la loc glisse de Paris à Miami, 8 s",
        "inspiration": "@ghostly.gps, 21K vues"}
     ]
   }
   ```
   - `date` = le jour du plan (aujourd'hui, ou demain si on prépare demain). `hooks` = le plan de ce jour pour les comptes envoyés : pour chacun, il remplace les hooks encore « À filmer » et sans vues. Ceux qui ont avancé (Filmé, Monté, Posté, Sauté, ou mesurés) restent et comptent dans les **3 hooks par compte et par jour** au plus : n'envoie que ce qui reste à tourner.
   - `kind` : `sur` ou `test` ; `inspiration` obligatoire pour un test (« @compte, 27K likes »). `slot` en `HH:MM`, heure de Paris : c'est une heure conseillée, deux hooks du même compte peuvent avoir le même créneau.
   - `source_url` (lien https TikTok de la vidéo à refaire) et `script` (1 500 caractères max, retours à la ligne permis) sur **chaque** hook : c'est ce qui s'affiche sous « ▶ Voir la vidéo à refaire » et « Comment filmer » sur /hooks.
   - `reason` : pourquoi ce hook, en une phrase, 300 caractères au plus.
   - `now` : `true` sur le hook à tourner maintenant, **un seul par compte** au plus. La nuit, c'est le hook de 10h de chaque compte.
   - `notes` : les formats de l'étape 1 bis (`veille`) et les règles ajoutées au journal à l'étape 3 (`lecon`).
   - `clips` : les 5 vidéos du clipper (étape 1 bis, point 5), dans l'ordre, **5 au plus**. `source_url` (lien https TikTok) et `hook` obligatoires ; `on_screen`, `script` (1 500 caractères max) et `inspiration` conseillés. Elles remplacent celles déjà envoyées pour ce `date`. Jean copie le message tout prêt dans le bloc « Clipper » de /hooks. Envoie-les la nuit ; en passage de journée, n'envoie pas `clips` (celles du matin restent).
2. Envoie :
   ```bash
   set -a; . ~/anyloc/scripts/tiktok-views/.env; set +a
   curl -sS -X POST "$HQ_URL/api/ingest/hooks" -H "Authorization: Bearer $HQ_INGEST_TOKEN" -H "content-type: application/json" --data @/tmp/hooks-hq.json
   ```
   Réponse attendue : `{"date":…,"hooks":n,"notes":n,"clips":n}`. Une erreur 400 dit quel champ corriger ; si l'envoi échoue, le dire dans les alertes et continuer (le journal reste la source de vérité).

## Format de réponse

1. **Alertes** s'il y en a (compte privé, compte qui ne charge pas, envoi au dashboard raté).
2. **Bilan rapide**, 6 blocs très courts :
   - 📤 **Posté depuis la dernière fois** : nombre de vidéos, par compte.
   - 🔥 **Ce qui a marché** : tableau hook / compte / vues.
   - ❌ **Ce qui n'a pas marché** : 2 à 4 lignes.
   - 🔎 **Veille** : les 3 à 5 formats repérés chez les concurrents ou dans d'autres niches (hook, compte, likes).
   - 🧪 **Ce qu'on teste aujourd'hui** : les tests du jour, d'où ils viennent et pourquoi.
   - 🚫 **Ce qu'on ne teste plus** : les angles abandonnés.
3. **Un tableau par compte** : `Heure | Type (✅ sûr / 🧪 test) | Hook | Description`.
4. Une phrase finale avec la vidéo du jour qui a le plus de chances de percer.

Pas de blabla. La personne veut copier-coller et tourner.
