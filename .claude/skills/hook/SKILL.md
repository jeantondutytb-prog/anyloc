---
name: hook
description: Génère les hooks TikTok Anyloc du jour (hook + description CTA) pour chaque compte, après avoir analysé ce qui a été posté, ce qui a marché, ce qui n'a pas marché, ce qu'on teste et ce qu'on ne teste plus. Déclenche dès que l'utilisateur tape /hook, ou demande « les hooks du jour », « mes hooks pour aujourd'hui », « X hooks pour demain ».
---

# /hook — hooks TikTok du jour

Tout se fait en français, ton direct, tutoiement. Le résultat final est une liste prête à copier-coller.

## Fichier mémoire

`marketing/hooks/journal.md` est la source de vérité entre les sessions : comptes, règles apprises, gagnants, perdants, tests en cours, angles abandonnés, historique de ce qui a été posté. **Lis-le en entier avant tout.** Mets-le à jour à la fin (étape 5).

## Étape 0 — Combien de vidéos ?

- Si l'utilisateur donne un nombre (« /hook 36 », « 7 par compte »), utilise-le.
- Sinon, reprends le « Rythme actuel » du journal (depuis le 26/10 : 3 par compte, 11h sûr · 17h test · 21h sûr).
- Répartis toujours équitablement entre les comptes actifs du journal.

## Mode nuit (tâche planifiée de 00h01)

Quand le skill est lancé par la tâche planifiée « hooks-nuit » (personne devant l'écran) :
- **Ne pose aucune question**, ne demande rien, va au bout. Le plan est pour **le jour qui vient de commencer** (date de Paris).
- Étapes 1 et 1 bis : utilise `python3 scripts/hooks/collect.py /tmp/hooks-nuit 7` puis lis `videos.json`, `competitors.json` et les planches PNG avec Read (le hook est écrit sur les miniatures). Le navigateur est facultatif : si TikTok ne charge pas, la planche suffit.
- Étape 5 bis (envoi à HQ) est obligatoire : c'est ce que l'utilisateur lit le matin sur /hooks. Envoie aussi les vues relevées (`results`) des 3 derniers jours.
- Mets à jour le journal, mais **ne commite rien**.
- Si l'envoi à HQ échoue, réessaie une fois après 1 minute, puis écris l'erreur en tête du journal.

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
   Les hooks anglais se traduisent en `pov : …` français, en gardant l'idée et pas les mots.
   Sur un profil : cliquer « Populaire » (~654,192 en repère 800x605) pour voir ses meilleures vidéos.
2. Une fenêtre « Connecte-toi » apparaît souvent : appuyer sur `Escape` ou cliquer sur la croix (~540,106). **Ne jamais se connecter ni s'inscrire.** Ne pas faire défiler (ça relance la fenêtre) : les 6 à 8 premiers résultats suffisent.
3. Prendre un `screenshot` pleine taille : le hook se lit sur les miniatures, les ♥ en bas à gauche donnent les likes (les vues sont environ 10× plus).
4. Retenir **3 à 5 formats** qui dépassent ~5K likes, et noter pour chacun : le hook, le compte, les likes, et comment l'adapter à Anyloc (Snap Map, pov court). Les ajouter dans « Veille » du journal avec la date.

Si la recherche ne charge pas, utiliser les formats déjà notés dans « Veille » du journal.

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

Pour chaque compte, N vidéos avec **hook / description (CTA)**.

**Répartition : moitié sûr, moitié test** (pour 3 vidéos par compte : 2 sûrs à 11h et 21h, 1 test à 17h ; les hits sortent entre 10h et 15h, règle 15).
- **3 hooks sûrs** : uniquement des formules déjà prouvées dans « 🔥 Gagnants » et « Règles apprises » (parent + âge, couple + durée, rupture sur Gabin…). On peut les refaire tant qu'elles marchent, en changeant le chiffre, l'âge ou la formulation. Jamais un hook mot pour mot sur un compte où il est déjà passé.
- **3 hooks tests** : des formats repérés à l'étape 1 bis (concurrents ou autre niche), adaptés à Anyloc. En priorité ceux de la « Veille » qui n'ont pas encore été testés, puis « Idées à tester ». Indiquer d'où vient chaque test (ex. « Locaflex, 27K likes »).
- Mettre les hooks sûrs sur les créneaux du soir (18h, 20h, 22h) et les tests en journée, sauf la rupture de Gabin qui reste le soir.
- Un test qui fait ✅ ou 🔥 sur 2 comptes passe dans les Gagnants : il devient un hook sûr.

**Règles strictes :**
- **Ne jamais reposter mot pour mot un hook sur un compte où il est déjà passé**, ça flope (2,4K). Le reformuler.
- **Tous les comptes sont des gars**, même ceux qui ont un nom de fille (Chloé, Margaux). Couple et rupture : toujours « elle », « ta copine », « ta meuf ». Jamais « il », « ton copain », « ton mec ». (« il » reste possible seulement pour parler du père.)
- Pas le même hook à la même heure sur deux comptes.
- Rien de ce qui est dans « Abandonné ».
- Hook court : `pov : …` en 6 à 9 mots, minuscules, emoji optionnel. Exception : le format « QUI SAVAIT ÇA… » s'écrit en majuscules.
- Uniquement Snap Map, sauf si le journal dit le contraire.

**Description (CTA) :** une phrase courte et naturelle qui dit **ce que fait le site** (changer ta loc snap) + **anyloc.io** + 4 hashtags. Toujours `#anyloc`, plus `#snap` ou `#snapmap`, plus un hashtag de thème (`#parents`, `#ex`, `#rupture`, `#meuf`, `#astuce`…), plus un hashtag de portée (`#fyp`, `#pourtoi`, `#loc`, `#dinguerie`). Varier les formulations : « pour ceux qui demandent le site c'est… », « pour changer ta loc snap c'est sur… », « elle a encore ma loc… enfin elle croit 💀 », etc.

**Horaires :** reprendre ceux du journal.

## Étape 5 — Mettre à jour le journal

Avant de répondre, édite `marketing/hooks/journal.md` :
- ajoute les vues relevées dans « Historique » (date, compte, hook, vues) ;
- déplace les hooks entre Gagnants, Perdants, En test et Abandonné selon les chiffres ;
- ajoute les hooks générés aujourd'hui dans « Historique » avec le statut `prévu` et le type (sûr / test) ;
- ajoute les formats repérés à l'étape 1 bis dans « Veille » ;
- mets à jour la date « Dernière analyse ».

## Étape 5 bis — Envoyer au dashboard Anyloc HQ (onglet Hooks)

Le dashboard `/hooks` d'Anyloc HQ affiche le plan du jour, le bilan et la veille. Il ne lit que ce que tu lui envoies.

1. **Vues par vidéo** des 3 derniers jours, pour chaque compte actif :
   ```bash
   yt-dlp --flat-playlist -j --playlist-end 30 "https://www.tiktok.com/@<handle>" | python3 -c 'import sys,json
for l in sys.stdin:
    v=json.loads(l); print(v["id"], v.get("timestamp"), v.get("view_count"), (v.get("thumbnails") or [{}])[-1].get("url",""))'
   ```
   Le hook est écrit sur la première image : quand l'heure ne suffit pas à rattacher une vidéo à un hook prévu, lis la miniature (ouvre l'URL dans le navigateur intégré et fais un `screenshot`). `timestamp` → date et heure de Paris ; prends le créneau prévu le plus proche (± 1 h). Une vidéo sans hook prévu part avec `hook` = le texte lu sur la miniature.
2. Écris le corps dans `/tmp/hooks-hq.json` :
   ```json
   {
     "date": "AAAA-MM-JJ",
     "hooks": [{"account": "kyliantropa", "slot": "12:00", "kind": "sur", "hook": "…", "description": "…", "inspiration": null}],
     "results": [{"date": "AAAA-MM-JJ", "account": "kyliantropa", "slot": "20:00", "video_id": "74…", "views": 12500, "hook": null}],
     "notes": [
       {"kind": "veille", "text": "hook vu ailleurs", "source": "@getvanish", "likes": 27000, "adaptation": "pov : … pour nous"},
       {"kind": "lecon", "text": "règle apprise aujourd'hui"}
     ]
   }
   ```
   - `date` = le jour du plan (aujourd'hui, ou demain si on prépare demain). `hooks` = **tout** le plan de ce jour : renvoyer le plan le remplace (les hooks déjà mesurés restent).
   - `kind` : `sur` ou `test` ; `inspiration` obligatoire pour un test (« @compte, 27K likes »). `slot` en `HH:MM`, heure de Paris.
   - `results` : une ligne par vidéo relevée, avec sa propre date (jamais dans le futur).
   - `notes` : les formats de l'étape 1 bis (`veille`) et les règles ajoutées au journal à l'étape 3 (`lecon`).
3. Envoie :
   ```bash
   set -a; . ~/anyloc/scripts/tiktok-views/.env; set +a
   curl -sS -X POST "$HQ_URL/api/ingest/hooks" -H "Authorization: Bearer $HQ_INGEST_TOKEN" -H "content-type: application/json" --data @/tmp/hooks-hq.json
   ```
   Réponse attendue : `{"date":…,"hooks":n,"results":n,"notes":n}`. Une erreur 400 dit quel champ corriger ; si l'envoi échoue, le dire dans les alertes et continuer (le journal reste la source de vérité).

## Format de réponse

1. **Alertes** s'il y en a (compte privé, compte qui ne charge pas, envoi au dashboard raté).
2. **Bilan rapide**, 6 blocs très courts :
   - 📤 **Posté depuis la dernière fois** : nombre de vidéos, par compte.
   - 🔥 **Ce qui a marché** : tableau hook / compte / vues.
   - ❌ **Ce qui n'a pas marché** : 2 à 4 lignes.
   - 🔎 **Veille** : les 3 à 5 formats repérés chez les concurrents ou dans d'autres niches (hook, compte, likes).
   - 🧪 **Ce qu'on teste aujourd'hui** : les tests du jour, d'où ils viennent et pourquoi.
   - 🚫 **Ce qu'on ne teste plus** : les angles abandonnés.
3. **Un tableau par compte** : `Heure | Type (✅ sûr / 🧪 test) | Hook | Description (CTA)`.
4. Une phrase finale avec la vidéo du jour qui a le plus de chances de percer.

Pas de blabla. La personne veut copier-coller et tourner.
