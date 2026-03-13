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
