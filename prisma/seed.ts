import { randomBytes } from "node:crypto";
import {
  EntrySource,
  PrismaClient,
  Role,
  SaleStatus
} from "@prisma/client";
import { normalizeAddress, slugify } from "../lib/format";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

type CreatedCredential = {
  username: string;
  password: string;
};

const createdCredentials: CreatedCredential[] = [];

function assertDemoSeedAllowed() {
  if (process.env.ENABLE_DEMO_SEED !== "true") {
    throw new Error(
      "Refusing to seed: set ENABLE_DEMO_SEED=true only for a disposable local database."
    );
  }

  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error("Refusing to seed a production environment.");
  }
}

function passwordEnvironmentKey(username: string) {
  return `SEED_PASSWORD_${username.replace(/-/g, "_").toUpperCase()}`;
}

function newAccountPassword(username: string) {
  const configuredPassword = process.env[passwordEnvironmentKey(username)]?.trim();

  if (configuredPassword && configuredPassword.length < 12) {
    throw new Error(
      `${passwordEnvironmentKey(username)} must contain at least 12 characters.`
    );
  }

  return configuredPassword || randomBytes(18).toString("base64url");
}

async function ensureUser({
  name,
  username,
  role,
  teamId
}: {
  name: string;
  username: string;
  role: Role;
  teamId: number | null;
}) {
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    return existing;
  }

  const password = newAccountPassword(username);
  const user = await prisma.user.create({
    data: {
      name,
      username,
      passwordHash: await hashPassword(password),
      role,
      teamId,
      isActive: true
    }
  });

  createdCredentials.push({ username, password });
  return user;
}

async function main() {
  assertDemoSeedAllowed();

  const teams = [];
  for (const name of ["Team A", "Team B", "Team C", "Team D", "Team E"]) {
    teams.push(
      await prisma.team.upsert({
        where: { slug: slugify(name) },
        update: { name },
        create: {
          name,
          slug: slugify(name),
          isActive: true
        }
      })
    );
  }

  const management = await ensureUser({
    name: "Management",
    username: "management",
    role: Role.MANAGEMENT,
    teamId: null
  });

  const teamUsers = new Map<string, Awaited<ReturnType<typeof ensureUser>>>();
  for (const team of teams) {
    teamUsers.set(
      team.slug,
      await ensureUser({
        name: team.name,
        username: team.slug,
        role: Role.TEAM,
        teamId: team.id
      })
    );
  }

  const teamA = teams[0];
  const teamAUser = teamUsers.get("team-a");
  const sampleAddress = "123 Main St, Sacramento, CA";
  const existingSampleSale = await prisma.estateSale.findFirst({
    where: { normalizedAddress: normalizeAddress(sampleAddress) },
    select: { id: true }
  });

  if (!existingSampleSale && teamA && teamAUser) {
    const sale = await prisma.estateSale.create({
      data: {
        addressRaw: sampleAddress,
        formattedAddress: sampleAddress,
        normalizedAddress: normalizeAddress(sampleAddress),
        saleName: "Johnson Estate",
        clientName: "Johnson Family",
        notes: "Sample active sale for local testing.",
        status: SaleStatus.ACTIVE,
        reportThresholdCents: 2500,
        assignedTeamId: teamA.id,
        createdByUserId: management.id
      }
    });

    await prisma.soldItem.createMany({
      data: [
        {
          estateSaleId: sale.id,
          submittedTeamId: teamA.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Dining table",
          finalSoldPriceCents: 25000,
          entrySource: EntrySource.PAPER
        },
        {
          estateSaleId: sale.id,
          submittedTeamId: teamA.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Box of hand tools",
          finalSoldPriceCents: 4500,
          entrySource: EntrySource.PAPER
        },
        {
          estateSaleId: sale.id,
          submittedTeamId: teamA.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Framed painting",
          finalSoldPriceCents: 6500,
          entrySource: EntrySource.LIVE_APP
        },
        {
          estateSaleId: sale.id,
          submittedTeamId: teamA.id,
          createdByUserId: teamAUser.id,
          itemDescription: "Small kitchen utensils",
          finalSoldPriceCents: 1800,
          entrySource: EntrySource.LIVE_APP
        }
      ]
    });
  }

  if (createdCredentials.length === 0) {
    console.log("Demo accounts already exist; passwords were left unchanged.");
    return;
  }

  console.log("Created demo accounts (store these passwords securely):");
  for (const credential of createdCredentials) {
    console.log(`${credential.username}: ${credential.password}`);
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
