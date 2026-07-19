import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Resolves the current session's user, redirecting to /login if absent. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

/** Resolves the current session's user and throws if absent or not an admin. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden: admin role required.");
  }
  return user;
}
