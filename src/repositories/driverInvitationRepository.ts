import type { OrganizationScope } from "../types/organization";
import type { AcceptedDriverInvitation, CreatedDriverInvitation, DriverInvitation, DriverInvitationDetails } from "../types/driverInvitation";

export interface DriverInvitationRepository {
  listInvitations(scope: OrganizationScope): Promise<DriverInvitation[]>;
  createInvitation(scope: OrganizationScope, driverId: string, email: string): Promise<CreatedDriverInvitation>;
  cancelInvitation(scope: OrganizationScope, invitationId: string): Promise<DriverInvitation>;
  getInvitation(token: string): Promise<DriverInvitationDetails>;
  acceptInvitation(token: string): Promise<AcceptedDriverInvitation>;
}
