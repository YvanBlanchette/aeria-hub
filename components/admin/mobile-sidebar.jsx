"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-60 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&_svg]:text-sidebar-foreground"
      >
        <SheetHeader className="h-14 justify-center border-b border-sidebar-border px-5 py-0">
          <SheetTitle asChild>
            <Link href="/dashboard" className="text-xl font-semibold tracking-tight text-sidebar-foreground">
              ÆRIA <span className="font-normal text-sidebar-foreground/70">Hub</span>
            </Link>
          </SheetTitle>
        </SheetHeader>
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
