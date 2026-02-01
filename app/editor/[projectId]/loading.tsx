import { Skeleton } from "@/components/ui/skeleton";

export default function EditorLoading() {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Assets */}
        <div className="w-64 border-r p-4">
          <Skeleton className="mb-4 h-6 w-32" />
          <Skeleton className="mb-4 h-10 w-full" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>

        {/* Center Panel - Preview */}
        <div className="flex-1 p-4">
          <Skeleton className="mb-4 h-6 w-40" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        </div>

        {/* Right Panel - Templates */}
        <div className="w-72 border-l p-4">
          <Skeleton className="mb-4 h-6 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Panel - Terminal */}
      <div className="h-64 border-t bg-black/95 p-4">
        <div className="flex items-center gap-2 text-green-400">
          <Skeleton className="h-4 w-4 bg-green-900" />
          <Skeleton className="h-4 w-48 bg-green-900" />
        </div>
      </div>
    </div>
  );
}
