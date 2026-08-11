# Parakeet FLEURS engine comparison

Generated: 2026-08-11T07:46:53.237Z

Platform: `darwin-arm64`; backend: Metal; quant: `q8_0`; threads: 4; utterances: 300.

Corpus WER is total word edits divided by total reference words. Mean and median RTF are computed across utterances. Lower is better.

## All languages

| Engine | Corpus WER | Mean RTF | Median RTF |
|---|---:|---:|---:|
| QVAC | 10.74% | 0.0276 | 0.0275 |
| mudler | 10.69% | 0.0263 | 0.0260 |

## Per language

| Language | Utterances | Reference words | QVAC WER | mudler WER | QVAC mean/median RTF | mudler mean/median RTF |
|---|---:|---:|---:|---:|---:|---:|
| Bulgarian (bg) | 12 | 264 | 10.23% | 10.23% | 0.0286 / 0.0283 | 0.0262 / 0.0257 |
| Czech (cs) | 12 | 230 | 3.04% | 3.04% | 0.0268 / 0.0266 | 0.0267 / 0.0269 |
| Danish (da) | 12 | 262 | 11.07% | 11.07% | 0.0269 / 0.0267 | 0.0274 / 0.0267 |
| German (de) | 12 | 207 | 3.38% | 3.86% | 0.0273 / 0.0269 | 0.0262 / 0.0255 |
| Greek (el) | 12 | 277 | 36.46% | 36.10% | 0.0293 / 0.0294 | 0.0299 / 0.0299 |
| English (en) | 12 | 278 | 5.40% | 5.40% | 0.0277 / 0.0272 | 0.0263 / 0.0262 |
| Spanish (es) | 12 | 306 | 0.98% | 0.98% | 0.0267 / 0.0267 | 0.0240 / 0.0241 |
| Estonian (et) | 12 | 179 | 17.32% | 17.32% | 0.0266 / 0.0264 | 0.0257 / 0.0255 |
| Finnish (fi) | 12 | 147 | 4.08% | 4.08% | 0.0275 / 0.0271 | 0.0266 / 0.0263 |
| French (fr) | 12 | 265 | 6.79% | 6.79% | 0.0284 / 0.0282 | 0.0289 / 0.0290 |
| Croatian (hr) | 12 | 204 | 22.55% | 23.04% | 0.0281 / 0.0282 | 0.0269 / 0.0268 |
| Hungarian (hu) | 12 | 247 | 14.57% | 14.17% | 0.0284 / 0.0283 | 0.0259 / 0.0255 |
| Italian (it) | 12 | 279 | 3.23% | 3.23% | 0.0265 / 0.0265 | 0.0235 / 0.0237 |
| Lithuanian (lt) | 12 | 206 | 16.99% | 17.96% | 0.0279 / 0.0281 | 0.0276 / 0.0265 |
| Latvian (lv) | 12 | 216 | 12.50% | 12.04% | 0.0275 / 0.0274 | 0.0250 / 0.0249 |
| Maltese (mt) | 12 | 226 | 22.57% | 20.35% | 0.0273 / 0.0274 | 0.0271 / 0.0272 |
| Dutch (nl) | 12 | 210 | 5.71% | 5.71% | 0.0278 / 0.0275 | 0.0272 / 0.0266 |
| Polish (pl) | 12 | 163 | 5.52% | 5.52% | 0.0276 / 0.0274 | 0.0284 / 0.0275 |
| Portuguese (pt) | 12 | 298 | 3.02% | 2.68% | 0.0268 / 0.0269 | 0.0242 / 0.0243 |
| Romanian (ro) | 12 | 299 | 8.36% | 8.36% | 0.0282 / 0.0280 | 0.0266 / 0.0264 |
| Russian (ru) | 12 | 197 | 2.54% | 2.54% | 0.0278 / 0.0276 | 0.0256 / 0.0257 |
| Slovak (sk) | 12 | 168 | 2.38% | 2.38% | 0.0278 / 0.0278 | 0.0257 / 0.0254 |
| Slovenian (sl) | 12 | 281 | 13.17% | 14.23% | 0.0280 / 0.0281 | 0.0257 / 0.0254 |
| Swedish (sv) | 12 | 281 | 24.91% | 24.20% | 0.0275 / 0.0277 | 0.0250 / 0.0252 |
| Ukrainian (uk) | 12 | 195 | 6.67% | 7.18% | 0.0277 / 0.0279 | 0.0257 / 0.0261 |

Per-utterance transcripts, processing time, RTF, and WER are in the adjacent JSON file.
