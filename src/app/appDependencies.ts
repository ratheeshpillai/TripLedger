import { supabaseAuthRepository } from "../repositories/supabase/supabaseAuthRepository";
import { supabaseBillRepository } from "../repositories/supabase/supabaseBillRepository";
import { supabaseBillingPartyRepository } from "../repositories/supabase/supabaseBillingPartyRepository";
import { supabaseDashboardRepository } from "../repositories/supabase/supabaseDashboardRepository";
import { supabaseDriverRepository } from "../repositories/supabase/supabaseDriverRepository";
import { supabaseDriverVehicleAssignmentRepository } from "../repositories/supabase/supabaseDriverVehicleAssignmentRepository";
import { supabaseOrganizationRepository } from "../repositories/supabase/supabaseOrganizationRepository";
import { supabaseOwnerPaymentRepository } from "../repositories/supabase/supabaseOwnerPaymentRepository";
import { supabaseSettingsRepository } from "../repositories/supabase/supabaseSettingsRepository";
import { supabaseVehicleRepository } from "../repositories/supabase/supabaseVehicleRepository";
import { createAuthService } from "../services/authService";
import { createBillService } from "../services/billService";
import { createBillingPartyService } from "../services/billingPartyService";
import { createDashboardService } from "../services/dashboardService";
import { createDriverService } from "../services/driverService";
import { createDriverVehicleAssignmentService } from "../services/driverVehicleAssignmentService";
import { createOrganizationService } from "../services/organizationService";
import { createOwnerPaymentService } from "../services/ownerPaymentService";
import { createSettingsService } from "../services/settingsService";
import { createVehicleService } from "../services/vehicleService";

export const appServices = {
  auth: createAuthService(supabaseAuthRepository),
  bills: createBillService(supabaseBillRepository),
  billingParties: createBillingPartyService(supabaseBillingPartyRepository),
  dashboard: createDashboardService(supabaseDashboardRepository),
  drivers: createDriverService(supabaseDriverRepository),
  driverVehicleAssignments: createDriverVehicleAssignmentService(supabaseDriverVehicleAssignmentRepository),
  organization: createOrganizationService(supabaseOrganizationRepository),
  ownerPayments: createOwnerPaymentService(supabaseOwnerPaymentRepository),
  settings: createSettingsService(supabaseSettingsRepository),
  vehicles: createVehicleService(supabaseVehicleRepository)
};
