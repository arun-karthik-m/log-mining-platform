import apiClient from './apiClient'
import type { Log, Session, Pattern, Anomaly, Cluster, Metrics, UploadResponse } from './types'

export interface LogsQuery {
  level?: string
  source?: string
  start_time?: string
  end_time?: string
  search?: string
  page?: number
  limit?: number
}

/**
 * Log service for API operations
 */
export const logService = {
  getLogs: async (query?: LogsQuery): Promise<{ logs: Log[]; total: number }> => {
    const response = await apiClient.get('/logs', { params: query })
    return response.data
  },

  getLogById: async (id: number): Promise<Log> => {
    const response = await apiClient.get(`/logs/${id}`)
    return response.data
  },

  uploadLogs: async (logs: unknown[]): Promise<UploadResponse> => {
    const response = await apiClient.post('/logs', { logs })
    return response.data
  },

  /**
   * Upload a log file for analysis
   */
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/logs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes for large files
    })
    return response.data
  },

  /**
   * Send logs via webhook endpoint
   */
  webhookIngest: async (logs: unknown[]): Promise<UploadResponse> => {
    const response = await apiClient.post('/logs/webhook', { logs })
    return response.data
  },

  getSessions: async (): Promise<Session[]> => {
    const response = await apiClient.get('/sessions')
    return response.data
  },
}

/**
 * Mining service for pattern discovery and analysis
 */
export const miningService = {
  discoverPatterns: async (minSupport?: number): Promise<Pattern[]> => {
    const response = await apiClient.post('/mining/patterns', null, {
      params: { min_support: minSupport },
    })
    return response.data
  },

  getPatterns: async (): Promise<Pattern[]> => {
    const response = await apiClient.get('/patterns')
    return response.data
  },

  clusterLogs: async (nClusters?: number): Promise<Cluster[]> => {
    const response = await apiClient.post('/mining/clusters', null, {
      params: { n_clusters: nClusters },
    })
    return response.data
  },

  getClusters: async (): Promise<Cluster[]> => {
    const response = await apiClient.get('/clusters')
    return response.data
  },

  detectAnomalies: async (): Promise<Anomaly[]> => {
    const response = await apiClient.post('/mining/anomalies')
    return response.data
  },

  getAnomalies: async (): Promise<Anomaly[]> => {
    const response = await apiClient.get('/anomalies')
    return response.data
  },
}

/**
 * Dashboard service for metrics and overview
 */
export const dashboardService = {
  getMetrics: async (): Promise<Metrics> => {
    const response = await apiClient.get('/dashboard/metrics')
    return response.data
  },
}

/**
 * WebSocket service for live log streaming
 */
export class LogStreamService {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private listeners: Set<(log: Record<string, unknown>) => void> = new Set()
  private statusListeners: Set<(status: 'connected' | 'disconnected' | 'connecting') => void> = new Set()
  private _url: string

  constructor(url?: string) {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const wsBase = apiBase.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
    this._url = url || `${wsBase}/ws/logs`
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this._notifyStatus('connecting')

    try {
      this.ws = new WebSocket(this._url)

      this.ws.onopen = () => {
        this._notifyStatus('connected')
        // Ping every 30s to keep alive
        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send('ping')
          }
        }, 30000)
      }

      this.ws.onmessage = (event) => {
        if (event.data === 'pong') return
        try {
          const log = JSON.parse(event.data)
          this.listeners.forEach((fn) => fn(log))
        } catch {
          // ignore parse errors
        }
      }

      this.ws.onclose = () => {
        this._cleanup()
        this._notifyStatus('disconnected')
        // Auto-reconnect after 3s
        this.reconnectTimer = setTimeout(() => this.connect(), 3000)
      }

      this.ws.onerror = () => {
        this.ws?.close()
      }
    } catch {
      this._notifyStatus('disconnected')
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this._cleanup()
    this._notifyStatus('disconnected')
  }

  onLog(fn: (log: Record<string, unknown>) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  onStatusChange(fn: (status: 'connected' | 'disconnected' | 'connecting') => void): () => void {
    this.statusListeners.add(fn)
    return () => this.statusListeners.delete(fn)
  }

  private _cleanup(): void {
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.pingTimer = null
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onclose = null
      this.ws.onerror = null
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close()
      }
      this.ws = null
    }
  }

  private _notifyStatus(status: 'connected' | 'disconnected' | 'connecting'): void {
    this.statusListeners.forEach((fn) => fn(status))
  }
}
