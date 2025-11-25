"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSupabase } from "@/providers/supabase-provider";

type ProCheckoutButtonProps = {
  priceId?: string | null;
  isSignedIn: boolean;
  autoStart?: boolean;
};

export function ProCheckoutButton({
  priceId,
  isSignedIn,
  autoStart = false,
}: ProCheckoutButtonProps) {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const hasAutoStartedRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const handleAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/pricing?startCheckout=pro");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        console.error("Error starting authentication:", error);
        toast.error("Failed to start sign in. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Unexpected auth error:", err);
      toast.error("Something went wrong starting sign in.");
      setIsLoading(false);
    }
  }, [supabase]);

  const handleCheckout = useCallback(() => {
    if (!priceId) {
      toast.error("Pro plan is currently unavailable.");
      return;
    }

    setIsLoading(true);
    if (formRef.current) {
      if (formRef.current.requestSubmit) {
        formRef.current.requestSubmit();
      } else {
        formRef.current.submit();
      }
    }
  }, [priceId]);

  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current) {
      return;
    }

    if (!isSignedIn) {
      hasAutoStartedRef.current = true;
      setTimeout(() => {
        void handleAuth();
      }, 0);
      return;
    }

    if (priceId) {
      hasAutoStartedRef.current = true;
      setTimeout(() => {
        handleCheckout();
      }, 0);
    }
  }, [autoStart, handleAuth, handleCheckout, isSignedIn, priceId]);

  const buttonLabel = !priceId
    ? "Contact support"
    : isSignedIn
    ? "Upgrade to Pro"
    : "Sign in to upgrade";

  const onClick = isSignedIn ? handleCheckout : handleAuth;

  return (
    <>
      <form
        ref={formRef}
        action="/api/stripe/checkout"
        className="hidden"
        method="POST"
      >
        <input type="hidden" name="priceId" value={priceId ?? ""} readOnly />
      </form>
      <Button
        size="lg"
        className="w-full bg-gradient-to-r from-pink-500 via-red-400 to-orange-300 text-white"
        onClick={onClick}
        disabled={isLoading || !priceId}
      >
        {isLoading ? "Preparing checkout..." : buttonLabel}
      </Button>
    </>
  );
}
