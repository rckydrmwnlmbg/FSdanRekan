import { z } from 'zod'

export const InquiryBodySchema = z
  .object({
    name: z
      .string({ required_error: 'Nama lengkap wajib diisi.' })
      .trim()
      .min(2, 'Nama lengkap minimal 2 karakter.')
      .max(100, 'Nama lengkap maksimal 100 karakter.'),
    email: z
      .string({ required_error: 'Alamat email wajib diisi.' })
      .trim()
      .toLowerCase()
      .email('Format alamat email tidak valid.')
      .max(254, 'Alamat email terlalu panjang.'),
    phone: z
      .string({ required_error: 'Nomor WhatsApp wajib diisi.' })
      .trim()
      .regex(/^\+?[0-9\s-]{8,16}$/, 'Nomor WhatsApp harus berupa 8–16 digit angka.'),
    practiceAreaId: z
      .string({ required_error: 'Bidang hukum wajib dipilih.' })
      .trim()
      .min(1, 'Bidang hukum wajib dipilih.')
      .max(64, 'Bidang hukum tidak valid.'),
    preferredDate: z
      .string({ required_error: 'Tanggal pilihan wajib diisi.' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
    sessionSlot: z.enum(['pagi', 'siang', 'sore'], {
      errorMap: () => ({ message: 'Sesi pertemuan wajib dipilih (pagi, siang, atau sore).' }),
    }),
    method: z.enum(['tatap-muka', 'daring'], {
      errorMap: () => ({ message: 'Metode pertemuan wajib dipilih (tatap muka atau daring).' }),
    }),
    summary: z
      .string({ required_error: 'Uraian singkat wajib diisi.' })
      .trim()
      .min(10, 'Uraian singkat minimal 10 karakter.')
      .max(1000, 'Uraian singkat maksimal 1000 karakter.'),
    consent: z.literal(true, {
      errorMap: () => ({
        message: 'Anda wajib menyetujui kebijakan pelindungan data pribadi.',
      }),
    }),
    website: z.string().max(0, 'Permintaan tidak valid.').optional(), // honeypot
    turnstileToken: z
      .string({ required_error: 'Verifikasi keamanan wajib diselesaikan.' })
      .min(1, 'Verifikasi keamanan wajib diselesaikan.')
      .max(2048, 'Token verifikasi tidak valid.'),
  })
  .strict()

export type InquiryBodyInput = z.infer<typeof InquiryBodySchema>
