import { z } from "zod";

// Client (form) aur server (action + authorize) dono yahi schema use karte hain
export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
