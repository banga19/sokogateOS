import React, { useState } from 'react'
import { sourcingAPI, qmeAPI } from '../services/api'

function SourcingForm({ onCreated }) {
  const [form, setForm] = useState({ productQuery: '', quantity: 1000, priority: 'balanced' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await sourcingAPI.createRequest(form)
      if (onCreated) onCreated(res.data.data)
      setForm({ productQuery: '', quantity: 1000, priority: 'balanced' })
    } catch {} finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-lg font-semibold">New Sourcing Request</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product Query</label>
        <textarea value={form.productQuery} onChange={e => setForm({...form, productQuery: e.target.value})} className="input h-20" placeholder="e.g., 5000 meters of premium cotton fabric for school uniforms" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} className="input" min={1} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="select">
            <option value="balanced">Balanced</option>
            <option value="fastest">Fastest</option>
            <option value="cheapest">Cheapest</option>
          </select>
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Submitting...' : 'Submit Sourcing Request'}</button>
    </form>
  )
}

function SupplierCard({ match }) {
  const score = Math.round((match.matchScore || 0) * 100)
  const color = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'

  return (
    <div className="card hover:border-primary-200 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{match.supplierName}</h3>
          <p className="text-sm text-gray-500">{match.supplierId}</p>
        </div>
        <div className={`text-lg font-bold ${color === 'green' ? 'text-green-600' : color === 'orange' ? 'text-orange-600' : 'text-red-600'}`}>
          {score}%
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(match.matchReasons || []).slice(0, 3).map((r, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{r}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {match.estimatedPrice && (
          <>
            <div><span className="text-gray-400">Est. Price</span><p className="font-medium">${match.estimatedPrice.perUnit}/unit</p></div>
            <div><span className="text-gray-400">Lead Time</span><p className="font-medium">{match.leadTime || '14-30 days'}</p></div>
          </>
        )}
        <div><span className="text-gray-400">Payment</span><p className="font-medium">{(match.paymentTerms || ['T/T'])[0]}</p></div>
        <div><span className="text-gray-400">Incoterm</span><p className="font-medium">{(match.incoterms || ['FOB'])[0]}</p></div>
      </div>
    </div>
  )
}

export default function ProcurementDashboard() {
  const [requests, setRequests] = useState([])
  const [matches, setMatches] = useState([])
  const [activeTab, setActiveTab] = useState('new')

  const handleCreated = (data) => {
    setRequests(prev => [data, ...prev])
    if (data.supplierMatches) setMatches(data.supplierMatches)
    setActiveTab('results')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procurement Dashboard</h1>
        <p className="text-gray-500 mt-1">AI-powered bulk product sourcing for African importers</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-200 w-fit">
        {[
          { key: 'new', label: 'New Request' },
          { key: 'results', label: 'Results', badge: matches.length },
          { key: 'history', label: 'History', badge: requests.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            {tab.label}
            {tab.badge > 0 && <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200'}`}>{tab.badge}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'new' && <SourcingForm onCreated={handleCreated} />}

      {activeTab === 'results' && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-gray-500">No results yet. Submit a sourcing request to see supplier matches.</p>
            </div>
          ) : (
            <>
              <div className="card bg-primary-50 border-primary-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="font-semibold text-primary-900">{matches.length} suppliers matched</p>
                    <p className="text-sm text-primary-700">Top match: {matches[0]?.supplierName} ({Math.round(matches[0]?.matchScore * 100)}%)</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.slice(0, 6).map((m, i) => <SupplierCard key={i} match={m} />)}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sourcing requests yet</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.productQuery?.original || r.productQuery || 'Sourcing request'}</p>
                    <p className="text-xs text-gray-400">{r.workflow?.status || 'submitted'} • {r.supplierMatches?.length || 0} matches</p>
                  </div>
                  <span className="badge-info">{r.workflow?.status || 'Submitted'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
