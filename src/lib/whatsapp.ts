/**
 * SK-05 Single WhatsApp link builder & E.164 Indonesian phone number validator.
 */
export function waLink(e164Digits: string, message: string): string {
  const n = e164Digits.replace(/\D/g, '') // digits only, international format without '+'
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`
}

export function isValidIndonesianWaNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return /^62[1-9][0-9]{7,13}$/.test(digits)
}
