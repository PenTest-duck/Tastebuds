import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load projects", error);
    throw new Error("Unable to load projects");
  }

  const projectList = projects ?? [];
  const projectCount = projectList.length;
  const projectCountLabel = projectCount === 1 ? "project" : "projects";

  return (
    <div className="px-12 pt-28 pb-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Workspace
          </p>
          <div>
            <h1 className="text-4xl font-semibold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Browse every prompt you&apos;ve spun up and dive back in.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground/80 shadow-sm">
            {projectCount} {projectCountLabel}
          </div>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-br from-pink-400 via-red-400 to-orange-300"
          >
            <Link href="/">Start a new project</Link>
          </Button>
        </div>
      </div>

      {projectCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/70 bg-muted/40 px-8 py-16 text-center shadow-inner">
          <p className="text-lg font-semibold text-foreground">
            No projects yet
          </p>
          <p className="max-w-lg text-sm text-muted-foreground">
            Spin up your first batch of vibe-coding agents to see them listed
            here.
          </p>
          <Button asChild size="lg">
            <Link href="/">Create your first project</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {projectList.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
