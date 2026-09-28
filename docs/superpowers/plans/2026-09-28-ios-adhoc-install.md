# Installation iPhone en un bouton (ad hoc, 1 an) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un abonné « formule 1 an » installe l'app Anyloc sur son iPhone depuis Safari, sans ordi ni câble, avec une signature valable 1 an (fin du renouvellement tous les 7 jours).

**Architecture:** Le dashboard sert un profil `.mobileconfig` « Profile Service » qui renvoie l'UDID de l'iPhone à notre API. L'API enregistre l'UDID sur le compte Apple Developer (App Store Connect API), puis déclenche un workflow GitHub Actions (macOS) qui régénère un profil ad hoc contenant tous les iPhones enregistrés, re-signe l'IPA de base avec le certificat Apple Distribution et l'upload sur Vercel Blob. Le dashboard interroge un statut et, quand l'app est prête, propose un lien `itms-services://` qui installe l'app en OTA.

**Tech Stack:** Next.js 16 (App Router, route handlers), Supabase (Postgres + RLS), Vercel Blob (privé), App Store Connect API (JWT ES256 via `node:crypto`), GitHub Actions `macos-15`, `codesign`, package `plist`, tests `node:test` lancés via `tsx`.

**Spec:** pas de spec séparée — le besoin est défini dans la conversation du 2026-09-28 (copier le parcours iPhone de Locaflex : compte Apple Developer payant, enregistrement UDID en un bouton, signature ad hoc 1 an). Les contraintes ci-dessous en tiennent lieu.

## Global Constraints

- Lire `node_modules/next/dist/docs/` (route handlers, params asynchrones) avant d'écrire une route — Next 16 diffère des versions connues (voir `AGENTS.md`).
- Bundle ID iOS : `io.anyloc.app`. Dépôt GitHub : `jeantondutytb-prog/anyloc`.
- Accès réservé aux plans `annual`, `admin`, `clipper`, **hors essai** (`access.isTrial === false`) — constante unique `IOS_ADHOC_ELIGIBLE_PLANS`.
- Limite Apple : 100 iPhones par compte et par année d'adhésion ; on plafonne à **95** (5 réservés aux tests) — `IOS_ADHOC_ACCOUNT_DEVICE_LIMIT`.
- **1** iPhone par utilisateur — `IOS_ADHOC_MAX_DEVICES_PER_USER`.
- Textes UI en français, tutoiement, ton du site existant.
- Aucun secret en dur ni dans les logs. Secrets serveur (Vercel) : `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY`, `GITHUB_DISPATCH_TOKEN`, `IOS_BUILD_CALLBACK_SECRET`, `IOS_INSTALL_LINK_SECRET`. Secrets CI (GitHub) : `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY`, `ASC_DISTRIBUTION_CERT_ID`, `DIST_CERTIFICATE_P12_BASE64`, `DIST_CERTIFICATE_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, `IOS_BUILD_CALLBACK_SECRET`, `ANYLOC_API_URL`.
- Tests : style `node:test` + `node:assert/strict`, comme `src/lib/oauth-origin.test.ts`.
- Hors scope : spoofing GPS directement sur l'iPhone sans ordi (plan séparé), notarisation du `.dmg` Mac (plan séparé).

## Prérequis manuels (hors code, à faire par Jean une fois le compte Apple validé)

1. Noter le **Team ID** (developer.apple.com/account → Membership details).
2. Certificates, IDs & Profiles → **Identifiers** → vérifier/créer l'App ID explicite `io.anyloc.app`.
3. Créer un certificat **Apple Distribution** (Xcode → Settings → Accounts → Manage Certificates → + → Apple Distribution), l'exporter en `.p12` avec mot de passe depuis Trousseau. Noter son ID ASC (visible dans l'URL de la page du certificat sur developer.apple.com).
4. App Store Connect → Users and Access → Integrations → **App Store Connect API** → générer une clé rôle *Admin*. Noter Key ID + Issuer ID, télécharger le `.p8` (une seule fois possible).
5. GitHub → Settings → Developer settings → fine-grained token limité au dépôt `anyloc`, permission **Actions: Read and write** → `GITHUB_DISPATCH_TOKEN`.
6. Générer deux secrets aléatoires : `openssl rand -hex 32` (×2) → `IOS_BUILD_CALLBACK_SECRET`, `IOS_INSTALL_LINK_SECRET`.
7. Renseigner les secrets listés dans Global Constraints (Vercel + GitHub). Ne jamais les coller dans le chat.

## File Structure

| Fichier | Rôle |
|---|---|
| `package.json` | + devDeps `tsx`, `plist`, `@types/plist` ; script `test` |
| `supabase/migrations/20260928120000_ios_adhoc.sql` | Tables `ios_devices`, `ios_adhoc_builds` |
| `src/lib/ios-adhoc/config.ts` | Constantes + `isEligibleForIosAdhoc` |
| `src/lib/ios-adhoc/mobileconfig.ts` | Génère le profil d'enrôlement, parse la réponse de l'iPhone |
| `src/lib/ios-adhoc/install-link.ts` | Token signé HMAC, `manifest.plist`, URL `itms-services` |
| `src/lib/ios-adhoc/app-store-connect.ts` | JWT ASC + client (devices, bundleIds, profiles). Aucun import `@/` (utilisé par un script CI) |
| `src/lib/ios-adhoc/build-queue.ts` | Logique pure : état d'installation, besoin d'un nouveau build |
| `src/lib/ios-adhoc/github-dispatch.ts` | Déclenche le workflow de re-signature |
| `src/lib/ios-adhoc/store.ts` | Accès Supabase (client admin) |
| `src/lib/ios-adhoc/service.ts` | Orchestration : démarrer/terminer l'enrôlement, assurer un build |
| `src/app/api/ios/enroll/route.ts` | GET → `.mobileconfig` |
| `src/app/api/ios/enroll/callback/[enrollmentId]/route.ts` | POST de l'iPhone → enregistre l'UDID |
| `src/app/api/ios/status/route.ts` | GET → état + lien d'install |
| `src/app/api/ios/manifest/route.ts` | GET → `manifest.plist` OTA |
| `src/app/api/ios/builds/complete/route.ts` | POST du workflow CI |
| `src/lib/downloads.ts` | Exporter `presignPrivateBlobUrl` |
| `src/app/dashboard/(protected)/iphone/page.tsx` + `src/components/dashboard/iphone-install-view.tsx` | Page « App iPhone » |
| `src/components/dashboard/dashboard-menu.tsx` | Entrée de menu |
| `scripts/ios-adhoc-profile.ts`, `scripts/resign-ios-adhoc.sh`, `scripts/upload-ios-adhoc.mjs` | Outils CI |
| `.github/workflows/ios-adhoc-resign.yml` | Workflow de re-signature |
| `apps/ios/Anyloc/SignatureRenewalService.swift`, `SettingsView.swift` | Masquer le renouvellement 7 jours en ad hoc |

---

### Task 1: Harnais de tests + dépendances

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: commande `npm test` qui exécute tous les `src/**/*.test.ts` et `scripts/**/*.test.ts` avec résolution de l'alias `@/`.

- [ ] **Step 1: Installer les dépendances**

```bash
npm install plist
npm install -D tsx @types/plist
```

- [ ] **Step 2: Ajouter le script de test** dans `package.json` → `scripts` :

```json
"test": "node --import tsx --test \"src/**/*.test.ts\""
```

- [ ] **Step 3: Vérifier que le test existant passe**

Run: `npm test`
Expected: `oauth-origin` — tous les tests `pass`, `fail 0`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add test runner (tsx + node:test) and plist"
```

---

### Task 2: Migration Supabase

**Files:**
- Create: `supabase/migrations/20260928120000_ios_adhoc.sql`

**Interfaces:**
- Produces: tables `public.ios_devices` et `public.ios_adhoc_builds` (colonnes ci-dessous, utilisées par `store.ts`).

- [ ] **Step 1: Écrire la migration**

```sql
create table if not exists public.ios_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'awaiting_udid'
    check (status in ('awaiting_udid', 'registered', 'failed')),
  enrollment_challenge_hash text not null,
  enrollment_expires_at timestamptz not null,
  udid text unique,
  product text,
  os_version text,
  asc_device_id text,
  error text,
  registered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ios_devices_user_created_idx
  on public.ios_devices (user_id, created_at desc);

alter table public.ios_devices enable row level security;

create policy "Users can read own ios devices"
  on public.ios_devices
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.ios_adhoc_builds (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued'
    check (status in ('queued', 'succeeded', 'failed')),
  udids text[] not null default '{}',
  ipa_blob_path text,
  bundle_version text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Un seul build en file à la fois (évite les doubles déclenchements concurrents).
create unique index if not exists ios_adhoc_builds_one_queued
  on public.ios_adhoc_builds ((true))
  where status = 'queued';

create index if not exists ios_adhoc_builds_created_idx
  on public.ios_adhoc_builds (created_at desc);

-- Service role uniquement : aucune policy.
alter table public.ios_adhoc_builds enable row level security;
```

- [ ] **Step 2: Appliquer sur une branche Supabase de dev** (MCP Supabase `apply_migration` ou `supabase db push` sur la branche de preview) et vérifier :

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'ios_%';
```
Expected: `ios_adhoc_builds`, `ios_devices`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260928120000_ios_adhoc.sql
git commit -m "feat(ios-adhoc): add ios_devices and ios_adhoc_builds tables"
```

---

### Task 3: Config et éligibilité

**Files:**
- Create: `src/lib/ios-adhoc/config.ts`
- Test: `src/lib/ios-adhoc/config.test.ts`

**Interfaces:**
- Produces:
  - `IOS_ADHOC_BUNDLE_ID = "io.anyloc.app"`
  - `IOS_ADHOC_ACCOUNT_DEVICE_LIMIT = 95`, `IOS_ADHOC_MAX_DEVICES_PER_USER = 1`
  - `IOS_ADHOC_ENROLLMENT_TTL_MS`, `IOS_ADHOC_BUILD_STALE_MS`, `IOS_ADHOC_FAILED_BUILD_BACKOFF_MS`, `IOS_ADHOC_INSTALL_LINK_TTL_MS`
  - `isEligibleForIosAdhoc(access: EligibilityInput | null): boolean` avec `EligibilityInput = Pick<SubscriptionAccess, "hasAccess" | "planId" | "isTrial">`

- [ ] **Step 1: Écrire le test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isEligibleForIosAdhoc } from "./config";

describe("isEligibleForIosAdhoc", () => {
  it("accepts paid annual, admin and clipper", () => {
    for (const planId of ["annual", "admin", "clipper"]) {
      assert.equal(isEligibleForIosAdhoc({ hasAccess: true, planId, isTrial: false }), true);
    }
  });

  it("rejects other plans, trials, inactive and missing access", () => {
    assert.equal(isEligibleForIosAdhoc({ hasAccess: true, planId: "monthly", isTrial: false }), false);
    assert.equal(isEligibleForIosAdhoc({ hasAccess: true, planId: "6months", isTrial: false }), false);
    assert.equal(isEligibleForIosAdhoc({ hasAccess: true, planId: "annual", isTrial: true }), false);
    assert.equal(isEligibleForIosAdhoc({ hasAccess: false, planId: "annual", isTrial: false }), false);
    assert.equal(isEligibleForIosAdhoc(null), false);
  });
});
```

- [ ] **Step 2: Lancer** `npm test` → FAIL (`Cannot find module './config'`).

- [ ] **Step 3: Implémenter**

```ts
import type { SubscriptionAccess } from "@/lib/subscription";

export const IOS_ADHOC_BUNDLE_ID = "io.anyloc.app";

/** Plans qui incluent l'app iPhone (la « formule 1 an »). */
export const IOS_ADHOC_ELIGIBLE_PLANS = new Set(["annual", "admin", "clipper"]);

/** Apple : 100 iPhones par compte et par année d'adhésion — 5 gardés pour les tests. */
export const IOS_ADHOC_ACCOUNT_DEVICE_LIMIT = 95;
export const IOS_ADHOC_MAX_DEVICES_PER_USER = 1;

export const IOS_ADHOC_ENROLLMENT_TTL_MS = 30 * 60 * 1000;
export const IOS_ADHOC_BUILD_STALE_MS = 45 * 60 * 1000;
export const IOS_ADHOC_FAILED_BUILD_BACKOFF_MS = 10 * 60 * 1000;
export const IOS_ADHOC_INSTALL_LINK_TTL_MS = 60 * 60 * 1000;

type EligibilityInput = Pick<SubscriptionAccess, "hasAccess" | "planId" | "isTrial">;

export function isEligibleForIosAdhoc(access: EligibilityInput | null) {
  return Boolean(
    access?.hasAccess &&
      !access.isTrial &&
      access.planId &&
      IOS_ADHOC_ELIGIBLE_PLANS.has(access.planId)
  );
}
```

- [ ] **Step 4: Lancer** `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ios-adhoc/config.ts src/lib/ios-adhoc/config.test.ts
git commit -m "feat(ios-adhoc): eligibility rules and limits"
```

---

### Task 4: Profil d'enrôlement `.mobileconfig`

**Files:**
- Create: `src/lib/ios-adhoc/mobileconfig.ts`
- Test: `src/lib/ios-adhoc/mobileconfig.test.ts`

**Interfaces:**
- Produces:
  - `buildEnrollmentProfile(input: { callbackUrl: string; challenge: string; profileUuid: string }): string` (XML plist)
  - `parseDeviceAttributes(body: Buffer): DeviceAttributes | null` avec `DeviceAttributes = { udid: string; challenge: string; product: string | null; osVersion: string | null }`
  - `createEnrollmentChallenge(): { challenge: string; hash: string }` et `hashChallenge(challenge: string): string`

L'iPhone renvoie un plist enveloppé dans une signature PKCS#7 (DER). On n'a pas besoin de vérifier la signature (le `Challenge` à usage unique authentifie la requête) : on extrait le bloc `<?xml … </plist>`.

- [ ] **Step 1: Écrire le test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import plist from "plist";
import {
  buildEnrollmentProfile,
  createEnrollmentChallenge,
  hashChallenge,
  parseDeviceAttributes,
} from "./mobileconfig";

describe("buildEnrollmentProfile", () => {
  it("builds a Profile Service payload asking for the UDID", () => {
    const xml = buildEnrollmentProfile({
      callbackUrl: "https://www.anyloc.io/api/ios/enroll/callback/abc",
      challenge: "chal",
      profileUuid: "11111111-1111-1111-1111-111111111111",
    });
    const parsed = plist.parse(xml) as Record<string, unknown>;
    assert.equal(parsed.PayloadType, "Profile Service");
    const content = parsed.PayloadContent as Record<string, unknown>;
    assert.equal(content.URL, "https://www.anyloc.io/api/ios/enroll/callback/abc");
    assert.equal(content.Challenge, "chal");
    assert.deepEqual(content.DeviceAttributes, ["UDID", "PRODUCT", "VERSION"]);
  });
});

describe("parseDeviceAttributes", () => {
  const inner = plist.build({
    UDID: "00008110-000A1B2C3D4E5F6A",
    CHALLENGE: "chal",
    PRODUCT: "iPhone15,2",
    VERSION: "22A3354",
  });

  it("extracts attributes from a PKCS#7-wrapped plist", () => {
    const body = Buffer.concat([
      Buffer.from([0x30, 0x80, 0x06, 0x09]),
      Buffer.from(inner, "utf8"),
      Buffer.from([0x00, 0x00, 0xa0]),
    ]);
    assert.deepEqual(parseDeviceAttributes(body), {
      udid: "00008110-000A1B2C3D4E5F6A",
      challenge: "chal",
      product: "iPhone15,2",
      osVersion: "22A3354",
    });
  });

  it("returns null without UDID or challenge", () => {
    assert.equal(parseDeviceAttributes(Buffer.from("garbage")), null);
    const noUdid = plist.build({ CHALLENGE: "chal" });
    assert.equal(parseDeviceAttributes(Buffer.from(noUdid)), null);
  });
});

describe("challenge", () => {
  it("hash matches the generated challenge", () => {
    const { challenge, hash } = createEnrollmentChallenge();
    assert.ok(challenge.length >= 32);
    assert.equal(hashChallenge(challenge), hash);
  });
});
```

- [ ] **Step 2: Lancer** `npm test` → FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```ts
import { createHash, randomBytes } from "node:crypto";
import plist from "plist";

export type DeviceAttributes = {
  udid: string;
  challenge: string;
  product: string | null;
  osVersion: string | null;
};

export function hashChallenge(challenge: string) {
  return createHash("sha256").update(challenge).digest("hex");
}

export function createEnrollmentChallenge() {
  const challenge = randomBytes(32).toString("base64url");
  return { challenge, hash: hashChallenge(challenge) };
}

export function buildEnrollmentProfile(input: {
  callbackUrl: string;
  challenge: string;
  profileUuid: string;
}) {
  return plist.build({
    PayloadContent: {
      URL: input.callbackUrl,
      DeviceAttributes: ["UDID", "PRODUCT", "VERSION"],
      Challenge: input.challenge,
    },
    PayloadOrganization: "Anyloc",
    PayloadDisplayName: "Anyloc — identification de l'iPhone",
    PayloadDescription:
      "Permet à Anyloc de préparer l'app pour ton iPhone. Rien n'est installé en dehors de l'app Anyloc.",
    PayloadIdentifier: "io.anyloc.enroll",
    PayloadUUID: input.profileUuid,
    PayloadVersion: 1,
    PayloadType: "Profile Service",
  });
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseDeviceAttributes(body: Buffer): DeviceAttributes | null {
  const text = body.toString("latin1");
  const start = text.indexOf("<?xml");
  const endTag = "</plist>";
  const end = text.indexOf(endTag, start);

  if (start === -1 || end === -1) {
    return null;
  }

  let parsed: unknown;
  try {
    const xml = Buffer.from(text.slice(start, end + endTag.length), "latin1").toString("utf8");
    parsed = plist.parse(xml);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const udid = readString(record, "UDID");
  const challenge = readString(record, "CHALLENGE");

  if (!udid || !challenge) {
    return null;
  }

  return {
    udid,
    challenge,
    product: readString(record, "PRODUCT"),
    osVersion: readString(record, "VERSION"),
  };
}
```

- [ ] **Step 4: Lancer** `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ios-adhoc/mobileconfig.ts src/lib/ios-adhoc/mobileconfig.test.ts
git commit -m "feat(ios-adhoc): enrollment mobileconfig and UDID parsing"
```

---

### Task 5: Lien d'installation OTA (token, manifest, itms-services)

**Files:**
- Create: `src/lib/ios-adhoc/install-link.ts`
- Test: `src/lib/ios-adhoc/install-link.test.ts`

**Interfaces:**
- Produces:
  - `InstallTokenPayload = { userId: string; buildId: string; exp: number }` (`exp` en ms epoch)
  - `signInstallToken(payload: InstallTokenPayload, secret: string): string`
  - `verifyInstallToken(token: string, secret: string, now: number): InstallTokenPayload | null`
  - `buildInstallManifest(input: { ipaUrl: string; bundleId: string; bundleVersion: string; title: string }): string`
  - `buildItmsServicesUrl(manifestUrl: string): string`

- [ ] **Step 1: Écrire le test**

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import plist from "plist";
import {
  buildInstallManifest,
  buildItmsServicesUrl,
  signInstallToken,
  verifyInstallToken,
} from "./install-link";

const SECRET = "test-secret";

describe("install token", () => {
  const payload = { userId: "u1", buildId: "b1", exp: 2_000 };

  it("round-trips before expiry", () => {
    const token = signInstallToken(payload, SECRET);
    assert.deepEqual(verifyInstallToken(token, SECRET, 1_000), payload);
  });

  it("rejects expired, tampered or wrongly signed tokens", () => {
    const token = signInstallToken(payload, SECRET);
    assert.equal(verifyInstallToken(token, SECRET, 3_000), null);
    assert.equal(verifyInstallToken(token, "other", 1_000), null);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, userId: "u2" })).toString("base64url");
    assert.equal(verifyInstallToken(`${forged}.${sig}`, SECRET, 1_000), null);
    assert.equal(verifyInstallToken(body, SECRET, 1_000), null);
    assert.equal(verifyInstallToken("", SECRET, 1_000), null);
  });
});

describe("buildInstallManifest", () => {
  it("describes a software-package asset", () => {
    const xml = buildInstallManifest({
      ipaUrl: "https://blob.example/Anyloc.ipa",
      bundleId: "io.anyloc.app",
      bundleVersion: "42",
      title: "Anyloc",
    });
    const parsed = plist.parse(xml) as {
      items: Array<{ assets: Array<{ kind: string; url: string }>; metadata: Record<string, string> }>;
    };
    assert.deepEqual(parsed.items[0].assets, [
      { kind: "software-package", url: "https://blob.example/Anyloc.ipa" },
    ]);
    assert.equal(parsed.items[0].metadata["bundle-identifier"], "io.anyloc.app");
    assert.equal(parsed.items[0].metadata["bundle-version"], "42");
    assert.equal(parsed.items[0].metadata.kind, "software");
  });
});

describe("buildItmsServicesUrl", () => {
  it("encodes the manifest URL", () => {
    assert.equal(
      buildItmsServicesUrl("https://www.anyloc.io/api/ios/manifest?t=a.b"),
      "itms-services://?action=download-manifest&url=https%3A%2F%2Fwww.anyloc.io%2Fapi%2Fios%2Fmanifest%3Ft%3Da.b"
    );
  });
});
```

- [ ] **Step 2: Lancer** `npm test` → FAIL.

- [ ] **Step 3: Implémenter**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import plist from "plist";

export type InstallTokenPayload = { userId: string; buildId: string; exp: number };

function signature(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signInstallToken(payload: InstallTokenPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body, secret)}`;
}

export function verifyInstallToken(
  token: string,
  secret: string,
  now: number
): InstallTokenPayload | null {
  const [body, sig, extra] = token.split(".");

  if (!body || !sig || extra !== undefined) {
    return null;
  }

  const expected = Buffer.from(signature(body, secret));
  const received = Buffer.from(sig);

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as InstallTokenPayload;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.buildId !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= now
    ) {
      return null;
    }
    return { userId: payload.userId, buildId: payload.buildId, exp: payload.exp };
  } catch {
    return null;
  }
}

export function buildInstallManifest(input: {
  ipaUrl: string;
  bundleId: string;
  bundleVersion: string;
  title: string;
}) {
  return plist.build({
    items: [
      {
        assets: [{ kind: "software-package", url: input.ipaUrl }],
        metadata: {
          "bundle-identifier": input.bundleId,
          "bundle-version": input.bundleVersion,
          kind: "software",
          title: input.title,
        },
      },
    ],
  });
}

export function buildItmsServicesUrl(manifestUrl: string) {
  return `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
}
```

- [ ] **Step 4: Lancer** `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ios-adhoc/install-link.ts src/lib/ios-adhoc/install-link.test.ts
git commit -m "feat(ios-adhoc): signed install links and OTA manifest"
```

---

### Task 6: Client App Store Connect API

**Files:**
- Create: `src/lib/ios-adhoc/app-store-connect.ts`
- Test: `src/lib/ios-adhoc/app-store-connect.test.ts`

**Interfaces:**
- Produces:
  - `AscCredentials = { keyId: string; issuerId: string; privateKey: string }` (`privateKey` = contenu PEM du `.p8`)
  - `createAscToken(creds: AscCredentials, nowSeconds?: number): string`
  - `createAscClient(creds: AscCredentials, fetchImpl?: typeof fetch)` → objet avec :
    - `registerDevice(udid: string, name: string): Promise<string>` (id ASC ; réutilise l'appareil existant si 409)
    - `listEnabledIosDevices(): Promise<Array<{ id: string; udid: string }>>`
    - `findBundleIdId(identifier: string): Promise<string>`
    - `deleteProfilesNamed(name: string): Promise<void>`
    - `createAdhocProfile(input: { name: string; bundleIdId: string; certificateId: string; deviceIds: string[] }): Promise<string>` (base64 du `.mobileprovision`)
- Contrainte : **aucun import `@/`** (le fichier est importé par `scripts/ios-adhoc-profile.ts`).

- [ ] **Step 1: Écrire le test**

```ts
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import { describe, it } from "node:test";
import { createAscClient, createAscToken } from "./app-store-connect";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const creds = {
  keyId: "KEY123",
  issuerId: "issuer-uuid",
  privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

type Call = { url: string; method: string; body: unknown };

function fakeFetch(responses: Array<{ status: number; json?: unknown }>) {
  const calls: Call[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected call ${url}`);
    return new Response(next.json === undefined ? null : JSON.stringify(next.json), {
      status: next.status,
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("createAscToken", () => {
  it("produces a verifiable ES256 JWT for App Store Connect", () => {
    const token = createAscToken(creds, 1_000);
    const [h, p, s] = token.split(".");
    assert.deepEqual(JSON.parse(Buffer.from(h, "base64url").toString()), {
      alg: "ES256",
      kid: "KEY123",
      typ: "JWT",
    });
    assert.deepEqual(JSON.parse(Buffer.from(p, "base64url").toString()), {
      iss: "issuer-uuid",
      iat: 1_000,
      exp: 1_900,
      aud: "appstoreconnect-v1",
    });
    const ok = verify(
      "sha256",
      Buffer.from(`${h}.${p}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(s, "base64url")
    );
    assert.equal(ok, true);
  });
});

describe("registerDevice", () => {
  it("creates the device", async () => {
    const { impl, calls } = fakeFetch([{ status: 201, json: { data: { id: "DEV1" } } }]);
    const id = await createAscClient(creds, impl).registerDevice("UDID-1", "Anyloc u1");
    assert.equal(id, "DEV1");
    assert.equal(calls[0].url, "https://api.appstoreconnect.apple.com/v1/devices");
    assert.equal(calls[0].method, "POST");
    assert.deepEqual(calls[0].body, {
      data: { type: "devices", attributes: { name: "Anyloc u1", udid: "UDID-1", platform: "IOS" } },
    });
  });

  it("reuses an already registered device on 409", async () => {
    const { impl, calls } = fakeFetch([
      { status: 409, json: { errors: [{ detail: "already exists" }] } },
      { status: 200, json: { data: [{ id: "DEV9" }] } },
    ]);
    assert.equal(await createAscClient(creds, impl).registerDevice("UDID-1", "x"), "DEV9");
    assert.equal(
      calls[1].url,
      "https://api.appstoreconnect.apple.com/v1/devices?filter[udid]=UDID-1&limit=1"
    );
  });

  it("throws on other errors", async () => {
    const { impl } = fakeFetch([{ status: 403, json: { errors: [{ detail: "forbidden" }] } }]);
    await assert.rejects(createAscClient(creds, impl).registerDevice("U", "x"), /HTTP 403/);
  });
});

describe("profiles", () => {
  it("lists devices, deletes old profiles and creates the ad hoc profile", async () => {
    const { impl, calls } = fakeFetch([
      { status: 200, json: { data: [{ id: "D1", attributes: { udid: "U1" } }] } },
      { status: 200, json: { data: [{ id: "P-old" }] } },
      { status: 204 },
      { status: 201, json: { data: { attributes: { profileContent: "BASE64" } } } },
    ]);
    const asc = createAscClient(creds, impl);
    assert.deepEqual(await asc.listEnabledIosDevices(), [{ id: "D1", udid: "U1" }]);
    await asc.deleteProfilesNamed("Anyloc AdHoc");
    const content = await asc.createAdhocProfile({
      name: "Anyloc AdHoc",
      bundleIdId: "B1",
      certificateId: "C1",
      deviceIds: ["D1"],
    });
    assert.equal(content, "BASE64");
    assert.equal(calls[2].method, "DELETE");
    assert.equal(calls[2].url, "https://api.appstoreconnect.apple.com/v1/profiles/P-old");
    assert.deepEqual(calls[3].body, {
      data: {
        type: "profiles",
        attributes: { name: "Anyloc AdHoc", profileType: "IOS_APP_ADHOC" },
        relationships: {
          bundleId: { data: { type: "bundleIds", id: "B1" } },
          certificates: { data: [{ type: "certificates", id: "C1" }] },
          devices: { data: [{ type: "devices", id: "D1" }] },
        },
      },
    });
  });
});
```

- [ ] **Step 2: Lancer** `npm test` → FAIL.

- [ ] **Step 3: Implémenter**

```ts
import { createPrivateKey, sign } from "node:crypto";

const ASC_BASE_URL = "https://api.appstoreconnect.apple.com";
const TOKEN_LIFETIME_SECONDS = 15 * 60;

export type AscCredentials = { keyId: string; issuerId: string; privateKey: string };

type AscResponse = { status: number; json: any };

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function createAscToken(
  creds: AscCredentials,
  nowSeconds = Math.floor(Date.now() / 1000)
) {
  const header = { alg: "ES256", kid: creds.keyId, typ: "JWT" };
  const payload = {
    iss: creds.issuerId,
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
    aud: "appstoreconnect-v1",
  };
  const input = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = sign("sha256", Buffer.from(input), {
    key: createPrivateKey(creds.privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${input}.${base64url(signature)}`;
}

function describeError(label: string, response: AscResponse) {
  const detail = response.json?.errors?.[0]?.detail ?? "";
  return new Error(`${label}: HTTP ${response.status} ${detail}`.trim());
}

export function createAscClient(creds: AscCredentials, fetchImpl: typeof fetch = fetch) {
  async function request(
    path: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<AscResponse> {
    const response = await fetchImpl(`${ASC_BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${createAscToken(creds)}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null };
  }

  return {
    async registerDevice(udid: string, name: string) {
      const created = await request("/v1/devices", {
        method: "POST",
        body: { data: { type: "devices", attributes: { name, udid, platform: "IOS" } } },
      });

      if (created.status === 201) {
        return created.json.data.id as string;
      }

      if (created.status === 409) {
        const existing = await request(
          `/v1/devices?filter[udid]=${encodeURIComponent(udid)}&limit=1`
        );
        const id = existing.json?.data?.[0]?.id;
        if (existing.status === 200 && typeof id === "string") {
          return id;
        }
      }

      throw describeError("registerDevice", created);
    },

    async listEnabledIosDevices() {
      const response = await request(
        "/v1/devices?filter[platform]=IOS&filter[status]=ENABLED&limit=200"
      );
      if (response.status !== 200) throw describeError("listDevices", response);
      return (response.json.data as Array<{ id: string; attributes: { udid: string } }>).map(
        (device) => ({ id: device.id, udid: device.attributes.udid })
      );
    },

    async findBundleIdId(identifier: string) {
      const response = await request(
        `/v1/bundleIds?filter[identifier]=${encodeURIComponent(identifier)}&limit=1`
      );
      const id = response.json?.data?.[0]?.id;
      if (response.status !== 200 || typeof id !== "string") {
        throw describeError(`findBundleId ${identifier}`, response);
      }
      return id;
    },

    async deleteProfilesNamed(name: string) {
      const response = await request(
        `/v1/profiles?filter[name]=${encodeURIComponent(name)}&limit=200`
      );
      if (response.status !== 200) throw describeError("listProfiles", response);
      for (const profile of response.json.data as Array<{ id: string }>) {
        const deleted = await request(`/v1/profiles/${profile.id}`, { method: "DELETE" });
        if (deleted.status !== 204) throw describeError("deleteProfile", deleted);
      }
    },

    async createAdhocProfile(input: {
      name: string;
      bundleIdId: string;
      certificateId: string;
      deviceIds: string[];
    }) {
      const response = await request("/v1/profiles", {
        method: "POST",
        body: {
          data: {
            type: "profiles",
            attributes: { name: input.name, profileType: "IOS_APP_ADHOC" },
            relationships: {
              bundleId: { data: { type: "bundleIds", id: input.bundleIdId } },
              certificates: { data: [{ type: "certificates", id: input.certificateId }] },
              devices: { data: input.deviceIds.map((id) => ({ type: "devices", id })) },
            },
          },
        },
      });
      const content = response.json?.data?.attributes?.profileContent;
      if (response.status !== 201 || typeof content !== "string") {
        throw describeError("createProfile", response);
      }
      return content;
    },
  };
}

export function ascCredentialsFromEnv(env: NodeJS.ProcessEnv = process.env): AscCredentials {
  const keyId = env.ASC_KEY_ID?.trim();
  const issuerId = env.ASC_ISSUER_ID?.trim();
  const privateKey = env.ASC_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!keyId || !issuerId || !privateKey) {
    throw new Error("ASC_KEY_ID, ASC_ISSUER_ID et ASC_PRIVATE_KEY sont requis.");
  }
  return { keyId, issuerId, privateKey };
}
```

- [ ] **Step 4: Lancer** `npm test` → PASS. Puis `npx eslint src/lib/ios-adhoc` ; si la règle `no-explicit-any` bloque sur `json: any`, ajouter `// eslint-disable-next-line @typescript-eslint/no-explicit-any` juste au-dessus du type `AscResponse`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ios-adhoc/app-store-connect.ts src/lib/ios-adhoc/app-store-connect.test.ts
git commit -m "feat(ios-adhoc): App Store Connect API client"
```

---

### Task 7: Logique pure de file de build + déclenchement GitHub

**Files:**
- Create: `src/lib/ios-adhoc/build-queue.ts`, `src/lib/ios-adhoc/github-dispatch.ts`
- Test: `src/lib/ios-adhoc/build-queue.test.ts`, `src/lib/ios-adhoc/github-dispatch.test.ts`

**Interfaces:**
- Consumes: constantes de `config.ts` (Task 3).
- Produces:
  - Types `IosDeviceRow`, `IosBuildRow` (miroir des tables de la Task 2) :
    ```ts
    type IosDeviceRow = { id: string; user_id: string; status: "awaiting_udid" | "registered" | "failed"; udid: string | null; error: string | null; enrollment_expires_at: string; created_at: string };
    type IosBuildRow = { id: string; status: "queued" | "succeeded" | "failed"; udids: string[]; ipa_blob_path: string | null; bundle_version: string | null; created_at: string };
    ```
  - `IosInstallState = { kind: "not_started" } | { kind: "awaiting_udid" } | { kind: "preparing" } | { kind: "ready"; buildId: string } | { kind: "failed"; message: string }`
  - `getIosInstallState(input: { device: IosDeviceRow | null; latestSucceededBuild: IosBuildRow | null; now: number }): IosInstallState`
  - `needsNewBuild(input: { registeredUdids: string[]; latestBuild: IosBuildRow | null; latestSucceededBuild: IosBuildRow | null; now: number }): boolean`
  - `isBuildStale(build: IosBuildRow, now: number): boolean`
  - `dispatchResignWorkflow(buildId: string, fetchImpl?: typeof fetch): Promise<void>`

- [ ] **Step 1: Écrire les tests**

`src/lib/ios-adhoc/build-queue.test.ts` :

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getIosInstallState,
  needsNewBuild,
  type IosBuildRow,
  type IosDeviceRow,
} from "./build-queue";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

function device(overrides: Partial<IosDeviceRow> = {}): IosDeviceRow {
  return {
    id: "d1",
    user_id: "u1",
    status: "registered",
    udid: "U1",
    error: null,
    enrollment_expires_at: iso(-60_000),
    created_at: iso(60_000),
    ...overrides,
  };
}

function build(overrides: Partial<IosBuildRow> = {}): IosBuildRow {
  return {
    id: "b1",
    status: "succeeded",
    udids: ["U1"],
    ipa_blob_path: "releases/ios-adhoc/Anyloc-b1.ipa",
    bundle_version: "1",
    created_at: iso(60_000),
    ...overrides,
  };
}

describe("getIosInstallState", () => {
  it("not_started without device or with an expired enrollment", () => {
    assert.deepEqual(getIosInstallState({ device: null, latestSucceededBuild: null, now: NOW }), { kind: "not_started" });
    const expired = device({ status: "awaiting_udid", udid: null, enrollment_expires_at: iso(1) });
    assert.deepEqual(getIosInstallState({ device: expired, latestSucceededBuild: null, now: NOW }), { kind: "not_started" });
  });

  it("awaiting_udid while the enrollment is open", () => {
    const pending = device({ status: "awaiting_udid", udid: null });
    assert.deepEqual(getIosInstallState({ device: pending, latestSucceededBuild: null, now: NOW }), { kind: "awaiting_udid" });
  });

  it("failed with the stored error", () => {
    const failed = device({ status: "failed", error: "Cet iPhone est déjà lié à un autre compte." });
    assert.deepEqual(getIosInstallState({ device: failed, latestSucceededBuild: null, now: NOW }), {
      kind: "failed",
      message: "Cet iPhone est déjà lié à un autre compte.",
    });
  });

  it("preparing until a succeeded build includes the UDID, then ready", () => {
    assert.deepEqual(getIosInstallState({ device: device(), latestSucceededBuild: build({ udids: ["OTHER"] }), now: NOW }), { kind: "preparing" });
    assert.deepEqual(getIosInstallState({ device: device(), latestSucceededBuild: build(), now: NOW }), { kind: "ready", buildId: "b1" });
  });
});

describe("needsNewBuild", () => {
  it("false when every registered UDID is already signed", () => {
    assert.equal(needsNewBuild({ registeredUdids: ["U1"], latestBuild: build(), latestSucceededBuild: build(), now: NOW }), false);
  });

  it("true when a UDID is missing and nothing is queued", () => {
    assert.equal(needsNewBuild({ registeredUdids: ["U1", "U2"], latestBuild: build(), latestSucceededBuild: build(), now: NOW }), true);
    assert.equal(needsNewBuild({ registeredUdids: ["U1"], latestBuild: null, latestSucceededBuild: null, now: NOW }), true);
  });

  it("waits for a fresh queued build, retries a stale one", () => {
    const queued = build({ id: "b2", status: "queued", udids: [], created_at: iso(60_000) });
    assert.equal(needsNewBuild({ registeredUdids: ["U2"], latestBuild: queued, latestSucceededBuild: build(), now: NOW }), false);
    const stale = { ...queued, created_at: iso(46 * 60_000) };
    assert.equal(needsNewBuild({ registeredUdids: ["U2"], latestBuild: stale, latestSucceededBuild: build(), now: NOW }), true);
  });

  it("backs off 10 minutes after a failed build", () => {
    const failed = build({ id: "b3", status: "failed", udids: [], created_at: iso(5 * 60_000) });
    assert.equal(needsNewBuild({ registeredUdids: ["U2"], latestBuild: failed, latestSucceededBuild: build(), now: NOW }), false);
    const old = { ...failed, created_at: iso(11 * 60_000) };
    assert.equal(needsNewBuild({ registeredUdids: ["U2"], latestBuild: old, latestSucceededBuild: build(), now: NOW }), true);
  });
});
```

`src/lib/ios-adhoc/github-dispatch.test.ts` :

```ts
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { dispatchResignWorkflow } from "./github-dispatch";

describe("dispatchResignWorkflow", () => {
  beforeEach(() => {
    process.env.GITHUB_DISPATCH_TOKEN = "ghp_test";
  });
  afterEach(() => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
  });

  it("posts a workflow_dispatch with the build id", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    await dispatchResignWorkflow("build-1", fakeFetch);

    assert.equal(
      captured!.url,
      "https://api.github.com/repos/jeantondutytb-prog/anyloc/actions/workflows/ios-adhoc-resign.yml/dispatches"
    );
    assert.deepEqual(JSON.parse(String(captured!.init.body)), {
      ref: "main",
      inputs: { build_id: "build-1" },
    });
    assert.equal((captured!.init.headers as Record<string, string>).Authorization, "Bearer ghp_test");
  });

  it("throws when GitHub refuses", async () => {
    const fakeFetch = (async () => new Response("nope", { status: 422 })) as unknown as typeof fetch;
    await assert.rejects(dispatchResignWorkflow("b", fakeFetch), /422/);
  });

  it("throws without token", async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    await assert.rejects(dispatchResignWorkflow("b"), /GITHUB_DISPATCH_TOKEN/);
  });
});
```

- [ ] **Step 2: Lancer** `npm test` → FAIL.

- [ ] **Step 3: Implémenter `build-queue.ts`**

```ts
import {
  IOS_ADHOC_BUILD_STALE_MS,
  IOS_ADHOC_FAILED_BUILD_BACKOFF_MS,
} from "./config";

export type IosDeviceRow = {
  id: string;
  user_id: string;
  status: "awaiting_udid" | "registered" | "failed";
  udid: string | null;
  error: string | null;
  enrollment_expires_at: string;
  created_at: string;
};

export type IosBuildRow = {
  id: string;
  status: "queued" | "succeeded" | "failed";
  udids: string[];
  ipa_blob_path: string | null;
  bundle_version: string | null;
  created_at: string;
};

export type IosInstallState =
  | { kind: "not_started" }
  | { kind: "awaiting_udid" }
  | { kind: "preparing" }
  | { kind: "ready"; buildId: string }
  | { kind: "failed"; message: string };

const DEFAULT_FAILURE =
  "On n'a pas pu enregistrer ton iPhone. Réessaie, ou écris-nous sur le chat.";

export function getIosInstallState(input: {
  device: IosDeviceRow | null;
  latestSucceededBuild: IosBuildRow | null;
  now: number;
}): IosInstallState {
  const { device, latestSucceededBuild, now } = input;

  if (!device) {
    return { kind: "not_started" };
  }

  if (device.status === "failed") {
    return { kind: "failed", message: device.error ?? DEFAULT_FAILURE };
  }

  if (device.status === "awaiting_udid") {
    return Date.parse(device.enrollment_expires_at) <= now
      ? { kind: "not_started" }
      : { kind: "awaiting_udid" };
  }

  if (device.udid && latestSucceededBuild?.udids.includes(device.udid)) {
    return { kind: "ready", buildId: latestSucceededBuild.id };
  }

  return { kind: "preparing" };
}

export function isBuildStale(build: IosBuildRow, now: number) {
  return build.status === "queued" && now - Date.parse(build.created_at) > IOS_ADHOC_BUILD_STALE_MS;
}

export function needsNewBuild(input: {
  registeredUdids: string[];
  latestBuild: IosBuildRow | null;
  latestSucceededBuild: IosBuildRow | null;
  now: number;
}) {
  const signed = new Set(input.latestSucceededBuild?.udids ?? []);
  const hasPending = input.registeredUdids.some((udid) => !signed.has(udid));

  if (!hasPending) {
    return false;
  }

  const latest = input.latestBuild;

  if (!latest) {
    return true;
  }

  const age = input.now - Date.parse(latest.created_at);

  if (latest.status === "queued") {
    return isBuildStale(latest, input.now);
  }

  if (latest.status === "failed") {
    return age > IOS_ADHOC_FAILED_BUILD_BACKOFF_MS;
  }

  return true;
}
```

- [ ] **Step 4: Implémenter `github-dispatch.ts`**

```ts
const WORKFLOW_URL =
  "https://api.github.com/repos/jeantondutytb-prog/anyloc/actions/workflows/ios-adhoc-resign.yml/dispatches";

export async function dispatchResignWorkflow(buildId: string, fetchImpl: typeof fetch = fetch) {
  const token = process.env.GITHUB_DISPATCH_TOKEN?.trim();

  if (!token) {
    throw new Error("GITHUB_DISPATCH_TOKEN manquant.");
  }

  const response = await fetchImpl(WORKFLOW_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "anyloc-ios-adhoc",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      ref: process.env.IOS_ADHOC_WORKFLOW_REF?.trim() || "main",
      inputs: { build_id: buildId },
    }),
  });

  if (response.status !== 204) {
    throw new Error(`GitHub dispatch refusé : HTTP ${response.status}`);
  }
}
```

- [ ] **Step 5: Lancer** `npm test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ios-adhoc/build-queue.ts src/lib/ios-adhoc/build-queue.test.ts src/lib/ios-adhoc/github-dispatch.ts src/lib/ios-adhoc/github-dispatch.test.ts
git commit -m "feat(ios-adhoc): install state machine and resign workflow dispatch"
```

---

### Task 8: Accès base + orchestration (store + service)

**Files:**
- Create: `src/lib/ios-adhoc/store.ts`, `src/lib/ios-adhoc/service.ts`

**Interfaces:**
- Consumes: `createAdminClient` (`@/lib/supabase/admin`), Tasks 3, 4, 6, 7.
- Produces (`service.ts`) :
  - `startIosEnrollment(userId: string, now: Date): Promise<{ kind: "created"; enrollmentId: string; challenge: string } | { kind: "already_registered" } | { kind: "quota_full" }>`
  - `completeIosEnrollment(enrollmentId: string, attrs: DeviceAttributes, now: Date): Promise<{ ok: boolean }>`
  - `ensureBuildForPendingDevices(now: Date): Promise<void>`
  - `getIosStatusForUser(userId: string, now: Date): Promise<IosInstallState>`
- Produces (`store.ts`) : `getLatestDeviceForUser`, `getDevice`, `countRegisteredDevices`, `insertEnrollment`, `markDeviceRegistered`, `markDeviceFailed`, `listRegisteredUdids`, `getLatestBuild`, `getLatestSucceededBuild`, `getBuild`, `failStaleQueuedBuilds`, `insertQueuedBuild`, `completeBuild` (signatures ci-dessous).

Pas de test unitaire ici (couche mince sur Supabase, logique déjà testée en Task 7) ; vérification par `tsc` puis par le test de bout en bout de la Task 13.

- [ ] **Step 1: Implémenter `store.ts`**

```ts
import { createAdminClient } from "@/lib/supabase/admin";
import type { IosBuildRow, IosDeviceRow } from "./build-queue";

const DEVICE_COLUMNS = "id, user_id, status, udid, error, enrollment_expires_at, created_at";
const BUILD_COLUMNS = "id, status, udids, ipa_blob_path, bundle_version, created_at";

export async function getLatestDeviceForUser(userId: string) {
  const { data, error } = await createAdminClient()
    .from("ios_devices")
    .select(DEVICE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as IosDeviceRow | null) ?? null;
}

export async function getDevice(id: string) {
  const { data, error } = await createAdminClient()
    .from("ios_devices")
    .select(`${DEVICE_COLUMNS}, enrollment_challenge_hash`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as (IosDeviceRow & { enrollment_challenge_hash: string }) | null) ?? null;
}

export async function countRegisteredDevices() {
  const { count, error } = await createAdminClient()
    .from("ios_devices")
    .select("id", { count: "exact", head: true })
    .eq("status", "registered");
  if (error) throw error;
  return count ?? 0;
}

export async function insertEnrollment(input: {
  userId: string;
  challengeHash: string;
  expiresAt: Date;
}) {
  const { data, error } = await createAdminClient()
    .from("ios_devices")
    .insert({
      user_id: input.userId,
      enrollment_challenge_hash: input.challengeHash,
      enrollment_expires_at: input.expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Retourne false si l'UDID est déjà lié à une autre ligne (contrainte unique). */
export async function markDeviceRegistered(
  id: string,
  input: { udid: string; product: string | null; osVersion: string | null; ascDeviceId: string; now: Date }
) {
  const { error } = await createAdminClient()
    .from("ios_devices")
    .update({
      status: "registered",
      udid: input.udid,
      product: input.product,
      os_version: input.osVersion,
      asc_device_id: input.ascDeviceId,
      registered_at: input.now.toISOString(),
      error: null,
    })
    .eq("id", id);
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

export async function markDeviceFailed(id: string, message: string) {
  const { error } = await createAdminClient()
    .from("ios_devices")
    .update({ status: "failed", error: message })
    .eq("id", id);
  if (error) throw error;
}

export async function listRegisteredUdids() {
  const { data, error } = await createAdminClient()
    .from("ios_devices")
    .select("udid")
    .eq("status", "registered");
  if (error) throw error;
  return (data ?? []).map((row) => row.udid as string).filter(Boolean);
}

async function latestBuild(filterSucceeded: boolean) {
  let query = createAdminClient().from("ios_adhoc_builds").select(BUILD_COLUMNS);
  if (filterSucceeded) query = query.eq("status", "succeeded");
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as IosBuildRow | null) ?? null;
}

export const getLatestBuild = () => latestBuild(false);
export const getLatestSucceededBuild = () => latestBuild(true);

export async function getBuild(id: string) {
  const { data, error } = await createAdminClient()
    .from("ios_adhoc_builds")
    .select(BUILD_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as IosBuildRow | null) ?? null;
}

export async function failStaleQueuedBuilds(olderThan: Date) {
  const { error } = await createAdminClient()
    .from("ios_adhoc_builds")
    .update({ status: "failed", error: "Workflow sans réponse (timeout).", finished_at: new Date().toISOString() })
    .eq("status", "queued")
    .lt("created_at", olderThan.toISOString());
  if (error) throw error;
}

/** Retourne null si un build est déjà en file (index unique partiel). */
export async function insertQueuedBuild() {
  const { data, error } = await createAdminClient()
    .from("ios_adhoc_builds")
    .insert({ status: "queued" })
    .select("id")
    .single();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data.id as string;
}

export async function completeBuild(
  id: string,
  input:
    | { status: "succeeded"; udids: string[]; ipaBlobPath: string; bundleVersion: string }
    | { status: "failed"; error: string }
) {
  const patch =
    input.status === "succeeded"
      ? { status: "succeeded", udids: input.udids, ipa_blob_path: input.ipaBlobPath, bundle_version: input.bundleVersion }
      : { status: "failed", error: input.error };
  const { error } = await createAdminClient()
    .from("ios_adhoc_builds")
    .update({ ...patch, finished_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued");
  if (error) throw error;
}
```

- [ ] **Step 2: Implémenter `service.ts`**

```ts
import { timingSafeEqual } from "node:crypto";
import { ascCredentialsFromEnv, createAscClient } from "./app-store-connect";
import { getIosInstallState, needsNewBuild, type IosInstallState } from "./build-queue";
import {
  IOS_ADHOC_ACCOUNT_DEVICE_LIMIT,
  IOS_ADHOC_BUILD_STALE_MS,
  IOS_ADHOC_ENROLLMENT_TTL_MS,
} from "./config";
import { dispatchResignWorkflow } from "./github-dispatch";
import { createEnrollmentChallenge, hashChallenge, type DeviceAttributes } from "./mobileconfig";
import * as store from "./store";

const ALREADY_LINKED =
  "Cet iPhone est déjà lié à un autre compte Anyloc. Écris-nous sur le chat pour le transférer.";

export async function startIosEnrollment(userId: string, now: Date) {
  const existing = await store.getLatestDeviceForUser(userId);

  if (existing?.status === "registered") {
    return { kind: "already_registered" as const };
  }

  if ((await store.countRegisteredDevices()) >= IOS_ADHOC_ACCOUNT_DEVICE_LIMIT) {
    return { kind: "quota_full" as const };
  }

  const { challenge, hash } = createEnrollmentChallenge();
  const enrollmentId = await store.insertEnrollment({
    userId,
    challengeHash: hash,
    expiresAt: new Date(now.getTime() + IOS_ADHOC_ENROLLMENT_TTL_MS),
  });

  return { kind: "created" as const, enrollmentId, challenge };
}

function sameHash(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function completeIosEnrollment(
  enrollmentId: string,
  attrs: DeviceAttributes,
  now: Date
) {
  const device = await store.getDevice(enrollmentId);

  if (
    !device ||
    device.status !== "awaiting_udid" ||
    Date.parse(device.enrollment_expires_at) <= now.getTime() ||
    !sameHash(hashChallenge(attrs.challenge), device.enrollment_challenge_hash)
  ) {
    return { ok: false };
  }

  let ascDeviceId: string;
  try {
    const asc = createAscClient(ascCredentialsFromEnv());
    ascDeviceId = await asc.registerDevice(attrs.udid, `Anyloc ${device.user_id.slice(0, 8)}`);
  } catch (error) {
    console.error("[ios-adhoc] ASC registerDevice failed:", error);
    await store.markDeviceFailed(enrollmentId, "Apple n'a pas accepté l'enregistrement de ton iPhone. Réessaie dans quelques minutes.");
    return { ok: false };
  }

  const saved = await store.markDeviceRegistered(enrollmentId, {
    udid: attrs.udid,
    product: attrs.product,
    osVersion: attrs.osVersion,
    ascDeviceId,
    now,
  });

  if (!saved) {
    await store.markDeviceFailed(enrollmentId, ALREADY_LINKED);
    return { ok: false };
  }

  await ensureBuildForPendingDevices(now);
  return { ok: true };
}

export async function ensureBuildForPendingDevices(now: Date) {
  const [registeredUdids, latestBuild, latestSucceededBuild] = await Promise.all([
    store.listRegisteredUdids(),
    store.getLatestBuild(),
    store.getLatestSucceededBuild(),
  ]);

  if (!needsNewBuild({ registeredUdids, latestBuild, latestSucceededBuild, now: now.getTime() })) {
    return;
  }

  await store.failStaleQueuedBuilds(new Date(now.getTime() - IOS_ADHOC_BUILD_STALE_MS));
  const buildId = await store.insertQueuedBuild();

  if (!buildId) {
    return;
  }

  try {
    await dispatchResignWorkflow(buildId);
  } catch (error) {
    console.error("[ios-adhoc] dispatch failed:", error);
    await store.completeBuild(buildId, { status: "failed", error: "Déclenchement GitHub impossible." });
  }
}

export async function getIosStatusForUser(userId: string, now: Date): Promise<IosInstallState> {
  const device = await store.getLatestDeviceForUser(userId);

  if (device?.status === "registered") {
    await ensureBuildForPendingDevices(now);
  }

  const latestSucceededBuild = await store.getLatestSucceededBuild();
  return getIosInstallState({ device, latestSucceededBuild, now: now.getTime() });
}
```

- [ ] **Step 3: Vérifier le typage**

Run: `npx tsc --noEmit`
Expected: aucune erreur dans `src/lib/ios-adhoc/`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ios-adhoc/store.ts src/lib/ios-adhoc/service.ts
git commit -m "feat(ios-adhoc): Supabase store and enrollment orchestration"
```

---

### Task 9: Routes API

**Files:**
- Create: `src/app/api/ios/enroll/route.ts`, `src/app/api/ios/enroll/callback/[enrollmentId]/route.ts`, `src/app/api/ios/status/route.ts`, `src/app/api/ios/manifest/route.ts`, `src/app/api/ios/builds/complete/route.ts`
- Modify: `src/lib/downloads.ts` (exporter `presignPrivateBlobUrl`)

**Interfaces:**
- Consumes: `requireActiveSubscription` (`@/lib/subscription`), `getConfiguredAppOrigin` (`@/lib/oauth-origin`), Tasks 3–8.
- Produces (HTTP) :
  - `GET /api/ios/enroll` → `application/x-apple-aspen-config` ; 303 vers `/login?next=/dashboard/iphone` si non connecté ; 303 vers `/dashboard/iphone` si déjà enregistré ; 403 si non éligible ; 503 si quota plein.
  - `POST /api/ios/enroll/callback/{enrollmentId}` → 301 vers `/dashboard/iphone?etape=preparation|erreur`.
  - `GET /api/ios/status` → `{ eligible: false }` ou `{ eligible: true, state: IosInstallState, installUrl: string | null }`.
  - `GET /api/ios/manifest?t=…` → `manifest.plist`.
  - `POST /api/ios/builds/complete` (Bearer `IOS_BUILD_CALLBACK_SECRET`) body `{ buildId, status: "succeeded", udids, ipaBlobPath, bundleVersion } | { buildId, status: "failed", error }`.

- [ ] **Step 1: Lire la doc Next 16** : `node_modules/next/dist/docs/` — sections route handlers et dynamic params (les `params` sont une `Promise`, comme dans `src/app/api/downloads/[platform]/route.ts`).

- [ ] **Step 2: Exporter le presign** dans `src/lib/downloads.ts` : remplacer `async function presignPrivateBlobUrl(` par `export async function presignPrivateBlobUrl(`.

- [ ] **Step 3: Helper d'origine** — dans chaque route qui construit une URL absolue, utiliser :

```ts
import { getConfiguredAppOrigin } from "@/lib/oauth-origin";
const origin = getConfiguredAppOrigin() || new URL(request.url).origin;
```

- [ ] **Step 4: `src/app/api/ios/enroll/route.ts`**

```ts
import { randomUUID } from "node:crypto";
import { isEligibleForIosAdhoc } from "@/lib/ios-adhoc/config";
import { buildEnrollmentProfile } from "@/lib/ios-adhoc/mobileconfig";
import { startIosEnrollment } from "@/lib/ios-adhoc/service";
import { getConfiguredAppOrigin } from "@/lib/oauth-origin";
import { requireActiveSubscription } from "@/lib/subscription";

export async function GET(request: Request) {
  const origin = getConfiguredAppOrigin() || new URL(request.url).origin;
  const { user, access } = await requireActiveSubscription();

  if (!user) {
    return Response.redirect(`${origin}/login?next=/dashboard/iphone`, 303);
  }

  if (!isEligibleForIosAdhoc(access)) {
    return Response.json({ error: "L'app iPhone est incluse dans la formule 1 an." }, { status: 403 });
  }

  const result = await startIosEnrollment(user.id, new Date());

  if (result.kind === "already_registered") {
    return Response.redirect(`${origin}/dashboard/iphone`, 303);
  }

  if (result.kind === "quota_full") {
    return Response.json(
      { error: "Les places iPhone sont pleines pour le moment. Écris-nous sur le chat, on te réserve la prochaine." },
      { status: 503 }
    );
  }

  const profile = buildEnrollmentProfile({
    callbackUrl: `${origin}/api/ios/enroll/callback/${result.enrollmentId}`,
    challenge: result.challenge,
    profileUuid: randomUUID(),
  });

  return new Response(profile, {
    headers: {
      "Content-Type": "application/x-apple-aspen-config",
      "Content-Disposition": 'attachment; filename="Anyloc.mobileconfig"',
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Step 5: `src/app/api/ios/enroll/callback/[enrollmentId]/route.ts`**

```ts
import { parseDeviceAttributes } from "@/lib/ios-adhoc/mobileconfig";
import { completeIosEnrollment } from "@/lib/ios-adhoc/service";
import { getConfiguredAppOrigin } from "@/lib/oauth-origin";

const MAX_BODY_BYTES = 64 * 1024;

type RouteContext = { params: Promise<{ enrollmentId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { enrollmentId } = await context.params;
  const origin = getConfiguredAppOrigin() || new URL(request.url).origin;
  const body = Buffer.from(await request.arrayBuffer());

  let ok = false;
  if (body.length > 0 && body.length <= MAX_BODY_BYTES) {
    const attrs = parseDeviceAttributes(body);
    if (attrs) {
      ok = (await completeIosEnrollment(enrollmentId, attrs, new Date())).ok;
    }
  }

  const target = new URL("/dashboard/iphone", origin);
  target.searchParams.set("etape", ok ? "preparation" : "erreur");

  // iOS exige une redirection 301 en réponse au Profile Service.
  return new Response(null, { status: 301, headers: { Location: target.toString() } });
}
```

- [ ] **Step 6: `src/app/api/ios/status/route.ts`**

```ts
import { IOS_ADHOC_INSTALL_LINK_TTL_MS, isEligibleForIosAdhoc } from "@/lib/ios-adhoc/config";
import { buildItmsServicesUrl, signInstallToken } from "@/lib/ios-adhoc/install-link";
import { getIosStatusForUser } from "@/lib/ios-adhoc/service";
import { getConfiguredAppOrigin } from "@/lib/oauth-origin";
import { requireActiveSubscription } from "@/lib/subscription";

export async function GET(request: Request) {
  const { user, access, error } = await requireActiveSubscription();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  if (!isEligibleForIosAdhoc(access)) {
    return Response.json({ eligible: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const now = new Date();
  const state = await getIosStatusForUser(user.id, now);
  let installUrl: string | null = null;

  if (state.kind === "ready") {
    const secret = process.env.IOS_INSTALL_LINK_SECRET;
    if (!secret) {
      return Response.json({ error: "Installation indisponible." }, { status: 503 });
    }
    const origin = getConfiguredAppOrigin() || new URL(request.url).origin;
    const token = signInstallToken(
      { userId: user.id, buildId: state.buildId, exp: now.getTime() + IOS_ADHOC_INSTALL_LINK_TTL_MS },
      secret
    );
    installUrl = buildItmsServicesUrl(`${origin}/api/ios/manifest?t=${encodeURIComponent(token)}`);
  }

  return Response.json(
    { eligible: true, state, installUrl },
    { headers: { "Cache-Control": "no-store" } }
  );
}
```

- [ ] **Step 7: `src/app/api/ios/manifest/route.ts`**

```ts
import { presignPrivateBlobUrl } from "@/lib/downloads";
import { IOS_ADHOC_BUNDLE_ID } from "@/lib/ios-adhoc/config";
import { buildInstallManifest, verifyInstallToken } from "@/lib/ios-adhoc/install-link";
import { getBuild } from "@/lib/ios-adhoc/store";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const secret = process.env.IOS_INSTALL_LINK_SECRET;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const payload = secret ? verifyInstallToken(token, secret, Date.now()) : null;

  if (!payload || !blobToken) {
    return new Response("Lien expiré.", { status: 403 });
  }

  const build = await getBuild(payload.buildId);

  if (!build || build.status !== "succeeded" || !build.ipa_blob_path || !build.bundle_version) {
    return new Response("Build introuvable.", { status: 404 });
  }

  const ipaUrl = await presignPrivateBlobUrl(build.ipa_blob_path, blobToken);
  const manifest = buildInstallManifest({
    ipaUrl,
    bundleId: IOS_ADHOC_BUNDLE_ID,
    bundleVersion: build.bundle_version,
    title: "Anyloc",
  });

  return new Response(manifest, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
}
```

- [ ] **Step 8: `src/app/api/ios/builds/complete/route.ts`**

```ts
import { timingSafeEqual } from "node:crypto";
import { ensureBuildForPendingDevices } from "@/lib/ios-adhoc/service";
import { completeBuild } from "@/lib/ios-adhoc/store";

function authorized(request: Request) {
  const secret = process.env.IOS_BUILD_CALLBACK_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const buildId = typeof body?.buildId === "string" ? body.buildId : null;

  if (!buildId) {
    return Response.json({ error: "buildId manquant." }, { status: 400 });
  }

  if (body?.status === "succeeded") {
    const udids = Array.isArray(body.udids) ? body.udids.filter((u): u is string => typeof u === "string") : [];
    const ipaBlobPath = typeof body.ipaBlobPath === "string" ? body.ipaBlobPath : "";
    const bundleVersion = typeof body.bundleVersion === "string" ? body.bundleVersion : "";
    if (!udids.length || !ipaBlobPath || !bundleVersion) {
      return Response.json({ error: "Champs manquants." }, { status: 400 });
    }
    await completeBuild(buildId, { status: "succeeded", udids, ipaBlobPath, bundleVersion });
  } else if (body?.status === "failed") {
    await completeBuild(buildId, {
      status: "failed",
      error: typeof body.error === "string" ? body.error.slice(0, 500) : "Échec du workflow.",
    });
  } else {
    return Response.json({ error: "status invalide." }, { status: 400 });
  }

  // Des iPhones enregistrés pendant ce build → on relance.
  await ensureBuildForPendingDevices(new Date());
  return Response.json({ ok: true });
}
```

- [ ] **Step 9: Vérifier**

Run: `npx tsc --noEmit && npx eslint src/app/api/ios src/lib/ios-adhoc src/lib/downloads.ts && npm test`
Expected: aucune erreur, tests PASS.

- [ ] **Step 10: Vérification locale rapide** (sans compte Apple) : `npm run dev`, puis connecté en admin dans le navigateur, ouvrir `http://localhost:3000/api/ios/enroll` → un fichier `Anyloc.mobileconfig` se télécharge ; son contenu contient `Profile Service` et une URL `/api/ios/enroll/callback/<uuid>`. `curl -X POST localhost:3000/api/ios/builds/complete` → 401.

- [ ] **Step 11: Commit**

```bash
git add src/app/api/ios src/lib/downloads.ts
git commit -m "feat(ios-adhoc): enroll, callback, status, manifest and build-complete routes"
```

---

### Task 10: Page « App iPhone » du dashboard

**Files:**
- Create: `src/app/dashboard/(protected)/iphone/page.tsx`, `src/components/dashboard/iphone-install-view.tsx`
- Modify: `src/components/dashboard/dashboard-menu.tsx` (ligne ~33)

**Interfaces:**
- Consumes: `GET /api/ios/status` (Task 9), `SetupQrCode` (`@/components/dashboard/setup-qr-code`), `Button`, `Card`.

- [ ] **Step 1: Page**

```tsx
import { Suspense } from "react";
import { IphoneInstallView } from "@/components/dashboard/iphone-install-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function DashboardIphonePage() {
  return (
    <Suspense fallback={null}>
      <IphoneInstallView />
    </Suspense>
  );
}
```

- [ ] **Step 2: Vue client**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { SetupQrCode } from "@/components/dashboard/setup-qr-code";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type InstallState =
  | { kind: "not_started" }
  | { kind: "awaiting_udid" }
  | { kind: "preparing" }
  | { kind: "ready"; buildId: string }
  | { kind: "failed"; message: string };

type StatusResponse =
  | { eligible: false }
  | { eligible: true; state: InstallState; installUrl: string | null };

const POLL_MS = 5000;

function isIphoneSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

export function IphoneInstallView() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [onIphone, setOnIphone] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/ios/status", { cache: "no-store" });
    if (response.ok) setStatus((await response.json()) as StatusResponse);
  }, []);

  useEffect(() => {
    setOnIphone(isIphoneSafari());
    setPageUrl(`${window.location.origin}/dashboard/iphone`);
    void load();
  }, [load]);

  const kind = status?.eligible ? status.state.kind : null;

  useEffect(() => {
    if (kind !== "awaiting_udid" && kind !== "preparing") return;
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [kind, load]);

  const callbackFailed = searchParams.get("etape") === "erreur";

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 bg-background p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <Smartphone className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">L&apos;app Anyloc sur ton iPhone</h1>
          <p className="text-sm text-zinc-600">Sans ordi, sans câble. Valable 1 an.</p>
        </div>
      </div>

      {!status && (
        <Card className="flex items-center gap-2 p-6 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </Card>
      )}

      {status && !status.eligible && (
        <Card className="p-6 text-sm text-zinc-700">
          L&apos;app iPhone est incluse dans la <strong>formule 1 an</strong>. Passe à la formule 1 an
          depuis ton compte pour l&apos;installer.
        </Card>
      )}

      {status?.eligible && !onIphone && status.state.kind !== "ready" && (
        <Card className="flex flex-col items-center gap-3 p-6 text-center text-sm text-zinc-700">
          <p>Ouvre cette page <strong>dans Safari, sur ton iPhone</strong> :</p>
          {pageUrl && <SetupQrCode value={pageUrl} label="Scanne avec l'appareil photo" />}
        </Card>
      )}

      {status?.eligible && onIphone && (
        <Card className="flex flex-col gap-4 p-6 text-sm text-zinc-700">
          {callbackFailed && status.state.kind === "not_started" && (
            <p className="rounded-xl bg-red-50 p-3 text-red-700">
              L&apos;étape n&apos;a pas abouti. Recommence depuis le bouton ci-dessous.
            </p>
          )}

          {status.state.kind === "not_started" && (
            <>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Appuie sur le bouton, puis sur <strong>Autoriser</strong>.</li>
                <li>Ouvre <strong>Réglages</strong> → <strong>Profil téléchargé</strong> → <strong>Installer</strong>.</li>
                <li>Reviens ici : on prépare ton app (2 à 5 minutes).</li>
              </ol>
              <Button onClick={() => { window.location.href = "/api/ios/enroll"; }}>
                Préparer mon iPhone
              </Button>
            </>
          )}

          {status.state.kind === "awaiting_udid" && (
            <p className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ouvre <strong>Réglages</strong> → <strong>Profil téléchargé</strong> → <strong>Installer</strong>, puis reviens ici.
            </p>
          )}

          {status.state.kind === "preparing" && (
            <p className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ton iPhone est enregistré. On prépare ton app… (2 à 5 minutes, garde cette page ouverte)
            </p>
          )}

          {status.state.kind === "ready" && status.installUrl && (
            <>
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> Ton app est prête.
              </p>
              <Button onClick={() => { window.location.href = status.installUrl!; }}>
                Installer Anyloc
              </Button>
              <p className="text-xs text-zinc-500">
                Appuie sur « Installer » dans la fenêtre qui s&apos;ouvre. L&apos;icône apparaît sur ton écran d&apos;accueil.
              </p>
            </>
          )}

          {status.state.kind === "failed" && (
            <p className="rounded-xl bg-red-50 p-3 text-red-700">{status.state.message}</p>
          )}
        </Card>
      )}
    </div>
  );
}
```

Si l'appareil n'est pas un iPhone mais que l'état est `ready`, la carte QR est masquée : ajouter sous la carte QR une ligne `Ton app est prête : ouvre cette page sur ton iPhone pour l'installer.` en réutilisant la même condition `!onIphone` avec `status.state.kind === "ready"` et le même `SetupQrCode`.

- [ ] **Step 3: Menu** — dans `src/components/dashboard/dashboard-menu.tsx`, ajouter `Smartphone` à l'import `lucide-react` et, juste après l'entrée « Choisir ma position » (ligne ~33) :

```ts
{ icon: Smartphone, label: "App iPhone", href: "/dashboard/iphone" },
```

- [ ] **Step 4: Vérifier dans le navigateur**
  - `npm run dev`, se connecter avec un compte admin.
  - Desktop : `/dashboard/iphone` → affiche le QR.
  - `resize_window` preset `mobile` n'émule qu'Android : forcer l'UA iPhone via la console (`Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1" })` puis re-render), ou tester sur un vrai iPhone via l'URL de preview Vercel → bouton « Préparer mon iPhone » visible.
  - Compte mensuel → message « formule 1 an ».
  - Screenshot de chaque état pour la PR.

- [ ] **Step 5: Commit**

```bash
git add "src/app/dashboard/(protected)/iphone/page.tsx" src/components/dashboard/iphone-install-view.tsx src/components/dashboard/dashboard-menu.tsx
git commit -m "feat(ios-adhoc): dashboard page to install the iPhone app"
```

---

### Task 11: Outils CI (profil ad hoc, re-signature, upload)

**Files:**
- Create: `scripts/ios-adhoc-profile.ts`, `scripts/resign-ios-adhoc.sh`, `scripts/upload-ios-adhoc.mjs`

**Interfaces:**
- Consumes: `createAscClient`, `ascCredentialsFromEnv` (Task 6), `IOS_ADHOC_BUNDLE_ID` (Task 3).
- Produces :
  - `npx tsx scripts/ios-adhoc-profile.ts <out.mobileprovision> <out-udids.json>` (env `ASC_*`, `ASC_DISTRIBUTION_CERT_ID`)
  - `scripts/resign-ios-adhoc.sh <in.ipa> <profile.mobileprovision> <out.ipa>` → affiche `CFBundleVersion` en dernière ligne
  - `node scripts/upload-ios-adhoc.mjs <file.ipa> <blob/path.ipa>`

- [ ] **Step 1: `scripts/ios-adhoc-profile.ts`**

```ts
import { writeFileSync } from "node:fs";
import { ascCredentialsFromEnv, createAscClient } from "../src/lib/ios-adhoc/app-store-connect";
import { IOS_ADHOC_BUNDLE_ID } from "../src/lib/ios-adhoc/config";

const PROFILE_NAME = "Anyloc AdHoc";

async function main() {
  const [outProfile, outUdids] = process.argv.slice(2);
  const certificateId = process.env.ASC_DISTRIBUTION_CERT_ID?.trim();

  if (!outProfile || !outUdids || !certificateId) {
    console.error("Usage: ASC_DISTRIBUTION_CERT_ID=… tsx scripts/ios-adhoc-profile.ts <out.mobileprovision> <out-udids.json>");
    process.exit(1);
  }

  const asc = createAscClient(ascCredentialsFromEnv());
  const bundleIdId = await asc.findBundleIdId(IOS_ADHOC_BUNDLE_ID);
  const devices = await asc.listEnabledIosDevices();

  if (!devices.length) {
    throw new Error("Aucun iPhone enregistré sur le compte Apple.");
  }

  await asc.deleteProfilesNamed(PROFILE_NAME);
  const content = await asc.createAdhocProfile({
    name: PROFILE_NAME,
    bundleIdId,
    certificateId,
    deviceIds: devices.map((device) => device.id),
  });

  writeFileSync(outProfile, Buffer.from(content, "base64"));
  writeFileSync(outUdids, JSON.stringify(devices.map((device) => device.udid)));
  console.log(`Profil ad hoc généré pour ${devices.length} iPhone(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
```

- [ ] **Step 2: `scripts/resign-ios-adhoc.sh`** (puis `chmod +x`)

```bash
#!/usr/bin/env bash
# Re-signe une IPA avec un profil ad hoc et le certificat Apple Distribution du trousseau.
# Usage: resign-ios-adhoc.sh <in.ipa> <profile.mobileprovision> <out.ipa>
set -euo pipefail

IN_IPA="$1"
PROFILE="$2"
OUT_IPA="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"
IDENTITY="${IOS_SIGN_IDENTITY:-Apple Distribution}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

unzip -q "$IN_IPA" -d "$WORK"
APP="$(find "$WORK/Payload" -maxdepth 1 -name '*.app' | head -1)"

if [[ -z "$APP" ]]; then
  echo "Aucun .app dans $IN_IPA" >&2
  exit 1
fi

security cms -D -i "$PROFILE" > "$WORK/profile.plist"
/usr/libexec/PlistBuddy -x -c "Print :Entitlements" "$WORK/profile.plist" > "$WORK/entitlements.plist"

cp "$PROFILE" "$APP/embedded.mobileprovision"
rm -rf "$APP/_CodeSignature"

if [[ -d "$APP/Frameworks" ]]; then
  find "$APP/Frameworks" -maxdepth 1 \( -name '*.framework' -o -name '*.dylib' \) -print0 |
    while IFS= read -r -d '' framework; do
      codesign --force --sign "$IDENTITY" --timestamp=none "$framework" >&2
    done
fi

codesign --force --sign "$IDENTITY" --entitlements "$WORK/entitlements.plist" --timestamp=none "$APP" >&2
codesign --verify --deep --strict "$APP" >&2

rm -f "$OUT_IPA"
(cd "$WORK" && zip -qry "$OUT_IPA" Payload)

/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$APP/Info.plist"
```

- [ ] **Step 3: `scripts/upload-ios-adhoc.mjs`**

```js
#!/usr/bin/env node
// Usage: BLOB_READ_WRITE_TOKEN=… node scripts/upload-ios-adhoc.mjs <file.ipa> <blob/path.ipa>
import fs from "node:fs";
import { put } from "@vercel/blob";

const [file, pathname] = process.argv.slice(2);

if (!file || !pathname || !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Usage: BLOB_READ_WRITE_TOKEN=… node scripts/upload-ios-adhoc.mjs <file.ipa> <blob/path.ipa>");
  process.exit(1);
}

const blob = await put(pathname, fs.createReadStream(file), {
  access: "private",
  contentType: "application/octet-stream",
  addRandomSuffix: false,
  allowOverwrite: true,
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

console.log(blob.pathname);
```

Vérifier dans `node_modules/@vercel/blob` que `put` accepte `access: "private"` (le store est privé, cf. `presignPrivateBlobUrl`). Si la version installée ne l'accepte pas, utiliser `access: "public"` avec un chemin non devinable (`releases/ios-adhoc/<buildId>-<random>.ipa`) et le signaler en PR.

- [ ] **Step 4: Vérifier** : `bash -n scripts/resign-ios-adhoc.sh && npx tsc --noEmit`. Le test réel se fait en Task 13 (nécessite le compte Apple).

- [ ] **Step 5: Commit**

```bash
git add scripts/ios-adhoc-profile.ts scripts/resign-ios-adhoc.sh scripts/upload-ios-adhoc.mjs
git commit -m "feat(ios-adhoc): CI scripts to generate ad hoc profile, re-sign and upload"
```

---

### Task 12: Workflow GitHub de re-signature

**Files:**
- Create: `.github/workflows/ios-adhoc-resign.yml`

**Interfaces:**
- Consumes: scripts de la Task 11 ; release GitHub `ios-base` contenant `Anyloc.ipa` ; `POST /api/ios/builds/complete`.
- Produces: `workflow_dispatch` avec input `build_id` (nom de fichier exact attendu par `github-dispatch.ts`).

- [ ] **Step 1: Écrire le workflow**

```yaml
name: iOS ad hoc re-sign

on:
  workflow_dispatch:
    inputs:
      build_id:
        description: "ID de la ligne ios_adhoc_builds"
        required: true

concurrency:
  group: ios-adhoc-resign
  cancel-in-progress: false

jobs:
  resign:
    runs-on: macos-15
    timeout-minutes: 30
    env:
      BUILD_ID: ${{ inputs.build_id }}
      BLOB_PATH: releases/ios-adhoc/Anyloc-${{ inputs.build_id }}.ipa
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci

      - name: Import Apple Distribution certificate
        env:
          DIST_CERTIFICATE_P12_BASE64: ${{ secrets.DIST_CERTIFICATE_P12_BASE64 }}
          DIST_CERTIFICATE_PASSWORD: ${{ secrets.DIST_CERTIFICATE_PASSWORD }}
        run: |
          KEYCHAIN="$RUNNER_TEMP/adhoc.keychain-db"
          KEYCHAIN_PASSWORD="$(openssl rand -hex 16)"
          echo "$DIST_CERTIFICATE_P12_BASE64" | base64 --decode > "$RUNNER_TEMP/dist.p12"
          security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
          security set-keychain-settings -lut 21600 "$KEYCHAIN"
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
          security import "$RUNNER_TEMP/dist.p12" -P "$DIST_CERTIFICATE_PASSWORD" -A -t cert -f pkcs12 -k "$KEYCHAIN"
          security set-key-partition-list -S apple-tool:,apple: -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
          security list-keychains -d user -s "$KEYCHAIN" $(security list-keychains -d user | tr -d '"')
          rm "$RUNNER_TEMP/dist.p12"

      - name: Generate ad hoc profile
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
          ASC_PRIVATE_KEY: ${{ secrets.ASC_PRIVATE_KEY }}
          ASC_DISTRIBUTION_CERT_ID: ${{ secrets.ASC_DISTRIBUTION_CERT_ID }}
        run: npx tsx scripts/ios-adhoc-profile.ts "$RUNNER_TEMP/adhoc.mobileprovision" "$RUNNER_TEMP/udids.json"

      - name: Download base IPA
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh release download ios-base --pattern Anyloc.ipa --dir "$RUNNER_TEMP" --clobber

      - name: Re-sign
        id: resign
        run: |
          chmod +x scripts/resign-ios-adhoc.sh
          VERSION="$(scripts/resign-ios-adhoc.sh "$RUNNER_TEMP/Anyloc.ipa" "$RUNNER_TEMP/adhoc.mobileprovision" "$RUNNER_TEMP/Anyloc-adhoc.ipa" | tail -1)"
          echo "bundle_version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Upload to Vercel Blob
        env:
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
        run: node scripts/upload-ios-adhoc.mjs "$RUNNER_TEMP/Anyloc-adhoc.ipa" "$BLOB_PATH"

      - name: Report success
        env:
          ANYLOC_API_URL: ${{ secrets.ANYLOC_API_URL }}
          IOS_BUILD_CALLBACK_SECRET: ${{ secrets.IOS_BUILD_CALLBACK_SECRET }}
          BUNDLE_VERSION: ${{ steps.resign.outputs.bundle_version }}
        run: |
          jq -n \
            --arg id "$BUILD_ID" \
            --arg path "$BLOB_PATH" \
            --arg version "$BUNDLE_VERSION" \
            --slurpfile udids "$RUNNER_TEMP/udids.json" \
            '{buildId: $id, status: "succeeded", ipaBlobPath: $path, bundleVersion: $version, udids: $udids[0]}' |
            curl -fsS -X POST "$ANYLOC_API_URL/api/ios/builds/complete" \
              -H "Authorization: Bearer $IOS_BUILD_CALLBACK_SECRET" \
              -H "Content-Type: application/json" \
              --data @-

      - name: Report failure
        if: failure()
        env:
          ANYLOC_API_URL: ${{ secrets.ANYLOC_API_URL }}
          IOS_BUILD_CALLBACK_SECRET: ${{ secrets.IOS_BUILD_CALLBACK_SECRET }}
          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: |
          jq -n --arg id "$BUILD_ID" --arg error "Workflow échoué : $RUN_URL" \
            '{buildId: $id, status: "failed", error: $error}' |
            curl -sS -X POST "$ANYLOC_API_URL/api/ios/builds/complete" \
              -H "Authorization: Bearer $IOS_BUILD_CALLBACK_SECRET" \
              -H "Content-Type: application/json" \
              --data @-
```

- [ ] **Step 2: Publier l'IPA de base** (une fois, puis à chaque nouvelle version de l'app) — n'importe quelle IPA `io.anyloc.app` compilée pour iPhone convient, le script remplace la signature :

```bash
gh release create ios-base --title "iOS base IPA (re-signée en ad hoc par la CI)" --notes "Ne pas supprimer : source du workflow ios-adhoc-resign." apps/ios/dist/Anyloc.ipa
```
(pour une mise à jour : `gh release upload ios-base apps/ios/dist/Anyloc.ipa --clobber`)

- [ ] **Step 3: Valider la syntaxe** : `npx --yes @action-validator/cli .github/workflows/ios-adhoc-resign.yml` (ou vérifier l'onglet Actions après push : pas d'erreur de parsing).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ios-adhoc-resign.yml
git commit -m "ci(ios-adhoc): workflow to re-sign the IPA with the ad hoc profile"
```

---

### Task 13: Test de bout en bout avec un vrai iPhone (nécessite le compte Apple validé)

**Files:** aucun (vérification) — corriger dans les fichiers concernés si un point échoue.

- [ ] **Step 1:** Prérequis manuels 1–7 faits ; migration appliquée en prod ; variables Vercel présentes (`vercel env ls`) ; secrets GitHub présents (`gh secret list`).
- [ ] **Step 2:** Déployer la branche en preview Vercel ; `ANYLOC_API_URL` (GitHub) pointe sur cette preview pour le test (le remettre sur `https://www.anyloc.io` après merge).
- [ ] **Step 3:** Sur l'iPhone de test (Safari, compte admin) : `/dashboard/iphone` → « Préparer mon iPhone » → Autoriser → Réglages → Profil téléchargé → Installer.
  Expected: retour Safari sur `/dashboard/iphone?etape=preparation`, état « On prépare ton app… ». Dans App Store Connect → Devices, l'iPhone apparaît.
- [ ] **Step 4:** Onglet Actions GitHub : un run « iOS ad hoc re-sign » démarre et passe au vert (≈ 3–6 min).
  Expected: `select status, udids from ios_adhoc_builds order by created_at desc limit 1;` → `succeeded` avec l'UDID.
- [ ] **Step 5:** La page passe à « Ton app est prête » → « Installer Anyloc » → l'app s'installe et **s'ouvre sans passer par le mode développeur ni LocalDevVPN**.
- [ ] **Step 6:** Vérifier la durée : sur le Mac, `security cms -D -i <profil téléchargé depuis le run> | plutil -extract ExpirationDate raw -` → ~1 an.
- [ ] **Step 7:** Cas d'erreur : relancer l'enrôlement avec un second compte sur le même iPhone → message « déjà lié à un autre compte ».

---

### Task 14: App iOS — masquer le renouvellement 7 jours quand l'app est signée en ad hoc

**Files:**
- Modify: `apps/ios/Anyloc/SignatureRenewalService.swift`, `apps/ios/Anyloc/SettingsView.swift` (section « Renouvellement iPhone », ligne ~115)

**Interfaces:**
- Produces: `SignatureRenewalService.shared.isAdHocSigned: Bool` ; `shouldShowBanner` renvoie `false` en ad hoc.

- [ ] **Step 1: Lire le profil embarqué** — ajouter dans `SignatureRenewalService` :

```swift
    /// true quand l'app est signée Apple Distribution + profil ad hoc (install OTA 1 an).
    let isAdHocSigned: Bool = SignatureRenewalService.readEmbeddedProfile().isAdHoc

    private static func readEmbeddedProfile() -> (isAdHoc: Bool, expiresAt: Date?) {
        guard
            let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
            let raw = try? Data(contentsOf: url),
            let text = String(data: raw, encoding: .isoLatin1),
            let start = text.range(of: "<?xml"),
            let end = text.range(of: "</plist>", range: start.lowerBound..<text.endIndex),
            let xml = String(text[start.lowerBound..<end.upperBound]).data(using: .isoLatin1),
            let plist = try? PropertyListSerialization.propertyList(from: xml, format: nil) as? [String: Any]
        else {
            return (false, nil)
        }

        let entitlements = plist["Entitlements"] as? [String: Any]
        let debuggable = entitlements?["get-task-allow"] as? Bool ?? true
        let hasDeviceList = plist["ProvisionedDevices"] != nil
        return (hasDeviceList && !debuggable, plist["ExpirationDate"] as? Date)
    }
```

- [ ] **Step 2: Bannière** — remplacer le corps de `shouldShowBanner` :

```swift
    var shouldShowBanner: Bool {
        if isAdHocSigned {
            return false
        }
        switch state {
        case .soon, .expired:
            return true
        default:
            return false
        }
    }
```

- [ ] **Step 3: Réglages** — dans `SettingsView.swift`, entourer la section `settingsSection("Renouvellement iPhone") { … }` (commentaire `// Renouvellement signature (~7 jours)`) par :

```swift
                        if !renewal.isAdHocSigned {
                            // Renouvellement signature (~7 jours)
                            settingsSection("Renouvellement iPhone") {
                                // … contenu existant inchangé …
                            }
                        }
```

- [ ] **Step 4: Vérifier**
  - Build simulateur : `cd apps/ios && xcodegen generate && xcodebuild -scheme Anyloc -destination 'generic/platform=iOS Simulator' build` → BUILD SUCCEEDED ; sur simulateur (pas de profil embarqué) la section renouvellement reste visible.
  - Publier la nouvelle IPA sur `ios-base` (Task 12 step 2), déclencher un build (ré-enrôler n'est pas nécessaire : insérer une ligne `ios_devices` n'est pas utile — lancer manuellement le workflow via `gh workflow run ios-adhoc-resign.yml -f build_id=<id d'une ligne insérée en 'queued'>`), réinstaller sur l'iPhone de test : plus de bannière orange ni de section « Renouvellement iPhone ».

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Anyloc/SignatureRenewalService.swift apps/ios/Anyloc/SettingsView.swift
git commit -m "feat(ios): hide 7-day renewal when the app is ad hoc signed"
```

---

## Risques connus (à garder en tête, pas à coder ici)

- **Conditions Apple** : l'ad hoc est prévu pour les tests / usage limité, pas la vente au public. Si Apple révoque le certificat Apple Distribution, l'app cesse de s'ouvrir chez tous les clients. Mitigation future : second compte de secours + possibilité de re-signer vers un autre team (le workflow est déjà paramétré par secrets).
- **100 iPhones / an** : un appareil retiré ne libère sa place qu'au renouvellement de l'adhésion. Suivre `select count(*) from ios_devices where status = 'registered'`.
- **Désabonnement** : l'app reste installée jusqu'à expiration du profil ; l'accès est coupé côté API (abonnement), pas côté signature.
- **Minutes macOS GitHub Actions** : ×10 sur dépôt privé. Un run ≈ 5 min ; la file évite les doublons (un seul build `queued`).
