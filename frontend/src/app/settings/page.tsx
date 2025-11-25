import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getUserProfilePrivate } from "@/lib/user";

export const revalidate = 0;

type UpdateProfileFormState = {
  error?: string;
  success?: boolean;
};

async function updateProfileAction(
  _prevState: UpdateProfileFormState,
  formData: FormData
): Promise<UpdateProfileFormState> {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");

  const trimmedFirstName =
    typeof firstName === "string" ? firstName.trim() : "";
  const trimmedLastName = typeof lastName === "string" ? lastName.trim() : "";

  if (!trimmedFirstName || !trimmedLastName) {
    return {
      error: "Both first and last name are required.",
    };
  }

  if (trimmedFirstName.length < 2 || trimmedLastName.length < 2) {
    return {
      error: "Names should be at least 2 characters.",
    };
  }

  if (trimmedFirstName.length > 64 || trimmedLastName.length > 64) {
    return {
      error: "Names should be 64 characters or fewer.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: trimmedFirstName,
      last_name: trimmedLastName,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update profile:", error);
    return {
      error: "We couldn't save your name. Please try again.",
    };
  }

  revalidatePath("/settings");

  return {
    success: true,
  };
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [profile, profilePrivate] = await Promise.all([
    getUserProfile({ userId: user.id }),
    getUserProfilePrivate({ userId: user.id }),
  ]);

  const tierLabel =
    profilePrivate.tier === "PRO" ? "Tastebuds Pro" : "Tastebuds Free";
  const subscriptionStatus = formatStatus(profilePrivate.subscription_status);
  const hasStripeCustomer = Boolean(profilePrivate.stripe_customer_id);
  const hasActiveSubscription =
    profilePrivate.tier === "PRO" &&
    Boolean(profilePrivate.stripe_subscription_id);
  const manageCtaLabel = hasActiveSubscription
    ? "Manage billing in Stripe"
    : "Open billing portal";
  const memberSince = formatDate(profile.created_at);

  return (
    <div className="px-6 py-16 pt-28 md:px-12">
      <div className="max-w-3xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          Settings
        </p>
        <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
          Tailor Tastebuds to you
        </h1>
        <p className="text-base text-muted-foreground">
          Update your profile details and keep your subscription in sync with
          the moments you are building.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm ring-1 ring-border/40">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                General
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Profile
              </h2>
              <p className="text-sm text-muted-foreground">
                This name appears on emails, invoices, and share links.
              </p>
            </div>
            <Badge variant="secondary" className="bg-muted/50">
              {profile.email.split("@")[0]}
            </Badge>
          </div>

          <div className="mt-6">
            <GeneralSettingsForm
              defaultValues={{
                firstName: profile.first_name ?? "",
                lastName: profile.last_name ?? "",
              }}
              action={updateProfileAction}
            />
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/40 px-4 py-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Email
              </p>
              <p className="text-sm font-medium text-foreground break-all">
                {profile.email}
              </p>
              <p className="text-xs text-muted-foreground">
                Contact support if you need to change this.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Member since
              </p>
              <p className="text-sm font-medium text-foreground">
                {memberSince}
              </p>
              <p className="text-xs text-muted-foreground">
                {profilePrivate.tier === "PRO"
                  ? "Thanks for being part of the Pro crew."
                  : "Upgrade anytime for more credits."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-pink-200/80 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 p-6 shadow-lg ring-2 ring-pink-100/70">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-pink-500">
                Subscription
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Billing & credits
              </h2>
              <p className="text-sm text-foreground/70">
                Keep your plan and credit balance in sync.
              </p>
            </div>
            <Badge className="border border-white/60 bg-white/80 text-pink-600">
              {profilePrivate.tier}
            </Badge>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/70 bg-white/80 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Current plan
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {tierLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                Status{" "}
                <span className="font-medium text-foreground">
                  {subscriptionStatus}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-white to-pink-50 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Credits left
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="text-4xl font-semibold text-foreground">
                  {profilePrivate.credits}
                </p>
                <span className="text-sm text-muted-foreground">
                  Available now
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <form action="/api/stripe/manage" method="POST">
              <Button
                type="submit"
                className="bg-gradient-to-r from-pink-500 via-red-400 to-orange-300 text-white"
              >
                {hasStripeCustomer ? manageCtaLabel : "Upgrade"}
              </Button>
            </form>
            <Button asChild variant="ghost">
              <a href="/pricing">Explore plans</a>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function formatStatus(status?: string | null) {
  if (!status) {
    return "Not active";
  }

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}
