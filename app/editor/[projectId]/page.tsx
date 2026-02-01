"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EditorLayout } from "@/components/editor/editor-layout";
import { AssetManager } from "@/components/editor/asset-manager";
import { SlidePreview } from "@/components/editor/slide-preview";
import { TemplatePanel } from "@/components/editor/template-panel";
import { SettingsDialog } from "@/components/editor/settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Project, Template, Asset, Export } from "@/types/project";

// Dynamically import Terminal to avoid SSR issues with xterm.js
const Terminal = dynamic(
  () => import("@/components/editor/terminal").then((mod) => mod.Terminal),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#0a0a0a] rounded-lg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// Default built-in templates for development
const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "corporate",
    name: "Corporate Blue",
    category: "business",
    previewImage: null,
    designSystem: {
      colors: {
        primary: "#1e40af",
        secondary: "#3b82f6",
        accent: "#fbbf24",
        background: "#ffffff",
        text: "#1f2937",
      },
      typography: {
        headingFont: "Inter",
        bodyFont: "Inter",
        sizes: { title: 44, heading: 32, subheading: 24, body: 18, caption: 14 },
        weights: { regular: 400, medium: 500, bold: 700 },
      },
      layout: {
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
        slideWidth: 1920,
        slideHeight: 1080,
      },
    },
    styleReference: null,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "creative",
    name: "Creative",
    category: "creative",
    previewImage: null,
    designSystem: {
      colors: {
        primary: "#8b5cf6",
        secondary: "#ec4899",
        accent: "#14b8a6",
        background: "#fafaf9",
        text: "#292524",
      },
      typography: {
        headingFont: "Poppins",
        bodyFont: "Open Sans",
        sizes: { title: 48, heading: 36, subheading: 24, body: 16, caption: 12 },
        weights: { regular: 400, medium: 500, bold: 700 },
      },
      layout: {
        margins: { top: 48, right: 48, bottom: 48, left: 48 },
        slideWidth: 1920,
        slideHeight: 1080,
      },
    },
    styleReference: null,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "minimal",
    name: "Minimal",
    category: "minimal",
    previewImage: null,
    designSystem: {
      colors: {
        primary: "#18181b",
        secondary: "#71717a",
        accent: "#dc2626",
        background: "#ffffff",
        text: "#09090b",
      },
      typography: {
        headingFont: "IBM Plex Sans",
        bodyFont: "IBM Plex Sans",
        sizes: { title: 42, heading: 30, subheading: 22, body: 16, caption: 13 },
        weights: { regular: 400, medium: 500, bold: 600 },
      },
      layout: {
        margins: { top: 56, right: 56, bottom: 56, left: 56 },
        slideWidth: 1920,
        slideHeight: 1080,
      },
    },
    styleReference: null,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "pitch-deck",
    name: "Pitch Deck",
    category: "business",
    previewImage: null,
    designSystem: {
      colors: {
        primary: "#0f172a",
        secondary: "#0ea5e9",
        accent: "#22c55e",
        background: "#f8fafc",
        text: "#0f172a",
      },
      typography: {
        headingFont: "Montserrat",
        bodyFont: "Source Sans Pro",
        sizes: { title: 52, heading: 38, subheading: 26, body: 18, caption: 14 },
        weights: { regular: 400, medium: 500, bold: 700 },
      },
      layout: {
        margins: { top: 44, right: 44, bottom: 44, left: 44 },
        slideWidth: 1920,
        slideHeight: 1080,
      },
    },
    styleReference: null,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "data-heavy",
    name: "Data Presentation",
    category: "data",
    previewImage: null,
    designSystem: {
      colors: {
        primary: "#0369a1",
        secondary: "#0891b2",
        accent: "#f97316",
        background: "#f0f9ff",
        text: "#0c4a6e",
      },
      typography: {
        headingFont: "Roboto",
        bodyFont: "Roboto",
        sizes: { title: 40, heading: 28, subheading: 20, body: 16, caption: 12 },
        weights: { regular: 400, medium: 500, bold: 700 },
      },
      layout: {
        margins: { top: 36, right: 36, bottom: 36, left: 36 },
        slideWidth: 1920,
        slideHeight: 1080,
      },
    },
    styleReference: null,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [slides, setSlides] = useState<{ slideNumber: number; thumbnailPath: string }[]>([]);
  const [latestExport, setLatestExport] = useState<Export | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Refs for mounted state and intervals (vibe-motion pattern)
  const mountedRef = useRef(true);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Callback for manual refresh
  const handleRefresh = useCallback(async () => {
    toast.info("Scanning for presentations...");
    try {
      // Scan for exports
      const scanResponse = await fetch(`/api/projects/${projectId}/scan`, {
        method: "POST",
      });
      const scanData = await scanResponse.json();
      if (scanData.success && scanData.data?.exports?.length > 0) {
        setLatestExport(scanData.data.exports[0]);
      }

      // Fetch slides
      const previewResponse = await fetch(`/api/projects/${projectId}/preview`);
      const previewData = await previewResponse.json();
      if (previewData.success && previewData.data) {
        setSlides(previewData.data);
      }

      toast.success("Scan complete");
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.error("Refresh failed");
    }
  }, [projectId]);

  const handleDownload = useCallback(() => {
    window.open(`/api/projects/${projectId}/download`, "_blank");
  }, [projectId]);

  // Refresh assets after upload
  const handleAssetsChange = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      if (data.success) {
        setAssets(data.data.assets || []);
      }
    } catch (error) {
      console.error("Error refreshing assets:", error);
    }
  }, [projectId]);

  // Initial data fetch and polling - vibe-motion pattern (functions defined inside useEffect)
  useEffect(() => {
    let mounted = true;

    async function fetchProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        const data = await response.json();
        if (!mounted) return;

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch project");
        }
        setProject(data.data);
        setAssets(data.data.assets || []);
      } catch (error) {
        console.error("Error fetching project:", error);
        if (mounted) {
          toast.error("Failed to load project");
          router.push("/dashboard");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    async function fetchTemplates() {
      try {
        const response = await fetch("/api/templates");
        const data = await response.json();
        if (!mounted) return;

        if (data.success && data.data) {
          const parsedTemplates = data.data.map((t: Template & { designSystem: string }) => ({
            ...t,
            designSystem:
              typeof t.designSystem === "string"
                ? JSON.parse(t.designSystem)
                : t.designSystem,
          }));
          setTemplates(parsedTemplates);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    }

    async function fetchSlidesAndExports() {
      try {
        // Scan for exports
        const scanResponse = await fetch(`/api/projects/${projectId}/scan`, {
          method: "POST",
        });
        const scanData = await scanResponse.json();
        if (!mounted) return;

        if (scanData.success && scanData.data?.exports?.length > 0) {
          setLatestExport(scanData.data.exports[0]);
        }

        // Fetch slides
        const previewResponse = await fetch(`/api/projects/${projectId}/preview`);
        const previewData = await previewResponse.json();
        if (!mounted) return;

        if (previewData.success && previewData.data) {
          setSlides(previewData.data);
        }
      } catch (error) {
        console.error("Error fetching slides/exports:", error);
      }
    }

    // Initial fetches
    fetchProject();
    fetchTemplates();
    fetchSlidesAndExports();

    // Poll for new exports every 15 seconds
    scanIntervalRef.current = setInterval(() => {
      if (mounted) {
        fetchSlidesAndExports();
      }
    }, 15000);

    return () => {
      mounted = false;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [projectId, router]);

  // Convert to useCallback for proper memoization
  const handleTemplateSelect = useCallback(async (template: Template) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to apply template");
      }

      setProject(data.data);
      toast.success(`Applied "${template.name}" template`);
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("Failed to apply template");
    }
  }, [projectId]);

  // Memoize panels to prevent remounting on state changes (vibe-motion pattern)
  // Terminal is critical - only depends on projectId, never remounts on other state changes
  const terminalPanel = useMemo(
    () => <Terminal projectId={projectId} />,
    [projectId]
  );

  const assetPanel = useMemo(
    () => (
      <AssetManager
        projectId={projectId}
        assets={assets}
        onAssetsChange={handleAssetsChange}
      />
    ),
    [projectId, assets, handleAssetsChange]
  );

  const previewPanel = useMemo(
    () => (
      <SlidePreview
        slides={slides}
        latestExport={latestExport}
        onRefresh={handleRefresh}
        onDownload={handleDownload}
      />
    ),
    [slides, latestExport, handleRefresh, handleDownload]
  );

  const templatePanel = useMemo(
    () => (
      <TemplatePanel
        templates={templates}
        selectedTemplateId={project?.templateId}
        onSelect={handleTemplateSelect}
      />
    ),
    [templates, project?.templateId, handleTemplateSelect]
  );

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Editor Header */}
      <header className="h-12 border-b px-4 flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-medium">{project.name}</h1>
            {project.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{project.aspectRatio}</span>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Editor Content */}
      <main className="flex-1 overflow-hidden">
        <EditorLayout
          assetPanel={assetPanel}
          previewPanel={previewPanel}
          templatePanel={templatePanel}
          terminalPanel={terminalPanel}
        />
      </main>

      {/* Settings Dialog */}
      <SettingsDialog
        project={project}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onProjectUpdate={setProject}
      />
    </div>
  );
}
