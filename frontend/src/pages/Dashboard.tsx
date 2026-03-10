import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  FileText, Users, AlertTriangle, Activity,
  Search, GitBranch, Boxes, ArrowUpRight,
  TrendingUp, Shield, Upload,
} from 'lucide-react'
import { dashboardService } from '@services/api'
import type { Metrics } from '@services/types'
import {
  PageTransition, StaggerContainer, StaggerItem,
  MetricCard, SectionHeader, EmptyState, CardSkeleton,
} from '@components/ui'
import { useCachedFetch } from '@hooks/useCache'

export function Dashboard() {
  const { data: metrics, loading, error } = useCachedFetch<Metrics>(
    'dashboard-metrics',
    () => dashboardService.getMetrics(),
    { ttl: 15000 },
  )

  if (loading && !metrics) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <SectionHeader title="Dashboard" subtitle="Loading your analytics..." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
          </div>
        </div>
      </PageTransition>
    )
  }

  if (error && !metrics) {
    return (
      <PageTransition>
        <EmptyState
          icon={<AlertTriangle size={48} />}
          title="Connection Error"
          description={error}
          action={
            <button onClick={() => window.location.reload()} className="btn-primary">
              <span className="relative z-10">Retry Connection</span>
            </button>
          }
        />
      </PageTransition>
    )
  }

  const logLevelData = Object.entries(metrics?.logs_by_level || {}).map(([name, value]) => ({
    name, value,
  }))

  const levelColors: Record<string, string> = {
    DEBUG: '#52525b', INFO: '#00d4ff', WARN: '#f59e0b', ERROR: '#ef4444', CRITICAL: '#dc2626',
  }

  const sparkData = metrics?.hourly_activity || []

  return (
    <PageTransition>
      <div className="space-y-8">
        <SectionHeader
          title="Dashboard"
          subtitle="Real-time intelligence overview"
          badge={
            <div className="flex items-center gap-2 badge badge-emerald">
              <div className="status-dot bg-emerald-500 text-emerald-500" style={{ width: 6, height: 6 }} />
              Live
            </div>
          }
        />

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StaggerItem>
            <MetricCard label="Total Logs" value={metrics?.total_logs || 0} icon={<FileText size={20} />} accentColor="accent" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard label="Sessions" value={metrics?.total_sessions || 0} icon={<Users size={20} />} accentColor="violet" />
          </StaggerItem>
          <StaggerItem>
            <MetricCard label="Error Rate" value={metrics?.error_rate || 0} icon={<Activity size={20} />} accentColor={(metrics?.error_rate || 0) > 10 ? 'danger' : 'emerald'} />
          </StaggerItem>
          <StaggerItem>
            <MetricCard label="Anomalies" value={metrics?.total_anomalies || 0} icon={<AlertTriangle size={20} />} accentColor="warning" />
          </StaggerItem>
        </StaggerContainer>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <motion.div className="glass-card p-6 lg:col-span-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.08 }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Log Activity</h3>
                <p className="text-xs text-zinc-600 mt-0.5">Last 24 hours</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent/60" /><span className="text-[0.65rem] text-zinc-500">Logs</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-danger/60" /><span className="text-[0.65rem] text-zinc-500">Errors</span></div>
              </div>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id="colorLogs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.15} /><stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.1} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} interval={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} width={30} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="logs" stroke="#00d4ff" strokeWidth={1.5} fill="url(#colorLogs)" />
                  <Area type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={1.5} fill="url(#colorErrors)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div className="glass-card p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
            <h3 className="text-sm font-semibold text-white mb-1">Log Distribution</h3>
            <p className="text-xs text-zinc-600 mb-4">By severity level</p>
            {logLevelData.length > 0 ? (
              <>
                <div className="h-[160px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={logLevelData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                      {logLevelData.map((entry) => (<Cell key={entry.name} fill={levelColors[entry.name] || '#3f3f46'} />))}
                    </Pie><Tooltip content={<ChartTooltip />} /></PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {logLevelData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: levelColors[entry.name] || '#3f3f46' }} /><span className="text-zinc-400">{entry.name}</span></div>
                      <span className="text-zinc-300 font-mono text-[0.7rem]">{entry.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">No data available</div>
            )}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.12 }}>
          <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <QuickAction to="/sources" icon={<Upload size={18} />} label="Upload Logs" description="Upload files or connect live" delay={0} />
            <QuickAction to="/logs" icon={<Search size={18} />} label="Explore Logs" description="Search and filter log entries" delay={0.03} />
            <QuickAction to="/anomalies" icon={<Shield size={18} />} label="Anomaly Detection" description="Detect unusual patterns" delay={0.06} />
            <QuickAction to="/patterns" icon={<GitBranch size={18} />} label="Pattern Mining" description="Discover event sequences" delay={0.09} />
            <QuickAction to="/clusters" icon={<Boxes size={18} />} label="Cluster Analysis" description="Group similar log entries" delay={0.12} />
          </div>
        </motion.div>

        <motion.div className="glass-card p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.14 }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Mining Overview</h3>
            <TrendingUp size={16} className="text-zinc-600" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniStat label="Patterns Found" value={metrics?.total_patterns || 0} />
            <MiniStat label="Anomalies Detected" value={metrics?.total_anomalies || 0} />
            <MiniStat label="Active Sessions" value={metrics?.total_sessions || 0} />
            <MiniStat label="Total Events" value={metrics?.total_logs || 0} />
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="glass-card px-3 py-2 !rounded-lg text-xs" style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {label && <p className="text-zinc-500 mb-1 text-[0.65rem]">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-400">{entry.name}:</span>
          <span className="text-white font-medium">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function QuickAction({ to, icon, label, description, delay }: { to: string; icon: React.ReactNode; label: string; description: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.12 + delay }}>
      <Link to={to}>
        <div className="glass-card p-5 group cursor-pointer hover:!border-accent/10">
          <div className="flex items-start justify-between mb-3">
            <div className="text-zinc-500 group-hover:text-accent transition-colors duration-300">{icon}</div>
            <ArrowUpRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <h4 className="text-sm font-medium text-white mb-0.5">{label}</h4>
          <p className="text-[0.7rem] text-zinc-600">{description}</p>
        </div>
      </Link>
    </motion.div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-3 rounded-xl bg-white/[0.015] border border-white/[0.03]">
      <div className="text-xl font-bold text-white font-mono tracking-tight">{value.toLocaleString()}</div>
      <div className="text-[0.65rem] text-zinc-600 mt-0.5">{label}</div>
    </div>
  )
}
