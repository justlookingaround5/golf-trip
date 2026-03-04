'use client'

interface CourseInfoBarProps {
  par: number
  handicapIndex: number
  yardage?: Record<string, number>
  playerTee?: string
}

export default function CourseInfoBar({
  par,
  handicapIndex,
  yardage,
  playerTee,
}: CourseInfoBarProps) {
  // Display yardage for player's tee, or first available
  const teeToShow = playerTee && yardage?.[playerTee]
    ? playerTee
    : yardage ? Object.keys(yardage)[0] : null

  const yards = teeToShow && yardage ? yardage[teeToShow] : null

  return (
    <div className="flex items-center justify-center gap-4 text-sm">
      {yards && (
        <span className="rounded-full bg-golf-100 px-2.5 py-0.5 text-golf-800 font-medium">
          {yards} yds
          {teeToShow && <span className="ml-1 text-xs opacity-70">({teeToShow})</span>}
        </span>
      )}
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-700 font-medium">
        Par {par}
      </span>
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-700 font-medium">
        Hdcp {handicapIndex}
      </span>
    </div>
  )
}
