import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Stat = {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  /** Highlight the number when it needs action, e.g. requests waiting on you */
  tone?: "default" | "attention";
};

/**
 * One instrument panel instead of four separate cards.
 * Separate cards fragment the reading; a single divided strip reads left to
 * right as one summary, which is how these numbers are actually used.
 */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 divide-y rounded-lg border bg-card sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.title}
          className={cn(
            "flex flex-col gap-1 p-4 sm:p-5",
            i > 0 && "sm:border-l",
            // second row on the 2-column breakpoint needs its own top border
            i >= 2 && "sm:border-t xl:border-t-0",
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <s.icon className="size-4 shrink-0" aria-hidden />
            <span className="text-sm">{s.title}</span>
          </div>
          <p
            className={cn(
              "text-3xl font-semibold tracking-tight tabular-nums",
              s.tone === "attention" && typeof s.value === "number" && s.value > 0 && "text-primary",
            )}
          >
            {s.value}
          </p>
          {s.hint && <p className="text-xs leading-snug text-muted-foreground">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}
