"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { decideLeaveRequest } from "@/app/(app)/leave/actions";

export function DecisionButtons({ requestId, employeeName }: { requestId: number; employeeName: string }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const decide = (decision: "APPROVED" | "REJECTED") => {
    setError(null);
    startTransition(async () => {
      const result = await decideLeaveRequest({ requestId, decision, comment });
      if (!result.ok) setError(result.error);
      else setComment("");
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={`Add a comment for ${employeeName} (optional)`}
        aria-label="Decision comment"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => decide("APPROVED")} disabled={isPending} size="sm">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Approve
        </Button>
        <Button onClick={() => decide("REJECTED")} disabled={isPending} size="sm" variant="outline">
          <X className="size-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}
