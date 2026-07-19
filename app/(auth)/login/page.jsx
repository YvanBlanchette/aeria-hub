import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in — ÆRIA Hub",
};

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const callbackUrl = typeof params?.callbackUrl === "string" ? params.callbackUrl : "/dashboard";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-3xl font-semibold tracking-tight text-primary">
            ÆRIA <span className="font-normal text-foreground">Hub</span>
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage clients, trips, and itineraries.
          </p>
        </div>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
