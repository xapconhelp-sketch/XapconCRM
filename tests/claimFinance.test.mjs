import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateClaimFinanceTotals,
  parseFinanceAmount,
  validateClaimFinanceAmounts,
  validateClaimFinancePayment,
} from "../src/lib/claimFinance.js";

test("parses blank finance fields as zero and preserves cents", () => {
  assert.equal(parseFinanceAmount(""), 0);
  assert.equal(parseFinanceAmount(" 1250.75 "), 1250.75);
});

test("validates claim amounts without treating notes as a money field", () => {
  assert.equal(validateClaimFinanceAmounts({
    rcv: "12500",
    acv: "9800",
    deductible: "1000",
    recoverable_depreciation: "2700",
    non_recoverable_depreciation: "0",
  }), null);

  assert.match(validateClaimFinanceAmounts({
    rcv: "-1",
    acv: "",
    deductible: "",
    recoverable_depreciation: "",
    non_recoverable_depreciation: "",
  }) || "", /mayores que cero/);
});

test("requires positive payment amounts and a received date for collected payments", () => {
  assert.match(validateClaimFinancePayment({ amount: "0", status: "expected" }) || "", /mayor que cero/);
  assert.match(validateClaimFinancePayment({ amount: "2250", status: "received" }) || "", /fecha/);
  assert.equal(validateClaimFinancePayment({ amount: "2250.50", status: "received", received_date: "2026-09-30" }), null);
});

test("separates expected and received totals", () => {
  assert.deepEqual(calculateClaimFinanceTotals([
    { status: "received", amount: 3000 },
    { status: "expected", amount: "1250.50" },
    { status: "received", amount: "750" },
  ]), { received: 3750, expected: 1250.5 });
});
