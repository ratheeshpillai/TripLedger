import type { DriverInvitationRepository } from "../repositories/driverInvitationRepository";
import type { OrganizationScope } from "../types/organization";
import { AppError } from "../utils/errors";
import { emailValidationMessage, normalizeEmail } from "../utils/email";

export interface DriverInvitationService {
  listInvitations(scope: OrganizationScope): ReturnType<DriverInvitationRepository["listInvitations"]>;
  createInvitation(scope: OrganizationScope, driverId: string, email: string): ReturnType<DriverInvitationRepository["createInvitation"]>;
  cancelInvitation(scope: OrganizationScope, invitationId: string): ReturnType<DriverInvitationRepository["cancelInvitation"]>;
  getInvitation(token: string): ReturnType<DriverInvitationRepository["getInvitation"]>;
  acceptInvitation(token: string): ReturnType<DriverInvitationRepository["acceptInvitation"]>;
}

function requireValue(value: string, message: string): string {
  const normalized = value.trim();
  if (!normalized) throw new AppError("VALIDATION", message);
  return normalized;
}

export function createDriverInvitationService(repository: DriverInvitationRepository): DriverInvitationService {
  return {
    listInvitations: (scope) => repository.listInvitations(scope),
    createInvitation(scope, driverId, email) {
      const normalizedEmail = normalizeEmail(email);
      const validationError = emailValidationMessage(normalizedEmail);
      if (validationError) throw new AppError("VALIDATION", validationError);
      return repository.createInvitation(scope, requireValue(driverId, "Select a driver to invite."), normalizedEmail);
    },
    cancelInvitation(scope, invitationId) {
      return repository.cancelInvitation(scope, requireValue(invitationId, "Select an invitation to cancel."));
    },
    getInvitation(token) {
      return repository.getInvitation(requireValue(token, "This invitation link is invalid."));
    },
    acceptInvitation(token) {
      return repository.acceptInvitation(requireValue(token, "This invitation link is invalid."));
    }
  };
}
