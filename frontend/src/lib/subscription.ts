import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { getUserProfilePrivate } from "./user";

export const STRIPE_PRODUCT_ID_TO_TIER_MAP = {
  [process.env.STRIPE_PRODUCT_ID_PRO!]: "PRO",
} as const;

const PROJECTS_LIMIT = {
  FREE: 3,
  PRO: null,
} as const;

export const chargeCredits = async ({
  userId,
  cost,
}: {
  userId: string;
  cost: number;
}) => {
  const supabase = await createClient();

  let hasEnoughCredits = true;
  const { data: profilePrivate, error: profilePrivateError } = await supabase
    .from("profiles_private")
    .select("credits")
    .eq("id", userId)
    .single();
  if (profilePrivateError) {
    console.error("Error getting profile private:", profilePrivateError);
    throw new Error("Failed to get credits");
  }
  if (!profilePrivate) {
    throw new Error("Credits not found");
  }
  if (profilePrivate.credits < cost) {
    hasEnoughCredits = false;
  }

  const executeCharge = async () => {
    const supabaseAdmin = createAdminClient();
    const { error: updateError } = await supabaseAdmin
      .from("profiles_private")
      .update({
        credits: profilePrivate.credits - cost,
      })
      .eq("id", userId);
    if (updateError) {
      console.error("Error updating credits:", updateError);
      throw new Error("Failed to update credits");
    }
  };

  return {
    hasEnoughCredits,
    executeCharge,
  };
};

export const addCredits = async ({
  userId,
  amount,
}: {
  userId: string;
  amount: number;
}) => {
  const supabaseAdmin = createAdminClient();
  const { data: profilePrivate, error: profilePrivateError } =
    await supabaseAdmin
      .from("profiles_private")
      .select("credits")
      .eq("id", userId)
      .single();
  if (profilePrivateError) {
    console.error("Error getting profile private:", profilePrivateError);
    throw new Error("Failed to get profile");
  }
  if (!profilePrivate) {
    throw new Error("Profile not found");
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles_private")
    .update({ credits: profilePrivate.credits + amount })
    .eq("id", userId);
  if (updateError) {
    console.error("Error updating credits:", updateError);
    throw new Error("Failed to update credits");
  }

  console.log("[addCredits] Credits added to user:", userId, amount);
};

export const checkProjectsLimit = async ({
  userId,
}: {
  userId: string;
}): Promise<boolean> => {
  const user = await getUserProfilePrivate({ userId });
  if (!user) {
    throw new Error("User not found");
  }

  const limit = PROJECTS_LIMIT[user.tier];
  if (limit === null) {
    return true;
  }

  const supabase = await createClient();
  const { data, error: projectsError } = await supabase
    .from("projects")
    .select("id", { count: "exact" })
    .eq("owner_id", userId);
  if (projectsError) {
    console.error("Error getting projects:", projectsError);
    throw new Error("Failed to get projects");
  }

  return data.length < limit;
};
