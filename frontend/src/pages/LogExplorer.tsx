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
    { ttl: 30000, deps: [levelFilter, searchQuery, page] },
  )

  const logs = data?.logs || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL']

  return (
    <PageTransition>
      <div className="space-y-6">
        <SectionHeader
          title="Log Explorer"
          subtitle="Search, filter, and analyze your log entries"
          badge={
            <span className="badge badge-zinc font-mono">{total.toLocaleString()} entries</span>
          }
        />

        {/* Search & Filters */}
        <motion.div
          className="glass-card p-4"
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
                className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
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
                className="glass-input pl-8 pr-8 py-2.5 text-sm appearance-none cursor-pointer min-w-[140px]"
              >
                <option value="">All Levels</option>
                {levels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(levelFilter || searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.03]">
              <span className="text-[0.65rem] text-zinc-600 uppercase tracking-wider">Active:</span>
              {levelFilter && (
                <button
                  onClick={() => setLevelFilter('')}
                  className="badge badge-accent text-[0.6rem] cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {levelFilter} &times;
                </button>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="badge badge-violet text-[0.6rem] cursor-pointer hover:opacity-80 transition-opacity"
                >
                  "{searchQuery}" &times;
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Logs Table */}
        {loading && !data ? (
          <TableSkeleton rows={8} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Layers size={48} />}
            title="No Logs Found"
            description={searchQuery || levelFilter
              ? 'Try adjusting your search or filters'
              : 'No log entries available yet'}
          />
        ) : (
          <motion.div
            className="glass-card overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="overflow-x-auto">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} />
                        Timestamp
                      </div>
                    </th>
                    <th>Level</th>
                    <th>
                      <div className="flex items-center gap-1.5">
                        <Server size={11} />
                        Source
                      </div>
                    </th>
                    <th>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={11} />
                        Message
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap font-mono text-[0.78rem] text-zinc-500">
                        {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                      <td>
                        <LevelBadge level={log.level} />
                      </td>
                      <td className="text-zinc-400 font-mono text-[0.78rem]">
                        {log.source || <span className="text-zinc-700">-</span>}
                      </td>
                      <td className="max-w-md">
                        <span className="text-zinc-300 text-[0.82rem] line-clamp-1">
                          {log.message}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xs text-zinc-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost flex items-center gap-1.5 text-xs disabled:opacity-30"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              {/* Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                        page === pageNum
                          ? 'bg-accent/10 text-accent border border-accent/20'
                          : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost flex items-center gap-1.5 text-xs disabled:opacity-30"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}

function LevelBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    DEBUG: 'badge-zinc',
    INFO: 'badge-accent',
    WARN: 'badge-warning',
    ERROR: 'badge-danger',
    CRITICAL: 'badge-danger',
  }

  return (
    <span className={`badge ${styles[level] || 'badge-zinc'}`}>
      {level === 'CRITICAL' && (
        <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
      )}
      {level}
    </span>
  )
}
