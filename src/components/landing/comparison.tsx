import { Check, Minus, X } from "lucide-react";
import { COMPARISON } from "@/lib/constants";

function Cell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="mx-auto h-5 w-5 text-emerald-400" />;
  }
  if (value === false) {
    return <X className="mx-auto h-5 w-5 text-zinc-600" />;
  }
  return <Minus className="mx-auto h-5 w-5 text-amber-400/70" />;
}

export function Comparison() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Anyloc vs tout le reste
          </h2>
          <p className="mt-4 text-zinc-400">
            Le seul outil qui change ta position là où ton téléphone la lit
            vraiment — pour toutes tes apps.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 pr-4 text-left text-sm font-medium text-zinc-400" />
                <th className="px-4 py-4 text-center text-sm font-semibold text-emerald-400">
                  Anyloc
                </th>
                <th className="px-4 py-4 text-center text-sm font-medium text-zinc-500">
                  VPN
                </th>
                <th className="px-4 py-4 text-center text-sm font-medium text-zinc-500">
                  Fake GPS
                </th>
                <th className="px-4 py-4 text-center text-sm font-medium text-zinc-500">
                  Screenshot
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-white/5">
                  <td className="py-4 pr-4 text-sm text-zinc-300">
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
        </div>
      </div>
    </section>
  );
}
