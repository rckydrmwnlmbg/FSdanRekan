#!/usr/bin/env node
/**
 * Build and package Next.js standalone bundle for Biznet Gio cPanel (Personal Large - 1 GB RAM).
 * Produces:
 *   - dist-deploy/         (clean production directory)
 *   - fsdanrekan-deploy.zip (ready to upload via cPanel File Manager -> Extract)
 *
 * Strictly excludes: devDependencies, tests/, .git/, .env*, cms_state.json, and Python preview scripts.
 */

import { execSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = process.cwd()
const DIST_DIR = resolve(ROOT, 'dist-deploy')
const ZIP_PATH = resolve(ROOT, 'fsdanrekan-deploy.zip')
const STANDALONE_DIR = resolve(ROOT, '.next', 'standalone')
const STATIC_DIR = resolve(ROOT, '.next', 'static')

const FORBIDDEN_NAMES = new Set([
  '.git',
  '.github',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'tests',
  'playwright-report',
  'test-results',
  'coverage',
  'cms_state.json',
  'dist-deploy',
  'fsdanrekan-deploy.zip',
])

function shouldCopyPath(srcPath) {
  const norm = srcPath.replace(/\\/g, '/')
  const parts = norm.split('/')
  const base = parts[parts.length - 1]
  if (FORBIDDEN_NAMES.has(base)) return false
  if (base.startsWith('.env') && base !== '.env.example') return false
  if (base.endsWith('.py') || base.endsWith('.pyc') || base === '__pycache__') return false
  // Exclude OS-specific native sharp/libvips binaries so bundle is 100% OS-independent pure JS for Linux cPanel
  if (
    norm.includes('/node_modules/@img') ||
    norm.includes('/node_modules/sharp') ||
    base.endsWith('.dll') ||
    base.endsWith('.node') ||
    base.endsWith('.exe')
  ) {
    return false
  }
  return true
}

function main() {
  const skipBuild = process.argv.includes('--skip-build')

  if (!skipBuild || !existsSync(join(STANDALONE_DIR, 'server.js'))) {
    console.log('[package:deploy] Menjalankan next build (output: standalone)...')
    execSync('npm run build', {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
      },
    })
  }

  if (!existsSync(join(STANDALONE_DIR, 'server.js'))) {
    console.error(
      '[package:deploy] Gagal menemukan .next/standalone/server.js. Pastikan output: "standalone" aktif di next.config.ts.',
    )
    process.exit(1)
  }

  console.log('[package:deploy] Membersihkan folder dist-deploy dan fsdanrekan-deploy.zip lama...')
  if (existsSync(DIST_DIR)) {
    rmSync(DIST_DIR, { recursive: true, force: true })
  }
  if (existsSync(ZIP_PATH)) {
    rmSync(ZIP_PATH, { force: true })
  }
  mkdirSync(DIST_DIR, { recursive: true })

  console.log('[package:deploy] Menyalin bundle .next/standalone...')
  cpSync(STANDALONE_DIR, DIST_DIR, {
    recursive: true,
    filter: (src) => shouldCopyPath(src),
  })

  // Rename Next's generated server.js -> standalone-server.js and install Passenger wrapper server.js
  const nextStandaloneServer = join(DIST_DIR, 'server.js')
  const renamedStandaloneServer = join(DIST_DIR, 'standalone-server.js')
  if (existsSync(nextStandaloneServer)) {
    renameSync(nextStandaloneServer, renamedStandaloneServer)
  }
  cpSync(join(ROOT, 'server.js'), join(DIST_DIR, 'server.js'))

  // Copy .next/static -> dist-deploy/.next/static
  if (existsSync(STATIC_DIR)) {
    console.log('[package:deploy] Menyalin aset statis .next/static...')
    const targetStatic = join(DIST_DIR, '.next', 'static')
    mkdirSync(targetStatic, { recursive: true })
    cpSync(STATIC_DIR, targetStatic, { recursive: true })
  }

  // Copy public/ -> dist-deploy/public/ (excluding public/uploads)
  const publicDir = join(ROOT, 'public')
  if (existsSync(publicDir)) {
    console.log('[package:deploy] Menyalin folder public/...')
    const targetPublic = join(DIST_DIR, 'public')
    mkdirSync(targetPublic, { recursive: true })
    cpSync(publicDir, targetPublic, {
      recursive: true,
      filter: (src) => {
        const norm = src.replace(/\\/g, '/')
        if (norm.endsWith('/public/uploads') || norm.includes('/public/uploads/')) return false
        return shouldCopyPath(src)
      },
    })
  }

  // Copy content/*.json -> dist-deploy/content/
  const contentDir = join(ROOT, 'content')
  if (existsSync(contentDir)) {
    console.log('[package:deploy] Menyalin seed JSON content/...')
    const targetContent = join(DIST_DIR, 'content')
    mkdirSync(targetContent, { recursive: true })
    for (const file of readdirSync(contentDir)) {
      if (file.endsWith('.json')) {
        cpSync(join(contentDir, file), join(targetContent, file))
      }
    }
  }

  // Generate and copy database/schema.sql + database/phpmyadmin_bootstrap.sql
  console.log('[package:deploy] Membuat database/phpmyadmin_bootstrap.sql (jalur tanpa terminal)...')
  execSync('node scripts/generate_phpmyadmin_sql.mjs', { cwd: ROOT, stdio: 'inherit' })
  const schemaFile = join(ROOT, 'database', 'schema.sql')
  const bootstrapSqlFile = join(ROOT, 'database', 'phpmyadmin_bootstrap.sql')
  if (existsSync(schemaFile)) {
    console.log('[package:deploy] Menyalin database/schema.sql & phpmyadmin_bootstrap.sql...')
    mkdirSync(join(DIST_DIR, 'database'), { recursive: true })
    cpSync(schemaFile, join(DIST_DIR, 'database', 'schema.sql'))
    if (existsSync(bootstrapSqlFile)) {
      cpSync(bootstrapSqlFile, join(DIST_DIR, 'database', 'phpmyadmin_bootstrap.sql'))
    }
  }

  // Copy scripts/migrate_mysql.mjs -> dist-deploy/scripts/migrate_mysql.mjs
  const migrateScript = join(ROOT, 'scripts', 'migrate_mysql.mjs')
  if (existsSync(migrateScript)) {
    console.log('[package:deploy] Menyalin scripts/migrate_mysql.mjs...')
    mkdirSync(join(DIST_DIR, 'scripts'), { recursive: true })
    cpSync(migrateScript, join(DIST_DIR, 'scripts', 'migrate_mysql.mjs'))
  }

  // Copy .env.example -> dist-deploy/.env.example
  const envExample = join(ROOT, '.env.example')
  if (existsSync(envExample)) {
    cpSync(envExample, join(DIST_DIR, '.env.example'))
  }

  // Ensure empty uploads directory exists
  const uploadsDir = join(DIST_DIR, 'uploads')
  mkdirSync(uploadsDir, { recursive: true })
  writeFileSync(join(uploadsDir, '.gitkeep'), '', 'utf8')

  // Create fsdanrekan-deploy.zip for one-click upload in cPanel File Manager
  console.log('[package:deploy] Membuat arsip fsdanrekan-deploy.zip...')
  try {
    if (process.platform === 'win32') {
      execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path '${DIST_DIR}\\*' -DestinationPath '${ZIP_PATH}' -Force"`,
        { stdio: 'inherit' },
      )
    } else {
      execSync(`cd "${DIST_DIR}" && zip -rq "${ZIP_PATH}" .`, { stdio: 'inherit' })
    }
  } catch (err) {
    console.warn(
      '[package:deploy] Peringatan: pembuatan file .zip gagal, namun folder dist-deploy/ sudah siap diunggah.',
      err instanceof Error ? err.message : err,
    )
  }

  const zipSizeMb = existsSync(ZIP_PATH)
    ? (statSync(ZIP_PATH).size / (1024 * 1024)).toFixed(2)
    : null

  console.log('------------------------------------------------------------')
  console.log('[package:deploy] Paket deploy produksi berhasil dibuat!')
  console.log(`  Folder siap upload : ${DIST_DIR}`)
  if (zipSizeMb) {
    console.log(`  Arsip ZIP cPanel   : ${ZIP_PATH} (${zipSizeMb} MB)`)
  }
  console.log('------------------------------------------------------------')
}

main()

