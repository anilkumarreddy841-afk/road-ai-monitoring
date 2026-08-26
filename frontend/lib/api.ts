// API client helper for the Contractor Response & Accepted Due Date System
import { WorkflowDetail, WorkflowReport, Notification, ContractorResponse, AuthorityReview, CompletionEvidence, EvidenceVideo, SocialMediaPost } from './workflow-types'

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail || `Request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Workflow API
// ---------------------------------------------------------------------------

export const workflowApi = {
  // List reports in the workflow (role-filtered)
  listReports: () => request<WorkflowReport[]>('/api/workflow/reports'),

  // Get full workflow detail for a case
  getDetail: (reportId: number) => request<WorkflowDetail>(`/api/workflow/${reportId}`),

  // Notify contractor of a new case (engineer/admin)
  notifyContractor: (reportId: number, responseDeadlineDays: number = 3) =>
    request<{ message: string; workflow_status: string; response_deadline: string }>(
      `/api/workflow/${reportId}/notify`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_deadline_days: responseDeadlineDays }) },
    ),

  // Contractor submits response
  submitResponse: (reportId: number, data: {
    expected_completion_date: string
    repair_plan: string
    reason_for_delay?: string
    estimated_work_duration?: string
  }) =>
    request<{ message: string; response: ContractorResponse }>(
      `/api/workflow/${reportId}/respond`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    ),

  // Authority reviews contractor's proposed date
  reviewDate: (reportId: number, data: {
    decision: string
    accepted_deadline?: string
    notes?: string
  }) =>
    request<{ message: string; review: AuthorityReview; workflow_status: string }>(
      `/api/workflow/${reportId}/review`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    ),

  // Contractor uploads completion evidence
  uploadEvidence: async (reportId: number, data: {
    completion_report?: string
    photos: File[]
    video?: File
  }) => {
    const formData = new FormData()
    if (data.completion_report) {
      formData.append('completion_report', data.completion_report)
    }
    data.photos.forEach((photo) => formData.append('photos', photo))
    if (data.video) {
      formData.append('video', data.video)
    }
    return request<{ message: string; evidence: CompletionEvidence }>(
      `/api/workflow/${reportId}/evidence`,
      { method: 'POST', body: formData },
    )
  },

  // Official verification of evidence
  verifyEvidence: (reportId: number, data: { status: string; notes?: string }) =>
    request<{ message: string; evidence: CompletionEvidence; workflow_status: string }>(
      `/api/workflow/${reportId}/verify`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    ),

  // Generate AI evidence video
  generateVideo: (reportId: number) =>
    request<{ message: string; video: EvidenceVideo; ai_result?: Record<string, any> }>(
      `/api/workflow/${reportId}/generate-video`,
      { method: 'POST' },
    ),

  // Moderate (approve/reject) evidence video
  moderateVideo: (reportId: number, data: { approved: boolean; notes?: string }) =>
    request<{ message: string; video: EvidenceVideo }>(
      `/api/workflow/${reportId}/moderate`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    ),

  // Publish to social media
  publishToSocial: (reportId: number, platforms: string[]) =>
    request<{ message: string; posts: SocialMediaPost[] }>(
      `/api/workflow/${reportId}/publish`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms }) },
    ),

  // Notifications
  getNotifications: (unreadOnly: boolean = false) =>
    request<Notification[]>(`/api/workflow/notifications${unreadOnly ? '?unread_only=true' : ''}`),

  markNotificationRead: (notificationId: number) =>
    request<{ message: string }>(
      `/api/workflow/notifications/${notificationId}/read`,
      { method: 'POST' },
    ),

  // Check reminders (admin only)
  checkReminders: () =>
    request<{ checked: number; results: Record<string, any>[] }>('/api/workflow/reminders'),
}
