import { getUserProfile, getUserProfilePrivate } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const priceId = formData.get("priceId");
  if (!priceId || typeof priceId !== "string") {
    return NextResponse.json(
      { error: "Price ID is required" },
      { status: 400 }
    );
  }

  const user = await getUserProfile();
  const userPrivate = await getUserProfilePrivate({ userId: user.id });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer_email: user.email,
    customer: userPrivate.stripe_customer_id || undefined,
    client_reference_id: user.id,
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe/checkout/callback?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
    subscription_data: {
      billing_mode: {
        type: "flexible",
      },
    },
    name_collection: {
      individual: {
        enabled: true,
        optional: false,
      },
      business: {
        enabled: true,
        optional: true,
      },
    },
  });

  return NextResponse.redirect(session.url!, { status: 303 }); // must be 303 (not 307) otherwise Stripe throws 403 error
}
