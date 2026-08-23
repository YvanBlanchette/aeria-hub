"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function CatalogSearch({ defaultQuery, placeholder }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	function updateParam(key, value) {
		const params = new URLSearchParams(searchParams.toString());
		if (value) params.set(key, value);
		else params.delete(key);
		params.delete("page");
		router.push(`${pathname}?${params.toString()}`);
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				updateParam("q", new FormData(event.currentTarget).get("q"));
			}}
			className="relative max-w-sm flex-1"
		>
			<Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				name="q"
				defaultValue={defaultQuery}
				placeholder={placeholder}
				className="pl-8"
			/>
		</form>
	);
}
