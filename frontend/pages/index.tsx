import Head from 'next/head'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'

type Report = {
  id: number
  title: string | null
  latitude: number
  longitude: number
  severity?: string | null
  city?: string | null
  state?: string | null
  damage_type?: string | null
  files?: string[]
  predictions?: Record<string, any>
  created_at?: string
}

type Summary = {
  total_reports: number
  completed_repairs: number
  pending_repairs: number
  severity_distribution: Record<string, number>
  damage_type_distribution: Record<string, number>
  top_cities: [string, number][]
  top_states: [string, number][]
}

type User = {
  id: number
  email: string
  full_name?: string
  role: string
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const roleLabels: Record<string, string> = {
  citizen: 'Citizen',
  engineer: 'Infrastructure Engineer',
  contractor: 'Contractor',
  government: 'Government Official',
  finance: 'Finance Officer',
  admin: 'Super Admin',
}

export default function Home() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState('Loading...')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const mapContainer = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.replace('/register')
      return
    }
    setAuthReady(true)
  }, [router])

  useEffect(() => {
    async function loadData() {
      try {
        const health = await fetch(`${apiUrl}/health`)
        if (!health.ok) {
          throw new Error('Backend health check failed')
        }
        setStatus('Online')

        const reportsRes = await fetch(`${apiUrl}/api/reports`)
        if (!reportsRes.ok) {
          throw new Error(`Failed to load reports (${reportsRes.status})`)
        }
        const reportsData = await reportsRes.json()
        setReports(Array.isArray(reportsData) ? reportsData : [])

        const summaryRes = await fetch(`${apiUrl}/api/reports/summary`)
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          setSummary(summaryData)
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (token) {
          const meRes = await fetch(`${apiUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (meRes.ok) {
            const userData = await meRes.json()
            setUser(userData)
          }
        }
      } catch (err: any) {
        setStatus('Offline')
        setError(err?.message || 'Unable to connect to backend')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    if (!mapboxToken || !reports.length || !mapContainer.current) {
      return
    }

    let map: any
    let markers: any[] = []

    const initializeMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default
        mapboxgl.accessToken = mapboxToken

        map = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [reports[0].longitude, reports[0].latitude],
          zoom: 5,
        })

        map.on('load', () => {
          reports.forEach((report) => {
            const marker = new mapboxgl.Marker({ color: '#22d3ee' })
              .setLngLat([report.longitude, report.latitude])
              .setPopup(
                new mapboxgl.Popup({ offset: 15 }).setHTML(
                  `<strong>${report.title || `Report #${report.id}`}</strong><p>${report.severity || 'Unknown severity'}</p>`,
                ),
              )
              .addTo(map)
            markers.push(marker)
          })
        })
      } catch (err: any) {
        setMapError('Unable to initialize Mapbox map. Check NEXT_PUBLIC_MAPBOX_TOKEN.')
      }
    }

    initializeMap()

    return () => {
      markers.forEach((marker) => marker.remove())
      map?.remove()
    }
  }, [reports])

  const topSeverity = useMemo(() => {
    if (!summary) return 'N/A'
    return Object.entries(summary.severity_distribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  }, [summary])

  const topDamageType = useMemo(() => {
    if (!summary) return 'N/A'
    return Object.entries(summary.damage_type_distribution).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  }, [summary])

  const roleText = user ? roleLabels[user.role] || user.role : 'Guest'

  if (!authReady) {
    return <div className="min-h-screen bg-slate-950" />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Head>
        <title>SmartRoads</title>
      </Head>

      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8 sm:px-10">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-900/20 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Smart City Road Intelligence</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                SmartRoads Infrastructure Command Center
              </h1>
              <p className="mt-4 max-w-2xl text-slate-300">
                AI-powered connected vehicle monitoring, satellite verification, predictive maintenance, and government workflow automation for safer, smarter roads.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:items-end">
              <div className="rounded-3xl bg-slate-950/90 p-6 text-center ring-1 ring-slate-700 sm:w-72">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Backend Status</p>
                <p className="mt-3 text-3xl font-semibold text-cyan-300">{status}</p>
                <p className="mt-2 text-sm text-slate-400">API: {apiUrl}</p>
              </div>
              <div className="flex w-full sm:w-auto">
                <a href="/register" className="inline-flex w-full items-center justify-center rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm font-semibold text-white transition hover:border-emerald-400 hover:text-emerald-300 sm:w-auto">
                  Create account
                </a>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Reports Loaded</p>
            <p className="mt-4 text-4xl font-semibold text-white">{loading ? '...' : summary?.total_reports ?? reports.length}</p>
            <p className="mt-2 text-slate-400">Recent incident reports from vehicles and road sensors.</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Active Role</p>
            <p className="mt-4 text-4xl font-semibold text-emerald-300">{roleText}</p>
            <p className="mt-2 text-slate-400">{user ? `Signed in as ${user.email}` : 'Not authenticated yet'}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Top Damage Type</p>
            <p className="mt-4 text-4xl font-semibold text-amber-300">{topDamageType}</p>
            <p className="mt-2 text-slate-400">Primary issue classification from recent reports.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Vehicle Camera & Media Upload</h2>
              <p className="mt-2 text-slate-400">Submit a road image or video from a vehicle camera, dashcam, or citizen report, with GPS coordinates attached automatically.</p>
              <p className="mt-2 text-sm text-cyan-300">You can now use <span className="font-medium">http://localhost:3000/report</span> for image/video report submissions.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="/monitoring" className="inline-flex items-center justify-center rounded-3xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
                Open monitoring center
              </a>
              <a href="/report" className="inline-flex items-center justify-center rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                Submit road image or video
              </a>
              <a href="/ai-prompt" className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm text-white transition hover:border-cyan-400 hover:text-cyan-200">
                View AI prompt
              </a>
              <div className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm text-white">
                {user ? `Welcome back, ${roleText}` : 'Login to see assignments'}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-sm text-slate-300">
            <p className="font-semibold text-white">Developer prompt for AI damage detection</p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-200">
{`Analyze this road image and GPS location for automatic detection, monitoring, and management of road damage.
Detect potholes, cracks, edge failures, broken roads, damaged bridges, uneven surfaces, missing lane markings, waterlogging, and other infrastructure issues.
Automatically capture GPS coordinates, date, time, road name, district, city, state, weather, device information, vehicle speed, and direction.
Classify severity as Minor, Moderate, Major, Critical with confidence scores, estimate damaged length, width, depth, area, repair priority, and remaining road life.
Return structured fields for reports and repair estimates, including Road ID, Damage Type, Damage Severity, Materials Required, Estimated Cost, Contractor Assignment, and Verification Status.`}
            </pre>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Repair accountability</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Contractor response to approved public evidence</h2>
              <p className="mt-2 max-w-3xl text-slate-400">
                Manage proposed deadlines, completion evidence, AI comparison videos, official verification, moderator approval, and approved social publishing from one case workflow.
              </p>
            </div>
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
              Official review required
            </span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['1', 'Contractor response', 'Promise a completion date, repair plan, delay reason, and duration.'],
              ['2', 'Authority deadline', 'Accept, reject, or request a different proposed date.'],
              ['3', 'Evidence and AI video', 'Upload photos and video, then compare before and after repair.'],
              ['4', 'Moderated publishing', 'Verify privacy, approve the evidence video, and export to social media.'],
            ].map(([number, title, description]) => (
              <div key={number} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400 font-bold text-slate-950">{number}</span>
                  <h3 className="font-semibold text-white">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!user && (
              <>
                <a href="/login" className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                  Sign in to access workflow
                </a>
                <a href="/register" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-emerald-400 hover:text-emerald-300">
                  Create account
                </a>
              </>
            )}
            {user?.role === 'contractor' && (
              <a href="/contractor-dashboard" className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
                Open contractor cases
              </a>
            )}
            {user && ['government', 'finance', 'admin'].includes(user.role) && (
              <a href="/authority-review" className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">
                Review deadlines and evidence
              </a>
            )}
            <a href="/monitoring" className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-200">
              Open case monitoring
            </a>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Road Condition Analytics</h2>
                <p className="mt-2 text-slate-400">Summary metrics for engineers, contractors, and road management officials.</p>
              </div>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-200 ring-1 ring-cyan-300/20">
                Dashboard summary
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Completed Repairs</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-300">{summary?.completed_repairs ?? '...'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Pending Repairs</p>
                <p className="mt-3 text-3xl font-semibold text-amber-300">{summary?.pending_repairs ?? '...'}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Highest Severity</p>
                <p className="mt-3 text-3xl font-semibold text-white">{topSeverity}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Top City</p>
                <p className="mt-3 text-3xl font-semibold text-white">{summary?.top_cities[0]?.[0] ?? 'Unknown'}</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Top State</p>
                <p className="mt-3 text-3xl font-semibold text-white">{summary?.top_states[0]?.[0] ?? 'Unknown'}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Severity Distribution</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  {summary ? (
                    Object.entries(summary.severity_distribution).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between rounded-2xl bg-slate-900/80 px-4 py-3">
                        <span>{severity}</span>
                        <span className="font-semibold text-white">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p>Loading distribution…</p>
                  )}
                </div>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Damage Categories</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  {summary ? (
                    Object.entries(summary.damage_type_distribution).map(([damageType, count]) => (
                      <div key={damageType} className="flex items-center justify-between rounded-2xl bg-slate-900/80 px-4 py-3">
                        <span>{damageType}</span>
                        <span className="font-semibold text-white">{count}</span>
                      </div>
                    ))
                  ) : (
                    <p>Loading categories…</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Role-based workflow</h2>
                  <p className="mt-2 text-slate-400">SmartRoads adapts to your role and shows the right operational next steps.</p>
                </div>
                <span className="rounded-full bg-slate-800/80 px-3 py-1 text-sm text-slate-200 ring-1 ring-slate-700">{roleText}</span>
              </div>

              {user ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-slate-300">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Welcome back</p>
                  <p className="mt-3 text-white">{roleText} dashboard is active for {user.email}.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a href="/report" className="rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                      Submit road report
                    </a>
                    {user.role === 'contractor' && (
                      <a href="/contractor-dashboard" className="rounded-3xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300">
                        Contractor workflow
                      </a>
                    )}
                    {['government', 'finance', 'admin'].includes(user.role) && (
                      <a href="/authority-review" className="rounded-3xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">
                        Authority review
                      </a>
                    )}
                    {['engineer', 'government', 'finance', 'admin'].includes(user.role) && (
                      <a href="/monitoring" className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white transition hover:border-cyan-400 hover:text-cyan-200">
                        Monitoring center
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-slate-300">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Guest mode</p>
                  <p className="mt-3 text-white">Login or register to unlock assignments, approvals, and contractor workflows.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a href="/login" className="rounded-3xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">Login</a>
                    <a href="/register" className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white transition hover:border-cyan-400/40 hover:bg-slate-900/90">Register</a>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-sm text-slate-300">
              <h3 className="font-semibold text-white">Map & GIS Preview</h3>
              {mapboxToken ? (
                <div className="mt-4 h-80 w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950" ref={mapContainer} />
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-700 bg-slate-900/80 p-6 text-slate-400">
                  <p className="text-sm">A Mapbox GIS preview will render here once NEXT_PUBLIC_MAPBOX_TOKEN is configured.</p>
                  <p className="mt-3">For now, use the report list and coordinates below to inspect active locations.</p>
                  <div className="mt-4 space-y-2 text-xs text-slate-300">
                    {reports.slice(0, 5).map((report) => (
                      <div key={report.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                        <p className="font-medium text-white">{report.title || `Report #${report.id}`}</p>
                        <p>{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</p>
                        <p>{report.severity || 'Unknown'} · {report.damage_type || 'Unknown type'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {mapError ? <p className="mt-4 text-sm text-rose-300">{mapError}</p> : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
