export const ADVANCE_PERCENT = 50;

// Given an order's total and how it was paid, work out what was actually
// paid and what (if anything) is still due — used consistently in checkout,
// My Orders, and admin so the math is never repeated or hardcoded per view.
export function calcPaymentAmounts(total, paymentMethod, paymentType) {
  if (paymentMethod === "cod") {
    return { label: "Cash on delivery", paid: 0, due: total };
  }
  if (paymentType === "advance") {
    const paid = Math.ceil((total * ADVANCE_PERCENT) / 100);
    return { label: `Advance payment (${ADVANCE_PERCENT}%)`, paid, due: total - paid };
  }
  return { label: "Full payment", paid: total, due: 0 };
}
