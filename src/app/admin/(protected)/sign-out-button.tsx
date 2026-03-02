'use client'

export default function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-md bg-green-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-950 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-800"
      >
        Sign Out
      </button>
    </form>
  )
}
