import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  REJECTED: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  CANCELLED: "text-muted-foreground",
};

export function LeaveStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STYLES[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}
