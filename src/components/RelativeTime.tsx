'use client'

import { useState, useEffect } from 'react'

function computeTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

export default function RelativeTime({ date }: { date: string }) {
  const [text, setText] = useState('')

  useEffect(() => {
    setText(computeTimeAgo(date))
  }, [date])

  return <>{text}</>
}
