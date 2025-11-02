"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui/spinner";
import { CompareCard, type CardData } from "@/components/compare-card";
import { Button } from "@/components/ui/button";
import { Database } from "@/lib/supabase/database.types";
import { Camera, Code, Heart } from "lucide-react";
import Image from "next/image";

function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function ComparePage() {
  const { projectId } = useParams();
  const supabase = useMemo(() => createClient(), []);

  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [activeCards, setActiveCards] = useState<CardData[]>([]);
  const [queue, setQueue] = useState<CardData[]>([]);
  const [winner, setWinner] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Database["public"]["Tables"]["projects"]["Row"] | null>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const projectIdValue = useMemo(() => {
    if (typeof projectId === "string") return projectId;
    if (Array.isArray(projectId)) return projectId[0];
    return "";
  }, [projectId]);

  // Fetch project data
  useEffect(() => {
    if (!projectIdValue) return;

    const fetchProject = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectIdValue)
        .single();

      if (error) {
        console.error("Failed to fetch project", error);
      } else {
        setProject(data);
      }
    };

    fetchProject();
  }, [projectIdValue, supabase]);

  useEffect(() => {
    let isMounted = true;

    const fetchRuns = async () => {
      if (!projectIdValue) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("agent_runs")
          .select("*")
          .eq("project_id", projectIdValue)
          .order("order", { ascending: true });

        if (error) {
          throw error;
        }

        const completedRuns = (data ?? []).filter(
          (run) => run.finished_at && !run.failed_at
        );

        // Clean up old blob URLs before creating new ones
        blobUrlsRef.current.forEach((url) => {
          URL.revokeObjectURL(url);
        });
        blobUrlsRef.current.clear();

        const cards = await Promise.all(
          completedRuns.map(async (run) => {
            const path = `${run.owner_id}/${run.project_id}/${run.id}/index.html`;
            const { data: signedUrlData, error: signedUrlError } =
              await supabase.storage
                .from("projects")
                .createSignedUrl(path, 60 * 60);

            if (signedUrlError || !signedUrlData?.signedUrl) {
              console.error(
                "Unable to create signed URL for agent run",
                run.id,
                signedUrlError
              );
              return null;
            }

            // Fetch the HTML content and create a blob URL for proper iframe rendering
            try {
              const response = await fetch(signedUrlData.signedUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch HTML: ${response.statusText}`);
              }
              const htmlContent = await response.text();
              const blob = new Blob([htmlContent], { type: "text/html" });
              const blobUrl = URL.createObjectURL(blob);
              blobUrlsRef.current.add(blobUrl);

              return { run, url: blobUrl } satisfies CardData;
            } catch (fetchError) {
              console.error(
                "Unable to fetch HTML content for agent run",
                run.id,
                fetchError
              );
              return null;
            }
          })
        );

        if (!isMounted) return;

        const validCards = cards.filter((card): card is CardData => Boolean(card));
        const shuffled = shuffleArray(validCards);

        setAllCards(shuffled);

        if (shuffled.length === 0) {
          setActiveCards([]);
          setQueue([]);
          setWinner(null);
        } else if (shuffled.length === 1) {
          setActiveCards([shuffled[0]]);
          setQueue([]);
          setWinner(shuffled[0]);
        } else {
          setActiveCards(shuffled.slice(0, 2));
          setQueue(shuffled.slice(2));
          setWinner(null);
        }
      } catch (err) {
        console.error("Failed to load agent runs", err);
        toast.error("Failed to load completed designs");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRuns();

    return () => {
      isMounted = false;
    };
  }, [projectIdValue, supabase]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      // Revoke all blob URLs when component unmounts
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const blobUrls = blobUrlsRef.current;
      blobUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrls.clear();
    };
  }, []);

  useEffect(() => {
    if (winner || queue.length > 0 || activeCards.length !== 1) return;
    setWinner(activeCards[0]);
  }, [activeCards, queue.length, winner]);

  const totalCount = allCards.length;
  const remainingCount = winner ? 1 : activeCards.length + queue.length;

  const handleSelect = useCallback(
    (side: "left" | "right") => {
      if (activeCards.length < 2) return;

      const selectedIndex = side === "left" ? 0 : 1;
      const selectedCard = activeCards[selectedIndex];

      if (!selectedCard) return;

      if (queue.length === 0) {
        setWinner(selectedCard);
        setActiveCards([selectedCard]);
        setQueue([]);
        return;
      }

      const [nextCard, ...rest] = queue;
      const updatedActive =
        side === "left"
          ? [selectedCard, nextCard]
          : [nextCard, selectedCard];

      setActiveCards(updatedActive);
      setQueue(rest);
      setWinner(null);
    },
    [activeCards, queue]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleSelect("left");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        handleSelect("right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSelect]);

  const handleTakeScreenshot = useCallback(async () => {
    if (!winner) return;

    try {
      // Fetch the HTML content to render it for screenshot
      const response = await fetch(winner.url);
      if (!response.ok) throw new Error("Failed to fetch HTML content");
      const htmlContent = await response.text();

      // Create a temporary iframe to render the content
      const tempIframe = document.createElement("iframe");
      tempIframe.style.position = "fixed";
      tempIframe.style.left = "-9999px";
      tempIframe.style.width = "1920px"; // Set a large width for full content
      document.body.appendChild(tempIframe);

      await new Promise<void>((resolve, reject) => {
        tempIframe.onload = async () => {
          try {
            // Wait a bit for content to fully render
            await new Promise((r) => setTimeout(r, 500));

            const iframeDoc = tempIframe.contentDocument || tempIframe.contentWindow?.document;
            if (!iframeDoc) {
              throw new Error("Cannot access iframe document");
            }

            // Get the body element from the iframe
            const bodyElement = iframeDoc.body;
            if (!bodyElement) {
              throw new Error("Cannot access iframe body");
            }

            // Calculate full height of content
            const fullHeight = Math.max(
              bodyElement.scrollHeight,
              bodyElement.offsetHeight,
              iframeDoc.documentElement.scrollHeight,
              iframeDoc.documentElement.offsetHeight,
              iframeDoc.documentElement.clientHeight
            );

            // Set iframe height to full content height
            tempIframe.style.height = `${fullHeight}px`;
            await new Promise((r) => setTimeout(r, 200));

            // Take screenshot using html2canvas
            const canvas = await html2canvas(bodyElement, {
              width: tempIframe.offsetWidth,
              height: fullHeight,
              useCORS: true,
              allowTaint: true,
              backgroundColor: "#ffffff",
            });

            // Convert canvas to blob and copy to clipboard
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error("Failed to create image blob"));
                return;
              }
              navigator.clipboard.write([
                new ClipboardItem({
                  "image/png": blob,
                }),
              ]).then(() => {
                toast.success("Screenshot copied to clipboard!");
                document.body.removeChild(tempIframe);
                resolve();
              }).catch((err) => {
                document.body.removeChild(tempIframe);
                reject(err);
              });
            }, "image/png");
          } catch (error) {
            document.body.removeChild(tempIframe);
            reject(error);
          }
        };

        // Write HTML content to iframe
        tempIframe.contentDocument?.open();
        tempIframe.contentDocument?.write(htmlContent);
        tempIframe.contentDocument?.close();
      });
    } catch (error) {
      console.error("Failed to take screenshot", error);
      toast.error("Failed to take screenshot");
    }
  }, [winner]);

  const handleCopyCode = useCallback(async () => {
    if (!winner) return;

    try {
      const response = await fetch(winner.url);
      if (!response.ok) throw new Error("Failed to fetch HTML content");
      const htmlContent = await response.text();
      await navigator.clipboard.writeText(htmlContent);
      toast.success("Code copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy code", error);
      toast.error("Failed to copy code");
    }
  }, [winner]);

  const handleContinueOnLovable = useCallback(() => {
    if (!project?.prompt) {
      toast.error("Project prompt not available");
      return;
    }

    const encodedPrompt = encodeURIComponent(project.prompt);
    const lovableUrl = `https://lovable.dev/?autosubmit=true#prompt=${encodedPrompt}`;
    window.open(lovableUrl, "_blank");
  }, [project]);

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-8 px-8">
      {/* Navigation */}
      <div className="flex justify-center mb-8">
        <nav className="flex gap-4 text-lg">
          <Link
            href={`/projects/${projectIdValue}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Agents
          </Link>
          <span className="text-muted-foreground">|</span>
          <span className="font-semibold text-foreground">Compare</span>
        </nav>
      </div>

      <div className="flex justify-center mb-6">
        <div className="text-lg font-medium text-muted-foreground">
          {totalCount > 0 ? (
            <span>
              Remaining {remainingCount} / {totalCount}
            </span>
          ) : (
            <span>No completed designs yet</span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center gap-8">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-6" />
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">
            There are no completed agent runs available for comparison yet.
          </div>
        ) : winner && queue.length === 0 && activeCards.length === 1 ? (
          <div className="flex flex-1 flex-col items-center gap-6 w-full">
            <div className="text-2xl font-semibold">🏆 Winner 🏆</div>
            <div className="flex gap-3">
              <Button onClick={handleTakeScreenshot} variant="outline">
                <Camera />
                Copy screenshot
              </Button>
              <Button onClick={handleCopyCode} variant="outline">
                <Code />
                Copy code
              </Button>
              <Button onClick={handleContinueOnLovable} variant="outline">
                <Image src="/lovable.svg" alt="Lovable" width={16} height={16} />
                <span>Continue on Lovable</span>
              </Button>
              <Button onClick={handleContinueOnLovable} variant="outline">
                <Image src="/cursor.png" alt="Cursor" width={16} height={16} />
                <span>Continue in Cursor</span>
              </Button>
            </div>
            <motion.div
              key={winner.run.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-4xl"
            >
              <CompareCard card={winner} />
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 w-full max-w-6xl">
            <div className="grid w-full gap-6 md:grid-cols-2">
              <AnimatePresence initial={false}>
                {activeCards.map((card) => {
                  return (
                    <motion.div
                      key={card.run.id}
                      initial={{ opacity: 0, y: 16, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -16, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                    >
                      <CompareCard card={card} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg shadow-sm">←</kbd>{" "}
              or <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg shadow-sm">→</kbd>{" "}
              to select the better design
            </div>
          </div>
        )}
      </div>
    </div>
  );
}