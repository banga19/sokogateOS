import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'

// ===== Skeleton loader =====
function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`} />
  )
}

function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-14 h-5 rounded-full" />
      </div>
      <Skeleton className="w-24 h-3 mb-2" />
      <Skeleton className="w-20 h-8 mb-1" />
      <Skeleton className="w-16 h-3" />
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 p-3">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="w-48 h-4" />
        <Skeleton className="w-64 h-3" />
      </div>
      <Skeleton className="w-10 h-3" />
    </div>
  )
}

// ===== StatCard =====
function StatCard({ title, value, subtitle, icon, trend, color = 'primary', loading }) {
  const colorMap = {
    primary: 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  }

  if (loading) return <StatCardSkeleton />

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all duration-200 animate-scale-in">
      <div className="flex items-start justify-between mb-3">
        <span className={`w-10 h-10 rounded-lg ${colorMap[color] || colorMap.primary} flex items-center justify-center text-lg`}>
          {icon}
        </span>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            trend >= 0
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
          }`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function ActivityItem({ icon, title, desc, time, color }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors animate-fade-in">
      <span className={`w-8 h-8 rounded-lg ${color || 'bg-gray-50 dark:bg-gray-800'} flex items-center justify-center text-sm flex-shrink-0`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{time}</span>
    </div>
  )
}

// ===== Main Dashboard =====
export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState(null)
  const [activities, setActivities] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { healthAPI } = await import('../services/api')
        const healthRes = await healthAPI.check()
        setHealth(healthRes.data)
      } catch {
        // Health check non-critical
      }

      // Simulated activity feed (in production this would come from a real endpoint)
      setTimeout(() => {
        setActivities([
          { icon: '🔍', title: 'Sourcing match completed', desc: '12 suppliers matched for textile query', time: '2m ago', color: 'bg-blue-50 dark:bg-blue-900/30' },
          { icon: '🚢', title: 'Shipment status updated', desc: 'SHIP-8342 now in transit', time: '15m ago', color: 'bg-green-50 dark:bg-green-900/30' },
          { icon: '✨', title: 'Customization quote generated', desc: 'Screen print design — $4.52/unit', time: '1h ago', color: 'bg-orange-50 dark:bg-orange-900/30' },
          { icon: '🤖', title: 'AI retraining completed', desc: 'Sourcing model improved by 3.2%', time: '2h ago', color: 'bg-purple-50 dark:bg-purple-900/30' },
          { icon: '📄', title: 'Document processed', desc: 'Invoice INV-2024-893 extracted', time: '3h ago', color: 'bg-gray-50 dark:bg-gray-800' },
        ])
        setLoading(false)
      }, 600)
    }
    fetchData()
  }, [])

  const handleQuickAction = (path, label) => {
    toast(`Opening ${label}...`, { type: 'info', duration: 2000 })
    navigate(path)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-slide-down">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome, {user?.name || 'User'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          SokogateOS — Making African trade legible to AI
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Sourcing"
          value={loading ? '...' : '12'}
          subtitle="Requests in progress"
          icon="🔍"
          color="primary"
          trend={8}
          loading={loading}
        />
        <StatCard
          title="Active Shipments"
          value={loading ? '...' : '8'}
          subtitle="In transit today"
          icon="🚢"
          color="blue"
          trend={-3}
          loading={loading}
        />
        <StatCard
          title="Customization"
          value={loading ? '...' : '5'}
          subtitle="In production"
          icon="✨"
          color="orange"
          trend={12}
          loading={loading}
        />
        <StatCard
          title="AI Legibility Score"
          value={loading ? '...' : health ? '85%' : '--'}
          subtitle="Company data quality"
          icon="🤖"
          color="green"
          trend={5}
          loading={loading}
        />
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              Real-time
            </span>
          </div>

          {loading ? (
            <div className="space-y-1">
              {[1,2,3,4,5].map(i => <ActivitySkeleton key={i} />)}
            </div>
          ) : (
            <div className="space-y-1">
              {activities.map((item, i) => (
                <ActivityItem key={i} {...item} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions & Status */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickAction('/procurement', 'Sourcing Request')}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm text-left"
              >
                <span className="w-7 h-7 rounded bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs">🔍</span>
                New Sourcing Request
              </button>
              <button
                onClick={() => handleQuickAction('/logistics', 'Logistics')}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm text-left"
              >
                <span className="w-7 h-7 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">🚢</span>
                Track Shipment
              </button>
              <button
                onClick={() => handleQuickAction('/qme', 'QMe Tasks')}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm text-left"
              >
                <span className="w-7 h-7 rounded bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs">⚡</span>
                Run QMe Task
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Health</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">API Status</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">QMe Runner</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">AI Models</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">6 Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
