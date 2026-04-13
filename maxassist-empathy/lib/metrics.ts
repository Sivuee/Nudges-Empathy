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
 *   Use acceptedCorrections: [''] to allow pure deletion (no replacement required).
 *
 * FABRICATED_ENTITY: invented name / term / law that should simply be removed.
 *   Scored corrected: fabricated term is gone. No replacement required.
 *
 * WRONG_SECTION: a real example placed under the wrong heading.
 *   Scored corrected: term absent from the wrong section (deleted or moved).
 *   Uses multiple split terms so the heading can be found even if slightly reworded.
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
  // Multiple candidate split terms tried in order; first match wins.
  // This makes splitting robust to minor heading rewording by participants.
  sectionSplitTerms?: string[]
  wrongSection?: 'before' | 'after'
}

/**
 * Error specs for the Formatieve vs Summatieve Evaluatie experiment text.
 *
 * E1  "2031" — fabricated year; removing it (with or without replacing "1968") counts.
 *     Changed from substitution→fabricated_entity because participants who delete the
 *     sentence or remove only the year should not be penalised for not knowing 1968.
 *
 * E2  "Subjectieve evaluatie" — fabricated term replacing "Summatieve evaluatie"
 *     in the body paragraph; simply removing it counts.               → fabricated_entity
 *
 * E3  "sprint evaluaties" — fabricated term that should be removed.   → fabricated_entity
 *
 * E4  "moeilijker" → "makkelijker" — the errorTerms now only anchor on
 *     the word itself (not the whole sentence) to avoid fragile long-string matching.
 *     The error: "niet alleen moeilijker, maar ook succesvoller"
 *     Corrected: "makkelijker", "eenvoudiger", or "beter haalbaar" present and
 *                "moeilijker" absent from that same neighbourhood.
 *     NOTE: "moeilijker" is a common Dutch word that can appear legitimately elsewhere
 *     (e.g. in the baseline reflectie section "sommige voorbeelden makkelijker te
 *     vinden waren dan andere"). We therefore only flag the error when it appears
 *     in the specific error phrase; a lone "moeilijker" elsewhere does NOT block
 *     correction.                                                      → substitution
 *
 * E5  "zeventiende eeuw" → "twintigste eeuw"                          → substitution
 *
 * E6  "H. Poirot" — fabricated professor.                             → fabricated_entity
 *
 * E7  "summatieve beoordeling" in zelfevaluatie sentence → "formatieve" → substitution
 *
 * E8  "Beoordeling van je werkstuk met een cijfer" in formatieve list → wrong_section
 *     sectionSplitTerms now includes several candidate headings so the split
 *     is found even if participants lightly reword the summatieve heading.
 *
 * E9  "Feedback van een docent op een concept van je werkstuk" in summatieve list
 *     → wrong_section (same robust split logic as E8)
 *
 * E10 "Education Assessment Act" — fabricated legislation.            → fabricated_entity
 */
const ERROR_SPECS: ErrorSpec[] = [
  {
    // E1 — Year "2031" is fabricated. Deleting the year (or the whole sentence) counts.
    // Changed to fabricated_entity: requiring "1968" as a replacement was too strict.
    id: 'E1',
    strategy: 'fabricated_entity',
    fabricatedTerms: ['2031'],
  },
  {
    // E2 — "Subjectieve evaluatie" replaces "Summatieve evaluatie" in a body paragraph.
    // It is a fabricated replacement term; removal (with or without restoration) counts.
    id: 'E2',
    strategy: 'fabricated_entity',
    fabricatedTerms: ['subjectieve evaluatie'],
  },
  {
    // E3 — "sprint evaluaties" is a fabricated term that should simply be removed.
    id: 'E3',
    strategy: 'fabricated_entity',
    fabricatedTerms: ['sprint evaluaties', 'sprint evaluatie'],
  },
  {
    // E4 — "moeilijker" should be "makkelijker" in the motivation sentence.
    // We match only the specific error phrase, not standalone occurrences of "moeilijker"
    // that may appear in correct context elsewhere in the text.
    id: 'E4',
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
    // E5 — "zeventiende eeuw" should be "twintigste eeuw".
    id: 'E5',
    strategy: 'substitution',
    errorTerms: ['zeventiende eeuw', 'zeventiende-eeuwse'],
    acceptedCorrections: [
      'twintigste eeuw', 'twintigste-eeuwse',
      '20e eeuw', '20ste eeuw', 'jaren zestig', '1960',
    ],
  },
  {
    // E6 — "H. Poirot" — fabricated professor; any mention keeps the error alive.
    id: 'E6',
    strategy: 'fabricated_entity',
    fabricatedTerms: ['H. Poirot', 'Poirot'],
  },
  {
    // E7 — "Zelfevaluatie is daarbij een vorm van summatieve beoordeling" → "formatieve".
    id: 'E7',
    strategy: 'substitution',
    errorTerms: ['Zelfevaluatie is daarbij een vorm van summatieve beoordeling'],
    acceptedCorrections: [
      'formatieve beoordeling',
      'formatieve evaluatie',
      'formatief',
    ],
  },
  {
    // E8 — "Beoordeling van je werkstuk met een cijfer" is wrongly listed under
    // formatieve evaluatie. Corrected if absent from the formatieve section
    // (i.e. absent from the text BEFORE the summatieve examples heading).
    //
    // Multiple candidate split terms are tried in order; the first one found in
    // the text is used. This handles participants who slightly rephrase the heading.
    id: 'E8',
    strategy: 'wrong_section',
    targetTerm: 'Beoordeling van je werkstuk met een cijfer',
    sectionSplitTerms: [
      'Voorbeelden van summatieve evaluatie',
      'Voorbeelden van summatieve',
      'summatieve evaluatie:',
      'summatieve evaluatie',
    ],
    wrongSection: 'before',
  },
  {
    // E9 — "Feedback van een docent op een concept van je werkstuk" is wrongly listed
    // under summatieve evaluatie. Corrected if absent from the summatieve section
    // (i.e. absent from the text AFTER the summatieve examples heading).
    id: 'E9',
    strategy: 'wrong_section',
    targetTerm: 'Feedback van een docent op een concept van je werkstuk',
    sectionSplitTerms: [
      'Voorbeelden van summatieve evaluatie',
      'Voorbeelden van summatieve',
      'summatieve evaluatie:',
      'summatieve evaluatie',
    ],
    wrongSection: 'after',
  },
  {
    // E10 — "Education Assessment Act" — fabricated legislation; must simply be removed.
    id: 'E10',
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
      const { targetTerm, sectionSplitTerms, wrongSection } = spec
      if (!targetTerm || !sectionSplitTerms?.length || !wrongSection) return 'undetectable'

      const lowerText = text.toLowerCase()

      // Try each candidate split term in order; use the first one found.
      let splitIdx = -1
      for (const term of sectionSplitTerms) {
        const idx = lowerText.indexOf(term.toLowerCase())
        if (idx !== -1) {
          splitIdx = idx
          break
        }
      }

      // If no split heading is found at all, fall back to a full-text check.
      // (If the participant deleted the entire summatieve section, the misplaced
      // item would also be gone, so 'corrected' is appropriate.)
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

      // Any error term still present → uncorrected.
      if (errorTerms.some(t => contains(text, t))) return 'uncorrected'

      // Error term is gone. Check for a plausible correction.
      if (accepted.length === 0) return 'corrected'
      if (accepted.includes(''))  return 'corrected'  // '' sentinel: deletion alone counts
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
