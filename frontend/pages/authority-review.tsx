import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { workflowApi } from '../lib/api'
import { WorkflowReport, User, formatDate, getDaysRemaining } from '../lib/workflow-types'

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

export default function AuthorityReview() {
  const router = useRouter()
  const [reports, setReports] = useState<WorkflowReport[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<WorkflowReport | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewForm, setReviewForm] = useState({
    decision: 'accepted',
    accepted_deadline: '',
    notes: '',
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

        if (!['government', 'finance', 'admin', 'engineer'].includes(userData.role)) {
          router.replace('/')
          return
        }

        const reportsData = await workflowApi.listReports()
        setReports(reportsData)
      } catch (err: any) {
        setError(err?.message || 'Unable to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const needsReview = reports.filter(r => r.workflow_status === 'contractor_responded')
  const acceptedDeadlines = reports.filter(r => r.workflow_status === 'date_accepted' || r.workflow_status === 'in_progress')
  const overdue = reports.filter(r => r.workflow_status === 'overdue' || r.workflow_status === 'failed')

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReport) return
    setSubmitting(true)
    setSubmitMessage(null)
    try {
      const data: { decision: string; accepted_deadline?: string; notes?: string } = {
        decision: reviewForm.decision,
        notes: reviewForm.notes,
      }
      if (reviewForm.decision === 'accepted') {
        data.accepted_deadline = reviewForm.accepted_deadline
      }
      await workflowApi.reviewDate(selectedReport.id, data)
      setSubmitMessage('Review recorded successfully!')
      setShowReviewModal(false)
      setReviewForm({ decision: 'accepted', accepted_deadline: '', notes: '' })
      const updated = await workflowApi.listReports()
      setReports(updated)
      setSelectedReport(null)
    } catch (err: any) {
      setSubmitMessage(err?.message || 'Failed to record review')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return <div className="min-h-screen bg-slate-950" />
  }

  if (!['government', 'finance', 'admin', 'engineer'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:px-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
          <h1 className="text-2xl font-semibold text-white">Access Denied</h1>
          <p className="mt-4 text-slate-400">This page is for government officials, engineers, and admins only.</p>
          <a href="/" className="mt-6 inline-block rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950">Go to Dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Head>
        <title>Authority Review | SmartRoads</title>
      </Head>

      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">SmartRoads</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Authority Review Center</h1>
            <p className="text-sm text-slate-400">Welcome, {user.full_name || user.email} ({user.role})</p>
          </div>
          <a href="/" className="rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm text-white transition hover:border-cyan-400 hover:text-cyan-200">Back to Command Center</a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        )}

        {/* Summary cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Awaiting Review</p>
            <p className="mt-3 text-4xl font-semibold text-amber-300">{needsReview.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Deadlines Active</p>
            <p className="mt-3 text-4xl font-semibold text-cyan-300">{acceptedDeadlines.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Overdue / Failed</p>
            <p className="mt-3 text-4xl font-semibold text-rose-300">{overdue.length}</p>
          </div>
        </section>

        {/* Cases needing review */}
        {needsReview.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-semibold text-white">Cases Awaiting Date Review</h2>
            <div className="space-y-4">
              {needsReview.map((report) => (
                <div key={report.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{report.title || `Case #${report.id}`}</h3>
                      <p className="text-sm text-slate-400">{report.road_name || 'Unknown road'} · {report.city || 'Unknown city'}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Contractor: {report.assigned_contractor || 'Unassigned'} ·
                        Severity: {report.severity || 'Unknown'}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedReport(report); setShowReviewModal(true) }}
                      className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Review Date
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All cases */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">All Workflow Cases</h2>
          {loading ? (
            <p className="text-slate-400">Loading cases...</p>
          ) : reports.length === 0 ? (
            <p className="text-slate-400">No cases in the workflow.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Case</th>
                    <th className="px-4 py-3">Contractor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Proposed Date</th>
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
                          <p className="text-xs text-slate-500">{report.damage_type || 'Unknown'} · {report.severity || 'Unknown'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{report.assigned_contractor || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusBadge(report.workflow_status)}`}>
                            {report.workflow_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(report.expected_completion_date)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(report.accepted_deadline)}</td>
                        <td className="px-4 py-3">
                          {daysLeft !== null ? (
                            <span className={`font-semibold ${daysLeft < 0 ? 'text-rose-400' : daysLeft <= 3 ? 'text-rose-300' : daysLeft <= 7 ? 'text-amber-300' : 'text-emerald-300'}`}>
                              {daysLeft < 0 ? 'EXPIRED' : daysLeft}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {report.workflow_status === 'contractor_responded' ? (
                            <button
                              onClick={() => { setSelectedReport(report); setShowReviewModal(true) }}
                              className="rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
                            >
                              Review
                            </button>
                          ) : (
                            <button
                              onClick={() => router.push(`/case-detail?id=${report.id}`)}
                              className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs text-cyan-300 transition hover:bg-slate-700"
                            >
                              Details
                            </button>
                          )}
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

      {/* Review Modal */}
      {showReviewModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-white">Review Contractor Date — Case #{selectedReport.id}</h2>
            <p className="mt-2 text-slate-400">
              {selectedReport.title || 'Road damage case'} · {selectedReport.road_name}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Contractor: {selectedReport.assigned_contractor || 'Unassigned'}
            </p>

            <form onSubmit={handleReview} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Decision</label>
                <select
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
                  value={reviewForm.decision}
                  onChange={(e) => setReviewForm({ ...reviewForm, decision: e.target.value })}
                  disabled={submitting}
                >
                  <option value="accepted">Accept Proposed Date</option>
                  <option value="rejected">Reject Proposed Date</option>
                  <option value="revision_requested">Request Revision</option>
                </select>
              </div>

              {reviewForm.decision === 'accepted' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Accepted Deadline</label>
                  <input
                    type="date"
                    required
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500"
                    value={reviewForm.accepted_deadline}
                    onChange={(e) => setReviewForm({ ...reviewForm, accepted_deadline: e.target.value })}
                    disabled={submitting}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    The official repair deadline. Contractor must complete by this date.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white mb-2">Notes</label>
                <textarea
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-500 resize-none h-24"
                  placeholder="Add any notes about this decision..."
                  value={reviewForm.notes}
                  onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
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
                  onClick={() => setShowReviewModal(false)}
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
                  {submitting ? 'Recording...' : 'Record Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
