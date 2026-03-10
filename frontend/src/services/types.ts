export interface Log {
  id: number
  timestamp: string
  level: string
  message: string
  source: string | null
  session_id: number | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Session {
  id: number
  session_key: string
  start_time: string
  end_time: string | null
  event_count: number
  created_at: string
}

export interface Pattern {
  id: number
  pattern_sequence: string[]
  support: number
  confidence: number | null
  frequency: number
  discovered_at: string
}

export interface Anomaly {
  id: number
  anomaly_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detected_at: string
  metadata: Record<string, unknown> | null
}

export interface Cluster {
  id: number
  cluster_name: string
  centroid_vector: number[] | null
  log_count: number
  keywords: string[] | null
  created_at: string
}

export interface HourlyActivity {
  hour: string
  logs: number
  errors: number
}

export interface Metrics {
  total_logs: number
  total_sessions: number
  total_patterns: number
  total_anomalies: number
  error_rate: number
  logs_by_level: Record<string, number>
  hourly_activity: HourlyActivity[]
}

export interface UploadResponse {
  count: number
  success: boolean
}

export interface LiveLog {
  timestamp: string
  level: string
  message: string
  source?: string | null
  metadata?: Record<string, unknown> | null
}
