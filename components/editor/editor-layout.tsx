"use client";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface EditorLayoutProps {
  assetPanel: React.ReactNode;
  previewPanel: React.ReactNode;
  templatePanel: React.ReactNode;
  terminalPanel: React.ReactNode;
}

export function EditorLayout({
  assetPanel,
  previewPanel,
  templatePanel,
  terminalPanel,
}: EditorLayoutProps) {
  return (
    <div className="h-full w-full overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - Assets */}
        <ResizablePanel
          defaultSize={20}
          minSize={15}
          maxSize={35}
          className="bg-background"
        >
          <div className="h-full overflow-hidden">{assetPanel}</div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center - Preview and Terminal */}
        <ResizablePanel defaultSize={55} minSize={30}>
          <ResizablePanelGroup direction="vertical" className="h-full">
            {/* Preview Panel */}
            <ResizablePanel defaultSize={60} minSize={30} className="bg-background">
              <div className="h-full overflow-hidden">{previewPanel}</div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Terminal Panel */}
            <ResizablePanel defaultSize={40} minSize={20} className="bg-background">
              <div className="h-full overflow-hidden">{terminalPanel}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Templates */}
        <ResizablePanel
          defaultSize={25}
          minSize={15}
          maxSize={35}
          className="bg-background"
        >
          <div className="h-full overflow-hidden">{templatePanel}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
