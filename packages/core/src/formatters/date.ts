export function formatDate(ms: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }).format(new Date(ms))
}
export function formatDateShort(ms: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata',
  }).format(new Date(ms))
}
