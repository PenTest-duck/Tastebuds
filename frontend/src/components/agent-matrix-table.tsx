"use client";

import { Database } from "@/lib/supabase/database.types";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MODELS } from "@/components/dimensions-input/modelOptions";
import type { ModelKey } from "@/components/dimensions-input/modelOptions";
import { AgentMatrixCell } from "./agent-matrix-cell";

interface AgentMatrixTableProps {
  flavors: string[];
  models: ModelKey[];
  agentRunMap: Map<string, Database["public"]["Tables"]["agent_runs"]["Row"]>;
  showIframes: boolean;
  blobUrls: Map<string, string>;
  fullscreenRunId: string | null;
  setFullscreenRunId: (id: string | null) => void;
  elapsedTimes: Map<string, number>;
}

export function AgentMatrixTable({
  flavors,
  models,
  agentRunMap,
  showIframes,
  blobUrls,
  fullscreenRunId,
  setFullscreenRunId,
  elapsedTimes,
}: AgentMatrixTableProps) {
  const getAgentRun = (rowIndex: number, colIndex: number) => {
    return agentRunMap.get(`${rowIndex}-${colIndex}`);
  };

  return (
    <div className="flex-1 flex justify-center items-start overflow-auto">
      <div className="inline-block">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-40 p-2 border border-border"></th>
              {models.map((modelKey) => {
                const model = MODELS[modelKey];
                return (
                  <th
                    key={modelKey}
                    className="w-[320px] p-2 border border-border text-center"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-2 cursor-default">
                          {model.providerLogoSrc && (
                            <Image
                              src={model.providerLogoSrc}
                              alt={model.provider}
                              width={32}
                              height={32}
                              className="object-contain"
                            />
                          )}
                          <span className="text-sm font-medium">
                            {model.provider}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{model.name}</p>
                      </TooltipContent>
                    </Tooltip>
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
                  const agentNumber =
                    agentRun?.order ?? rowIndex * models.length + colIndex + 1;
                  const blobUrl = agentRun?.id
                    ? blobUrls.get(agentRun.id)
                    : undefined;

                  return (
                    <AgentMatrixCell
                      key={`${rowIndex}-${colIndex}`}
                      agentRun={agentRun}
                      agentNumber={agentNumber}
                      showIframes={showIframes}
                      blobUrl={blobUrl}
                      fullscreenRunId={fullscreenRunId}
                      setFullscreenRunId={setFullscreenRunId}
                      elapsedTimes={elapsedTimes}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
