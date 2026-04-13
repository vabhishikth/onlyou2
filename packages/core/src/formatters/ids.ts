export function formatSampleId(year: number, seq: number): string {
  return `ONY-${year}-${seq.toString().padStart(4, '0')}`
}
export function formatOrderId(seq: number): string {
  return `ORD-${seq.toString().padStart(6, '0')}`
}
export function formatPatientId(seq: number): string {
  return `ONY-P-${seq.toString().padStart(4, '0')}`
}
