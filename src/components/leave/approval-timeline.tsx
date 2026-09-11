import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = {
  level: number;
  decision: string;
  comment: string | null;
  decidedAt?: Date | null;
  approver: { firstName: string; lastName: string };
};

const LEVEL_LABEL: Record<number, string> = { 1: "Manager approval", 2: "Department head approval" };

// Audit trail: har step kisne, kab, kya keh kar decide kiya (Requirement 3.5)
export function ApprovalTimeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const Icon = step.decision === "APPROVED" ? CheckCircle2 : step.decision === "REJECTED" ? XCircle : Circle;
        const color =
          step.decision === "APPROVED" ? "text-emerald-600" : step.decision === "REJECTED" ? "text-red-600" : "text-muted-foreground";

        return (
          <li key={step.level} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={cn("size-5 shrink-0", color)} aria-hidden />
              {i < steps.length - 1 && <div className="w-px flex-1 bg-border" />}
            </div>
            <div className={cn("flex flex-col gap-0.5", i < steps.length - 1 && "pb-5")}>
              <p className="text-sm font-medium">
                Level {step.level} · {LEVEL_LABEL[step.level] ?? "Approval"}
              </p>
              <p className="text-sm text-muted-foreground">
                {step.approver.firstName} {step.approver.lastName}
                {step.decision === "PENDING"
                  ? " · awaiting decision"
                  : step.decidedAt
                    ? ` · ${step.decision.toLowerCase()} on ${formatDate(step.decidedAt)}`
                    : ` · ${step.decision.toLowerCase()}`}
              </p>
              {step.comment && <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">{step.comment}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
