import type { Organization } from "../contexts/AuthContext";

export type MembershipPlan = "software_only" | "pro" | "plus";
export type HomeownerFollowupLevel = "none" | "partial" | "full";
export type MembershipPrivileges = {
  insurance_calls_enabled: boolean;
  homeowner_followup_level: HomeownerFollowupLevel;
};

const planPrivileges: Record<MembershipPlan, MembershipPrivileges> = {
  software_only: { insurance_calls_enabled: false, homeowner_followup_level: "none" },
  pro: { insurance_calls_enabled: false, homeowner_followup_level: "partial" },
  plus: { insurance_calls_enabled: true, homeowner_followup_level: "full" },
};

export function membershipPlanPrivileges(plan: MembershipPlan): MembershipPrivileges {
  return { ...planPrivileges[plan] };
}

export function resolveOrganizationMembership(organization: Organization) {
  // Existing companies were all on Pro before membership tracking was added.
  const plan = organization.membership_plan || "pro";
  const defaults = membershipPlanPrivileges(plan);
  return {
    plan,
    insurance_calls_enabled: organization.insurance_calls_enabled ?? defaults.insurance_calls_enabled,
    homeowner_followup_level: organization.homeowner_followup_level ?? defaults.homeowner_followup_level,
  };
}

export const homeownerFollowupLabels: Record<HomeownerFollowupLevel, string> = {
  none: "Sin seguimiento",
  partial: "Seguimiento parcial",
  full: "Seguimiento total",
};

export const membershipPlanLabels: Record<MembershipPlan, string> = {
  software_only: "Solo software",
  pro: "Pro",
  plus: "Plus",
};
