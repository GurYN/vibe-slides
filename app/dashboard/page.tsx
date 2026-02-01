"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectGrid } from "@/components/dashboard/project-grid";
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import type { Project } from "@/types/project";

type ProjectWithMeta = Project & {
  template?: { name: string } | null;
  _count?: { assets: number; exports: number };
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProjects = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch projects");
      }

      setProjects(data.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete project");
      }

      toast.success("Project deleted");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete project"
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Vibe Slides" width={40} height={40} className="rounded-lg" />
            <div>
              <h1 className="text-xl font-semibold">Vibe Slides</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered presentations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchProjects(false)}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <CreateProjectDialog onCreated={() => fetchProjects(false)} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-1">Your Projects</h2>
          <p className="text-muted-foreground">
            Create and manage your presentation projects
          </p>
        </div>

        <ProjectGrid
          projects={projects}
          isLoading={isLoading}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}
