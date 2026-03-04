'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface CourseVote {
  id: string
  course_name: string
  proposed_by: string | null
  course_vote_responses: { id: string; user_id: string; vote: number }[]
}

interface DatePoll {
  id: string
  date_option: string
  proposed_by: string | null
  date_poll_responses: { id: string; user_id: string; available: boolean }[]
}

export default function PlanningSection({ tripId }: { tripId: string }) {
  const [courseVotes, setCourseVotes] = useState<CourseVote[]>([])
  const [datePolls, setDatePolls] = useState<DatePoll[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Course suggestion
  const [newCourse, setNewCourse] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)

  // Date suggestion
  const [newDate, setNewDate] = useState('')
  const [addingDate, setAddingDate] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}/polls`)
      if (res.ok) {
        const data = await res.json()
        setCourseVotes(data.course_votes)
        setDatePolls(data.date_polls)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id)
    })
    loadData()
  }, [loadData])

  async function addCourse() {
    if (!newCourse.trim()) return
    setAddingCourse(true)
    try {
      const res = await fetch(`/api/trips/${tripId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'course_vote', course_name: newCourse.trim() }),
      })
      if (res.ok) {
        setNewCourse('')
        loadData()
      }
    } catch {
      // ignore
    } finally {
      setAddingCourse(false)
    }
  }

  async function addDate() {
    if (!newDate) return
    setAddingDate(true)
    try {
      const res = await fetch(`/api/trips/${tripId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'date_poll', date_option: newDate }),
      })
      if (res.ok) {
        setNewDate('')
        loadData()
      }
    } catch {
      // ignore
    } finally {
      setAddingDate(false)
    }
  }

  async function voteCourse(courseVoteId: string, vote: number) {
    await fetch(`/api/trips/${tripId}/polls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'course_vote_response', course_vote_id: courseVoteId, vote }),
    })
    loadData()
  }

  async function respondDate(datePollId: string, available: boolean) {
    await fetch(`/api/trips/${tripId}/polls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'date_poll_response', date_poll_id: datePollId, available }),
    })
    loadData()
  }

  if (loading) return null

  // Don't show if no polls exist and user isn't logged in
  if (!currentUserId && courseVotes.length === 0 && datePolls.length === 0) return null

  return (
    <div className="space-y-6">
      {/* Course Voting */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Course Suggestions
        </h3>

        {courseVotes.length > 0 && (
          <div className="mb-4 space-y-2">
            {courseVotes.map(cv => {
              const yesVotes = cv.course_vote_responses.filter(r => r.vote === 1).length
              const noVotes = cv.course_vote_responses.filter(r => r.vote === -1).length
              const myVote = cv.course_vote_responses.find(r => r.user_id === currentUserId)?.vote

              return (
                <div key={cv.id} className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-700 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cv.course_name}</p>
                    <p className="text-xs text-gray-500">
                      {yesVotes > 0 && <span className="text-green-600">{yesVotes} yes</span>}
                      {yesVotes > 0 && noVotes > 0 && ' / '}
                      {noVotes > 0 && <span className="text-red-600">{noVotes} no</span>}
                      {yesVotes === 0 && noVotes === 0 && 'No votes yet'}
                    </p>
                  </div>
                  {currentUserId && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => voteCourse(cv.id, 1)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          myVote === 1
                            ? 'bg-green-600 text-white'
                            : 'border border-gray-300 text-gray-600 hover:bg-green-50'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => voteCourse(cv.id, -1)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          myVote === -1
                            ? 'bg-red-600 text-white'
                            : 'border border-gray-300 text-gray-600 hover:bg-red-50'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {currentUserId && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCourse}
              onChange={(e) => setNewCourse(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addCourse() }}
              placeholder="Suggest a course..."
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
            <button
              type="button"
              onClick={addCourse}
              disabled={addingCourse || !newCourse.trim()}
              className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Date Availability */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Date Availability
        </h3>

        {datePolls.length > 0 && (
          <div className="mb-4 space-y-2">
            {datePolls.map(dp => {
              const yesCount = dp.date_poll_responses.filter(r => r.available).length
              const totalResponses = dp.date_poll_responses.length
              const myResponse = dp.date_poll_responses.find(r => r.user_id === currentUserId)

              return (
                <div key={dp.id} className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-700 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {new Date(dp.date_option + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {totalResponses > 0
                        ? `${yesCount}/${totalResponses} available`
                        : 'No responses yet'}
                    </p>
                  </div>
                  {currentUserId && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => respondDate(dp.id, true)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          myResponse?.available === true
                            ? 'bg-green-600 text-white'
                            : 'border border-gray-300 text-gray-600 hover:bg-green-50'
                        }`}
                      >
                        Available
                      </button>
                      <button
                        type="button"
                        onClick={() => respondDate(dp.id, false)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          myResponse?.available === false
                            ? 'bg-red-600 text-white'
                            : 'border border-gray-300 text-gray-600 hover:bg-red-50'
                        }`}
                      >
                        Not available
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {currentUserId && (
          <div className="flex gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-golf-500 focus:outline-none focus:ring-1 focus:ring-golf-500"
            />
            <button
              type="button"
              onClick={addDate}
              disabled={addingDate || !newDate}
              className="rounded-md bg-golf-700 px-4 py-2 text-sm font-medium text-white hover:bg-golf-800 disabled:opacity-50"
            >
              Add Date
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
