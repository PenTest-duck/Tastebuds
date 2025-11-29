"use client";

import { useState } from "react";
import { Maximize2, Wand2 } from "lucide-react";
import Link from "next/link";

import type { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MODELS } from "@/components/dimensions-input/modelOptions";
import type { ModelKey } from "@/components/dimensions-input/modelOptions";

type AgentRun = Database["public"]["Tables"]["agent_runs"]["Row"];

export type CardData = {
  run: AgentRun;
  url: string;
};

function getModelLabel(model: string | null): string | null {
  if (!model) return null;
  const option = MODELS[model as ModelKey];
  return option ? option.name : model;
}

function renderCardMeta(card: CardData) {
  const modelLabel = getModelLabel(card.run.model);
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span>
        Flavor:{" "}
        <span className="text-foreground font-medium">{card.run.flavor}</span>
      </span>
      {modelLabel && (
        <span>
          Model:{" "}
          <span className="text-foreground font-medium">{modelLabel}</span>
        </span>
      )}
    </div>
  );
}

type CompareCardProps = {
  card: CardData;
  editHref?: string;
};

export function CompareCard({ card, editHref }: CompareCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleIframeClick = () => {
    setIsDialogOpen(true);
  };

  return (
    <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">
            Agent {card.run.order}
          </span>
          {renderCardMeta(card)}
        </div>
        <div className="flex items-center gap-2">
          {editHref && (
            <Button
              asChild
              variant="default"
              className="bg-gradient-to-br from-pink-400 via-red-400 to-orange-300"
            >
              <Link href={editHref}>
                <Wand2 className="size-4" />
                <span>Edit prototype</span>
              </Link>
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Maximize2 className="size-4" />
                <span className="sr-only">Enlarge preview</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-[calc(80vw)] sm:max-w-[calc(80vw)] aspect-[16/9] !flex !flex-col">
              <DialogTitle className="shrink-0">
                Agent {card.run.order}
              </DialogTitle>
              <div className="flex-1 min-h-0 overflow-hidden rounded-md border">
                <iframe
                  src={card.url}
                  title={`Agent ${card.run.order} preview`}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="relative w-full">
        <div
          className="w-full overflow-hidden cursor-pointer"
          style={{ aspectRatio: "16/9" }}
          onClick={handleIframeClick}
        >
          <iframe
            src={card.url}
            title={`Agent ${card.run.order}`}
            className="h-full w-full pointer-events-none"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
