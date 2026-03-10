import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  GitBranch, Loader2, Sparkles, ArrowRight,
  BarChart3, Hash, Percent,
} from 'lucide-react'
import { miningService } from '@services/api'
import type { Pattern } from '@services/types'
import {
  PageTransition, StaggerContainer, StaggerItem,
  SectionHeader, EmptyState,
} from '@components/ui'
import { useCachedFetch, invalidateCache } from '@hooks/useCache'

export function Patterns() {
  const [mining, setMining] = useState(false)

  const { data: patterns, loading, refetch } = useCachedFetch<Pattern[]>(
    'patterns',
    () => miningService.getPatterns(),
    { ttl: 60000 },
  )

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
              <span className="badge badge-violet font-mono">{items.length} patterns</span>
            ) : undefined
          }
          action={
            <button
              onClick={handleMine}
              disabled={mining}
              className="btn-primary flex items-center gap-2"
            >
              {mining ? (
                <>
                  <Loader2 size={15} className="animate-spin relative z-10" />
                  <span className="relative z-10">Mining...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} className="relative z-10" />
                  <span className="relative z-10">Discover Patterns</span>
                </>
              )}
            </button>
          }
        />

        {loading && !patterns ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6">
                <div className="flex gap-2 mb-3">
                  <div className="skeleton h-7 w-20 rounded-full" />
                  <div className="skeleton h-7 w-4" />
                  <div className="skeleton h-7 w-24 rounded-full" />
                </div>
                <div className="flex gap-6">
                  <div className="skeleton h-4 w-28" />
                  <div className="skeleton h-4 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<GitBranch size={48} />}
            title="No Patterns Discovered"
            description='Click "Discover Patterns" to mine frequent event sequences from your logs'
            action={
              <button onClick={handleMine} className="btn-primary">
                <span className="relative z-10">Start Mining</span>
              </button>
            }
          />
        ) : (
          <StaggerContainer className="space-y-3" staggerDelay={0.04}>
            {items.map((pattern, index) => (
              <StaggerItem key={pattern.id}>
                <PatternCard pattern={pattern} rank={index + 1} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  )
}

function PatternCard({ pattern, rank }: { pattern: Pattern; rank: number }) {
  return (
    <div className="glass-card p-5 group">
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-center">
          <span className="text-xs font-bold text-zinc-500 font-mono">#{rank}</span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Sequence visualization */}
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {pattern.pattern_sequence.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <motion.span
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent/[0.08] to-violet-500/[0.06] border border-accent/10 text-[0.78rem] text-zinc-200 font-medium"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {item}
                </motion.span>
                {i < pattern.pattern_sequence.length - 1 && (
                  <ArrowRight size={12} className="text-zinc-700 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 text-xs">
            <div className="flex items-center gap-1.5">
              <Percent size={12} className="text-accent/50" />
              <span className="text-zinc-500">Support</span>
              <span className="text-accent font-mono font-medium">
                {(pattern.support * 100).toFixed(1)}%
              </span>
            </div>
            {pattern.confidence != null && (
              <div className="flex items-center gap-1.5">
                <BarChart3 size={12} className="text-violet-400/50" />
                <span className="text-zinc-500">Confidence</span>
                <span className="text-violet-400 font-mono font-medium">
                  {(pattern.confidence * 100).toFixed(1)}%
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Hash size={12} className="text-zinc-600" />
              <span className="text-zinc-500">Frequency</span>
              <span className="text-white font-mono font-medium">{pattern.frequency}</span>
            </div>
          </div>
        </div>

        {/* Support bar */}
        <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0">
          <div className="w-24 h-1.5 rounded-full bg-white/[0.03] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pattern.support * 100, 100)}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
          <span className="text-[0.6rem] text-zinc-600 font-mono">
            {(pattern.support * 100).toFixed(0)}% support
          </span>
        </div>
      </div>
    </div>
  )
}
