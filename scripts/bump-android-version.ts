#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const buildGradle = resolve(root, 'app', 'android', 'app', 'build.gradle')

const gradle = readFileSync(buildGradle, 'utf8')
const codeMatch = gradle.match(/versionCode\s+(\d+)/)
const nameMatch = gradle.match(/versionName\s+"([^"]+)"/)
if (!codeMatch || !nameMatch) {
  throw new Error(`versionCode/versionName não encontrados em ${buildGradle}`)
}

const bump = process.argv[2] ?? 'patch'
if (!['patch', 'minor', 'major'].includes(bump)) {
  throw new Error(`Bump inválido: ${bump} (use patch, minor ou major)`)
}

const oldCode = Number.parseInt(codeMatch[1], 10)
const [major = 0, minor = 0, patch = 0] = nameMatch[1].split('.').map(Number)
const newCode = oldCode + 1

let nextMajor = major
let nextMinor = minor
let nextPatch = patch
if (bump === 'major') nextMajor += 1
else if (bump === 'minor') nextMinor += 1
else nextPatch += 1
const newName = `${nextMajor}.${nextMinor}.${nextPatch}`

const updated = gradle.replace(/versionCode\s+\d+/, `versionCode ${newCode}`).replace(/versionName\s+"[^"]+"/, `versionName "${newName}"`)
writeFileSync(buildGradle, updated)
console.log(`versionCode ${oldCode} → ${newCode}`)
console.log(`versionName ${nameMatch[1]} → ${newName}`)
