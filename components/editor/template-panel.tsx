"use client";

import { useState } from "react";
import { Palette, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Template, DesignSystem } from "@/types/project";

interface TemplatePanelProps {
  templates: Template[];
  selectedTemplateId?: string | null;
  onSelect: (template: Template) => void;
  isLoading?: boolean;
}

export function TemplatePanel({
  templates,
  selectedTemplateId,
  onSelect,
  isLoading,
}: TemplatePanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    "all",
    ...new Set(templates.map((t) => t.category)),
  ];

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch = template.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-3">
        <h2 className="font-semibold text-sm">Templates</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-8 h-8 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-2 py-0.5 text-xs rounded-full transition-colors capitalize",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="flex-1 overflow-auto p-3">
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Palette className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">No templates found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                onSelect={() => onSelect(template)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // Parse design system if it's a string
  const designSystem: DesignSystem | null =
    typeof template.designSystem === "string"
      ? JSON.parse(template.designSystem)
      : template.designSystem;

  const colors = designSystem?.colors;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-all",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "hover:border-muted-foreground/30 hover:bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium text-sm">{template.name}</h3>
          <Badge variant="outline" className="text-[10px] mt-1">
            {template.category}
          </Badge>
        </div>
        {isSelected && (
          <div className="rounded-full bg-primary p-1">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Color Preview */}
      {colors && (
        <div className="flex gap-1 mt-2">
          {Object.entries(colors).slice(0, 5).map(([name, color]) => (
            <div
              key={name}
              className="h-5 w-5 rounded-full border border-white/20 shadow-sm"
              style={{ backgroundColor: color }}
              title={name}
            />
          ))}
        </div>
      )}

      {/* Typography Preview */}
      {designSystem?.typography && (
        <p className="text-[10px] text-muted-foreground mt-2">
          {designSystem.typography.headingFont} / {designSystem.typography.bodyFont}
        </p>
      )}
    </button>
  );
}
