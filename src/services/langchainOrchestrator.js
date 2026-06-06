// LangChain/LangGraph Workflow Orchestrator for QMe tasks (Backend)
// Enhanced with true RAG capabilities using Ruflo infrastructure

const logger = require('../utils/logger')

// Workflow state management
const workflowState = new Map()
const feedbackStore = new Map()
const taskResults = new Map() // Legacy in-memory store for fallback

// Initialize LangChain components (optional - degrades gracefully)
let useLangChain = false
let useRufloMemory = false

/**
 * Initialize LangChain and Ruflo memory systems
 */
async function initializeSystems() {
  try {
    // Check if langchain packages are available (frontend-only currently)
    if (process.env.OPENAI_API_KEY) {
      try {
        // LangChain packages are installed in frontend only
        // This allows the feature to work in degraded mode in backend
        require('@langchain/openai')
        require('langchain/vectorstores/memory')
        useLangChain = true
        logger.info('LangChain: Initialized with OpenAI')
      } catch (pkgError) {
        logger.warn('LangChain: Packages not available in backend, running orchestration without LLM features')
      }
    } else {
      logger.warn('LangChain: No OPENAI_API_KEY - running in degraded mode')
    }
  } catch (error) {
    logger.error('LangChain: Initialization failed:', error.message)
  }

  // Initialize Ruflo memory infrastructure
  try {
    // Test if Ruflo memory tools are available
    const hasMemoryTools = typeof global.mcp !== 'undefined' &&
                          typeof global.mcp__claude_flow__memory_search !== 'undefined'

    if (hasMemoryTools) {
      useRufloMemory = true
      logger.info('Ruflo memory: Initialized for RAG capabilities')
    } else {
      logger.warn('Ruflo memory: Not available, using fallback in-memory storage')
    }
  } catch (error) {
    logger.error('Ruflo memory: Initialization failed:', error.message)
  }
}

// Initialize systems on module load
initializeSystems().catch(err => logger.error('Failed to initialize systems:', err))

/**
 * Store task result in Ruflo memory for RAG context
 * @param {string} taskId - Unique task identifier
 * @param {Object} taskData - Task data to store
 * @param {string} namespace - Memory namespace (default: 'task-results')
 */
async function storeTaskResultRuflo(taskId, taskData, namespace = 'task-results') {
  if (!useRufloMemory) {
    // Fallback to in-memory storage
    taskResults.set(taskId, {
      taskName: taskData.taskName,
      result: taskData.result,
      timestamp: new Date()
    })
    return
  }

  try {
    // Store in Ruflo memory with vector embeddings for semantic search
    await global.mcp__claude_flow__memory_store({
      key: taskId,
      value: JSON.stringify({
        taskId,
        taskName: taskData.taskName,
        result: taskData.result,
        timestamp: new Date().toISOString(),
        input: taskData.input || {}
      }),
      namespace: namespace,
      tags: ['task-result', taskData.taskName]
    })

    logger.debug(`Stored task result in Ruflo memory: ${taskId}`)
  } catch (error) {
    logger.warn('Failed to store in Ruflo memory, falling back to in-memory:', error.message)
    // Fallback to in-memory storage
    taskResults.set(taskId, {
      taskName: taskData.taskName,
      result: taskData.result,
      timestamp: new Date()
    })
  }
}

/**
 * Retrieve task context from Ruflo memory using semantic search
 * @param {string} query - Search query for relevant context
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Context results
 */
async function getRagContextRuflo(query, options = {}) {
  if (!useRufloMemory) {
    // Fallback to legacy in-memory search
    return getTaskContextLegacy(query)
  }

  try {
    const limit = options.limit || 5
    const threshold = options.threshold || 0.3
    const namespace = options.namespace || 'task-results'

    // Search Ruflo memory using semantic similarity
    const results = await global.mcp__claude_flow__memory_search({
      query: query,
      namespace: namespace,
      limit: limit,
      threshold: threshold
    })

    // Format results for compatibility
    const context = results.map(result => ({
      pageContent: result.value ? JSON.parse(result.value).result : '',
      metadata: {
        taskId: result.key,
        ...JSON.parse(result.value || '{}'),
        similarity: result.similarity
      }
    }))

    return { context, error: null }
  } catch (error) {
    logger.error('Ruflo memory search failed, falling back to legacy:', error.message)
    return getTaskContextLegacy(query)
  }
}

/**
 * Legacy in-memory task context retrieval (fallback)
 * @param {string} query - Search query
 * @returns {Object} Context results
 */
function getTaskContextLegacy(query) {
  if (!query) return { context: [], error: null }

  // Search in-memory task results
  const results = []
  for (const [taskId, task] of taskResults.entries()) {
    const content = JSON.stringify(task.result || {}).toLowerCase()
    if (content.includes(query.toLowerCase())) {
      results.push({
        pageContent: content,
        metadata: { taskId, taskName: task.taskName, timestamp: task.timestamp }
      })
    }
  }

  // Limit to 5 most recent
  const context = results.slice(-5)
  return { context, error: null }
}

/**
 * Store learning patterns in Ruflo memory for future reference
 * @param {string} patternKey - Unique pattern identifier
 * @param {Object} patternData - Pattern data to store
 * @param {string} namespace - Memory namespace (default: 'learning-patterns')
 */
async function storeLearningPattern(patternKey, patternData, namespace = 'learning-patterns') {
  if (!useRufloMemory) {
    logger.warn('Ruflo memory not available, skipping pattern storage')
    return
  }

  try {
    await global.mcp__claude_flow__memory_store({
      key: patternKey,
      value: JSON.stringify({
        ...patternData,
        timestamp: new Date().toISOString(),
        type: 'learning-pattern'
      }),
      namespace: namespace,
      tags: ['learning-pattern', patternData.type || 'general']
    })

    logger.debug(`Stored learning pattern in Ruflo memory: ${patternKey}`)
  } catch (error) {
    logger.error('Failed to store learning pattern:', error.message)
  }
}

/**
 * Track workflow state transitions
 */
function updateWorkflow(taskId, taskName, state, data = {}) {
  const workflow = {
    taskId,
    taskName,
    state,
    data,
    timestamp: new Date(),
    ...workflowState.get(taskId)
  }
  workflowState.set(taskId, workflow)
  logger.debug(`Workflow ${taskId} (${taskName}): ${state}`)
  return workflow
}

// Get workflow state
function getWorkflow(taskId) {
  return workflowState.get(taskId) || { state: 'unknown', taskId }
}

// RAG-enhanced task execution with Ruflo memory integration
async function runTaskWithRAG(taskName, taskData, agentId = 'unknown') {
  const taskId = `${taskName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  try {
    // Initial state
    updateWorkflow(taskId, taskName, 'started', { input: taskData })

    // Retrieve relevant context from Ruflo memory for RAG enhancement
    const contextQuery = typeof taskData === 'string' ? taskData :
                        JSON.stringify(taskData)

    let ragContext = { context: [], error: null }
    if (contextQuery && contextQuery.length > 10) { // Only search for meaningful queries
      ragContext = await getRagContextRuflo(contextQuery, {
        limit: 3,
        threshold: 0.25
      })

      if (ragContext.context.length > 0) {
        logger.info(`RAG: Retrieved ${ragContext.context.length} relevant contexts for ${taskName}`)
        // Enhance taskData with retrieved context
        taskData = {
          ...taskData,
          ragContext: ragContext.context.map(ctx => ctx.pageContent).join('\n\n')
        }
      }
    }

    // Run the actual task via QMe wrapper
    const path = require('path')
    const taskResult = runTaskScript(taskName, taskData)

    // Store result in Ruflo memory for future RAG use
    await storeTaskResultRuflo(taskId, {
      taskName,
      result: taskResult
    }, 'task-results')

    // Store learning pattern if task was successful
    await storeLearningPattern(`${taskName}-success-${Date.now()}`, {} );
  } catch (error) {
    logger.error('Failed to store learning pattern:', error.message);
  }