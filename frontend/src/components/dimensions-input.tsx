"use client";

import { useState, useEffect } from "react";
import { DEFAULT_MODELS, type LLMModel } from "@/lib/llm-models";
import { TabHeader } from "./dimensions-input/tab-header";
import { RowHeader } from "./dimensions-input/row-header";
import { AddColumnButton } from "./dimensions-input/add-column-button";
import { AddRowButton } from "./dimensions-input/add-row-button";
import {
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const DEFAULT_TASTE_PROFILES = [
  "Minimalistic and clean",
  "Bold and vibrant",
  "Elegant and sophisticated",
  "Playful and creative",
];

interface DimensionsInputProps {
  onDimensionsChange?: (rows: number, columns: number) => void;
}

export default function DimensionsInput({
  onDimensionsChange,
}: DimensionsInputProps) {
  const [models, setModels] = useState<LLMModel[]>(DEFAULT_MODELS);
  const [tasteProfiles, setTasteProfiles] =
    useState<string[]>(DEFAULT_TASTE_PROFILES);

  // Notify parent of dimension changes
  useEffect(() => {
    onDimensionsChange?.(tasteProfiles.length, models.length);
  }, [tasteProfiles.length, models.length, onDimensionsChange]);

  const handleAddColumn = (model: LLMModel) => {
    const newModels = [...models, model];
    setModels(newModels);
    onDimensionsChange?.(tasteProfiles.length, newModels.length);
  };

  const handleRemoveColumn = (index: number) => {
    if (models.length <= 1) return;
    const newModels = models.filter((_, i) => i !== index);
    setModels(newModels);
    onDimensionsChange?.(tasteProfiles.length, newModels.length);
  };

  const handleAddRow = () => {
    const newProfiles = [...tasteProfiles, ""];
    setTasteProfiles(newProfiles);
    onDimensionsChange?.(newProfiles.length, models.length);
  };

  const handleUpdateRow = (index: number, value: string) => {
    const newProfiles = [...tasteProfiles];
    newProfiles[index] = value;
    setTasteProfiles(newProfiles);
    onDimensionsChange?.(newProfiles.length, models.length);
  };

  const handleRemoveRow = (index: number) => {
    if (tasteProfiles.length <= 1) return;
    const newProfiles = tasteProfiles.filter((_, i) => i !== index);
    setTasteProfiles(newProfiles);
    onDimensionsChange?.(newProfiles.length, models.length);
  };

  // Calculate column width based on widest header (Add Model button is likely widest)
  // Using fixed width that accommodates logo + text + padding for all models
  const COLUMN_WIDTH = 150; // Width that fits widest column header

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      <div className="relative flex">
        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <Table className="table-fixed">
            <colgroup>
              <col style={{ width: "200px" }} />
              {models.map((_, index) => (
                <col key={index} style={{ width: `${COLUMN_WIDTH}px` }} />
              ))}
            </colgroup>
            <TableHeader>
              <TableRow>
                {/* Empty corner cell */}
                <TableHead className="p-0 border-r bg-muted/20">
                  <div className="h-9"></div>
                </TableHead>

                {/* Model tabs */}
                {models.map((model, index) => (
                  <TableHead
                    key={`${model}-${index}`}
                    className="p-0 align-bottom"
                  >
                    <div className="pt-1">
                      <TabHeader
                        model={model}
                        canDelete={models.length > 1}
                        onDelete={() => handleRemoveColumn(index)}
                      />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {tasteProfiles.map((profile, rowIndex) => (
                <TableRow key={rowIndex} className="border-b">
                  {/* Row header */}
                  <TableCell className="p-0 border-r bg-muted/10">
                    <RowHeader
                      value={profile}
                      canDelete={tasteProfiles.length > 1}
                      onUpdate={(value) => handleUpdateRow(rowIndex, value)}
                      onDelete={() => handleRemoveRow(rowIndex)}
                    />
                  </TableCell>

                  {/* Empty cells for each model */}
                  {models.map((model, colIndex) => {
                    const agentNumber = rowIndex * models.length + colIndex + 1;
                    return (
                      <TableCell
                        key={`${rowIndex}-${colIndex}`}
                        className={cn(
                          "h-12 border-l text-muted-foreground text-center",
                          colIndex === 0 && "border-l-0",
                          colIndex === models.length - 1 && "border-r"
                        )}
                      >
                        Agent {agentNumber}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Add Column Button - positioned outside table, aligned with header row */}
        <div className="flex-shrink-0 pt-1" style={{ width: `${COLUMN_WIDTH}px` }}>
          <AddColumnButton
            existingModels={models}
            onAdd={handleAddColumn}
          />
        </div>
      </div>

      {/* Add Row Button - positioned outside table, aligned with row headers column */}
      <div className="flex border-t bg-muted/10">
        <div className="w-[200px] flex-shrink-0 border-r bg-muted/10">
          <AddRowButton onAdd={handleAddRow} />
        </div>
        <div className="flex-1"></div>
      </div>
    </div>
  );
}