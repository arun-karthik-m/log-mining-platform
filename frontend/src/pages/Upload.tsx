import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader2, X,
  BarChart3, Database, Shield, Zap, ArrowRight
} from 'lucide-react'
import { logService, miningService } from '@services/api'
import { PageTransition } from '@components/ui'
import { clearAllCache } from '@hooks/useCache'

export function Upload() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    current: number
    total: number
    status: 'uploading' | 'processing' | 'complete' | 'error'
    message: string
  } | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  // Clear cache when visiting upload page
  useEffect(() => {
    clearAllCache()
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleFile = async (file: File) => {
    const validExtensions = ['.json', '.csv', '.log', '.txt']
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!hasValidExtension) {
      setUploadProgress({
        current: 0,
        total: 0,
        status: 'error',
        message: 'Invalid file format. Please upload .json, .csv, .log, or .txt files.'
      })
      return
    }

    setUploadedFile(file)
    setIsUploading(true)
    setUploadProgress({
      current: 0,
      total: file.size,
      status: 'uploading',
      message: `Uploading ${file.name}...`
    })

    try {
      const result = await logService.uploadFile(file)
      setUploadProgress({
        current: result.count,
        total: result.count,
        status: 'processing',
        message: `Processing ${result.count} log entries. Running AI analysis...`
      })

      await new Promise(resolve => setTimeout(resolve, 3000)) // 3 seconds to show animation

      setUploadProgress({
        current: result.count,
        total: result.count,
        status: 'complete',
        message: `${result.count.toLocaleString()} logs processed. Redirecting...`
      })
    } catch (error) {
      setUploadProgress({
        current: 0,
        total: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed. Please try again.'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setUploadedFile(null)
    setUploadProgress(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRunAnalysis = () => {
    navigate('/dashboard')
  }

  // Auto-run mining and redirect to dashboard after successful upload
  useEffect(() => {
    if (uploadProgress?.status === 'complete') {
      const timer = setTimeout(async () => {
        // Trigger all mining algorithms in background
        try {
          await Promise.all([
            miningService.discoverPatterns(),
            miningService.detectAnomalies(),
            miningService.clusterLogs(),
          ])
        } catch (e) {
          console.error('Mining failed:', e)
        }
        navigate('/dashboard')
      }, 4000) // 4 seconds - enough time to see the complete state
      return () => clearTimeout(timer)
    }
  }, [uploadProgress?.status, navigate])

  return (
    <PageTransition>
      <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
        {/* Animated Background */}
        <BackgroundEffects />
        
        {/* Navigation */}
        <nav className="px-8 py-6 relative z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-white/20 flex items-center justify-center">
                <div className="w-4 h-4 bg-white" />
              </div>
              <span className="text-white font-medium tracking-tight">LogMine</span>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
          <div className="max-w-4xl w-full">
            <AnimatePresence mode="wait">
              {!uploadedFile ? (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Header */}
                  <div className="text-center mb-16">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.8 }}
                    >
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-[0.2em] mb-4">
                        Log Analytics Platform
                      </p>
                    </motion.div>
                    
                    <motion.h1
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="text-6xl md:text-8xl font-light text-white mb-6 tracking-tighter"
                    >
                      Upload logs.
                      <br />
                      <span className="text-zinc-600">Find patterns.</span>
                    </motion.h1>
                    
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.8 }}
                      className="text-zinc-500 text-lg max-w-md mx-auto leading-relaxed"
                    >
                      AI-powered analysis for your log files. Patterns, anomalies, and insights—automatically.
                    </motion.p>
                  </div>

                  {/* Upload Zone */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        relative group cursor-pointer
                        border transition-all duration-500
                        ${isDragging 
                          ? 'border-white/40 bg-white/[0.02]' 
                          : 'border-zinc-800 hover:border-zinc-600'
                        }
                      `}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.csv,.log,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      
                      <div className="py-20 px-6">
                        <div className="flex flex-col items-center">
                          <motion.div
                            animate={isDragging ? { scale: 1.05 } : {}}
                            transition={{ duration: 0.3 }}
                            className="mb-8"
                          >
                            <div className={`
                              w-16 h-16 border border-zinc-800 
                              flex items-center justify-center
                              group-hover:border-zinc-600
                              transition-colors duration-500
                            `}>
                              <UploadIcon 
                                size={24} 
                                strokeWidth={1.5}
                                className="text-zinc-500 group-hover:text-white transition-colors duration-500"
                              />
                            </div>
                          </motion.div>
                          
                          <p className="text-white text-sm font-light mb-2">
                            {isDragging ? 'Drop file' : 'Drag & drop log file'}
                          </p>
                          <p className="text-zinc-600 text-xs mb-8">
                            or click to browse
                          </p>
                          
                          <div className="flex items-center gap-1">
                            {['JSON', 'CSV', 'LOG', 'TXT'].map((format, i) => (
                              <motion.span
                                key={format}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 + i * 0.1 }}
                                className="text-[10px] font-mono text-zinc-600 px-2 py-1 border border-zinc-800"
                              >
                                {format}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Features */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.8 }}
                    className="grid grid-cols-3 gap-px mt-px pt-12"
                  >
                    <Feature
                      icon={<Database size={16} strokeWidth={1.5} />}
                      title="Pattern Mining"
                      delay={0.8}
                    />
                    <Feature
                      icon={<Shield size={16} strokeWidth={1.5} />}
                      title="Anomaly Detection"
                      delay={0.9}
                    />
                    <Feature
                      icon={<Zap size={16} strokeWidth={1.5} />}
                      title="Smart Clustering"
                      delay={1.0}
                    />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="status"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center"
                >
                  {/* Status Icon */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                  >
                    {uploadProgress?.status === 'complete' ? (
                      <div className="w-20 h-20 border border-white/20 mx-auto flex items-center justify-center">
                        <CheckCircle size={32} strokeWidth={1.5} className="text-white" />
                      </div>
                    ) : uploadProgress?.status === 'error' ? (
                      <div className="w-20 h-20 border border-white/20 mx-auto flex items-center justify-center">
                        <AlertCircle size={32} strokeWidth={1.5} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 border border-white/20 mx-auto flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 size={32} strokeWidth={1.5} className="text-white" />
                        </motion.div>
                      </div>
                    )}
                  </motion.div>

                  {/* File Name */}
                  <h3 className="text-white text-lg font-light mb-2">
                    {uploadedFile.name}
                  </h3>
                  <p className="text-zinc-600 text-sm mb-12">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>

                  {/* Status Message */}
                  {uploadProgress && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mb-12"
                    >
                      <p className="text-zinc-500 text-sm font-light">
                        {uploadProgress.message}
                      </p>

                      {uploadProgress.status === 'uploading' && (
                        <div className="w-48 h-px bg-zinc-800 mx-auto mt-4 overflow-hidden">
                          <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="h-full w-full bg-white"
                          />
                        </div>
                      )}

                      {uploadProgress.status === 'processing' && (
                        <div className="relative h-32 flex items-center justify-center mt-8">
                          {/* Animated rings */}
                          <motion.div
                            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute w-24 h-24 border border-zinc-700 rounded-full"
                          />
                          <motion.div
                            animate={{ rotate: -360, scale: [1, 1.3, 1] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            className="absolute w-20 h-20 border border-zinc-600 rounded-full"
                          />
                          <motion.div
                            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                            className="absolute w-16 h-16 border border-zinc-500 rounded-full"
                          />
                          {/* Center pulse */}
                          <motion.div
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-8 h-8 bg-white rounded-full"
                          />
                          {/* Floating particles */}
                          <div className="absolute inset-0">
                            {[...Array(8)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-white rounded-full"
                                style={{
                                  left: '50%',
                                  top: '50%',
                                }}
                                animate={{
                                  x: Math.cos((i * 45 * Math.PI) / 180) * 80,
                                  y: Math.sin((i * 45 * Math.PI) / 180) * 80,
                                  opacity: [0, 1, 0],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  delay: i * 0.25,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Actions */}
                  {uploadProgress?.status === 'complete' && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {/* Success checkmark animation */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="w-16 h-16 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto mb-4"
                      >
                        <CheckCircle size={32} className="text-emerald-400" />
                      </motion.div>
                      
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 size={14} className="text-zinc-500" />
                        </motion.div>
                        <p className="text-zinc-400 text-sm">
                          Running AI analysis: patterns, anomalies & clustering...
                        </p>
                      </div>
                      <p className="text-zinc-500 text-xs text-center">
                        Redirecting to dashboard with all insights...
                      </p>
                      <button
                        onClick={handleReset}
                        className="mt-4 text-zinc-600 text-xs hover:text-white transition-colors"
                      >
                        Upload different file
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-8 py-6 border-t border-zinc-900 relative z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <p className="text-zinc-700 text-xs">
              © 2026 LogMine
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-zinc-700 text-xs hover:text-zinc-500 transition-colors">
                Documentation
              </a>
              <a href="#" className="text-zinc-700 text-xs hover:text-zinc-500 transition-colors">
                API
              </a>
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  )
}

function Feature({ icon, title, delay }: { 
  icon: React.ReactNode
  title: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className="text-center group"
    >
      <div className="text-zinc-600 group-hover:text-white transition-colors duration-500 mb-3 flex justify-center">
        {icon}
      </div>
      <p className="text-zinc-500 text-xs font-light group-hover:text-zinc-400 transition-colors duration-500">
        {title}
      </p>
    </motion.div>
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
        className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-white/[0.03] to-transparent rounded-full blur-3xl"
      />
      
      <motion.div
        animate={{
          x: [0, -80, 0, 80, 0],
          y: [0, 80, 0, -80, 0],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-white/[0.02] to-transparent rounded-full blur-3xl"
      />
      
      <motion.div
        animate={{
          x: [0, 60, 0, -60, 0],
          y: [0, -80, 0, 80, 0],
        }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut", delay: 10 }}
        className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-white/[0.02] to-transparent rounded-full blur-3xl"
      />

      {/* Vertical light beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 w-px h-full bg-gradient-to-b from-transparent via-white/[0.03] to-transparent"
            style={{ left: `${20 * (i + 1)}%` }}
            animate={{
              opacity: [0.02, 0.05, 0.02],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 1.5,
            }}
          />
        ))}
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <Particle key={i} index={i} />
        ))}
      </div>

      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

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
