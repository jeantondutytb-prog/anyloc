import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-8">
        <Logo className="mx-auto w-fit" />

        <h1 className="mt-8 text-center text-2xl font-bold text-zinc-900">
          Connexion
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Retrouve ton espace et gère ta loc
        </p>

        <form className="mt-8 space-y-4" action="/dashboard">
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
            Se connecter
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-pink-600 hover:underline">
            Créer un compte
          </Link>
        </p>
      </Card>
    </div>
  );
}
