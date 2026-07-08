import {
  EntrySource,
  PrismaClient,
  Role,
  SaleStatus
} from "@prisma/client";
import { normalizeAddress, slugify } from "../lib/format";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const seededPasswords: Record<string, string> = {
  management: "916abel0000",
  "team-a": "916abel1111",
  "team-b": "916abel2222",
  "team-c": "916abel3333",
  "team-d": "916abel4444",
  "team-e": "916abel5555"
};

async function main() {
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
      passwordHash: await hashPassword(seededPasswords.management),
      role: Role.MANAGEMENT,
      teamId: null,
      isActive: true
    },
    create: {
      name: "Management",
      username: "management",
      passwordHash: await hashPassword(seededPasswords.management),
      role: Role.MANAGEMENT,
      isActive: true
    }
  });

  for (const team of teams) {
    const passwordHash = await hashPassword(seededPasswords[team.slug]);

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

  const management = await prisma.user.findUniqueOrThrow({
    where: { username: "management" }
  });
  const teamAUser = await prisma.user.findUniqueOrThrow({
    where: { username: "team-a" }
  });
  const teamA = teams[0];

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

  const existingItems = await prisma.soldItem.count({
    where: { estateSaleId: sale.id }
  });

  if (existingItems === 0) {
    await prisma.soldItem.createMany({
      data: [
        {
          estateSaleId: sale.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Dining table",
          finalSoldPriceCents: 25000,
          entrySource: EntrySource.PAPER
        },
        {
          estateSaleId: sale.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Box of hand tools",
          finalSoldPriceCents: 4500,
          entrySource: EntrySource.PAPER
        },
        {
          estateSaleId: sale.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Framed painting",
          finalSoldPriceCents: 6500,
          entrySource: EntrySource.LIVE_APP
        },
        {
          estateSaleId: sale.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Small kitchen utensils",
          finalSoldPriceCents: 1800,
          entrySource: EntrySource.LIVE_APP
        }
      ]
    });
  }
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
