"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { useSupabase } from "@/providers/supabase-provider";
import { toast } from "sonner";

type FreeTierCtaProps = {
  isSignedIn: boolean;
};

export function FreeTierCta({ isSignedIn }: FreeTierCtaProps) {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = useCallback(async () => {
    setIsLoading(true);
    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/pricing");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        console.error("Error signing up:", error);
        toast.error("Failed to start sign up. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Unexpected signup error:", err);
      toast.error("Something went wrong starting sign up.");
      setIsLoading(false);
    }
  }, [supabase]);

  if (isSignedIn) {
    return (
      <Button asChild size="lg" className="w-full">
        <Link href="/projects">Go to my projects</Link>
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={handleSignUp}
      disabled={isLoading}
    >
      {isLoading ? "Opening Google..." : "Sign up to get started"}
    </Button>
  );
}
