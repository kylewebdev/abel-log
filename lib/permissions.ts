import { Role } from "@prisma/client";

type AppUser = {
  role: Role;
  teamId: number | null;
};

type AssignedSale = {
  assignedTeamId: number | null;
};

type TeamOwnedItem = {
  submittedTeamId: number | null;
  estateSale: AssignedSale;
};

export function canManageItem(
  user: AppUser,
  item: TeamOwnedItem
) {
  return (
    user.role === Role.MANAGEMENT ||
    (user.teamId !== null &&
      user.teamId === item.submittedTeamId &&
      user.teamId === item.estateSale.assignedTeamId)
  );
}

export function canAccessSale(
  user: AppUser,
  sale: AssignedSale
) {
  return (
    user.role === Role.MANAGEMENT ||
    (user.teamId !== null && user.teamId === sale.assignedTeamId)
  );
}

export function canEditSale(user: AppUser) {
  return user.role === Role.MANAGEMENT;
}

export function canDeleteItem(user: AppUser, item: TeamOwnedItem) {
  return canManageItem(user, item);
}
