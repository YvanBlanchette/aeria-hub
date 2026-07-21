"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function compareValues(a, b, kind) {
	if (kind === "date") {
		const av = a ? new Date(a).getTime() : -Infinity;
		const bv = b ? new Date(b).getTime() : -Infinity;
		return av - bv;
	}
	if (kind === "number") return (a ?? 0) - (b ?? 0);
	return String(a ?? "").localeCompare(String(b ?? ""));
}

// Pass defaultKey: null (the default) to keep the incoming row order until a header is clicked.
export function useSortableRows(rows, columns, { defaultKey = null, defaultDir = "asc" } = {}) {
	const [sortKey, setSortKey] = useState(defaultKey);
	const [sortDir, setSortDir] = useState(defaultDir);

	const sorted = useMemo(() => {
		if (!sortKey) return rows;
		const col = columns.find((c) => c.key === sortKey);
		const copy = [...rows];
		copy.sort((a, b) => {
			const cmp = compareValues(a[sortKey], b[sortKey], col?.kind);
			return sortDir === "asc" ? cmp : -cmp;
		});
		return copy;
	}, [rows, columns, sortKey, sortDir]);

	function toggleSort(key) {
		if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		else {
			setSortKey(key);
			setSortDir("asc");
		}
	}

	return { sorted, sortKey, sortDir, toggleSort };
}

export function SortableTableHead({ col, sortKey, sortDir, onToggle, className }) {
	return (
		<TableHead
			className={cn("cursor-pointer select-none", col.align === "right" && "text-right", className)}
			onClick={() => onToggle(col.key)}
		>
			<span className={cn("inline-flex items-center gap-1.5", col.align === "right" && "flex-row-reverse")}>
				{col.label}
				{sortKey === col.key ? (
					sortDir === "asc" ? (
						<ArrowUp className="size-3 opacity-70" />
					) : (
						<ArrowDown className="size-3 opacity-70" />
					)
				) : (
					<ArrowUpDown className="size-3 opacity-25" />
				)}
			</span>
		</TableHead>
	);
}
