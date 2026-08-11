'use strict'

function words (text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    .split(/\s+/).filter(Boolean)
}

function wordErrorCounts (reference, hypothesis) {
  const expected = words(reference)
  const actual = words(hypothesis)
  const distance = Array.from({ length: expected.length + 1 }, () => new Array(actual.length + 1).fill(0))
  for (let row = 0; row <= expected.length; row++) distance[row][0] = row
  for (let column = 0; column <= actual.length; column++) distance[0][column] = column
  for (let row = 1; row <= expected.length; row++) {
    for (let column = 1; column <= actual.length; column++) {
      const replacement = expected[row - 1] === actual[column - 1] ? 0 : 1
      distance[row][column] = Math.min(
        distance[row - 1][column] + 1,
        distance[row][column - 1] + 1,
        distance[row - 1][column - 1] + replacement
      )
    }
  }
  return {
    edits: distance[expected.length][actual.length],
    referenceWords: expected.length
  }
}

function wordErrorRate (reference, hypothesis) {
  const counts = wordErrorCounts(reference, hypothesis)
  return counts.referenceWords ? counts.edits / counts.referenceWords : null
}

function timingStats (values) {
  const sorted = [...values].sort((left, right) => left - right)
  if (!sorted.length) return { count: 0, mean: null, median: null }
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
  return {
    count: sorted.length,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    median
  }
}

function emptyAggregate (name) {
  return {
    name,
    utterances: 0,
    referenceWords: 0,
    qvacEdits: 0,
    mudlerEdits: 0,
    qvacRtfs: [],
    mudlerRtfs: []
  }
}

function addResult (aggregate, result) {
  const qvacCounts = wordErrorCounts(result.reference, result.qvac.transcript)
  const mudlerCounts = wordErrorCounts(result.reference, result.mudler.transcript)
  aggregate.utterances += 1
  aggregate.referenceWords += qvacCounts.referenceWords
  aggregate.qvacEdits += qvacCounts.edits
  aggregate.mudlerEdits += mudlerCounts.edits
  if (Number.isFinite(result.qvac.rtf)) aggregate.qvacRtfs.push(result.qvac.rtf)
  if (Number.isFinite(result.mudler.rtf)) aggregate.mudlerRtfs.push(result.mudler.rtf)
}

function finishAggregate (language, aggregate) {
  return {
    language,
    name: aggregate.name,
    utterances: aggregate.utterances,
    referenceWords: aggregate.referenceWords,
    qvacWer: aggregate.referenceWords ? aggregate.qvacEdits / aggregate.referenceWords : null,
    mudlerWer: aggregate.referenceWords ? aggregate.mudlerEdits / aggregate.referenceWords : null,
    qvacRtf: timingStats(aggregate.qvacRtfs),
    mudlerRtf: timingStats(aggregate.mudlerRtfs)
  }
}

function aggregateFleursResults (results) {
  const all = emptyAggregate('All languages')
  const languages = new Map()
  for (const result of results) {
    const language = languages.get(result.lang) || emptyAggregate(result.name)
    addResult(language, result)
    languages.set(result.lang, language)
    addResult(all, result)
  }
  return {
    all: finishAggregate('all', all),
    languages: [...languages.entries()]
      .map(([language, aggregate]) => finishAggregate(language, aggregate))
      .sort((left, right) => left.language.localeCompare(right.language))
  }
}

function percent (value) {
  return value === null ? 'n/a' : `${(value * 100).toFixed(2)}%`
}

function decimal (value, digits = 4) {
  return value === null ? 'n/a' : Number(value).toFixed(digits)
}

function renderFleursMarkdown (data) {
  const summary = data.summary
  const backendLabel = data.meta.backendMatch
    ? data.meta.backend
    : `${data.meta.qvacBackend} vs ${data.meta.mudlerBackend} (override mismatch)`
  const lines = [
    '# Parakeet FLEURS engine comparison',
    '',
    `Generated: ${data.meta.generatedAt}`,
    '',
    `Platform: \`${data.meta.platform}\`; backend: ${backendLabel}; quant: \`${data.meta.quant}\`; threads: ${data.meta.threads}; utterances: ${summary.all.utterances}.`,
    '',
    'Corpus WER is total word edits divided by total reference words. Mean and median RTF are computed across utterances. Lower is better.',
    '',
    '## All languages',
    '',
    '| Engine | Corpus WER | Mean RTF | Median RTF |',
    '|---|---:|---:|---:|',
    `| QVAC | ${percent(summary.all.qvacWer)} | ${decimal(summary.all.qvacRtf.mean)} | ${decimal(summary.all.qvacRtf.median)} |`,
    `| mudler | ${percent(summary.all.mudlerWer)} | ${decimal(summary.all.mudlerRtf.mean)} | ${decimal(summary.all.mudlerRtf.median)} |`,
    '',
    '## Per language',
    '',
    '| Language | Utterances | Reference words | QVAC WER | mudler WER | QVAC mean/median RTF | mudler mean/median RTF |',
    '|---|---:|---:|---:|---:|---:|---:|'
  ]
  for (const language of summary.languages) {
    lines.push(`| ${language.name} (${language.language}) | ${language.utterances} | ${language.referenceWords} | ${percent(language.qvacWer)} | ${percent(language.mudlerWer)} | ${decimal(language.qvacRtf.mean)} / ${decimal(language.qvacRtf.median)} | ${decimal(language.mudlerRtf.mean)} / ${decimal(language.mudlerRtf.median)} |`)
  }
  lines.push('', 'Per-utterance transcripts, processing time, RTF, and WER are in the adjacent JSON file.', '')
  return lines.join('\n')
}

module.exports = {
  aggregateFleursResults,
  renderFleursMarkdown,
  timingStats,
  wordErrorCounts,
  wordErrorRate
}
