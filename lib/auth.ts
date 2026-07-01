import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

/**
 * Resolve the signed Auth.js session to the fresh DB user (with team). Reading
 * from the DB per request keeps role/team/active status authoritative — a
 * deactivated or demoted user loses access immediately, without re-issuing the
 * session token.
 */
export async function getCurrentUser() {
  const session = await auth();
  const userId = Number(session?.user?.id);

  if (!Number.isInteger(userId)) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true
    },
    include: {
      team: true
    }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireManagement() {
  const user = await requireUser();

  if (user.role !== Role.MANAGEMENT) {
    redirect("/sales");
  }

  return user;
}

export function isManagement(user: { role: Role }) {
  return user.role === Role.MANAGEMENT;
}
