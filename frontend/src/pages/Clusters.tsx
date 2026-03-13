import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Boxes, Loader2, Layers, Tag, Hash,
  Network, CircleDot,
} from 'lucide-react'
import { miningService, dashboardService } from '@services/api'
import type { Cluster } from '@services/types'
import {
  PageTransition, StaggerContainer, StaggerItem,
  SectionHeader, EmptyState, AnimatedCounter,
} from '@components/ui'
import { useCachedFetch, invalidateCache } from '@hooks/useCache'

export function Clusters() {
  const [clustering, setClustering] = useState(false)

  // Check if logs exist first
  const { data: metrics } = useCachedFetch(
    'clusters-metrics-check',
    () => dashboardService.getMetrics(),
    { ttl: 600000 }, // 10 minutes
  )

  const { data: clusters, loading, refetch } = useCachedFetch<Cluster[]>(
    'clusters',
    () => miningService.getClusters(),
    { ttl: 600000 }, // 10 minutes
  )

  // Show empty state if no logs uploaded
  if (metrics && metrics.total_logs === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={<Boxes size={48} className="text-zinc-600" />}
          title="No logs uploaded"
          description="Upload log files first to cluster similar entries in your data."
          action={
            <a href="/" className="px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors inline-block">
              Upload Logs
            </a>
          }
        />
      </PageTransition>
    )
  }

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

  // Show empty state if no clusters and not loading
  if (!loading && items.length === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={<Boxes size={48} className="text-zinc-600" />}
          title="No Clusters Yet"
          description="Run clustering to group similar log entries by semantic similarity."
          action={
            <button onClick={handleCluster} className="px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors">
              Run Clustering
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
          title="Cluster Analysis"
          subtitle="Similar log entries grouped by semantic similarity"
          badge={
            items.length > 0 ? (
              <span className="px-2 py-1 rounded-md bg-white/10 border border-zinc-800 text-xs font-mono text-white">{items.length} clusters</span>
            ) : undefined
          }
          action={
            <button
              onClick={handleCluster}
              disabled={clustering}
              className="px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {clustering ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Clustering...</span>
                </>
              ) : (
                <>
                  <Network size={15} />
                  <span>Run Clustering</span>
                </>
              )}
            </button>
          }
        />

        {/* Summary Cards */}
        {items.length > 0 && (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SummaryCard
              icon={<Layers size={18} />}
              label="Total Clusters"
              value={items.length}
            />
            <SummaryCard
              icon={<Hash size={18} />}
              label="Total Logs"
              value={totalLogs}
            />
            <SummaryCard
              icon={<CircleDot size={18} />}
              label="Avg Size"
              value={Math.round(totalLogs / items.length)}
            />
          </motion.div>
        )}

        {loading && !clusters ? (
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
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4" staggerDelay={0.04}>
            {items.map((cluster, index) => (
              <ClusterCard key={cluster.id || index} cluster={cluster} index={index} />
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  )
}

function SummaryCard({ icon, label, value }: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="border border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-zinc-600">{icon}</div>
      </div>
      <p className="text-zinc-500 text-xs font-light mb-1">{label}</p>
      <p className="text-2xl font-light text-white">
        <AnimatedCounter value={value} />
      </p>
    </div>
  )
}

function ClusterCard({ cluster, index }: { cluster: Cluster; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-zinc-800 p-6 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-zinc-700 rounded-lg flex items-center justify-center">
            <span className="text-sm font-mono text-white">{index + 1}</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">{cluster.cluster_name || `Cluster ${index + 1}`}</h3>
            <p className="text-xs text-zinc-500">{cluster.log_count} logs</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Tag size={12} />
          <span>{cluster.keywords?.length || 0} keywords</span>
        </div>
      </div>

      {cluster.keywords && cluster.keywords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {cluster.keywords.slice(0, 5).map((keyword: string, i: number) => (
            <span
              key={i}
              className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-white"
            style={{ width: `${Math.min((cluster.log_count / 100) * 100, 100)}%` }}
          />
        </div>
      </div>
    </motion.div>
  )
}
