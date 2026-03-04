'use client'

interface PlayerScoreInputProps {
  name: string
  strokes: number
  score: number
  par: number
  isOwn?: boolean
  onAdjust: (delta: number) => void
  onSet: (value: number) => void
}

export default function PlayerScoreInput({
  name,
  strokes,
  score,
  par,
  isOwn,
  onAdjust,
  onSet,
}: PlayerScoreInputProps) {
  const presets: number[] = []
  for (let i = Math.max(1, par - 1); i <= par + 3; i++) {
    presets.push(i)
  }

  return (
    <div className={`rounded-lg px-3 py-3 ${isOwn ? 'bg-golf-50 border border-golf-200' : 'bg-gray-50'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {name}
            {isOwn && <span className="ml-1.5 text-xs text-golf-600">(You)</span>}
          </p>
          {strokes > 0 && (
            <p className="text-xs text-green-600">
              {strokes} stroke{strokes !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdjust(-1)}
            disabled={score <= 1}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-2xl font-bold text-red-700 active:bg-red-200 disabled:opacity-30"
          >
            &minus;
          </button>
          <span className="w-10 text-center text-2xl font-bold text-gray-900">
            {score}
          </span>
          <button
            type="button"
            onClick={() => onAdjust(1)}
            disabled={score >= 20}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl font-bold text-green-700 active:bg-green-200 disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
      <div className="flex justify-center gap-1.5">
        {presets.map(v => (
          <button
            key={v}
            onClick={() => onSet(v)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              score === v
                ? 'bg-golf-700 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
