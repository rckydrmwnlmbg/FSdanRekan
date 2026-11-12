import { describe, expect, it } from 'vitest'
import {
  cleanWordOrDocsHtml,
  convertPlainTextToFormattedHtml,
} from '../src/lib/editor-cleaner'
import { cleanHtml } from '../src/lib/security/sanitize'

describe('Visual Article Editor Paste Cleaner & Plain Text Converter', () => {
  it('cleans Microsoft Word pasted HTML (mso styles, spans, font colors, comments, xml)', () => {
    const wordHtml = `
      <!--[if gte mso 9]><xml><w:WordDocument><w:View>Normal</w:View></w:WordDocument></xml><![endif]-->
      <p class="MsoNormal" style="margin-bottom:0cm;line-height:normal;font-size:12pt;font-family:'Calibri',sans-serif">
        <span style="font-size:14.0pt;font-weight:bold;color:#1F497D">I. LATAR BELAKANG PERKARA</span>
        <o:p></o:p>
      </p>
      <p class="MsoNormal" style="margin-bottom:0cm;line-height:normal;font-size:11pt;color:black">
        Berdasarkan <span style="font-style:italic">Undang-Undang Perseroan Terbatas</span>, setiap <b>anggaran dasar</b> wajib didaftarkan.
      </p>
    `

    const cleaned = cleanWordOrDocsHtml(wordHtml)

    // Verify mso and comments stripped
    expect(cleaned).not.toContain('MsoNormal')
    expect(cleaned).not.toContain('font-family')
    expect(cleaned).not.toContain('color:#1F497D')
    expect(cleaned).not.toContain('WordDocument')

    // Verify semantic tags preserved
    expect(cleaned).toContain('<strong>I. LATAR BELAKANG PERKARA</strong>')
    expect(cleaned).toContain('<em>Undang-Undang Perseroan Terbatas</em>')
    expect(cleaned).toContain('<strong>anggaran dasar</strong>')

    // Verify server-side sanitization compatibility
    const serverCleaned = cleanHtml(cleaned)
    expect(serverCleaned).toContain('<strong>anggaran dasar</strong>')
  })

  it('cleans Google Docs pasted HTML (dir="ltr", inline background-colors, pre-wrap)', () => {
    const docsHtml = `
      <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">
        <span style="font-size:11pt;font-family:Arial;color:#000000;background-color:transparent;font-weight:700;font-style:normal;text-decoration:none;">
          Tinjauan Yuridis
        </span>
      </p>
      <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">
        <span style="font-size:11pt;font-family:Arial;color:#333333;">
          Hubungan hukum antara advokat dan klien dilandasi asas saling percaya dan kode etik profesi.
        </span>
      </p>
    `

    const cleaned = cleanWordOrDocsHtml(docsHtml)
    expect(cleaned).not.toContain('dir="ltr"')
    expect(cleaned).not.toContain('background-color:transparent')
    expect(cleaned).not.toContain('font-family:Arial')
    expect(cleaned).toContain('<strong>Tinjauan Yuridis</strong>')
    expect(cleaned).toContain('<p>Hubungan hukum antara advokat dan klien dilandasi asas saling percaya dan kode etik profesi.</p>')
  })

  it('converts plain text with Roman numerals and lettered headings into semantic headings', () => {
    const plainText = `
I. PENDAHULUAN

Hukum perseroan di Indonesia mengalami perkembangan pesat.

A. DASAR HUKUM
Ketentuan mengenai perseroan terbatas diatur dalam undang-undang terkait.

B. PRINSIP TANGGUNG JAWAB
Direksi bertanggung jawab penuh atas pengurusan perseroan.
    `

    const html = convertPlainTextToFormattedHtml(plainText)
    expect(html).toContain('<h2>I. PENDAHULUAN</h2>')
    expect(html).toContain('<p>Hukum perseroan di Indonesia mengalami perkembangan pesat.</p>')
    expect(html).toContain('<h3>A. DASAR HUKUM</h3>')
    expect(html).toContain('<h3>B. PRINSIP TANGGUNG JAWAB</h3>')
  })

  it('converts plain text with numbered items into ordered lists (<ol><li>)', () => {
    const plainText = `
Syarat pendirian perseroan:
1. Akta pendirian oleh Notaris
2. Surat Keputusan Kemenkumham
3. Nomor Induk Berusaha (NIB)

Setelah ketiga syarat terpenuhi, operasional dapat dimulai.
    `

    const html = convertPlainTextToFormattedHtml(plainText)
    expect(html).toContain('<p>Syarat pendirian perseroan:</p>')
    expect(html).toContain('<ol><li>Akta pendirian oleh Notaris</li><li>Surat Keputusan Kemenkumham</li><li>Nomor Induk Berusaha (NIB)</li></ol>')
    expect(html).toContain('<p>Setelah ketiga syarat terpenuhi, operasional dapat dimulai.</p>')
  })

  it('converts plain text bullet lists into unordered lists (<ul><li>)', () => {
    const plainText = `
Dokumen yang diperlukan:
- KTP para pendiri
* NPWP pribadi pemegang saham
• Surat keterangan domisili usaha
    `

    const html = convertPlainTextToFormattedHtml(plainText)
    expect(html).toContain('<ul><li>KTP para pendiri</li><li>NPWP pribadi pemegang saham</li><li>Surat keterangan domisili usaha</li></ul>')
  })

  it('converts plain text blockquotes (> ...) into blockquotes', () => {
    const plainText = `
> Keadilan hukum harus dapat dirasakan oleh seluruh lapisan masyarakat tanpa diskriminasi.

Pernyataan di atas merupakan landasan integritas penanganan perkara.
    `

    const html = convertPlainTextToFormattedHtml(plainText)
    expect(html).toContain('<blockquote>Keadilan hukum harus dapat dirasakan oleh seluruh lapisan masyarakat tanpa diskriminasi.</blockquote>')
    expect(html).toContain('<p>Pernyataan di atas merupakan landasan integritas penanganan perkara.</p>')
  })

  it('preserves old articles HTML without breakage and safely passes server sanitization', () => {
    const legacyArticleHtml = `
      <h2>Aspek Hukum Perjanjian Bisnis</h2>
      <p>Perjanjian yang sah mengikat para pihak sebagaimana undang-undang (Pasal 1338 KUHPerdata).</p>
      <ul>
        <li>Kesepakatan mereka yang mengikatkan dirinya</li>
        <li>Kecakapan untuk membuat suatu perikatan</li>
        <li>Suatu pokok persoalan tertentu</li>
        <li>Suatu sebab yang tidak terlarang</li>
      </ul>
      <blockquote>Penting untuk melakukan due diligence hukum sebelum penandatanganan kontrak komersial.</blockquote>
      <p>Kunjungi <a href="https://fsdanrekan.com/layanan">Layanan Hukum Kami</a> untuk konsultasi lebih lanjut.</p>
    `

    // When loaded into the cleaner, it must retain its structure
    const cleaned = cleanWordOrDocsHtml(legacyArticleHtml)
    expect(cleaned).toContain('<h2>Aspek Hukum Perjanjian Bisnis</h2>')
    expect(cleaned).toContain('<ul>')
    expect(cleaned).toContain('<li>Kesepakatan mereka yang mengikatkan dirinya</li>')
    expect(cleaned).toContain('<blockquote>Penting untuk melakukan due diligence hukum sebelum penandatanganan kontrak komersial.</blockquote>')
    expect(cleaned).toContain('<a href="https://fsdanrekan.com/layanan">Layanan Hukum Kami</a>')

    // Server-side sanitization verification
    const sanitized = cleanHtml(cleaned)
    expect(sanitized).toContain('rel="noopener noreferrer nofollow"')
    expect(sanitized).toContain('target="_blank"')
  })
})

