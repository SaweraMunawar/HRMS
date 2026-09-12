import { cn } from "@/lib/utils";

// Colour meaning is consistent everywhere: amber waits, green passed, rose stopped.
const STYLES: Record<string, string> = {
  PENDING: "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/60 dark:text-amber-200",
  APPROVED: "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/60 dark:text-emerald-200",
  REJECTED: "border-rose-300/70 bg-rose-50 text-rose-800 dark:border-rose-700/60 dark:bg-rose-950/60 dark:text-rose-200",
  CANCELLED: "border-border bg-muted text-muted-foreground",
};

const LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function LeaveStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STYLES[status] ?? STYLES.CANCELLED,
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
