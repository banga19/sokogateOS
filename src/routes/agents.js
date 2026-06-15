// Agent API Routes for sokogateOS Autonomous AI Agent Engine
// Provides endpoints for agent management, spawning, task assignment, and monitoring

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Helper to get agent service from app locals
const getAgentService = (req) => {
  return req.app.locals.agentService;
};

// Helper to handle async route errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @route GET /api/agents
 * @description Get all active agents with their status
 * @access Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const agentService = getAgentService(req);
  if (!agentService) {
    return res.status(503).json({
      success: false,
      error: 'Agent service not available'
    });
  }

  try {
    const stats = agentService.getStats();
    if (stats.error) {
      return res.status(503).json({
        success: false,
        error: stats.error
      });
    }

    // Get detailed agent information
    const agentManager = agentService.getAgentManager();
    const agentsDetails = [];

    for (const [agentId, agent] of agentManager.agents.entries()) {
      agentsDetails.push({
        id: agent.id,
        type: agent.type,
        status: agent.state.status,
        capabilities: agent.capabilities,
        lastActivity: agent.state.lastActivity,
        createdAt: agent.state.createdAt,
        isInitialized: agent.isInitialized
      });
    }

    res.json({
      success: true,
      data: {
        stats: stats,
        agents: agentsDetails
      }
    });
  } catch (error) {
    logger.error('Error getting agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agents'
    });
  }
}));

/**
 * @route GET /api/agents/types
 * @description Get available agent types
 * @access Public
 */
router.get('/types', asyncHandler(async (req, res) => {
  const agentService = getAgentService(req);
  if (!agentService) {
    return res.status(503).json({
      success: false,
      error: 'Agent service not available'
    });
  }

  try {
    const agentManager = agentService.getAgentManager();
    const types = Array.from(agentManager.agentTypes.keys());

    res.json({
      success: true,
      data: {
        agentTypes: types,
        count: types.length
      }
    });
  } catch (error) {
    logger.error('Error getting agent types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent types'
    });
  }
}));

/**
 * @route GET /api/agents/:agentId
 * @description Get specific agent details
 * @access Public
 */
router.get('/:agentId', asyncHandler(async (req, res) => {
  const agentService = getAgentService(req);
  if (!agentService) {
    return res.status(503).json({
      success: false,
      error: 'Agent service not available'
    });
  }

  try {
    const agentManager = agentService.getAgentManager();
    const agent = agentManager.agents.get(req.params.agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: agent.id,
        type: agent.type,
        status: agent.state.status,
        capabilities: agent.capabilities,
        lastActivity: agent.state.lastActivity,
        createdAt: agent.state.createdAt,
        currentTask: agent.state.currentTask,
        isInitialized: agent.isInitialized,
        memoryStats: agent.memory.getStats()
      }
    });
  } catch (error) {
    logger.error('Error getting agent details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent details'
    });
  }
}));

/**
 * @route POST /api/agents/spawn
 * @description Spawn a new agent of specified type
 * @access Public
 */
router.post('/spawn', asyncHandler(async (req, res) => {
  const agentService = getAgentService(req);
  if (!agentService) {
    return res.status(503).json({
      success: false,
      error: 'Agent service not available'
    });
  }

  try {
    const { type, options } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Agent type is required'
      });
    }

    const agent = await agentService.spawnAgent(type, options || {});

    res.status(201).json({
      success: true,
      data: {
        id: agent.id,
        type: agent.type,
        status: agent.state.status,
        message: `Agent spawned successfully`
      }
    });
  } catch (error) {
    logger.error('Error spawning agent:', error);
    if (error.message.includes('Unknown agent type')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to spawn agent'
    });
  }
}));

/**
 * @route POST /api/agents/:agentId/tasks
 * @description Assign a task to a specific agent
 * @access Public
 */
router.post('/:agentId/tasks', asyncHandler(async (req, res) => {
  const agentService = getAgentService(req);
  if (!agentService) {
    return res.status(503).json({
      success: false,
      error: 'Agent service not available'
    });
  }

  try {
    const task = req.body;

    if (!task || typeof task !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Task object is required'
      });
    }

    // Add agentId to task if not specified
    if (!task.agentType) {
      task.agentType = 'specific'; // Indicates we want this specific agent
    }

    const result = await agentService.assignTaskToAgent(task);

    if (result === null) {
      return res.status(202).json({
        success: true,
        data: {
          message: 'No suitable agent available, task queued',
          queued: true
        }
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error assigning task to agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign task to agent'
    });
  }
}));

/**
 * @route POST /api/agents/tasks
 * @description Assign a task to the most suitable available agent
 * @access Public
 */
router.post('/tasks', asyncHandler(async (req, res) => {
  const agentService = getAgentService(req);
  if (!agentService) {
    return res.status(503).json({
      success: false,
      error: 'Agent service not available'
    });
  }

  try {
    const task = req.body;

    if (!task || typeof task !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Task object is required'
      });
    }

    const result = await agentService.assignTaskToAgent(task);

    if (result === null) {
      return res.status(202).json({
        success: true,
        data: {
          message: 'No suitable agent available, task queued',
          queued: true
        }
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error assigning task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign task'
    });
  }
}));

/**
 * @route POST /api/agents/broadcast
 * @description Send a broadcast message to all agents
 * @access Public
 */
router.post('/broadcast', asyncHandler(async (req, res) => {
  const agentService = getAgentService(req);
  if (!agentService) {
    return res.status(503).json({
      success: false,
      error: 'Agent service not available'
    });
  }

  try {
    const message = req.body;

    if (!message || typeof message !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Message object is required'
      });
    }

    const agentManager = agentService.getAgentManager();

    // Send broadcast to all agents
    for (const [agentId, agent] of agentManager.agents.entries()) {
      if (agent.communication && agent.communication.kafkaProducer) {
        await agent.communication.broadcastMessage(message);
      }
    }

    res.json({
      success: true,
      data: {
        message: `Broadcast message sent to ${agentManager.agents.size} agents`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error broadcasting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast message'
    });
  }
}));

/**
 * @route POST /api/agents/:agentId/shutdown
 * @description Shutdown a specific agent
 * @access Public
 */
router.post('/:agentId/shutdown', asyncHandler(async (req, res) => {
  const agentService = getAgentService(req);
  if (!agentService) {
    return res.status(503).json({
      success: false,
      error: 'Agent service not available'
    });
  }

  try {
    const agentManager = agentService.getAgentManager();
    const agent = agentManager.agents.get(req.params.agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    await agent.shutdown();

    res.json({
      success: true,
      data: {
        message: `Agent ${agent.id} shutdown successfully`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error shutting down agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to shutdown agent'
    });
  }
}));

/**
 * @route POST /api/agents/shutdown-all
 * @description Shutdown all agents
 * @access Public
 */
router.post('/shutdown-all', asyncHandler(async (req, res) => {
  const agentService = getAgentService(req);
  if (!agentService) {
    return res.status(503).json({
      success: false,
      error: 'Agent service not available'
    });
  }

  try {
    await agentService.getAgentManager().shutdownAll();

    res.json({
      success: true,
      data: {
        message: 'All agents shutdown successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error shutting down all agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to shutdown all agents'
    });
  }
}));

module.exports = router;