// ============================================================
// EXPERIMENT CONFIGURATION
// Edit this file to set up your experiment conditions and
// the baseline lesson content with intentional errors.
// ============================================================

export const EXPERIMENT_CONFIG = {
  // Qualtrics survey URL — participants are redirected here after sharing
  QUALTRICS_URL: 'https://your-qualtrics-survey-url.com',

  // Formspree endpoint — replace with your actual Formspree form ID
  FORMSPREE_ENDPOINT: 'https://formspree.io/f/YOUR_FORM_ID',

  // Condition is passed via URL query param: ?condition=baseline|nudge_transparency|nudge_warning
  // See README for how to randomize conditions in Qualtrics
  DEFAULT_CONDITION: 'baseline' as ExperimentCondition,
}

export type ExperimentCondition = 'baseline' | 'nudge_transparency' | 'nudge_warning' | 'empathy'

// ============================================================
// PREFILLED LESDETAILS — shown in step 1 (read-only context)
// ============================================================
export const BASELINE_LESDETAILS = {
  doelgroep: 'MBO, niveau 3, Zorg & Welzijn',
  onderwerp: 'Effectieve communicatie met cliënten in de zorg',
  referentieNiveau: 'B1',
  lesdoel: 'Studenten kunnen de basisprincipes van effectieve communicatie toepassen in een zorgcontext en herkennen veelvoorkomende communicatiebarrières.',
}

// ============================================================
// BASELINE LESSON CONTENT WITH INTENTIONAL ERRORS
//
// ERRORS INTRODUCED (for error correction rate measurement):
//   1. Lesplan  — "actief luisteren" misspelled as "aktief luisterren"
//   2. Lesoverzicht — wrong phase order: verwerking listed before instructie
//   3. Les (body) — factual error: "non-verbale communicatie is 10% van communicatie"
//      (correct is ~55-93% according to Mehrabian — common misconception)
//   4. Les (body) — grammar error: "de cliënt voelt zich begrepen voelen"
//
// Document the ORIGINAL (correct) versions below as BASELINE_CORRECT
// so you can compute Levenshtein distance against the participant's final text.
// ============================================================

// The pre-generated lesson plan text (Tab: Lesplan)
export const BASELINE_LESPLAN = `**Lesplan: Effectieve communicatie met cliënten in de zorg**

**Doelgroep:** MBO niveau 3, Zorg & Welzijn
**Duur:** 60 minuten
**Lesdoel:** Studenten kunnen de basisprincipes van effectieve communicatie toepassen in een zorgcontext.

---

**Fase 1 – Introductie (10 min)**
De docent start met een korte plenaire bespreking: "Wat maakt communicatie in de zorg anders dan in andere beroepen?" Studenten delen ervaringen uit stages.

**Fase 2 – Instructie (20 min)**
Uitleg over de vier pijlers van zorggericht communiceren:
1. Aktief luisterren (ERROR_1: fout gespeld — hoort te zijn: "Actief luisteren")
2. Empathie tonen
3. Duidelijke en eenvoudige taal gebruiken
4. Non-verbale signalen herkennen

**Fase 3 – Verwerking (20 min)**
Studenten oefenen in tweetallen met rollenspellen. Één student speelt de zorgverlener, de ander de cliënt. Na 10 minuten wisselen ze van rol.

**Fase 4 – Afronding (10 min)**
Klassikale nabespreking. Studenten benoemen één concrete techniek die ze morgen in de stage willen toepassen.`

// The pre-generated lesson outline (Tab: Lesoverzicht)
export const BASELINE_LESOVERZICHT = {
  // ERROR_2: verwerking is listed before instructie in the rendered order
  phases: [
    {
      title: 'Introductie',
      description: 'Activeer voorkennis en wek interesse',
      topics: [
        'Openingsvraag: wat is goede communicatie in de zorg?',
        'Korte ervaringsronde: eigen stageervaringen',
      ],
    },
    {
      title: 'Verwerking', // ERROR_2: should be Instructie first, then Verwerking
      description: 'Oefen met de nieuwe kennis',
      topics: [
        'Rollenspel in tweetallen (2x 10 min)',
        'Observatieformulier invullen',
      ],
    },
    {
      title: 'Instructie', // ERROR_2: this is out of order
      description: 'Leg nieuwe kennis en concepten uit',
      topics: [
        'De vier pijlers van zorggericht communiceren',
        'Theorie non-verbale communicatie',
        'Voorbeeldgesprek (video)',
      ],
    },
    {
      title: 'Afronding',
      description: 'Reflecteer en evalueer',
      topics: [
        'Klassikale nabespreking rollenspellen',
        'Één leerpunt voor de stage formuleren',
      ],
    },
  ],
}

// The pre-generated lesson body (Tab: Les)
export const BASELINE_LES = `## Effectieve communicatie met cliënten in de zorg

### Inleiding
Goede communicatie is de basis van kwalitatieve zorgverlening. Als zorgprofessional ben je dagelijks in gesprek met cliënten, families en collega's. De manier waarop je communiceert heeft directe invloed op het welzijn van de cliënt.

---

### De vier pijlers van zorggericht communiceren

#### 1. Actief luisteren
Actief luisteren betekent dat je volledig aanwezig bent in het gesprek. Je luistert niet alleen naar de woorden, maar ook naar de toon en de emotie erachter. Technieken:
- Knikken en oogcontact maken
- Samenvatten wat de cliënt zegt ("Dus als ik het goed begrijp…")
- Stiltes durven laten vallen

#### 2. Empathie tonen
Empathie is het vermogen om je in te leven in de gevoelens van een ander. Dit betekent niet dat je het eens hoeft te zijn, maar dat de cliënt voelt zich begrepen voelen. (ERROR_4: grammaticafout — hoort te zijn: "dat de cliënt zich begrepen voelt")

#### 3. Duidelijke en eenvoudige taal
Gebruik geen medisch jargon tenzij de cliënt dit zelf aangeeft te begrijpen. Spreek in korte zinnen. Controleer of de boodschap is overgekomen: "Kunt u in eigen woorden vertellen wat ik zojuist heb uitgelegd?"

#### 4. Non-verbale communicatie
Wist je dat non-verbale communicatie slechts 10% van je totale boodschap uitmaakt? (ERROR_3: feitelijk onjuist — non-verbale communicatie maakt volgens onderzoek 55–93% uit van de totale boodschap) Je houding, gezichtsuitdrukking en afstand bepalen sterk hoe jouw boodschap wordt ontvangen.

---

### Veelvoorkomende communicatiebarrières

| Barrière | Voorbeeld | Oplossing |
|---|---|---|
| Lawaai en afleiding | Telefoon gaat af tijdens gesprek | Zet telefoon op stil, zoek rustige ruimte |
| Taalverschillen | Cliënt spreekt beperkt Nederlands | Gebruik eenvoudige taal, pictogrammen |
| Emotionele staat | Cliënt is angstig of verdrietig | Geef eerst erkenning, dan informatie |
| Aannames | Je denkt te weten wat cliënt bedoelt | Stel open vragen, vat samen |

---

### Opdracht: Rollenspel
Werk in tweetallen. Gebruik de situatiekaarten die je van de docent krijgt. Vul na elk rollenspel het observatieformulier in. Let op:
- Welke communicatietechnieken gebruikte je partner?
- Wat ging goed?
- Wat kan beter?`

// ============================================================
// CORRECT BASELINE (ground truth for Levenshtein distance)
// This is what the text SHOULD look like if all errors are fixed.
// ============================================================
export const CORRECT_LESPLAN = BASELINE_LESPLAN
  .replace('Aktief luisterren', 'Actief luisteren')
  .replace('(ERROR_1: fout gespeld — hoort te zijn: "Actief luisteren")', '')

export const CORRECT_LES = BASELINE_LES
  .replace(
    'dat de cliënt voelt zich begrepen voelen. (ERROR_4: grammaticafout — hoort te zijn: "dat de cliënt zich begrepen voelt")',
    'dat de cliënt zich begrepen voelt.'
  )
  .replace(
    'Wist je dat non-verbale communicatie slechts 10% van je totale boodschap uitmaakt? (ERROR_3: feitelijk onjuist — non-verbale communicatie maakt volgens onderzoek 55–93% uit van de totale boodschap)',
    'Wist je dat non-verbale communicatie 55–93% van je totale boodschap uitmaakt?'
  )

// Correct outline has phases in the right order: intro, instructie, verwerking, afronding
export const CORRECT_LESOVERZICHT_ORDER = ['Introductie', 'Instructie', 'Verwerking', 'Afronding']

// ============================================================
// LEVENSHTEIN DISTANCE UTILITY
// ============================================================
export function levenshteinDistance(a: string, b: string): number {
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

// ============================================================
// ERROR DETECTION
// Returns a score 0–4 indicating how many errors were corrected.
// ============================================================
export function detectErrorCorrections(
  finalLesplan: string,
  finalLes: string,
  finalOutlineOrder: string[]
): {
  error1Fixed: boolean  // Aktief luisterren → Actief luisteren
  error2Fixed: boolean  // Wrong phase order fixed
  error3Fixed: boolean  // 10% → 55-93%
  error4Fixed: boolean  // Grammar: voelt zich begrepen voelen
  totalFixed: number
} {
  const error1Fixed =
    !finalLesplan.toLowerCase().includes('aktief luisterren') &&
    finalLesplan.toLowerCase().includes('actief luisteren')

  const error2Fixed =
    finalOutlineOrder.indexOf('Instructie') < finalOutlineOrder.indexOf('Verwerking')

  const error3Fixed =
    !finalLes.includes('slechts 10%') &&
    (finalLes.includes('55') || finalLes.includes('93') || finalLes.includes('55–93'))

  const error4Fixed =
    !finalLes.includes('voelt zich begrepen voelen') &&
    finalLes.includes('zich begrepen voelt')

  const totalFixed = [error1Fixed, error2Fixed, error3Fixed, error4Fixed].filter(Boolean).length

  return { error1Fixed, error2Fixed, error3Fixed, error4Fixed, totalFixed }
}

// ============================================================
// NUDGE CONTENT PER CONDITION
// Add or modify nudge conditions here for your experiment.
// ============================================================
export type NudgeConfig = {
  showAccuracyBadge: boolean        // Show "AI-gegenereerd" badge on content
  showWarningBanner: boolean        // Show yellow warning banner about AI errors
  warningText: string
  accuracyBadgeText: string
  showConfidenceIndicator: boolean  // Show confidence % per section
  confidenceLevel: 'high' | 'medium' | 'low'
}

export const NUDGE_CONFIGS: Record<ExperimentCondition, NudgeConfig> = {
  baseline: {
    showAccuracyBadge: false,
    showWarningBanner: false,
    warningText: '',
    accuracyBadgeText: '',
    showConfidenceIndicator: false,
    confidenceLevel: 'high',
  },
  nudge_transparency: {
    showAccuracyBadge: true,
    showWarningBanner: false,
    warningText: '',
    accuracyBadgeText: 'AI-gegenereerd — controleer de inhoud',
    showConfidenceIndicator: true,
    confidenceLevel: 'medium',
  },
  nudge_warning: {
    showAccuracyBadge: true,
    showWarningBanner: true,
    warningText:
      '⚠️ AI kan fouten maken. Controleer deze les zorgvuldig op feitelijke onjuistheden, spelfouten en logische volgorde voordat u deze deelt.',
    accuracyBadgeText: 'AI-gegenereerd',
    showConfidenceIndicator: false,
    confidenceLevel: 'high',
  },
  empathy: {
    showAccuracyBadge: false,
    showWarningBanner: false,
    warningText: '',
    accuracyBadgeText: '',
    showConfidenceIndicator: false,
    confidenceLevel: 'high',
  },
}

// ============================================================
// READING SCORE UTILITIES — used by the Empathy nudge in LesTab
// Converts useReadingTracker SectionMetrics into a 0–100 score.
//
// Weights:
//   40 pts — time on section  (saturates at 20 s)
//   35 pts — max scroll depth (0–1 linear)
//   15 pts — mouse movements  (saturates at 200)
//   10 pts — revisit bonus    (≥2 visits = 10, 1 visit = 5, 0 = 0)
// ============================================================

const TIME_SATURATE_MS = 20_000
const MOUSE_SATURATE = 200

export type ReadingTier = 'Verwarrend' | 'Duidelijk' | 'Geweldig'

export interface SectionReading {
  sectionId: string
  label: string
  score: number
  tier: ReadingTier
}

export interface ReadingAnalysis {
  sections: SectionReading[]
  averageScore: number
  averageTier: ReadingTier
  weakestLabel: string
}

export const LES_SECTION_IDS = [
  'les-introductie',
  'les-instructie',
  'les-verwerking',
  'les-afronding',
] as const

export const LES_SECTION_LABELS: Record<string, string> = {
  'les-introductie': 'Introductie',
  'les-instructie': 'Instructie',
  'les-verwerking': 'Verwerking',
  'les-afronding': 'Afronding',
}

export function scoreFromMetrics(m: {
  totalTimeMs: number
  maxScrollDepth: number
  mouseMovements: number
  visits: number
} | undefined): number {
  if (!m) return 0
  const time = Math.min(40, Math.round((m.totalTimeMs / TIME_SATURATE_MS) * 40))
  const scroll = Math.min(35, Math.round(m.maxScrollDepth * 35))
  const mouse = Math.min(15, Math.round((m.mouseMovements / MOUSE_SATURATE) * 15))
  const visit = m.visits >= 2 ? 10 : m.visits === 1 ? 5 : 0
  return Math.min(100, time + scroll + mouse + visit)
}

export function tierFromScore(score: number): ReadingTier {
  if (score >= 65) return 'Geweldig'
  if (score >= 30) return 'Duidelijk'
  return 'Verwarrend'
}

export function buildReadingAnalysis(
  sectionMetrics: Record<string, { totalTimeMs: number; maxScrollDepth: number; mouseMovements: number; visits: number }>
): ReadingAnalysis {
  const sections: SectionReading[] = LES_SECTION_IDS.map((id) => {
    const score = scoreFromMetrics(sectionMetrics[id])
    return { sectionId: id, label: LES_SECTION_LABELS[id], score, tier: tierFromScore(score) }
  })
  const averageScore = Math.round(sections.reduce((s, r) => s + r.score, 0) / sections.length)
  const averageTier = tierFromScore(averageScore)
  const weakest = sections.reduce((min, r) => r.score < min.score ? r : min, sections[0])
  return { sections, averageScore, averageTier, weakestLabel: weakest.label }
}
