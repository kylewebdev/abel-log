"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the browser print dialog, where the user can pick "Save as PDF". */
export function PrintButton() {
  return (
    <Button type="button" variant="accent" size="sm" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      Save as PDF
    </Button>
  );
}
