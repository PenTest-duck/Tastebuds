"use client";

import { Database } from "@/lib/supabase/database.types";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

interface AgentMatrixCellProps {
  agentRun: Database['public']['Tables']['agent_runs']['Row'] | undefined;
  agentNumber: number;
  showIframes: boolean;
  blobUrl: string | undefined;
  fullscreenRunId: string | null;
  setFullscreenRunId: (id: string | null) => void;
  elapsedTimes: Map<string, number>;
}

export function AgentMatrixCell({
  agentRun,
  agentNumber,
  showIframes,
  blobUrl,
  fullscreenRunId,
  setFullscreenRunId,
  elapsedTimes,
}: AgentMatrixCellProps) {
  const isFailed = agentRun?.failed_at !== null;
  const isFinished = agentRun?.finished_at !== null;

  const getDuration = (): string | null => {
    if (!agentRun) return null;
    
    // If the run is still generating, use the elapsed time from state
    if (!agentRun.finished_at && !agentRun.failed_at && agentRun.created_at) {
      const elapsed = elapsedTimes.get(agentRun.id);
      if (elapsed !== undefined) {
        return `${elapsed.toFixed(1)}s`;
      }
      return null;
    }
    
    // If the run is finished, calculate the final duration
    const startTime = agentRun.created_at ? new Date(agentRun.created_at).getTime() : null;
    const endTime = agentRun.finished_at 
      ? new Date(agentRun.finished_at).getTime() 
      : agentRun.failed_at 
        ? new Date(agentRun.failed_at).getTime() 
        : null;
    
    if (!startTime || !endTime) return null;
    
    const durationSeconds = (endTime - startTime) / 1000;
    return `${durationSeconds.toFixed(1)}s`;
  };

  const duration = getDuration();

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
  
  // Show iframe for finished cells when toggle is enabled and blob URL is available
  const showIframe = showIframes && isFinished && blobUrl && !isFailed;

  return (
    <td className="w-[320px] p-2 border border-border">
      <div 
        className="relative w-full"
        style={{ aspectRatio: '16/9' }}
      >
        {showIframe ? (
          <div className="absolute inset-0 border border-border rounded overflow-hidden">
            <iframe
              src={blobUrl}
              title={`Agent ${agentNumber} preview`}
              className="h-full w-full"
              allowFullScreen
            />
            <Dialog open={fullscreenRunId === agentRun?.id} onOpenChange={(open) => setFullscreenRunId(open ? agentRun?.id ?? null : null)}>
              <Button
                variant="secondary"
                size="icon-sm"
                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenRunId(agentRun?.id ?? null);
                }}
              >
                <Maximize2 className="size-4" />
                <span className="sr-only">Fullscreen</span>
              </Button>
              <DialogContent className="max-h-[80vh] max-w-[calc(80vw)] sm:max-w-[calc(80vw)] aspect-[16/9] !flex !flex-col">
                <DialogTitle className="shrink-0">
                  Agent {agentNumber}
                </DialogTitle>
                <div className="flex-1 min-h-0 overflow-hidden rounded-md border">
                    <iframe
                    src={blobUrl}
                    title={`Agent ${agentNumber} preview`}
                    className="h-full w-full"
                    allowFullScreen
                    />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
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
        )}
      </div>
    </td>
  );
}

