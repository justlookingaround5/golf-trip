import Link from 'next/link'
import { getCourseDetail } from '@/lib/v2/course-data'
import CourseLocationMapWrapper from './course-location-map-wrapper'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { courseId } = await params
  const { from } = await searchParams

  const course = await getCourseDetail(courseId)

  const name = course?.courseName ?? 'Unknown Course'
  const location = course?.location ?? ''
  const par = course?.par ?? 72

  const backHref = from === 'courses' ? '/courses' : '/profile'
  const backLabel = from === 'courses' ? 'Courses' : 'Profile'

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-golf-800 px-4 pt-14 pb-6 text-white">
        <div className="mx-auto max-w-lg">
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1 text-sm text-golf-300 hover:text-white transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {backLabel}
          </Link>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{name}</h1>
            {course?.avgUserRating != null && (
              <div className="inline-flex flex-col items-center justify-center bg-yellow-400 text-yellow-900 rounded-xl px-3 py-1 shrink-0">
                <span className="text-2xl font-black leading-tight">{course.avgUserRating.toFixed(1)}</span>
                <span className="text-[10px] font-semibold leading-tight opacity-75">{course.totalRatings} ratings</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-8">
        {(course?.conditionRating != null || course?.layoutRating != null || course?.valueRating != null) && (
          <Section title="Community Ratings">
            <div className="grid grid-cols-3 gap-3">
              {course?.conditionRating != null && (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-4 text-center">
                  <p className="text-2xl font-black text-gray-900 tabular-nums">{course.conditionRating.toFixed(1)}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Condition</p>
                </div>
              )}
              {course?.layoutRating != null && (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-4 text-center">
                  <p className="text-2xl font-black text-gray-900 tabular-nums">{course.layoutRating.toFixed(1)}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Layout</p>
                </div>
              )}
              {course?.valueRating != null && (
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-4 text-center">
                  <p className="text-2xl font-black text-gray-900 tabular-nums">{course.valueRating.toFixed(1)}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Value</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {course && course.latitude !== 0 && course.longitude !== 0 && (
          <Section title="Location">
            <CourseLocationMapWrapper
              latitude={course.latitude}
              longitude={course.longitude}
              courseName={name}
            />
          </Section>
        )}

        {course && (
          <Section title="Course Info">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
              {location && (
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">Address</span>
                  <span className="text-sm font-bold text-gray-900 text-right max-w-[60%]">{location}</span>
                </div>
              )}
              {course.tees.length > 0 && (
                <div className="px-4 py-3">
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                      <col className="w-1/4" />
                    </colgroup>
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wide">
                        <th className="text-center font-semibold pb-2">Tee</th>
                        <th className="text-center font-semibold pb-2">Yardage</th>
                        <th className="text-center font-semibold pb-2">Slope</th>
                        <th className="text-center font-semibold pb-2">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...course.tees]
                        .sort((a, b) => a.yardage - b.yardage)
                        .map(t => {
                          const diff = t.rating - t.par
                          const diffStr = diff === 0 ? 'E' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`
                          return (
                            <tr key={t.name}>
                              <td className="py-2 text-center font-semibold text-gray-900">{t.name}</td>
                              <td className="py-2 text-center text-gray-700 tabular-nums">{t.yardage.toLocaleString()}</td>
                              <td className="py-2 text-center text-gray-700 tabular-nums">{t.slope}</td>
                              <td className="py-2 text-center tabular-nums text-gray-700">
                                {t.rating.toFixed(1)} <span className="text-gray-400">({diffStr})</span>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Section>
        )}

        {!course && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-400">Course not found</p>
          </div>
        )}
      </div>
    </div>
  )
}
