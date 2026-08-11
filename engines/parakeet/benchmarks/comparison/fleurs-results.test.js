'use strict'

const assert = require('assert')
const {
  aggregateFleursResults,
  renderFleursMarkdown,
  wordErrorCounts
} = require('./fleurs-results')

const results = [
  {
    id: 'en_0',
    lang: 'en',
    name: 'English',
    reference: 'one two three',
    qvac: { transcript: 'one two', rtf: 0.1 },
    mudler: { transcript: 'one two three', rtf: 0.2 }
  },
  {
    id: 'fr_0',
    lang: 'fr',
    name: 'French',
    reference: 'bonjour monde',
    qvac: { transcript: 'bonjour monde', rtf: 0.3 },
    mudler: { transcript: 'bonjour', rtf: 0.4 }
  }
]

const counts = wordErrorCounts('a b c', 'a c')
assert.deepStrictEqual(counts, { edits: 1, referenceWords: 3 })

const summary = aggregateFleursResults(results)
assert.strictEqual(summary.all.utterances, 2)
assert.strictEqual(summary.all.referenceWords, 5)
assert.strictEqual(summary.all.qvacWer, 0.2)
assert.strictEqual(summary.all.mudlerWer, 0.2)
assert.strictEqual(summary.all.qvacRtf.mean, 0.2)
assert.strictEqual(summary.all.qvacRtf.median, 0.2)
assert.deepStrictEqual(summary.languages.map(item => item.language), ['en', 'fr'])
assert.strictEqual(summary.languages[0].qvacWer, 1 / 3)
assert.strictEqual(summary.languages[1].mudlerWer, 1 / 2)

const report = renderFleursMarkdown({
  meta: {
    generatedAt: '2026-08-11T00:00:00.000Z',
    platform: 'test-arm64',
    backend: 'Metal',
    backendMatch: true,
    qvacBackend: 'Metal',
    mudlerBackend: 'Metal',
    quant: 'q8_0',
    threads: 4
  },
  summary
})
assert.match(report, /All languages/)
assert.match(report, /\| QVAC \| 20\.00% \| 0\.2000 \| 0\.2000 \|/)
assert.match(report, /English \(en\)/)
assert.ok(report.endsWith('\n'))

console.log('FLEURS aggregation and report tests passed')
