export type DriverInvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

export interface DriverInvitation {
  id: string;
  organizationId: string;
  driverId: string;
  invitedEmail: string;
  status: DriverInvitationStatus;
  expiresAt: string;
  invitedBy: string | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedDriverInvitation extends DriverInvitation {
  token: string;
}

export interface DriverInvitationDetails {
  id: string;
  organizationName: string;
  driverName: string;
  invitedEmail: string;
  status: DriverInvitationStatus;
  expiresAt: string;
}

export interface AcceptedDriverInvitation {
  id: string;
  organizationName: string;
  driverName: string;
  acceptedAt: string;
}
