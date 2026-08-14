# Parakeet FLEURS engine comparison

Generated: 2026-08-14T10:12:22.516Z

Platform: `ios-iphone16`; device: `iPhone17,3`; OS: `iOS 26.6`; backend: Metal; quant: `q8_0`; threads: 4; utterances: 300.

Corpus WER is total word edits divided by total reference words. Mean and median RTF are computed across utterances. Lower is better.

## All languages

| Engine | Corpus WER | Mean RTF | Median RTF |
|---|---:|---:|---:|
| QVAC | 10.76% | 0.0335 | 0.0330 |
| mudler | 10.71% | 0.0395 | 0.0394 |

## Per language

| Language | Utterances | Reference words | QVAC WER | mudler WER | QVAC mean/median RTF | mudler mean/median RTF |
|---|---:|---:|---:|---:|---:|---:|
| Bulgarian (bg) | 12 | 264 | 10.23% | 10.23% | 0.0336 / 0.0328 | 0.0352 / 0.0348 |
| Czech (cs) | 12 | 230 | 3.04% | 3.04% | 0.0324 / 0.0323 | 0.0322 / 0.0320 |
| Danish (da) | 12 | 262 | 11.07% | 11.07% | 0.0324 / 0.0323 | 0.0342 / 0.0341 |
| German (de) | 12 | 207 | 3.38% | 3.86% | 0.0335 / 0.0328 | 0.0411 / 0.0406 |
| Greek (el) | 12 | 277 | 36.46% | 36.10% | 0.0339 / 0.0337 | 0.0436 / 0.0436 |
| English (en) | 12 | 278 | 5.40% | 5.40% | 0.0336 / 0.0332 | 0.0394 / 0.0395 |
| Spanish (es) | 12 | 306 | 0.98% | 0.98% | 0.0323 / 0.0322 | 0.0383 / 0.0386 |
| Estonian (et) | 12 | 179 | 17.32% | 17.32% | 0.0320 / 0.0319 | 0.0376 / 0.0376 |
| Finnish (fi) | 12 | 147 | 4.08% | 4.08% | 0.0332 / 0.0332 | 0.0395 / 0.0392 |
| French (fr) | 12 | 265 | 6.79% | 6.79% | 0.0354 / 0.0342 | 0.0430 / 0.0425 |
| Croatian (hr) | 12 | 204 | 22.55% | 23.04% | 0.0352 / 0.0347 | 0.0350 / 0.0348 |
| Hungarian (hu) | 12 | 247 | 14.57% | 14.17% | 0.0332 / 0.0333 | 0.0409 / 0.0407 |
| Italian (it) | 12 | 279 | 3.58% | 3.23% | 0.0317 / 0.0315 | 0.0383 / 0.0376 |
| Lithuanian (lt) | 12 | 206 | 16.99% | 17.96% | 0.0339 / 0.0334 | 0.0410 / 0.0409 |
| Latvian (lv) | 12 | 216 | 12.50% | 12.50% | 0.0330 / 0.0328 | 0.0395 / 0.0394 |
| Maltese (mt) | 12 | 226 | 22.57% | 20.35% | 0.0326 / 0.0326 | 0.0403 / 0.0401 |
| Dutch (nl) | 12 | 210 | 5.71% | 5.71% | 0.0352 / 0.0346 | 0.0404 / 0.0398 |
| Polish (pl) | 12 | 163 | 5.52% | 5.52% | 0.0346 / 0.0350 | 0.0427 / 0.0417 |
| Portuguese (pt) | 12 | 298 | 3.02% | 2.68% | 0.0323 / 0.0323 | 0.0390 / 0.0388 |
| Romanian (ro) | 12 | 299 | 8.36% | 8.36% | 0.0345 / 0.0341 | 0.0419 / 0.0415 |
| Russian (ru) | 12 | 197 | 2.54% | 2.54% | 0.0340 / 0.0337 | 0.0409 / 0.0409 |
| Slovak (sk) | 12 | 168 | 2.38% | 2.38% | 0.0351 / 0.0350 | 0.0417 / 0.0419 |
| Slovenian (sl) | 12 | 281 | 13.17% | 14.23% | 0.0330 / 0.0326 | 0.0407 / 0.0399 |
| Swedish (sv) | 12 | 281 | 24.91% | 24.20% | 0.0329 / 0.0326 | 0.0399 / 0.0393 |
| Ukrainian (uk) | 12 | 195 | 6.67% | 7.18% | 0.0338 / 0.0337 | 0.0410 / 0.0409 |

Per-utterance transcripts, processing time, RTF, and WER are in the adjacent JSON file.
