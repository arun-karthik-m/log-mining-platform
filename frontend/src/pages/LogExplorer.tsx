import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Filter, ChevronLeft, ChevronRight,
  Clock, Server, MessageSquare, Layers,
} from 'lucide-react'
import { logService } from '@services/api'
import type { Log } from '@services/types'
import { format } from 'date-fns'
import { PageTransition, SectionHeader, EmptyState, TableSkeleton } from '@components/ui'
import { useCachedFetch } from '@hooks/useCache'

export function LogExplorer() {
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState(1)

  const limit = 50

  const { data, loading } = useCachedFetch<{ logs: Log[]; total: number }>(
    'log-explorer',
    () => logService.getLogs({
      level: levelFilter || undefined,
      search: searchQuery || undefined,
      page,
      limit,
    }),
    { ttl: 600000, deps: [levelFilter, searchQuery, page] }, // 10 minutes cache
  )

  const logs = data?.logs || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']

  // Show empty state if no logs (not loading)
  if (!loading && total === 0) {
    return (
      <PageTransition>
        <EmptyState
          icon={<MessageSquare size={48} className="text-zinc-600" />}
          title="No logs uploaded"
          description="Upload log files to start exploring and analyzing your data."
          action={
            <a href="/" className="px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors inline-block">
              Upload Logs
            </a>
          }
        />
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <SectionHeader
          title="Logs"
          subtitle="Search, filter, and explore your log entries"
          badge={
            <span className="px-2 py-1 rounded-md bg-white/10 border border-zinc-800 text-xs font-mono text-white">{total.toLocaleString()} entries</span>
          }
        />

        {/* Search & Filters */}
        <motion.div
          className="border border-zinc-800 p-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[280px] relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600"
              />
              <input
                type="text"
                placeholder="Search log messages..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-black border border-zinc-800 text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none transition-colors"
              />
            </div>

            {/* Level Filter */}
            <div className="relative">
              <Filter
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
              />
              <select
                value={levelFilter}
                onChange={(e) => { setLevelFilter(e.target.value); setPage(1) }}
                className="pl-8 pr-8 py-2.5 text-sm bg-black border border-zinc-800 text-white appearance-none cursor-pointer min-w-[140px] focus:border-zinc-600 focus:outline-none transition-colors"
              >
                <option value="">All Levels</option>
                {levels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {(levelFilter || searchQuery) && (
              <button
                onClick={() => { setLevelFilter(''); setSearchQuery(''); setPage(1) }}
                className="px-4 py-2.5 text-xs text-zinc-500 hover:text-white transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </motion.div>

        {/* Log Table */}
        {loading && !data ? (
          <TableSkeleton rows={limit} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Search size={48} className="text-zinc-600" />}
            title="No logs found"
            description={searchQuery || levelFilter
              ? "Try adjusting your search or filters"
              : "No logs match your criteria"}
            action={
              (searchQuery || levelFilter) && (
                <button
                  onClick={() => { setLevelFilter(''); setSearchQuery(''); setPage(1) }}
                  className="px-6 py-2.5 bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
                >
                  Clear all filters
                </button>
              )
            }
          />
        ) : (
          <motion.div
            className="border border-zinc-800 overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs font-mono text-zinc-500 uppercase tracking-wider px-4 py-3">Timestamp</th>
                    <th className="text-left text-xs font-mono text-zinc-500 uppercase tracking-wider px-4 py-3">Level</th>
                    <th className="text-left text-xs font-mono text-zinc-500 uppercase tracking-wider px-4 py-3">Source</th>
                    <th className="text-left text-xs font-mono text-zinc-500 uppercase tracking-wider px-4 py-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <LogRow key={log.id || index} log={log} index={index} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-zinc-800 px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Showing <span className="font-mono text-white">{(page - 1) * limit + 1}</span> to <span className="font-mono text-white">{Math.min(page * limit, total)}</span> of <span className="font-mono text-white">{total.toLocaleString()}</span> logs
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed hover:border-zinc-600 transition-colors"
                  >
                    <ChevronLeft size={16} className="text-white" />
                  </button>
                  <span className="text-xs font-mono text-zinc-500 px-2">
                    Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed hover:border-zinc-600 transition-colors"
                  >
                    <ChevronRight size={16} className="text-white" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}

function LogRow({ log, index }: { log: Log; index: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="border-b border-zinc-800/50 hover:bg-white/[0.02] transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Clock size={12} />
          {log.timestamp ? format(new Date(log.timestamp), 'MMM d, HH:mm:ss') : '-'}
        </div>
      </td>
      <td className="px-4 py-3">
        <LevelBadge level={log.level} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <Server size={12} className="text-zinc-600" />
          <span className="text-zinc-400">{log.source || <span className="text-zinc-700">-</span>}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-start gap-2 text-sm">
          <MessageSquare size={14} className="text-zinc-600 mt-0.5" />
          <span className="text-zinc-300 font-light">{log.message}</span>
        </div>
      </td>
    </motion.tr>
  )
}

function LevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    DEBUG: 'bg-zinc-900 border-zinc-700 text-zinc-500',
    INFO: 'bg-zinc-900 border-zinc-600 text-zinc-300',
    WARN: 'bg-zinc-900 border-zinc-500 text-zinc-100',
    ERROR: 'bg-white/10 border-white text-white',
    CRITICAL: 'bg-white border-white text-black font-medium',
  }

  return (
    <span className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider border ${styles[level] || styles.DEBUG}`}>
      {level === 'CRITICAL' && (
        <span className="inline-block w-1.5 h-1.5 bg-black rounded-full mr-1 animate-pulse" />
      )}
      {level}
    </span>
  )
}
