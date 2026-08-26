import { WorkflowStatus } from '../lib/workflow-types'

interface StatusTimelineProps {
  status: string
  hasContractorResponse?: boolean
  hasAuthorityReview?: boolean
  hasEvidence?: boolean
  hasEvidenceVideo?: boolean
  hasSocialMediaPost?: boolean
  hasVerification?: boolean
}

const STEPS: { key: string; label: string; description: string }[] = [
  { key: 'reported', label: 'Case Created', description: 'Road damage case has been created' },
  { key: 'contractor_notified', label: 'Contractor Notified', description: 'Responsible contractor has been notified' },
  { key: 'contractor_responded', label: 'Contractor Responded', description: 'Contractor submitted completion date and plan' },
  { key: 'date_accepted', label: 'Date Accepted', description: 'Authority accepted the proposed completion date' },
  { key: 'in_progress', label: 'In Progress', description: 'Repair work is underway' },
  { key: 'evidence_submitted', label: 'Evidence Submitted', description: 'Contractor uploaded completion evidence' },
  { key: 'ai_analysis', label: 'AI Analysis', description: 'AI comparing before/after evidence' },
  { key: 'official_verification', label: 'Official Verification', description: 'Authority verifies the repair' },
  { key: 'resolved', label: 'Resolved', description: 'Case is officially resolved' },
]

const FAILURE_STEPS: { key: string; label: string; description: string }[] = [
  { key: 'overdue', label: 'Overdue', description: 'Repair deadline has expired' },
  { key: 'failed', label: 'Failed', description: 'Case marked as failed, escalated for review' },
]

function getStepStatus(stepKey: string, currentStatus: string, props: StatusTimelineProps): 'complete' | 'current' | 'pending' | 'failed' {
  const statusOrder = [
    'reported', 'contractor_notified', 'contractor_responded', 'date_accepted',
    'in_progress', 'evidence_submitted', 'ai_analysis', 'official_verification', 'resolved',
  ]
  const currentIndex = statusOrder.indexOf(currentStatus)
  const stepIndex = statusOrder.indexOf(stepKey)

  if (currentStatus === 'overdue' || currentStatus === 'failed') {
    if (stepKey === 'overdue' || stepKey === 'failed') {
      return stepKey === currentStatus ? 'current' : 'pending'
    }
    return 'complete'
  }

  if (stepIndex < currentIndex) return 'complete'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

export default function StatusTimeline({ status, hasContractorResponse, hasAuthorityReview, hasEvidence, hasEvidenceVideo, hasSocialMediaPost, hasVerification }: StatusTimelineProps) {
  const isFailure = status === 'overdue' || status === 'failed'

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-900/20">
      <h3 className="text-xl font-semibold text-white mb-6">Case Workflow Timeline</h3>

      <div className="relative">
        {/* Normal flow steps */}
        <div className="space-y-4">
          {STEPS.map((step, index) => {
            const stepStatus = getStepStatus(step.key, status, { status, hasContractorResponse, hasAuthorityReview, hasEvidence, hasEvidenceVideo, hasSocialMediaPost, hasVerification })
            const isComplete = stepStatus === 'complete'
            const isCurrent = stepStatus === 'current'
            const isPending = stepStatus === 'pending'

            return (
              <div key={step.key} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className={`
                    flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold
                    ${isComplete ? 'border-cyan-400 bg-cyan-400 text-slate-950' :
                      isCurrent ? 'border-amber-400 bg-amber-400 text-slate-950 animate-pulse' :
                      'border-slate-600 bg-slate-800 text-slate-500'}
                  `}>
                    {index + 1}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-0.5 h-full mt-1 ${isComplete ? 'bg-cyan-400' : 'bg-slate-700'}`} />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className={`font-semibold ${isComplete ? 'text-cyan-300' : isCurrent ? 'text-amber-300' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Failure path */}
        {isFailure && (
          <div className="mt-6 border-t border-slate-800 pt-6">
            <div className="space-y-4">
              {FAILURE_STEPS.map((step, index) => {
                const isCurrent = step.key === status
                return (
                  <div key={step.key} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`
                        flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold
                        ${isCurrent ? 'border-rose-400 bg-rose-400 text-slate-950 animate-pulse' : 'border-slate-600 bg-slate-800 text-slate-500'}
                      `}>
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`font-semibold ${isCurrent ? 'text-rose-300' : 'text-slate-500'}`}>
                        {step.label}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
