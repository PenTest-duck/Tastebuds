"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { ArrowLeft, Camera, Copy, Send } from "lucide-react";
import { createTwoFilesPatch } from "diff";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type AgentRun = Database["public"]["Tables"]["agent_runs"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  isLoading?: boolean;
  diff?: string;
};

function createMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

export default function PrototypePage() {
  const { projectId, agentRunId } = useParams();
  const supabase = useMemo(() => createClient(), []);

  const [project, setProject] = useState<Project | null>(null);
  const [agentRun, setAgentRun] = useState<AgentRun | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [prototypeHtml, setPrototypeHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const blobUrlRef = useRef<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const hasSeededInitialMessageRef = useRef(false);

  const projectIdValue = useMemo(() => {
    if (typeof projectId === "string") return projectId;
    if (Array.isArray(projectId) && projectId.length > 0) return projectId[0];
    return "";
  }, [projectId]);

  const agentRunIdValue = useMemo(() => {
    if (typeof agentRunId === "string") return agentRunId;
    if (Array.isArray(agentRunId) && agentRunId.length > 0) return agentRunId[0];
    return "";
  }, [agentRunId]);

  useEffect(() => {
    let isMounted = true;

    const loadPrototype = async () => {
      if (!projectIdValue || !agentRunIdValue) {
        setError("Prototype reference is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", projectIdValue)
          .single();

        if (projectError) {
          throw new Error(projectError.message ?? "Failed to load project");
        }

        const { data: runData, error: runError } = await supabase
          .from("agent_runs")
          .select("*")
          .eq("id", agentRunIdValue)
          .eq("project_id", projectIdValue)
          .single();

        if (runError) {
          throw new Error(runError.message ?? "Failed to load agent run");
        }

        if (!runData.finished_at || runData.failed_at) {
          throw new Error("This agent run is not available for editing yet.");
        }

        const storagePath = `${runData.owner_id}/${runData.project_id}/${runData.id}/index.html`;
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("projects")
          .createSignedUrl(storagePath, 60 * 60);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error("Unable to generate preview link for this prototype.");
        }

        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch prototype HTML content.");
        }

        const htmlContent = await response.text();
        const blob = new Blob([htmlContent], { type: "text/html" });
        const blobUrl = URL.createObjectURL(blob);

        if (!isMounted) {
          URL.revokeObjectURL(blobUrl);
          return;
        }

        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        blobUrlRef.current = blobUrl;
        setProject(projectData);
        setAgentRun(runData);
        setPrototypeHtml(htmlContent);
        setIframeUrl(blobUrl);

        if (!hasSeededInitialMessageRef.current) {
          const promptText = projectData?.prompt?.trim();
          setMessages([
            {
              id: createMessageId(),
              role: "system",
              content: promptText,
            },
          ]);
          hasSeededInitialMessageRef.current = true;
        }
      } catch (fetchError) {
        console.error("Failed to load prototype workspace", fetchError);
        if (isMounted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load prototype."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPrototype();

    return () => {
      isMounted = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [agentRunIdValue, projectIdValue, reloadKey, supabase]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const takeScreenshot = useCallback(async (htmlContent: string): Promise<Blob> => {
    const tempIframe = document.createElement("iframe");
    tempIframe.style.position = "fixed";
    tempIframe.style.left = "-9999px";
    tempIframe.style.width = "1920px";
    tempIframe.style.opacity = "0";
    document.body.appendChild(tempIframe);

    try {
      const canvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
        tempIframe.onload = async () => {
          try {
            await new Promise((res) => setTimeout(res, 500));

            const iframeDoc = tempIframe.contentDocument || tempIframe.contentWindow?.document;
            if (!iframeDoc) {
              throw new Error("Cannot access iframe document");
            }

            const bodyElement = iframeDoc.body;
            if (!bodyElement) {
              throw new Error("Cannot access iframe body");
            }

            const fullHeight = Math.max(
              bodyElement.scrollHeight,
              bodyElement.offsetHeight,
              iframeDoc.documentElement.scrollHeight,
              iframeDoc.documentElement.offsetHeight,
              iframeDoc.documentElement.clientHeight
            );

            tempIframe.style.height = `${fullHeight}px`;
            await new Promise((res) => setTimeout(res, 200));

            const canvasResult = await html2canvas(bodyElement, {
              width: tempIframe.offsetWidth,
              height: fullHeight,
              useCORS: true,
              allowTaint: true,
              backgroundColor: "#ffffff",
            });

            resolve(canvasResult);
          } catch (error) {
            reject(error);
          }
        };

        tempIframe.contentDocument?.open();
        tempIframe.contentDocument?.write(htmlContent);
        tempIframe.contentDocument?.close();
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blobResult) => {
          if (!blobResult) {
            reject(new Error("Failed to create image blob"));
            return;
          }
          resolve(blobResult);
        }, "image/png");
      });

      return blob;
    } finally {
      document.body.removeChild(tempIframe);
    }
  }, []);

  const handleCopyScreenshot = useCallback(async () => {
    if (!prototypeHtml) {
      toast.error("Prototype preview is still loading.");
      return;
    }

    try {
      const blob = await takeScreenshot(prototypeHtml);
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      toast.success("Screenshot copied to clipboard!");
    } catch (exportError) {
      console.error("Failed to copy screenshot", exportError);
      toast.error("Failed to copy screenshot");
    }
  }, [prototypeHtml, takeScreenshot]);

  const handleCopyCode = useCallback(async () => {
    if (!prototypeHtml) {
      toast.error("Prototype preview is still loading.");
      return;
    }

    try {
      await navigator.clipboard.writeText(prototypeHtml);
      toast.success("Code copied to clipboard!");
    } catch (copyError) {
      console.error("Failed to copy code", copyError);
      toast.error("Failed to copy code");
    }
  }, [prototypeHtml]);

  const handleContinueInLovable = useCallback(() => {
    if (!prototypeHtml) {
      toast.error("Prototype preview is still loading.");
      return;
    }
    // TODO: Implement Lovable integration
    toast.info("Continue in Lovable - Coming soon");
  }, [prototypeHtml]);

  const handleContinueInCursor = useCallback(() => {
    if (!prototypeHtml) {
      toast.error("Prototype preview is still loading.");
      return;
    }
    // TODO: Implement Cursor integration
    toast.info("Continue in Cursor - Coming soon");
  }, [prototypeHtml]);

  const submitMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !projectIdValue || !agentRunIdValue) return;

    const userMessageId = createMessageId();
    const loadingMessageId = createMessageId();

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        content: trimmed,
      },
    ]);

    // Add loading message
    setMessages((prev) => [
      ...prev,
      {
        id: loadingMessageId,
        role: "assistant",
        content: "",
        isLoading: true,
      },
    ]);

    setInputValue("");

    try {
      // Build messages array for the API (excluding loading messages and system messages)
      const apiMessages: Array<{ role: string; content: string }> = messages
        .filter((msg) => !msg.isLoading && msg.role !== "system")
        .map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        }));

      // Add the new user message
      apiMessages.push({
        role: "user",
        content: trimmed,
      });

      // Call the edit API
      const response = await fetch("/api/projects/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          projectId: projectIdValue,
          agentRunId: agentRunIdValue,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to apply edit");
      }

      const data = await response.json();

      if (!data.success || !data.editedCode || !data.originalCode) {
        throw new Error("Invalid response from server");
      }

      // Extract HTML from edited code (might be wrapped in markdown)
      let editedHtml = data.editedCode.trim();
      const htmlMatch = editedHtml.match(/```(?:html)?\s*([\s\S]*?)\s*```/) || editedHtml.match(/(<[\s\S]*>)/);
      if (htmlMatch) {
        editedHtml = htmlMatch[1];
      }

      // Generate diff
      const targetFile = "index.html";
      const diff = createTwoFilesPatch(
        targetFile,
        targetFile,
        data.originalCode,
        editedHtml,
        "",
        ""
      );

      // Update the prototype HTML and iframe
      setPrototypeHtml(editedHtml);
      const blob = new Blob([editedHtml], { type: "text/html" });
      
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      const newBlobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = newBlobUrl;
      setIframeUrl(newBlobUrl);

      // Update loading message with diff
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessageId
            ? {
                ...msg,
                isLoading: false,
                content: "Changes applied successfully!",
                diff,
              }
            : msg
        )
      );

      toast.success("Edit applied successfully!");
    } catch (error) {
      console.error("Failed to apply edit:", error);
      
      // Remove loading message and show error
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== loadingMessageId);
        filtered.push({
          id: createMessageId(),
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to apply edit"}`,
        });
        return filtered;
      });

      toast.error(error instanceof Error ? error.message : "Failed to apply edit");
    }
  }, [inputValue, messages, projectIdValue, agentRunIdValue]);

  const handleSubmitMessage = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitMessage();
    },
    [submitMessage]
  );

  const handleChangeInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitMessage();
      }
    },
    [submitMessage]
  );

  const isPrototypeReady = Boolean(iframeUrl);
  const isRunFailed = Boolean(agentRun?.failed_at);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Back Navigation - positioned below logo */}
      <div className="absolute top-28 left-6 z-10">
        <Link
          href={`/projects/${projectIdValue}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to project
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="flex flex-1 gap-6 overflow-hidden px-6 pb-6 pt-24">
        {/* Left Sidebar: Chat */}
        <div className="flex w-96 flex-shrink-0 flex-col gap-4 overflow-hidden pt-20">
          {/* Chat Section */}
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-background shadow-sm">
            <div className="flex-shrink-0 border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Make tweaks</h2>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
              <div
                ref={chatScrollRef}
                className="min-h-0 flex-1 overflow-y-auto pr-1"
              >
                <div className="flex flex-col gap-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : message.isLoading
                            ? "bg-muted text-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center gap-2">
                            <Spinner className="size-4" />
                            <span className="text-muted-foreground">Applying changes...</span>
                          </div>
                        ) : (
                          <>
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            {message.diff && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                  View changes
                                </summary>
                                <pre className="mt-2 max-h-60 overflow-auto rounded bg-background p-2 text-xs">
                                  <code>{message.diff}</code>
                                </pre>
                              </details>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Loading conversation…
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmitMessage} className="flex flex-shrink-0 flex-col gap-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Describe the tweak you'd like to see..."
                    value={inputValue}
                    onChange={handleChangeInput}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    className="resize-none flex-1"
                  />
                  <Button type="submit" disabled={!inputValue.trim()} size="icon">
                    <Send className="size-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Side: Large Iframe */}
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-background shadow-sm overflow-hidden">
          <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {agentRun ? `Agent ${agentRun.order ?? ""}` : "Prototype"}
              </p>
              <p className="text-xs text-muted-foreground">
                {agentRun?.flavor ? `Flavor: ${agentRun.flavor}` : "Selected prototype"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleCopyScreenshot} variant="outline" size="icon">
                <Camera className="size-4" />
              </Button>
              <Button onClick={handleCopyCode} variant="outline" size="icon">
                <Copy className="size-4" />
              </Button>
              <Button onClick={handleContinueInLovable} variant="outline" size="icon">
                <Image src="/lovable.svg" alt="Lovable" width={16} height={16} />
              </Button>
              <Button onClick={handleContinueInCursor} variant="outline" size="icon">
                <Image src="/cursor.png" alt="Cursor" width={16} height={16} />
              </Button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            {loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <Spinner className="size-6" />
              </div>
            ) : error ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                <p>{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    hasSeededInitialMessageRef.current = false;
                    setMessages([]);
                    setPrototypeHtml(null);
                    setIframeUrl(null);
                    setAgentRun(null);
                    setProject(null);
                    setLoading(true);
                    setError(null);
                    setReloadKey((prev) => prev + 1);
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : isRunFailed ? (
              <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                This agent run failed to generate a prototype.
              </div>
            ) : isPrototypeReady ? (
              <iframe
                src={iframeUrl ?? undefined}
                title="Prototype preview"
                className="h-full w-full rounded-lg border bg-white"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                Prototype preview unavailable.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}