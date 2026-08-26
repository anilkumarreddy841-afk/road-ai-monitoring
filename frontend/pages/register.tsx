import { useState } from 'react'
import { useRouter } from 'next/router'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function submit(e: any) {
    e.preventDefault()
    try {
      try {
        await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password)
      } catch (error: any) {
        if (error?.code !== 'auth/email-already-in-use') throw error
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
      }
      const idToken = await firebaseAuth.currentUser?.getIdToken()
      if (!idToken) throw new Error('Firebase registration did not return an authentication token')

      const res = await fetch(`${apiUrl}/api/auth/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })

      if (!res.ok) {
        const legacyRes = await fetch(`${apiUrl}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        })
        if (!legacyRes.ok) {
          const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim(), password }),
          })
          if (!loginRes.ok) {
            const error = await loginRes.json().catch(() => null)
            throw new Error(error?.detail || 'Registration failed')
          }
          const data = await loginRes.json()
          localStorage.setItem('token', data.access_token)
          router.push('/')
          return
        }
        const data = await legacyRes.json()
        localStorage.setItem('token', data.access_token)
        router.push('/')
        return
      }

      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      router.push('/')
    } catch (error: any) {
      alert(error?.message || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:px-10">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl shadow-slate-900/20">
        <h1 className="text-3xl font-semibold text-white">Create your SmartRoads account</h1>
        <p className="mt-3 text-slate-400">Register to submit reports, access role-based dashboards, and receive repair task assignments.</p>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="w-full rounded-3xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
            Register
          </button>
        </form>
      </div>
    </div>
  )
}
