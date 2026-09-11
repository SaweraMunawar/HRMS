import type { LucideIcon } from "lucide-react";

// Requirement 8.1: har data wali screen pe "khali" state bhi designed ho
export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
      <Icon className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
