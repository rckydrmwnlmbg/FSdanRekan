import sanitizeHtml from 'sanitize-html'

export const cleanHtml = (dirty: string): string =>
  sanitizeHtml(dirty, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'h4',
      'blockquote',
      'a',
      'img',
      'hr',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['https', 'mailto'],
    allowedSchemesByTag: {
      img: ['https'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer nofollow',
        target: '_blank',
      }),
    },
  })

export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
