// Workflow Automation Service for sokogateOS
// Triggers cross-process automation based on business events
// Processes data from Kafka events to automate business workflows

const { initKafkaConsumer, initKafkaProducer } = require('../config/kafka');
const logger = require('../utils/logger');

// Service state
let consumer = null;
let producer = null;
let workflows = new Map();

// Initialize the Workflow Automation Service
async function startWorkflowAutomationService() {
  try {
    logger.info('Initializing Workflow Automation Service...');

    // Initialize Kafka consumer for processing business events
    consumer = await initKafkaConsumer([
      'order.created',
      'inventory.changed',
      'supplier.risk.updated',
      'customer.feedback.received',
      'document.processed',
      'payment.received',
      'shipment.created',
      'quality.issue.reported'
    ]);

    // Initialize Kafka producer for sending workflow triggers
    producer = await initKafkaProducer();

    logger.info('Workflow Automation Service: Kafka connections established');

    // Set up message handlers for different event types
    setupMessageHandlers();

    // Load predefined workflows
    loadWorkflows();

    logger.info('Workflow Automation Service started successfully');
  } catch (error) {
    logger.error('Workflow Automation Service: Failed to start:', error);
    process.exit(1);
  }
}

// Set up Kafka message handlers
function setupMessageHandlers() {
  consumer.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.value);
      logger.debug(`Workflow Automation: Processing ${message.topic}`, parsedMessage);

      // Route messages to appropriate workflow handlers
      switch (message.topic) {
        case 'order.created':
          handleOrderCreated(parsedMessage);
          break;
        case 'inventory.changed':
          handleInventoryChanged(parsedMessage);
          break;
        case 'supplier.risk.updated':
          handleSupplierRiskUpdated(parsedMessage);
          break;
        case 'customer.feedback.received':
          handleCustomerFeedbackReceived(parsedMessage);
          break;
        case 'document.processed':
          handleDocumentProcessed(parsedMessage);
          break;
        case 'payment.received':
          handlePaymentReceived(parsedMessage);
          break;
        case 'shipment.created':
          handleShipmentCreated(parsedMessage);
          break;
        case 'quality.issue.reported':
          handleQualityIssueReported(parsedMessage);
          break;
        default:
          logger.warn(`Workflow Automation: Unknown topic ${message.topic}`);
      }
    } catch (parseError) {
      logger.error('Workflow Automation: Error parsing message:', parseError);
    }
  });
}

// Handle order created events - trigger order fulfillment workflow
function handleOrderCreated(orderData) {
  logger.info(`Workflow Automation: Processing order ${orderData.orderId}`);

  // Check if we have a workflow for order fulfillment
  const workflow = workflows.get('order-fulfillment');
  if (workflow) {
    executeWorkflowStep(workflow, 'credit-check', orderData);
  } else {
    logger.warn('Workflow Automation: Order fulfillment workflow not defined');
  }
}

// Handle inventory changed events - trigger replenishment workflow
function handleInventoryChanged(inventoryData) {
  logger.info(`Workflow Automation: Processing inventory change for ${inventoryData.productId}`);

  // Check if inventory is below threshold
  if (inventoryData.quantity < inventoryData.reorderPoint) {
    const workflow = workflows.get('inventory-replenishment');
    if (workflow) {
      executeWorkflowStep(workflow, 'check-supplier-availability', inventoryData);
    }
  }
}

// Handle supplier risk updates - trigger supplier evaluation workflow
function handleSupplierRiskUpdated(supplierData) {
  logger.info(`Workflow Automation: Processing supplier risk update for ${supplierData.supplierId}`);

  const workflow = workflows.get('supplier-evaluation');
  if (workflow) {
    executeWorkflowStep(workflow, 'assess-risk', supplierData);
  }
}

// Handle customer feedback received - trigger improvement workflow
function handleCustomerFeedbackReceived(feedbackData) {
  logger.info(`Workflow Automation: Processing customer feedback ${feedbackData.feedbackId}`);

  const workflow = workflows.get('product-improvement');
  if (workflow) {
    executeWorkflowStep(workflow, 'analyze-feedback', feedbackData);
  }
}

// Handle document processed - trigger knowledge extraction workflow
function handleDocumentProcessed(documentData) {
  logger.info(`Workflow Automation: Processing document ${documentData.documentId}`);

  const workflow = workflows.get('knowledge-extraction');
  if (workflow) {
    executeWorkflowStep(workflow, 'extract-entities', documentData);
  }
}

// Handle payment received - trigger order completion workflow
function handlePaymentReceived(paymentData) {
  logger.info(`Workflow Automation: Processing payment ${paymentData.paymentId} for order ${paymentData.orderId}`);

  const workflow = workflows.get('order-completion');
  if (workflow) {
    executeWorkflowStep(workflow, 'verify-payment', paymentData);
  }
}

// Handle shipment created - trigger delivery tracking workflow
function handleShipmentCreated(shipmentData) {
  logger.info(`Workflow Automation: Processing shipment ${shipmentData.shipmentId}`);

  const workflow = workflows.get('delivery-tracking');
  if (workflow) {
    executeWorkflowStep(workflow, 'monitor-delivery', shipmentData);
  }
}

// Handle quality issue reported - trigger corrective action workflow
function handleQualityIssueReported(qualityData) {
  logger.info(`Workflow Automation: Processing quality issue ${qualityData.issueId}`);

  const workflow = workflows.get('quality-correction');
  if (workflow) {
    executeWorkflowStep(workflow, 'investigate-cause', qualityData);
  }
}

// Execute a workflow step and determine next step
function executeWorkflowStep(workflow, stepName, inputData) {
  const stepDefinition = workflow.steps.find(step => step.name === stepName);

  if (!stepDefinition) {
    logger.error(`Workflow Automation: Step ${stepName} not found in workflow ${workflow.id}`);
    return;
  }

  logger.info(`Workflow Automation: Executing step ${stepName} for workflow ${workflow.id}`);

  // Simulate processing time
  setTimeout(() => {
    // In a real implementation, this would perform actual business logic
    const result = {
      step: stepName,
      workflowId: workflow.id,
      input: inputData,
      timestamp: new Date().toISOString(),
      status: 'completed',
      output: generateMockOutput(stepName, inputData)
    };

    // Determine next step based on condition or default flow
    const nextStep = determineNextStep(workflow, stepDefinition, result);

    if (nextStep) {
      // Publish event to trigger next step or another workflow
      publishWorkflowEvent(nextStep.event, result);
    } else {
      logger.info(`Workflow Automation: Workflow ${workflow.id} completed`);
    }
  }, stepDefinition.delay || 1000); // Default 1 second delay
}

// Determine the next step in a workflow
function determineNextStep(workflow, currentStep, result) {
  // If step has a condition, evaluate it
  if (currentStep.condition) {
    // Simple condition evaluation (would be more complex in reality)
    const conditionMet = evaluateCondition(currentStep.condition, result);
    if (conditionMet && currentStep.nextOnTrue) {
      return workflow.steps.find(step => step.name === currentStep.nextOnTrue);
    } else if (!conditionMet && currentStep.nextOnFalse) {
      return workflow.steps.find(step => step.name === currentStep.nextOnFalse);
    }
  }

  // Default to next step in sequence
  const currentIndex = workflow.steps.findIndex(step => step.name === currentStep.name);
  if (currentIndex < workflow.steps.length - 1) {
    return workflow.steps[currentIndex + 1];
  }

  return null; // Workflow complete
}

// Evaluate a condition (simplified)
function evaluateCondition(condition, result) {
  // In a real implementation, this would be a proper expression evaluator
  // For now, we'll simulate with simple checks
  if (condition === 'payment-verified') {
    return result.output && result.output.verified === true;
  } else if (condition === 'inventory-sufficient') {
    return result.output && result.output.available >= result.input.quantity;
  } else if (condition === 'risk-acceptable') {
    return result.output && result.output.riskScore < 0.7;
  }

  // Default to true for demo purposes
  return true;
}

// Publish a workflow event to Kafka
function publishWorkflowEvent(topic, data) {
  const payload = JSON.stringify({
    workflowId: data.workflowId,
    step: data.step,
    timestamp: data.timestamp,
    data: data.output
  });

  producer.send([
    { topic: topic, messages: payload }
  ], (err, result) => {
    if (err) {
      logger.error(`Workflow Automation: Failed to publish to ${topic}:`, err);
    } else {
      logger.debug(`Workflow Automation: Published event to ${topic}`);
    }
  });
}

// Generate mock output for a workflow step
function generateMockOutput(stepName, inputData) {
  switch (stepName) {
    case 'credit-check':
      return {
        verified: true,
        creditScore: Math.floor(Math.random() * 100) + 300,
        riskLevel: 'low'
      };
    case 'check-supplier-availability':
      return {
        available: Math.random() > 0.3,
        quantity: Math.floor(Math.random() * 1000),
        leadTime: Math.floor(Math.random() * 14) + 1
      };
    case 'assess-risk':
      return {
        riskScore: Math.random(),
        recommendation: Math.random() > 0.5 ? 'approve' : 'review'
      };
    case 'analyze-feedback':
      return {
        sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
        actionItems: Math.floor(Math.random() * 5)
      };
    case 'extract-entities':
      return {
        entities: ['product', 'price', 'date', 'quantity'],
        confidence: 0.85
      };
    case 'verify-payment':
      return {
        verified: true,
        amount: inputData.amount,
        currency: inputData.currency
      };
    case 'monitor-delivery':
      return {
        status: ['in-transit', 'out-for-delivery', 'delivered'][Math.floor(Math.random() * 3)],
        eta: new Date(Date.now() + Math.random() * 86400000).toISOString()
      };
    case 'investigate-cause':
      return {
        rootCause: ['supplier', 'transport', 'storage', 'handling'][Math.floor(Math.random() * 4)],
        correctiveAction: 'Investigate and implement preventive measures'
      };
    default:
      return { processed: true };
  }
}

// Load predefined workflows
function loadWorkflows() {
  // Order fulfillment workflow
  workflows.set('order-fulfillment', {
    id: 'order-fulfillment',
    description: 'Process incoming orders from payment to shipment',
    steps: [
      {
        name: 'credit-check',
        delay: 2000,
        nextOnTrue: 'inventory-check',
        nextOnFalse: 'hold-order'
      },
      {
        name: 'inventory-check',
        delay: 1500,
        condition: 'inventory-sufficient',
        nextOnTrue: 'allocate-inventory',
        nextOnFalse: 'backorder-item'
      },
      {
        name: 'allocate-inventory',
        delay: 1000,
        nextOnTrue: 'process-payment'
      },
      {
        name: 'process-payment',
        delay: 2000,
        condition: 'payment-verified',
        nextOnTrue: 'create-shipment',
        nextOnFalse: 'payment-failed'
      },
      {
        name: 'create-shipment',
        delay: 3000,
        nextOnTrue: 'notify-customer'
      }
    ]
  });

  // Inventory replenishment workflow
  workflows.set('inventory-replenishment', {
    id: 'inventory-replenishment',
    description: 'Replenish inventory when stock levels are low',
    steps: [
      {
        name: 'check-supplier-availability',
        delay: 2000,
        nextOnTrue: 'create-purchase-order'
      },
      {
        name: 'create-purchase-order',
        delay: 1500,
        nextOnTrue: 'send-to-supplier'
      }
    ]
  });

  // Supplier evaluation workflow
  workflows.set('supplier-evaluation', {
    id: 'supplier-evaluation',
    description: 'Evaluate suppliers based on risk and performance',
    steps: [
      {
        name: 'assess-risk',
        delay: 2000,
        nextOnTrue: 'update-rating',
        nextOnFalse: 'flag-for-review'
      }
    ]
  });

  // Product improvement workflow
  workflows.set('product-improvement', {
    id: 'product-improvement',
    description: 'Process customer feedback for product improvements',
    steps: [
      {
        name: 'analyze-feedback',
        delay: 2500,
        nextOnTrue: 'prioritize-improvements'
      }
    ]
  });

  // Knowledge extraction workflow
  workflows.set('knowledge-extraction', {
    id: 'knowledge-extraction',
    description: 'Extract knowledge from processed documents',
    steps: [
      {
        name: 'extract-entities',
        delay: 3000,
        nextOnTrue: 'categorize-content'
      }
    ]
  });

  // Order completion workflow
  workflows.set('order-completion', {
    id: 'order-completion',
    description: 'Complete order processing after payment',
    steps: [
      {
        name: 'verify-payment',
        delay: 1500,
        nextOnTrue: 'update-order-status'
      }
    ]
  });

  // Delivery tracking workflow
  workflows.set('delivery-tracking', {
    id: 'delivery-tracking',
    description: 'Track shipments and provide delivery updates',
    steps: [
      {
        name: 'monitor-delivery',
        delay: 5000, // Check every 5 seconds
        nextOnTrue: 'monitor-delivery' // Continue monitoring until delivered
      }
    ]
  });

  // Quality correction workflow
  workflows.set('quality-correction', {
    id: 'quality-correction',
    description: 'Address quality issues and implement corrective actions',
    steps: [
      {
        name: 'investigate-cause',
        delay: 4000,
        nextOnTrue: 'implement-fix'
      }
    ]
  });
}

// Graceful shutdown
function shutdown() {
  if (consumer) {
    consumer.close(() => {
      logger.info('Workflow Automation Service: Kafka consumer closed');
    });
  }
  if (producer) {
    producer.close(() => {
      logger.info('Workflow Automation Service: Kafka producer closed');
    });
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { startWorkflowAutomationService };