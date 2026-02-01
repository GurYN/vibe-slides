"use client";

import { useState, useMemo } from "react";
import { Presentation, Download, RefreshCw, FileDown, Eye, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Export } from "@/types/project";

interface SlidePreviewProps {
  slides: { slideNumber: number; thumbnailPath: string }[];
  latestExport?: Export | null;
  onRefresh?: () => void;
  onDownload?: () => void;
}

export function SlidePreview({
  slides,
  latestExport,
  onRefresh,
  onDownload,
}: SlidePreviewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // Compute the effective selected slide (clamp to valid range)
  const selectedSlide = useMemo(() => {
    if (slides.length === 0) return null;
    return Math.min(selectedIndex, slides.length - 1);
  }, [selectedIndex, slides.length]);

  const hasExport = latestExport?.status === "completed";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm">Preview</h2>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onRefresh} title="Scan for presentations">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {hasExport && (
            <Button size="sm" variant="outline" onClick={onDownload}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {slides.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-6">
            {hasExport ? (
              <>
                <FileDown className="h-12 w-12 mb-3 text-green-500" />
                <p className="text-sm font-medium mb-1 text-foreground">Presentation ready!</p>
                <p className="text-xs max-w-[200px] mb-4">
                  Your presentation has been generated. Click download to get your .pptx file.
                </p>
                <Button size="sm" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Presentation
                </Button>
              </>
            ) : (
              <>
                <Presentation className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">No slides yet</p>
                <p className="text-xs max-w-[200px]">
                  Use the terminal below to generate your presentation with Claude
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Main Preview */}
            <div className="flex-1 min-h-0 p-4 flex items-center justify-center bg-muted/30 overflow-hidden">
              {selectedSlide !== null && slides[selectedSlide] && (
                <div className="relative aspect-[16/9] max-w-full max-h-full rounded-lg overflow-hidden border shadow-lg bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slides[selectedSlide].thumbnailPath}
                    alt={`Slide ${slides[selectedSlide].slideNumber}`}
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => setFullscreenOpen(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group cursor-pointer"
                  >
                    <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              )}
            </div>

            {/* Thumbnail Strip - fixed height, never shrinks */}
            <div className="h-24 shrink-0 border-t bg-muted/20 p-2 overflow-x-auto">
              <div className="flex gap-2 h-full">
                {slides.map((slide, index) => (
                  <button
                    key={slide.slideNumber}
                    onClick={() => setSelectedIndex(index)}
                    className={`relative h-full aspect-[16/9] rounded border-2 overflow-hidden flex-shrink-0 transition-all ${
                      selectedSlide === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.thumbnailPath}
                      alt={`Slide ${slide.slideNumber}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0.5 right-0.5 text-[9px] bg-black/60 text-white px-1 rounded">
                      {slide.slideNumber}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fullscreen Preview Dialog */}
      {fullscreenOpen && selectedSlide !== null && slides[selectedSlide] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreenOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setFullscreenOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Previous button */}
          {selectedSlide > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedSlide - 1);
              }}
              className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="h-8 w-8 text-white" />
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slides[selectedSlide].thumbnailPath}
            alt={`Slide ${slides[selectedSlide].slideNumber}`}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {selectedSlide < slides.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(selectedSlide + 1);
              }}
              className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronRight className="h-8 w-8 text-white" />
            </button>
          )}

          {/* Slide counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm">
            {slides[selectedSlide].slideNumber} / {slides.length}
          </div>
        </div>
      )}
    </div>
  );
}
