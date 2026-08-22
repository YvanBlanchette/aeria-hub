import Image from "next/image";
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
				<LoginForm callbackUrl={callbackUrl} />
			</div>
		</div>
	);
}
