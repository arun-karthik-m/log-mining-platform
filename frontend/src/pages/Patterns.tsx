import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  GitBranch, Loader2, Sparkles, ArrowRight,
  BarChart3, Hash, Percent,
} from 'lucide-react'
import { miningService, dashboardService } from '@services/api'
import type { Pattern } from '@services/types'
import {
  PageTransition, StaggerContainer, StaggerItem,
  SectionHeader, EmptyState,
} from '@components/ui'
import { useCachedFetch, invalidateCache } from '@hooks/useCache'

export function Patterns() {
  const [mining, setMining] = useState(false)

  // Check if logs exist first
  const { data: metrics } = useCachedFetch(
    'patterns-metrics-check',
    () => dashboardService.getMetrics(),
    { ttl: 600000 }, // 10 minutes
  )

  const { data: patterns, loading, refetch } = useCachedFetch<Pattern[]>(
    'patterns',
    () => miningService.getPatterns(),
    { ttl: 600000 }, // 10 minutes
  )

  // Show empty state if no logs uploaded
  if (metrics && metrics.total_logs === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={<GitBranch size={48} className="text-zinc-600" />}
          title="No logs uploaded"
          description="Upload log files first to discover patterns in your data."
          action={
            <a href="/" className="px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors inline-block">
              Upload Logs
            </a>
          }
        />
      </PageTransition>
    )
  }

  const handleMine = async () => {
    setMining(true)
    try {
      await miningService.discoverPatterns()
      invalidateCache('patterns')
      await refetch()
    } catch (error) {
      console.error('Failed to discover patterns:', error)
    } finally {
      setMining(false)
    }
  }

  const items = patterns || []

  return (
    <PageTransition>
      <div className="space-y-6">
        <SectionHeader
          title="Pattern Discovery"
          subtitle="Frequent event sequences mined from your logs"
          badge={
            items.length > 0 ? (
              <span className="px-2 py-1 rounded-md bg-white/10 border border-zinc-800 text-xs font-mono text-white">{items.length} patterns</span>
            ) : undefined
          }
          action={
            <button
              onClick={handleMine}
              disabled={mining}
              className="px-4 py-2 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {mining ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Mining...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Discover Patterns</span>
                </>
              )}
            </button>
          }
        />

        {loading && !patterns ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-zinc-800 p-6">
                <div className="flex gap-2 mb-3">
                  <div className="h-7 w-20 rounded-full bg-zinc-800" />
                  <div className="h-7 w-4 rounded-full bg-zinc-800" />
                  <div className="h-7 w-24 rounded-full bg-zinc-800" />
                </div>
                <div className="flex gap-6">
                  <div className="h-4 w-28 bg-zinc-800" />
                  <div className="h-4 w-28 bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<GitBranch size={48} className="text-zinc-600" />}
            title="No Patterns Discovered"
            description='Click "Discover Patterns" to mine frequent event sequences from your logs'
            action={
              <button onClick={handleMine} className="px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors">
                Start Mining
              </button>
            }
          />
        ) : (
          <StaggerContainer className="space-y-3" staggerDelay={0.04}>
            {items.map((pattern, index) => (
              <PatternCard key={pattern.id || index} pattern={pattern} index={index} />
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  )
}

function PatternCard({ pattern, index }: { pattern: Pattern; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-zinc-800 p-5 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Hash size={14} className="text-zinc-600" />
          <span className="text-xs font-mono text-zinc-500">Pattern #{index + 1}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Percent size={12} className="text-zinc-600" />
            <span className="text-xs font-mono text-white">{(pattern.support * 100).toFixed(1)}% support</span>
          </div>
          {pattern.confidence && (
            <div className="flex items-center gap-1">
              <BarChart3 size={12} className="text-zinc-600" />
              <span className="text-xs font-mono text-white">{(pattern.confidence * 100).toFixed(1)}% confidence</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        {pattern.pattern_sequence.map((event: string, i: number) => (
          <span
            key={i}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-white"
          >
            {event}
          </span>
        ))}
      </div>
      
      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
        <span>Appears in {pattern.frequency} sessions</span>
      </div>
    </motion.div>
  )
}
