'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  BASELINE_LESDETAILS,
  BASELINE_LESPLAN,
  BASELINE_LESOVERZICHT,
  BASELINE_LES,
  CORRECT_LESPLAN,
  CORRECT_LES,
  CORRECT_LESOVERZICHT_ORDER,
  EXPERIMENT_CONFIG,
  ExperimentCondition,
  NudgeConfig,
  NUDGE_CONFIGS,
  levenshteinDistance,
  detectErrorCorrections,
  LES_SECTION_IDS,
  buildReadingAnalysis,
  ReadingTier,
  ReadingAnalysis,
} from '@/lib/experiment'
import { useReadingTracker } from '@/hooks/useReadingTracker'
import {
  Share2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ListOrdered,
  FileText,
  Eye,
  Users,
  GripVertical,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthoringTab = 'lesplan' | 'lesoverzicht' | 'les' | 'voorvertoning'
type AppPhase = 'lesdetails' | 'auteursomgeving' | 'share_modal' | 'experiment_end'

type OutlinePhase = {
  title: string
  description: string
  topics: string[]
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
      <div
        className="bg-maxGreen h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function NavBar({ phase, onPhaseChange, detailsComplete }: {
  phase: AppPhase
  onPhaseChange: (p: AppPhase) => void
  detailsComplete: boolean
}) {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-1">
      <div className="flex items-center gap-2 mr-6">
        <div className="w-7 h-7 bg-maxGreen rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">M</span>
        </div>
        <span className="font-semibold text-gray-800 text-sm">MaxAssist</span>
      </div>

      <TabBtn
        active={phase === 'lesdetails'}
        onClick={() => onPhaseChange('lesdetails')}
        label="Lesdetails"
      />
      <TabBtn
        active={phase === 'auteursomgeving'}
        disabled={!detailsComplete}
        onClick={() => detailsComplete && onPhaseChange('auteursomgeving')}
        label="Auteursomgeving"
        tooltip={!detailsComplete ? 'Vul eerst de lesdetails in' : undefined}
      />
    </nav>
  )
}

function TabBtn({ active, onClick, label, disabled, tooltip }: {
  active: boolean
  onClick: () => void
  label: string
  disabled?: boolean
  tooltip?: string
}) {
  return (
    <button
      title={tooltip}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative rounded-t-lg rounded-b-none border-b-2 px-5 py-2.5 text-sm font-medium transition-all',
        active
          ? 'border-maxGreen bg-white text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-gray-500'
      )}
    >
      {label}
    </button>
  )
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 border-l-4 border-l-maxGreen rounded-lg p-6 space-y-3">
      <label className="block text-base font-semibold text-gray-900">{label}</label>
      {children}
    </div>
  )
}

// ─── Lesdetails Screen ────────────────────────────────────────────────────────
function LesdetailsScreen({ onComplete, participantId }: {
  onComplete: () => void
  participantId: string
}) {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(onComplete, 600)
  }

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-maxGreen mb-1">Lesdetails bewerken</h2>
          <p className="text-sm text-gray-500">Bewerk de basisinformatie van je les</p>
        </div>

        <ProgressBar value={100} />

        <FieldBlock label="Voor wie is deze les?">
          <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-700">
            {BASELINE_LESDETAILS.doelgroep}
          </div>
          <p className="text-xs text-gray-400">Vooraf ingesteld voor dit experiment</p>
        </FieldBlock>

        <FieldBlock label="Waar gaat de les over?">
          <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-700">
            {BASELINE_LESDETAILS.onderwerp}
          </div>
        </FieldBlock>

        <FieldBlock label="Op welk taalniveau?">
          <div className="inline-block px-4 py-2 border-2 border-maxGreen bg-maxGreen/10 text-maxGreen rounded-md text-sm font-medium">
            {BASELINE_LESDETAILS.referentieNiveau}
          </div>
        </FieldBlock>

        <FieldBlock label="Wat moeten leerlingen kunnen na de les?">
          <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-3 text-sm text-gray-700 leading-relaxed">
            {BASELINE_LESDETAILS.lesdoel}
          </div>
        </FieldBlock>

        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-green-600 font-medium">✓ Alle basisinformatie is ingevuld</p>
          <button
            onClick={handleSave}
            className="bg-maxGreen text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            {saved ? 'Opgeslagen ✓' : 'Opslaan & doorgaan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Authoring Environment ────────────────────────────────────────────────────
function AutorsomgevingScreen({
  activeTab,
  setActiveTab,
  lesplanText,
  setLesplanText,
  lesText,
  setLesText,
  outlinePhases,
  setOutlinePhases,
  onShare,
  nudgeConfig,
  condition,
}: {
  activeTab: AuthoringTab
  setActiveTab: (t: AuthoringTab) => void
  lesplanText: string
  setLesplanText: (s: string) => void
  lesText: string
  setLesText: (s: string) => void
  outlinePhases: OutlinePhase[]
  setOutlinePhases: (p: OutlinePhase[]) => void
  onShare: () => void
  nudgeConfig: NudgeConfig
  condition: ExperimentCondition
}) {
  const tabs: { id: AuthoringTab; label: string; icon: React.ReactNode }[] = [
    { id: 'lesplan', label: 'Lesplan', icon: <BookOpen size={15} /> },
    { id: 'lesoverzicht', label: 'Lesoverzicht', icon: <ListOrdered size={15} /> },
    { id: 'les', label: 'Les', icon: <FileText size={15} /> },
    { id: 'voorvertoning', label: 'Voorvertoning', icon: <Eye size={15} /> },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Warning banner (nudge condition) */}
      {nudgeConfig.showWarningBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">{nudgeConfig.warningText}</p>
        </div>
      )}

      <div className="flex border-b border-gray-200 bg-white px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all',
              activeTab === tab.id
                ? 'border-maxGreen text-maxGreen'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center py-2">
          <button
            onClick={onShare}
            className="flex items-center gap-2 bg-maxPrimary hover:bg-pink-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Share2 size={15} /> Deel deze les
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50">
        {activeTab === 'lesplan' && (
          <LesplanTab
            text={lesplanText}
            onChange={setLesplanText}
            nudgeConfig={nudgeConfig}
          />
        )}
        {activeTab === 'lesoverzicht' && (
          <LesoverzichtTab
            phases={outlinePhases}
            onChange={setOutlinePhases}
            nudgeConfig={nudgeConfig}
          />
        )}
        {activeTab === 'les' && (
          <LesTab
            text={lesText}
            onChange={setLesText}
            nudgeConfig={nudgeConfig}
            condition={condition}
          />
        )}
        {activeTab === 'voorvertoning' && (
          <VoorvertoningTab
            lesplan={lesplanText}
            les={lesText}
            phases={outlinePhases}
            lesdetails={BASELINE_LESDETAILS}
          />
        )}
      </div>
    </div>
  )
}

// ─── Lesplan Tab ──────────────────────────────────────────────────────────────
function LesplanTab({ text, onChange, nudgeConfig }: {
  text: string
  onChange: (s: string) => void
  nudgeConfig: NudgeConfig
}) {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Lesplan</h3>
          {nudgeConfig.showAccuracyBadge && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full">
              <Info size={11} /> {nudgeConfig.accuracyBadgeText}
            </span>
          )}
        </div>
        <div className="p-4">
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[500px] text-sm text-gray-700 leading-relaxed resize-y border-0 outline-none font-mono bg-transparent"
            spellCheck={true}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Lesoverzicht Tab ─────────────────────────────────────────────────────────
function LesoverzichtTab({ phases, onChange, nudgeConfig }: {
  phases: OutlinePhase[]
  onChange: (p: OutlinePhase[]) => void
  nudgeConfig: NudgeConfig
}) {
  const movePhase = (index: number, direction: 'up' | 'down') => {
    const newPhases = [...phases]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newPhases.length) return
    ;[newPhases[index], newPhases[swapIndex]] = [newPhases[swapIndex], newPhases[index]]
    onChange(newPhases)
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Lesoverzicht</h3>
          {nudgeConfig.showAccuracyBadge && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full">
              <Info size={11} /> {nudgeConfig.accuracyBadgeText}
            </span>
          )}
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            Gebruik de pijlen om de volgorde van de fases aan te passen.
          </p>
          {phases.map((phase, i) => (
            <div
              key={phase.title}
              className="border border-gray-200 border-l-4 border-l-maxGreen rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 mt-0.5">
                  <button
                    onClick={() => movePhase(i, 'up')}
                    disabled={i === 0}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-20"
                  >
                    <ChevronLeft size={16} className="rotate-90" />
                  </button>
                  <button
                    onClick={() => movePhase(i, 'down')}
                    disabled={i === phases.length - 1}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-20"
                  >
                    <ChevronRight size={16} className="rotate-90" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-maxGreen uppercase tracking-wide">
                      Fase {i + 1}
                    </span>
                    <span className="font-semibold text-gray-900">{phase.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{phase.description}</p>
                  <ul className="mt-2 space-y-1">
                    {phase.topics.map((topic, ti) => (
                      <li key={ti} className="text-sm text-gray-600 flex items-start gap-1.5">
                        <span className="text-maxGreen mt-0.5">•</span> {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Simon Nudge (Empathy condition only) ─────────────────────────────────────
// SimonTracker mounts after the LesTab renders, registers IntersectionObservers
// on sentinel divs, and polls every 500ms to update the analysis state.

const TIER_STYLE: Record<ReadingTier, { dot: string; text: string; bg: string; border: string }> = {
  Verwarrend: { dot: 'bg-red-500',     text: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200'    },
  Duidelijk:  { dot: 'bg-amber-400',   text: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'  },
  Geweldig:   { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
}

function SimonTracker({ onAnalysis }: { onAnalysis: (a: ReadingAnalysis) => void }) {
  const { getSnapshot } = useReadingTracker([...LES_SECTION_IDS])
  const onAnalysisRef = useRef(onAnalysis)
  onAnalysisRef.current = onAnalysis

  useEffect(() => {
    const id = setInterval(() => {
      const snap = getSnapshot()
      onAnalysisRef.current(
        buildReadingAnalysis(
          snap.sections as Record<string, { totalTimeMs: number; maxScrollDepth: number; mouseMovements: number; visits: number }>
        )
      )
    }, 500)
    return () => clearInterval(id)
  }, [getSnapshot])

  // Invisible sentinel divs at proportional positions within the textarea scroll area.
  // useReadingTracker's IntersectionObserver watches these via data-section-id.
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div data-section-id="les-introductie" className="absolute top-[0%]  left-0 right-0 h-px opacity-0" />
      <div data-section-id="les-instructie"  className="absolute top-[25%] left-0 right-0 h-px opacity-0" />
      <div data-section-id="les-verwerking"  className="absolute top-[62%] left-0 right-0 h-px opacity-0" />
      <div data-section-id="les-afronding"   className="absolute top-[82%] left-0 right-0 h-px opacity-0" />
    </div>
  )
}

function SimonPanel({ analysis }: { analysis: ReadingAnalysis | null }) {
  const hasData = analysis !== null && analysis.sections.some(s => s.visits > 0)
  const tier = analysis?.averageTier ?? 'Verwarrend'

  return (
    <div className="mx-4 mb-4 rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-blue-100">
        <p className="text-sm font-semibold text-gray-800">Simon de virtuele student</p>
      </div>
      <div className="px-4 py-4 flex items-start gap-3">
        <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-blue-100 flex items-center justify-center text-2xl select-none">
          {!hasData ? '🧑‍🎓' : tier === 'Verwarrend' ? '😕' : tier === 'Duidelijk' ? '🙂' : '😄'}
        </div>
        {!hasData ? (
          <div className="flex-1">
            <p className="text-xs text-gray-600 leading-relaxed">
              De lesinhoud is gegenereerd, pas het nog aan op basis van je voorkeur!
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Simon heeft de tekst gelezen en vindt de tekst{' '}
                <span className={`font-bold ${TIER_STYLE[tier].text}`}>{tier}.</span>
              </p>
              {tier !== 'Geweldig' && (
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Voor meer duidelijkheid, verifieer de{' '}
                  <span className="font-bold text-gray-800">{analysis!.weakestLabel}</span>.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              {analysis!.sections.map(s => {
                const st = TIER_STYLE[s.tier]
                return (
                  <div key={s.sectionId} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${st.bg} ${st.border}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                      <span className="text-xs font-medium text-gray-700">{s.label}</span>
                    </div>
                    <span className={`text-xs font-semibold ${st.text}`}>{s.tier}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Les Tab ──────────────────────────────────────────────────────────────────
function LesTab({ text, onChange, nudgeConfig, condition }: {
  text: string
  onChange: (s: string) => void
  nudgeConfig: NudgeConfig
  condition: ExperimentCondition
}) {
  const [trackerMounted, setTrackerMounted] = useState(false)
  const [analysis, setAnalysis] = useState<ReadingAnalysis | null>(null)
  const stableSetAnalysis = useCallback((a: ReadingAnalysis) => setAnalysis(a), [])

  useEffect(() => {
    if (condition !== 'empathy') return
    const raf = requestAnimationFrame(() => setTrackerMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [condition])

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Les</h3>
          {nudgeConfig.showAccuracyBadge && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full">
              <Info size={11} /> {nudgeConfig.accuracyBadgeText}
            </span>
          )}
        </div>
        <div className="p-4 relative">
          {condition === 'empathy' && trackerMounted && (
            <SimonTracker onAnalysis={stableSetAnalysis} />
          )}
          <textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[600px] text-sm text-gray-700 leading-relaxed resize-y border-0 outline-none font-mono bg-transparent relative z-10"
            spellCheck={true}
          />
        </div>
        {condition === 'empathy' && (
          <SimonPanel analysis={analysis} />
        )}
      </div>
    </div>
  )
}

// ─── Voorvertoning Tab ────────────────────────────────────────────────────────
function VoorvertoningTab({ lesplan, les, phases, lesdetails }: {
  lesplan: string
  les: string
  phases: OutlinePhase[]
  lesdetails: typeof BASELINE_LESDETAILS
}) {
  // Simple markdown-like renderer
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-2">{line.slice(3)}</h2>
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold text-gray-800 mt-4 mb-2">{line.slice(4)}</h3>
      if (line.startsWith('#### ')) return <h4 key={i} className="text-base font-semibold text-gray-700 mt-3 mb-1">{line.slice(5)}</h4>
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-gray-800 mt-2">{line.slice(2, -2)}</p>
      if (line.startsWith('- ')) return <li key={i} className="ml-4 text-sm text-gray-600">{line.slice(2)}</li>
      if (line.startsWith('---')) return <hr key={i} className="my-4 border-gray-200" />
      if (line.trim() === '') return <br key={i} />
      return <p key={i} className="text-sm text-gray-700">{line}</p>
    })
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Header card */}
      <div className="bg-maxGreen text-white rounded-xl p-6">
        <p className="text-sm opacity-80 mb-1">{lesdetails.doelgroep}</p>
        <h2 className="text-xl font-bold mb-2">{lesdetails.onderwerp}</h2>
        <p className="text-sm opacity-90">{lesdetails.lesdoel}</p>
      </div>

      {/* Lesplan */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen size={16} className="text-maxGreen" /> Lesplan
        </h3>
        <div className="prose prose-sm max-w-none">{renderMarkdown(lesplan)}</div>
      </div>

      {/* Lesoverzicht */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ListOrdered size={16} className="text-maxGreen" /> Lesoverzicht
        </h3>
        <div className="space-y-3">
          {phases.map((phase, i) => (
            <div key={phase.title} className="border-l-4 border-maxGreen pl-4">
              <p className="text-xs font-semibold text-maxGreen uppercase">Fase {i + 1}</p>
              <p className="font-semibold text-gray-800">{phase.title}</p>
              <ul className="mt-1 space-y-0.5">
                {phase.topics.map((t, ti) => (
                  <li key={ti} className="text-sm text-gray-600">• {t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Les body */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-maxGreen" /> Les
        </h3>
        <div className="prose prose-sm max-w-none">{renderMarkdown(les)}</div>
      </div>
    </div>
  )
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ onDeelMetCollega, onCancel }: {
  onDeelMetCollega: () => void
  onCancel: () => void
}) {
  const [activeTab, setActiveTab] = useState<'doelgroep' | 'collegas'>('doelgroep')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Deel deze les</h2>
          <p className="text-sm text-gray-500 mt-1">Kies hoe je de les wilt delen</p>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('doelgroep')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'doelgroep'
                  ? 'bg-maxPrimary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Deel met doelgroep
            </button>
            <button
              onClick={() => setActiveTab('collegas')}
              className={cn(
                'flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'collegas'
                  ? 'bg-maxPrimary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              Deel met collega&apos;s
            </button>
          </div>

          {activeTab === 'doelgroep' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Selecteer hoe je de les wilt delen met je leerlingen.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500 text-center">
                PDF download en andere opties zijn niet beschikbaar in dit experiment.
              </div>
            </div>
          )}

          {activeTab === 'collegas' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Deel deze les met een collega via e-mail of een directe link.
              </p>
              <button
                onClick={onDeelMetCollega}
                className="w-full flex items-center justify-center gap-2 bg-maxGreen hover:bg-teal-700 text-white py-3 px-4 rounded-lg text-sm font-semibold transition-colors"
              >
                <Users size={16} /> Deel met collega
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Experiment End Screen ────────────────────────────────────────────────────
function ExperimentEndScreen({ qualtricsUrl }: { qualtricsUrl: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bedankt voor je deelname!</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Je hebt de les succesvol gedeeld. Ga nu terug naar de vragenlijst om het experiment af te ronden.
          </p>
        </div>
        <a
          href={qualtricsUrl}
          className="block w-full bg-maxGreen hover:bg-teal-700 text-white py-3 px-6 rounded-xl font-semibold text-sm transition-colors"
        >
          Terug naar Qualtrics →
        </a>
        <p className="text-xs text-gray-400">
          Sluit dit venster niet — gebruik de knop hierboven om terug te gaan naar de vragenlijst.
        </p>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function ExperimentApp() {
  const searchParams = useSearchParams()

  // This deployment is always the Empathy condition
  const condition: ExperimentCondition = 'empathy'
  const participantId = searchParams.get('pid') ?? `anon-${Date.now()}`

  const nudgeConfig = NUDGE_CONFIGS[condition]

  // App state
  const [phase, setPhase] = useState<AppPhase>('lesdetails')
  const [activeAuthoringTab, setActiveAuthoringTab] = useState<AuthoringTab>('lesplan')
  const [showShareModal, setShowShareModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Editable content state — initialized from baseline content
  const [lesplanText, setLesplanText] = useState(BASELINE_LESPLAN)
  const [lesText, setLesText] = useState(BASELINE_LES)
  const [outlinePhases, setOutlinePhases] = useState<OutlinePhase[]>(BASELINE_LESOVERZICHT.phases)

  // Track time spent in authoring environment
  const authoringStartTime = useRef<number | null>(null)
  useEffect(() => {
    if (phase === 'auteursomgeving' && authoringStartTime.current === null) {
      authoringStartTime.current = Date.now()
    }
  }, [phase])

  // ─── Submit experiment data ──────────────────────────────────────────────
  const submitExperimentData = useCallback(async () => {
    if (submitted) return

    const timeSpentMs = authoringStartTime.current ? Date.now() - authoringStartTime.current : 0

    // Compute Levenshtein distances
    const levLesplan = levenshteinDistance(
      CORRECT_LESPLAN.replace(/\s+/g, ' ').trim(),
      lesplanText.replace(/\s+/g, ' ').trim()
    )
    const levLes = levenshteinDistance(
      CORRECT_LES.replace(/\s+/g, ' ').trim(),
      lesText.replace(/\s+/g, ' ').trim()
    )
    const levTotal = levLesplan + levLes

    // Compute error corrections
    const finalOutlineOrder = outlinePhases.map((p) => p.title)
    const errorStats = detectErrorCorrections(lesplanText, lesText, finalOutlineOrder)

    const payload = {
      participant_id: participantId,
      condition,
      timestamp: new Date().toISOString(),
      time_in_authoring_ms: timeSpentMs,
      // Levenshtein distances (lower = closer to correct version = more engagement)
      levenshtein_lesplan: levLesplan,
      levenshtein_les: levLes,
      levenshtein_total: levTotal,
      // Error correction rates
      error_1_fixed_spelling: errorStats.error1Fixed,
      error_2_fixed_order: errorStats.error2Fixed,
      error_3_fixed_factual: errorStats.error3Fixed,
      error_4_fixed_grammar: errorStats.error4Fixed,
      total_errors_fixed: errorStats.totalFixed,
      error_correction_rate: errorStats.totalFixed / 4,
      // Final text for manual inspection
      final_lesplan: lesplanText,
      final_les: lesText,
      final_outline_order: finalOutlineOrder.join(' → '),
    }

    try {
      await fetch(EXPERIMENT_CONFIG.FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      setSubmitted(true)
    } catch (e) {
      console.error('Formspree submission failed:', e)
      setSubmitted(true) // Still proceed to end screen
    }
  }, [participantId, condition, lesplanText, lesText, outlinePhases, submitted])

  // ─── Handle "Deel met collega" click ────────────────────────────────────
  const handleDeelMetCollega = useCallback(async () => {
    setShowShareModal(false)
    await submitExperimentData()
    setPhase('experiment_end')
  }, [submitExperimentData])

  // ─── Render ──────────────────────────────────────────────────────────────
  if (phase === 'experiment_end') {
    return <ExperimentEndScreen qualtricsUrl={EXPERIMENT_CONFIG.QUALTRICS_URL} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        phase={phase}
        onPhaseChange={setPhase}
        detailsComplete={phase !== 'lesdetails'}
      />

      {phase === 'lesdetails' && (
        <LesdetailsScreen
          onComplete={() => setPhase('auteursomgeving')}
          participantId={participantId}
        />
      )}

      {phase === 'auteursomgeving' && (
        <AutorsomgevingScreen
          activeTab={activeAuthoringTab}
          setActiveTab={setActiveAuthoringTab}
          lesplanText={lesplanText}
          setLesplanText={setLesplanText}
          lesText={lesText}
          setLesText={setLesText}
          outlinePhases={outlinePhases}
          setOutlinePhases={setOutlinePhases}
          onShare={() => setShowShareModal(true)}
          nudgeConfig={nudgeConfig}
          condition={condition}
        />
      )}

      {showShareModal && (
        <ShareModal
          onDeelMetCollega={handleDeelMetCollega}
          onCancel={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <ExperimentApp />
    </Suspense>
  )
}
