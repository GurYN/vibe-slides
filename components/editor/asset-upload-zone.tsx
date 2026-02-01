"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AssetUploadZoneProps {
  projectId: string;
  onUploadComplete?: () => void;
  className?: string;
}

interface UploadingFile {
  id: string;
  name: string;
  status: "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

const ACCEPTED_TYPES = {
  "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
  "font/*": [".ttf", ".otf", ".woff", ".woff2"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
};

export function AssetUploadZone({
  projectId,
  onUploadComplete,
  className,
}: AssetUploadZoneProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const uploadFile = useCallback(async (file: File): Promise<void> => {
    const fileId = `${file.name}-${Date.now()}`;

    setUploadingFiles((prev) => [
      ...prev,
      { id: fileId, name: file.name, status: "uploading", progress: 0 },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: "success", progress: 100 } : f
        )
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: "error", error: errorMessage }
            : f
        )
      );

      toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
    }
  }, [projectId]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      await Promise.all(acceptedFiles.map(uploadFile));
      onUploadComplete?.();

      // Clear successful uploads after a delay
      setTimeout(() => {
        setUploadingFiles((prev) =>
          prev.filter((f) => f.status === "error")
        );
      }, 2000);
    },
    [uploadFile, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxSize: 50 * 1024 * 1024, // 50MB
      multiple: true,
    });

  const clearCompletedUploads = () => {
    setUploadingFiles((prev) => prev.filter((f) => f.status === "uploading"));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "rounded-full p-3",
              isDragActive && !isDragReject
                ? "bg-primary/10 text-primary"
                : isDragReject
                ? "bg-destructive/10 text-destructive"
                : "bg-muted"
            )}
          >
            <Upload className="h-5 w-5" />
          </div>
          {isDragActive ? (
            isDragReject ? (
              <p className="text-sm text-destructive">
                Some files are not allowed
              </p>
            ) : (
              <p className="text-sm text-primary font-medium">
                Drop files here
              </p>
            )
          ) : (
            <>
              <p className="text-sm font-medium">
                Drag & drop files here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Images, fonts, PDFs up to 50MB
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Uploads</span>
            {uploadingFiles.some((f) => f.status !== "uploading") && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={clearCompletedUploads}
              >
                Clear
              </Button>
            )}
          </div>
          <div className="space-y-1.5 max-h-32 overflow-auto">
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5"
              >
                {file.status === "uploading" && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                )}
                {file.status === "success" && (
                  <Check className="h-3 w-3 text-green-500" />
                )}
                {file.status === "error" && (
                  <AlertCircle className="h-3 w-3 text-destructive" />
                )}
                <span className="flex-1 truncate">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
