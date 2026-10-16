export const publicEstimateFields = [
  'id', 'leadId', 'clientName', 'address', 'clientPhone', 'clientEmail', 'status',
  'items', 'subtotalMaterials', 'subtotalLabor', 'subtotalFees', 'baseFee',
  'subtotalGross', 'taxRate', 'taxAmount', 'total', 'termsAndCommitment',
  'warrantyType', 'warrantyTypes',
];

export function publicEstimate(estimate) {
  if (!estimate || typeof estimate !== 'object' || Array.isArray(estimate)) return null;
  return Object.fromEntries(publicEstimateFields.filter(key => Object.hasOwn(estimate, key)).map(key => [key, estimate[key]]));
}
