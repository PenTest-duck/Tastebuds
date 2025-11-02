"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RowHeaderProps {
  value: string;
  canDelete: boolean;
  onUpdate: (value: string) => void;
  onDelete: () => void;
}

export function RowHeader({
  value,
  canDelete,
  onUpdate,
  onDelete,
}: RowHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // Auto-resize textarea to fit content
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(editValue.trim());
    } else {
      setEditValue(value); // Revert if empty
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setEditValue(value);
      setIsEditing(false);
    }
    // Don't prevent Enter - allow multiline text
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div
      className={cn(
        "relative px-3 py-2 min-w-[200px] flex items-start gap-2"
      )}
    >
      {isEditing ? (
        <>
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={handleTextareaChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm min-h-[2rem] resize-none min-w-0"
            rows={1}
          />
          {canDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0 h-5 w-5 opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="size-3" />
            </Button>
          )}
        </>
      ) : (
        <>
          <span
            className="flex-1 text-sm cursor-text text-muted-foreground whitespace-normal break-words min-w-0"
            onClick={() => setIsEditing(true)}
          >
            {value || "Click to edit..."}
          </span>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0 h-5 w-5 opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <X className="size-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
