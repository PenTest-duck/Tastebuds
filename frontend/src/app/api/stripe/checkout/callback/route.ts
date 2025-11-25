import { stripe } from "@/lib/stripe";
import { addCredits, STRIPE_PRODUCT_ID_TO_TIER_MAP } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProfile, getUserProfilePrivate } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription"],
    });
    if (!session.customer || typeof session.customer === "string") {
      throw new Error("Invalid customer data from Stripe.");
    }

    const customerId = session.customer.id;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (!subscriptionId) {
      throw new Error("No subscription found for this session.");
    }

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price.product"],
    });
    const plan = subscription.items.data[0]?.price;
    if (!plan) {
      throw new Error("No plan found for this subscription.");
    }
    const productId = (plan.product as Stripe.Product).id;
    if (!productId) {
      throw new Error("No product ID found for this subscription.");
    }
    const userId = session.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }

    const user = await getUserProfile({ userId, admin: true });
    if (!user) {
      throw new Error("User not found in database.");
    }
    const profilePrivate = await getUserProfilePrivate({ userId, admin: true });
    if (!profilePrivate) {
      throw new Error("User private profile not found in database.");
    }

    // If the user already has an active subscription, redirect to the home page
    if (profilePrivate.stripe_subscription_id === subscriptionId) {
      console.log(
        "[stripe/checkout/callback] User already has an active subscription:",
        JSON.stringify(profilePrivate, null, 2)
      );
      return NextResponse.redirect(new URL("/", request.url));
    }

    const newTier = STRIPE_PRODUCT_ID_TO_TIER_MAP[productId];
    if (newTier === "PRO" && subscription.status === "active") {
      await addCredits({ userId, amount: 200 }); // Pro users get 200 monthly credits
    }

    // Update the user's profile in the database
    const supabaseAdmin = createAdminClient();
    const { data, error: updateError } = await supabaseAdmin
      .from("profiles_private")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_product_id: productId,
        tier: newTier,
        subscription_status: subscription.status,
      })
      .eq("id", userId)
      .select("*")
      .single();
    if (updateError) {
      console.error("Error updating user's profile:", updateError);
      throw new Error("Failed to update user's profile");
    }

    console.log(
      "[stripe/checkout/callback] User updated:",
      JSON.stringify(data, null, 2)
    );

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Error handling successful checkout:", error);
    return NextResponse.redirect(new URL("/error", request.url));
  }
}
