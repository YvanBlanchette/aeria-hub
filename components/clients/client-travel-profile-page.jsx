"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TravelProfileOverview } from "@/components/clients/travel-profile-overview";
import { AeriaTravelProfileQuiz } from "@/components/clients/aeria-travel-profile-quiz";

export function ClientTravelProfilePage({ client }) {
	const [showQuiz, setShowQuiz] = useState(false);
	const router = useRouter();

	if (showQuiz) {
		return (
			<div className="space-y-4">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => {
						setShowQuiz(false);
						router.refresh();
					}}
				>
					<ArrowLeft className="size-4" />
					Back to my profile
				</Button>
				<AeriaTravelProfileQuiz
					defaultFirstName={client.firstName}
					defaultLastName={client.lastName}
					defaultEmail={client.primaryEmail || ""}
				/>
			</div>
		);
	}

	return (
		<TravelProfileOverview
			client={client}
			onRetakeQuiz={() => setShowQuiz(true)}
		/>
	);
}
