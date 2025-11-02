"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getModelInfo, type LLMModel } from "@/lib/llm-models";
import { cn } from "@/lib/utils";

interface TabHeaderProps {
  model: LLMModel;
  canDelete: boolean;
  onDelete: () => void;
}

export function TabHeader({ model, canDelete, onDelete }: TabHeaderProps) {
  const modelInfo = getModelInfo(model);

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0 bg-background hover:bg-muted/50 transition-colors",
        "w-full"
      )}
    >
      {modelInfo.logoPath && (
        <Image
          src={modelInfo.logoPath}
          alt={modelInfo.displayName}
          width={20}
          height={20}
          className="object-contain shrink-0"
        />
      )}
      <span className="text-sm font-medium min-w-0 truncate">{modelInfo.displayName}</span>
      {canDelete && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto shrink-0 h-5 w-5 opacity-70 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X className="size-3" />
        </Button>
      )}
    </div>
  );
}
