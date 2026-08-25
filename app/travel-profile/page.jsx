import Image from "next/image";
import { AeriaTravelProfileQuiz } from "@/components/clients/aeria-travel-profile-quiz";

export const metadata = {
	title: "Quiz des profils AERIA",
	description: "Découvrez votre profil voyage AERIA: Explorateur, Raffiné, Épicurien, Ressourcé ou Stratège.",
};

export default function TravelProfilePage() {
	return (
		<main className="min-h-screen bg-background">
			<header className="border-b border-border/80 bg-card/90 px-4 py-4 shadow-sm backdrop-blur-xl">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
					<Image
						src="/branding/aeria-hub-client-logo.svg"
						alt="AERIA Hub"
						width={184}
						height={64}
						className="h-12 w-auto"
						priority
					/>
					<p className="hidden text-[11px] uppercase tracking-[0.28em] text-muted-foreground sm:block">Quiz des profils AERIA</p>
				</div>
			</header>
			<AeriaTravelProfileQuiz />
		</main>
	);
}
