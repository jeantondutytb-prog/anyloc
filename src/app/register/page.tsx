import Link from "next/link";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/30 to-violet-500/30">
            <MapPin className="h-4 w-4 text-pink-300" />
          </div>
          <span className="text-lg font-semibold">Anyloc</span>
        </Link>

        <h1 className="mt-8 text-center text-2xl font-bold text-white">
          Essai gratuit 3 jours
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Crée ton compte et change ta position dès maintenant
        </p>

        <form className="mt-8 space-y-4" action="/dashboard">
          <div>
            <label className="text-sm text-zinc-400" htmlFor="name">
              Prénom
            </label>
            <input
              id="name"
              type="text"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-pink-500/50"
              placeholder="Alex"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-pink-500/50"
              placeholder="toi@email.com"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-pink-500/50"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full">
            Commencer l&apos;essai gratuit
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-600">
          En créant un compte, tu acceptes nos conditions d&apos;utilisation.
          Annulation possible à tout moment.
        </p>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-pink-400 hover:underline">
            Se connecter
          </Link>
        </p>
      </Card>
    </div>
  );
}
