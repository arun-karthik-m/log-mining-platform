import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { AmbientBackground } from '@components/ui'

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/logs', label: 'Logs', icon: Search },
  { path: '/patterns', label: 'Patterns', icon: GitBranch },
  { path: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { path: '/clusters', label: 'Clusters', icon: Boxes },
]

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Don't show layout on upload page
  if (location.pathname === '/') {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-black flex relative overflow-hidden">
      <BackgroundEffects />
      
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-5 right-5 z-50 p-2.5 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:sticky top-0 left-0 w-[280px] h-screen z-40 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        initial={false}
      >
        {/* Logo Area */}
        <div className="p-8 pb-6">
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/')}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-8 h-8 border border-white/20 flex items-center justify-center">
              <div className="w-4 h-4 bg-white" />
            </div>
            <div>
              <h1 className="text-sm font-medium tracking-tight text-white">LogMine</h1>
              <p className="text-[0.55rem] text-zinc-600 font-medium uppercase tracking-widest">Analytics</p>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-zinc-900" />

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-1 relative">
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
                  className={`
                    relative flex items-center gap-3 px-3 py-3 rounded-lg text-sm 
                    transition-all duration-300 group
                    ${isActive
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-300'
                    }
                  `}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index + 0.1 }}
                  whileHover={{ x: 2 }}
                >
                  {/* Active background */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                      layoutId="nav-active"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}

                  {/* Active accent bar */}
                  {isActive && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-white"
                      layoutId="nav-indicator"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}

                  <Icon
                    size={17}
                    strokeWidth={1.5}
                    className={`relative z-10 transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'
                    }`}
                  />
                  <span className="relative z-10 font-light">{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 pt-4">
          <div className="mx-2 mb-4 h-px bg-zinc-900" />
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
            <span className="text-[0.6rem] text-zinc-700 font-medium">v1.0.0</span>
          </div>
        </div>
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-h-screen relative z-10 overflow-auto">
        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function BackgroundEffects() {
  return (
    <>
      {/* Gradient mesh - subtle white/gray movement */}
      <motion.div
        animate={{
          x: [0, 100, 0, -100, 0],
          y: [0, -50, 0, 50, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-white/[0.02] to-transparent rounded-full blur-3xl"
      />
      
      <motion.div
        animate={{
          x: [0, -80, 0, 80, 0],
          y: [0, 80, 0, -80, 0],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-white/[0.02] to-transparent rounded-full blur-3xl"
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <Particle key={i} index={i} />
        ))}
      </div>

      {/* Noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  )
}

function Particle({ index }: { index: number }) {
  const size = Math.random() * 2 + 1
  const startX = Math.random() * 100
  const duration = Math.random() * 15 + 15
  const delay = Math.random() * 10
  
  return (
    <motion.div
      className="absolute rounded-full bg-white"
      style={{
        left: `${startX}%`,
        width: size,
        height: size,
        opacity: Math.random() * 0.3 + 0.1,
      }}
      initial={{ y: '100vh' }}
      animate={{ y: '-100vh' }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "linear",
      }}
    />
  )
}
