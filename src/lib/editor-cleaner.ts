/**
 * Visual Editor Cleaner & Paste Processor
 * Zero-dependency utility for cleaning pasted content from Word, Google Docs,
 * and converting plain text with smart paragraph/heading/list detection.
 */

/**
 * Clean HTML pasted from Microsoft Word, Google Docs, or other rich text applications.
 * Strips inline styles, classes, mso tags, and normalizes headings and formatting.
 */
export function cleanWordOrDocsHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return ''

  let html = rawHtml

  // 1. Remove XML declarations and Office-specific tags
  html = html.replace(/<\?xml[\s\S]*?\?>/gi, '')
  html = html.replace(/<o:p[\s\S]*?<\/o:p>/gi, '')
  html = html.replace(/<\/?o:[^>]*>/gi, '')
  html = html.replace(/<\/?w:[^>]*>/gi, '')
  html = html.replace(/<\/?m:[^>]*>/gi, '')

  // 2. Remove comments
  html = html.replace(/<!--[\s\S]*?-->/gi, '')

  // 3. Remove script and style blocks
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
  html = html.replace(/<style[\s\S]*?<\/style>/gi, '')
  html = html.replace(/<link[\s\S]*?>/gi, '')
  html = html.replace(/<meta[\s\S]*?>/gi, '')

  // 4. Convert styled bold and italic spans before stripping spans
  html = html.replace(
    /<span[^>]*style="[^"]*(font-weight:\s*(bold|700|800|900)|bolder)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    (m, _p1, _p2, inner: string) => `<strong>${inner.trim()}</strong>`,
  )
  html = html.replace(
    /<span[^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    (m, inner: string) => `<em>${inner.trim()}</em>`,
  )

  // 5. Convert <b> to <strong>, <i> to <em>
  html = html.replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '<strong>$1</strong>')
  html = html.replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, '<em>$1</em>')

  // 6. Normalize headings (h1 -> h2, h4/h5/h6 -> h3)
  html = html.replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '<h2>$1</h2>')
  html = html.replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, '<h3>$1</h3>')
  html = html.replace(/<h5\b[^>]*>([\s\S]*?)<\/h5>/gi, '<h3>$1</h3>')
  html = html.replace(/<h6\b[^>]*>([\s\S]*?)<\/h6>/gi, '<h3>$1</h3>')

  // 7. Remove all useless wrapper tags (span, font, center, div without content)
  html = html.replace(/<\/?(?:span|font|center)\b[^>]*>/gi, '')

  // 8. Clean attributes on allowed tags:
  // - Retain href and title on <a>
  // - Strip class, style, id, dir, lang, and all mso attributes on all other tags
  html = html.replace(/<([a-z0-9]+)([^>]*)>/gi, (match, tag: string, attrs: string) => {
    const lowerTag = tag.toLowerCase()

    if (lowerTag === 'a') {
      const hrefMatch = attrs.match(/\bhref="([^"]*)"/i) || attrs.match(/\bhref='([^']*)'/i)
      const titleMatch = attrs.match(/\btitle="([^"]*)"/i) || attrs.match(/\btitle='([^']*)'/i)
      const safeHref = hrefMatch ? ` href="${hrefMatch[1]}"` : ''
      const safeTitle = titleMatch ? ` title="${titleMatch[1]}"` : ''
      return `<a${safeHref}${safeTitle}>`
    }

    if (lowerTag === 'img') {
      const srcMatch = attrs.match(/\bsrc="([^"]*)"/i) || attrs.match(/\bsrc='([^']*)'/i)
      const altMatch = attrs.match(/\balt="([^"]*)"/i) || attrs.match(/\balt='([^']*)'/i)
      if (!srcMatch) return ''
      const safeSrc = ` src="${srcMatch[1]}"`
      const safeAlt = altMatch ? ` alt="${altMatch[1]}"` : ' alt=""'
      return `<img${safeSrc}${safeAlt}/>`
    }

    // Allowed tags without attributes: p, h2, h3, ul, ol, li, blockquote, strong, em, br
    const allowed = ['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'br']
    if (allowed.includes(lowerTag)) {
      return `<${lowerTag}>`
    }

    // Convert generic container tags (div, section, article) to paragraph if they carry text
    if (['div', 'section', 'article'].includes(lowerTag)) {
      return '<p>'
    }

    // Default: strip unrecognized tag
    return ''
  })

  // Close tags cleanup
  html = html.replace(/<\/([a-z0-9]+)>/gi, (match, tag: string) => {
    const lowerTag = tag.toLowerCase()
    const allowed = ['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'strong', 'em', 'a']
    if (allowed.includes(lowerTag)) {
      return `</${lowerTag}>`
    }
    if (['div', 'section', 'article'].includes(lowerTag)) {
      return '</p>'
    }
    return ''
  })

  // 9. Clean and trim content inside paragraph, heading, and list tags
  html = html.replace(/<(p|h2|h3|blockquote|li)>([\s\S]*?)<\/\1>/gi, (m, tag: string, inner: string) => {
    const trimmed = inner.replace(/^\s+|\s+$/g, '')
    return trimmed.length > 0 ? `<${tag}>${trimmed}</${tag}>` : ''
  })

  // 10. Clean empty tags like <p></p>, <p>&nbsp;</p>, <p><br></p>
  html = html.replace(/<p>\s*(?:&nbsp;|<br\s*\/?>|\s)*<\/p>/gi, '')
  html = html.replace(/<(strong|em)>\s*<\/\1>/gi, '')
  html = html.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br/><br/>')

  return html.trim()
}

/**
 * Smart plain-text converter.
 * Automatically converts unformatted pasted text into semantic HTML:
 * - Double newlines become paragraphs (<p>)
 * - Roman numerals (I., II.) or "BAB ..." become section titles (<h2>)
 * - Lettered headings (A., B. with caps) become subheadings (<h3>)
 * - Numbered items (1., 2.) become ordered lists (<ol><li>)
 * - Bullet items (-, *, •) become unordered lists (<ul><li>)
 * - Quote prefixes (>) become blockquotes (<blockquote>)
 */
export function convertPlainTextToFormattedHtml(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return ''

  const lines = rawText.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []

  let currentListType: 'ol' | 'ul' | null = null
  let currentListItems: string[] = []
  let currentParagraphLines: string[] = []

  function flushList() {
    if (currentListType && currentListItems.length > 0) {
      const itemsHtml = currentListItems.map((item) => `<li>${escapeText(item)}</li>`).join('')
      blocks.push(`<${currentListType}>${itemsHtml}</${currentListType}>`)
      currentListType = null
      currentListItems = []
    }
  }

  function flushParagraph() {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.map(escapeText).join('<br/>')
      blocks.push(`<p>${text}</p>`)
      currentParagraphLines = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Empty line acts as paragraph / block separator
    if (line.length === 0) {
      flushList()
      flushParagraph()
      continue
    }

    // 1. Detect Roman numeral section headings (e.g. "I. PENDAHULUAN" or "BAB I: KETENTUAN UMUM")
    const romanMatch = line.match(/^([IVXLCDM]+)\.\s+(.+)$/i)
    const babMatch = line.match(/^(BAB\s+[IVX0-9]+.*)$/i)
    if (romanMatch && romanMatch[1] && romanMatch[2]) {
      flushList()
      flushParagraph()
      const title = `${romanMatch[1].toUpperCase()}. ${romanMatch[2]}`
      blocks.push(`<h2>${escapeText(title)}</h2>`)
      continue
    }
    if (babMatch && babMatch[1]) {
      flushList()
      flushParagraph()
      blocks.push(`<h2>${escapeText(babMatch[1])}</h2>`)
      continue
    }

    // 2. Detect Lettered sub-headings (e.g. "A. LATAR BELAKANG" or "B. ANALISIS YURIDIS")
    const letterHeadingMatch = line.match(/^([A-Z])\.\s+([A-Z0-9\s/&,.-]{3,})$/)
    if (letterHeadingMatch) {
      flushList()
      flushParagraph()
      blocks.push(`<h3>${escapeText(line)}</h3>`)
      continue
    }

    // 3. Detect Ordered list items ("1. ", "2) ", etc.)
    const orderedMatch = line.match(/^(\d+)[\.\)]\s+(.+)$/)
    if (orderedMatch && orderedMatch[2]) {
      flushParagraph()
      if (currentListType !== 'ol') {
        flushList()
        currentListType = 'ol'
      }
      currentListItems.push(orderedMatch[2])
      continue
    }

    // 4. Detect Unordered list items ("- ", "* ", "• ")
    const unorderedMatch = line.match(/^[-*•]\s+(.+)$/)
    if (unorderedMatch && unorderedMatch[1]) {
      flushParagraph()
      if (currentListType !== 'ul') {
        flushList()
        currentListType = 'ul'
      }
      currentListItems.push(unorderedMatch[1])
      continue
    }

    // 5. Detect Blockquotes ("> ...")
    const quoteMatch = line.match(/^>\s*(.+)$/)
    if (quoteMatch && quoteMatch[1]) {
      flushList()
      flushParagraph()
      blocks.push(`<blockquote>${escapeText(quoteMatch[1])}</blockquote>`)
      continue
    }

    // 6. Regular text line
    flushList()
    currentParagraphLines.push(line)
  }

  flushList()
  flushParagraph()

  return blocks.join('')
}

/**
 * Basic entity escaping for safe plain-text conversion
 */
function escapeText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
