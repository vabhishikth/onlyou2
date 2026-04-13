export function formatRupees(paise: number): string {
  if (!Number.isFinite(paise) || !Number.isInteger(paise)) {
    throw new Error('formatRupees expects an integer paise value')
  }
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(rupees)
}
