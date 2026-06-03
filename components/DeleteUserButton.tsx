"use client"

export default function DeleteUserButton({
  action,
  username,
}: {
  action: () => Promise<void>
  username: string
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(`Delete @${username}? This removes their account. They can sign up again with a new account.`)) {
            e.preventDefault()
          }
        }}
        className="text-gray-600 hover:text-red-400 text-xs font-bold transition"
      >
        Delete
      </button>
    </form>
  )
}
