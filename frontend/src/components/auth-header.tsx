"use client";

import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Settings, UserPlus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Link from "next/link";

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <AvatarImage src={user.user_metadata.avatar_url} />
              <AvatarFallback>
                {user.user_metadata.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-full">
            <DropdownMenuItem>
              <Link
                href="/settings"
                className="w-full flex flex-row items-center justify-between"
              >
                <span>Settings</span>
                <Settings className="size-4" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="w-full flex flex-row items-center justify-between"
            >
              <span>Sign out</span>
              <LogOut className="size-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Button variant="ghost" onClick={handleAuth} className="gap-2">
            Login
          </Button>
          <Button onClick={handleAuth} className="gap-2">
            Sign Up
          </Button>
        </>
      )}
    </div>
  );
}
