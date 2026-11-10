#!/usr/bin/env node
/**
 * Build and package Next.js standalone bundle for Biznet Gio cPanel (Personal Large - 1 GB RAM).
 * Produces:
 *   - dist-deploy/          (clean production directory)
 *   - fsdanrekan-deploy.zip (ready to upload via cPanel File Manager -> Extract)
 *
 * Key cPanel CloudLinux Node.js Selector design:
 *   1. Renames standalone `node_modules` -> `app_modules` so there is NO `node_modules` folder
 *      in the zip root that would conflict with CloudLinux's `nodevenv` symlink.
 *   2. Uses POSIX forward slashes (`/`) for all ZIP entries so Linux `unzip` in cPanel extracts
 *      every nested file (`app_modules/next/dist/server/next.js`, `.next/BUILD_ID`, etc.) cleanly.
 *   3. Strips OS-specific native binaries (`@img/sharp-*`, `.node`, `.dll`, `.exe`) so the bundle
 *      is 100% pure JavaScript across Windows & Linux (Node 24.22.1 and fallback Node 20.20.2).
 */

import { execSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
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

function readZipEntryNames(zipFilePath) {
  const buf = readFileSync(zipFilePath)
  let offset = 0
  const names = []
  while (offset < buf.length - 4) {
    if (
      buf[offset] === 0x50 &&
      buf[offset + 1] === 0x4b &&
      buf[offset + 2] === 0x01 &&
      buf[offset + 3] === 0x02
    ) {
      const nameLen = buf.readUInt16LE(offset + 28)
      const extraLen = buf.readUInt16LE(offset + 30)
      const commentLen = buf.readUInt16LE(offset + 32)
      const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen)
      names.push(name)
      offset += 46 + nameLen + extraLen + commentLen
    } else {
      offset++
    }
  }
  return names
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

  // Rename dist-deploy/node_modules -> dist-deploy/app_modules to avoid CloudLinux nodevenv symlink collision
  const standaloneNodeModules = join(DIST_DIR, 'node_modules')
  const targetAppModules = join(DIST_DIR, 'app_modules')
  if (existsSync(standaloneNodeModules)) {
    console.log(
      '[package:deploy] Mengubah nama node_modules -> app_modules (anti bentrok symlink CloudLinux nodevenv)...',
    )
    renameSync(standaloneNodeModules, targetAppModules)
  }

  // Rename Next's generated server.js -> standalone-server.js and install Passenger wrapper server.js
  const nextStandaloneServer = join(DIST_DIR, 'server.js')
  const renamedStandaloneServer = join(DIST_DIR, 'standalone-server.js')
  if (existsSync(nextStandaloneServer)) {
    renameSync(nextStandaloneServer, renamedStandaloneServer)
  }
  cpSync(join(ROOT, 'server.js'), join(DIST_DIR, 'server.js'))

  // Prepare runtime-only package.json in dist-deploy/package.json (Option c backup)
  const rootPkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const runtimePkg = {
    name: rootPkg.name,
    version: rootPkg.version,
    private: true,
    description: rootPkg.description,
    scripts: {
      start: 'node server.js',
      'db:migrate': 'node scripts/migrate_mysql.mjs',
    },
    dependencies: rootPkg.dependencies,
    engines: rootPkg.engines,
  }
  writeFileSync(join(DIST_DIR, 'package.json'), JSON.stringify(runtimePkg, null, 2) + '\n', 'utf8')

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

  // Create fsdanrekan-deploy.zip using bsdtar (POSIX forward slashes) for Linux cPanel extraction
  console.log('[package:deploy] Membuat arsip fsdanrekan-deploy.zip (format POSIX / Linux)...')
  const topEntries = readdirSync(DIST_DIR)
  const quotedEntries = topEntries.map((item) => `"${item}"`).join(' ')
  if (process.platform === 'win32') {
    execSync(`tar.exe -a -c -f "${ZIP_PATH}" -C "${DIST_DIR}" ${quotedEntries}`, {
      stdio: 'inherit',
    })
  } else {
    execSync(`cd "${DIST_DIR}" && zip -rq "${ZIP_PATH}" .`, { stdio: 'inherit' })
  }

  // Verify ZIP integrity for Linux cPanel
  const zipNames = readZipEntryNames(ZIP_PATH)
  const backslashCount = zipNames.filter((n) => n.includes('\\')).length
  const hasRootNodeModules = zipNames.some(
    (n) => n === 'node_modules' || n.startsWith('node_modules/'),
  )
  const hasNextServer = zipNames.includes('app_modules/next/dist/server/next.js')
  const hasMysql2 = zipNames.includes('app_modules/mysql2/promise.js')
  const hasNodemailer =
    zipNames.includes('app_modules/nodemailer/dist/cjs/nodemailer.js') ||
    zipNames.includes('app_modules/nodemailer/package.json')
  const hasBuildId = zipNames.includes('.next/BUILD_ID')

  if (
    backslashCount > 0 ||
    hasRootNodeModules ||
    !hasNextServer ||
    !hasMysql2 ||
    !hasNodemailer ||
    !hasBuildId
  ) {
    console.error('[package:deploy] Verifikasi integritas ZIP gagal:', {
      backslashCount,
      hasRootNodeModules,
      hasNextServer,
      hasMysql2,
      hasNodemailer,
      hasBuildId,
    })
    process.exit(1)
  }

  const zipSizeMb = (statSync(ZIP_PATH).size / (1024 * 1024)).toFixed(2)

  console.log('------------------------------------------------------------')
  console.log('[package:deploy] Paket deploy produksi berhasil dibuat & diverifikasi!')
  console.log(`  Folder siap upload : ${DIST_DIR}`)
  console.log(`  Arsip ZIP cPanel   : ${ZIP_PATH} (${zipSizeMb} MB, ${zipNames.length} entries)`)
  console.log('  Verifikasi Linux   : 0 backslash, 0 root node_modules, app_modules/next siap')
  console.log('------------------------------------------------------------')
}

main()
