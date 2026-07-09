import { Role } from "@prisma/client";

type AppUser = {
  role: Role;
  teamId: number | null;
};

type AssignedSale = {
  assignedTeamId: number | null;
};

export function canManageItem(
  user: AppUser,
  item: {
    submittedTeamId: number | null;
    estateSale: AssignedSale;
  }
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

export function canDeleteItem(user: AppUser) {
  return user.role === Role.MANAGEMENT;
}
