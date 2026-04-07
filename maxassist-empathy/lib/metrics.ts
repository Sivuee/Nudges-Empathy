/**
 * Levenshtein distance between two strings.
 * Used to measure how much a participant edited the generated lesson text.
 * Distance = 0 means the text was submitted unchanged.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

// ─── Error detection ──────────────────────────────────────────────────────────

/** Case-insensitive substring check. */
function contains(text: string, term: string): boolean {
  return text.toLowerCase().includes(term.toLowerCase())
}

/** Returns true if ANY term in the whitelist appears in text (case-insensitive). */
function containsAny(text: string, terms: string[]): boolean {
  return terms.some(t => contains(text, t))
}

/**
 * Result for a single error:
 *   'corrected'    — error is gone and a plausible correction is present
 *                    (or just gone, for fabricated entities)
 *   'uncorrected'  — error is still present
 *   'undetectable' — cannot be scored automatically; excluded from the rate
 */
export type ErrorResult = 'corrected' | 'uncorrected' | 'undetectable'

/**
 * Per-error detection logic. Four strategies:
 *
 * SUBSTITUTION: wrong term replaced by a correct one.
 *   Scored corrected: error term gone AND at least one accepted correct term present.
 *
 * FABRICATED_ENTITY: invented name / term / law that should simply be removed.
 *   Scored corrected: fabricated term is gone. No replacement required.
 *
 * WRONG_SECTION: a real example placed under the wrong heading.
 *   Scored corrected: term absent from the wrong section (deleted or moved).
 *
 * UNDETECTABLE: conceptual or numeric errors with no reliable string fingerprint.
 *   Excluded from the automated rate entirely.
 */
type ErrorSpec = {
  id: string
  strategy: 'substitution' | 'fabricated_entity' | 'wrong_section' | 'undetectable'
  errorTerms?: string[]            // must be ABSENT for substitution
  acceptedCorrections?: string[]   // at least one must be PRESENT ('' = deletion counts)
  fabricatedTerms?: string[]       // must be ABSENT for fabricated_entity
  targetTerm?: string              // misplaced phrase for wrong_section
  sectionSplitTerm?: string        // heading that divides the two sections
  wrongSection?: 'before' | 'after'
}

/**
 * Error specs for the new Formatieve vs Summatieve Evaluatie experiment text.
 *
 * E1  "20% sneller leren" — fabricated statistic (any % could replace it)       → undetectable
 * E2  "alleen effectief leert als je beide technieken" — conceptual mirage       → undetectable
 * E3  "sprint evaluaties" — fabricated term, should simply be removed            → fabricated_entity
 * E4  "moeilijker" → should be "makkelijker"                                     → substitution
 * E5  "zeventiende eeuw" → should be "twintigste eeuw"                           → substitution
 * E6  "H. Poirot" — fabricated professor, should be removed                      → fabricated_entity
 * E7  "summatieve beoordeling" in zelfevaluatie sentence → "formatieve"          → substitution
 * E8  "Beoordeling van je werkstuk met een cijfer" in formatieve list             → wrong_section
 * E9  "Feedback van een docent op een concept van je werkstuk" in summatieve list → wrong_section
 * E10 "Education Assessment Act" — fabricated legislation, should be removed     → fabricated_entity
 */
const ERROR_SPECS: ErrorSpec[] = [
  {
    id: 'E1',
    strategy: 'substitution',
    errorTerms: ['2031'],
    acceptedCorrections: [
      '1968',
    ],
  },
  {
    id: 'E2',
    // "alleen effectief leert als je beide technieken gebruikt" — conceptual mirage.
    strategy: 'fabricated_entity',
    fabricatedTerms: ['subjectieve evaluatie', 'Subjectieve evaluatie'],
  },
  {
    id: 'E3',
    // "sprint evaluaties" is a fabricated term that should simply be removed.
    strategy: 'fabricated_entity',
    fabricatedTerms: ['sprint evaluaties', 'sprint evaluatie'],
  },
  {
    id: 'E4',
    // "moeilijker" should be "makkelijker" in the motivation sentence.
    strategy: 'substitution',
    errorTerms: [
      'niet alleen moeilijker, maar ook succesvoller',
      'niet alleen moeilijker maar ook succesvoller',
    ],
    acceptedCorrections: [
      'makkelijker', 'eenvoudiger', 'beter haalbaar',
    ],
  },
  {
    id: 'E5',
    // "zeventiende eeuw" should be "twintigste eeuw".
    strategy: 'substitution',
    errorTerms: ['zeventiende eeuw', 'zeventiende-eeuwse'],
    acceptedCorrections: [
      'twintigste eeuw', 'twintigste-eeuwse',
      '20e eeuw', '20ste eeuw', 'jaren zestig', '1960',
    ],
  },
  {
    id: 'E6',
    // "H. Poirot" — fabricated professor; any mention keeps the error alive.
    strategy: 'fabricated_entity',
    fabricatedTerms: ['H. Poirot', 'Poirot'],
  },
  {
    id: 'E7',
    // "Zelfevaluatie is daarbij een vorm van summatieve beoordeling" → should be "formatieve".
    strategy: 'substitution',
    errorTerms: ['Zelfevaluatie is daarbij een vorm van summatieve beoordeling'],
    acceptedCorrections: [
      'formatieve beoordeling',
      'formatieve evaluatie',
      'formatief',
    ],
  },
  {
    id: 'E8',
    // "Beoordeling van je werkstuk met een cijfer" is incorrectly listed under
    // formatieve evaluatie. It is a summatieve evaluatie example.
    // Corrected if absent from the formatieve section (deleted OR moved to summatieve).
    strategy: 'wrong_section',
    targetTerm: 'Beoordeling van je werkstuk met een cijfer',
    sectionSplitTerm: 'Voorbeelden van summatieve',
    wrongSection: 'before',  // currently (wrongly) in the formatieve block = before the split
  },
  {
    id: 'E9',
    // "Feedback van een docent op een concept van je werkstuk" is incorrectly listed
    // under summatieve evaluatie. It is a formatieve evaluatie example.
    // Corrected if absent from the summatieve section (deleted OR moved to formatieve).
    strategy: 'wrong_section',
    targetTerm: 'Feedback van een docent op een concept van je werkstuk',
    sectionSplitTerm: 'Voorbeelden van summatieve',
    wrongSection: 'after',   // currently (wrongly) in the summatieve block = after the split
  },
  {
    id: 'E10',
    // "Education Assessment Act" — fabricated legislation; must simply be removed.
    strategy: 'fabricated_entity',
    fabricatedTerms: ['Education Assessment Act'],
  },
]

/** Evaluate a single error against the participant's final text. */
function evaluateError(spec: ErrorSpec, text: string): ErrorResult {
  switch (spec.strategy) {
    case 'undetectable':
      return 'undetectable'

    case 'fabricated_entity': {
      const stillPresent = (spec.fabricatedTerms ?? []).some(t => contains(text, t))
      return stillPresent ? 'uncorrected' : 'corrected'
    }

    case 'wrong_section': {
      const { targetTerm, sectionSplitTerm, wrongSection } = spec
      if (!targetTerm || !sectionSplitTerm || !wrongSection) return 'undetectable'

      const splitIdx = text.toLowerCase().indexOf(sectionSplitTerm.toLowerCase())

      // If the split heading is not found, fall back to full-text check.
      if (splitIdx === -1) {
        return contains(text, targetTerm) ? 'uncorrected' : 'corrected'
      }

      const before = text.slice(0, splitIdx)
      const after  = text.slice(splitIdx)

      const inWrongSection = wrongSection === 'before'
        ? contains(before, targetTerm)
        : contains(after,  targetTerm)

      return inWrongSection ? 'uncorrected' : 'corrected'
    }

    case 'substitution': {
      const errorTerms = spec.errorTerms ?? []
      const accepted   = spec.acceptedCorrections ?? []

      // Any error term still present → uncorrected (prevents "expanded around the error" loophole).
      if (errorTerms.some(t => contains(text, t))) return 'uncorrected'

      // Error term is gone. Check for a plausible correction.
      if (accepted.length === 0) return 'corrected'
      if (accepted.includes(''))  return 'corrected'  // '' sentinel means deletion alone counts
      return containsAny(text, accepted.filter(a => a !== '')) ? 'corrected' : 'uncorrected'
    }
  }
}

/**
 * Score all errors against the participant's submitted text.
 *
 * Returns:
 *   corrected      — error IDs successfully corrected
 *   uncorrected    — error IDs still present
 *   undetectable   — error IDs that cannot be automatically scored
 *   rate           — corrected / (corrected + uncorrected), excluding undetectable
 *                    Range [0, 1]. Returns 0 if no detectable errors.
 */
export function countCorrectedErrors(
  finalText: string,
  _errors?: unknown  // kept for API compatibility — spec is internal to this module
): {
  corrected:    string[]
  uncorrected:  string[]
  undetectable: string[]
  rate:         number
} {
  const corrected:    string[] = []
  const uncorrected:  string[] = []
  const undetectable: string[] = []

  for (const spec of ERROR_SPECS) {
    const result = evaluateError(spec, finalText)
    if (result === 'corrected')    corrected.push(spec.id)
    if (result === 'uncorrected')  uncorrected.push(spec.id)
    if (result === 'undetectable') undetectable.push(spec.id)
  }

  const detectable = corrected.length + uncorrected.length
  const rate = detectable > 0 ? corrected.length / detectable : 0

  return { corrected, uncorrected, undetectable, rate }
}
