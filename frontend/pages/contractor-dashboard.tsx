import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { workflowApi } from '../lib/api'
import { WorkflowReport, User, Notification, getDaysRemaining, getUrgencyLevel, formatDate, formatDateTime } from '../lib/workflow-types'
import CountdownTimer from '../components/CountdownTimer'

const roleLabels: Record<string, string> = {
  citizen: 'Citizen',
  engineer: 'Infrastructure Engineer',
  contractor: 'Contractor',
  government: 'Government Official',
  finance: 'Finance Officer',
  admin: 'Super Admin',
}

function statusBadge(status: string) {
  const config: Record<string, string> = {
    reported: 'bg-slate-500/15 text-slate-300 ring-slate-400/20',
    contractor_notified: 'bg-cyan-500/15 text-cyan-300 ring-cyan-400/20',
    contractor_responded: 'bg-amber-500/15 text-amber-300 ring-amber-400/20',
    date_accepted: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    in_progress: 'bg-blue-500/15 text-blue-300 ring-blue-400/20',
    evidence_submitted: 'bg-purple-500/15 text-purple-300 ring-purple-400/20',
    ai_analysis: 'bg-indigo-500/15 text-indigo-300 ring-indigo-400/20',
    official_verification: 'bg-orange-500/15 text-orange-300 ring-orange-400/20',
    resolved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    overdue: 'bg-rose-500/15 text-rose-300 ring-rose-400/20',
    failed: 'bg-rose-700/15 text-rose-400 ring-rose-500/20',
  }
  return config[status] || 'bg-slate-500/15 text-slate-300 ring-slate-400/20'
}

export default function ContractorDashboard() {
  const router = useRouter()
  const [reports, setReports] = useState<WorkflowReport[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<WorkflowReport | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [responseForm, setResponseForm] = useState({
    expected_completion_date: '',
    repair_plan: '',
    reason_for_delay: '',
    estimated_work_duration: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      router.replace('/login')
      return
    }

    async function loadData() {
      try {
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!meRes.ok) throw new Error('Failed to load user')
        const userData = await meRes.json()
        setUser(userData)

        if (userData.role !== 'contractor') {
          // Redirect non-contractors
          router.replace('/')
          return
        }

        const reportsData = await workflowApi.listReports()
        setReports(reportsData)
        setNotifications(await workflowApi.getNotifications())
      } catch (err: any) {
        setError(err?.message || 'Unable to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReport) return
    setSubmitting(true)
    setSubmitMessage(null)
    try {
      await workflowApi.submitResponse(selectedReport.id, responseForm)
      setSubmitMessage('Response submitted successfully!')
      setShowResponseForm(false)
      setResponseForm({
        expected_completion_date: '',
        repair_plan: '',
        reason_for_delay: '',
        estimated_work_duration: '',
      })
      // Refresh reports
      const updated = await workflowApi.listReports()
      setReports(updated)
      setSelectedReport(null)
    } catch (err: any) {
      setSubmitMessage(err?.message || 'Failed to submit response')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingResponse = reports.filter(r => r.workflow_status === 'contractor_notified')
  const inProgress = reports.filter(r => r.workflow_status === 'date_accepted' || r.workflow_status === 'in_progress')
  const overdue = reports.filter(r => r.workflow_status === 'overdue' || r.workflow_status === 'failed')

  if (!user) {
    return <div className="min-h-screen bg-slate-950" />
  }

  if (user.role !== 'contractor') {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:px-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
          <h1 className="text-2xl font-semibold text-white">Access Denied</h1>
          <p className="mt-4 text-slate-400">This dashboard is for contractors only.</p>
          <a href="/" className="mt-6 inline-block rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950">Go to Dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Head>
        <title>Contractor Dashboard | SmartRoads</title>
      </Head>

      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">SmartRoads</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Contractor Dashboard</h1>
            <p className="text-sm text-slate-400">Welcome back, {user.full_name || user.email}</p>
          </div>
          <a href="/" className="rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm text-white transition hover:border-cyan-400 hover:text-cyan-200">Back to Command Center</a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        )}

        {notifications.length > 0 && (
          <section className="mb-8 rounded-3xl border border-cyan-400/30 bg-cyan-400/5 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Notifications</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Messages from SmartRoads</h2>
              </div>
              <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-200">
                {notifications.filter((notification) => !notification.is_read).length} unread
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className={`rounded-2xl border p-4 ${notification.is_read ? 'border-slate-800 bg-slate-950/50' : 'border-cyan-400/30 bg-slate-950/80'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-white">{notification.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{notification.message}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      {notification.report_id && (
                        <button
                          onClick={() => router.push(`/case-detail?id=${notification.report_id}`)}
                          className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
                        >
                          Open Case
                        </button>
                      )}
                      {!notification.is_read && (
                        <button
                          onClick={async () => {
                            await workflowApi.markNotificationRead(notification.id)
                            setNotifications(notifications.map((item) => item.id === notification.id ? { ...item, is_read: true } : item))
                          }}
                          className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-400 hover:text-cyan-200"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Summary cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Awaiting Response</p>
            <p className="mt-3 text-4xl font-semibold text-amber-300">{pendingResponse.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">In Progress</p>
            <p className="mt-3 text-4xl font-semibold text-cyan-300">{inProgress.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Overdue / Failed</p>
            <p className="mt-3 text-4xl font-semibold text-rose-300">{overdue.length}</p>
          </div>
        </section>

        {/* Cases needing response */}
        {pendingResponse.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-white">Cases Awaiting Your Response</h2>
            <div className="space-y-4">
              {pendingResponse.map((report) => (
                <div key={report.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{report.title || `Case #${report.id}`}</h3>
                      <p className="text-sm text-slate-400">{report.road_name || 'Unknown road'} · {report.city || 'Unknown city'}</p>
                      <p className="text-xs text-slate-500 mt-1">Severity: {report.severity || 'Unknown'} · Damage: {report.damage_type || 'Unknown'}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedReport(report); setShowResponseForm(true) }}
                      className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Submit Response
                    </button>
                  </div>
                  {report.contractor_response_deadline && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500">
                        Response deadline: {formatDate(report.contractor_response_deadline)}
                        {' · ' + getDaysRemaining(report.contractor_response_deadline) + ' days remaining'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All cases */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">All Assigned Cases</h2>
          {loading ? (
            <p className="text-slate-400">Loading cases...</p>
          ) : reports.length === 0 ? (
            <p className="text-slate-400">No cases assigned to you.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Case</th>
                    <th className="px-4 py-3">Road</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Days Left</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const daysLeft = getDaysRemaining(report.accepted_deadline)
                    return (
                      <tr key={report.id} className="border-t border-slate-800/80 hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{report.title || `Case #${report.id}`}</p>
                          <p className="text-xs text-slate-500">{report.damage_type || 'Unknown type'} · {report.severity || 'Unknown'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{report.road_name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusBadge(report.workflow_status)}`}>
                            {report.workflow_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(report.accepted_deadline)}</td>
                        <td className="px-4 py-3">
                          {daysLeft !== null ? (
                            <span className={`font-semibold ${daysLeft < 0 ? 'text-rose-400' : daysLeft <= 3 ? 'text-rose-300' : daysLeft <= 7 ? 'text-amber-300' : 'text-emerald-300'}`}>
                              {daysLeft < 0 ? 'EXPIRED' : daysLeft}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => router.push(`/case-detail?id=${report.id}`)}
                            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs text-cyan-300 transition hover:bg-slate-700"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Response Form Modal */}
      {showResponseForm && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-white">Submit Response — Case #{selectedReport.id}</h2>
            <p className="mt-2 text-slate-400">
              {selectedReport.title || 'Road damage case'} · {selectedReport.road_name}
            </p>

            <form onSubmit={handleRespond} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Expected Repair Completion Date</label>
                <input
                  type="date"
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
                  value={responseForm.expected_completion_date}
                  onChange={(e) => setResponseForm({ ...responseForm, expected_completion_date: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Repair Plan</label>
                <textarea
                  required
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500 resize-none h-24"
                  placeholder="Describe the repair approach, materials, and methodology..."
                  value={responseForm.repair_plan}
                  onChange={(e) => setResponseForm({ ...responseForm, repair_plan: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Reason for Delay (if applicable)</label>
                <textarea
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500 resize-none h-20"
                  placeholder="If the proposed date is later than ideal, explain why..."
                  value={responseForm.reason_for_delay}
                  onChange={(e) => setResponseForm({ ...responseForm, reason_for_delay: e.target.value })}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Estimated Work Duration</label>
                <input
                  type="text"
                  placeholder="e.g., 5 days, 2 weeks"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
                  value={responseForm.estimated_work_duration}
                  onChange={(e) => setResponseForm({ ...responseForm, estimated_work_duration: e.target.value })}
                  disabled={submitting}
                />
              </div>

              {submitMessage && (
                <div className={`rounded-xl border px-4 py-3 text-sm ${
                  submitMessage.includes('success')
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                }`}>
                  {submitMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResponseForm(false)}
                  className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-400"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
