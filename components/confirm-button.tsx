"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/**
 * Submit button that asks for native confirmation before letting the form
 * post. Used for destructive server actions (e.g. permanently deleting a sale)
 * where the rest of the app has no client-side confirm step.
 */
export function ConfirmButton({
  confirmMessage,
  ...props
}: ComponentProps<typeof Button> & { confirmMessage: string }) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    />
  );
}
