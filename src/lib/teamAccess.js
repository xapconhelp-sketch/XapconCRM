/** Membership is identified by IDs; company names can repeat or change. */
export function memberBelongsToOrganization(member, organizationId) {
  return Boolean(organizationId && (member.organizationIds || [member.organizationId]).includes(organizationId));
}

/** Platform administrators can work on any case; staff must have membership. */
export function eligibleCaseMembers(members, organizationId) {
  if (!organizationId) return [];
  return members.filter(member => member.roleCategory === 'admin' || memberBelongsToOrganization(member, organizationId));
}

export function isTaskAssignedTo(task, userId) {
  return Boolean(userId && task.assignedToId === userId);
}
