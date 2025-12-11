import * as React from "react";
import { cn } from "@/lib/utils";

// Minimal ScrollArea wrapper to provide overflow with consistent styling
export function ScrollArea({ className = "", children, ...props }) {
  return (
    <div className={cn("overflow-auto", className)} {...props}>
      {children}
    </div>
  );
}
