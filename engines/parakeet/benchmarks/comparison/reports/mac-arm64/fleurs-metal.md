# Parakeet FLEURS engine comparison

Generated: 2026-08-12T13:01:58.918Z

Platform: `darwin-arm64`; backend: Metal; quant: `q8_0`; threads: 4; utterances: 300.

Corpus WER is total word edits divided by total reference words. Mean and median RTF are computed across utterances. Lower is better.

## All languages

| Engine | Corpus WER | Mean RTF | Median RTF |
|---|---:|---:|---:|
| QVAC | 10.76% | 0.0350 | 0.0339 |
| mudler | 10.69% | 0.0400 | 0.0398 |

## Per language

| Language | Utterances | Reference words | QVAC WER | mudler WER | QVAC mean/median RTF | mudler mean/median RTF |
|---|---:|---:|---:|---:|---:|---:|
| Bulgarian (bg) | 12 | 264 | 10.23% | 10.23% | 0.0390 / 0.0346 | 0.0366 / 0.0396 |
| Czech (cs) | 12 | 230 | 3.04% | 3.04% | 0.0359 / 0.0350 | 0.0380 / 0.0374 |
| Danish (da) | 12 | 262 | 11.07% | 11.07% | 0.0378 / 0.0375 | 0.0374 / 0.0371 |
| German (de) | 12 | 207 | 3.38% | 3.86% | 0.0318 / 0.0315 | 0.0384 / 0.0368 |
| Greek (el) | 12 | 277 | 36.46% | 36.10% | 0.0365 / 0.0363 | 0.0427 / 0.0419 |
| English (en) | 12 | 278 | 5.40% | 5.40% | 0.0358 / 0.0321 | 0.0442 / 0.0441 |
| Spanish (es) | 12 | 306 | 0.98% | 0.98% | 0.0332 / 0.0336 | 0.0376 / 0.0378 |
| Estonian (et) | 12 | 179 | 17.32% | 17.32% | 0.0356 / 0.0321 | 0.0378 / 0.0373 |
| Finnish (fi) | 12 | 147 | 4.08% | 4.08% | 0.0329 / 0.0315 | 0.0377 / 0.0374 |
| French (fr) | 12 | 265 | 6.79% | 6.79% | 0.0318 / 0.0313 | 0.0412 / 0.0417 |
| Croatian (hr) | 12 | 204 | 22.55% | 23.04% | 0.0388 / 0.0342 | 0.0436 / 0.0423 |
| Hungarian (hu) | 12 | 247 | 14.57% | 14.17% | 0.0363 / 0.0374 | 0.0393 / 0.0390 |
| Italian (it) | 12 | 279 | 3.58% | 3.23% | 0.0348 / 0.0345 | 0.0400 / 0.0383 |
| Lithuanian (lt) | 12 | 206 | 16.99% | 17.96% | 0.0364 / 0.0385 | 0.0410 / 0.0403 |
| Latvian (lv) | 12 | 216 | 12.50% | 12.04% | 0.0339 / 0.0341 | 0.0419 / 0.0409 |
| Maltese (mt) | 12 | 226 | 22.57% | 20.35% | 0.0346 / 0.0342 | 0.0393 / 0.0394 |
| Dutch (nl) | 12 | 210 | 5.71% | 5.71% | 0.0361 / 0.0368 | 0.0407 / 0.0407 |
| Polish (pl) | 12 | 163 | 5.52% | 5.52% | 0.0295 / 0.0294 | 0.0425 / 0.0424 |
| Portuguese (pt) | 12 | 298 | 3.02% | 2.68% | 0.0353 / 0.0351 | 0.0386 / 0.0393 |
| Romanian (ro) | 12 | 299 | 8.36% | 8.36% | 0.0330 / 0.0321 | 0.0409 / 0.0408 |
| Russian (ru) | 12 | 197 | 2.54% | 2.54% | 0.0357 / 0.0360 | 0.0399 / 0.0394 |
| Slovak (sk) | 12 | 168 | 2.38% | 2.38% | 0.0320 / 0.0314 | 0.0399 / 0.0402 |
| Slovenian (sl) | 12 | 281 | 13.17% | 14.23% | 0.0378 / 0.0388 | 0.0407 / 0.0398 |
| Swedish (sv) | 12 | 281 | 24.91% | 24.20% | 0.0366 / 0.0376 | 0.0401 / 0.0397 |
| Ukrainian (uk) | 12 | 195 | 6.67% | 7.18% | 0.0330 / 0.0331 | 0.0405 / 0.0406 |

Per-utterance transcripts, processing time, RTF, and WER are in the adjacent JSON file.
