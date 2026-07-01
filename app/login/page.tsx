import { ClipboardList, LogIn } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/sales");
  }

  const params = (await searchParams) ?? {};
  const error = params.error;

  return (
    <main className="ledger-grid flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-stamp">
            <ClipboardList className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">
            Sold Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estate sale sold-item logging for crews &amp; management.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-panel">
          {error ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
              Enter a valid username and password.
            </div>
          ) : null}

          <form action={loginAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="team-a"
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" size="xl" variant="accent" className="w-full">
              <LogIn aria-hidden="true" />
              Log in
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
