"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { authenticate } from "./actions";
import Image from "next/image";

export function LoginForm({ callbackUrl }) {
	const [errorMessage, formAction, pending] = useActionState(authenticate, undefined);

	return (
		<Card className="w-full max-w-3xl mx-auto">
			<CardContent className="pt-6">
				<div className="mb-6 flex justify-center items-end">
					<Image
						src="/branding/aeria-hub-client-logo.svg"
						alt="ÆRIA Hub Logo"
						width={100}
						height={100}
						className="h-18 w-auto"
					/>
				</div>
				<form
					action={formAction}
					className="space-y-5 pb-2 px-2"
				>
					<input
						type="hidden"
						name="callbackUrl"
						value={callbackUrl}
					/>

					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							name="email"
							type="email"
							placeholder="you@aeriahub.com"
							required
							autoComplete="email"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							name="password"
							type="password"
							placeholder="••••••••"
							required
							autoComplete="current-password"
						/>
					</div>

					{errorMessage && (
						<p
							className="text-sm text-destructive"
							role="alert"
						>
							{errorMessage}
						</p>
					)}

					<Button
						type="submit"
						className="w-full"
						disabled={pending}
					>
						{pending ? "Signing in..." : "Sign in"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
