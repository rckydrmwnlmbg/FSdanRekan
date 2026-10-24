import pino from 'pino'

export const logger = pino({
  redact: {
    paths: [
      '*.email',
      '*.phone',
      '*.summary',
      '*.name',
      '*.visitorName',
      '*.visitorPhone',
      '*.text',
      'req.headers.cookie',
      'req.headers.authorization',
      '*.token',
      '*.turnstileToken',
      '*.password',
    ],
    censor: '[REDACTED]',
  },
})
