import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import { Database } from "./supabase/database.types";

export const getUserProfile = async (options?: {
  userId?: string;
  admin?: boolean;
}) => {
  let supabase: SupabaseClient<Database>;
  if (options?.admin) {
    supabase = createAdminClient();
  } else {
    supabase = await createClient();
  }

  let userId = options?.userId;
  if (!userId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error getting user:", userError);
      throw new Error("Failed to get user");
    }
    userId = user.id;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (profileError) {
    console.error("Error getting user:", profileError);
    throw new Error("Failed to get user");
  }

  return profile;
};

export const getUserProfilePrivate = async (options?: {
  userId?: string;
  admin?: boolean;
}) => {
  let supabase: SupabaseClient<Database>;
  if (options?.admin) {
    supabase = createAdminClient();
  } else {
    supabase = await createClient();
  }

  let userId = options?.userId;
  if (!userId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error getting user:", userError);
      throw new Error("Failed to get user");
    }
    userId = user.id;
  }

  if (!userId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error getting user:", userError);
      throw new Error("Failed to get user");
    }
    userId = user.id;
  }

  const { data: profilePrivate, error: profilePrivateError } = await supabase
    .from("profiles_private")
    .select("*")
    .eq("id", userId)
    .single();
  if (profilePrivateError) {
    console.error("Error getting user private:", profilePrivateError);
    throw new Error("Failed to get user private");
  }

  return profilePrivate;
};

export const getUserIdByCustomerId = async (stripeCustomerId: string) => {
  const supabase = await createClient();
  const { data: profilePrivate, error } = await supabase
    .from("profiles_private")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single();
  if (error) {
    console.error("Error getting user ID by customer ID:", error);
    throw new Error("Failed to get user ID by customer ID");
  }
  return profilePrivate.id;
};
