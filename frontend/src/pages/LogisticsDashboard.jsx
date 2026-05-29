import React, { useState } from 'react'
import { logisticsAPI } from '../services/api'

function ShipmentCard({ shipment }) {
  const statusColors = {
    processing: 'badge-info',
    ready_for_pickup: 'badge-warning',
    picked_up: 'badge-warning',
    in_transit: 'badge-info',
    at_customs: 'badge-warning',
    cleared_customs: 'badge-info',
    out_for_delivery: 'badge-info',
    delivered: 'badge-success',
    failed: 'badge-danger',
    cancelled: 'badge-neutral',
  }

  const statusLabels = {
    processing: 'Processing',
    ready_for_pickup: 'Ready for Pickup',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    at_customs: 'At Customs',
    cleared_customs: 'Customs Cleared',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    failed: 'Failed',
    cancelled: 'Cancelled',
  }

  return (
    <div className="card hover:border-blue-200 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{shipment.shipmentId || 'New Shipment'}</h3>
          <p className="text-xs text-gray-400">Order: {shipment.orderId || 'N/A'}</p>
        </div>
        <span className={statusColors[shipment.status] || 'badge-neutral'}>
          {statusLabels[shipment.status] || shipment.status}
        </span>
      </div>
      <div className="flex items-center gap-2 my-3">
        <div className="text-xs text-gray-500 text-right">{shipment.shipmentDetails?.origin?.city || 'Origin'}</div>
        <div className="flex-1 h-0.5 bg-gray-200 relative">
          <div className="absolute inset-0 bg-primary-500 rounded" style={{ width: `${shipment.status === 'delivered' ? 100 : 40}%` }} />
        </div>
        <div className="text-xs text-gray-500">{shipment.shipmentDetails?.destination?.city || 'Destination'}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="text-gray-400">Mode</p>
          <p className="font-medium capitalize">{shipment.shipmentDetails?.transport?.mode || 'sea'}</p>
        </div>
        <div>
          <p className="text-gray-400">ETA</p>
          <p className="font-medium">{shipment.estimatedDelivery?.date ? new Date(shipment.estimatedDelivery.date).toLocaleDateString() : '--'}</p>
        </div>
        <div>
          <p className="text-gray-400">Events</p>
          <p className="font-medium">{shipment.events?.length || 0}</p>
        </div>
      </div>
    </div>
  )
}

function ShipmentForm({ onCreated }) {
  const [form, setForm] = useState({ origin: 'Shanghai', destination: 'Mombasa', priority: 'balanced', quantity: 100 })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await logisticsAPI.createShipment(form)
      if (onCreated) onCreated(res.data.data)
      setForm({ origin: 'Shanghai', destination: 'Mombasa', priority: 'balanced', quantity: 100 })
    } catch {} finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-lg font-semibold">Create Shipment</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Origin</label>
          <select value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} className="select">
            <option>Shanghai</option><option>Shenzhen</option><option>Mumbai</option>
            <option>Istanbul</option><option>Rotterdam</option><option>Dubai</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
          <select value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className="select">
            <option>Mombasa</option><option>Dar es Salaam</option><option>Lagos</option>
            <option>Nairobi</option><option>Accra</option><option>Johannesburg</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="select">
            <option value="balanced">Balanced</option><option value="fastest">Fastest</option>
            <option value="cheapest">Cheapest</option><option value="greenest">Greenest</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
          <input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} className="input" min={1} />
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating...' : 'Create Shipment'}</button>
    </form>
  )
}

export default function LogisticsDashboard() {
  const [shipments, setShipments] = useState([])
  const [activeTab, setActiveTab] = useState('active')

  const handleCreated = (data) => {
    setShipments(prev => [data, ...prev])
    setActiveTab('active')
  }

  const activeShips = shipments.filter(s => s.status !== 'delivered' && s.status !== 'cancelled')
  const deliveredShips = shipments.filter(s => s.status === 'delivered')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logistics Dashboard</h1>
        <p className="text-gray-500 mt-1">Real-time shipment tracking and route optimization for African trade</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <span className="text-2xl">🚢</span>
          <div><p className="stat-label">Active</p><p className="text-2xl font-bold">{activeShips.length}</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <span className="text-2xl">✅</span>
          <div><p className="stat-label">Delivered</p><p className="text-2xl font-bold">{deliveredShips.length}</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <span className="text-2xl">📦</span>
          <div><p className="stat-label">Total</p><p className="text-2xl font-bold">{shipments.length}</p></div>
        </div>
        <div className="card flex items-center gap-4">
          <span className="text-2xl">⏱️</span>
          <div><p className="stat-label">Avg Transit</p><p className="text-2xl font-bold">14d</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-200 w-fit">
        <button onClick={() => setActiveTab('new')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'new' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>New Shipment</button>
        <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>Active ({activeShips.length})</button>
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>All Shipments</button>
      </div>

      {activeTab === 'new' && <ShipmentForm onCreated={handleCreated} />}

      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeShips.length === 0 ? (
            <div className="card col-span-full text-center py-12">
              <p className="text-4xl mb-3">🚢</p>
              <p className="text-gray-500">No active shipments. Create a shipment to get started.</p>
            </div>
          ) : activeShips.map((s, i) => <ShipmentCard key={i} shipment={s} />)}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shipments.length === 0 ? (
            <div className="card col-span-full text-center py-12">
              <p className="text-gray-500">No shipments yet.</p>
            </div>
          ) : shipments.map((s, i) => <ShipmentCard key={i} shipment={s} />)}
        </div>
      )}

      {/* Route guide */}
      <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">🗺️</span>
          <div>
            <p className="font-semibold text-gray-900">African Trade Route Guide</p>
            <p className="text-sm text-gray-500">Optimized routes for East & West African importers</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="font-medium">Mumbai → Mombasa</p>
            <p className="text-gray-400">Sea: 8 days | $800</p>
            <p className="text-gray-400">Reliability: 88%</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="font-medium">Shanghai → Mombasa</p>
            <p className="text-gray-400">Sea: 22 days | $1,800</p>
            <p className="text-gray-400">Reliability: 82%</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="font-medium">Istanbul → Lagos</p>
            <p className="text-gray-400">Sea: 12 days | $1,200</p>
            <p className="text-gray-400">Reliability: 87%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
