import { z } from "zod";

// Form se sab kuch string aata hai; yahan usay sahi type mein badalte hain.
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
  .transform((s) => new Date(`${s}T00:00:00Z`));

export const leaveRequestSchema = z
  .object({
    leaveTypeId: z
      .string()
      .min(1, "Select a leave type")
      .transform((s) => Number(s))
      .refine((n) => Number.isInteger(n) && n > 0, "Select a leave type"),
    startDate: dateOnly,
    endDate: dateOnly,
    reason: z.string().trim().min(10, "Give at least 10 characters").max(500, "Keep it under 500 characters"),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "End date cannot be before start date" });

/** Form ki values (sab strings) */
export type LeaveRequestInput = z.input<typeof leaveRequestSchema>;
/** Validate hone ke baad (number + Date) */
export type LeaveRequestValues = z.output<typeof leaveRequestSchema>;

export const decisionSchema = z.object({
  requestId: z.number().int().positive(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().trim().max(500, "Keep it under 500 characters").optional(),
});

export type DecisionInput = z.infer<typeof decisionSchema>;
