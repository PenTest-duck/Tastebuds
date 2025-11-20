"use client";

import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";

export default function AuthHeader() {
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const pathname = usePathname();

  // Use session from context - it's updated server-side via SupabaseListener
  const user = session?.user ?? null;

  const handleAuth = async () => {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", pathname || "/");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <Button
          variant="outline"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      ) : (
        <>
          <Button
            variant="ghost"
            onClick={handleAuth}
            className="gap-2"
          >
            <LogIn className="size-4" />
            Login
          </Button>
          <Button
            onClick={handleAuth}
            className="gap-2"
          >
            <UserPlus className="size-4" />
            Sign Up
          </Button>
        </>
      )}
    </div>
  );
}

