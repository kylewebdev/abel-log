import { requireManagement } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAliasAction, createCategoryAction } from "@/lib/actions";
import { AppShell } from "@/components/app-shell";
import { StatusMessage } from "@/components/status-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default async function ManagementCategoriesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireManagement();
  const params = (await searchParams) ?? {};
  const [categories, aliases, teams] = await Promise.all([
    prisma.reportCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.categoryAlias.findMany({
      include: {
        reportCategory: true,
        team: true
      },
      orderBy: [{ usageCount: "desc" }, { aliasText: "asc" }]
    }),
    prisma.team.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <AppShell user={user}>
      <StatusMessage params={params} />

      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Category cleanup
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          Categories &amp; aliases
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep client-facing report categories controlled while mapping team
          wording into them.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Add report category</CardTitle>
              <CardDescription>
                Management-controlled report groups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createCategoryAction} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Category name</Label>
                  <Input id="name" name="name" placeholder="Rugs" required />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Add category
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add alias</CardTitle>
              <CardDescription>
                e.g. Team A says “garage stuff” → Tools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createAliasAction} className="space-y-3">
                <input type="hidden" name="next" value="/management/categories" />
                <div className="space-y-1.5">
                  <Label htmlFor="aliasText">Alias text</Label>
                  <Input
                    id="aliasText"
                    name="aliasText"
                    placeholder="garage stuff"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reportCategoryId">Maps to category</Label>
                  <Select id="reportCategoryId" name="reportCategoryId" required>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="teamId">Scope</Label>
                  <Select id="teamId" name="teamId">
                    <option value="">Global alias</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} only
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" size="lg" className="w-full">
                  Save approved alias
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Report categories</CardTitle>
              <CardDescription>
                Seeded from the PRD set. Add more as the process matures.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant={category.isActive ? "outline" : "muted"}
                    className="px-3 py-1.5 text-xs"
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approved aliases</CardTitle>
              <CardDescription>
                Aliases power suggestions without creating uncontrolled categories.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {aliases.length === 0 ? (
                <p className="text-sm text-muted-foreground">No aliases yet.</p>
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
                  {aliases.map((alias) => (
                    <li
                      key={alias.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold">{alias.aliasText}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {alias.team ? alias.team.name : "Global"} →{" "}
                          {alias.reportCategory.name}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant={alias.isApproved ? "success" : "warning"}>
                          {alias.isApproved ? "Approved" : "Pending"}
                        </Badge>
                        <div className="mt-1 text-[0.65rem] text-muted-foreground">
                          used <span className="price">{alias.usageCount}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
