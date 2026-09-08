import { Check, Minus, X } from "lucide-react";
import { COMPARISON } from "@/lib/constants";

function Cell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="mx-auto h-5 w-5 text-pink-600 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]" />;
  }
  if (value === false) {
    return <X className="mx-auto h-5 w-5 text-zinc-400" />;
  }
  return <Minus className="mx-auto h-5 w-5 text-amber-500/80" />;
}

export function Comparison() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Pourquoi Anyloc c&apos;est validé
          </h2>
          <p className="mt-4 text-zinc-600">
            Les autres solutions trichent en surface. Anyloc modifie le signal
            que ton tel envoie vraiment.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="py-4 pr-4 text-left text-sm font-medium text-zinc-600" />
                <th className="px-4 py-4 text-center text-sm font-semibold gradient-text">
                  Anyloc
                </th>
                <th className="px-4 py-4 text-center text-sm font-medium text-zinc-500">
                  VPN
                </th>
                <th className="px-4 py-4 text-center text-sm font-medium text-zinc-500">
                  App GPS fake
                </th>
                <th className="px-4 py-4 text-center text-sm font-medium text-zinc-500">
                  Capture écran
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-zinc-200">
                  <td className="py-4 pr-4 text-sm text-zinc-700">
                    {row.feature}
                  </td>
                  <td className="px-4 py-4">
                    <Cell value={row.anyloc} />
                  </td>
                  <td className="px-4 py-4">
                    <Cell value={row.vpn} />
                  </td>
                  <td className="px-4 py-4">
                    <Cell value={row.fakeGps} />
                  </td>
                  <td className="px-4 py-4">
                    <Cell value={row.screenshot} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-center text-xs text-zinc-500">
            « — » = ça marche partiellement ou sur une seule app.
          </p>
        </div>
      </div>
    </section>
  );
}
