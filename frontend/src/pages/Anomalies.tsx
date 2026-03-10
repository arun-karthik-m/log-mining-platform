import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Shield, ShieldAlert, ShieldCheck,
  Loader2, Scan, Clock, Zap,
} from 'lucide-react'
import { miningService } from '@services/api'
import type { Anomaly } from '@services/types'
import { format } from 'date-fns'
import {
  PageTransition, StaggerContainer, StaggerItem,
  SectionHeader, EmptyState,
} from '@components/ui'
import { useCachedFetch, invalidateCache } from '@hooks/useCache'

export function Anomalies() {
  const [detecting, setDetecting] = useState(false)

  const { data: anomalies, loading, refetch } = useCachedFetch<Anomaly[]>(
    'anomalies',
    () => miningService.getAnomalies(),
    { ttl: 60000 },
  )

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
              className="btn-primary flex items-center gap-2"
            >
              {detecting ? (
                <>
                  <Loader2 size={15} className="animate-spin relative z-10" />
                  <span className="relative z-10">Scanning...</span>
                </>
              ) : (
                <>
                  <Scan size={15} className="relative z-10" />
                  <span className="relative z-10">Run Detection</span>
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
            <SeverityCard label="Critical" count={severityCounts.critical || 0} color="danger" icon={<ShieldAlert size={16} />} />
            <SeverityCard label="High" count={severityCounts.high || 0} color="warning" icon={<AlertTriangle size={16} />} />
            <SeverityCard label="Medium" count={severityCounts.medium || 0} color="accent" icon={<Shield size={16} />} />
            <SeverityCard label="Low" count={severityCounts.low || 0} color="emerald" icon={<ShieldCheck size={16} />} />
          </motion.div>
        )}

        {/* Anomalies List */}
        {loading && !anomalies ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6">
                <div className="skeleton h-4 w-24 mb-3" />
                <div className="skeleton h-3 w-full mb-2" />
                <div className="skeleton h-3 w-48" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={48} />}
            title="No Anomalies Detected"
            description='Click "Run Detection" to scan for unusual patterns in your logs'
            action={
              <button onClick={handleDetect} className="btn-primary">
                <span className="relative z-10">Start Scanning</span>
              </button>
            }
          />
        ) : (
          <StaggerContainer className="space-y-3" staggerDelay={0.04}>
            {items.map((anomaly) => (
              <StaggerItem key={anomaly.id}>
                <AnomalyCard anomaly={anomaly} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  )
}

function SeverityCard({
  label,
  count,
  color,
  icon,
}: {
  label: string
  count: number
  color: string
  icon: React.ReactNode
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    danger: { bg: 'bg-danger/5', text: 'text-danger-400', border: 'border-danger/10' },
    warning: { bg: 'bg-warning/5', text: 'text-warning-400', border: 'border-warning/10' },
    accent: { bg: 'bg-accent/5', text: 'text-accent', border: 'border-accent/10' },
    emerald: { bg: 'bg-emerald/5', text: 'text-emerald-400', border: 'border-emerald/10' },
  }

  const c = colorMap[color] || colorMap.accent

  return (
    <div className={`rounded-xl p-4 ${c.bg} border ${c.border}`}>
      <div className={`${c.text} mb-2 opacity-60`}>{icon}</div>
      <div className={`text-2xl font-bold ${c.text} font-mono`}>{count}</div>
      <div className="text-[0.65rem] text-zinc-500 mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const severityConfig: Record<string, {
    border: string
    bg: string
    badge: string
    icon: React.ReactNode
    glow: string
  }> = {
    critical: {
      border: 'border-l-danger-500',
      bg: 'hover:!bg-danger/[0.02]',
      badge: 'badge-danger',
      icon: <ShieldAlert size={18} className="text-danger-400" />,
      glow: 'hover:shadow-glow-danger',
    },
    high: {
      border: 'border-l-warning-500',
      bg: 'hover:!bg-warning/[0.02]',
      badge: 'badge-warning',
      icon: <AlertTriangle size={18} className="text-warning-400" />,
      glow: '',
    },
    medium: {
      border: 'border-l-accent',
      bg: '',
      badge: 'badge-accent',
      icon: <Shield size={18} className="text-accent" />,
      glow: '',
    },
    low: {
      border: 'border-l-emerald-500',
      bg: '',
      badge: 'badge-emerald',
      icon: <ShieldCheck size={18} className="text-emerald-400" />,
      glow: '',
    },
  }

  const config = severityConfig[anomaly.severity] || severityConfig.low

  return (
    <div className={`glass-card p-5 border-l-[3px] ${config.border} ${config.bg} ${config.glow}`}>
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex-shrink-0">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`badge ${config.badge}`}>
              {anomaly.severity.toUpperCase()}
            </span>
            <span className="badge badge-zinc">
              <Zap size={9} />
              {anomaly.anomaly_type}
            </span>
          </div>
          <p className="text-zinc-200 text-sm leading-relaxed mb-2">{anomaly.description}</p>
          <div className="flex items-center gap-1.5 text-zinc-600">
            <Clock size={11} />
            <span className="text-[0.7rem] font-mono">
              {format(new Date(anomaly.detected_at), 'MMM d, yyyy HH:mm:ss')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
