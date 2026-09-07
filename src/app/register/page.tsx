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
            <MapPin className="h-4 w-4 text-pink-600" />
          </div>
          <span className="text-lg font-semibold">Anyloc</span>
        </Link>

        <h1 className="mt-8 text-center text-2xl font-bold text-zinc-900">
          Crée ton compte
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          3 jours gratuits pour explorer Anyloc — sans engagement
        </p>

        <form className="mt-8 space-y-4" action="/dashboard">
          <div>
            <label className="text-sm text-zinc-600" htmlFor="name">
              Prénom
            </label>
            <input
              id="name"
              type="text"
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-pink-500/50"
              placeholder="Alex"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-600" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-pink-500/50"
              placeholder="toi@email.com"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-600" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-pink-500/50"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full">
            Démarrer gratuitement
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-600">
          En créant un compte, tu acceptes nos conditions d&apos;utilisation.
          Annulation possible à tout moment.
        </p>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-pink-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </Card>
    </div>
  );
}
