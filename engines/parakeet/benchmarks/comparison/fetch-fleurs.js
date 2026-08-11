#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const OUTPUT_DIR = path.join(__dirname, 'out', 'fleurs')
const CLIP_DIR = path.join(OUTPUT_DIR, 'clips')
const SAMPLE_RATE = 16000
const BASE_URL = 'https://huggingface.co/datasets/google/fleurs/resolve/main/data'
const DEFAULT_COUNT = 12

const LANGUAGES = [
  { config: 'bg_bg', id: 'bg', name: 'Bulgarian' },
  { config: 'hr_hr', id: 'hr', name: 'Croatian' },
  { config: 'cs_cz', id: 'cs', name: 'Czech' },
  { config: 'da_dk', id: 'da', name: 'Danish' },
  { config: 'nl_nl', id: 'nl', name: 'Dutch' },
  { config: 'en_us', id: 'en', name: 'English' },
  { config: 'et_ee', id: 'et', name: 'Estonian' },
  { config: 'fi_fi', id: 'fi', name: 'Finnish' },
  { config: 'fr_fr', id: 'fr', name: 'French' },
  { config: 'de_de', id: 'de', name: 'German' },
  { config: 'el_gr', id: 'el', name: 'Greek' },
  { config: 'hu_hu', id: 'hu', name: 'Hungarian' },
  { config: 'it_it', id: 'it', name: 'Italian' },
  { config: 'lv_lv', id: 'lv', name: 'Latvian' },
  { config: 'lt_lt', id: 'lt', name: 'Lithuanian' },
  { config: 'mt_mt', id: 'mt', name: 'Maltese' },
  { config: 'pl_pl', id: 'pl', name: 'Polish' },
  { config: 'pt_br', id: 'pt', name: 'Portuguese' },
  { config: 'ro_ro', id: 'ro', name: 'Romanian' },
  { config: 'ru_ru', id: 'ru', name: 'Russian' },
  { config: 'sk_sk', id: 'sk', name: 'Slovak' },
  { config: 'sl_si', id: 'sl', name: 'Slovenian' },
  { config: 'es_419', id: 'es', name: 'Spanish' },
  { config: 'sv_se', id: 'sv', name: 'Swedish' },
  { config: 'uk_ua', id: 'uk', name: 'Ukrainian' }
]

function printHelp () {
  console.log(`Fetch a labelled FLEURS subset as canonical 16 kHz mono PCM16 WAV.

Usage:
  node fetch-fleurs.js [utterances-per-language]

Environment:
  FLEURS_LANGS=fr,es,hr   comma-separated language IDs (default: all 25)

This command downloads dataset files only. It does not download or execute code.
The full default selection is approximately 4-5 GB.
`)
}

function run (command, args, description) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  if (result.status !== 0) {
    throw new Error(`${description} failed: ${result.stderr || result.stdout}`)
  }
  return result.stdout
}

function download (url, output) {
  if (fs.existsSync(output)) return
  console.log(`Downloading ${path.basename(output)}`)
  run('curl', ['--fail', '--location', '--continue-at', '-', '--output', output, url], `download ${url}`)
}

function parseReferences (tsvPath) {
  const references = new Map()
  for (const line of fs.readFileSync(tsvPath, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const columns = line.split('\t')
    if (columns.length >= 4) references.set(columns[1], columns[3])
  }
  return references
}

function readWav (wavPath) {
  const buffer = fs.readFileSync(wavPath)
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  let offset = 12
  let format = 1
  let channels = 1
  let bits = 16
  let dataOffset = -1
  let dataLength = 0
  while (offset + 8 <= buffer.byteLength) {
    const id = view.getUint32(offset, false)
    const size = view.getUint32(offset + 4, true)
    const body = offset + 8
    if (id === 0x666d7420) {
      format = view.getUint16(body, true)
      channels = view.getUint16(body + 2, true)
      bits = view.getUint16(body + 14, true)
    } else if (id === 0x64617461) {
      dataOffset = body
      dataLength = size
    }
    offset = body + size + (size & 1)
  }
  if (dataOffset < 0) throw new Error(`no WAV data chunk: ${wavPath}`)
  const bytesPerSample = bits / 8
  const frames = Math.floor(dataLength / bytesPerSample / channels)
  const output = new Int16Array(frames)
  function sampleAt (sampleOffset) {
    if (format === 1 && bits === 16) return view.getInt16(sampleOffset, true)
    if (format === 3 && bits === 32) {
      return Math.max(-32768, Math.min(32767, Math.round(view.getFloat32(sampleOffset, true) * 32767)))
    }
    throw new Error(`unsupported WAV format=${format}, bits=${bits}: ${wavPath}`)
  }
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0
    for (let channel = 0; channel < channels; channel++) {
      sum += sampleAt(dataOffset + ((frame * channels + channel) * bytesPerSample))
    }
    output[frame] = Math.max(-32768, Math.min(32767, Math.round(sum / channels)))
  }
  return output
}

function writeWav (samples, output) {
  const dataLength = samples.length * 2
  const header = Buffer.alloc(44)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + dataLength, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(dataLength, 40)
  const body = Buffer.from(samples.buffer, samples.byteOffset, dataLength)
  fs.writeFileSync(output, Buffer.concat([header, body]))
}

function selectLanguages () {
  const requested = (process.env.FLEURS_LANGS || '').split(',').map(value => value.trim()).filter(Boolean)
  if (!requested.length) return LANGUAGES
  const selected = LANGUAGES.filter(language => requested.includes(language.id))
  const missing = requested.filter(id => !selected.some(language => language.id === id))
  if (missing.length) throw new Error(`unknown FLEURS language IDs: ${missing.join(', ')}`)
  return selected
}

function fetchLanguage (language, count) {
  const tsvPath = path.join(OUTPUT_DIR, `${language.config}.dev.tsv`)
  const archivePath = path.join(OUTPUT_DIR, `${language.config}.dev.tar.gz`)
  download(`${BASE_URL}/${language.config}/dev.tsv`, tsvPath)
  download(`${BASE_URL}/${language.config}/audio/dev.tar.gz`, archivePath)
  const references = parseReferences(tsvPath)
  const members = new Map()
  for (const member of run('tar', ['-tzf', archivePath], `list ${archivePath}`).split('\n')) {
    if (member.endsWith('.wav')) members.set(path.basename(member), member)
  }
  const selected = []
  for (const [filename, reference] of references) {
    if (selected.length >= count) break
    const member = members.get(filename)
    if (member && reference.trim()) selected.push({ filename, reference, member })
  }
  const extractDir = path.join(OUTPUT_DIR, `${language.config}.extract`)
  fs.mkdirSync(extractDir, { recursive: true })
  run('tar', ['-xzf', archivePath, '-C', extractDir, ...selected.map(item => item.member)], `extract ${archivePath}`)
  return selected.map((item, index) => {
    const samples = readWav(path.join(extractDir, item.member))
    const wav = path.join(CLIP_DIR, `${language.id}_${index}.wav`)
    writeWav(samples, wav)
    return {
      id: `${language.id}_${index}`,
      lang: language.id,
      name: language.name,
      wav,
      reference: item.reference,
      audioSeconds: samples.length / SAMPLE_RATE
    }
  })
}

function main () {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp()
    return
  }
  const count = Number.parseInt(process.argv[2] || String(DEFAULT_COUNT), 10)
  if (!Number.isInteger(count) || count < 1) throw new Error('utterance count must be a positive integer')
  fs.mkdirSync(CLIP_DIR, { recursive: true })
  const manifest = []
  for (const language of selectLanguages()) {
    console.log(`Preparing ${language.name} (${language.id})`)
    manifest.push(...fetchLanguage(language, count))
  }
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json')
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Wrote ${manifestPath}`)
}

try {
  main()
} catch (error) {
  console.error(`error: ${error.message}`)
  process.exitCode = 1
}
