import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "abel_session_user";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rawUserId = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = Number(rawUserId);

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
