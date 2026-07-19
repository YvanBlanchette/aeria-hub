"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "INQUIRY", label: "Inquiry" },
  { value: "QUOTED", label: "Quoted" },
  { value: "BOOKED", label: "Booked" },
  { value: "TRAVELING", label: "Traveling" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function TripFilters({ defaultQuery, defaultStatus }) {
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          updateParam("q", new FormData(event.currentTarget).get("q"));
        }}
        className="relative max-w-sm flex-1"
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={defaultQuery} placeholder="Search by name or destination..." className="pl-8" />
      </form>

      <Select value={defaultStatus || "all"} onValueChange={(value) => updateParam("status", value === "all" ? "" : value)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
