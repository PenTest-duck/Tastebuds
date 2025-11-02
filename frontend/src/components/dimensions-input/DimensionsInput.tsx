"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  DEFAULT_MODEL_KEYS,
  DEFAULT_FLAVORS,
  MODEL_OPTIONS,
  ModelOptionKey,
} from "./modelOptions";

type Row = {
  id: string;
  value: string;
};

export type DimensionsInputProps = {
  onDimensionsChange?: (rows: number, columns: number) => void;
  className?: string;
};

const ROW_HEADER_WIDTH = 220;
const COLUMN_MIN_WIDTH = 168;

const createRow = (value = ""): Row => ({
  id:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `row-${Math.random().toString(36).slice(2, 9)}`,
  value,
});

export function DimensionsInput({
  onDimensionsChange,
  className,
}: DimensionsInputProps) {
  const [columnKeys, setColumnKeys] = useState<ModelOptionKey[]>(
    DEFAULT_MODEL_KEYS
  );
  const [rows, setRows] = useState<Row[]>(() =>
    DEFAULT_FLAVORS.map((flavor) => createRow(flavor))
  );

  useEffect(() => {
    onDimensionsChange?.(rows.length, columnKeys.length);
  }, [rows.length, columnKeys.length, onDimensionsChange]);

  const columns = useMemo(
    () => columnKeys.map((key) => MODEL_OPTIONS[key]),
    [columnKeys]
  );

  const availableModels = useMemo(
    () =>
      Object.values(MODEL_OPTIONS).filter(
        (option) => !columnKeys.includes(option.key)
      ),
    [columnKeys]
  );

  const tableMinWidth = ROW_HEADER_WIDTH + columns.length * COLUMN_MIN_WIDTH;

  const handleAddColumn = (key: ModelOptionKey) => {
    setColumnKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const handleRemoveColumn = (key: ModelOptionKey) => {
    setColumnKeys((prev) => (prev.length > 1 ? prev.filter((k) => k !== key) : prev));
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createRow("New flavor")]);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  };

  const handleRowChange = (id: string, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, value } : row)));
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className="flex items-center justify-end gap-2 pr-0.5"
        style={{ marginLeft: ROW_HEADER_WIDTH }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 rounded-lg border-dashed border-border bg-muted/40 px-3 py-1.5 text-xs font-medium uppercase text-muted-foreground tracking-wide transition hover:-translate-y-0.5 hover:bg-muted/80"
              disabled={availableModels.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add model
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {availableModels.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                All models added
              </div>
            ) : (
              availableModels.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onSelect={() => handleAddColumn(option.key)}
                  className="flex items-center gap-3"
                >
                  <Image
                    src={option.logoSrc}
                    alt={`${option.label} logo`}
                    width={20}
                    height={20}
                    className="h-5 w-5"
                  />
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            <table
              className="w-full table-fixed border-collapse text-sm"
              style={{ minWidth: tableMinWidth }}
            >
              <thead className="bg-muted/70 text-muted-foreground">
                <tr>
                  <th
                    scope="col"
                    className="border-border border-b border-r px-3.5 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
                    style={{ width: ROW_HEADER_WIDTH }}
                  >
                    Flavor / Model
                  </th>
                  {columns.map((model, index) => (
                    <th
                      key={model.key}
                      scope="col"
                      className={cn(
                        "border-border border-b px-0 align-bottom",
                        index !== columns.length - 1 ? "border-r" : "border-r-0"
                      )}
                    >
                      <div className="group relative flex min-h-[3.1rem] w-full items-center justify-center gap-2 rounded-t-xl border border-border border-b-0 bg-background px-4 pr-11 py-2.5 text-sm font-semibold text-foreground shadow-[0_-4px_12px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5">
                        <div className="flex items-center gap-2">
                          <Image
                            src={model.logoSrc}
                            alt={`${model.label} logo`}
                            width={24}
                            height={24}
                            className="h-6 w-6"
                          />
                          <span>{model.label}</span>
                        </div>
                        {columns.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveColumn(model.key)}
                            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.id} className="bg-background">
                    <th
                      scope="row"
                      className={cn(
                        "border-border border-r px-0 align-top",
                        rowIndex !== rows.length - 1 ? "border-b" : "border-b-0"
                      )}
                      style={{ width: ROW_HEADER_WIDTH }}
                    >
                      <div className="group relative h-full w-full px-3.5 py-2.5 pr-11">
                        <Textarea
                          value={row.value}
                          onChange={(event) =>
                            handleRowChange(row.id, event.target.value)
                          }
                          placeholder="Describe the flavor..."
                          className="min-h-[2.9rem] w-full resize-none border-none bg-transparent px-0 text-sm font-medium leading-snug text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        {rows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRow(row.id)}
                            className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </th>
                    {columns.map((model, columnIndex) => (
                      <td
                        key={`${row.id}-${model.key}`}
                        className={cn(
                          "border-border align-middle",
                          rowIndex !== rows.length - 1 ? "border-b" : "border-b-0",
                          columnIndex !== columns.length - 1 ? "border-r" : "border-r-0"
                        )}
                      >
                        <div className="flex h-20 w-full items-center justify-center text-[0.85rem] font-medium text-muted-foreground">
                          Agent {rowIndex * columns.length + columnIndex + 1}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          variant="ghost"
          className="flex items-center justify-start gap-2 rounded-full border border-dashed border-border bg-muted/40 px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          onClick={handleAddRow}
          style={{ width: ROW_HEADER_WIDTH }}
        >
          <Plus className="h-4 w-4" />
          Add flavor
        </Button>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

export default DimensionsInput;

