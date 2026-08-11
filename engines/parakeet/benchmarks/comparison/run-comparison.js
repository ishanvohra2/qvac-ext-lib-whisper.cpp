#!/usr/bin/env node
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')
const {
  aggregateFleursResults,
  renderFleursMarkdown,
  wordErrorRate
} = require('./fleurs-results')

const COMPARISON_DIR = __dirname
const ENGINE_DIR = path.resolve(COMPARISON_DIR, '../..')
const REPOSITORY_DIR = path.resolve(ENGINE_DIR, '../..')
const WORKSPACE_DIR = path.resolve(REPOSITORY_DIR, '..')
const DEFAULT_MUDLER_DIR = path.join(WORKSPACE_DIR, 'mudler-parakeet.cpp')
const OUT_DIR = path.join(COMPARISON_DIR, 'out')
const MODELS_DIR = path.join(COMPARISON_DIR, 'models')
const SAMPLE_DIR = path.join(ENGINE_DIR, 'test', 'samples')
const FLEURS_MANIFEST = path.join(OUT_DIR, 'fleurs', 'manifest.json')

const MODEL_MAP = {
  tdt: {
    label: 'TDT 0.6B v3',
    decoder: 'tdt',
    qvac: 'parakeet-tdt-0.6b-v3.q8_0.gguf',
    mudler: 'tdt-0.6b-v3-q8_0.gguf'
  },
  ctc: {
    label: 'CTC 0.6B',
    decoder: 'ctc',
    qvac: 'parakeet-ctc-0.6b.q8_0.gguf',
    mudler: 'ctc-0.6b-q8_0.gguf'
  },
  eou: {
    label: 'EOU 120M v1',
    decoder: null,
    qvac: 'parakeet-eou-120m-v1.q8_0.gguf',
    mudler: 'realtime_eou_120m-v1-q8_0.gguf'
  }
}

const CLIPS = [
  {
    id: 'jfk',
    wav: path.join(SAMPLE_DIR, 'jfk.wav'),
    reference: 'And so my fellow Americans ask not what your country can do for you ask what you can do for your country'
  },
  {
    id: 'alice',
    wav: path.join(SAMPLE_DIR, 'sample-16k.wav'),
    reference: 'Alice was beginning to get very tired of sitting by her sister on the bank and of having nothing to do. Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it. And what is the use of a book thought Alice without pictures or conversations'
  }
]

function firstSet (...values) {
  return values.find(value => value !== undefined && value !== '')
}

function integerEnv (name, fallback) {
  const value = process.env[name]
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

function firstExisting (root, candidates) {
  return candidates.map(candidate => path.join(root, candidate))
    .find(candidate => fs.existsSync(candidate))
}

function defaultBackend () {
  return process.platform === 'darwin' ? 'Metal' : 'Vulkan'
}

function canonicalBackend (value) {
  const backend = String(value).toLowerCase()
  if (backend.includes('metal') || backend.includes('mtl')) return 'metal'
  if (backend.includes('vulkan') || backend.includes('vk')) return 'vulkan'
  if (backend.includes('opencl')) return 'opencl'
  if (backend.includes('cuda')) return 'cuda'
  if (backend.includes('cpu')) return 'cpu'
  return backend
}

function backendMatches (actual, expected) {
  return canonicalBackend(actual) === canonicalBackend(expected)
}

function parseArguments () {
  const flags = new Set(process.argv.slice(2))
  const known = new Set(['--help', '-h', '--dry-run', '--fleurs-only'])
  const unknown = [...flags].filter(flag => !known.has(flag))
  if (unknown.length) throw new Error(`unknown argument: ${unknown.join(', ')}`)
  return {
    help: flags.has('--help') || flags.has('-h'),
    dryRun: flags.has('--dry-run'),
    fleursOnly: flags.has('--fleurs-only') || process.env.PARAKEET_FLEURS_ONLY === '1'
  }
}

function makeConfig () {
  const mudlerDir = path.resolve(firstSet(
    process.env.PARAKEET_MUDLER_DIR,
    process.env.MUDLER_PARAKEET_DIR,
    DEFAULT_MUDLER_DIR
  ))
  const qvacCli = path.resolve(firstSet(
    process.env.PARAKEET_QVAC_CLI,
    process.env.QVAC_PARAKEET_CLI,
    firstExisting(ENGINE_DIR, [
      'build/parakeet',
      'build/bin/parakeet',
      'build/Release/parakeet',
      'build/src/parakeet',
      'build-metal/parakeet',
      'build-metal/bin/parakeet',
      'build-vulkan/parakeet',
      'build-vulkan/bin/parakeet',
      'build-vk/parakeet',
      'build-vk/bin/parakeet'
    ]) || path.join(ENGINE_DIR, 'build', 'parakeet')
  ))
  const mudlerCli = path.resolve(firstSet(
    process.env.PARAKEET_MUDLER_CLI,
    process.env.MUDLER_PARAKEET_CLI,
    firstExisting(mudlerDir, [
      'build/examples/cli/parakeet-cli',
      'build/bin/parakeet-cli',
      'build/parakeet-cli',
      'build/Release/parakeet-cli'
    ]) || path.join(mudlerDir, 'build', 'examples', 'cli', 'parakeet-cli')
  ))
  const qvacBackend = process.env.PARAKEET_QVAC_BACKEND || defaultBackend()
  const mudlerBackend = process.env.PARAKEET_MUDLER_BACKEND || defaultBackend()
  const modelNames = (process.env.PARAKEET_COMPARE_MODELS || 'tdt,ctc,eou')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
  const unknownModels = modelNames.filter(model => !MODEL_MAP[model])
  if (unknownModels.length) throw new Error(`unknown model(s): ${unknownModels.join(', ')}`)

  return {
    engineDir: ENGINE_DIR,
    mudlerDir,
    qvacCli,
    mudlerCli,
    qvacModels: path.resolve(process.env.PARAKEET_QVAC_MODELS_DIR || path.join(MODELS_DIR, 'qvac')),
    mudlerModels: path.resolve(process.env.PARAKEET_MUDLER_MODELS_DIR || path.join(MODELS_DIR, 'mudler')),
    outDir: path.resolve(process.env.PARAKEET_COMPARE_OUT_DIR || OUT_DIR),
    fleursManifest: path.resolve(process.env.PARAKEET_FLEURS_MANIFEST || FLEURS_MANIFEST),
    fleursUseGpu: process.env.PARAKEET_FLEURS_GPU !== 'false',
    models: modelNames,
    runs: integerEnv('PARAKEET_COMPARE_RUNS', 5),
    warmups: 1,
    threads: integerEnv('PARAKEET_COMPARE_THREADS', 4),
    quant: 'q8_0',
    gpuModes: process.env.PARAKEET_COMPARE_GPU === 'false'
      ? [false]
      : process.env.PARAKEET_COMPARE_GPU === 'true' ? [true] : [false, true],
    qvacBackend,
    mudlerBackend,
    mudlerDevice: process.env.PARAKEET_MUDLER_DEVICE ||
      (canonicalBackend(mudlerBackend) === 'metal'
        ? 'MTL0'
        : canonicalBackend(mudlerBackend) === 'vulkan' ? 'Vulkan0' : mudlerBackend),
    allowBackendMismatch: process.env.PARAKEET_ALLOW_BACKEND_MISMATCH === '1'
  }
}

function printHelp (config) {
  console.log(`Parakeet direct engine comparison

Usage:
  node run-comparison.js [--dry-run]
  node run-comparison.js --fleurs-only [--dry-run]
  node run-comparison.js --help

Modes:
  --dry-run      Print discovery status without running model inference.
  --fleurs-only  Run TDT over out/fleurs/manifest.json (GPU by default).

Current configuration:
  QVAC engine root:  ${config.engineDir}
  QVAC CLI:          ${config.qvacCli}
  QVAC models:       ${config.qvacModels}
  mudler root:       ${config.mudlerDir}
  mudler CLI:        ${config.mudlerCli}
  mudler models:     ${config.mudlerModels}
  FLEURS manifest:   ${config.fleursManifest}
  output:            ${config.outDir}
  models:            ${config.models.join(', ')}
  quant:             ${config.quant}
  threads/runs:      ${config.threads}/${config.runs}
  warmups:           ${config.warmups} (mudler bench is fixed at one)
  GPU backends:      QVAC=${config.qvacBackend}, mudler=${config.mudlerBackend}

Primary environment variables:
  PARAKEET_QVAC_CLI, PARAKEET_QVAC_MODELS_DIR, PARAKEET_QVAC_BACKEND
  PARAKEET_MUDLER_DIR, PARAKEET_MUDLER_CLI, PARAKEET_MUDLER_MODELS_DIR
  PARAKEET_MUDLER_BACKEND, PARAKEET_MUDLER_DEVICE
  PARAKEET_COMPARE_MODELS, PARAKEET_COMPARE_RUNS, PARAKEET_COMPARE_THREADS
  PARAKEET_COMPARE_GPU=true|false, PARAKEET_COMPARE_OUT_DIR
  PARAKEET_FLEURS_GPU=false, PARAKEET_FLEURS_MANIFEST, PARAKEET_FLEURS_ONLY=1
  PARAKEET_ALLOW_BACKEND_MISMATCH=1
`)
}

function fileStatus (label, file) {
  const exists = fs.existsSync(file)
  console.log(`  ${exists ? 'found  ' : 'missing'} ${label}: ${file}`)
  return exists
}

function loadFleursManifest (manifestPath) {
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  if (!Array.isArray(raw) || !raw.length) {
    throw new Error('FLEURS manifest must be a non-empty JSON array')
  }
  const manifestDir = path.dirname(manifestPath)
  return raw.map((item, index) => {
    if (!item || !item.id || !item.lang || !item.name || !item.wav || !item.reference) {
      throw new Error(`FLEURS manifest item ${index} is missing id, lang, name, wav, or reference`)
    }
    return {
      ...item,
      wav: path.isAbsolute(item.wav) ? item.wav : path.resolve(manifestDir, item.wav)
    }
  })
}

function validateBackendConfig (config, useGpu, checks) {
  if (!useGpu) {
    console.log('  CPU    FLEURS backend: both engines forced to CPU')
    return
  }
  const backendsMatch = backendMatches(config.qvacBackend, config.mudlerBackend)
  console.log(`  ${backendsMatch ? 'match  ' : 'differ '} GPU backends: QVAC=${config.qvacBackend}, mudler=${config.mudlerBackend}`)
  if (!backendsMatch && !config.allowBackendMismatch) {
    checks.push(false)
    console.log('  blocked backend mismatch; set matching labels or PARAKEET_ALLOW_BACKEND_MISMATCH=1')
  }
}

function validateFleursConfig (config) {
  console.log('FLEURS discovery:')
  const model = MODEL_MAP.tdt
  const checks = [
    fileStatus('QVAC CLI', config.qvacCli),
    fileStatus('mudler CLI', config.mudlerCli),
    fileStatus('QVAC tdt', path.join(config.qvacModels, model.qvac)),
    fileStatus('mudler tdt', path.join(config.mudlerModels, model.mudler)),
    fileStatus('FLEURS manifest', config.fleursManifest)
  ]
  if (fs.existsSync(config.fleursManifest)) {
    try {
      const manifest = loadFleursManifest(config.fleursManifest)
      console.log(`  found   FLEURS entries: ${manifest.length}`)
      const missingWavs = manifest.filter(item => !fs.existsSync(item.wav))
      for (const item of missingWavs) console.log(`  missing FLEURS WAV ${item.id}: ${item.wav}`)
      checks.push(missingWavs.length === 0)
      console.log(`  ${missingWavs.length ? 'missing' : 'found  '} FLEURS WAVs: ${manifest.length - missingWavs.length}/${manifest.length}`)
    } catch (error) {
      checks.push(false)
      console.log(`  invalid FLEURS manifest: ${error.message}`)
    }
  }
  validateBackendConfig(config, config.fleursUseGpu, checks)
  console.log(`Ready for FLEURS inference: ${checks.every(Boolean) ? 'yes' : 'no'}`)
  return checks.every(Boolean)
}

function validateConfig (config) {
  console.log('Discovery:')
  const checks = [
    fileStatus('QVAC CLI', config.qvacCli),
    fileStatus('mudler CLI', config.mudlerCli),
    ...CLIPS.map(clip => fileStatus(`clip ${clip.id}`, clip.wav))
  ]
  for (const modelName of config.models) {
    const model = MODEL_MAP[modelName]
    checks.push(fileStatus(`QVAC ${modelName}`, path.join(config.qvacModels, model.qvac)))
    checks.push(fileStatus(`mudler ${modelName}`, path.join(config.mudlerModels, model.mudler)))
  }
  validateBackendConfig(config, config.gpuModes.includes(true), checks)
  console.log(`Ready for inference: ${checks.every(Boolean) ? 'yes' : 'no'}`)
  return checks.every(Boolean)
}

function runProcess (executable, args, options, description) {
  const result = spawnSync(executable, args, {
    ...options,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').slice(-4000)
    throw new Error(`${description} failed (exit ${result.status})\n${detail}`)
  }
  return result
}

function stats (values) {
  const sorted = [...values].sort((left, right) => left - right)
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length
  const variance = sorted.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / sorted.length
  return {
    count: sorted.length,
    mean,
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdev: Math.sqrt(variance),
    samples: sorted
  }
}

function runQvac (config, modelName, useGpu) {
  const model = MODEL_MAP[modelName]
  const results = {}
  for (const clip of CLIPS) {
    const output = path.join(config.outDir, `qvac-${modelName}-${useGpu ? 'gpu' : 'cpu'}-${clip.id}.json`)
    const args = [
      '--model', path.join(config.qvacModels, model.qvac),
      '--wav', clip.wav,
      '--threads', String(config.threads),
      '--n-gpu-layers', useGpu ? '1' : '0',
      '--bench',
      '--bench-runs', String(config.runs),
      '--bench-warmup', String(config.warmups),
      '--bench-json', output
    ]
    runProcess(config.qvacCli, args, { cwd: config.engineDir, env: process.env }, `QVAC ${modelName}/${clip.id}`)
    const data = JSON.parse(fs.readFileSync(output, 'utf8'))
    if (useGpu && !backendMatches(data.backend, config.qvacBackend)) {
      throw new Error(`QVAC reported ${data.backend}, expected ${config.qvacBackend}`)
    }
    results[clip.id] = {
      backend: data.backend,
      audioSeconds: data.audio_seconds,
      processingMs: stats(data.inference_ms.samples),
      transcript: data.transcript
    }
  }
  return results
}

function runMudler (config, modelName, useGpu) {
  const model = MODEL_MAP[modelName]
  const manifest = path.join(config.outDir, `mudler-${modelName}-${useGpu ? 'gpu' : 'cpu'}.txt`)
  const output = path.join(config.outDir, `mudler-${modelName}-${useGpu ? 'gpu' : 'cpu'}.json`)
  const manifestLines = []
  for (const clip of CLIPS) {
    for (let run = 0; run < config.runs; run++) manifestLines.push(clip.wav)
  }
  fs.writeFileSync(manifest, `${manifestLines.join('\n')}\n`)
  const args = [
    'bench',
    '--model', path.join(config.mudlerModels, model.mudler),
    '--manifest', manifest,
    '--threads', String(config.threads),
    '--json', output
  ]
  if (model.decoder) args.push('--decoder', model.decoder)
  const env = { ...process.env, PARAKEET_DEVICE: useGpu ? config.mudlerDevice : 'cpu' }
  const execution = runProcess(
    config.mudlerCli,
    args,
    { cwd: config.mudlerDir, env },
    `mudler ${modelName}`
  )
  const runtimeLog = `${execution.stdout}\n${execution.stderr}`
  if (useGpu && /falling back to CPU/i.test(runtimeLog)) {
    throw new Error(`mudler rejected PARAKEET_DEVICE=${config.mudlerDevice} and fell back to CPU`)
  }
  const data = JSON.parse(fs.readFileSync(output, 'utf8'))
  const results = {}
  for (const item of data.files) {
    const clip = CLIPS.find(candidate => path.resolve(candidate.wav) === path.resolve(item.path))
    if (!clip) continue
    if (!results[clip.id]) {
      results[clip.id] = {
        backend: useGpu ? config.mudlerBackend : 'CPU',
        audioSeconds: item.audio_sec,
        processingValues: [],
        transcript: item.text
      }
    }
    results[clip.id].processingValues.push(item.proc_ms)
    results[clip.id].transcript = item.text
  }
  for (const result of Object.values(results)) {
    result.processingMs = stats(result.processingValues)
    delete result.processingValues
  }
  return results
}

function safeName (value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '_')
}

function runFleursQvac (config, manifest) {
  const model = MODEL_MAP.tdt
  const modelPath = path.join(config.qvacModels, model.qvac)
  const outputDir = path.join(config.outDir, `fleurs-qvac-${config.fleursUseGpu ? 'gpu' : 'cpu'}`)
  fs.mkdirSync(outputDir, { recursive: true })
  const results = new Map()
  for (const item of manifest) {
    const output = path.join(outputDir, `${safeName(item.id)}.json`)
    let data = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : null
    const cacheMatches = data &&
      path.resolve(data.model) === path.resolve(modelPath) &&
      path.resolve(data.wav) === path.resolve(item.wav) &&
      data.threads === config.threads &&
      data.n_gpu_layers === (config.fleursUseGpu ? 1 : 0) &&
      (!config.fleursUseGpu || backendMatches(data.backend, config.qvacBackend))
    if (!cacheMatches) {
      const args = [
        '--model', modelPath,
        '--wav', item.wav,
        '--threads', String(config.threads),
        '--n-gpu-layers', config.fleursUseGpu ? '1' : '0',
        '--bench',
        '--bench-runs', '1',
        '--bench-warmup', '1',
        '--bench-json', output
      ]
      runProcess(config.qvacCli, args, { cwd: config.engineDir, env: process.env }, `QVAC FLEURS ${item.id}`)
      data = JSON.parse(fs.readFileSync(output, 'utf8'))
    }
    if (config.fleursUseGpu && !backendMatches(data.backend, config.qvacBackend)) {
      throw new Error(`QVAC reported ${data.backend}, expected ${config.qvacBackend}`)
    }
    results.set(path.resolve(item.wav), {
      backend: data.backend,
      audioSeconds: data.audio_seconds,
      processingMs: data.inference_ms.samples[0],
      transcript: data.transcript
    })
  }
  return results
}

function runFleursMudler (config, manifest) {
  const model = MODEL_MAP.tdt
  const backend = config.fleursUseGpu ? 'gpu' : 'cpu'
  const manifestPath = path.join(config.outDir, `fleurs-mudler-${backend}-manifest.txt`)
  const output = path.join(config.outDir, `fleurs-mudler-${backend}.json`)
  fs.writeFileSync(manifestPath, `${manifest.map(item => item.wav).join('\n')}\n`)
  const args = [
    'bench',
    '--model', path.join(config.mudlerModels, model.mudler),
    '--manifest', manifestPath,
    '--threads', String(config.threads),
    '--decoder', 'tdt',
    '--json', output
  ]
  const env = {
    ...process.env,
    PARAKEET_DEVICE: config.fleursUseGpu ? config.mudlerDevice : 'cpu'
  }
  const execution = runProcess(
    config.mudlerCli,
    args,
    { cwd: config.mudlerDir, env },
    'mudler FLEURS'
  )
  const runtimeLog = `${execution.stdout}\n${execution.stderr}`
  if (config.fleursUseGpu && /falling back to CPU/i.test(runtimeLog)) {
    throw new Error(`mudler rejected PARAKEET_DEVICE=${config.mudlerDevice} and fell back to CPU`)
  }
  const data = JSON.parse(fs.readFileSync(output, 'utf8'))
  return new Map(data.files.map(item => [
    path.resolve(item.path),
    {
      backend: config.fleursUseGpu ? config.mudlerBackend : 'CPU',
      audioSeconds: item.audio_sec,
      processingMs: item.proc_ms,
      transcript: item.text
    }
  ]))
}

function buildFleursResults (manifest, qvacResults, mudlerResults) {
  return manifest.map(item => {
    const key = path.resolve(item.wav)
    const qvac = qvacResults.get(key)
    const mudler = mudlerResults.get(key)
    if (!qvac || !mudler) throw new Error(`missing engine result for FLEURS item ${item.id}`)
    return {
      id: item.id,
      lang: item.lang,
      name: item.name,
      wav: item.wav,
      reference: item.reference,
      audioSeconds: qvac.audioSeconds,
      qvac: {
        ...qvac,
        rtf: qvac.processingMs / 1000 / qvac.audioSeconds,
        wer: wordErrorRate(item.reference, qvac.transcript)
      },
      mudler: {
        ...mudler,
        rtf: mudler.processingMs / 1000 / mudler.audioSeconds,
        wer: wordErrorRate(item.reference, mudler.transcript)
      }
    }
  })
}

function writeFleursReports (config, results) {
  const platform = `${process.platform}-${process.arch}`
  const backend = config.fleursUseGpu ? config.qvacBackend : 'CPU'
  const backendSlug = safeName(backend.toLowerCase())
  const backendMatch = !config.fleursUseGpu ||
    config.qvacBackend.toLowerCase() === config.mudlerBackend.toLowerCase()
  const data = {
    meta: {
      generatedAt: new Date().toISOString(),
      platform,
      hostname: os.hostname(),
      quant: config.quant,
      threads: config.threads,
      timedRunsPerUtterance: 1,
      qvacWarmupPerUtterance: 1,
      mudlerWarmupAfterLoad: 1,
      backend,
      backendMatch,
      qvacBackend: config.fleursUseGpu ? config.qvacBackend : 'CPU',
      mudlerBackend: config.fleursUseGpu ? config.mudlerBackend : 'CPU',
      qvacCli: config.qvacCli,
      mudlerCli: config.mudlerCli,
      manifest: config.fleursManifest
    },
    summary: aggregateFleursResults(results),
    utterances: results
  }
  const jsonPath = path.join(config.outDir, `fleurs-comparison-data-${platform}-${backendSlug}.json`)
  const markdownPath = path.join(config.outDir, `fleurs-report-${platform}-${backendSlug}.md`)
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`)
  fs.writeFileSync(markdownPath, renderFleursMarkdown(data))
  console.log(`Wrote ${jsonPath}`)
  console.log(`Wrote ${markdownPath}`)
}

function runFleursComparison (config) {
  const manifest = loadFleursManifest(config.fleursManifest)
  console.log(`Comparing TDT on ${manifest.length} FLEURS utterances (${config.fleursUseGpu ? config.qvacBackend : 'CPU'})`)
  const qvacResults = runFleursQvac(config, manifest)
  const mudlerResults = runFleursMudler(config, manifest)
  writeFleursReports(config, buildFleursResults(manifest, qvacResults, mudlerResults))
}

function compare (config) {
  const rows = []
  for (const modelName of config.models) {
    for (const useGpu of config.gpuModes) {
      console.log(`Comparing ${modelName} on ${useGpu ? config.qvacBackend : 'CPU'}`)
      const qvac = runQvac(config, modelName, useGpu)
      const mudler = runMudler(config, modelName, useGpu)
      for (const clip of CLIPS) {
        const qvacResult = qvac[clip.id]
        const mudlerResult = mudler[clip.id]
        rows.push({
          model: modelName,
          modelLabel: MODEL_MAP[modelName].label,
          backend: useGpu ? config.qvacBackend : 'CPU',
          backendMatch: !useGpu || config.qvacBackend.toLowerCase() === config.mudlerBackend.toLowerCase(),
          clip: clip.id,
          audioSeconds: qvacResult.audioSeconds,
          qvac: {
            ...qvacResult,
            rtf: qvacResult.processingMs.mean / 1000 / qvacResult.audioSeconds,
            wer: wordErrorRate(clip.reference, qvacResult.transcript)
          },
          mudler: {
            ...mudlerResult,
            rtf: mudlerResult.processingMs.mean / 1000 / mudlerResult.audioSeconds,
            wer: wordErrorRate(clip.reference, mudlerResult.transcript)
          },
          agreementWer: wordErrorRate(qvacResult.transcript, mudlerResult.transcript)
        })
      }
    }
  }
  return rows
}

function formatNumber (value, digits = 3) {
  return Number(value).toFixed(digits)
}

function renderMarkdown (data) {
  const lines = [
    '# Parakeet direct engine comparison',
    '',
    `Generated: ${data.meta.generatedAt}`,
    '',
    `Platform: \`${data.meta.platform}\`; quant: \`${data.meta.quant}\`; threads: ${data.meta.threads}; warmups: ${data.meta.warmups}; timed runs: ${data.meta.runs}.`,
    '',
    'Both CLIs use the same checkpoint family, q8_0 quantization, canonical WAV, thread count, warmup count, and timed repetitions. Each engine uses its native incompatible GGUF schema. Timings exclude model loading; QVAC also excludes WAV reading, and mudler starts timing after its WAV has been loaded.',
    '',
    '| Model | Backend | Clip | Engine | Mean ms | RTF | WER |',
    '|---|---|---|---|---:|---:|---:|'
  ]
  for (const row of data.rows) {
    lines.push(`| ${row.modelLabel} | ${row.backend}${row.backendMatch ? '' : ' (override mismatch)'} | ${row.clip} | QVAC | ${formatNumber(row.qvac.processingMs.mean, 1)} | ${formatNumber(row.qvac.rtf)} | ${formatNumber(row.qvac.wer * 100, 1)}% |`)
    lines.push(`| ${row.modelLabel} | ${row.backend}${row.backendMatch ? '' : ' (override mismatch)'} | ${row.clip} | mudler | ${formatNumber(row.mudler.processingMs.mean, 1)} | ${formatNumber(row.mudler.rtf)} | ${formatNumber(row.mudler.wer * 100, 1)}% |`)
  }
  lines.push('', 'Raw samples, transcripts, runtime backend labels, and agreement WER are in the adjacent JSON file.', '')
  return lines.join('\n')
}

function writeReports (config, rows) {
  const platform = `${process.platform}-${process.arch}`
  const data = {
    meta: {
      generatedAt: new Date().toISOString(),
      platform,
      hostname: os.hostname(),
      quant: config.quant,
      threads: config.threads,
      warmups: config.warmups,
      runs: config.runs,
      qvacCli: config.qvacCli,
      mudlerCli: config.mudlerCli,
      qvacBackend: config.qvacBackend,
      mudlerBackend: config.mudlerBackend
    },
    rows
  }
  const jsonPath = path.join(config.outDir, `comparison-data-${platform}.json`)
  const markdownPath = path.join(config.outDir, `report-${platform}.md`)
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`)
  fs.writeFileSync(markdownPath, renderMarkdown(data))
  console.log(`Wrote ${jsonPath}`)
  console.log(`Wrote ${markdownPath}`)
}

function main () {
  const args = parseArguments()
  const config = makeConfig()
  if (args.help) {
    printHelp(config)
    return
  }
  printHelp(config)
  const ready = args.fleursOnly ? validateFleursConfig(config) : validateConfig(config)
  if (args.dryRun) return
  if (!ready) throw new Error('comparison configuration is incomplete; run with --dry-run for discovery details')
  fs.mkdirSync(config.outDir, { recursive: true })
  if (args.fleursOnly) {
    runFleursComparison(config)
    return
  }
  writeReports(config, compare(config))
}

try {
  main()
} catch (error) {
  console.error(`error: ${error.message}`)
  process.exitCode = 1
}
