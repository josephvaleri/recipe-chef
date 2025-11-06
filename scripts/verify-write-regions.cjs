// scripts/verify-write-regions.cjs
const fs = require('fs')
const path = require('path')

const ROOT = process.cwd() // run from repo root
const API_DIR = path.join(ROOT, 'src', 'app', 'api')

const files = []
function walk(p) {
  if (!fs.existsSync(p)) return
  const ents = fs.readdirSync(p, { withFileTypes: true })
  for (const e of ents) {
    const full = path.join(p, e.name)
    if (e.isDirectory()) walk(full)
    else if (/route\.(t|j)sx?$/.test(e.name)) files.push(full)
  }
}
walk(API_DIR)

function read(file) { return fs.readFileSync(file, 'utf8') }

const report = files.map((file) => {
  const code = read(file)
  const methods = []
  if (/export\s+async\s+function\s+POST\b/.test(code)) methods.push('POST')
  if (/export\s+async\s+function\s+PUT\b/.test(code)) methods.push('PUT')
  if (/export\s+async\s+function\s+PATCH\b/.test(code)) methods.push('PATCH')
  if (/export\s+async\s+function\s+DELETE\b/.test(code)) methods.push('DELETE')
  const hasGet = /export\s+async\s+function\s+GET\b/.test(code)
  const mutPattern = /\.from\([\s\S]*?\)\s*\.(insert|update|upsert|delete)\b|\/\/\s*mutate|\/\*.*mutate.*\*\//i
  const isMutatingGet = hasGet && mutPattern.test(code)

  const write = methods.length > 0 || isMutatingGet
  const usesNodeApis = /(from 'fs'|from "fs"|require\(['"]fs['"]\)|from 'path'|require\(['"]path['"]\)|child_process|zlib|stream|sharp|nodemailer|crypto\.createHash|crypto\.createHmac)/.test(code)
  const runtimeEdge = write && !usesNodeApis

  const hasPreferredRegion = /export\s+const\s+preferredRegion\s*=\s*\[['"`]iad1['"`]\]/.test(code)
  const runtime =
    /export\s+const\s+runtime\s*=\s*['"`]edge['"`]/.test(code) ? 'edge' :
    /export\s+const\s+runtime\s*=\s*['"`]nodejs['"`]/.test(code) ? 'nodejs' : 'unspecified'

  const dynamicNoCache = /export\s+const\s+dynamic\s*=\s*['"`]force-dynamic['"`]/.test(code)
  const revalidateZero = /export\s+const\s+revalidate\s*=\s*0\b/.test(code)

  return {
    file: file.replace(ROOT + path.sep, ''),
    write,
    methods: methods.length ? methods : (isMutatingGet ? ['GET(mutating)'] : []),
    runtimeDetected: runtimeEdge ? 'edge' : (write ? 'nodejs' : 'n/a'),
    runtimeExport: runtime,
    preferredRegion: hasPreferredRegion,
    dynamicForce: dynamicNoCache,
    revalidateZero
  }
})

console.log(JSON.stringify({ apiDir: API_DIR.replace(ROOT + path.sep, ''), count: report.length, report }, null, 2))

