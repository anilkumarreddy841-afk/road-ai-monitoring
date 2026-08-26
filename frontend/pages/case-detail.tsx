import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { workflowApi } from '../lib/api'
import { WorkflowDetail, User, formatDate, formatDateTime, getDaysRemaining } from '../lib/workflow-types'
import CountdownTimer from '../components/CountdownTimer'
import StatusTimeline from '../components/StatusTimeline'
import EvidenceUploader from '../components/EvidenceUploader'

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

export default function CaseDetail() {
  const router = useRouter()
  const { id } = router.query
  const [detail, setDetail] = useState<WorkflowDetail | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [showEvidenceUploader, setShowEvidenceUploader] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishPlatforms, setPublishPlatforms] = useState<string[]>(['youtube', 'instagram', 'facebook', 'x'])

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
      } catch (err: any) {
        setError(err?.message || 'Unable to load user')
      }
    }

    loadData()
  }, [router])

  useEffect(() => {
    if (!id) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return

    async function loadDetail() {
      try {
        const data = await workflowApi.getDetail(parseInt(id as string))
        setDetail(data)
      } catch (err: any) {
        setError(err?.message || 'Unable to load case details')
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [id])

  const handleEvidenceSubmit = async (data: { completion_report: string; photos: File[]; video: File | null }) => {
    if (!detail) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      await workflowApi.uploadEvidence(detail.report.id, data)
      setActionMessage('Evidence submitted successfully!')
      setShowEvidenceUploader(false)
      const updated = await workflowApi.getDetail(detail.report.id)
      setDetail(updated)
    } catch (err: any) {
      setActionMessage(err?.message || 'Failed to submit evidence')
    } finally {
      setActionLoading(false)
    }
  }

  const handleVerify = async (status: string, notes?: string) => {
    if (!detail) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      await workflowApi.verifyEvidence(detail.report.id, { status, notes })
      setActionMessage(`Evidence ${status}!`)
      const updated = await workflowApi.getDetail(detail.report.id)
      setDetail(updated)
    } catch (err: any) {
      setActionMessage(err?.message || 'Failed to verify evidence')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!detail) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      await workflowApi.generateVideo(detail.report.id)
      setActionMessage('Evidence video generated!')
      const updated = await workflowApi.getDetail(detail.report.id)
      setDetail(updated)
    } catch (err: any) {
      setActionMessage(err?.message || 'Failed to generate video')
    } finally {
      setActionLoading(false)
    }
  }

  const handleModerate = async (approved: boolean, notes?: string) => {
    if (!detail) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      await workflowApi.moderateVideo(detail.report.id, { approved, notes })
      setActionMessage(`Video ${approved ? 'approved' : 'rejected'}!`)
      const updated = await workflowApi.getDetail(detail.report.id)
      setDetail(updated)
    } catch (err: any) {
      setActionMessage(err?.message || 'Failed to moderate video')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!detail) return
    setActionLoading(true)
    setActionMessage(null)
    try {
      await workflowApi.publishToSocial(detail.report.id, publishPlatforms)
      setActionMessage('Published to social media!')
      setShowPublishModal(false)
      const updated = await workflowApi.getDetail(detail.report.id)
      setDetail(updated)
    } catch (err: any) {
      setActionMessage(err?.message || 'Failed to publish')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading case details...</p>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:px-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/90 p-8">
          <h1 className="text-2xl font-semibold text-white">Case Not Found</h1>
          <p className="mt-4 text-slate-400">{error || 'The requested case could not be found.'}</p>
          <a href="/" className="mt-6 inline-block rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950">Go to Dashboard</a>
        </div>
      </div>
    )
  }

  const { report, contractor_response, authority_review, completion_evidence, evidence_video, social_media_posts } = detail
  const daysLeft = getDaysRemaining(report.accepted_deadline)
  const isContractor = user.role === 'contractor'
  const isAuthority = ['government', 'finance', 'admin'].includes(user.role)
  const isEngineer = user.role === 'engineer'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Head>
        <title>Case #{report.id} | SmartRoads</title>
      </Head>

      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4 sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">SmartRoads</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              Case #{report.id} — {report.title || 'Road Damage Report'}
            </h1>
            <p className="text-sm text-slate-400">{report.road_name || 'Unknown road'} · {report.city || 'Unknown city'}</p>
          </div>
          <a href="/" className="rounded-3xl border border-slate-700 bg-slate-950/80 px-5 py-3 text-sm text-white transition hover:border-cyan-400 hover:text-cyan-200">Back to Dashboard</a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>
        )}
        {actionMessage && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            actionMessage.includes('success') || actionMessage.includes('!') && !actionMessage.includes('Failed')
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`}>
            {actionMessage}
          </div>
        )}

        {/* Status badge + workflow status */}
        <div className="mb-6 flex items-center gap-4">
          <span className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${statusBadge(report.workflow_status)}`}>
            {report.workflow_status.replace(/_/g, ' ').toUpperCase()}
          </span>
          {report.severity && (
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
              Severity: {report.severity}
            </span>
          )}
        </div>

        {/* Countdown timer + key dates */}
        <section className="mb-8 grid gap-6 lg:grid-cols-3">
          <CountdownTimer deadline={report.accepted_deadline} label="Repair Deadline" />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Notification Sent</p>
            <p className="mt-3 text-xl font-semibold text-white">{formatDateTime(report.notification_sent_at)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Response Deadline</p>
            <p className="mt-3 text-xl font-semibold text-white">{formatDateTime(report.contractor_response_deadline)}</p>
          </div>
        </section>

        {/* Workflow timeline */}
        <section className="mb-8">
          <StatusTimeline
            status={report.workflow_status}
            hasContractorResponse={!!contractor_response}
            hasAuthorityReview={!!authority_review}
            hasEvidence={!!completion_evidence}
            hasEvidenceVideo={!!evidence_video}
            hasSocialMediaPost={social_media_posts.length > 0}
            hasVerification={!!completion_evidence?.official_verification_status}
          />
        </section>

        {/* Case details grid */}
        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white">Case Details</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500">Reported</p><p className="mt-1 text-slate-200">{formatDateTime(report.created_at)}</p></div>
              <div><p className="text-slate-500">Damage Type</p><p className="mt-1 text-slate-200">{report.damage_type || '—'}</p></div>
              <div><p className="text-slate-500">Severity</p><p className="mt-1 text-slate-200">{report.severity || '—'}</p></div>
              <div><p className="text-slate-500">Damage Area</p><p className="mt-1 text-slate-200">{report.damage_area ? `${report.damage_area} m²` : '—'}</p></div>
              <div><p className="text-slate-500">Assigned Contractor</p><p className="mt-1 text-slate-200">{report.assigned_contractor || '—'}</p></div>
              <div><p className="text-slate-500">Assigned Engineer</p><p className="mt-1 text-slate-200">{report.assigned_engineer || '—'}</p></div>
              <div><p className="text-slate-500">Estimated Cost</p><p className="mt-1 text-slate-200">{report.estimated_repair_cost ? `$${report.estimated_repair_cost}` : '—'}</p></div>
              <div><p className="text-slate-500">Location</p><p className="mt-1 text-slate-200">{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</p></div>
            </div>
          </div>

          {/* Contractor response */}
          {contractor_response && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-white">Contractor Response</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div><p className="text-slate-500">Contractor</p><p className="mt-1 text-slate-200">{contractor_response.contractor_name}</p></div>
                <div><p className="text-slate-500">Response Date</p><p className="mt-1 text-slate-200">{formatDateTime(contractor_response.response_date)}</p></div>
                <div><p className="text-slate-500">Proposed Completion</p><p className="mt-1 text-slate-200">{formatDate(contractor_response.expected_completion_date)}</p></div>
                <div><p className="text-slate-500">Work Duration</p><p className="mt-1 text-slate-200">{contractor_response.estimated_work_duration || '—'}</p></div>
                <div><p className="text-slate-500">Repair Plan</p><p className="mt-1 text-slate-200">{contractor_response.repair_plan}</p></div>
                {contractor_response.reason_for_delay && (
                  <div><p className="text-slate-500">Reason for Delay</p><p className="mt-1 text-slate-200">{contractor_response.reason_for_delay}</p></div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Authority review */}
        {authority_review && (
          <section className="mb-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-white">Authority Review</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Decision</p><p className="mt-1 text-slate-200 capitalize">{authority_review.decision.replace(/_/g, ' ')}</p></div>
                <div><p className="text-slate-500">Accepted Deadline</p><p className="mt-1 text-slate-200">{formatDate(authority_review.accepted_deadline)}</p></div>
                <div><p className="text-slate-500">Review Date</p><p className="mt-1 text-slate-200">{formatDateTime(authority_review.review_date)}</p></div>
                {authority_review.notes && <div><p className="text-slate-500">Notes</p><p className="mt-1 text-slate-200">{authority_review.notes}</p></div>}
              </div>
            </div>
          </section>
        )}

        {/* Completion evidence */}
        {completion_evidence && (
          <section className="mb-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-white">Completion Evidence</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Upload Date</p><p className="mt-1 text-slate-200">{formatDateTime(completion_evidence.upload_date)}</p></div>
                <div><p className="text-slate-500">AI Analysis</p><p className="mt-1 text-slate-200 capitalize">{completion_evidence.ai_analysis_status}</p></div>
                <div><p className="text-slate-500">Official Verification</p><p className="mt-1 text-slate-200 capitalize">{completion_evidence.official_verification_status}</p></div>
                {completion_evidence.official_verification_date && (
                  <div><p className="text-slate-500">Verified At</p><p className="mt-1 text-slate-200">{formatDateTime(completion_evidence.official_verification_date)}</p></div>
                )}
              </div>
              {completion_evidence.completion_report && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Completion Report</p>
                  <p className="mt-2 text-slate-200">{completion_evidence.completion_report}</p>
                </div>
              )}
              {completion_evidence.photos && completion_evidence.photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500 mb-2">Photos ({completion_evidence.photos.length})</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {completion_evidence.photos.map((photo, i) => (
                      <img key={i} src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/${photo}`}
                           alt={`Evidence ${i + 1}`} className="h-20 w-full rounded-lg object-cover border border-slate-700" />
                    ))}
                  </div>
                </div>
              )}
              {completion_evidence.video_filename && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500 mb-2">Completion Video</p>
                  <video controls className="h-48 w-full max-w-md rounded-lg border border-slate-700">
                    <source src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/${completion_evidence.video_filename}`} type="video/mp4" />
                  </video>
                </div>
              )}
              {completion_evidence.ai_analysis_result && (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/80 p-4">
                  <p className="text-sm font-medium text-white">AI Analysis Result</p>
                  <pre className="mt-2 text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(completion_evidence.ai_analysis_result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Evidence video */}
        {evidence_video && (
          <section className="mb-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-white">AI Evidence Video</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-500">Status</p><p className="mt-1 text-slate-200 capitalize">{evidence_video.status}</p></div>
                <div><p className="text-slate-500">Privacy Applied</p><p className="mt-1 text-slate-200">{evidence_video.privacy_applied ? 'Yes (faces & plates blurred)' : 'No'}</p></div>
                <div><p className="text-slate-500">Moderator Approved</p><p className="mt-1 text-slate-200">{evidence_video.moderator_approved ? 'Yes' : 'No'}</p></div>
                <div><p className="text-slate-500">Generated At</p><p className="mt-1 text-slate-200">{formatDateTime(evidence_video.generated_at)}</p></div>
              </div>
              {evidence_video.video_filename && evidence_video.status === 'ready' && (
                <div className="mt-4">
                  <video controls className="h-64 w-full max-w-2xl rounded-lg border border-slate-700">
                    <source src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/${evidence_video.video_filename}`} type="video/mp4" />
                  </video>
                </div>
              )}
              {evidence_video.moderator_notes && (
                <div className="mt-4">
                  <p className="text-sm text-slate-500">Moderator Notes</p>
                  <p className="mt-1 text-slate-200">{evidence_video.moderator_notes}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Social media posts */}
        {social_media_posts.length > 0 && (
          <section className="mb-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-white">Social Media Posts</h2>
              <div className="mt-4 space-y-3">
                {social_media_posts.map((post) => (
                  <div key={post.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                    <div>
                      <p className="font-medium text-white capitalize">{post.platform}</p>
                      <p className="text-xs text-slate-500">Status: {post.status}</p>
                    </div>
                    {post.post_url && (
                      <a href={post.post_url} target="_blank" rel="noopener noreferrer"
                         className="text-sm text-cyan-300 hover:text-cyan-200">
                        View Post
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Action buttons based on role and workflow status */}
        <section className="mb-8">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-xl font-semibold text-white">Actions</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {/* Contractor actions */}
              {isContractor && report.workflow_status === 'contractor_notified' && (
                <button
                  onClick={() => router.push(`/contractor-dashboard`)}
                  className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Submit Response (via Dashboard)
                </button>
              )}

              {isContractor && report.workflow_status === 'date_accepted' && (
                <button
                  onClick={() => setShowEvidenceUploader(true)}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Upload Completion Evidence
                </button>
              )}

              {/* Authority actions */}
              {isAuthority && report.workflow_status === 'contractor_responded' && (
                <button
                  onClick={() => router.push('/authority-review')}
                  className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Review Contractor Date (via Review Center)
                </button>
              )}

              {isAuthority && completion_evidence && completion_evidence.official_verification_status === 'pending' && (
                <>
                  <button
                    onClick={() => handleVerify('verified', 'Evidence reviewed and accepted.')}
                    disabled={actionLoading}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? 'Processing...' : 'Verify Evidence'}
                  </button>
                  <button
                    onClick={() => handleVerify('rejected', 'Evidence insufficient.')}
                    disabled={actionLoading}
                    className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject Evidence
                  </button>
                </>
              )}

              {/* Engineer/Admin actions */}
              {(isEngineer || isAuthority) && completion_evidence && completion_evidence.official_verification_status === 'verified' && !evidence_video && (
                <button
                  onClick={handleGenerateVideo}
                  disabled={actionLoading}
                  className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? 'Generating...' : 'Generate Evidence Video'}
                </button>
              )}

              {isAuthority && evidence_video && evidence_video.status === 'ready' && !evidence_video.moderator_approved && (
                <>
                  <button
                    onClick={() => handleModerate(true, 'Approved for public release.')}
                    disabled={actionLoading}
                    className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve for Release
                  </button>
                  <button
                    onClick={() => handleModerate(false, 'Not approved for public release.')}
                    disabled={actionLoading}
                    className="rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                </>
              )}

              {isAuthority && evidence_video && evidence_video.moderator_approved && (
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Publish to Social Media
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Audit log */}
        {report.audit_log && Array.isArray(report.audit_log) && report.audit_log.length > 0 && (
          <section className="mb-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold text-white">Audit Log</h2>
              <div className="mt-4 space-y-2 text-sm">
                {report.audit_log.map((entry: any, i: number) => (
                  <div key={i} className="border-l-2 border-cyan-400/30 pl-3">
                    <p className="font-medium text-cyan-300">{entry.event}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(entry.timestamp)}</p>
                    {entry.details && (
                      <pre className="mt-1 text-xs text-slate-400 overflow-x-auto">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Evidence Uploader Modal */}
      {showEvidenceUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-semibold text-white mb-4">Upload Completion Evidence — Case #{report.id}</h2>
            <EvidenceUploader onSubmit={handleEvidenceSubmit} loading={actionLoading} />
            <button
              onClick={() => setShowEvidenceUploader(false)}
              className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-white">Publish to Social Media</h2>
            <p className="mt-2 text-slate-400">
              Select platforms to publish the evidence video. Public content will state the verified case status only.
            </p>

            <div className="mt-6 space-y-3">
              {(['youtube', 'instagram', 'facebook', 'x'] as const).map((platform) => (
                <label key={platform} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={publishPlatforms.includes(platform)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPublishPlatforms([...publishPlatforms, platform])
                      } else {
                        setPublishPlatforms(publishPlatforms.filter(p => p !== platform))
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-slate-200 capitalize">{platform}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/80 p-4">
              <p className="text-xs text-slate-400">
                Disclaimer: Public posts will state the verified case status (e.g., "Repair deadline expired. Case escalated for official review.") and will not declare the contractor legally guilty.
              </p>
            </div>

            {actionMessage && (
              <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                actionMessage.includes('success') || actionMessage.includes('!') && !actionMessage.includes('Failed')
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
              }`}>
                {actionMessage}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPublishModal(false)}
                className="flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-cyan-400"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={actionLoading || publishPlatforms.length === 0}
                className="flex-1 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
