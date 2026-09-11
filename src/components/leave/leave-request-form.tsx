"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitLeaveRequest } from "@/app/(app)/leave/actions";
import { countLeaveDays, needsEscalation } from "@/lib/leave-rules";
import { pluralDays } from "@/lib/format";
import { leaveRequestSchema, type LeaveRequestInput, type LeaveRequestValues } from "@/lib/validations/leave";

type LeaveType = { id: number; name: string; requiresEscalation: boolean; escalationThresholdDays: number };
type Balance = { leaveTypeId: number; allotted: number; used: number };

export function LeaveRequestForm({
  leaveTypes,
  balances,
  holidays,
  today,
}: {
  leaveTypes: LeaveType[];
  balances: Balance[];
  holidays: string[];
  today: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeaveRequestInput, unknown, LeaveRequestValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: { leaveTypeId: "", startDate: "", endDate: "", reason: "" },
  });

  const typeId = watch("leaveTypeId");
  const start = watch("startDate");
  const end = watch("endDate");
  const selectedType = leaveTypes.find((t) => String(t.id) === String(typeId));
  const balance = balances.find((b) => b.leaveTypeId === selectedType?.id);
  const remaining = balance ? balance.allotted - balance.used : 0;

  // Live preview: din aur escalation ka hisaab wahi rules se jo server use karta hai
  const preview = (() => {
    if (!start || !end) return null;
    const s = new Date(start + "T00:00:00Z");
    const e = new Date(end + "T00:00:00Z");
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return null;
    const days = countLeaveDays(s, e, holidays.map((h) => new Date(h + "T00:00:00Z")));
    return { days, escalates: selectedType ? needsEscalation(days, selectedType) : false };
  })();

  const onSubmit = (values: LeaveRequestValues) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitLeaveRequest({
        leaveTypeId: String(values.leaveTypeId),
        startDate: values.startDate.toISOString().slice(0, 10),
        endDate: values.endDate.toISOString().slice(0, 10),
        reason: values.reason,
      });
      if (result && !result.ok) setServerError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="leaveTypeId">Leave type</Label>
        <Select onValueChange={(v) => setValue("leaveTypeId", v, { shouldValidate: true })}>
          <SelectTrigger id="leaveTypeId" className="w-full" aria-invalid={!!errors.leaveTypeId}>
            <SelectValue placeholder="Select a leave type" />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes.map((t) => {
              const b = balances.find((x) => x.leaveTypeId === t.id);
              const left = b ? b.allotted - b.used : 0;
              return (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name} — {left} left
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {errors.leaveTypeId && <p className="text-sm text-destructive">{errors.leaveTypeId.message}</p>}
        {selectedType && (
          <p className="text-xs text-muted-foreground">
            {remaining} day(s) remaining this year.
            {selectedType.requiresEscalation
              ? " Always needs department head approval."
              : " More than " + selectedType.escalationThresholdDays + " day(s) goes to the department head."}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" type="date" min={today} aria-invalid={!!errors.startDate} {...register("startDate")} />
          {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" type="date" min={start || today} aria-invalid={!!errors.endDate} {...register("endDate")} />
          {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
        </div>
      </div>

      {preview && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p>
              <span className="font-medium">{pluralDays(preview.days)}</span> of leave. Weekends and public holidays are not counted.
            </p>
            <p className="text-muted-foreground">
              {preview.escalates ? "Needs manager and then department head approval." : "Needs manager approval only."}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" rows={4} placeholder="Tell your manager why you need this leave." aria-invalid={!!errors.reason} {...register("reason")} />
        {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending ? "Submitting..." : "Submit request"}
        </Button>
      </div>
    </form>
  );
}
