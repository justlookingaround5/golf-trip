'use client'

import { useSwipe } from '@/hooks/useSwipe'
import CourseInfoBar from './CourseInfoBar'
import PlayerScoreInput from './PlayerScoreInput'
import PlayingPartnerExpander from './PlayingPartnerExpander'

interface HoleData {
  id: string
  hole_number: number
  par: number
  handicap_index: number
  yardage?: Record<string, number>
}

interface HoleViewProps {
  hole: HoleData
  holes: HoleData[]
  completedHoles: Set<number>
  ownTripPlayerId: string
  ownPlayerName: string
  ownStrokes: number
  ownScore: number
  partners: {
    tripPlayerId: string
    name: string
    strokes: number
    score: number
  }[]
  playerTee?: string
  saving: boolean
  onAdjustScore: (tripPlayerId: string, delta: number) => void
  onSetScore: (tripPlayerId: string, value: number) => void
  onSubmit: () => void
  onNavigate: (holeNumber: number) => void
  onClose: () => void
  // Hole stats props
  fairwayHit?: boolean | null
  girHit?: boolean | null
  puttsCount?: number | null
  onStatsChange?: (stats: { fairway_hit?: boolean | null; gir?: boolean | null; putts?: number | null }) => void
}

export default function HoleView({
  hole,
  holes,
  completedHoles,
  ownTripPlayerId,
  ownPlayerName,
  ownStrokes,
  ownScore,
  partners,
  playerTee,
  saving,
  onAdjustScore,
  onSetScore,
  onSubmit,
  onNavigate,
  onClose,
  fairwayHit,
  girHit,
  puttsCount,
  onStatsChange,
}: HoleViewProps) {
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (hole.hole_number < holes.length) onNavigate(hole.hole_number + 1)
    },
    onSwipeRight: () => {
      if (hole.hole_number > 1) onNavigate(hole.hole_number - 1)
    },
  })

  return (
    <div
      className="fixed inset-0 z-30 bg-white flex flex-col"
      {...swipeHandlers}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between bg-golf-800 px-4 py-2 text-white">
        <button
          onClick={() => hole.hole_number > 1 && onNavigate(hole.hole_number - 1)}
          disabled={hole.hole_number <= 1}
          className="px-3 py-1 text-sm disabled:opacity-30"
        >
          &larr; Prev
        </button>
        <div className="text-center">
          <span className="text-lg font-bold">Hole {hole.hole_number}</span>
        </div>
        <button
          onClick={() => hole.hole_number < holes.length && onNavigate(hole.hole_number + 1)}
          disabled={hole.hole_number >= holes.length}
          className="px-3 py-1 text-sm disabled:opacity-30"
        >
          Next &rarr;
        </button>
      </div>

      {/* Hole dots */}
      <div className="flex justify-center gap-1 py-2 bg-golf-700">
        {holes.map(h => (
          <button
            key={h.id}
            onClick={() => onNavigate(h.hole_number)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              h.hole_number === hole.hole_number
                ? 'bg-white scale-125'
                : completedHoles.has(h.hole_number)
                  ? 'bg-golf-400'
                  : 'bg-golf-900'
            }`}
          />
        ))}
      </div>

      {/* Course info */}
      <div className="py-2 bg-gray-50 border-b border-gray-200">
        <CourseInfoBar
          par={hole.par}
          handicapIndex={hole.handicap_index}
          yardage={hole.yardage}
          playerTee={playerTee}
        />
      </div>

      {/* Score entry area */}
      <div className="flex-1 flex flex-col justify-center px-4 overflow-y-auto">
        <div className="space-y-4 max-w-lg mx-auto w-full">
          {/* Own score - prominent */}
          <PlayerScoreInput
            name={ownPlayerName}
            strokes={ownStrokes}
            score={ownScore}
            par={hole.par}
            isOwn
            onAdjust={(d) => onAdjustScore(ownTripPlayerId, d)}
            onSet={(v) => onSetScore(ownTripPlayerId, v)}
            fairwayHit={fairwayHit}
            girHit={girHit}
            puttsCount={puttsCount}
            onStatsChange={onStatsChange}
          />

          {/* Partners - expandable */}
          <PlayingPartnerExpander
            partners={partners.map(p => ({ ...p, par: hole.par }))}
            onAdjust={onAdjustScore}
            onSet={onSetScore}
          />
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-4 pb-6 pt-2 max-w-lg mx-auto w-full">
        <button
          onClick={onSubmit}
          disabled={saving}
          className="w-full rounded-xl bg-golf-700 py-4 text-lg font-bold text-white shadow-lg active:bg-golf-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save & Next'}
        </button>
        <button
          onClick={onClose}
          className="w-full mt-2 py-2 text-sm text-gray-500"
        >
          Back to scorecard
        </button>
      </div>
    </div>
  )
}
