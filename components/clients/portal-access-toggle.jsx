"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { setClientPortalEnabled } from "@/app/(admin)/clients/actions";

export function PortalAccessToggle({ clientId, enabled }) {
	const [pending, startTransition] = useTransition();

	function handleChange(checked) {
		startTransition(async () => {
			const error = await setClientPortalEnabled(clientId, Boolean(checked));
			if (error) toast.error(error);
		});
	}

	return (
		<label
			className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
			title={enabled ? "Portal access enabled" : "Portal access disabled"}
		>
			<Checkbox
				checked={enabled}
				disabled={pending}
				onCheckedChange={handleChange}
				aria-label={enabled ? "Disable portal access" : "Enable portal access"}
			/>
			<span className="sr-only">{enabled ? "Enabled" : "Disabled"}</span>
		</label>
	);
}
