# Parakeet FLEURS engine comparison

Generated: 2026-08-14T07:14:26.332Z

Platform: `linux-x64`; backend: Vulkan; quant: `q8_0`; threads: 4; utterances: 300.

Corpus WER is total word edits divided by total reference words. Mean and median RTF are computed across utterances. Lower is better.

## All languages

| Engine | Corpus WER | Mean RTF | Median RTF |
|---|---:|---:|---:|
| QVAC | 10.77% | 0.0058 | 0.0056 |
| mudler | 10.64% | 0.0101 | 0.0097 |

## Per language

| Language | Utterances | Reference words | QVAC WER | mudler WER | QVAC mean/median RTF | mudler mean/median RTF |
|---|---:|---:|---:|---:|---:|---:|
| Bulgarian (bg) | 12 | 264 | 10.61% | 10.23% | 0.0058 / 0.0058 | 0.0103 / 0.0105 |
| Czech (cs) | 12 | 230 | 3.04% | 3.04% | 0.0053 / 0.0054 | 0.0089 / 0.0090 |
| Danish (da) | 12 | 262 | 11.07% | 11.07% | 0.0055 / 0.0056 | 0.0092 / 0.0093 |
| German (de) | 12 | 207 | 3.38% | 3.86% | 0.0060 / 0.0057 | 0.0103 / 0.0099 |
| Greek (el) | 12 | 277 | 36.46% | 36.10% | 0.0063 / 0.0063 | 0.0120 / 0.0123 |
| English (en) | 12 | 278 | 5.40% | 5.40% | 0.0060 / 0.0058 | 0.0106 / 0.0108 |
| Spanish (es) | 12 | 306 | 0.98% | 0.98% | 0.0054 / 0.0052 | 0.0088 / 0.0087 |
| Estonian (et) | 12 | 179 | 17.32% | 17.32% | 0.0055 / 0.0054 | 0.0091 / 0.0092 |
| Finnish (fi) | 12 | 147 | 4.08% | 4.08% | 0.0059 / 0.0057 | 0.0100 / 0.0102 |
| French (fr) | 12 | 265 | 6.79% | 6.79% | 0.0066 / 0.0063 | 0.0122 / 0.0118 |
| Croatian (hr) | 12 | 204 | 22.55% | 22.55% | 0.0063 / 0.0062 | 0.0109 / 0.0105 |
| Hungarian (hu) | 12 | 247 | 14.57% | 14.57% | 0.0056 / 0.0057 | 0.0099 / 0.0104 |
| Italian (it) | 12 | 279 | 3.58% | 3.23% | 0.0049 / 0.0050 | 0.0079 / 0.0078 |
| Lithuanian (lt) | 12 | 206 | 16.99% | 17.48% | 0.0058 / 0.0055 | 0.0102 / 0.0095 |
| Latvian (lv) | 12 | 216 | 12.96% | 12.04% | 0.0054 / 0.0054 | 0.0094 / 0.0096 |
| Maltese (mt) | 12 | 226 | 22.12% | 20.35% | 0.0054 / 0.0054 | 0.0089 / 0.0089 |
| Dutch (nl) | 12 | 210 | 5.71% | 6.19% | 0.0067 / 0.0067 | 0.0120 / 0.0122 |
| Polish (pl) | 12 | 163 | 5.52% | 5.52% | 0.0065 / 0.0066 | 0.0118 / 0.0116 |
| Portuguese (pt) | 12 | 298 | 3.02% | 2.68% | 0.0053 / 0.0051 | 0.0087 / 0.0087 |
| Romanian (ro) | 12 | 299 | 8.36% | 8.36% | 0.0063 / 0.0059 | 0.0113 / 0.0107 |
| Russian (ru) | 12 | 197 | 2.54% | 2.54% | 0.0059 / 0.0057 | 0.0103 / 0.0100 |
| Slovak (sk) | 12 | 168 | 2.38% | 2.38% | 0.0066 / 0.0065 | 0.0112 / 0.0112 |
| Slovenian (sl) | 12 | 281 | 13.52% | 13.52% | 0.0055 / 0.0055 | 0.0090 / 0.0088 |
| Swedish (sv) | 12 | 281 | 24.56% | 23.84% | 0.0054 / 0.0051 | 0.0091 / 0.0083 |
| Ukrainian (uk) | 12 | 195 | 6.67% | 7.18% | 0.0059 / 0.0057 | 0.0107 / 0.0109 |

Per-utterance transcripts, processing time, RTF, and WER are in the adjacent JSON file.
