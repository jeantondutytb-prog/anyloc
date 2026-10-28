# Agent SAV Crisp

Un agent Claude lit chaque message envoyé dans le chat Crisp et y répond. Il tourne sur Vercel, 24 h/24 : ton ordinateur n'a pas besoin d'être allumé.

## Comment il marche

1. Un visiteur écrit dans Crisp. Crisp appelle `POST /api/crisp/webhook`.
2. La route répond tout de suite à Crisp. L'agent travaille ensuite en arrière-plan :
   - il attend 8 s, au cas où le visiteur envoie sa question en plusieurs messages ;
   - il lit la conversation et l'email du visiteur, puis cherche son compte (Supabase et Stripe) ;
   - il décide entre trois actions : **répondre**, **passer la main** à un humain ou **ne rien dire**.
3. Ce qu'il fait ensuite dépend de `CRISP_AGENT_MODE` :

| Mode | Effet |
|------|-------|
| `off` (défaut) | Rien. |
| `draft` | Il écrit sa réponse en **note privée** (`[IA · brouillon] …`), que le client ne voit pas. Tu relis, puis tu envoies toi-même si c'est bon. **Ne marche pas sur le plan Crisp gratuit** : les notes privées y sont refusées (erreur 402). |
| `live` | Il répond au client sous le nom « Léa · Anyloc ». S'il passe la main, il prévient le client, laisse une note `[IA] À TOI : …`, ajoute le segment `ia-escalade` et repasse la conversation en « non résolue ». |

En mode `live`, il ne répond pas dans deux cas :
- un humain a écrit dans la conversation depuis moins de 12 h ;
- il a passé la main dans cette conversation depuis moins de 24 h (retenu dans la table `support_agent_events`). Sur un plan Crisp payant, il ajoute aussi le segment `ia-escalade` : tant qu'il est présent, l'agent reste silencieux, retire-le pour lui rendre la main.

Chaque décision est enregistrée dans la table Supabase `support_agent_events` (réponse, raison, note), pour relire ce qu'il a fait.

Ses connaissances viennent de [src/lib/support/knowledge.ts](../src/lib/support/knowledge.ts). Les offres, la FAQ, la garantie 48 h et les politiques de remboursement et d'annulation sont reprises des textes du site. Le reste est écrit dans `SUPPORT_PLAYBOOK` : **ajoute-y une réponse dès qu'une question revient souvent.** Ses règles (ton, quand passer la main) sont dans [src/lib/support/agent.ts](../src/lib/support/agent.ts).

## Mise en route

1. **Supabase** : appliquer la migration `supabase/migrations/20261021120000_support_agent_events.sql`.
2. **Clé Anthropic** : en créer une sur console.anthropic.com et la mettre dans `ANTHROPIC_API_KEY` sur Vercel.
3. **Plugin Crisp** (accès à l'API) :
   - va sur marketplace.crisp.chat et crée un plugin privé ;
   - demande les droits de lecture et d'écriture sur les conversations : messages, métadonnées (email, segments), état et indicateur « en train d'écrire ». Les noms exacts sont dans la liste proposée par Crisp ;
   - installe-le sur ton site Crisp ;
   - copie l'identifiant et la clé de production dans `CRISP_PLUGIN_IDENTIFIER` et `CRISP_PLUGIN_KEY`, et ton website ID dans `CRISP_WEBSITE_ID`.
4. **Webhook**, au choix :
   - **Hook du plugin**, recommandé car signé et renvoyé en cas d'échec. URL : `https://anyloc.io/api/crisp/webhook`, événement `message:send`. Mets le secret de signature dans `CRISP_HOOK_SECRET`.
   - **Web Hook du site** (Réglages → Avancé → Web Hooks). URL : `https://anyloc.io/api/crisp/webhook?key=UNE_CLE_LONGUE_ALEATOIRE`, événement `message:send`. Mets la même clé dans `CRISP_WEBHOOK_KEY`.
5. **Mode** : `CRISP_AGENT_MODE=draft` sur Vercel, puis redéploie. Écris-toi dans le chat du site pour voir la note apparaître.
6. Une fois les brouillons jugés bons pendant quelques jours : `CRISP_AGENT_MODE=live`.

Si ton plan Crisp gratuit refuse l'une de ces étapes (plugin, hooks, API), il faut passer au plan Mini.

## Ce qu'il ne fait jamais

- Rembourser, annuler ou modifier un abonnement : il n'a aucun outil pour agir, il ne fait que lire.
- Révéler les données d'un compte. L'email dans Crisp est tapé par le visiteur, donc non vérifié. L'agent ne lit le compte (formule, téléphones, position activée) qu'en mode `draft`, où tu relis avant le client. En mode `live`, il répond sans données de compte et renvoie vers l'espace connecté.
- Répondre sur une demande de remboursement ou un litige : il passe la main.
