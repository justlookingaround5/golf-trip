import Link from 'next/link'

export default function JoinPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-3xl font-bold text-golf-900 mb-1">
            <span className="text-gold">Fore</span>Live
          </div>
          <p className="text-gray-500">Join a trip or start your own</p>
        </div>

        {/* Join with code */}
        <Link
          href="/join/code"
          className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-golf-600 transition-all"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">🔑</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">I have a join code</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter the 4-character code from your trip organizer
              </p>
            </div>
          </div>
        </Link>

        {/* Create a trip */}
        <Link
          href="/admin/login"
          className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-golf-600 transition-all"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">⛳</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create a trip</h2>
              <p className="text-sm text-gray-500 mt-1">
                Set up courses, invite players, and track scores
              </p>
            </div>
          </div>
        </Link>

        {/* Back to home */}
        <p className="text-center text-sm text-gray-400">
          <Link href="/" className="hover:text-golf-700 transition-colors">
            &larr; Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
