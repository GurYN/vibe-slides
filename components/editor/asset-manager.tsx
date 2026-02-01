"use client";

import { useState } from "react";
import {
  FolderOpen,
  Image,
  FileText,
  Type,
  Search,
  Copy,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AssetUploadZone } from "./asset-upload-zone";
import type { Asset, AssetCategory } from "@/types/project";

interface AssetManagerProps {
  projectId: string;
  assets: Asset[];
  onAssetsChange?: () => void;
}

const CATEGORIES: {
  key: AssetCategory | "all";
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "all", label: "All", icon: FolderOpen },
  { key: "images", label: "Images", icon: Image },
  { key: "fonts", label: "Fonts", icon: Type },
  { key: "references", label: "Docs", icon: FileText },
];

export function AssetManager({
  projectId,
  assets,
  onAssetsChange,
}: AssetManagerProps) {
  const [activeCategory, setActiveCategory] = useState<AssetCategory | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory =
      activeCategory === "all" || asset.category === activeCategory;
    const matchesSearch = asset.filename
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopyPath = (asset: Asset) => {
    navigator.clipboard.writeText(asset.path);
    toast.success(`Copied: ${asset.path}`);
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Delete "${asset.filename}"?`)) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/assets/${asset.id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete asset");
      }

      toast.success("Asset deleted");
      onAssetsChange?.();
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete asset"
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">Assets</h2>
          <Button
            size="sm"
            variant={showUpload ? "secondary" : "outline"}
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? "Hide Upload" : "Upload"}
          </Button>
        </div>

        {/* Upload Zone (collapsible) */}
        {showUpload && (
          <AssetUploadZone
            projectId={projectId}
            onUploadComplete={() => {
              onAssetsChange?.();
            }}
          />
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            className="pl-8 h-8 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
                activeCategory === cat.key
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <cat.icon className="h-3 w-3" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Grid */}
      <div className="flex-1 overflow-auto p-3">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <FolderOpen className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No assets yet</p>
            <p className="text-xs">Upload files to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => (
              <AssetItem
                key={asset.id}
                asset={asset}
                onCopyPath={() => handleCopyPath(asset)}
                onDelete={() => handleDelete(asset)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetItem({
  asset,
  onCopyPath,
  onDelete,
}: {
  asset: Asset;
  onCopyPath: () => void;
  onDelete: () => void;
}) {
  const isImage = asset.mimeType.startsWith("image/");

  return (
    <div className="group relative aspect-square rounded-lg border bg-muted/50 overflow-hidden">
      {isImage && asset.thumbnail ? (
        <img
          src={`/api/projects/${asset.projectId}/assets/${asset.id}/thumbnail`}
          alt={asset.filename}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          {isImage ? (
            <Image className="h-8 w-8 text-muted-foreground" />
          ) : asset.mimeType.includes("font") ? (
            <Type className="h-8 w-8 text-muted-foreground" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      )}

      {/* Filename overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
        <p className="text-[10px] text-white truncate">{asset.filename}</p>
      </div>

      {/* Actions */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onCopyPath}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy path
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
