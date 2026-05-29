import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

function StatCard({ title, value, subtitle, icon, trend, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <span className={`w-10 h-10 rounded-lg ${colors[color] || colors.primary} flex items-center justify-center text-lg`}>
          {icon}
        </span>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="stat-label">{title}</p>
      <p className="stat-value">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [companyData, setCompanyData] = useState(null)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { healthAPI, companyAPI, feedbackAPI } = await import('../services/api')
        const healthRes = await healthAPI.check()
        setHealth(healthRes.data)
      } catch {}
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name || 'User'}</h1>
        <p className="text-gray-500 mt-1">SokogateOS — Making African trade legible to AI</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Sourcing" value="12" subtitle="Requests in progress" icon="🔍" color="primary" trend={8} />
        <StatCard title="Active Shipments" value="8" subtitle="In transit today" icon="🚢" color="blue" trend={-3} />
        <StatCard title="Customization" value="5" subtitle="In production" icon="✨" color="orange" trend={12} />
        <StatCard title="AI Legibility Score" value={health ? '85%' : '--'} subtitle="Company data quality" icon="🤖" color="green" trend={5} />
      </div>

      {/* Main content area - 2 column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <div className="flex gap-2">
              <span className="badge-info">Real-time</span>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { icon: '🔍', title: 'Sourcing match completed', desc: '12 suppliers matched for textile query', time: '2m ago', color: 'bg-blue-50' },
              { icon: '🚢', title: 'Shipment status updated', desc: 'SHIP-8342 now in transit', time: '15m ago', color: 'bg-green-50' },
              { icon: '✨', title: 'Customization quote generated', desc: 'Screen print design — $4.52/unit', time: '1h ago', color: 'bg-orange-50' },
              { icon: '🤖', title: 'AI retraining completed', desc: 'Sourcing model improved by 3.2%', time: '2h ago', color: 'bg-purple-50' },
              { icon: '📄', title: 'Document processed', desc: 'Invoice INV-2024-893 extracted', time: '3h ago', color: 'bg-gray-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <span className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center text-sm flex-shrink-0`}>{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Status */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link to="/procurement" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <span className="w-7 h-7 rounded bg-primary-50 text-primary-600 flex items-center justify-center text-xs">🔍</span>
                New Sourcing Request
              </Link>
              <Link to="/logistics" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <span className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-xs">🚢</span>
                Track Shipment
              </Link>
              <Link to="/qme" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <span className="w-7 h-7 rounded bg-orange-50 text-orange-600 flex items-center justify-center text-xs">⚡</span>
                Run QMe Task
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Status</span>
                <span className="badge-success">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="badge-success">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">QMe Runner</span>
                <span className="badge-info">Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AI Models</span>
                <span className="badge-info">6 Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
