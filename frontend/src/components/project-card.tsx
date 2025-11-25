"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import TimeAgo from "react-timeago";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import {
  MODELS,
  type ModelKey,
} from "@/components/dimensions-input/modelOptions";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type Project = Database["public"]["Tables"]["projects"]["Row"];

type ProjectCardProps = {
  project: Project;
};

const FALLBACK_LOGO_COLORS = [
  "bg-rose-50 text-rose-600",
  "bg-sky-50 text-sky-600",
  "bg-emerald-50 text-emerald-600",
  "bg-violet-50 text-violet-600",
  "bg-amber-50 text-amber-700",
];

function getPromptPreview(prompt: string | null): string {
  if (!prompt) return "No prompt provided yet.";

  const condensed = prompt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");

  if (condensed.length > 0) {
    return condensed.length > 220 ? `${condensed.slice(0, 217)}…` : condensed;
  }

  return prompt.slice(0, 220);
}

export function ProjectCard({ project }: ProjectCardProps) {
  const title = project.name?.trim() || "Untitled project";
  const promptPreview = getPromptPreview(project.prompt);
  const creditsUsed =
    (project.flavors?.length ?? 0) * (project.models?.length ?? 0);

  const modelKeys = Array.from(new Set(project.models ?? []));
  const models = modelKeys.map((modelKey) => MODELS[modelKey as ModelKey]);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block h-full rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm ring-1 ring-border/30 transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Open project ${title}`}
      prefetch
    >
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Project
            </p>
            <h3 className="text-xl font-semibold leading-tight text-foreground">
              {title}
            </h3>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 shadow-inner">
            <Coins className="size-3.5" />
            {creditsUsed}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Prompt
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {promptPreview}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              AI Models
            </p>
            {models.length === 0 ? (
              <p className="text-sm text-muted-foreground/80">No models</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {models.map((model, index) => (
                  <Avatar key={model.key} className="size-11">
                    <AvatarImage
                      src={model.providerLogoSrc}
                      alt={model.provider}
                      width={28}
                      height={28}
                      className="object-contain aspect-square"
                    />
                    <AvatarFallback
                      className={cn(
                        FALLBACK_LOGO_COLORS[
                          index % FALLBACK_LOGO_COLORS.length
                        ],
                        "text-xs font-semibold uppercase"
                      )}
                    >
                      {model.provider.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <TimeAgo date={project.created_at} />
          </p>
        </div>
      </div>
    </Link>
  );
}
