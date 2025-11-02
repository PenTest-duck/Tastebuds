"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALL_MODELS, getModelInfo, type LLMModel } from "@/lib/llm-models";
import Image from "next/image";

interface AddColumnButtonProps {
  existingModels: LLMModel[];
  onAdd: (model: LLMModel) => void;
}

export function AddColumnButton({
  existingModels,
  onAdd,
}: AddColumnButtonProps) {
  const availableModels = ALL_MODELS.filter(
    (model) => !existingModels.includes(model)
  );

  if (availableModels.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 gap-2 rounded-t-lg border border-b-0 bg-background hover:bg-muted/50"
        >
          <Plus className="size-4" />
          Add Model
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableModels.map((model) => {
          const modelInfo = getModelInfo(model);
          return (
            <DropdownMenuItem
              key={model}
              onClick={() => onAdd(model)}
              className="gap-2"
            >
              {modelInfo.logoPath && (
                <Image
                  src={modelInfo.logoPath}
                  alt={modelInfo.displayName}
                  width={16}
                  height={16}
                  className="object-contain"
                />
              )}
              <span>{modelInfo.displayName}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
