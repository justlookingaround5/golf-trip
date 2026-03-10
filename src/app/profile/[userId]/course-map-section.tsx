'use client'

import dynamic from 'next/dynamic'
import type { CoursePinData } from '@/components/CourseMap'

const CourseMap = dynamic(() => import('@/components/CourseMap'), { ssr: false })

export default function CourseMapSection({ pins }: { pins: CoursePinData[] }) {
  return <CourseMap pins={pins} />
}
