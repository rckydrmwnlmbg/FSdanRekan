import type { GlobalConfig } from 'payload'
import { isAdmin } from '@/lib/access'
import { OFFICIAL_ADDRESS, OFFICIAL_FIRM_NAME } from '@/lib/seo'
import { isValidIndonesianWaNumber } from '@/lib/whatsapp'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: () => true,
    update: isAdmin, // FR-6.2 & FR-6.6: Only admin can edit site settings
  },
  fields: [
    {
      name: 'firmName',
      type: 'text',
      required: true,
      defaultValue: OFFICIAL_FIRM_NAME,
    },
    {
      name: 'address',
      type: 'textarea',
      required: true,
      defaultValue: OFFICIAL_ADDRESS,
    },
    {
      name: 'whatsappNumber',
      type: 'text',
      required: true,
      defaultValue: '62811830991',
      validate: (value: unknown) => {
        if (typeof value !== 'string' || !isValidIndonesianWaNumber(value)) {
          return 'Nomor WhatsApp harus berformat internasional Indonesia 62... (hanya angka, 9-15 digit) sesuai SK-05.'
        }
        return true
      },
    },
    {
      name: 'defaultWaMessage',
      type: 'textarea',
      required: true,
      defaultValue: 'Halo FS dan Rekan, saya ingin konsultasi hukum.',
    },
    {
      name: 'inquiryRecipientEmail',
      type: 'email',
      required: true,
    },
    {
      name: 'instagramUrl',
      type: 'text',
    },
    {
      name: 'mapEmbedUrl',
      type: 'text',
    },
    {
      name: 'officeHours',
      type: 'group',
      fields: [
        { name: 'pagi', type: 'text', defaultValue: 'Pagi (09.30 – 12.00 WIB)' },
        { name: 'siang', type: 'text', defaultValue: 'Siang (13.30 – 15.30 WIB)' },
        { name: 'sore', type: 'text', defaultValue: 'Sore (16.00 – 18.00 WIB)' },
      ],
    },
  ],
}
