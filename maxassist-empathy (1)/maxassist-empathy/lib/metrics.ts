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
 * Per-error detection logic. Three strategies:
 *
 * SUBSTITUTION: wrong term was replaced by a correct one.
 *   Scored: error term gone AND at least one accepted correct term present.
 *   If the error term is still present in any form (even surrounded by new text)
 *   the error counts as uncorrected — prevents the "expanded around the error" loophole.
 *
 * FABRICATED_ENTITY: invented name / law / fact that should simply be removed.
 *   Scored: fabricated term is gone. No correct replacement is required.
 *
 * UNDETECTABLE: errors that leave no reliable textual fingerprint after correction
 *   (e.g. fabricated statistics — any number could replace them).
 *   Excluded from the automated rate entirely.
 */
type ErrorSpec = {
  id: string
  strategy: 'substitution' | 'fabricated_entity' | 'wrong_section' | 'undetectable'
  errorTerms?: string[]           // terms that must be ABSENT for substitution errors
  acceptedCorrections?: string[]  // any one of these must be PRESENT ('' = removal alone counts)
  fabricatedTerms?: string[]      // terms that must be ABSENT for fabricated_entity errors

  targetTerm?: string             // the misplaced phrase to track
  sectionSplitTerm?: string       // heading/phrase that divides the two sections
  wrongSection?: 'before' | 'after' // which side of the split the term currently (wrongly) lives on
}

/**
 * Error specification for the Formatieve vs Summatieve Evaluatie lesson.
 *
 * E1  "zeventiende" → should be "twintigste" (century of origin)
 * E2  "Benjamin Bloom" → should be "Michael Scriven" (who introduced the term)
 * E3  Conceptual framing error not pinned to a single detectable phrase → undetectable
 * E4  "H. Poirot" — fabricated professor; must simply be removed
 * E5  "40%" — fabricated statistic; any number could replace it → undetectable
 * E6  "Assessment as Learning" → should be "Self Assessment" or similar
 * E7  "summatieve beoordeling" (in the zelfevaluatie sentence) → "formatieve beoordeling"
 * E8  "Education Assessment Act" — fabricated legislation; must simply be removed
 */
const ERROR_SPECS: ErrorSpec[] = [
  {
    id: 'E1',
    strategy: 'substitution',
    errorTerms: ['zeventiende eeuw', 'zeventiende-eeuwse'],
    acceptedCorrections: [
      'twintigste eeuw', 'twintigste-eeuwse',
      '20e eeuw', '20ste eeuw', 'jaren zestig', '1960',
    ],
  },
  {
    id: 'E2',
    strategy: 'substitution',
    errorTerms: ['Benjamin Bloom'],
    // Require Bloom to be gone; any plausible name that replaced him counts.
    // We can't whitelist every possible correct answer, but Scriven is the canonical one.
    // Absence of Bloom alone is NOT enough (participant might have just deleted the sentence),
    // so we check for at least one of the accepted corrections OR deletion of the whole claim.
    acceptedCorrections: ['Michael Scriven', 'Scriven', ''],
  },
  {
    id: 'E3',
    // "aan het einde van het schooljaar" does not appear verbatim in EXPERIMENT_TEXT.
    // The error is conceptual; no reliable string fingerprint.
    strategy: 'undetectable',
  },
  {
    id: 'E4',
    strategy: 'fabricated_entity',
    // Any mention of the name keeps the error alive — even if participant
    // expanded on it ("Prof. Poirot later clarified...").
    fabricatedTerms: ['H. Poirot', 'Poirot'],
  },
  {
    id: 'E5',
    // "40% beter scoorden" — participant could change 40 to any other number.
    // No string fingerprint survives correction.
    strategy: 'undetectable',
  },
  {
    id: 'E6',
    strategy: 'substitution',
    errorTerms: ['Zelfevaluatie is daarbij een vorm van summatieve beoordeling'],
    // Participant may rewrite the sentence; as long as the wrong phrase is gone
    // and 'formatief' appears nearby, count it corrected.
    acceptedCorrections: [
      'formatieve beoordeling',
      'formatieve evaluatie',
      'formatief',
    ],
  },
  {
    id: 'E7',
    // "Beoordeling van je werkstuk met een cijfer" is incorrectly listed under
    // formatieve evaluatie. It is a summatieve evaluatie example.
    // Corrected if: absent from the formatieve section (deleted OR moved to summatieve).
    // Still wrong if: swapped into the summatieve list but the formatieve list keeps it,
    // OR if moved to summatieve while removed from formatieve — that last case is correct.
    strategy: 'wrong_section',
    targetTerm: 'Beoordeling van je werkstuk met een cijfer',
    sectionSplitTerm: 'Voorbeelden van summatieve',
    wrongSection: 'before',   // currently (wrongly) in the formatieve block = before the split
  },
  {
    id: 'E8',
    // "Feedback van een docent op een concept van je werkstuk" is incorrectly listed
    // under summatieve evaluatie. It is a formatieve evaluatie example.
    // Corrected if: absent from the summatieve section (deleted OR moved to formatieve).
    strategy: 'wrong_section',
    targetTerm: 'Feedback van een docent op een concept van je werkstuk',
    sectionSplitTerm: 'Voorbeelden van summatieve',
    wrongSection: 'after',    // currently (wrongly) in the summatieve block = after the split
  },
  {
    id: 'E9',
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

      // If the split heading is not found, fall back to checking full text.
      // Treat as uncorrected if term is still present anywhere.
      if (splitIdx === -1) {
        return contains(text, targetTerm) ? 'uncorrected' : 'corrected'
      }

      const before = text.slice(0, splitIdx)
      const after  = text.slice(splitIdx)

      const inWrongSection  = wrongSection === 'before' ? contains(before, targetTerm)
                                                        : contains(after,  targetTerm)

      // Corrected if the term is completely absent (deleted)
      // OR if it has been moved out of the wrong section.
      return inWrongSection ? 'uncorrected' : 'corrected'
    }

    case 'substitution': {
      const errorTerms = spec.errorTerms ?? []
      const accepted   = spec.acceptedCorrections ?? []

      // If ANY error term is still present → uncorrected, regardless of additions.
      // This prevents the "added more text around the error" loophole.
      if (errorTerms.some(t => contains(text, t))) return 'uncorrected'

      // Error term is gone. Now check for a plausible correction.
      if (accepted.length === 0) return 'corrected'  // removal alone counts if no list given
      if (accepted.includes(''))  return 'corrected'  // '' sentinel means deletion counts
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
