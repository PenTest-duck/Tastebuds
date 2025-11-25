"use client";

import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

import DimensionsInput from "@/components/dimensions-input/DimensionsInput";
import CreateProjectButton from "@/components/create-project-button";
import {
  DEFAULT_MODEL_KEYS,
  DEFAULT_FLAVORS,
} from "@/components/dimensions-input/modelOptions";
import type { ModelKey } from "@/components/dimensions-input/modelOptions";
import { ArrowDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

const words = ["create", "build", "design", "prototype"];

const sellingPoints = [
  {
    title: "Spin up dozens of coding agents",
    description:
      "Type a single prompt and run dozens of coding agents in parallel, each with a distinct flavor and model.",
    image: "/demo/tastebuds-short.gif",
  },
  {
    title: "Pick designs that match your design taste",
    description:
      "Side-by-side compare flows let you swipe through layouts, typography, and tone until something hits perfectly.",
    image: "/demo/compare.png",
  },
  {
    title: "Continue building in Lovable or Cursor",
    description:
      "Easily continue building the winning prototype in Lovable or Cursor, or take a screenshot or copy the code.",
    image: "/demo/winner.png",
  },
  {
    title: "Make tweaks directly within Tastebuds",
    description:
      "Give quick creative direction, adjust messaging, or add new sections all without leaving Tastebuds.",
    image: "/demo/editor.png",
  },
];

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
  const [models, setModels] = useState<ModelKey[]>(DEFAULT_MODEL_KEYS);
  const [rows, setRows] = useState(initialRows);
  const [columns, setColumns] = useState(initialColumns);
  const [prevCellCount, setPrevCellCount] = useState(
    initialRows * initialColumns
  );

  const handleDimensionsChange = useCallback(
    (newRows: number, newColumns: number) => {
      setRows((prevRows) => {
        setColumns((prevColumns) => {
          // Capture previous cell count before updating
          const oldCellCount = prevRows * prevColumns;
          setPrevCellCount(oldCellCount);
          return newColumns;
        });
        return newRows;
      });
    },
    []
  );

  const handleDataChange = useCallback(
    (newFlavors: string[], newModels: ModelKey[]) => {
      setFlavors(newFlavors);
      setModels(newModels);
    },
    []
  );

  const cellCount = rows * columns;
  const isIncreasing = cellCount > prevCellCount;
  const stepsRef = useRef<HTMLElement>(null);

  const scrollToSteps = () => {
    stepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
              <Badge variant="outline">
                <Info className="size-4" />
                First 15 credits free
              </Badge>
            </div>
            <h1 className="text-4xl font-semibold text-center">
              What do you want to <RotatingWord />?
            </h1>
            <p className="text-center text-muted-foreground">
              Run dozens of vibe-coding agents at once, then Tinder-swipe to
              pick your favorite.
            </p>
            <Button
              variant="link"
              onClick={scrollToSteps}
              className="mx-auto flex items-center justify-center gap-2 text-sm font-medium text-blue-500 underline underline-offset-4"
            >
              How it works
              <ArrowDown className="size-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-6">
            <Textarea
              placeholder="Ask Tastebuds to create"
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

      <section
        ref={stepsRef}
        className="mx-auto mt-20 flex w-full max-w-5xl flex-col gap-12"
      >
        {sellingPoints.map((point, index) => (
          <div
            key={point.image}
            className={`flex flex-col gap-10 rounded-3xl border bg-card/60 p-6 shadow-sm ring-1 ring-border/50 backdrop-blur lg:items-center ${
              index % 2 !== 0 ? "lg:flex-row-reverse" : "lg:flex-row"
            }`}
          >
            <div className="flex-1 space-y-4">
              <Badge variant="secondary" className="rounded-full">
                Step {index + 1}
              </Badge>
              <p className="text-2xl font-semibold">{point.title}</p>
              <p className="text-muted-foreground">{point.description}</p>
            </div>
            <div className="flex-1">
              <div className="overflow-hidden rounded-2xl border border-border bg-muted/40 shadow-inner">
                <Image
                  src={point.image}
                  alt={point.title}
                  width={1200}
                  height={800}
                  className="h-full w-full object-cover"
                  priority={index === 0}
                />
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
