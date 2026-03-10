import { motion } from 'framer-motion'
import { type ReactNode, useEffect, useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'

/* ─────────────────────────────────────────────────
   PAGE TRANSITION
   ───────────────────────────────────────────────── */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────
   STAGGER CONTAINER
   ───────────────────────────────────────────────── */
export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.03,
}: {
  children: ReactNode
  className?: string
  staggerDelay?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: staggerDelay },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────
   ANIMATED COUNTER
   ───────────────────────────────────────────────── */
export function AnimatedCounter({
  value,
  duration = 1.5,
  className = '',
  formatFn,
}: {
  value: number
  duration?: number
  className?: string
  formatFn?: (n: number) => string
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const startTime = useRef<number | null>(null)
  const prevValue = useRef(0)

  useEffect(() => {
    const start = prevValue.current
    const end = value
    prevValue.current = value

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed = timestamp - startTime.current
      const progress = Math.min(elapsed / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }

    startTime.current = null
    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <span className={className}>
      {formatFn ? formatFn(displayValue) : displayValue.toLocaleString()}
    </span>
  )
}

/* ─────────────────────────────────────────────────
   SPINNER
   ───────────────────────────────────────────────── */
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return <Loader2 className={`${sizes[size]} text-accent animate-spin`} />
}

/* ─────────────────────────────────────────────────
   LOADING SKELETON
   ───────────────────────────────────────────────── */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-20" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card p-6 space-y-3">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 flex-1" />
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────
   EMPTY STATE
   ───────────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <motion.div
      className="glass-card p-16 text-center"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-center mb-6 text-zinc-600">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────
   TOAST
   ───────────────────────────────────────────────── */
export function Toast({
  message,
  type = 'info',
  onClose,
}: {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onClose?: () => void
}) {
  const styles = {
    success: 'border-emerald-500/30 bg-emerald-500/5',
    error: 'border-danger-500/30 bg-danger-500/5',
    warning: 'border-warning-500/30 bg-warning-500/5',
    info: 'border-accent/30 bg-accent/5',
  }

  return (
    <motion.div
      className={`glass-card p-4 border-l-2 ${styles[type]} flex items-center gap-3`}
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
    >
      <span className="text-white flex-1 text-sm">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors text-sm"
        >
          Dismiss
        </button>
      )}
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────
   AMBIENT BACKGROUND
   ───────────────────────────────────────────────── */
export function AmbientBackground() {
  return (
    <>
      <div className="ambient-bg">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>
      <div className="noise-overlay" />
      <div className="fixed inset-0 z-0 pointer-events-none grid-bg opacity-50" />
    </>
  )
}

/* ─────────────────────────────────────────────────
   SECTION HEADER
   ───────────────────────────────────────────────── */
export function SectionHeader({
  title,
  subtitle,
  action,
  badge,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight gradient-text-subtle">{title}</h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────
   METRIC CARD
   ───────────────────────────────────────────────── */
export function MetricCard({
  label,
  value,
  icon,
  trend,
  accentColor = 'accent',
}: {
  label: string
  value: number
  icon: ReactNode
  trend?: string
  accentColor?: 'accent' | 'violet' | 'emerald' | 'danger' | 'warning'
}) {
  const accentStyles = {
    accent: 'text-accent',
    violet: 'text-violet-400',
    emerald: 'text-emerald-400',
    danger: 'text-danger-400',
    warning: 'text-warning-400',
  }

  const glowStyles = {
    accent: 'group-hover:shadow-glow-sm',
    violet: 'group-hover:shadow-glow-violet',
    emerald: 'group-hover:shadow-glow-emerald',
    danger: 'group-hover:shadow-glow-danger',
    warning: '',
  }

  return (
    <motion.div
      className={`glass-card p-6 group cursor-default ${glowStyles[accentColor]}`}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`${accentStyles[accentColor]} opacity-60`}>{icon}</div>
        {trend && (
          <span className="badge badge-emerald text-[0.65rem]">{trend}</span>
        )}
      </div>
      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <AnimatedCounter
        value={value}
        className={`text-3xl font-bold tracking-tight ${accentStyles[accentColor]}`}
      />
    </motion.div>
  )
}
