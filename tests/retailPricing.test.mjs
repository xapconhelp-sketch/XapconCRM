import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retailDefaults, calculateRetailPricing } from '../src/lib/retailPricing.js';

test('retail defaults belong to each company and do not invent a fee', () => {
  assert.equal(retailDefaults({}).total, 0);
  assert.equal(retailDefaults({retail_default_fee: '25', retail_tax_rate: '0.10'}).total, 27.5);
});
test('retail calculations use saved tax and fee including zero tax', () => {
  const item = { category: 'material', qty: 2, unitPrice: 100 };
  assert.equal(calculateRetailPricing([item], {...retailDefaults({retail_default_fee: 25, retail_tax_rate: 0.1}), items: []}).total, 247.5);
  assert.equal(calculateRetailPricing([item], {...retailDefaults({retail_tax_rate: 0}), items: []}).total, 200);
});
test('legacy retail fee is preserved and fee items are not counted twice', () => {
  const fee = { category: 'fee', qty: 1, unitPrice: 50 };
  const estimate = { items: [fee], subtotalFees: 400, taxRate: 0.0825 };
  const result = calculateRetailPricing([fee], estimate);
  assert.equal(result.baseFee, 350);
  assert.equal(result.subtotalFees, 400);
  assert.equal(result.total, 433);
});
