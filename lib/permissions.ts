import { Role } from "@prisma/client";

export function canManageItem(
  user: { role: Role; teamId: number | null },
  item: { estateSale: { assignedTeamId: number | null } }
) {
  return canManageSaleItems(user, item.estateSale);
}

export function canManageSaleItems(
  user: { role: Role; teamId: number | null },
  sale: { assignedTeamId: number | null }
) {
  return (
    user.role === Role.MANAGEMENT ||
    (user.teamId !== null && user.teamId === sale.assignedTeamId)
  );
}
