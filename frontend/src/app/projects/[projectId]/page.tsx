"use client";

import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import { MODEL_OPTIONS } from "@/components/dimensions-input/modelOptions";
import type { ModelOptionKey } from "@/components/dimensions-input/modelOptions";

export default function ProjectPage() {
  const { projectId } = useParams();
  const supabase = createClient();
  const [project, setProject] = useState<Database['public']['Tables']['projects']['Row'] | null>(null);
  const [agentRuns, setAgentRuns] = useState<Database['public']['Tables']['agent_runs']['Row'][]>([]);

  // Fetch project
  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
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
        .from('agent_runs')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true });

      if (error) {
        toast.error("Failed to fetch agent runs");
        console.error(error);
        return false; // Indicate that polling should stop on error
      } else {
        setAgentRuns(data || []);
        
        // Check if all agent runs have finished_at or failed_at set (not null)
        const allCompleted = (data || []).every(run => run.finished_at !== null || run.failed_at !== null);
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

  // Calculate matrix dimensions and create agent run map
  const { flavors, models, agentRunMap, completedCount, totalCount } = useMemo(() => {
    if (!project) {
      return { flavors: [], models: [], agentRunMap: new Map(), completedCount: 0, totalCount: 0 };
    }

    const flavorsArray = project.flavors || [];
    const modelsArray = (project.models || []) as ModelOptionKey[];
    const totalRuns = flavorsArray.length * modelsArray.length;

    // Create a map from (row, col) to agent run
    const runMap = new Map<string, Database['public']['Tables']['agent_runs']['Row']>();
    
    agentRuns.forEach((run) => {
      if (run.model && run.flavor) {
        const modelIndex = modelsArray.indexOf(run.model as ModelOptionKey);
        const flavorIndex = flavorsArray.indexOf(run.flavor);
        if (modelIndex !== -1 && flavorIndex !== -1) {
          runMap.set(`${flavorIndex}-${modelIndex}`, run);
        }
      }
    });

    const completed = agentRuns.filter(run => run.finished_at !== null || run.failed_at !== null).length;

    return {
      flavors: flavorsArray,
      models: modelsArray,
      agentRunMap: runMap,
      completedCount: completed,
      totalCount: totalRuns,
    };
  }, [project, agentRuns]);

  const getAgentRun = (rowIndex: number, colIndex: number) => {
    return agentRunMap.get(`${rowIndex}-${colIndex}`);
  };

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

  const getDuration = (run: Database['public']['Tables']['agent_runs']['Row'] | undefined): string | null => {
    if (!run) return null;
    
    // If the run is still generating, use the elapsed time from state
    if (!run.finished_at && !run.failed_at && run.created_at) {
      const elapsed = elapsedTimes.get(run.id);
      if (elapsed !== undefined) {
        return `${elapsed.toFixed(1)}s`;
      }
      // If not in state yet, return null (will show once state is updated)
      return null;
    }
    
    // If the run is finished, calculate the final duration
    const startTime = run.created_at ? new Date(run.created_at).getTime() : null;
    const endTime = run.finished_at 
      ? new Date(run.finished_at).getTime() 
      : run.failed_at 
        ? new Date(run.failed_at).getTime() 
        : null;
    
    if (!startTime || !endTime) return null;
    
    const durationSeconds = (endTime - startTime) / 1000;
    return `${durationSeconds.toFixed(1)}s`;
  };

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

      {/* Progress Display */}
      <div className="flex justify-center mb-6">
        <div className="text-lg font-medium">
          {completedCount} / {totalCount}
        </div>
      </div>

      {/* Matrix Table */}
      {project && flavors.length > 0 && models.length > 0 && (
        <div className="flex-1 flex justify-center items-start overflow-auto">
          <div className="inline-block">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="w-40 p-2 border border-border"></th>
                  {models.map((modelKey) => {
                    const model = MODEL_OPTIONS[modelKey];
                    return (
                      <th key={modelKey} className="w-[320px] p-2 border border-border text-center">
                        <div className="flex flex-col items-center gap-2">
                          {model.logoSrc && (
                            <Image 
                              src={model.logoSrc} 
                              alt={model.label}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          )}
                          <span className="text-sm font-medium">{model.label}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {flavors.map((flavor, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="p-4 border border-border text-sm font-medium align-top">
                      {flavor}
                    </td>
                    {models.map((modelKey, colIndex) => {
                      const agentRun = getAgentRun(rowIndex, colIndex);
                      const agentNumber = agentRun?.order ?? (rowIndex * models.length + colIndex + 1);
                      const isFailed = agentRun?.failed_at !== null;
                      const isFinished = agentRun?.finished_at !== null;
                      const duration = getDuration(agentRun);
                      
                      // Determine state and styling
                      let stateClass = '';
                      let displayText = '';
                      let showSpinner = false;
                      
                      if (isFailed) {
                        stateClass = 'bg-red-100 dark:bg-red-950/30';
                        displayText = `Agent ${agentNumber} failed`;
                      } else if (isFinished) {
                        stateClass = 'bg-green-100 dark:bg-green-950/30';
                        displayText = `Agent ${agentNumber} finished`;
                      } else {
                        stateClass = 'bg-gray-100 dark:bg-gray-800/30';
                        displayText = `Agent ${agentNumber}`;
                        showSpinner = true;
                      }
                      
                      return (
                        <td 
                          key={`${rowIndex}-${colIndex}`}
                          className="w-[320px] p-2 border border-border"
                        >
                          <div 
                            className="relative w-full"
                            style={{ aspectRatio: '16/9' }}
                          >
                            <div className={`absolute inset-0 flex items-center justify-center border border-border rounded ${stateClass}`}>
                              {showSpinner ? (
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-sm font-medium">{displayText}</span>
                                  <Spinner className="size-4" />
                                  {duration && (
                                    <span className="text-sm text-muted-foreground">{duration}</span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-sm font-medium">{displayText}</span>
                                  {duration && (
                                    <span className="text-sm text-muted-foreground">{duration}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
