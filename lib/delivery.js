// Rs 200 per kg of total parcel weight, rounded up, minimum one kg's charge.
// The customer only ever sees the final number as "Home delivery" — this
// calculation itself is never shown or explained to them.
export function calcDeliveryCharge(items) {
  const totalGrams = items.reduce((sum, i) => sum + (i.weight_grams || 200) * i.qty, 0);
  const kg = Math.max(1, Math.ceil(totalGrams / 1000));
  return kg * 200;
}
