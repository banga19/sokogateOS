import React, { useState, useEffect } from 'react'

function KpiCard({ label, value, change, prefix = '', suffix = '', icon, color }) {
  const colors = { green: 'from-green-500 to-emerald-600', blue: 'from-blue-500 to-indigo-600', orange: 'from-orange-500 to-amber-600', purple: 'from-purple-500 to-violet-600' }
  return (
    <div className="card overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-6 -mt-6 rounded-full bg-gradient-to-br ${colors[color] || colors.blue} opacity-10`} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{prefix}{value}{suffix}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          <span>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}%</span>
          <span className="text-gray-400 font-normal">vs last month</span>
        </div>
      )}
    </div>
  )
}

export default function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState({
    totalSourcingRequests: 47,
    totalShipments: 23,
    totalRevenue: 1245000,
    aiLegibilityScore: 72,
    activeSuppliers: 8,
    avgTimeToQuote: 3.2,
    modelAccuracy: 86,
    improvementRate: 4.7,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-gray-500 mt-1">High-level KPIs and business intelligence for Sokogate Kenya</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-green-700">AI Self-Improving Loop Active</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={metrics.totalRevenue.toLocaleString()} prefix="$" icon="💰" color="green" change={12.5} />
        <KpiCard label="AI Legibility Score" value={metrics.aiLegibilityScore} suffix="%" icon="🤖" color="blue" change={8.3} />
        <KpiCard label="Model Accuracy" value={metrics.modelAccuracy} suffix="%" icon="🎯" color="purple" change={metrics.improvementRate} />
        <KpiCard label="Active Suppliers" value={metrics.activeSuppliers} icon="🏭" color="orange" change={2} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard label="Total Sourcing Requests" value={metrics.totalSourcingRequests} icon="🔍" color="blue" change={15} />
        <KpiCard label="Total Shipments" value={metrics.totalShipments} icon="🚢" color="green" change={8} />
        <KpiCard label="Avg Time to Quote" value={metrics.avgTimeToQuote} suffix=" days" icon="⏱️" color="orange" change={-12} />
        <KpiCard label="Improvement Rate" value={metrics.improvementRate} suffix="%" icon="📈" color="purple" change={metrics.improvementRate} />
      </div>

      {/* AI Self-Improving Loop Section */}
      <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🔄</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Self-Improving Loop</h2>
            <p className="text-sm text-gray-500">The engine that makes SokogateOS smarter over time</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{metrics.improvementRate}%</p>
            <p className="text-xs text-gray-500">Accuracy Improvement</p>
          </div>
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">1,247</p>
            <p className="text-xs text-gray-500">Feedback Items Collected</p>
          </div>
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">143</p>
            <p className="text-xs text-gray-500">Models Retrained</p>
          </div>
          <div className="bg-white/80 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">92%</p>
            <p className="text-xs text-gray-500">Feedback Coverage</p>
          </div>
        </div>
        <div className="mt-4 bg-white/60 rounded-lg p-4 text-sm">
          <p className="font-medium text-gray-900 mb-1">How it works:</p>
          <ol className="list-decimal list-inside text-gray-600 space-y-1">
            <li><strong>Collect</strong> — Every user interaction (accept/reject ratings, corrections) feeds into the loop</li>
            <li><strong>Analyze</strong> — Patterns are detected in feedback: what's working, what needs improvement</li>
            <li><strong>Retrain</strong> — AI models automatically retrain when accuracy drops below 85%</li>
            <li><strong>Improve</strong> — Each cycle measurably improves model accuracy and business outcomes</li>
          </ol>
        </div>
      </div>

      {/* Investor Highlights */}
      <div className="card bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💎</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Investor Highlights</h2>
            <p className="text-sm text-gray-500">Sokogate Kenya — Pre-Seed Stage</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Target Market</p>
            <p className="font-semibold text-gray-900 mt-1">$500B+ African Import Market</p>
            <p className="text-xs text-gray-500 mt-1">50M+ SMEs across Africa need procurement, customization, and logistics</p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Funding Round</p>
            <p className="font-semibold text-gray-900 mt-1">$500,000 for 10% Equity</p>
            <p className="text-xs text-gray-500 mt-1">Pre-seed. Building the AI OS that makes companies legible to AI by default</p>
          </div>
          <div className="bg-white/80 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Key Differentiator</p>
            <p className="font-semibold text-gray-900 mt-1">Self-Improving Loop™</p>
            <p className="text-xs text-gray-500 mt-1">Every interaction improves all models. Network effects with data moat.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
