import Stripe from "stripe";
import { createAdminClient } from "./supabase/admin";
import { getUserIdByCustomerId } from "./user";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export const handleSubscriptionChange = async (
  subscription: Stripe.Subscription
) => {
  const supabaseAdmin = createAdminClient();
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  const userId = await getUserIdByCustomerId(customerId);
  if (status === "active" || status === "trialing") {
    const plan = subscription.items.data[0]?.plan;
    await supabaseAdmin
      .from("profiles_private")
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_product_id: plan?.product as string,
        tier: "PRO",
        subscription_status: status,
      })
      .eq("id", userId);
  } else if (status === "canceled" || status === "unpaid") {
    await supabaseAdmin
      .from("profiles_private")
      .update({
        stripe_subscription_id: null,
        stripe_product_id: null,
        tier: "FREE",
        subscription_status: status,
      })
      .eq("id", userId);
  }
};

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ["data.product"],
    active: true,
    type: "recurring",
  });

  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === "string" ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days,
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ["data.default_price"],
  });

  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === "string"
        ? product.default_price
        : product.default_price?.id,
  }));
}
