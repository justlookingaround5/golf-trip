'use client'

import { useState } from 'react'

interface CourseRatingModalProps {
  courseId: string
  tripId: string
  courseName: string
  initialRating?: { overall: number; condition: number | null; layout: number | null; value: number | null } | null
  onClose: () => void
}

function RatingRow({ label, value, onChange, required }: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  required?: boolean
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n && !required ? null : n)}
            className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
              value === n
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CourseRatingModal({ courseId, tripId, courseName, initialRating, onClose }: CourseRatingModalProps) {
  const [overall, setOverall] = useState<number | null>(initialRating?.overall ?? null)
  const [condition, setCondition] = useState<number | null>(initialRating?.condition ?? null)
  const [layout, setLayout] = useState<number | null>(initialRating?.layout ?? null)
  const [value, setValue] = useState<number | null>(initialRating?.value ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!overall) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/courses/${courseId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          overall,
          condition,
          layout,
          value,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to submit rating')
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Rate {courseName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <RatingRow label="Overall" value={overall} onChange={setOverall} required />
        <RatingRow label="Condition" value={condition} onChange={setCondition} />
        <RatingRow label="Layout" value={layout} onChange={setLayout} />
        <RatingRow label="Value" value={value} onChange={setValue} />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={!overall || submitting}
            className="flex-1 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  )
}
