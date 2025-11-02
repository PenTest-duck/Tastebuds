"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddRowButtonProps {
  onAdd: () => void;
}

export function AddRowButton({ onAdd }: AddRowButtonProps) {
  return (
    <div className="px-3 py-2 flex items-center">
      <Button
        variant="outline"
        size="sm"
        onClick={onAdd}
        className="w-full gap-2"
      >
        <Plus className="size-4" />
        Add Taste Profile
      </Button>
    </div>
  );
}
