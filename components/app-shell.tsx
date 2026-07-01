import { LogOut } from "lucide-react";
import { Role } from "@prisma/client";
import { logoutAction } from "@/lib/actions";
import { AppNav, MobileTabBar } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShellUser = {
  name: string;
  role: Role;
  team: { name: string } | null;
};

export function AppShell({
  user,
  children,
  focus = false
}: {
  user: ShellUser;
  children: React.ReactNode;
  /** Checkout/task screens: hide the mobile tab bar so the page owns the
   *  bottom thumb zone with its own primary action. */
  focus?: boolean;
}) {
  const isManager = user.role === Role.MANAGEMENT;

  return (
    <div className="min-h-screen bg-background">
      <header className="pt-safe sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <AppNav role={user.role} />

          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  isManager ? "bg-accent" : "bg-success"
                )}
                aria-hidden="true"
              />
              <span className="max-w-[7rem] truncate text-xs font-bold uppercase tracking-wide">
                {isManager ? "Management" : user.team?.name ?? user.name}
              </span>
            </span>
            <form action={logoutAction}>
              <Button variant="ghost" size="icon" type="submit" title="Log out">
                <LogOut aria-hidden="true" />
                <span className="sr-only">Log out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full max-w-6xl px-4 py-5 md:px-6 md:py-7",
          focus ? "pb-12" : "pb-28 md:pb-12"
        )}
      >
        {children}
      </main>

      {/* Rendered at the root — NOT inside the blurred header — so its
          `position: fixed` resolves against the viewport. */}
      <MobileTabBar role={user.role} focus={focus} />
    </div>
  );
}
