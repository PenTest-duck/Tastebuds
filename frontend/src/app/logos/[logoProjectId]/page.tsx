"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Edit3,
  ImageIcon,
  FileImage,
  FileCode,
  Package,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Framework = "html" | "react" | "nextjs" | "angular";

const frameworkInstructions: Record<Framework, string[]> = {
  html: [
    "Place favicon.ico in your project root directory",
    "Add <link rel='icon' href='/favicon.ico' /> to your HTML <head>",
    "Place apple-icon.png in your public directory",
    "Add <link rel='apple-touch-icon' href='/apple-icon.png' /> to your HTML <head>",
    "Place manifest.webmanifest in your public directory",
    "Add <link rel='manifest' href='/manifest.webmanifest' /> to your HTML <head>",
  ],
  react: [
    "Place favicon.ico in your public folder",
    "Place apple-icon.png in your public folder",
    "Place manifest.webmanifest in your public folder",
    "Update your index.html in the public folder with the appropriate <link> tags",
    "The files will be automatically served from the public directory",
  ],
  nextjs: [
    "Place favicon.ico in your app directory (or public folder for Pages Router)",
    "Place apple-icon.png in your app directory",
    "Place manifest.webmanifest in your app directory",
    "Next.js will automatically detect and use these files",
    "For App Router, metadata is handled via metadata exports",
  ],
  angular: [
    "Place favicon.ico in your src folder",
    "Place apple-icon.png in your src/assets folder",
    "Place manifest.webmanifest in your src folder",
    "Update angular.json to include the files in assets",
    "Add the appropriate <link> tags in your index.html",
  ],
};

export default function LogoProjectPage() {
  const { logoProjectId } = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<"transparent" | "white" | "black">("transparent");
  const [editPrompt, setEditPrompt] = useState("");
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  
  // Data states
  const [logoProject, setLogoProject] = useState<Tables<"logo_projects"> | null>(null);
  const [logoGeneration, setLogoGeneration] = useState<Tables<"logo_generations"> | null>(null);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Action states
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const refreshLatestGeneration = useCallback(
    async ({
      ownerId,
      supabaseClient,
      suppressSkeleton = false,
    }: {
      ownerId?: string;
      supabaseClient?: ReturnType<typeof createClient>;
      suppressSkeleton?: boolean;
    } = {}) => {
      if (!logoProjectId) return;

      const supabase = supabaseClient ?? createClient();
      if (!suppressSkeleton) {
        setIsLoading(true);
      }

      try {
        const { data: generations, error: generationsError } = await supabase
          .from("logo_generations")
          .select("*")
          .eq("logo_project_id", logoProjectId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (generationsError) {
          setError("Failed to load logo generations");
          setIsLoading(false);
          return;
        }

        if (!generations || generations.length === 0) {
          setError("No logo generations found");
          setIsLoading(false);
          return;
        }

        const latestGeneration = generations[0];
        setLogoGeneration(latestGeneration);

        if (latestGeneration.status === "FAILED") {
          setError("Logo generation failed");
          setIsLoading(false);
          return;
        }

        if (latestGeneration.status === "IN_PROGRESS") {
          setError(null);
          setIsLoading(true);
          return;
        }

        const resolvedOwnerId = ownerId ?? logoProject?.owner_id ?? userId;
        if (!resolvedOwnerId) {
          setError("Failed to determine logo owner");
          setIsLoading(false);
          return;
        }

        const { data: signedUrlData } = await supabase.storage
          .from("logos")
          .createSignedUrl(
            `${resolvedOwnerId}/${logoProjectId}/${latestGeneration.id}/logo.png`,
            60 * 60
          );

        if (signedUrlData?.signedUrl) {
          const signedUrl = signedUrlData.signedUrl;
          const cacheBustedUrl = `${signedUrl}${signedUrl.includes("?") ? "&" : "?"}cb=${Date.now()}`;
          setLogoImageUrl(cacheBustedUrl);
          setError(null);
        } else {
          setError("Failed to load logo image");
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error refreshing logo:", err);
        setError("An error occurred while loading the logo");
        setIsLoading(false);
      }
    },
    [logoProjectId, logoProject?.owner_id, userId]
  );

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const supabase = createClient();
      
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          router.push("/logos");
          setIsLoading(false);
          return;
        }
        setUserId(user.id);

        // Fetch logo project
        const { data: project, error: projectError } = await supabase
          .from("logo_projects")
          .select("*")
          .eq("id", logoProjectId)
          .single();

        if (projectError || !project) {
          router.push("/logos");
          setIsLoading(false);
          return;
        }

        // Check ownership
        if (project.owner_id !== user.id) {
          router.push("/logos");
          setIsLoading(false);
          return;
        }

        setLogoProject(project);
        await refreshLatestGeneration({
          ownerId: user.id,
          supabaseClient: supabase,
          suppressSkeleton: true,
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("An error occurred while loading the logo");
        setIsLoading(false);
      }
    }

    fetchData();
  }, [logoProjectId, router, refreshLatestGeneration]);

  useEffect(() => {
    if (logoGeneration?.status !== "IN_PROGRESS") {
      return;
    }

    const intervalId = setInterval(() => {
      refreshLatestGeneration({ suppressSkeleton: true });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [logoGeneration?.status, refreshLatestGeneration]);

  // Helper function to apply filters and convert image
  const processAndDownloadImage = async (
    format: "png" | "jpeg" | "webp",
    filename: string,
    width?: number,
    height?: number
  ) => {
    if (!logoImageUrl) return;

    try {
      // Create an image element
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logoImageUrl;
      });

      // Create canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size
      canvas.width = width || img.width;
      canvas.height = height || img.height;

      // Apply background if needed
      if (backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor === "white" ? "#ffffff" : "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Apply white background for transparent for JPEG as it does not have an alpha channel
        if (format === "jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      // Apply grayscale filter if needed
      if (isGrayscale) {
        ctx.filter = "grayscale(100%)";
      }

      // Draw the image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, `image/${format}`);
    } catch (error) {
      console.error("Error processing image:", error);
      setError("Failed to download image");
    }
  };

  const handleDownload = async (format: "png" | "jpeg" | "webp") => {
    if (format === "png") {
      await processAndDownloadImage("png", "logo.png");
    } else if (format === "jpeg") {
      await processAndDownloadImage("jpeg", "logo.jpeg");
    } else if (format === "webp") {
      await processAndDownloadImage("webp", "logo.webp");
    }
  };

  const handleDownloadSVG = async () => {
    if (!userId || !logoProjectId || !logoGeneration) return;

    setIsVectorizing(true);
    try {
      const response = await fetch(
        `/api/logos/${logoProjectId}/${logoGeneration.id}/vectorize`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error("Failed to vectorize image");
      }

      // After vectorization, download the SVG
      const supabase = createClient();
      const { data: signedUrlData } = await supabase.storage
        .from("logos")
        .createSignedUrl(
          `${userId}/${logoProjectId}/${logoGeneration.id}/logo.svg`,
          60 * 60 // 1 hour
        );

      if (signedUrlData?.signedUrl) {
        // Download the SVG
        const svgResponse = await fetch(signedUrlData.signedUrl);
        const svgBlob = await svgResponse.blob();
        const url = URL.createObjectURL(svgBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "logo.svg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error vectorizing:", error);
      setError("Failed to vectorize and download SVG");
    } finally {
      setIsVectorizing(false);
    }
  };

  const handleDownloadFavicon = async () => {
    await processAndDownloadImage("png", "favicon.png", 32, 32);
  };

  const handleDownloadZip = () => {
    // Dummy download handler for metadata zip
    if (selectedFramework) {
      console.log(`Downloading metadata zip for ${selectedFramework}`);
    }
  };

  const handleEdit = async () => {
    if (!logoProjectId || !logoGeneration || !editPrompt.trim()) return;

    setIsEditing(true);
    try {
      const response = await fetch(
        `/api/logos/${logoProjectId}/${logoGeneration.id}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: editPrompt }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to edit logo");
      }

      setEditPrompt("");
      await refreshLatestGeneration({
        ownerId: userId ?? logoProject?.owner_id,
      });
    } catch (error) {
      console.error("Error editing logo:", error);
      setError("Failed to edit logo");
    } finally {
      setIsEditing(false);
    }
  };

  const frameworks: { id: Framework; name: string; image: string }[] = [
    { id: "html", name: "HTML", image: "/icons/html.png" },
    { id: "react", name: "React", image: "/icons/react.png" },
    { id: "nextjs", name: "Next.js", image: "/icons/nextjs.svg" },
    { id: "angular", name: "Angular", image: "/icons/angular.png" },
  ];

  const getBackgroundClass = () => {
    if (backgroundColor === "white") return "bg-white";
    if (backgroundColor === "black") return "bg-black";
    return "bg-transparent";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Logo Display & Editing */}
          <div className="w-full lg:w-1/2 space-y-6">
            {/* Display prompt */}
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Prompt:</span> {logoProject?.prompt}
            </div>

            {/* Error display */}
            {error && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Logo Display Area */}
            <div className="relative w-full aspect-square max-w-md mx-auto rounded-xl border-2 border-border overflow-hidden bg-muted backdrop-blur-sm">
              {/* Toggle Controls - Top Right */}
              <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <Switch
                    id="grayscale"
                    checked={isGrayscale}
                    onCheckedChange={setIsGrayscale}
                  />
                  <label
                    htmlFor="grayscale"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Grayscale
                  </label>
                </div>
                <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <Switch
                    id="background"
                    checked={backgroundColor !== "transparent"}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setBackgroundColor("white");
                      } else {
                        setBackgroundColor("transparent");
                      }
                    }}
                  />
                  <label
                    htmlFor="background"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Background
                  </label>
                </div>
                {backgroundColor !== "transparent" && (
                  <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <button
                      onClick={() => setBackgroundColor("white")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        backgroundColor === "white"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => setBackgroundColor("black")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        backgroundColor === "black"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      Dark
                    </button>
                  </div>
                )}
              </div>

              <div className={cn("absolute inset-0 flex items-center justify-center", getBackgroundClass())}>
                {isLoading || !logoImageUrl ? (
                  <Skeleton className="w-full h-full rounded-none" />
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={logoImageUrl}
                      alt="Generated logo"
                      fill
                      className={cn(
                        "object-contain p-8",
                        isGrayscale && "grayscale"
                      )}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Edit Prompt Input */}
            <div className="relative">
              <Input
                placeholder="e.g. make it more colorful, add a border, change the style"
                className="text-base h-14 pr-32 border-2"
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editPrompt.trim()) {
                    handleEdit();
                  }
                }}
                disabled={isEditing}
              />
              <Button
                size="lg"
                className="absolute right-2 top-2 h-10 bg-gradient-to-br from-pink-400 via-red-400 to-orange-300"
                disabled={editPrompt.trim().length < 3 || isEditing}
                onClick={handleEdit}
              >
                {isEditing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Editing...
                  </>
                ) : (
                  <>
                    Edit
                    <Edit3 className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column - Download Panel */}
          <div className="w-full lg:w-1/2 space-y-6">
            {/* Download Section */}
            <div className="p-6 rounded-xl border bg-card/50 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Download className="size-5" />
                Download
              </h2>
              
              {/* Download Format Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    disabled={!logoImageUrl}
                  >
                    <span className="flex items-center gap-2">
                      <FileImage className="size-4" />
                      Download Logo
                    </span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={handleDownloadSVG}
                    disabled={isVectorizing}
                  >
                    <FileCode className="size-4" />
                    {isVectorizing ? "Vectorizing..." : "Download as SVG"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("png")}>
                    <ImageIcon className="size-4" />
                    Download as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("jpeg")}>
                    <ImageIcon className="size-4" />
                    Download as JPEG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload("webp")}>
                    <ImageIcon className="size-4" />
                    Download as WEBP
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Favicon Download */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleDownloadFavicon}
                disabled={!logoImageUrl}
              >
                <FileImage className="size-4" />
                Download favicon.png
              </Button>
            </div>

            {/* Framework Metadata Section */}
            <div className="p-6 rounded-xl border bg-card/50 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Package className="size-5" />
                Metadata Files
              </h2>

              {/* Framework Buttons */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Framework</label>
                <div className="flex flex-wrap gap-2">
                  {frameworks.map((framework) => (
                    <Button
                      key={framework.id}
                      onClick={() => setSelectedFramework(framework.id)}
                      className={cn(
                        "relative h-12 w-20 rounded-md border-2 transition-all hover:scale-105",
                        selectedFramework === framework.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      )}
                      variant="outline"
                    >
                      <Image
                        src={framework.image}
                        alt={framework.name}
                        fill
                        className="object-contain p-1.5"
                      />
                    </Button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {selectedFramework && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Installation Steps</label>
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <ol className="space-y-2 list-decimal list-inside text-sm text-muted-foreground">
                        {frameworkInstructions[selectedFramework].map((step, index) => (
                          <li key={index} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Download ZIP Button */}
                  <Button
                    className="w-full bg-gradient-to-br from-pink-400 via-red-400 to-orange-300"
                    onClick={handleDownloadZip}
                  >
                    <Package className="size-4" />
                    Download Metadata ZIP
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
