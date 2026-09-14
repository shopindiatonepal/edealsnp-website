// Total discount is derived from each item's original_price (set only when
// it was bought at a sale price) vs what was actually charged — never
// hardcoded, always computed from the real order data.
export function calcDiscount(items) {
  return items.reduce((sum, i) => sum + (i.original_price ? (i.original_price - i.price) * i.qty : 0), 0);
}
