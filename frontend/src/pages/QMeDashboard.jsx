import React, { useState, useEffect } from 'react'
import { qmeAPI } from '../services/api'

const TASK_TEMPLATES = [
  {
    name: 'sourcing-match',
    label: 'Sourcing Supplier Match',
    icon: '🔍',
    desc: 'Match product queries to suppliers using AI analysis',
    fields: [
      { key: 'productQuery', label: 'Product Query', type: 'textarea', placeholder: 'e.g., 5000 meters of premium cotton fabric' },
      { key: 'quantity', label: 'Quantity', type: 'number', default: 1000 },
    ]
  },
  {
    name: 'customization-price',
    label: 'Customization Pricing',
    icon: '✨',
    desc: 'Calculate pricing for product customization requests',
    fields: [
      { key: 'customizationType', label: 'Type', type: 'select', options: ['embroidery', 'screen_print', 'heat_transfer', 'label', 'engrave', 'emboss'] },
      { key: 'quantity', label: 'Quantity', type: 'number', default: 1000 },
      { key: 'urgency', label: 'Urgency', type: 'select', options: ['standard', 'expedited', 'rush'], default: 'standard' },
    ]
  },
  {
    name: 'logistics-route',
    label: 'Logistics Route Optimization',
    icon: '🚢',
    desc: 'Find optimal shipping routes between ports',
    fields: [
      { key: 'origin', label: 'Origin', type: 'text', placeholder: 'Shanghai' },
      { key: 'destination', label: 'Destination', type: 'text', placeholder: 'Mombasa' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['balanced', 'fastest', 'cheapest', 'greenest'] },
    ]
  }
]

function TaskCard({ task, onRun }) {
  return (
    <div className="card hover:border-primary-300 transition-all cursor-pointer" onClick={() => onRun(task)}>
      <div className="flex items-start gap-4">
        <span className="text-3xl">{task.icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{task.label}</h3>
          <p className="text-sm text-gray-500 mt-1">{task.desc}</p>
        </div>
        <button className="btn-primary text-xs px-3 py-1.5" onClick={(e) => { e.stopPropagation(); onRun(task) }}>Run</button>
      </div>
    </div>
  )
}

function TaskRunModal({ task, onClose }) {
  const [form, setForm] = useState(() => {
    const initial = {}
    task.fields?.forEach(f => { initial[f.key] = f.default || '' })
    return initial
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await qmeAPI.runTask(task.name, form)
      setResult(res.data.data || res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{task.icon}</span>
            <h2 className="text-lg font-semibold">{task.label}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {!result ? (
            <>
              {task.fields?.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})} className="input h-20" placeholder={f.placeholder} />
                  ) : f.type === 'select' ? (
                    <select value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})} className="select">
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})} className="input" placeholder={f.placeholder} />
                  )}
                </div>
              ))}

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

              <button onClick={handleRun} disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Running Task...
                  </span>
                ) : 'Execute Task'} 
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
                ✓ Task completed successfully in {result.processingTimeMs || 0}ms
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
              <button onClick={() => setResult(null)} className="btn-secondary w-full">Run Again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function QMeDashboard() {
  const [selectedTask, setSelectedTask] = useState(null)
  const [taskHistory, setTaskHistory] = useState([])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QMe Task Runner</h1>
        <p className="text-gray-500 mt-1">Execute AI-powered tasks for sourcing, customization, and logistics</p>
      </div>

      {/* Available Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TASK_TEMPLATES.map(task => (
          <TaskCard key={task.name} task={task} onRun={setSelectedTask} />
        ))}
      </div>

      {/* Task Execution History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Task History</h2>
        {taskHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">⚡</p>
            <p className="text-sm">No tasks executed yet. Run a task above to see results here.</p>
          </div>
        ) : (
          <div className="space-y-2">{taskHistory.map((h, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 text-sm">
              <span className="font-medium">{h.taskName}</span>
              <span className={`badge ${h.success ? 'badge-success' : 'badge-danger'}`}>{h.success ? 'Success' : 'Failed'}</span>
            </div>
          ))}</div>
        )}
      </div>

      {/* QMe Status */}
      <div className="card bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚙️</span>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">QMe Engine Status</p>
            <p className="text-sm text-gray-500">Python-based task runner with SQLite-backed job queue</p>
          </div>
          <span className="badge-success">Active</span>
        </div>
      </div>

      {selectedTask && <TaskRunModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  )
}
