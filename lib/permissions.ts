import { Role } from "@prisma/client";

export function canManageItem(
  user: { role: Role; teamId: number | null },
  item: { submittedTeamId: number }
) {
  return user.role === Role.MANAGEMENT || user.teamId === item.submittedTeamId;
}

export function canRestoreItem(user: { role: Role }) {
  return user.role === Role.MANAGEMENT;
}
