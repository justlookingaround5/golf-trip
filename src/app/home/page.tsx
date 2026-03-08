import { redirect } from 'next/navigation'

// Legacy /home path — redirect to new home at /
export default function LegacyHomePage() {
  redirect('/')
}
