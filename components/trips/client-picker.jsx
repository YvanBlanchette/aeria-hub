"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Searchable client picker built on Popover + Input (no combobox
 * dependency) since the client list can run into the hundreds.
 * @param {{ clients: {id:string,firstName:string,lastName:string,primaryEmail?:string}[], name: string, defaultValue?: string, disabled?: boolean }} props
 */
export function ClientPicker({ clients, name, defaultValue, disabled }) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selectedId, setSelectedId] = useState(defaultValue || "");

	const selected = clients.find((c) => c.id === selectedId);

	const filtered = useMemo(() => {
		if (!query.trim()) return clients;
		const q = query.trim().toLowerCase();
		return clients.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) || c.primaryEmail?.toLowerCase().includes(q));
	}, [clients, query]);

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
		>
			<input
				type="hidden"
				name={name}
				value={selectedId}
			/>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					disabled={disabled}
					className="h-10 w-full justify-between rounded-xl border-border/80 bg-background/80 font-normal shadow-sm"
				>
					<span className={cn("truncate", !selected && "text-muted-foreground")}>
						{selected ? `${selected.firstName} ${selected.lastName}` : "Select a client..."}
					</span>
					<ChevronsUpDown className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-(--radix-popover-trigger-width) rounded-2xl border-border/70 p-0 shadow-xl"
			>
				<div className="p-2">
					<Input
						autoFocus
						placeholder="Search clients..."
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						className="h-9 rounded-xl"
					/>
				</div>
				<div className="max-h-64 overflow-y-auto p-1 pt-0">
					{filtered.length === 0 && <p className="p-3 text-sm text-muted-foreground">No clients found.</p>}
					{filtered.map((c) => (
						<button
							key={c.id}
							type="button"
							onClick={() => {
								setSelectedId(c.id);
								setOpen(false);
								setQuery("");
							}}
							className={cn("flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-muted/60", c.id === selectedId && "bg-muted/70")}
						>
							<Check className={cn("size-4 shrink-0", c.id === selectedId ? "opacity-100" : "opacity-0")} />
							<span className="flex-1 truncate">
								{c.firstName} {c.lastName}
							</span>
							{c.primaryEmail && <span className="truncate text-xs text-muted-foreground">{c.primaryEmail}</span>}
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
