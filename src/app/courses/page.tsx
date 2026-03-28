import { getPublicCourseRatings } from '@/lib/v2/courses-data'
import CoursesClient from './courses-client'

export default async function CoursesPage() {
  const courses = await getPublicCourseRatings()
  return <CoursesClient courses={courses} />
}
