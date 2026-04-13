export function formatPhoneIN(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const ten = digits.slice(2)
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`
  }
  return raw
}
