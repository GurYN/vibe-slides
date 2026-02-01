"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Folder, Trash2, Pencil, Copy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project & {
    template?: { name: string } | null;
    _count?: { assets: number; exports: number };
  };
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
      onDelete(project.id);
    }
  };

  return (
    <Link href={`/editor/${project.id}`}>
      <Card className="group h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Folder className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base truncate">
                  {project.name}
                </CardTitle>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {project.description && (
            <CardDescription className="line-clamp-2 mt-2">
              {project.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 flex-wrap">
            {project.template && (
              <Badge variant="secondary" className="text-xs">
                {project.template.name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {project.aspectRatio}
            </Badge>
            {project._count && project._count.assets > 0 && (
              <Badge variant="outline" className="text-xs">
                {project._count.assets} assets
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Updated{" "}
            {formatDistanceToNow(new Date(project.updatedAt), {
              addSuffix: true,
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
