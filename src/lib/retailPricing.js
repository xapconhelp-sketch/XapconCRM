export const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;

export function retailDefaults(organization) {
  const baseFee = Number(organization?.retail_default_fee ?? 0);
  const taxRate = Number(organization?.retail_tax_rate ?? 0.0825);
  const taxAmount = roundMoney(baseFee * taxRate);
  return { baseFee, taxRate, subtotalFees: baseFee, subtotalGross: baseFee, taxAmount, total: roundMoney(baseFee + taxAmount) };
}

export function calculateRetailPricing(items, estimate) {
  const subtotalMaterials = roundMoney(items.filter(i => i.category === 'material').reduce((s, i) => s + i.qty * i.unitPrice, 0));
  const subtotalLabor = roundMoney(items.filter(i => i.category === 'labor').reduce((s, i) => s + i.qty * i.unitPrice, 0));
  // Preserve the implicit fee in older saved estimates instead of changing their pricing.
  const oldItemFees = (estimate.items || []).filter(i => i.category === 'fee').reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const baseFee = estimate.baseFee ?? Math.max(0, roundMoney((estimate.subtotalFees || 0) - oldItemFees));
  const subtotalFees = roundMoney(baseFee + items.filter(i => i.category === 'fee').reduce((s, i) => s + i.qty * i.unitPrice, 0));
  const subtotalGross = roundMoney(subtotalMaterials + subtotalLabor + subtotalFees);
  const taxRate = estimate.taxRate ?? 0.0825;
  const taxAmount = roundMoney(subtotalGross * taxRate);
  return { baseFee, taxRate, subtotalMaterials, subtotalLabor, subtotalFees, subtotalGross, taxAmount, total: roundMoney(subtotalGross + taxAmount) };
}
