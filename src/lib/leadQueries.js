// Keep large attachment lists out of recurring dashboard/team refreshes.
// Timeline and tasks are still needed by the current dashboard calculations.
const summaryFields = [
  'id', 'name', 'status', 'address', 'phone', 'phone2', 'email', 'email2',
  'property_type', 'sqft', 'insurance_provider', 'claim_number', 'policy_number',
  'damage_type', 'loss_date', 'insurance_phone1', 'insurance_phone2', 'insurance_email1',
  'insurance_email2', 'notes', 'insurance_notes', 'adjuster_name', 'assigned_rep',
  'assigned_rep_avatar', 'created_at', 'organization_id', 'is_insurance_claim', 'tasks', 'timeline',
];

export function leadSummarySelect(includeEstimates = false) {
  return [...summaryFields, ...(includeEstimates ? ['estimate'] : []), 'organizations(name)'].join(',');
}

export function preserveCaseDocuments(previous, next, cache = new Map()) {
  const documents = new Map(previous.map(lead => [lead.id, lead.documents]));
  return next.map(lead => ({ ...lead, documents: cache.get(lead.id) || documents.get(lead.id) || [] }));
}
