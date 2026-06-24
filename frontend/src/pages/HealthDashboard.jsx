import React, { useState, useEffect, useCallback, useRef } from 'react'
import { healthAPI } from '../services/api'

const categoryIcons = {
  'Core': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.75L7.5 6.75m15 4.5a4.5 4.5 0 01-.9 2.75l-2.1 2.25" />
    </svg>
  ),
  'AI & Data': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  'Communication': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  'Payments': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  'Infrastructure': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
}

function ServiceCard({ check }) {
  const passed = check.ok
  const hasLive = check.live
  const liveOk = hasLive?.ok

  return (
    <div className={`rounded-xl border transition-all duration-200 hover:shadow-md ${
      passed
        ? 'border-green-200 dark:border-green-800/50 bg-white dark:bg-gray-900'
        : 'border-amber-200 dark:border-amber-800/50 bg-white dark:bg-gray-900'
    }`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{check.name}</h3>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            passed
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          }`}>
            {passed ? (
              <><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" /> OK</>
            ) : (
              <><span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5" /> Missing</>
            )}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{check.message}</p>
        {check.live && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span className={`text-xs font-medium ${liveOk ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
              Live: {liveOk ? 'Connected' : 'Failed'}
            </span>
            {check.live.responseTimeMs && (
              <span className="text-xs text-gray-400">{check.live.responseTimeMs}ms</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBar({ summary }) {
  if (!summary) return null
  const pct = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0

  let barColor = 'bg-green-500'
  if (pct < 50) barColor = 'bg-red-500'
  else if (pct < 80) barColor = 'bg-amber-500'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`text-2xl font-bold ${summary.requiredFailed > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {summary.requiredFailed > 0 ? 'Degraded' : 'Healthy'}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {summary.passed}/{summary.total} services
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="text-green-600 dark:text-green-400">{summary.passed} passed</span>
          {summary.failed > 0 && <span className="text-amber-600 dark:text-amber-400">{summary.failed} missing</span>}
          {summary.requiredFailed > 0 && <span className="text-red-600 dark:text-red-400">{summary.requiredFailed} required</span>}
        </div>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function CategorySection({ category, checks }) {
  const passed = checks.filter((c) => c.ok).length
  const total = checks.length

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-400 dark:text-gray-500">{categoryIcons[category]}</span>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{category}</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{passed}/{total}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {checks.map((check) => (
          <ServiceCard key={check.key || check.name} check={check} />
        ))}
      </div>
    </div>
  )
}

export default function HealthDashboard() {
  const [data, setData] = useState(null)
  const [mode, setMode] = useState('config') // 'config' | 'live'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [countdown, setCountdown] = useState(30)
  const fetchingRef = useRef(false)
  const modeRef = useRef(mode)
  const REFRESH_INTERVAL = 30000

  // Keep modeRef in sync so the interval always reads the latest mode
  modeRef.current = mode

  const fetchHealth = useCallback(async (live) => {
    // Skip if a fetch is already in-flight to avoid race conditions
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      setLoading(true)
      setError(null)
      const res = live ? await healthAPI.checkLive() : await healthAPI.check()
      setData(res.data)
      setLastUpdated(new Date())
      setCountdown(30)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch health status')
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchHealth(false)
  }, [fetchHealth])

  // Auto-refresh every 30s, using the latest mode from the ref
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHealth(modeRef.current === 'live')
    }, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchHealth])

  // Countdown tick every 1s
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  const handleRefresh = () => {
    fetchHealth(mode === 'live')
  }

  const toggleMode = () => {
    const newMode = mode === 'config' ? 'live' : 'config'
    setMode(newMode)
    fetchHealth(newMode === 'live')
  }

  // Group checks by category
  const byCategory = {}
  if (data?.checks) {
    for (const check of data.checks) {
      if (!byCategory[check.category]) byCategory[check.category] = []
      byCategory[check.category].push(check)
    }
  }

  // Determine overall health icon
  let statusIcon, statusClass
  if (!data) {
    statusIcon = <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent" />
    statusClass = 'text-gray-400'
  } else if (data.summary?.requiredFailed > 0) {
    statusIcon = (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    )
    statusClass = 'text-red-600 dark:text-red-400'
  } else if (data.summary?.failed > 0) {
    statusIcon = (
      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    )
    statusClass = 'text-amber-600 dark:text-amber-400'
  } else {
    statusIcon = (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
    statusClass = 'text-green-600 dark:text-green-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {statusIcon}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">System Health</h1>
            <p className={`text-sm ${statusClass}`}>
              {data?.status || 'Checking...'}
              {lastUpdated && (
                <span className="text-gray-400 dark:text-gray-500 ml-2 font-normal">
                  · Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'live'
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {mode === 'live' ? '🔌 Live checks' : '⚙️ Config only'}
          </button>
          {/* Countdown ring + refresh button */}
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7 flex items-center justify-center" title={`Auto-refresh in ${countdown}s`}>
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12" cy="12" r="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="12" cy="12" r="10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 10}
                  strokeDashoffset={2 * Math.PI * 10 * (1 - countdown / 30)}
                  className="text-primary-500 dark:text-primary-400"
                />
              </svg>
              <span className="absolute text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                {countdown}
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={handleRefresh} className="text-xs text-red-600 dark:text-red-400 hover:underline">Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-4 animate-pulse">
          <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status bar */}
      {data?.summary && <StatusBar summary={data.summary} />}

      {/* Service cards grouped by category */}
      {data?.checks && Object.entries(byCategory).map(([category, checks]) => (
        <CategorySection key={category} category={category} checks={checks} />
      ))}

      {/* Empty state */}
      {data && (!data.checks || data.checks.length === 0) && !loading && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.66 5.66a2 2 0 01-2.83 0l-1.41-1.41a2 2 0 010-2.83l5.66-5.66m4.25 4.25l5.66-5.66a2 2 0 000-2.83l-1.41-1.41a2 2 0 00-2.83 0l-5.66 5.66" />
          </svg>
          <p className="text-sm">No health check data available</p>
        </div>
      )}

      {/* Footer */}
      {data && (
        <div className="text-center text-xs text-gray-400 dark:text-gray-600 pt-2">
          {data.version && <span>v{data.version} · </span>}
          <span>{data.timestamp ? new Date(data.timestamp).toISOString() : ''}</span>
        </div>
      )}
    </div>
  )
}
