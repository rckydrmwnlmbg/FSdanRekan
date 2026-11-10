#!/usr/bin/env node
/**
 * Entry point for cPanel Setup Node.js App (CloudLinux Phusion Passenger) — Biznet Gio Personal Large
 *
 * Why `app_modules`:
 * CloudLinux Node.js Selector automatically replaces `<app_root>/node_modules` with a symlink to
 * `/home/<user>/nodevenv/<app_root>/<version>/lib/node_modules`. To prevent cPanel from clobbering
 * Next.js standalone dependencies, `npm run package:deploy` bundles all production modules inside
 * `<app_root>/app_modules` (with zero `node_modules` folder in the zip) and registers `app_modules`
 * into Node's module resolution paths before booting Next.js.
 */

const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')

const APP_ROOT = __dirname
const APP_MODULES_DIR = path.join(APP_ROOT, 'app_modules')
const FALLBACK_STANDALONE_MODULES_DIR = path.join(APP_ROOT, '.next', 'standalone', 'node_modules')
const ROOT_NODE_MODULES_DIR = path.join(APP_ROOT, 'node_modules')

function registerCustomModulePaths() {
  const candidateDirs = [
    APP_MODULES_DIR,
    FALLBACK_STANDALONE_MODULES_DIR,
    ROOT_NODE_MODULES_DIR,
  ].filter((dir) => fs.existsSync(dir))

  const existingNodePath = process.env.NODE_PATH
    ? process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
    : []

  const mergedNodePath = [...new Set([...candidateDirs, ...existingNodePath])]
  process.env.NODE_PATH = mergedNodePath.join(path.delimiter)

  if (typeof Module._initPaths === 'function') {
    Module._initPaths()
  }

  const originalNodeModulePaths = Module._nodeModulePaths
  Module._nodeModulePaths = function patchedNodeModulePaths(from) {
    const paths = originalNodeModulePaths.call(this, from)
    for (let i = candidateDirs.length - 1; i >= 0; i--) {
      const dir = candidateDirs[i]
      if (!paths.includes(dir)) {
        paths.unshift(dir)
      }
    }
    return paths
  }
}

function loadDotEnvIfPresent() {
  const envPath = path.join(APP_ROOT, '.env')
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
  } catch (err) {
    console.error('[FS dan Rekan] Peringatan: gagal membaca file .env lokal:', err.message)
  }
}

function verifyCriticalModulesOrExit() {
  const searchedDirs = [APP_MODULES_DIR, FALLBACK_STANDALONE_MODULES_DIR, ROOT_NODE_MODULES_DIR]
  const requiredModules = [
    { name: 'next/dist/server/next.js', label: 'Next.js Server Core' },
    { name: 'next/dist/server/lib/start-server.js', label: 'Next.js Standalone StartServer' },
    { name: 'react', label: 'React Runtime' },
    { name: 'mysql2/promise', label: 'MySQL2 Database Driver' },
    { name: 'nodemailer', label: 'Nodemailer SMTP Client' },
  ]

  const missing = []
  for (const mod of requiredModules) {
    try {
      require.resolve(mod.name, { paths: searchedDirs })
    } catch {
      missing.push(mod)
    }
  }

  const buildIdPath = path.join(APP_ROOT, '.next', 'BUILD_ID')
  const buildIdExists = fs.existsSync(buildIdPath)

  if (missing.length > 0 || !buildIdExists) {
    console.error('====================================================================')
    console.error('[FS dan Rekan] FATAL STARTUP ERROR: Modul atau artefak build tidak ditemukan!')
    console.error(`  Working Directory (cwd) : ${process.cwd()}`)
    console.error(`  Application Root        : ${APP_ROOT}`)
    console.error(`  Node.js Version         : ${process.version}`)
    console.error('  Path modul yang dicari  :')
    for (const dir of searchedDirs) {
      let state = 'TIDAK ADA'
      if (fs.existsSync(dir)) {
        try {
          const lstat = fs.lstatSync(dir)
          state = lstat.isSymbolicLink()
            ? `ADA (Symlink -> ${fs.realpathSync(dir)})`
            : 'ADA (Folder fisik)'
        } catch {
          state = 'ADA'
        }
      }
      console.error(`    - ${dir} [${state}]`)
    }
    if (!buildIdExists) {
      console.error(`  Artefak .next/BUILD_ID  : TIDAK DITEMUKAN di ${buildIdPath}`)
      console.error(
        '  -> Pastikan folder tersembunyi ".next" ikut diekstrak ke dalam Application Root.',
      )
    }
    if (missing.length > 0) {
      console.error('  Modul yang gagal dimuat :')
      for (const m of missing) {
        console.error(`    - ${m.name} (${m.label})`)
      }
      console.error(
        '  -> Pastikan folder "app_modules" dari fsdanrekan-deploy.zip sudah diekstrak ke dalam Application Root.',
      )
    }
    console.error('====================================================================')
    process.exit(1)
  }
}

registerCustomModulePaths()
loadDotEnvIfPresent()

process.env.NODE_ENV = process.env.NODE_ENV || 'production'
process.env.PORT = String(process.env.PORT || 3000)
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0'

verifyCriticalModulesOrExit()

const packagedStandalone = path.join(APP_ROOT, 'standalone-server.js')
const buildStandalone = path.join(APP_ROOT, '.next', 'standalone', 'server.js')

if (fs.existsSync(packagedStandalone)) {
  require(packagedStandalone)
} else if (fs.existsSync(buildStandalone)) {
  require(buildStandalone)
} else {
  console.error(
    `[FS dan Rekan] FATAL: File server standalone tidak ditemukan di ${packagedStandalone} maupun ${buildStandalone}.`,
  )
  process.exit(1)
}
