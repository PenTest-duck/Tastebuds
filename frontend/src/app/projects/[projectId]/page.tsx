"use client";

import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { AgentMatrixTable } from "@/components/agent-matrix-table";
import type { ModelKey } from "@/components/dimensions-input/modelOptions";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();
  const [project, setProject] = useState<
    Database["public"]["Tables"]["projects"]["Row"] | null
  >(null);
  const [agentRuns, setAgentRuns] = useState<
    Database["public"]["Tables"]["agent_runs"]["Row"][]
  >([]);
  const [showIframes, setShowIframes] = useState(false);
  const [fullscreenRunId, setFullscreenRunId] = useState<string | null>(null);
  const blobUrlsRef = useRef<Map<string, string>>(new Map());
  const [blobUrls, setBlobUrls] = useState<Map<string, string>>(new Map());

  // Fetch project
  useEffect(() => {
    supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to fetch project");
          console.error(error);
        } else {
          setProject(data);
        }
      });
  }, [supabase, projectId]);

  // Poll for agent runs every 1 second until all agent runs have finished_at or failed_at set (not null)
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const fetchAgentRuns = async () => {
      const { data, error } = await supabase
        .from("agent_runs")
        .select("*")
        .eq("project_id", projectId)
        .order("order", { ascending: true });

      if (error) {
        toast.error("Failed to fetch agent runs");
        console.error(error);
        return false; // Indicate that polling should stop on error
      } else {
        setAgentRuns(data || []);

        // Check if all agent runs have finished_at or failed_at set (not null)
        const allCompleted = (data || []).every(
          (run) => run.finished_at !== null || run.failed_at !== null
        );
        return !allCompleted; // Return true if we should continue polling
      }
    };

    // Initial fetch
    fetchAgentRuns().then((shouldPoll) => {
      // Only start polling if there are unfinished agent runs
      if (shouldPoll) {
        // Poll every 1 second until all agent runs are finished
        intervalId = setInterval(async () => {
          const shouldContinue = await fetchAgentRuns();
          if (!shouldContinue) {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        }, 1000);
      }
    });

    // Cleanup interval on unmount or when projectId changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [supabase, projectId]);

  // Fetch and cache blob URLs for finished runs when iframe mode is enabled
  useEffect(() => {
    if (!showIframes || !project) return;

    const fetchBlobUrls = async () => {
      const finishedRuns = agentRuns.filter(
        (run) => run.finished_at && !run.failed_at && run.owner_id
      );

      // Clean up old blob URLs that are no longer needed
      const currentRunIds = new Set(finishedRuns.map((run) => run.id));
      blobUrlsRef.current.forEach((url, runId) => {
        if (!currentRunIds.has(runId)) {
          URL.revokeObjectURL(url);
          blobUrlsRef.current.delete(runId);
        }
      });
      // Update state after cleanup
      setBlobUrls(new Map(blobUrlsRef.current));

      // Fetch blob URLs for finished runs that don't have them yet
      await Promise.all(
        finishedRuns.map(async (run) => {
          if (blobUrlsRef.current.has(run.id)) return;

          try {
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
              return;
            }

            // Fetch the HTML content and create a blob URL for proper iframe rendering
            const response = await fetch(signedUrlData.signedUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch HTML: ${response.statusText}`);
            }
            const htmlContent = await response.text();
            const blob = new Blob([htmlContent], { type: "text/html" });
            const blobUrl = URL.createObjectURL(blob);
            blobUrlsRef.current.set(run.id, blobUrl);
          } catch (fetchError) {
            console.error(
              "Unable to fetch HTML content for agent run",
              run.id,
              fetchError
            );
          }
        })
      );
      // Update state once after all blob URLs are fetched
      setBlobUrls(new Map(blobUrlsRef.current));
    };

    fetchBlobUrls();
  }, [showIframes, agentRuns, project, supabase]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      const blobUrls = blobUrlsRef.current;
      blobUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrls.clear();
    };
  }, []);

  // Calculate matrix dimensions and create agent run map
  const { flavors, models, agentRunMap, completedCount, totalCount } =
    useMemo(() => {
      if (!project) {
        return {
          flavors: [],
          models: [],
          agentRunMap: new Map(),
          completedCount: 0,
          totalCount: 0,
        };
      }

      const flavorsArray = project.flavors || [];
      const modelsArray = (project.models || []) as ModelKey[];
      const totalRuns = flavorsArray.length * modelsArray.length;

      // Create a map from (row, col) to agent run
      const runMap = new Map<
        string,
        Database["public"]["Tables"]["agent_runs"]["Row"]
      >();

      agentRuns.forEach((run) => {
        if (run.model && run.flavor) {
          const modelIndex = modelsArray.indexOf(run.model as ModelKey);
          const flavorIndex = flavorsArray.indexOf(run.flavor);
          if (modelIndex !== -1 && flavorIndex !== -1) {
            runMap.set(`${flavorIndex}-${modelIndex}`, run);
          }
        }
      });

      const completed = agentRuns.filter(
        (run) => run.finished_at !== null || run.failed_at !== null
      ).length;

      return {
        flavors: flavorsArray,
        models: modelsArray,
        agentRunMap: runMap,
        completedCount: completed,
        totalCount: totalRuns,
      };
    }, [project, agentRuns]);

  // Track current time for calculating elapsed times
  const [currentTime, setCurrentTime] = useState(0);

  // Initialize and update current time every 100ms for smooth counter updates
  useEffect(() => {
    // Set initial time and start interval
    const updateTime = () => setCurrentTime(Date.now());

    // Set initial time immediately (deferred to avoid lint warning)
    const timeoutId = setTimeout(updateTime, 0);

    const intervalId = setInterval(updateTime, 100);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  // Calculate elapsed times on render based on current time
  const elapsedTimes = useMemo(() => {
    const times = new Map<string, number>();

    agentRuns.forEach((run) => {
      // Only track elapsed time for runs that are still generating (not finished and not failed)
      if (run.created_at && !run.finished_at && !run.failed_at) {
        const startTime = new Date(run.created_at).getTime();
        const elapsed = (currentTime - startTime) / 1000;
        times.set(run.id, elapsed);
      }
    });

    return times;
  }, [agentRuns, currentTime]);

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-8 px-8">
      {/* Navigation */}
      <div className="flex justify-center mb-8">
        <nav className="flex gap-4 text-lg">
          <span className="font-semibold text-foreground">Agents</span>
          <span className="text-muted-foreground">|</span>
          {completedCount === totalCount && totalCount > 0 ? (
            <Link
              href={`/projects/${projectId}/compare`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Compare
            </Link>
          ) : (
            <span className="text-muted-foreground opacity-50 cursor-not-allowed">
              Compare
            </span>
          )}
        </nav>
      </div>

      {/* Progress Display and Toggle */}
      <div className="flex justify-center items-center gap-6 mb-6">
        <div className="text-lg font-medium">
          {completedCount} / {totalCount}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-iframes"
            checked={showIframes}
            onCheckedChange={setShowIframes}
          />
          <label
            htmlFor="show-iframes"
            className="text-sm font-medium cursor-pointer"
          >
            Show previews
          </label>
        </div>
      </div>

      {/* Matrix Table */}
      {project && flavors.length > 0 && models.length > 0 && (
        <AgentMatrixTable
          flavors={flavors}
          models={models}
          agentRunMap={agentRunMap}
          showIframes={showIframes}
          blobUrls={blobUrls}
          fullscreenRunId={fullscreenRunId}
          setFullscreenRunId={setFullscreenRunId}
          elapsedTimes={elapsedTimes}
        />
      )}
    </div>
  );
}
