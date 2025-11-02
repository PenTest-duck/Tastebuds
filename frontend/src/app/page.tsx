"use client";

import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useCallback } from "react";

import DimensionsInput from "@/components/dimensions-input/DimensionsInput";
import CreateProjectButton from "@/components/create-project-button";
import {
  DEFAULT_MODEL_KEYS,
  DEFAULT_FLAVORS,
} from "@/components/dimensions-input/modelOptions";
import type { ModelOptionKey } from "@/components/dimensions-input/modelOptions";
import { Dot, Info } from "lucide-react";

const words = ["create", "build", "design", "prototype"];

function RotatingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2000); // Change word every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block relative">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="inline-block"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function Home() {
  const initialRows = DEFAULT_FLAVORS.length;
  const initialColumns = DEFAULT_MODEL_KEYS.length;

  const [prompt, setPrompt] = useState("");
  const [flavors, setFlavors] = useState<string[]>(DEFAULT_FLAVORS);
  const [models, setModels] = useState<ModelOptionKey[]>(DEFAULT_MODEL_KEYS);
  const [rows, setRows] = useState(initialRows);
  const [columns, setColumns] = useState(initialColumns);
  const [prevCellCount, setPrevCellCount] = useState(
    initialRows * initialColumns
  );

  const handleDimensionsChange = useCallback((newRows: number, newColumns: number) => {
    setRows((prevRows) => {
      setColumns((prevColumns) => {
        // Capture previous cell count before updating
        const oldCellCount = prevRows * prevColumns;
        setPrevCellCount(oldCellCount);
        return newColumns;
      });
      return newRows;
    });
  }, []);

  const handleDataChange = useCallback((newFlavors: string[], newModels: ModelOptionKey[]) => {
    setFlavors(newFlavors);
    setModels(newModels);
  }, []);

  const cellCount = rows * columns;
  const isIncreasing = cellCount > prevCellCount;

  // Update prevCellCount after animation
  useEffect(() => {
    if (cellCount !== prevCellCount) {
      const timer = setTimeout(() => {
        setPrevCellCount(cellCount);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [cellCount, prevCellCount]);

  return (
    <div className="px-4 py-8">
      {/* Main content centered */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] py-16">
        <div className="w-full max-w-4xl space-y-6">
          <div className="space-y-2">
            <div className="flex justify-center">
              {/* <Badge variant="outline">
                <Info className="size-4" />
                First 50 credits free
              </Badge> */}
            </div>
            <h1 className="text-4xl font-semibold text-center">
              What do you want to <RotatingWord />?
            </h1>
          </div>
          
          <div className="flex flex-col gap-6">
            <Textarea
              placeholder="Describe your vision..."
              className="h-28 resize-none text-base"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <DimensionsInput
              onDimensionsChange={handleDimensionsChange}
              onDataChange={handleDataChange}
            />
            <div className="flex justify-end">
              <CreateProjectButton
                prompt={prompt}
                flavors={flavors}
                models={models}
                cellCount={cellCount}
                isIncreasing={isIncreasing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
