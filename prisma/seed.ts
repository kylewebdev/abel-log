import {
  AliasScope,
  EntrySource,
  PrismaClient,
  ReviewStatus,
  Role,
  SaleStatus
} from "@prisma/client";
import { normalizeAddress, normalizeAlias, slugify } from "../lib/format";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const categories = [
  "Furniture",
  "Tools",
  "Outdoor / Garden",
  "Kitchen",
  "Art / Decor",
  "Jewelry",
  "Electronics",
  "Appliances",
  "Collectibles",
  "Clothing",
  "Books / Media",
  "Garage",
  "Bundle",
  "Miscellaneous"
];

function aliasKey(scope: AliasScope, normalizedAliasText: string, teamId: number | null) {
  return `${scope}:${teamId ?? "global"}:${normalizedAliasText}`;
}

async function main() {
  const passwordHash = await hashPassword("password");

  const teams = await Promise.all(
    ["Team A", "Team B", "Team C", "Team D", "Team E"].map((name) =>
      prisma.team.upsert({
        where: { slug: slugify(name) },
        update: { name, isActive: true },
        create: {
          name,
          slug: slugify(name),
          isActive: true
        }
      })
    )
  );

  await prisma.user.upsert({
    where: { username: "management" },
    update: {
      name: "Management",
      passwordHash,
      role: Role.MANAGEMENT,
      teamId: null,
      isActive: true
    },
    create: {
      name: "Management",
      username: "management",
      passwordHash,
      role: Role.MANAGEMENT,
      isActive: true
    }
  });

  for (const team of teams) {
    await prisma.user.upsert({
      where: { username: team.slug },
      update: {
        name: team.name,
        passwordHash,
        role: Role.TEAM,
        teamId: team.id,
        isActive: true
      },
      create: {
        name: team.name,
        username: team.slug,
        passwordHash,
        role: Role.TEAM,
        teamId: team.id,
        isActive: true
      }
    });
  }

  const seededCategories = await Promise.all(
    categories.map((name, index) =>
      prisma.reportCategory.upsert({
        where: { slug: slugify(name) },
        update: {
          name,
          sortOrder: index + 1,
          isActive: true
        },
        create: {
          name,
          slug: slugify(name),
          sortOrder: index + 1,
          isActive: true
        }
      })
    )
  );

  const management = await prisma.user.findUniqueOrThrow({
    where: { username: "management" }
  });
  const teamAUser = await prisma.user.findUniqueOrThrow({
    where: { username: "team-a" }
  });
  const teamBUser = await prisma.user.findUniqueOrThrow({
    where: { username: "team-b" }
  });
  const teamA = teams[0];
  const teamB = teams[1];

  const sale = await prisma.estateSale.upsert({
    where: { id: 1 },
    update: {
      addressRaw: "123 Main St, Sacramento, CA",
      formattedAddress: "123 Main St, Sacramento, CA",
      normalizedAddress: normalizeAddress("123 Main St, Sacramento, CA"),
      saleName: "Johnson Estate",
      clientName: "Johnson Family",
      status: SaleStatus.ACTIVE,
      reportThresholdCents: 2500,
      assignedTeamId: teamA.id,
      createdByUserId: management.id,
      createdByTeamId: null
    },
    create: {
      addressRaw: "123 Main St, Sacramento, CA",
      formattedAddress: "123 Main St, Sacramento, CA",
      normalizedAddress: normalizeAddress("123 Main St, Sacramento, CA"),
      saleName: "Johnson Estate",
      clientName: "Johnson Family",
      notes: "Sample active sale for local testing.",
      status: SaleStatus.ACTIVE,
      reportThresholdCents: 2500,
      assignedTeamId: teamA.id,
      createdByUserId: management.id
    }
  });

  const furniture = seededCategories.find((category) => category.name === "Furniture")!;
  const tools = seededCategories.find((category) => category.name === "Tools")!;
  const art = seededCategories.find((category) => category.name === "Art / Decor")!;

  const existingItems = await prisma.soldItem.count({
    where: { estateSaleId: sale.id }
  });

  if (existingItems === 0) {
    await prisma.soldItem.createMany({
      data: [
        {
          estateSaleId: sale.id,
          submittedTeamId: teamA.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Dining table",
          finalSoldPriceCents: 25000,
          teamLabel: "table",
          reportCategoryId: furniture.id,
          entrySource: EntrySource.PAPER,
          reviewStatus: ReviewStatus.APPROVED
        },
        {
          estateSaleId: sale.id,
          submittedTeamId: teamA.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Box of hand tools",
          finalSoldPriceCents: 4500,
          teamLabel: "garage stuff",
          reportCategoryId: tools.id,
          entrySource: EntrySource.PAPER,
          reviewStatus: ReviewStatus.NEEDS_REVIEW
        },
        {
          estateSaleId: sale.id,
          submittedTeamId: teamB.id,
          createdByUserId: teamBUser.id,
          itemDescription: "Framed painting",
          finalSoldPriceCents: 6500,
          teamLabel: "picture",
          reportCategoryId: art.id,
          entrySource: EntrySource.LIVE_APP,
          reviewStatus: ReviewStatus.APPROVED
        },
        {
          estateSaleId: sale.id,
          submittedTeamId: teamA.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Small kitchen utensils",
          finalSoldPriceCents: 1800,
          teamLabel: "kitchen bundle",
          entrySource: EntrySource.LIVE_APP,
          reviewStatus: ReviewStatus.NEEDS_REVIEW
        }
      ]
    });
  }

  await prisma.categoryAlias.upsert({
    where: { aliasKey: aliasKey(AliasScope.GLOBAL, normalizeAlias("couch"), null) },
    update: {
      aliasText: "couch",
      reportCategoryId: furniture.id,
      isApproved: true,
      approvedByUserId: management.id,
      approvedAt: new Date()
    },
    create: {
      aliasKey: aliasKey(AliasScope.GLOBAL, normalizeAlias("couch"), null),
      aliasText: "couch",
      normalizedAliasText: normalizeAlias("couch"),
      reportCategoryId: furniture.id,
      scope: AliasScope.GLOBAL,
      isApproved: true,
      approvedByUserId: management.id,
      approvedAt: new Date()
    }
  });

  await prisma.categoryAlias.upsert({
    where: { aliasKey: aliasKey(AliasScope.TEAM, normalizeAlias("garage stuff"), teamA.id) },
    update: {
      aliasText: "garage stuff",
      reportCategoryId: tools.id,
      isApproved: true,
      approvedByUserId: management.id,
      approvedAt: new Date()
    },
    create: {
      aliasKey: aliasKey(AliasScope.TEAM, normalizeAlias("garage stuff"), teamA.id),
      aliasText: "garage stuff",
      normalizedAliasText: normalizeAlias("garage stuff"),
      reportCategoryId: tools.id,
      teamId: teamA.id,
      scope: AliasScope.TEAM,
      isApproved: true,
      approvedByUserId: management.id,
      approvedAt: new Date()
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
