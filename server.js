#!/usr/bin/env node
/**
 * Entry point for cPanel Setup Node.js App (Phusion Passenger) — Biznet Gio Personal Large
 * Reads PORT and HOSTNAME from environment and boots the Next.js standalone server.
 */

const fs = require('node:fs')
const path = require('node:path')

function loadDotEnvIfPresent() {
  const envPath = path.join(__dirname, '.env')
  if (!fs.existsSync(envPath)) return
  try {
    const raw = fs.readFileSync(envPath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const idx = trimmed.indexOf('=')
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = val
      }
    }
  } catch {
    // Ignore .env parse errors; cPanel environment variables take precedence
  }
}

loadDotEnvIfPresent()

process.env.NODE_ENV = process.env.NODE_ENV || 'production'
process.env.PORT = String(process.env.PORT || 3000)
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0'

const packagedStandalone = path.join(__dirname, 'standalone-server.js')
const buildStandalone = path.join(__dirname, '.next', 'standalone', 'server.js')

if (fs.existsSync(packagedStandalone)) {
  require(packagedStandalone)
} else if (fs.existsSync(buildStandalone)) {
  require(buildStandalone)
} else {
  console.error(
    '[FS dan Rekan] Build standalone tidak ditemukan. Jalankan "npm run package:deploy" terlebih dahulu.',
  )
  process.exit(1)
}

