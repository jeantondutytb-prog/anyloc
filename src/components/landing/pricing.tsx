"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/constants";

export function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(planId: string) {
    setLoading(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = "/register";
      }
    } catch {
      window.location.href = "/register";
    } finally {
      setLoading(null);
    }
  }

  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Choisis ton plan
          </h2>
          <p className="mt-4 text-zinc-600">
            3 jours offerts pour tester. Tu résilies quand tu veux, sans galère.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col p-6 ${
                plan.popular
                  ? "border-pink-500/40 bg-gradient-to-b from-pink-500/10 to-violet-500/5 ring-1 ring-pink-500/25"
                  : ""
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Le plus populaire
                </Badge>
              )}

              <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zinc-900">
                  {plan.price}
                </span>
                <span className="text-zinc-500">{plan.period}</span>
              </div>
              {plan.savings && (
                <p className="mt-1 text-sm text-pink-600">{plan.savings}</p>
              )}
              <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-pink-600" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8 w-full"
                variant={plan.popular ? "default" : "secondary"}
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
              >
                {loading === plan.id ? "Chargement..." : "Je prends ce plan"}
              </Button>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-600">
          Besoin d&apos;un plan entreprise ?{" "}
          <Link href="mailto:support@anyloc.io" className="text-pink-600 hover:underline">
            Contacte-nous
          </Link>
        </p>
      </div>
    </section>
  );
}
