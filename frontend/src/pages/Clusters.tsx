import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Boxes, Loader2, Layers, Tag, Hash,
  Network, CircleDot,
} from 'lucide-react'
import { miningService } from '@services/api'
import type { Cluster } from '@services/types'
import {
  PageTransition, StaggerContainer, StaggerItem,
  SectionHeader, EmptyState, AnimatedCounter,
} from '@components/ui'
import { useCachedFetch, invalidateCache } from '@hooks/useCache'

const clusterGradients = [
  { from: 'from-accent/10', to: 'to-violet-500/5', accent: 'text-accent', border: 'border-accent/10', glow: 'hover:shadow-glow-sm', dot: 'bg-accent' },
  { from: 'from-violet-500/10', to: 'to-pink-500/5', accent: 'text-violet-400', border: 'border-violet-500/10', glow: 'hover:shadow-glow-violet', dot: 'bg-violet-400' },
  { from: 'from-emerald/10', to: 'to-teal-500/5', accent: 'text-emerald-400', border: 'border-emerald/10', glow: 'hover:shadow-glow-emerald', dot: 'bg-emerald-400' },
  { from: 'from-warning/10', to: 'to-orange-500/5', accent: 'text-warning-400', border: 'border-warning/10', glow: '', dot: 'bg-warning-400' },
  { from: 'from-danger/10', to: 'to-rose-500/5', accent: 'text-danger-400', border: 'border-danger/10', glow: 'hover:shadow-glow-danger', dot: 'bg-danger-400' },
  { from: 'from-sky-500/10', to: 'to-blue-500/5', accent: 'text-sky-400', border: 'border-sky-500/10', glow: '', dot: 'bg-sky-400' },
]

export function Clusters() {
  const [clustering, setClustering] = useState(false)

  const { data: clusters, loading, refetch } = useCachedFetch<Cluster[]>(
    'clusters',
    () => miningService.getClusters(),
    { ttl: 60000 },
  )

  const handleCluster = async () => {
    setClustering(true)
    try {
      await miningService.clusterLogs()
      invalidateCache('clusters')
      await refetch()
    } catch (error) {
      console.error('Failed to cluster logs:', error)
    } finally {
      setClustering(false)
    }
  }

  const items = clusters || []
  const totalLogs = items.reduce((sum, c) => sum + c.log_count, 0)

  return (
    <PageTransition>
      <div className="space-y-6">
        <SectionHeader
          title="Cluster Analysis"
          subtitle="Similar log entries grouped by semantic similarity"
          badge={
            items.length > 0 ? (
              <span className="badge badge-accent font-mono">{items.length} clusters</span>
            ) : undefined
          }
          action={
            <button
              onClick={handleCluster}
              disabled={clustering}
              className="btn-primary flex items-center gap-2"
            >
              {clustering ? (
                <>
                  <Loader2 size={15} className="animate-spin relative z-10" />
                  <span className="relative z-10">Clustering...</span>
                </>
              ) : (
                <>
                  <Network size={15} className="relative z-10" />
                  <span className="relative z-10">Run Clustering</span>
                </>
              )}
            </button>
          }
        />

        {/* Summary */}
        {items.length > 0 && (
          <motion.div
            className="glass-card p-5 flex items-center justify-between"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[0.65rem] text-zinc-600 uppercase tracking-wider mb-0.5">Clusters</p>
                <p className="text-xl font-bold text-white font-mono">{items.length}</p>
              </div>
              <div className="w-px h-8 bg-white/[0.04]" />
              <div>
                <p className="text-[0.65rem] text-zinc-600 uppercase tracking-wider mb-0.5">Total Logs</p>
                <AnimatedCounter value={totalLogs} className="text-xl font-bold text-white font-mono" />
              </div>
              <div className="w-px h-8 bg-white/[0.04]" />
              <div>
                <p className="text-[0.65rem] text-zinc-600 uppercase tracking-wider mb-0.5">Avg per Cluster</p>
                <p className="text-xl font-bold text-white font-mono">
                  {items.length > 0 ? Math.round(totalLogs / items.length).toLocaleString() : 0}
                </p>
              </div>
            </div>

            {/* Mini distribution */}
            <div className="hidden md:flex items-center gap-0.5 h-6">
              {items.map((cluster, i) => {
                const ratio = totalLogs > 0 ? cluster.log_count / totalLogs : 0
                const grad = clusterGradients[i % clusterGradients.length]
                return (
                  <motion.div
                    key={cluster.id}
                    className={`h-full rounded-sm ${grad.dot}`}
                    style={{ opacity: 0.6 }}
                    initial={{ width: 0 }}
                    animate={{ width: Math.max(4, ratio * 200) }}
                    transition={{ delay: 0.2 + i * 0.05, duration: 0.5 }}
                  />
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Clusters Grid */}
        {loading && !clusters ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6">
                <div className="skeleton h-5 w-32 mb-3" />
                <div className="skeleton h-3 w-20 mb-4" />
                <div className="flex gap-2">
                  <div className="skeleton h-6 w-16 rounded-md" />
                  <div className="skeleton h-6 w-14 rounded-md" />
                  <div className="skeleton h-6 w-18 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Boxes size={48} />}
            title="No Clusters Created"
            description='Click "Run Clustering" to group similar log entries together'
            action={
              <button onClick={handleCluster} className="btn-primary">
                <span className="relative z-10">Start Clustering</span>
              </button>
            }
          />
        ) : (
          <StaggerContainer
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            staggerDelay={0.06}
          >
            {items.map((cluster, index) => (
              <StaggerItem key={cluster.id}>
                <ClusterCard cluster={cluster} index={index} totalLogs={totalLogs} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  )
}

function ClusterCard({
  cluster,
  index,
  totalLogs,
}: {
  cluster: Cluster
  index: number
  totalLogs: number
}) {
  const grad = clusterGradients[index % clusterGradients.length]
  const percentage = totalLogs > 0 ? (cluster.log_count / totalLogs * 100) : 0

  return (
    <motion.div
      className={`glass-card p-6 bg-gradient-to-br ${grad.from} ${grad.to} ${grad.glow} group`}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${grad.dot}`} />
          <h3 className="text-sm font-semibold text-white">{cluster.cluster_name}</h3>
        </div>
        <div className="flex items-center gap-1.5 badge badge-zinc">
          <Layers size={10} />
          <span className="font-mono">{cluster.log_count.toLocaleString()}</span>
        </div>
      </div>

      {/* Percentage bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-[0.65rem] mb-1.5">
          <span className="text-zinc-500">Distribution</span>
          <span className={`${grad.accent} font-mono font-medium`}>{percentage.toFixed(1)}%</span>
        </div>
        <div className="w-full h-1 rounded-full bg-white/[0.03] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${grad.dot}`}
            style={{ opacity: 0.7 }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
        </div>
      </div>

      {/* Keywords */}
      {cluster.keywords && cluster.keywords.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Tag size={11} className="text-zinc-600" />
            <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">Keywords</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cluster.keywords.slice(0, 6).map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04] text-[0.7rem] text-zinc-400"
              >
                {keyword}
              </span>
            ))}
            {cluster.keywords.length > 6 && (
              <span className="px-2 py-0.5 text-[0.7rem] text-zinc-600">
                +{cluster.keywords.length - 6}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.03] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Hash size={11} className="text-zinc-700" />
          <span className="text-[0.65rem] text-zinc-600 font-mono">ID {cluster.id}</span>
        </div>
        <CircleDot size={12} className={`${grad.accent} opacity-40`} />
      </div>
    </motion.div>
  )
}
