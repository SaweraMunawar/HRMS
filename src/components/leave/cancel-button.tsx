"use client";

import { useTransition } from "react";
import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelLeaveRequest } from "@/app/(app)/leave/actions";

export function CancelButton({ requestId }: { requestId: number }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(async () => { await cancelLeaveRequest(requestId); })}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
      Cancel request
    </Button>
  );
}
