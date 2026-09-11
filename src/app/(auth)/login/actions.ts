"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export type LoginResult = { error: string } | undefined;

/**
 * Login ke baad wapas usi page pe bhejo, magar sirf apni site ke andar.
 * Poore URL se sirf path rakhte hain, is liye koi bahar ki site pe redirect nahi kar sakta.
 */
function safeCallbackUrl(url?: string): string {
  if (!url) return "/";
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.pathname + parsed.search;
  } catch {
    return "/";
  }
}

export async function loginAction(values: LoginInput, callbackUrl?: string): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { error: "Please enter a valid email and password." };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: safeCallbackUrl(callbackUrl) });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: error.type === "CredentialsSignin" ? "Invalid email or password." : "Something went wrong. Please try again.",
      };
    }
    throw error; // Kaamyab login ka redirect bhi "error" ki shakal mein aata hai, usay aage jaane do
  }
}
