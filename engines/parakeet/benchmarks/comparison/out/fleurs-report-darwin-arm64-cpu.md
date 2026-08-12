# Parakeet FLEURS engine comparison

Generated: 2026-08-12T12:52:21.035Z

Platform: `darwin-arm64`; backend: CPU; quant: `q8_0`; threads: 4; utterances: 300.

Corpus WER is total word edits divided by total reference words. Mean and median RTF are computed across utterances. Lower is better.

## All languages

| Engine | Corpus WER | Mean RTF | Median RTF |
|---|---:|---:|---:|
| QVAC | 10.82% | 0.0623 | 0.0522 |
| mudler | 10.67% | 0.2474 | 0.2381 |

## Per language

| Language | Utterances | Reference words | QVAC WER | mudler WER | QVAC mean/median RTF | mudler mean/median RTF |
|---|---:|---:|---:|---:|---:|---:|
| Bulgarian (bg) | 12 | 264 | 10.61% | 10.23% | 0.0424 / 0.0411 | 0.2580 / 0.2503 |
| Czech (cs) | 12 | 230 | 3.04% | 3.04% | 0.0405 / 0.0388 | 0.2396 / 0.2415 |
| Danish (da) | 12 | 262 | 11.45% | 11.45% | 0.0398 / 0.0397 | 0.2680 / 0.2674 |
| German (de) | 12 | 207 | 3.38% | 3.86% | 0.0459 / 0.0448 | 0.2352 / 0.2327 |
| Greek (el) | 12 | 277 | 36.82% | 35.74% | 0.0637 / 0.0665 | 0.2614 / 0.2500 |
| English (en) | 12 | 278 | 5.40% | 5.76% | 0.0387 / 0.0386 | 0.2297 / 0.2239 |
| Spanish (es) | 12 | 306 | 0.98% | 0.98% | 0.1155 / 0.1135 | 0.2616 / 0.2561 |
| Estonian (et) | 12 | 179 | 17.32% | 16.76% | 0.0391 / 0.0391 | 0.2270 / 0.2277 |
| Finnish (fi) | 12 | 147 | 4.08% | 4.08% | 0.0391 / 0.0389 | 0.2292 / 0.2264 |
| French (fr) | 12 | 265 | 6.79% | 6.79% | 0.0411 / 0.0409 | 0.2431 / 0.2431 |
| Croatian (hr) | 12 | 204 | 22.55% | 22.55% | 0.0393 / 0.0398 | 0.2403 / 0.2398 |
| Hungarian (hu) | 12 | 247 | 14.57% | 14.17% | 0.0643 / 0.0639 | 0.2254 / 0.2269 |
| Italian (it) | 12 | 279 | 3.58% | 3.23% | 0.0582 / 0.0604 | 0.2154 / 0.2164 |
| Lithuanian (lt) | 12 | 206 | 16.99% | 18.45% | 0.0525 / 0.0511 | 0.2257 / 0.2274 |
| Latvian (lv) | 12 | 216 | 12.96% | 12.50% | 0.0548 / 0.0553 | 0.2658 / 0.2666 |
| Maltese (mt) | 12 | 226 | 22.57% | 21.68% | 0.0511 / 0.0515 | 0.2253 / 0.2256 |
| Dutch (nl) | 12 | 210 | 5.71% | 5.71% | 0.0408 / 0.0399 | 0.2295 / 0.2164 |
| Polish (pl) | 12 | 163 | 5.52% | 5.52% | 0.0480 / 0.0481 | 0.2161 / 0.2155 |
| Portuguese (pt) | 12 | 298 | 3.02% | 2.68% | 0.0525 / 0.0531 | 0.2441 / 0.2390 |
| Romanian (ro) | 12 | 299 | 8.36% | 8.36% | 0.0917 / 0.1083 | 0.2766 / 0.2687 |
| Russian (ru) | 12 | 197 | 2.54% | 2.54% | 0.0995 / 0.1095 | 0.2554 / 0.2479 |
| Slovak (sk) | 12 | 168 | 3.57% | 2.38% | 0.0782 / 0.0688 | 0.2541 / 0.2463 |
| Slovenian (sl) | 12 | 281 | 13.17% | 13.17% | 0.1072 / 0.1079 | 0.2957 / 0.2692 |
| Swedish (sv) | 12 | 281 | 24.20% | 23.84% | 0.1079 / 0.1133 | 0.2638 / 0.2619 |
| Ukrainian (uk) | 12 | 195 | 6.67% | 6.67% | 0.1055 / 0.1088 | 0.2997 / 0.2784 |

Per-utterance transcripts, processing time, RTF, and WER are in the adjacent JSON file.
