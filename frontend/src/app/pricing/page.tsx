"use server";

import { Check } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { FreeTierCta } from "@/components/pricing/free-tier-cta";
import { ProCheckoutButton } from "@/components/pricing/pro-checkout-button";
import { Button } from "@/components/ui/button";

type PricingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <Check className="mt-0.5 size-4 text-emerald-500" />
      <span>{children}</span>
    </li>
  );
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolvedSearchParams = (await searchParams) ?? {};
  const startCheckoutParam = resolvedSearchParams.startCheckout;
  const startCheckoutValue = Array.isArray(startCheckoutParam)
    ? startCheckoutParam[0]
    : startCheckoutParam;
  const shouldAutoStartPro = startCheckoutValue === "pro";
  const proPriceId = process.env.STRIPE_PRICE_ID_PRO ?? null;
  const isSignedIn = Boolean(user);

  return (
    <div className="px-6 py-16 pt-28 md:px-12">
      <div className="mx-auto max-w-3xl text-center space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
          Pricing
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
          Choose the flavor that fits your creative appetite
        </h1>
        <p className="text-base text-muted-foreground">
          Start for free, then upgrade when you want more credits and projects.
          Every tier taps the same vibe-coding agents you already love.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {/* Free Tier */}
        <div className="flex flex-col gap-6 rounded-3xl border border-border/70 bg-card/60 p-6 shadow-sm ring-1 ring-border/40">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Free
            </p>
            <h2 className="text-4xl font-bold text-foreground">Free</h2>
            <p className="text-sm text-muted-foreground">
              15 free credits to spin up your first vibes.
            </p>
          </div>

          <ul className="space-y-3">
            <PlanFeature>15 free credits</PlanFeature>
            <PlanFeature>Max 3 projects</PlanFeature>
            <PlanFeature>Access to core models</PlanFeature>
          </ul>

          <div className="mt-auto">
            <FreeTierCta isSignedIn={isSignedIn} />
          </div>
        </div>

        {/* Pro Tier */}
        <div className="flex flex-col gap-6 rounded-3xl border border-pink-300/70 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 p-6 shadow-lg ring-2 ring-pink-200/70">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pink-500">
              Pro
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-bold text-foreground">$19</h2>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="text-sm text-muted-foreground">
              200 credits every month plus unlimited projects.
            </p>
          </div>

          <ul className="space-y-3">
            <PlanFeature>200 monthly credits</PlanFeature>
            <PlanFeature>Unlimited projects</PlanFeature>
            <PlanFeature>Priority agent queue</PlanFeature>
          </ul>

          <div className="mt-auto">
            <ProCheckoutButton
              priceId={proPriceId}
              isSignedIn={isSignedIn}
              autoStart={shouldAutoStartPro}
            />
            {!proPriceId && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Missing STRIPE_PRICE_ID_PRO configuration.
              </p>
            )}
          </div>
        </div>

        {/* Custom Tier */}
        <div className="flex flex-col gap-6 rounded-3xl border border-border/70 bg-card/60 p-6 shadow-sm ring-1 ring-border/40">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Custom
            </p>
            <h2 className="text-4xl font-bold text-foreground">
              Let&apos;s chat
            </h2>
            <p className="text-sm text-muted-foreground">
              Tailor credits, models, and SLAs to your studio or team.
            </p>
          </div>

          <ul className="space-y-3">
            <PlanFeature>Custom number of credits</PlanFeature>
            <PlanFeature>Unlimited projects</PlanFeature>
            <PlanFeature>Hands-on onboarding</PlanFeature>
          </ul>

          <div className="mt-auto">
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href="mailto:hello@usetastebuds.dev">Contact us</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
