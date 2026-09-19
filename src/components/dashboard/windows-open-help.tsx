"use client";

import { cn } from "@/lib/utils";

function ChromeDownloadWarningMock() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-zinc-300 bg-[#f1f3f4] shadow-sm"
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-zinc-500">
          EXE
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-900">
            Anyloc-Setup.exe
          </p>
          <p className="text-xs leading-snug text-amber-800">
            Faites attention. Ce type de fichier peut endommager votre
            ordinateur.
          </p>
        </div>
        <span className="rounded border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
          ▾
        </span>
      </div>
      <div className="border-t border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700">
        Menu → <strong>Conserver</strong>
        <span className="text-zinc-400"> (pas Jeter)</span>
      </div>
    </div>
  );
}

function SmartScreenMock() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm"
    >
      <div className="bg-[#0078d4] px-4 py-3 text-white">
        <p className="text-sm font-semibold">
          Windows a protégé votre ordinateur
        </p>
      </div>
      <div className="space-y-2 px-4 py-3 text-sm text-zinc-700">
        <p>
          Microsoft Defender SmartScreen a empêché le démarrage d&apos;une
          application non reconnue.
        </p>
        <p>
          <span className="text-zinc-500">Application :</span> Anyloc-Setup.exe
        </p>
        <p>
          <span className="text-zinc-500">Éditeur :</span> Éditeur inconnu
        </p>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <span className="rounded-md border-2 border-pink-500 bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-800">
            Plus d&apos;infos
          </span>
          <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs text-zinc-400 line-through">
            OK
          </span>
        </div>
        <p className="text-xs text-zinc-500">
          Ensuite : <strong>Exécuter quand même</strong>
        </p>
      </div>
    </div>
  );
}

export function WindowsOpenHelp({
  downloaded = false,
  zipDownloadPath,
  compact = false,
  embedded = false,
}: {
  downloaded?: boolean;
  zipDownloadPath?: string | null;
  compact?: boolean;
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        !embedded && "rounded-xl border px-4 py-4",
        !embedded &&
          (downloaded
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50")
      )}
    >
      {!embedded ? (
        <>
          <p className="font-semibold text-zinc-900">
            {downloaded
              ? "Windows va dire « Faites attention » — clique Conserver, puis ouvre"
              : "Sur Windows, Chrome dit « Faites attention ». C'est normal."}
          </p>
          <p className="mt-1 text-sm text-amber-950/80">
            Le fichier n&apos;est pas un virus. Windows le dit pour toutes les
            apps qui ne viennent pas du Microsoft Store.
          </p>
        </>
      ) : null}

      {compact ? (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-800">
          <li>
            En bas de Chrome : flèche <strong>▾</strong> →{" "}
            <strong>Conserver</strong> (pas Jeter)
          </li>
          <li>
            Dossier <strong>Téléchargements</strong> → double-clic{" "}
            <strong>Anyloc-Setup</strong>
          </li>
          <li>
            Écran bleu : <strong>Plus d&apos;infos</strong> →{" "}
            <strong>Exécuter quand même</strong>
            <span className="text-zinc-500"> — pas OK</span>
          </li>
        </ol>
        <p className="mt-2 text-xs text-zinc-600">
          Déjà installé ? Icône près de l&apos;horloge → clic droit →{" "}
          <strong>Quitter</strong>, sinon tu n&apos;as pas l&apos;écran « 4
          étapes ».
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              1. Chrome ou Edge — le bandeau en bas
            </p>
            <ChromeDownloadWarningMock />
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-800">
              <li>Ne clique pas sur la croix, sinon le fichier est jeté</li>
              <li>
                Clique la petite flèche <strong>▾</strong> à droite du nom
              </li>
              <li>
                Clique <strong>Conserver</strong>. S&apos;il redemande :{" "}
                <strong>Conserver quand même</strong>
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              2. Ouvre Anyloc
            </p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-800">
              <li>
                Ouvre le dossier <strong>Téléchargements</strong>
              </li>
              <li>
                Double-clique <strong>Anyloc-Setup.exe</strong>
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              3. Écran « Windows a protégé votre ordinateur »
            </p>
            <SmartScreenMock />
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-800">
              <li>
                Clique <strong>Plus d&apos;infos</strong> — pas le bouton OK
              </li>
              <li>
                Clique <strong>Exécuter quand même</strong>
              </li>
            </ol>
          </section>

          <section className="rounded-lg bg-white/80 px-3 py-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">
              Anyloc est déjà installé ?
            </p>
            <p className="mt-1">
              En bas à droite, près de l&apos;horloge : icône Anyloc → clic
              droit → <strong>Quitter</strong>. Sinon l&apos;ancien programme
              reste ouvert et tu n&apos;as jamais l&apos;écran{" "}
              <strong>4 étapes</strong>.
            </p>
          </section>

          <section className="rounded-lg bg-white/80 px-3 py-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">Toujours bloqué ?</p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5">
              <li>
                Clic droit sur le fichier → <strong>Propriétés</strong>
              </li>
              <li>
                En bas, case <strong>Débloquer</strong> → OK
              </li>
              <li>
                Re-double-clique, ou clic droit →{" "}
                <strong>Exécuter en tant qu&apos;administrateur</strong>
              </li>
            </ol>
          </section>
        </div>
      )}

      {zipDownloadPath ? (
        <p className="mt-3 text-sm text-zinc-700">
          Chrome refuse encore le fichier ?{" "}
          <a
            href={zipDownloadPath}
            className="font-medium text-pink-700 underline-offset-2 hover:underline"
          >
            Télécharge le zip
          </a>
          , ouvre-le, puis double-clique <strong>Anyloc-Setup.exe</strong>.
        </p>
      ) : null}
    </div>
  );
}
