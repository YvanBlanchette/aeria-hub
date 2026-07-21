import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, icon: Icon }) {
	return (
		<Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
			<CardContent className="flex items-center gap-4 p-4">
				<div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
					<Icon className="size-5" />
				</div>
				<div className="min-w-0">
					<p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
					<p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
				</div>
			</CardContent>
		</Card>
	);
}
