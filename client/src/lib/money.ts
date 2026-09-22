/** Formats integer paise as a display INR amount, e.g. 49900 -> "₹499". */
export function formatPaise(amountPaise: number, currency = "INR"): string {
  const amount = amountPaise / 100;
  const hasFraction = amountPaise % 100 !== 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
