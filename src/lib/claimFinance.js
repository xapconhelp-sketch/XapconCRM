/** @typedef {"expected" | "received"} ClaimFinancePaymentStatus */

/**
 * @typedef {object} ClaimFinanceAmounts
 * @property {string} rcv
 * @property {string} acv
 * @property {string} deductible
 * @property {string} recoverable_depreciation
 * @property {string} non_recoverable_depreciation
 */

/**
 * @typedef {object} ClaimFinancePayment
 * @property {ClaimFinancePaymentStatus} status
 * @property {number | string} amount
 */

/** @param {string} value */
export function parseFinanceAmount(value) {
  return value.trim() ? Number(value) : 0;
}

/** @param {ClaimFinanceAmounts} amounts */
export function validateClaimFinanceAmounts(amounts) {
  const values = [
    amounts.rcv,
    amounts.acv,
    amounts.deductible,
    amounts.recoverable_depreciation,
    amounts.non_recoverable_depreciation,
  ];
  return values.some((value) => value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0))
    ? "Revisa los montos: usa números iguales o mayores que cero."
    : null;
}

/** @param {{ amount: string, status: ClaimFinancePaymentStatus, received_date?: string | null }} payment */
export function validateClaimFinancePayment(payment) {
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Ingresa un monto mayor que cero.";
  if (payment.status === "received" && !payment.received_date) return "Indica la fecha en que se recibió el pago.";
  return null;
}

/** @param {ClaimFinancePayment[]} payments */
export function calculateClaimFinanceTotals(payments) {
  return payments.reduce((totals, payment) => {
    const amount = Number(payment.amount) || 0;
    if (payment.status === "received") totals.received += amount;
    else totals.expected += amount;
    return totals;
  }, { received: 0, expected: 0 });
}
