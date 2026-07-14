import { MapPin, Plus } from "lucide-react";
import { Role } from "@prisma/client";
import { createEstateSaleAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function NewSalePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const teams = await prisma.team.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });
  const isManager = user.role === Role.MANAGEMENT;

  return (
    <AppShell user={user} focus>
      <div className="mx-auto max-w-2xl">
        <Breadcrumbs
          items={[
            { label: "All sales", href: "/sales" },
            { label: "New sale" }
          ]}
          className="-ml-1 mb-3"
        />

        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          New estate sale
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Address first. Details later.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The only thing you need is the address. We&apos;ll open item entry right
          after.
        </p>

        {params.error === "address" ? (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
            An address is required to create a sale.
          </div>
        ) : null}
        {params.error === "team" ? (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-semibold text-destructive">
            This team account is not assigned to an active team.
          </div>
        ) : null}

        <form action={createEstateSaleAction} className="mt-5">
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <div className="relative">
              <MapPin
                className="pointer-events-none absolute left-3.5 top-4 size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="address"
                name="address"
                placeholder="123 Main St, Sacramento, CA"
                autoComplete="street-address"
                className="h-14 pl-11 text-base font-medium"
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Status defaults to Active · report threshold defaults to $25.
            </p>
          </div>

          <details className="mt-4 rounded-md border border-border bg-muted/30">
            <summary className="cursor-pointer p-3.5 text-sm font-bold">
              Optional sale details
            </summary>
            <div className="grid gap-4 border-t border-border p-3.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="saleName">Sale name</Label>
                <Input id="saleName" name="saleName" placeholder="Johnson Estate" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientName">Client name</Label>
                <Input
                  id="clientName"
                  name="clientName"
                  placeholder="Johnson Family"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reportThreshold">Report threshold</Label>
                <Input
                  id="reportThreshold"
                  name="reportThreshold"
                  inputMode="decimal"
                  defaultValue="25.00"
                  className="price"
                />
              </div>
              {isManager ? (
                <div className="space-y-1.5">
                  <Label htmlFor="assignedTeamId">Assigned team</Label>
                  <Select id="assignedTeamId" name="assignedTeamId">
                    <option value="">No assigned team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Gate code, parking, or client context"
                />
              </div>
            </div>
          </details>

          <div className="pb-safe sticky bottom-0 -mx-4 mt-6 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
            <div className="mx-auto flex max-w-2xl items-center gap-2">
              <Button type="submit" size="xl" variant="accent" className="flex-1">
                <Plus aria-hidden="true" />
                Create &amp; start adding
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
