import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import {
  LayoutDashboard,
  Search,
  GitBranch,
  AlertTriangle,
  Boxes,
  Zap,
  Menu,
  X,
  ChevronRight,
  Upload,
} from 'lucide-react'
import { AmbientBackground } from '@components/ui'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/sources', label: 'Log Sources', icon: Upload },
  { path: '/logs', label: 'Log Explorer', icon: Search },
  { path: '/patterns', label: 'Patterns', icon: GitBranch },
  { path: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { path: '/clusters', label: 'Clusters', icon: Boxes },
]

export function Layout() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-0 flex relative">
      <AmbientBackground />

      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-5 right-5 z-50 p-2.5 glass-card text-zinc-400 hover:text-white transition-colors"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:sticky top-0 left-0 w-[260px] glass-panel h-screen z-40 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        initial={false}
      >
        {/* Logo Area */}
        <div className="p-6 pb-5">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-violet-500/20 border border-accent/20 flex items-center justify-center shadow-glow-sm">
              <Zap size={16} className="text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">LogMine</h1>
              <p className="text-[0.6rem] text-zinc-600 font-medium uppercase tracking-widest">Intelligence</p>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />

        {/* Navigation */}
        <nav className="flex-1 py-5 px-3 space-y-0.5 relative">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
              >
                <motion.div
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group ${
                    isActive
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index + 0.15 }}
                  whileHover={{ x: 2 }}
                >
                  {/* Active background */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-white/[0.04] border border-white/[0.04]"
                      layoutId="nav-active"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}

                  {/* Active accent bar */}
                  {isActive && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-accent to-violet-500"
                      layoutId="nav-indicator"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                      style={{ boxShadow: '0 0 12px rgba(0, 212, 255, 0.4)' }}
                    />
                  )}

                  <Icon
                    size={17}
                    className={`relative z-10 transition-colors duration-300 ${
                      isActive ? 'text-accent' : 'text-zinc-600 group-hover:text-zinc-400'
                    }`}
                  />
                  <span className="relative z-10 font-medium">{item.label}</span>

                  {isActive && (
                    <ChevronRight
                      size={14}
                      className="relative z-10 ml-auto text-zinc-600"
                    />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-5 pt-3">
          <div className="mx-2 mb-4 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          <div className="flex items-center gap-2 px-2">
            <div className="status-dot bg-emerald-500 text-emerald-500" />
            <span className="text-[0.65rem] text-zinc-600 font-medium">System Online</span>
          </div>
          <p className="text-[0.6rem] text-zinc-700 mt-3 px-2">v1.0.0</p>
        </div>
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-h-screen relative z-10">
        <div className="p-5 lg:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
