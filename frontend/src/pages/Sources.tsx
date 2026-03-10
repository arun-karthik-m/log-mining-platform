import { useState, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Upload, FileText, Wifi, WifiOff, CheckCircle2,
  AlertCircle, Loader2, X, File, Radio,
  ArrowRight,
} from 'lucide-react'
import { logService, LogStreamService } from '@services/api'
import type { UploadResponse } from '@services/types'
import { PageTransition, SectionHeader } from '@components/ui'

type StreamStatus = 'connected' | 'disconnected' | 'connecting'

export function Sources() {
  // File upload state
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live stream state
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('disconnected')
  const [liveLogCount, setLiveLogCount] = useState(0)
  const [recentLogs, setRecentLogs] = useState<Record<string, unknown>[]>([])
  const streamRef = useRef<LogStreamService | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.disconnect()
    }
  }, [])

  // ── File Upload ────────────────────────────────

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleFileSelect = (file: File) => {
    const validExtensions = ['.json', '.log', '.txt', '.csv']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!validExtensions.includes(ext)) {
      setUploadError(`Unsupported file type "${ext}". Supported: ${validExtensions.join(', ')}`)
      return
    }
    setSelectedFile(file)
    setUploadError(null)
    setUploadResult(null)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadError(null)
    setUploadResult(null)

    try {
      const result = await logService.uploadFile(selectedFile)
      setUploadResult(result)
      setSelectedFile(null)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Upload failed'
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setUploadError(null)
    setUploadResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Live Stream ────────────────────────────────

  const toggleStream = () => {
    if (streamStatus === 'connected' || streamStatus === 'connecting') {
      streamRef.current?.disconnect()
      streamRef.current = null
      setStreamStatus('disconnected')
    } else {
      const stream = new LogStreamService()
      streamRef.current = stream

      stream.onStatusChange((status) => {
        setStreamStatus(status)
      })

      stream.onLog((log) => {
        setLiveLogCount((c) => c + 1)
        setRecentLogs((prev) => [log, ...prev].slice(0, 50))
      })

      stream.connect()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        <SectionHeader
          title="Log Sources"
          subtitle="Upload log files or connect to live streaming sources"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── File Upload Card ── */}
          <motion.div
            className="glass-card p-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center">
                <Upload size={16} className="text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">File Upload</h3>
                <p className="text-[0.65rem] text-zinc-500">JSON, CSV, LOG, TXT files</p>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                dragActive
                  ? 'border-accent/50 bg-accent/[0.03]'
                  : 'border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.01]'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.log,.txt,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  dragActive ? 'bg-accent/10' : 'bg-white/[0.03]'
                }`}>
                  <FileText size={22} className={dragActive ? 'text-accent' : 'text-zinc-500'} />
                </div>
                <div>
                  <p className="text-sm text-zinc-300">
                    {dragActive ? 'Drop your file here' : 'Drag & drop a log file'}
                  </p>
                  <p className="text-[0.7rem] text-zinc-600 mt-1">
                    or click to browse
                  </p>
                </div>
              </div>
            </div>

            {/* Selected File */}
            {selectedFile && (
              <motion.div
                className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <File size={16} className="text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{selectedFile.name}</p>
                  <p className="text-[0.65rem] text-zinc-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button onClick={clearFile} className="text-zinc-600 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </motion.div>
            )}

            {/* Upload Button */}
            {selectedFile && (
              <motion.button
                className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                onClick={handleUpload}
                disabled={uploading}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={15} className="animate-spin relative z-10" />
                    <span className="relative z-10">Uploading & Processing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={15} className="relative z-10" />
                    <span className="relative z-10">Upload & Analyze</span>
                  </>
                )}
              </motion.button>
            )}

            {/* Result */}
            {uploadResult && (
              <motion.div
                className="mt-4 p-3 rounded-lg bg-emerald/[0.05] border border-emerald/15 flex items-center gap-3"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-emerald-300">Upload successful</p>
                  <p className="text-[0.65rem] text-zinc-400">
                    {uploadResult.count} log entries ingested and ready for analysis
                  </p>
                </div>
              </motion.div>
            )}

            {uploadError && (
              <motion.div
                className="mt-4 p-3 rounded-lg bg-danger/[0.05] border border-danger/15 flex items-center gap-3"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={16} className="text-danger-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-danger-400">Upload failed</p>
                  <p className="text-[0.65rem] text-zinc-400">{uploadError}</p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* ── Live Stream Card ── */}
          <motion.div
            className="glass-card p-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/15 flex items-center justify-center">
                <Radio size={16} className="text-violet-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Live Stream</h3>
                <p className="text-[0.65rem] text-zinc-500">Real-time WebSocket connection</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {streamStatus === 'connected' ? (
                    <Wifi size={14} className="text-emerald-400" />
                  ) : streamStatus === 'connecting' ? (
                    <Loader2 size={14} className="text-warning-400 animate-spin" />
                  ) : (
                    <WifiOff size={14} className="text-zinc-600" />
                  )}
                  <span className={`text-xs font-medium ${
                    streamStatus === 'connected' ? 'text-emerald-400' :
                    streamStatus === 'connecting' ? 'text-warning-400' :
                    'text-zinc-500'
                  }`}>
                    {streamStatus === 'connected' ? 'Connected' :
                     streamStatus === 'connecting' ? 'Connecting...' :
                     'Disconnected'}
                  </span>
                </div>

                {streamStatus === 'connected' && (
                  <span className="badge badge-emerald text-[0.6rem]">
                    {liveLogCount} received
                  </span>
                )}
              </div>

              <p className="text-[0.65rem] text-zinc-600 mb-3">
                Connect to the WebSocket endpoint to receive logs in real-time.
                Use the webhook endpoint <code className="text-zinc-400 font-mono">POST /api/v1/logs/webhook</code> to push logs from external sources.
              </p>

              <button
                onClick={toggleStream}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  streamStatus === 'connected'
                    ? 'bg-danger/10 border border-danger/20 text-danger-400 hover:bg-danger/15'
                    : 'btn-primary'
                }`}
              >
                {streamStatus === 'connected' ? (
                  <>
                    <WifiOff size={14} className={streamStatus === 'connected' ? '' : 'relative z-10'} />
                    <span>Disconnect</span>
                  </>
                ) : streamStatus === 'connecting' ? (
                  <>
                    <Loader2 size={14} className="animate-spin relative z-10" />
                    <span className="relative z-10">Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wifi size={14} className="relative z-10" />
                    <span className="relative z-10">Connect to Stream</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Log Feed */}
            {recentLogs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.65rem] text-zinc-500 uppercase tracking-wider">Live Feed</span>
                  <span className="text-[0.6rem] text-zinc-600">{recentLogs.length} recent</span>
                </div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                  {recentLogs.slice(0, 20).map((log, i) => (
                    <motion.div
                      key={i}
                      className="p-2 rounded-lg bg-white/[0.015] border border-white/[0.03] text-[0.72rem]"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`badge text-[0.55rem] ${
                          getLevelBadge(String(log.level || 'INFO'))
                        }`}>
                          {String(log.level || 'INFO')}
                        </span>
                        <span className="text-zinc-400 font-mono text-[0.65rem] flex-shrink-0">
                          {log.timestamp ? new Date(String(log.timestamp)).toLocaleTimeString() : '--:--:--'}
                        </span>
                        <span className="text-zinc-300 truncate">
                          {String(log.message || JSON.stringify(log))}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* How It Works */}
        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-white mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Step number={1} title="Ingest" description="Upload files or stream logs via WebSocket / webhook" />
            <Step number={2} title="Parse & Clean" description="Auto-detect format, normalize levels, remove duplicates" />
            <Step number={3} title="Build Sessions" description="Group related events by user, trace, or time proximity" />
            <Step number={4} title="Analyze" description="Run pattern mining, clustering, and anomaly detection" />
          </div>
        </motion.div>

        {/* Supported Formats */}
        <motion.div
          className="glass-card p-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.12 }}
        >
          <h3 className="text-sm font-semibold text-white mb-4">Supported Formats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FormatCard ext=".json" description="JSON arrays or objects with log entries" example='[{"timestamp": "...", "level": "INFO", "message": "..."}]' />
            <FormatCard ext=".csv" description="CSV with header row containing timestamp, level, message" example="timestamp,level,message,source" />
            <FormatCard ext=".log" description="Standard log files (syslog, Apache, generic)" example="2026-03-10T08:00:01Z INFO User login" />
            <FormatCard ext=".txt" description="Plain text logs, one entry per line" example="Mar 10 08:00:01 server app[123]: msg" />
          </div>
        </motion.div>
      </div>
    </PageTransition>
  )
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center flex-shrink-0">
        <span className="text-[0.65rem] font-bold text-accent">{number}</span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">{title}</p>
          {number < 4 && <ArrowRight size={10} className="text-zinc-700 hidden md:block" />}
        </div>
        <p className="text-[0.65rem] text-zinc-500 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

function FormatCard({ ext, description, example }: { ext: string; description: string; example: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.04]">
      <span className="badge badge-accent text-[0.6rem] mb-2">{ext}</span>
      <p className="text-[0.7rem] text-zinc-400 mb-2">{description}</p>
      <code className="text-[0.6rem] text-zinc-600 font-mono block truncate">{example}</code>
    </div>
  )
}

function getLevelBadge(level: string): string {
  const map: Record<string, string> = {
    DEBUG: 'badge-zinc',
    INFO: 'badge-accent',
    WARN: 'badge-warning',
    WARNING: 'badge-warning',
    ERROR: 'badge-danger',
    CRITICAL: 'badge-danger',
  }
  return map[level.toUpperCase()] || 'badge-zinc'
}
