import { z } from 'zod'

/**
 * SK-11 & SEC-005 / SEC-006 / SEC-015:
 * Strict validation schema for the scripted Guided Chat Widget.
 * Does NOT accept free-form legal questions for automated AI answering (SEC-015).
 */
export const GuidedChatSchema = z
  .object({
    visitorName: z
      .string()
      .trim()
      .min(2, 'Nama lengkap minimal 2 karakter.')
      .max(100, 'Nama lengkap maksimal 100 karakter.'),
    visitorPhone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{8,16}$/, 'Nomor WhatsApp harus berupa 8–16 digit angka.'),
    practiceArea: z
      .string()
      .trim()
      .min(2, 'Bidang layanan wajib dipilih.')
      .max(120, 'Bidang layanan tidak valid.'),
    preferredSchedule: z
      .string()
      .trim()
      .min(2, 'Jadwal konsultasi wajib dipilih.')
      .max(120, 'Jadwal konsultasi tidak valid.'),
    notes: z
      .string()
      .trim()
      .max(300, 'Catatan singkat maksimal 300 karakter.')
      .optional(),
    consent: z.literal(true),
  })
  .strict()

export type GuidedChatInput = z.infer<typeof GuidedChatSchema>
