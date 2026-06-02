import React, { useState, useEffect, useCallback, useRef } from 'react'
import { qmeAPI, sourcingAPI, logisticsAPI, customizationAPI, feedbackAPI } from '../services/api'

// Workflow state types
const WORKFLOW_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  NEEDS_REVIEW: 'needs_review'
}

// Task templates with synced workflow logic
const TASK_TEMPLATES = [
  {
    name: 'sourcing-match',
    label: 'Sourcing Supplier Match',
    icon: '🔍',
    desc: 'Match product queries to suppliers using AI analysis',
    category: 'sourcing',
    fields: [
      { key: 'productQuery', label: 'Product Query', type: 'textarea', placeholder: 'e.g., 5000 meters of premium cotton fabric' },
      { key: 'quantity', label: 'Quantity', type: 'number', default: 1000 },
    ],
    triggers: ['customization-price'],
    api: sourcingAPI.createRequest
  },
  {
    name: 'customization-price',
    label: 'Customization Pricing',
    icon: '✨',
    desc: 'Calculate pricing for product customization requests',
    category: 'customization',
    fields: [
      { key: 'customizationType', label: 'Type', type: 'select', options: ['embroidery', 'screen_print', 'heat_transfer', 'label', 'engrave', 'emboss'] },
      { key: 'quantity', label: 'Quantity', type: 'number', default: 1000 },
      { key: 'urgency', label: 'Urgency', type: 'select', options: ['standard', 'expedited', 'rush'], default: 'standard' },
    ],
    api: customizationAPI.createRequest
  },
  {
    name: 'logistics-route',
    label: 'Logistics Route Optimization',
    icon: '🚢',
    desc: 'Find optimal shipping routes between ports',
    category: 'logistics',
    fields: [
      { key: 'origin', label: 'Origin', type: 'text', placeholder: 'Shanghai' },
      { key: 'destination', label: 'Destination', type: 'text', placeholder: 'Mombasa' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['balanced', 'fastest', 'cheapest', 'greenest'] },
    ],
    api: logisticsAPI.createShipment
  }
]

// QMe Orchestrator hook - manages workflow state and synced task execution
function useQmeOrchestrator() {
  const [workflows, setWorkflows] = useState({})
  const [taskHistory, setTaskHistory] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)

  const updateWorkflow = useCallback((taskName, state, result = null) => {
    setWorkflows(prev => ({
      ...prev,
      [taskName]: { state, result, timestamp: Date.now() }
    }))
  }, [])

  const addHistory = useCallback((taskName, success, result) => {
    setTaskHistory(prev => [{
      taskName,
      success,
      result,
      timestamp: Date.now()
    }, ...prev.slice(0, 49)])
  }, [])

  const runTaskWithSync = useCallback(async (task, form) => {
    const taskName = task.name
    updateWorkflow(taskName, WORKFLOW_STATES.RUNNING)
    setIsProcessing(true)

    try {
      let result
      if (task.api) {
        const res = await task.api(form)
        result = res.data.data || res.data
        addHistory(taskName, true, result)
      } else {
        const res = await qmeAPI.runTask(taskName, form)
        result = res.data.data || res.data
        addHistory(taskName, true, result)
      }

      updateWorkflow(taskName, WORKFLOW_STATES.COMPLETED, result)

      // Trigger dependent tasks (RAG-synced flow)
      if (task.triggers && task.triggers.length > 0) {
        for (const dependentTask of task.triggers) {
          const dependent = TASK_TEMPLATES.find(t => t.name === dependentTask)
          if (dependent) {
            updateWorkflow(dependentTask, WORKFLOW_STATES.NEEDS_REVIEW)
          }
        }
      }

      return result
    } catch (error) {
      updateWorkflow(taskName, WORKFLOW_STATES.FAILED, { error: error.message })
      addHistory(taskName, false, { error: error.message })
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [updateWorkflow, addHistory])

  const submitFeedback = useCallback(async (taskName, rating, correction = null) => {
    try {
      await feedbackAPI.submit({
        target: {
          type: taskName,
          ...(correction && {
            field: Object.keys(correction)[0],
            originalValue: correction.original,
            correctedValue: correction.corrected
          })
        },
        explicit: { rating, sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral' }
      })
      return true
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      return false
    }
  }, [])

  return { workflows, taskHistory, runTaskWithSync, submitFeedback, updateWorkflow, isProcessing }
}

// Task card component with workflow state indicator
function TaskCard({ task, onRun, workflowState }) {
  const getStateStyles = () => {
    switch (workflowState) {
      case WORKFLOW_STATES.RUNNING: return 'border-orange-300 bg-orange-50'
      case WORKFLOW_STATES.COMPLETED: return 'border-green-300 bg-green-50'
      case WORKFLOW_STATES.FAILED: return 'border-red-300 bg-red-50'
      case WORKFLOW_STATES.NEEDS_REVIEW: return 'border-blue-300 bg-blue-50'
      default: return 'hover:border-primary-300'
    }
  }

  const getStateBadge = () => {
    if (workflowState === WORKFLOW_STATES.RUNNING) return 'badge-warning'
    if (workflowState === WORKFLOW_STATES.COMPLETED) return 'badge-success'
    if (workflowState === WORKFLOW_STATES.FAILED) return 'badge-danger'
    if (workflowState === WORKFLOW_STATES.NEEDS_REVIEW) return 'badge-info'
    return ''
  }

  return (
    <div className={`card cursor-pointer transition-all ${getStateStyles()}`} onClick={() => onRun(task)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <span className="text-3xl">{task.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{task.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{task.desc}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block capitalize ${getStateBadge()}`}>
              {workflowState !== WORKFLOW_STATES.IDLE ? workflowState.replace('_', ' ') : task.category}
            </span>
          </div>
        </div>
        <button className="btn-primary text-xs px-3 py-1.5" onClick={(e) => { e.stopPropagation(); onRun(task) }}>
          {workflowState === WORKFLOW_STATES.RUNNING ? 'Running...' : 'Run'}
        </button>
      </div>
    </div>
  )
}

// Task execution modal with RAG feedback integration
function TaskRunModal({ task, onClose, runTaskWithSync, workflows, submitFeedback }) {
  const [form, setForm] = useState(() => {
    const initial = {}
    task.fields?.forEach(f => { initial[f.key] = f.default || '' })
    return initial
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [feedbackRating, setFeedbackRating] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await runTaskWithSync(task, form)
      setResult(res)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  const handleFeedbackSubmit = async (rating) => {
    setFeedbackRating(rating)
    await submitFeedback(task.name, rating)
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
                ✓ Task completed successfully
              </div>

              {/* Result display */}
              <div className="max-h-64 overflow-y-auto">
                {task.name === 'sourcing-match' && result.supplierMatches && (
                  <div className="space-y-3">
                    <p className="font-medium text-gray-900">Top Matches:</p>
                    {result.supplierMatches.slice(0, 3).map((m, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium">{m.supplierName} - {Math.round(m.matchScore * 100)}% match</p>
                        <p className="text-xs text-gray-500">{m.matchReasons?.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                )}
                {task.name === 'customization-price' && result.pricing && (
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">Pricing: ${result.pricing.totalPrice?.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Timeline: {result.timeline?.totalDays} days</p>
                  </div>
                )}
                {task.name === 'logistics-route' && result.recommendedRoute && (
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">Recommended: {result.recommendedRoute.mode}</p>
                    <p className="text-sm text-gray-500">{result.recommendedRoute.duration} days, ${result.recommendedRoute.cost}</p>
                  </div>
                )}
              </div>

              {/* RAG Feedback */}
              {!showFeedback ? (
                <button onClick={() => setShowFeedback(true)} className="btn-secondary w-full">Rate Result</button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Rate this result:</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => handleFeedbackSubmit(n)} className={`text-2xl transition-all ${n <= (feedbackRating || 0) ? 'scale-110' : 'opacity-30'}`}>⭐</button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setResult(null)} className="btn-secondary w-full">Run Again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Orchestration panel showing synced task flows
function OrchestrationPanel({ workflows, taskHistory }) {
  const getDependentTasks = (taskName) => {
    const task = TASK_TEMPLATES.find(t => t.name === taskName)
    return task?.triggers || []
  }

  return (
    <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">🔄</span>
        <div>
          <p className="font-semibold text-gray-900">QMe Workflow Orchestration</p>
          <p className="text-sm text-gray-500">Tasks synced via LangChain flows with RAG feedback</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TASK_TEMPLATES.map(task => (
          <div key={task.name} className="bg-white/80 rounded-lg p-3">
            <p className="font-medium text-sm">{task.label}</p>
            {workflows[task.name]?.state === WORKFLOW_STATES.COMPLETED && (
              <span className="text-xs text-green-600">✓ Completed</span>
            )}
            {workflows[task.name]?.state === WORKFLOW_STATES.NEEDS_REVIEW && (
              <span className="text-xs text-blue-600">ⓘ Next tasks ready</span>
            )}
            {getDependentTasks(task.name).map(dep => (
              <div key={dep} className="text-xs text-gray-400 mt-1">→ {dep.replace('-', ' ')}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function QMeDashboard() {
  const [selectedTask, setSelectedTask] = useState(null)
  const { workflows, taskHistory, runTaskWithSync, submitFeedback, updateWorkflow, isProcessing } = useQmeOrchestrator()

  // Load recent tasks on mount
  useEffect(() => {
    qmeAPI.listTasks({ limit: 20 }).then(res => setTaskHistory(res.data.data || [])).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QMe Task Runner</h1>
        <p className="text-gray-500 mt-1">AI-powered tasks with LangChain/LangGraph orchestration and RAG feedback</p>
      </div>

      {/* Orchestration Panel */}
      <OrchestrationPanel workflows={workflows} taskHistory={taskHistory} />

      {/* Available Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TASK_TEMPLATES.map(task => (
          <TaskCard
            key={task.name}
            task={task}
            onRun={setSelectedTask}
            workflowState={workflows[task.name]?.state || WORKFLOW_STATES.IDLE}
          />
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
              <span className="font-medium">{h.taskName || h.name}</span>
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

      <div className="card bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-100">
        <div className="flex items-center gap-3">
          <span className="text-xl">🧠</span>
          <div>
            <p className="font-semibold text-gray-900">Self-Improving Loop</p>
            <p className="text-sm text-gray-500">All button actions feed into the AI feedback loop</p>
          </div>
          <span className="badge-info">Listening</span>
        </div>
      </div>

      {selectedTask && (
        <TaskRunModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          runTaskWithSync={runTaskWithSync}
          workflows={workflows}
          submitFeedback={submitFeedback}
        />
      )}
    </div>
  )
}