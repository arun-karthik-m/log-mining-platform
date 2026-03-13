import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Shield, ShieldAlert, ShieldCheck,
  Loader2, Scan, Clock, Zap,
} from 'lucide-react'
import { miningService, dashboardService } from '@services/api'
import type { Anomaly } from '@services/types'
import { format } from 'date-fns'
import {
  PageTransition, StaggerContainer, StaggerItem,
  SectionHeader, EmptyState,
} from '@components/ui'
import { useCachedFetch, invalidateCache } from '@hooks/useCache'

export function Anomalies() {
  const [detecting, setDetecting] = useState(false)

  // Check if logs exist first
  const { data: metrics } = useCachedFetch(
    'anomalies-metrics-check',
    () => dashboardService.getMetrics(),
    { ttl: 600000 }, // 10 minutes
  )

  const { data: anomalies, loading, refetch } = useCachedFetch<Anomaly[]>(
    'anomalies',
    () => miningService.getAnomalies(),
    { ttl: 600000 }, // 10 minutes
  )

  // Show empty state if no logs uploaded
  if (metrics && metrics.total_logs === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={<Shield size={48} className="text-zinc-600" />}
          title="No logs uploaded"
          description="Upload log files first to detect anomalies in your data."
          action={
            <a href="/" className="px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors inline-block">
              Upload Logs
            </a>
          }
        />
      </PageTransition>
    )
  }

  const handleDetect = async () => {
    setDetecting(true)
    try {
      await miningService.detectAnomalies()
      invalidateCache('anomalies')
      await refetch()
    } catch (error) {
      console.error('Failed to detect anomalies:', error)
    } finally {
      setDetecting(false)
    }
  }

  const items = anomalies || []

  const severityCounts = items.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Show empty state if no anomalies and not loading
  if (!loading && items.length === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={<Shield size={48} className="text-zinc-600" />}
          title="No Anomalies Detected"
          description="Run the anomaly detection scan to identify unusual patterns in your logs."
          action={
            <button onClick={handleDetect} className="px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors">
              Run Detection
            </button>
          }
        />
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <SectionHeader
          title="Anomaly Detection"
          subtitle="AI-powered abnormal behavior detection"
          action={
            <button
              onClick={handleDetect}
              disabled={detecting}
              className="px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {detecting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Scan size={15} />
                  <span>Run Detection</span>
                </>
              )}
            </button>
          }
        />

        {/* Severity Summary */}
        {items.length > 0 && (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SeverityCard label="Critical" count={severityCounts.critical || 0} color="white" icon={<ShieldAlert size={16} />} />
            <SeverityCard label="High" count={severityCounts.high || 0} color="zinc-400" icon={<ShieldCheck size={16} />} />
            <SeverityCard label="Medium" count={severityCounts.medium || 0} color="zinc-500" icon={<Shield size={16} />} />
            <SeverityCard label="Low" count={severityCounts.low || 0} color="zinc-600" icon={<Shield size={16} />} />
          </motion.div>
        )}

        {loading && !anomalies ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-zinc-800 p-6">
                <div className="flex gap-2 mb-3">
                  <div className="h-7 w-20 rounded-full bg-zinc-800" />
                  <div className="h-7 w-4 rounded-full bg-zinc-800" />
                </div>
                <div className="h-4 w-full bg-zinc-800 mb-2" />
                <div className="h-4 w-2/3 bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : (
          <StaggerContainer className="space-y-3" staggerDelay={0.04}>
            {items.map((anomaly) => (
              <AnomalyCard key={anomaly.id} anomaly={anomaly} />
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  )
}

function SeverityCard({ label, count, color, icon }: {
  label: string
  count: number
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`text-zinc-${color}`}>{icon}</div>
        <span className="text-2xl font-light text-white">{count}</span>
      </div>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const severityConfig = {
    critical: { border: 'border-white', bg: 'bg-white/5', text: 'text-white' },
    high: { border: 'border-zinc-400', bg: 'bg-zinc-400/5', text: 'text-zinc-300' },
    medium: { border: 'border-zinc-500', bg: 'bg-zinc-500/5', text: 'text-zinc-400' },
    low: { border: 'border-zinc-600', bg: 'bg-zinc-600/5', text: 'text-zinc-500' },
  }

  const config = severityConfig[anomaly.severity as keyof typeof severityConfig] || severityConfig.low

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`border-l-[3px] ${config.border} ${config.bg} p-5`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-zinc-500" />
          <span className={`text-sm font-medium ${config.text}`}>{anomaly.anomaly_type}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-mono uppercase ${config.border} border ${config.text}`}>
            {anomaly.severity}
          </span>
          {anomaly.detected_at && (
            <div className="flex items-center gap-1 text-xs text-zinc-600">
              <Clock size={12} />
              <span>{format(new Date(anomaly.detected_at), 'MMM d, HH:mm')}</span>
            </div>
          )}
        </div>
      </div>
      
      <p className="text-sm text-zinc-400 mb-3">{anomaly.description}</p>
      
      {anomaly.metadata && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(anomaly.metadata).slice(0, 3).map(([key, value]) => (
            <div key={key} className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-500">{key}: </span>
              <span className="text-[10px] font-mono text-white">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
