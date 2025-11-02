"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";

import DimensionsInput from "@/components/dimensions-input/DimensionsInput";
import {
  DEFAULT_MODEL_KEYS,
  DEFAULT_FLAVORS,
} from "@/components/dimensions-input/modelOptions";

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

  const [rows, setRows] = useState(initialRows);
  const [columns, setColumns] = useState(initialColumns);
  const [prevCellCount, setPrevCellCount] = useState(
    initialRows * initialColumns
  );

  const handleDimensionsChange = (newRows: number, newColumns: number) => {
    setPrevCellCount(rows * columns);
    setRows(newRows);
    setColumns(newColumns);
  };

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
    <div className="relative min-h-screen px-4 py-8">
      {/* Logo and name in top left */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <Image
          src="/tastebuds.png"
          alt="Tastebuds Logo"
          width={60}
          height={60}
          className="object-contain"
        />
        <h2 
          className="text-3xl"
          style={{ fontFamily: 'var(--font-pacifico)' }}
        >
          Tastebuds
        </h2>
      </div>

      {/* Main content centered */}
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] py-16">
        <div className="w-full max-w-4xl space-y-6">
          <h1 className="text-4xl font-semibold text-center">
            What do you want to <RotatingWord />?
          </h1>
          
          <div className="flex flex-col gap-6">
            <Textarea
              placeholder="Describe your vision..."
              className="h-28 resize-none text-base"
            />
            <DimensionsInput onDimensionsChange={handleDimensionsChange} />
            <div className="flex justify-end">
              <Button size="lg" className="gap-2 px-6 py-5 text-base">
                <Sparkles className="size-5" />
                Create{" "}
                <span className="inline-block relative w-6 text-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={cellCount}
                      initial={{
                        opacity: 0,
                        rotateX: isIncreasing ? 90 : -90,
                      }}
                      animate={{
                        opacity: 1,
                        rotateX: 0,
                      }}
                      exit={{
                        opacity: 0,
                        rotateX: isIncreasing ? -90 : 90,
                      }}
                      transition={{
                        duration: 0.3,
                        ease: "easeInOut",
                      }}
                      className="inline-block"
                    >
                      {cellCount}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
