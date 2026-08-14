# Parakeet FLEURS engine comparison

Generated: 2026-08-14T09:53:10.553Z

Platform: `ios-iphone16`; device: `iPhone17,3`; OS: `iOS 26.6`; backend: CPU; quant: `q8_0`; threads: 4; utterances: 300.

Corpus WER is total word edits divided by total reference words. Mean and median RTF are computed across utterances. Lower is better.

## All languages

| Engine | Corpus WER | Mean RTF | Median RTF |
|---|---:|---:|---:|
| QVAC | 10.74% | 0.2046 | 0.2282 |
| mudler | 10.69% | 0.1862 | 0.1852 |

## Per language

| Language | Utterances | Reference words | QVAC WER | mudler WER | QVAC mean/median RTF | mudler mean/median RTF |
|---|---:|---:|---:|---:|---:|---:|
| Bulgarian (bg) | 12 | 264 | 10.61% | 10.61% | 0.1299 / 0.1324 | 0.2226 / 0.2216 |
| Czech (cs) | 12 | 230 | 3.04% | 3.04% | 0.1534 / 0.1428 | 0.2001 / 0.2005 |
| Danish (da) | 12 | 262 | 11.45% | 11.45% | 0.1704 / 0.1726 | 0.1921 / 0.1911 |
| German (de) | 12 | 207 | 3.38% | 3.86% | 0.1607 / 0.1523 | 0.1816 / 0.1822 |
| Greek (el) | 12 | 277 | 36.46% | 36.46% | 0.1961 / 0.2123 | 0.1856 / 0.1866 |
| English (en) | 12 | 278 | 5.40% | 5.40% | 0.1688 / 0.1713 | 0.1859 / 0.1855 |
| Spanish (es) | 12 | 306 | 0.98% | 0.98% | 0.2390 / 0.2389 | 0.1704 / 0.1709 |
| Estonian (et) | 12 | 179 | 17.32% | 16.76% | 0.1747 / 0.1789 | 0.1835 / 0.1834 |
| Finnish (fi) | 12 | 147 | 4.08% | 4.08% | 0.1457 / 0.1441 | 0.1829 / 0.1811 |
| French (fr) | 12 | 265 | 6.79% | 6.79% | 0.1486 / 0.1488 | 0.1831 / 0.1829 |
| Croatian (hr) | 12 | 204 | 22.55% | 22.06% | 0.1388 / 0.1382 | 0.2053 / 0.2033 |
| Hungarian (hu) | 12 | 247 | 14.17% | 14.17% | 0.2115 / 0.2206 | 0.1857 / 0.1848 |
| Italian (it) | 12 | 279 | 3.58% | 3.23% | 0.2302 / 0.2309 | 0.1831 / 0.1833 |
| Lithuanian (lt) | 12 | 206 | 16.50% | 18.45% | 0.2596 / 0.2558 | 0.1860 / 0.1853 |
| Latvian (lv) | 12 | 216 | 12.50% | 12.50% | 0.2346 / 0.2351 | 0.1839 / 0.1840 |
| Maltese (mt) | 12 | 226 | 22.57% | 21.68% | 0.2448 / 0.2422 | 0.1877 / 0.1859 |
| Dutch (nl) | 12 | 210 | 5.71% | 5.71% | 0.1588 / 0.1436 | 0.1888 / 0.1889 |
| Polish (pl) | 12 | 163 | 5.52% | 5.52% | 0.2408 / 0.2444 | 0.1857 / 0.1854 |
| Portuguese (pt) | 12 | 298 | 3.02% | 2.35% | 0.2420 / 0.2428 | 0.1873 / 0.1875 |
| Romanian (ro) | 12 | 299 | 8.36% | 8.36% | 0.2570 / 0.2506 | 0.1874 / 0.1871 |
| Russian (ru) | 12 | 197 | 2.54% | 2.54% | 0.2419 / 0.2422 | 0.1869 / 0.1874 |
| Slovak (sk) | 12 | 168 | 2.38% | 2.38% | 0.2398 / 0.2402 | 0.1741 / 0.1739 |
| Slovenian (sl) | 12 | 281 | 13.17% | 13.17% | 0.2401 / 0.2435 | 0.1802 / 0.1745 |
| Swedish (sv) | 12 | 281 | 24.56% | 23.84% | 0.2450 / 0.2441 | 0.1721 / 0.1720 |
| Ukrainian (uk) | 12 | 195 | 6.67% | 7.18% | 0.2429 / 0.2436 | 0.1720 / 0.1716 |

Per-utterance transcripts, processing time, RTF, and WER are in the adjacent JSON file.
