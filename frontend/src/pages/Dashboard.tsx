import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis
} from 'recharts'
import {
  FileText, TrendingUp, Shield, Boxes, GitBranch,
  Search, ArrowRight, AlertTriangle, CheckCircle, Layers, Clock, Zap
} from 'lucide-react'
import { dashboardService, miningService } from '@services/api'
import type { Metrics, Pattern, Anomaly, Cluster } from '@services/types'
import { PageTransition, EmptyState, SectionHeader } from '@components/ui'
import { useCachedFetch } from '@hooks/useCache'
import { useState, useEffect } from 'react'

export function Dashboard() {
  const navigate = useNavigate()
  const [mining, setMining] = useState({
    patterns: false,
    clusters: false,
    anomalies: false,
  })
  const [autoMining, setAutoMining] = useState(false)

  const { data: metrics, loading, error, refetch: refetchMetrics } = useCachedFetch<Metrics>(
    'dashboard-metrics',
    () => dashboardService.getMetrics(),
    { ttl: 600000, deps: [] }, // 10 minutes cache for instant load
  )

  const { data: patterns, refetch: refetchPatterns } = useCachedFetch<Pattern[]>(
    'patterns',
    () => miningService.getPatterns(),
    { ttl: 600000 }, // 10 minutes
  )

  const { data: anomalies, refetch: refetchAnomalies } = useCachedFetch<Anomaly[]>(
    'anomalies',
    () => miningService.getAnomalies(),
    { ttl: 600000 }, // 10 minutes
  )

  const { data: clusters, refetch: refetchClusters } = useCachedFetch<Cluster[]>(
    'clusters',
    () => miningService.getClusters(),
    { ttl: 600000 }, // 10 minutes
  )

  // Auto-run mining in background if no results exist (doesn't block UI)
  useEffect(() => {
    const runAutoMining = async () => {
      if (!metrics || metrics.total_logs === 0) return
      
      const hasPatterns = (patterns?.length || 0) > 0
      const hasAnomalies = (anomalies?.length || 0) > 0
      const hasClusters = (clusters?.length || 0) > 0

      if (!hasPatterns || !hasAnomalies || !hasClusters) {
        setAutoMining(true)
        
        try {
          // Run mining in background - doesn't block UI
          await Promise.all([
            !hasPatterns && miningService.discoverPatterns(),
            !hasAnomalies && miningService.detectAnomalies(),
            !hasClusters && miningService.clusterLogs(),
          ])
          // Refresh data after mining completes
          await Promise.all([
            !hasPatterns && refetchPatterns(),
            !hasAnomalies && refetchAnomalies(),
            !hasClusters && refetchClusters(),
            refetchMetrics(),
          ])
        } catch (e) {
          console.error('Auto-mining failed:', e)
        } finally {
          setAutoMining(false)
        }
      }
    }

    // Only run if we have metrics and logs exist
    if (metrics && metrics.total_logs > 0) {
      runAutoMining()
    }
  }, [metrics?.total_logs])

  const handleRunPatterns = async () => {
    setMining(s => ({ ...s, patterns: true }))
    try {
      await miningService.discoverPatterns()
      await refetchPatterns()
      await refetchMetrics()
    } catch (e) {
      console.error(e)
    }
    setMining(s => ({ ...s, patterns: false }))
  }

  const handleRunClusters = async () => {
    setMining(s => ({ ...s, clusters: true }))
    try {
      await miningService.clusterLogs()
      await refetchClusters()
      await refetchMetrics()
    } catch (e) {
      console.error(e)
    }
    setMining(s => ({ ...s, clusters: false }))
  }

  const handleRunAnomalies = async () => {
    setMining(s => ({ ...s, anomalies: true }))
    try {
      await miningService.detectAnomalies()
      await refetchAnomalies()
      await refetchMetrics()
    } catch (e) {
      console.error(e)
    }
    setMining(s => ({ ...s, anomalies: false }))
  }

  if (loading && !metrics) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-sm font-light">Loading insights...</p>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (error && !metrics) {
    return (
      <PageTransition>
        <EmptyState
          icon={<AlertTriangle size={48} className="text-zinc-600" />}
          title="Connection Error"
          description={error}
          action={
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors">
              Retry
            </button>
          }
        />
      </PageTransition>
    )
  }

  const hasLogs = (metrics?.total_logs || 0) > 0
  const hourlyData = metrics?.hourly_activity || []
  const levelData = Object.entries(metrics?.logs_by_level || {}).map(([name, value]) => ({
    name, value, fill: getLevelColor(name)
  }))

  // Prepare data for line chart (cumulative logs over time)
  const cumulativeData = hourlyData.reduce((acc: any[], curr, i) => {
    const prevTotal = i > 0 ? acc[i - 1]?.total || 0 : 0
    acc.push({
      hour: curr.hour,
      logs: curr.logs,
      errors: curr.errors,
      total: prevTotal + curr.logs
    })
    return acc
  }, [])

  if (!hasLogs) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 border border-zinc-800 mx-auto mb-6 flex items-center justify-center">
              <FileText size={28} className="text-zinc-600" />
            </div>
            <h2 className="text-xl font-light text-white mb-3">No logs uploaded yet</h2>
            <p className="text-zinc-500 text-sm mb-6">
              Upload your log files to start analyzing patterns, detecting anomalies, and clustering similar entries.
            </p>
            <Link to="/" className="px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors inline-block">
              Upload Logs
            </Link>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-[0.15em] mb-2">Overview</p>
            <h1 className="text-4xl font-light text-white">Dashboard</h1>
          </div>
          <Link to="/logs" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
            View all logs <ArrowRight size={14} />
          </Link>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Logs"
            value={metrics?.total_logs || 0}
            icon={<FileText size={18} strokeWidth={1.5} />}
          />
          <MetricCard
            label="Sessions"
            value={metrics?.total_sessions || 0}
            icon={<Layers size={18} strokeWidth={1.5} />}
          />
          <MetricCard
            label="Error Rate"
            value={`${metrics?.error_rate || 0}%`}
            icon={<TrendingUp size={18} strokeWidth={1.5} />}
            highlight={(metrics?.error_rate || 0) > 10}
          />
          <MetricCard
            label="Anomalies"
            value={metrics?.total_anomalies || 0}
            icon={<Shield size={18} strokeWidth={1.5} />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Trend - Line Chart */}
          <div className="border border-zinc-800 p-6">
            <h3 className="text-sm font-light text-white mb-6">Activity Trend</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    interval={3}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#52525b' }}
                    width={24}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#ffffff" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errors" 
                    stroke="#71717a" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Log Distribution - Pie Chart */}
          <div className="border border-zinc-800 p-6">
            <h3 className="text-sm font-light text-white mb-6">By Level</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={levelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {levelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {levelData.map((level) => (
                <div key={level.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: level.fill }} />
                    <span className="text-zinc-400 text-sm font-light">{level.name}</span>
                  </div>
                  <span className="text-white text-sm font-mono">{level.value.toLocaleString()}</span>
                </div>
              ))}
              {levelData.length === 0 && (
                <p className="text-zinc-600 text-sm">No data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Mining Actions */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-[0.15em]">Analysis</p>
            {autoMining && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 size={12} className="animate-spin" />
                <span>Running AI analysis in background...</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MiningCard
              icon={<GitBranch size={20} strokeWidth={1.5} />}
              title="Pattern Mining"
              description="Discover frequent event sequences"
              count={patterns?.length || 0}
              loading={mining.patterns || autoMining}
              onRun={handleRunPatterns}
              link="/patterns"
            />
            <MiningCard
              icon={<Boxes size={20} strokeWidth={1.5} />}
              title="Clustering"
              description="Group similar log entries"
              count={clusters?.length || 0}
              loading={mining.clusters || autoMining}
              onRun={handleRunClusters}
              link="/clusters"
            />
            <MiningCard
              icon={<Shield size={20} strokeWidth={1.5} />}
              title="Anomaly Detection"
              description="Identify outliers and unusual patterns"
              count={anomalies?.length || 0}
              loading={mining.anomalies || autoMining}
              onRun={handleRunAnomalies}
              link="/anomalies"
            />
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

function MetricCard({ label, value, icon, highlight = false }: {
  label: string
  value: number | string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="border border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-zinc-600">{icon}</div>
        {highlight && (
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        )}
      </div>
      <p className="text-zinc-500 text-xs font-light mb-1">{label}</p>
      <p className={`text-2xl font-light ${highlight ? 'text-white' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}

function MiningCard({ icon, title, description, count, loading, onRun, link }: {
  icon: React.ReactNode
  title: string
  description: string
  count?: number
  loading?: boolean
  onRun?: () => void
  link?: string
}) {
  return (
    <div className="border border-zinc-800 p-6 group hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="text-zinc-600 group-hover:text-white transition-colors">
          {icon}
        </div>
        {count !== undefined && count > 0 && (
          <span className="text-xs font-mono text-zinc-500">{count.toLocaleString()} found</span>
        )}
      </div>
      <h3 className="text-sm font-medium text-white mb-2">{title}</h3>
      <p className="text-zinc-500 text-xs font-light mb-4">{description}</p>
      
      {link ? (
        <Link to={link} className="text-xs text-white hover:text-zinc-400 transition-colors flex items-center gap-1">
          View results <ArrowRight size={12} />
        </Link>
      ) : (
        <button
          onClick={onRun}
          disabled={loading}
          className="text-xs px-4 py-2 border border-zinc-800 text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run Analysis'}
        </button>
      )}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="border border-zinc-800 bg-black px-3 py-2 text-xs">
      <p className="text-zinc-500 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.stroke }} />
          <span className="text-zinc-400">{entry.name}:</span>
          <span className="text-white font-mono">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload || !payload[0]) return null
  const entry = payload[0].payload
  return (
    <div className="border border-zinc-800 bg-black px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.fill }} />
        <span className="text-zinc-400">{entry.name}:</span>
        <span className="text-white font-mono">{entry.value?.toLocaleString()}</span>
      </div>
    </div>
  )
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    DEBUG: '#3f3f46',
    INFO: '#a1a1aa',
    WARN: '#d4d4d8',
    ERROR: '#ffffff',
    CRITICAL: '#ffffff',
  }
  return colors[level] || '#3f3f46'
}
