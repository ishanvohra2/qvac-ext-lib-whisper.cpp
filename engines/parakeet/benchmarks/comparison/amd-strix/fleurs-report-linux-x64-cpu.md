# Parakeet FLEURS engine comparison

Generated: 2026-08-14T07:08:33.085Z

Platform: `linux-x64`; backend: CPU; quant: `q8_0`; threads: 4; utterances: 300.

Corpus WER is total word edits divided by total reference words. Mean and median RTF are computed across utterances. Lower is better.

## All languages

| Engine | Corpus WER | Mean RTF | Median RTF |
|---|---:|---:|---:|
| QVAC | 10.77% | 0.0624 | 0.0624 |
| mudler | 10.65% | 0.0356 | 0.0354 |

## Per language

| Language | Utterances | Reference words | QVAC WER | mudler WER | QVAC mean/median RTF | mudler mean/median RTF |
|---|---:|---:|---:|---:|---:|---:|
| Bulgarian (bg) | 12 | 264 | 10.61% | 10.23% | 0.0630 / 0.0632 | 0.0359 / 0.0357 |
| Czech (cs) | 12 | 230 | 3.04% | 3.04% | 0.0615 / 0.0615 | 0.0353 / 0.0351 |
| Danish (da) | 12 | 262 | 11.07% | 11.45% | 0.0619 / 0.0624 | 0.0351 / 0.0351 |
| German (de) | 12 | 207 | 3.38% | 3.86% | 0.0619 / 0.0618 | 0.0356 / 0.0353 |
| Greek (el) | 12 | 277 | 36.46% | 36.82% | 0.0650 / 0.0651 | 0.0364 / 0.0364 |
| English (en) | 12 | 278 | 5.40% | 5.40% | 0.0622 / 0.0630 | 0.0354 / 0.0358 |
| Spanish (es) | 12 | 306 | 0.98% | 0.98% | 0.0617 / 0.0617 | 0.0351 / 0.0351 |
| Estonian (et) | 12 | 179 | 17.32% | 16.76% | 0.0614 / 0.0614 | 0.0350 / 0.0351 |
| Finnish (fi) | 12 | 147 | 4.08% | 4.08% | 0.0618 / 0.0616 | 0.0352 / 0.0352 |
| French (fr) | 12 | 265 | 6.79% | 6.79% | 0.0636 / 0.0637 | 0.0359 / 0.0360 |
| Croatian (hr) | 12 | 204 | 22.06% | 21.57% | 0.0620 / 0.0620 | 0.0358 / 0.0358 |
| Hungarian (hu) | 12 | 247 | 14.57% | 14.17% | 0.0629 / 0.0630 | 0.0359 / 0.0358 |
| Italian (it) | 12 | 279 | 3.58% | 3.23% | 0.0607 / 0.0606 | 0.0348 / 0.0347 |
| Lithuanian (lt) | 12 | 206 | 16.99% | 17.48% | 0.0631 / 0.0635 | 0.0357 / 0.0356 |
| Latvian (lv) | 12 | 216 | 12.04% | 12.50% | 0.0621 / 0.0623 | 0.0352 / 0.0352 |
| Maltese (mt) | 12 | 226 | 22.12% | 21.68% | 0.0619 / 0.0623 | 0.0351 / 0.0350 |
| Dutch (nl) | 12 | 210 | 5.71% | 5.71% | 0.0629 / 0.0632 | 0.0361 / 0.0361 |
| Polish (pl) | 12 | 163 | 5.52% | 5.52% | 0.0630 / 0.0624 | 0.0362 / 0.0355 |
| Portuguese (pt) | 12 | 298 | 3.02% | 2.68% | 0.0614 / 0.0611 | 0.0352 / 0.0351 |
| Romanian (ro) | 12 | 299 | 8.70% | 8.36% | 0.0633 / 0.0632 | 0.0356 / 0.0353 |
| Russian (ru) | 12 | 197 | 2.54% | 2.54% | 0.0624 / 0.0624 | 0.0355 / 0.0354 |
| Slovak (sk) | 12 | 168 | 3.57% | 2.38% | 0.0622 / 0.0616 | 0.0360 / 0.0359 |
| Slovenian (sl) | 12 | 281 | 13.52% | 13.17% | 0.0629 / 0.0629 | 0.0357 / 0.0353 |
| Swedish (sv) | 12 | 281 | 24.56% | 23.84% | 0.0623 / 0.0622 | 0.0355 / 0.0354 |
| Ukrainian (uk) | 12 | 195 | 6.67% | 7.18% | 0.0628 / 0.0628 | 0.0355 / 0.0355 |

Per-utterance transcripts, processing time, RTF, and WER are in the adjacent JSON file.
