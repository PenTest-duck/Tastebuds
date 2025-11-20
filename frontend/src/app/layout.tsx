import type { Metadata } from "next";
import { Geist, Geist_Mono, Pacifico } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Image from "next/image";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import AuthHeader from "@/components/auth-header";
import SupabaseProvider from "@/providers/supabase-provider";
import SupabaseListener from "@/providers/supabase-listener";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Tastebuds",
  description: "Vibe coding agents that find your taste",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pacifico.variable} antialiased`}
      >
        <SupabaseProvider session={session}>
          <SupabaseListener serverAccessToken={session?.access_token} />
          <div className="relative min-h-screen">
            {/* Logo and name in top left */}
            <Link href="/">
              <div className="absolute top-6 left-6 flex items-center gap-2 z-10">
                <Image
                  src="/tastebuds.png"
                  alt="Tastebuds Logo"
                  width={60}
                  height={60}
                  className="object-contain"
                />
                <h2 
                  className="text-3xl"
                  style={{ fontFamily: 'var(--font-pacifico)' }}
                >
                  Tastebuds
                </h2>
              </div>
            </Link>
            {/* Auth header in top right */}
            <AuthHeader />
            {children}
          </div>
          <Analytics />
          <Toaster />
        </SupabaseProvider>
      </body>
    </html>
  );
}
