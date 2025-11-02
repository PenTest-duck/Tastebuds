"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ModelOptionKey } from "@/components/dimensions-input/modelOptions";
import { toast } from "sonner";

type CreateProjectButtonProps = {
  prompt: string;
  flavors: string[];
  models: ModelOptionKey[];
  cellCount: number;
  isIncreasing: boolean;
};

export default function CreateProjectButton({
  prompt,
  flavors,
  models,
  cellCount,
  isIncreasing,
}: CreateProjectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // User is not logged in, redirect to Google OAuth with form data
        const callbackUrl = new URL("/auth/callback", window.location.origin);
        
        // Encode form data in callback URL params
        callbackUrl.searchParams.set("prompt", prompt.trim());
        callbackUrl.searchParams.set("flavors", JSON.stringify(flavors));
        callbackUrl.searchParams.set("models", JSON.stringify(models));
        
        // Initiate Google OAuth sign-in
        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: callbackUrl.toString(),
          },
        });

        if (signInError) {
          console.error("Error signing in:", signInError);
          toast.error("Failed to sign in. Please try again.");
          setIsLoading(false);
          return;
        }
        // The redirect will happen automatically
        return;
      }

      // User is logged in, create the project via server endpoint
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          flavors: flavors.filter((f) => f.trim()).map((f) => f.trim()),
          models: models,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Error creating project:", errorData);
        toast.error(errorData.error || "Failed to create project. Please try again.");
        setIsLoading(false);
        return;
      }

      const { project } = await response.json();

      // Navigate to the project page
      if (project?.id) {
        router.push(`/projects/${project.id}`);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="lg"
      className="gap-2 px-6 py-5 text-base bg-gradient-to-br from-pink-400 via-red-400 to-orange-300"
      onClick={handleCreate}
      disabled={isLoading || !prompt.trim()}
    >
      <Sparkles className="size-5" />
      Create{" "}
      <span className="inline-block relative w-6 text-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={cellCount}
            initial={{
              opacity: 0,
              rotateX: isIncreasing ? 90 : -90,
            }}
            animate={{
              opacity: 1,
              rotateX: 0,
            }}
            exit={{
              opacity: 0,
              rotateX: isIncreasing ? -90 : 90,
            }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className="inline-block"
          >
            {cellCount}
          </motion.span>
        </AnimatePresence>
      </span>
    </Button>
  );
}

