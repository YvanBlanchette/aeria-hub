"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AppearanceForm() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="max-w-sm space-y-2">
      <Label htmlFor="theme">Theme</Label>
      <Select value={mounted ? theme : undefined} onValueChange={setTheme}>
        <SelectTrigger id="theme" className="w-full">
          <SelectValue placeholder="Light" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Also available from the sun/moon icon in the top bar.</p>
    </div>
  );
}
