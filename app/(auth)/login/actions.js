"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

/**
 * Server action backing the login form. Returns an error message string on
 * failure; on success `signIn` triggers a redirect that this function never
 * returns from.
 * @param {string | undefined} prevState
 * @param {FormData} formData
 */
export async function authenticate(prevState, formData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: formData.get("callbackUrl") || "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        default:
          return "Something went wrong. Please try again.";
      }
    }
    throw error;
  }
}
