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

  // Poll for agent runs every 1 second until all agent runs have finished_at set (not null)
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
        
        // Check if all agent runs have finished_at set (not null)
        const allFinished = (data || []).every(run => run.finished_at !== null);
        return !allFinished; // Return true if we should continue polling
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

    const completed = agentRuns.filter(run => run.finished_at !== null).length;

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

  return (
    <div className="flex flex-col min-h-screen pt-24 pb-8 px-8">
      {/* Navigation */}
      <div className="flex justify-center mb-8">
        <nav className="flex gap-4 text-lg">
          <span className="font-semibold text-foreground">Agents</span>
          <span className="text-muted-foreground">|</span>
          <Link 
            href={`/projects/${projectId}/compare`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Compare
          </Link>
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
                      const isFinished = agentRun?.finished_at !== null;
                      const agentNumber = agentRun?.order ?? (rowIndex * models.length + colIndex + 1);
                      
                      return (
                        <td 
                          key={`${rowIndex}-${colIndex}`}
                          className="w-[320px] p-2 border border-border"
                        >
                          <div 
                            className="relative w-full"
                            style={{ aspectRatio: '16/9' }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center border border-border rounded bg-muted/30">
                              {isFinished ? (
                                <span className="text-sm font-medium">finished</span>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-sm font-medium">Agent {agentNumber}</span>
                                  <Spinner className="size-4" />
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
