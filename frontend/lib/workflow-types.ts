// TypeScript types for the Contractor Response & Accepted Due Date System

export type WorkflowStatus =
  | 'reported'
  | 'contractor_notified'
  | 'contractor_responded'
  | 'date_accepted'
  | 'in_progress'
  | 'evidence_submitted'
  | 'ai_analysis'
  | 'official_verification'
  | 'resolved'
  | 'overdue'
  | 'failed'

export type NotificationType =
  | 'contractor_assigned'
  | 'contractor_responded'
  | 'date_accepted'
  | 'reminder'
  | 'deadline_expired'
  | 'evidence_submitted'
  | 'verification_complete'
  | 'video_ready'
  | 'publish_approved'

export type AuthorityDecision = 'accepted' | 'rejected' | 'revision_requested'

export type VerificationStatus = 'pending' | 'verified' | 'rejected'

export type VideoStatus = 'generating' | 'ready' | 'failed'

export type SocialPlatform = 'youtube' | 'instagram' | 'facebook' | 'x'

export type SocialPostStatus = 'pending' | 'published' | 'failed'

export interface ContractorResponse {
  id: number
  report_id: number
  contractor_name: string
  expected_completion_date: string
  repair_plan: string
  reason_for_delay?: string | null
  estimated_work_duration?: string | null
  response_date: string
  status: string
}

export interface AuthorityReview {
  id: number
  report_id: number
  contractor_response_id: number
  authority_user_id: number
  decision: string
  accepted_deadline?: string | null
  notes?: string | null
  review_date: string
}

export interface CompletionEvidence {
  id: number
  report_id: number
  contractor_response_id?: number | null
  photos: string[]
  video_filename?: string | null
  completion_report?: string | null
  upload_date: string
  ai_analysis_status: string
  ai_analysis_result?: Record<string, any> | null
  official_verification_status: string
  official_verification_notes?: string | null
  official_verifier_id?: number | null
  official_verification_date?: string | null
}

export interface EvidenceVideo {
  id: number
  report_id: number
  video_filename: string
  status: string
  generated_at: string
  privacy_applied: boolean
  moderator_approved: boolean
  moderator_approved_at?: string | null
  moderator_notes?: string | null
  moderator_id?: number | null
}

export interface SocialMediaPost {
  id: number
  evidence_video_id: number
  report_id: number
  platform: string
  status: string
  published_at?: string | null
  post_url?: string | null
  external_id?: string | null
  created_at: string
}

export interface Notification {
  id: number
  user_id: number
  report_id?: number | null
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export interface WorkflowReport {
  id: number
  road_id?: string | null
  title?: string | null
  description?: string | null
  road_name?: string | null
  latitude: number
  longitude: number
  city?: string | null
  district?: string | null
  state?: string | null
  pincode?: string | null
  weather?: string | null
  weather_conditions?: string | null
  device_info?: Record<string, any> | null
  report_source?: string | null
  analysis_source?: string | null
  satellite_verified?: boolean | null
  vehicle_speed?: number | null
  direction?: string | null
  reported_at?: string | null
  damage_type?: string | null
  severity?: string | null
  status?: string | null
  repair_priority?: string | null
  damage_count?: number | null
  pothole_count?: number | null
  average_pothole_size?: number | null
  crack_length?: number | null
  damage_area?: number | null
  damage_length?: number | null
  damage_width?: number | null
  damage_depth?: number | null
  damage_percentage?: number | null
  road_health_index?: number | null
  predicted_failure_risk?: number | null
  repair_difficulty?: string | null
  estimated_repair_cost?: number | null
  estimated_duration?: string | null
  expected_completion_date?: string | null
  assigned_engineer?: string | null
  assigned_contractor?: string | null
  contractor_assignment?: string | null
  engineer_verified?: boolean | null
  budget_utilization?: number | null
  material_estimates?: Record<string, any> | null
  cost_breakdown?: Record<string, any> | null
  files: string[]
  predictions?: Record<string, any> | null
  created_at: string
  last_updated?: string | null
  workflow_status: string
  accepted_deadline?: string | null
  notification_sent_at?: string | null
  contractor_response_deadline?: string | null
}

export interface WorkflowDetail {
  report: WorkflowReport
  contractor_response?: ContractorResponse | null
  authority_review?: AuthorityReview | null
  completion_evidence?: CompletionEvidence | null
  evidence_video?: EvidenceVideo | null
  social_media_posts: SocialMediaPost[]
  notifications: Notification[]
}

export interface User {
  id: number
  email: string
  full_name?: string | null
  role: string
  is_active: boolean
  created_at: string
}

// Helper: get days remaining until a deadline
export function getDaysRemaining(deadline: string | null | undefined): number | null {
  if (!deadline) return null
  const target = new Date(deadline)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

// Helper: get urgency level for countdown display
export function getUrgencyLevel(days: number | null): 'safe' | 'warning' | 'critical' {
  if (days === null) return 'safe'
  if (days <= 0) return 'critical'
  if (days <= 3) return 'critical'
  if (days <= 7) return 'warning'
  return 'safe'
}

// Helper: format a date for display
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Helper: format a date+time for display
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
