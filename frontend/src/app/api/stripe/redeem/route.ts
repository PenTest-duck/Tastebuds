import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProfilePrivate } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { code } = await request.json();
  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const user = await getUserProfilePrivate();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const supabaseAdmin = createAdminClient();
  const { data: coupon, error: couponError } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", code)
    .eq("disabled", false)
    .single();
  if (couponError || !coupon) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: "Expired code" }, { status: 400 });
  }

  const { data: couponUsageCount, error: couponUsageError } =
    await supabaseAdmin
      .from("coupons_usage")
      .select("count")
      .eq("coupon_id", coupon.id)
      .eq("user_id", user.id)
      .single();
  if (couponUsageError) {
    return NextResponse.json(
      { error: "Failed to get code usage" },
      { status: 500 }
    );
  }
  if (couponUsageCount.count > 0) {
    return NextResponse.json({ error: "Code already used" }, { status: 400 });
  }

  const { error: insertUsageError } = await supabaseAdmin
    .from("coupons_usage")
    .insert({
      coupon_id: coupon.id,
      user_id: user.id,
    });
  if (insertUsageError) {
    return NextResponse.json(
      { error: "Failed to update code usage" },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles_private")
    .update({
      credits: user.credits + coupon.credits,
    })
    .eq("id", user.id);
  if (updateError) {
    return NextResponse.json(
      { error: "Failed to apply code" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
