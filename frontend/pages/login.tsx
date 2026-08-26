import { useState } from 'react'
import { useRouter } from 'next/router'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function submit(e: any) {
    e.preventDefault()
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        throw new Error(error?.detail || 'Login failed')
      }

      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      router.push('/')
    } catch (error: any) {
      alert(error?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:px-10">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl shadow-slate-900/20">
        <h1 className="text-3xl font-semibold text-white">Login to SmartRoads</h1>
        <p className="mt-3 text-slate-400">Access your role-based dashboard, manage reports, and submit vehicle camera damage captures.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
            placeholder="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
            placeholder="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
