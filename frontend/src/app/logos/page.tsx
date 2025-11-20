"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { 
  Sparkles, 
  Layers, 
  Image as ImageIcon, 
  Zap, 
  Edit3, 
  Key
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const benefits = [
  {
    icon: Layers,
    title: "Transparent Background",
    description: "Perfect logos with transparent backgrounds ready to use"
  },
  {
    icon: Sparkles,
    title: "Vectorized SVG",
    description: "Scalable vector graphics that look crisp at any size"
  },
  {
    icon: ImageIcon,
    title: "Favicon Sizes",
    description: "Automatically generated in all the sizes you need"
  },
  {
    icon: Zap,
    title: "Multiple Models",
    description: "Choose from various AI models to get the perfect result"
  },
  {
    icon: Edit3,
    title: "Minor Edits",
    description: "Make quick adjustments and refinements to your logos"
  },
  {
    icon: Key,
    title: "BYOK",
    description: "Bring Your Own Key for maximum flexibility and control"
  }
];

export default function LogosPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", "/logos");

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });
  };

  const handleGenerate = async () => {
    const response = await fetch("/api/logos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    if (response.ok) {
      router.push(`/logos/${data.logoProjectId}`);
    } else {
      toast.error(data.error || "Failed to generate logo");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-20">
        <div className="w-full max-w-6xl space-y-16">
          {/* Hero Section */}
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="size-4" />
              AI-Powered Logo Generation
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight pt-1 pb-2">
              The AI logo maker that devs actually love
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create professional logos in seconds with AI. Perfect for your projects, apps, and brands.
            </p>
          </div>

          {/* CTA Section */}
          <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            <div className="relative">
              <Input
                placeholder="e.g. tongue coming out of a mouth"
                className="text-base h-14 pr-32 border-2"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && prompt.trim()) {
                    // Handle logo generation
                  }
                }}
              />
              <Button
                size="lg"
                className="absolute right-2 top-2 h-10 bg-gradient-to-br from-pink-400 via-red-400 to-orange-300"
                disabled={prompt.trim().length < 3}
                onClick={() => {
                  if (!user) {
                    handleAuth();
                  } else {
                    handleGenerate();
                  }
                }}
              >
                Generate
                <Sparkles className="size-4" />
              </Button>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="group relative p-6 rounded-xl border bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="text-lg font-semibold">{benefit.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
