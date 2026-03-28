'use client'

import dynamic from 'next/dynamic'

const CourseLocationMap = dynamic(() => import('./course-location-map'), { ssr: false })

export default function CourseLocationMapWrapper(props: {
  latitude: number
  longitude: number
  courseName: string
}) {
  return <CourseLocationMap {...props} />
}
