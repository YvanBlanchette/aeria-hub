"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Compass, Mail, RefreshCcw, Sparkles } from "lucide-react";
import { sendTravelProfileResult } from "@/app/travel-profile/actions";
import { PROFILES, QUESTIONS, getTravelProfileResult } from "@/lib/aeria-travel-profiles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AeriaTravelProfileQuiz() {
	const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null));
	const [step, setStep] = useState(0);
	const [sendState, formAction, pending] = useActionState(sendTravelProfileResult, undefined);
	const answeredCount = answers.filter(Boolean).length;
	const isComplete = answeredCount === QUESTIONS.length;
	const result = useMemo(() => getTravelProfileResult(answers), [answers]);
	const primaryProfile = isComplete ? PROFILES[result.primary.key] : null;
	const secondaryProfile = isComplete ? PROFILES[result.secondary.key] : null;
	const currentQuestion = QUESTIONS[step];
	const progress = Math.round((answeredCount / QUESTIONS.length) * 100);

	function answerCurrent(answerId) {
		const nextAnswers = [...answers];
		nextAnswers[step] = answerId;
		setAnswers(nextAnswers);
		if (step < QUESTIONS.length - 1) setStep(step + 1);
	}

	function resetQuiz() {
		setAnswers(Array(QUESTIONS.length).fill(null));
		setStep(0);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
			<div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="max-w-3xl">
						<p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Profils AERIA</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">Quel voyageur êtes-vous?</h1>
						<p className="mt-2 text-sm leading-6 text-muted-foreground">
							Un quiz de personnalité pour identifier le style qui vous ressemble et orienter les recommandations de votre conseiller.
						</p>
					</div>
					<Badge className="gap-1.5 px-3 py-1.5">
						<Sparkles className="size-3.5" />
						{answeredCount}/{QUESTIONS.length}
					</Badge>
				</div>
				<div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
					<div
						className="h-full rounded-full bg-primary transition-all"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>
						Question {step + 1} de {QUESTIONS.length}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">{currentQuestion.prompt}</p>
					<div className="grid gap-3">
						{currentQuestion.options.map((option) => {
							const selected = answers[step] === option.id;
							return (
								<button
									key={option.id}
									type="button"
									onClick={() => answerCurrent(option.id)}
									className={cn(
										"flex min-h-16 items-center justify-between gap-3 rounded-md border border-border bg-background px-4 py-3 text-left text-sm transition hover:border-primary/60 hover:bg-muted/55",
										selected && "border-primary bg-primary/8",
									)}
								>
									<span className="leading-6">{option.label}</span>
									<span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
										{selected ? <Check className="size-4" /> : <Compass className="size-3.5 text-muted-foreground" />}
									</span>
								</button>
							);
						})}
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => setStep(Math.max(step - 1, 0))}
							disabled={step === 0}
						>
							<ArrowLeft className="size-4" />
							Précédent
						</Button>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={resetQuiz}
								disabled={answeredCount === 0}
							>
								<RefreshCcw className="size-4" />
								Recommencer
							</Button>
							<Button
								type="button"
								onClick={() => setStep(Math.min(step + 1, QUESTIONS.length - 1))}
								disabled={step === QUESTIONS.length - 1}
							>
								Suivant
								<ArrowRight className="size-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{isComplete && primaryProfile && secondaryProfile && (
				<Card>
					<CardHeader>
						<CardTitle>Votre résultat</CardTitle>
					</CardHeader>
					<CardContent className="space-y-5">
						<div className="grid gap-4 md:grid-cols-2">
							<div className={cn("rounded-md border p-4", primaryProfile.color)}>
								<p className="text-xs font-medium uppercase tracking-[0.22em] opacity-70">Profil dominant</p>
								<div className="mt-2 flex items-center gap-2">
									<span className={cn("size-2.5 rounded-full", primaryProfile.accent)} />
									<p className="text-xl font-semibold">{primaryProfile.name}</p>
								</div>
								<p className="mt-3 text-sm leading-6">{primaryProfile.tagline}</p>
							</div>

							<div className="rounded-md border border-border bg-background p-4">
								<p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Profil secondaire</p>
								<p className="mt-2 text-lg font-semibold">{secondaryProfile.name}</p>
								<p className="mt-2 text-sm leading-6 text-muted-foreground">{secondaryProfile.tagline}</p>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							{primaryProfile.keywords.map((keyword) => (
								<Badge
									key={keyword}
									variant="secondary"
								>
									{keyword}
								</Badge>
							))}
						</div>

						<form
							action={formAction}
							className="space-y-4 border-t border-border pt-5"
						>
							<div className="rounded-md border border-border bg-background p-4">
								<p className="text-sm leading-6 text-muted-foreground">
									Inscrivez vos coordonnées ci-dessous pour recevoir votre profil complet par courriel, incluant des recommandations de voyages personnalisées selon votre style, votre profil secondaire et les expériences qui vous correspondent le mieux.
								</p>
							</div>
							<input
								type="hidden"
								name="answers"
								value={JSON.stringify(answers)}
							/>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="firstName">Prénom</Label>
									<Input
										id="firstName"
										name="firstName"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="lastName">Nom</Label>
									<Input
										id="lastName"
										name="lastName"
										required
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="email">Courriel</Label>
								<Input
									id="email"
									name="email"
									type="email"
									required
								/>
							</div>
							<Button
								type="submit"
								disabled={pending}
								className="w-full"
							>
								<Mail className="size-4" />
								{pending ? "Envoi..." : "Recevoir mon résultat par courriel"}
							</Button>
							{sendState?.message && (
								<p className={cn("text-sm leading-6", sendState.ok ? "text-emerald-700 dark:text-emerald-300" : "text-destructive")}>{sendState.message}</p>
							)}
						</form>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
