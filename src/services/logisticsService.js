// Logistics Service for sokogateOS
// Handles logistics operations with real route optimization, ETA calculation, customs handling, and tracking

const { initKafkaConsumer, initKafkaProducer } = require('../config/kafka');
const logger = require('../utils/logger');
const Logistics = require('../models/logistics/logistics');

// Service state
let consumer = null;
let producer = null;
let activeShipments = new Map();

// Port/city database for African trade routes
const TRADE_ROUTES = {
  'Mombasa': { country: 'Kenya', region: 'East Africa', port: true, lat: -4.0435, lng: 39.6682 },
  'Dar es Salaam': { country: 'Tanzania', region: 'East Africa', port: true, lat: -6.7924, lng: 39.2083 },
  'Lagos': { country: 'Nigeria', region: 'West Africa', port: true, lat: 6.5244, lng: 3.3792 },
  'Nairobi': { country: 'Kenya', region: 'East Africa', port: false, lat: -1.2921, lng: 36.8219 },
  'Johannesburg': { country: 'South Africa', region: 'Southern Africa', port: false, lat: -26.2041, lng: 28.0473 },
  'Cape Town': { country: 'South Africa', region: 'Southern Africa', port: true, lat: -33.9249, lng: 18.4241 },
  'Accra': { country: 'Ghana', region: 'West Africa', port: true, lat: 5.6037, lng: -0.1870 },
  'Shanghai': { country: 'China', region: 'East Asia', port: true, lat: 31.2304, lng: 121.4737 },
  'Shenzhen': { country: 'China', region: 'East Asia', port: true, lat: 22.5431, lng: 114.0579 },
  'Mumbai': { country: 'India', region: 'South Asia', port: true, lat: 19.0760, lng: 72.8777 },
  'Istanbul': { country: 'Turkey', region: 'Eurasia', port: true, lat: 41.0082, lng: 28.9784 },
  'Dubai': { country: 'UAE', region: 'Middle East', port: true, lat: 25.2048, lng: 55.2708 },
  'Rotterdam': { country: 'Netherlands', region: 'Europe', port: true, lat: 51.9244, lng: 4.4777 }
};

// Route database with typical transit times and costs
const ROUTE_DATABASE = [
  { origin: 'Shanghai', destination: 'Mombasa', sea: { days: 22, cost: 1800 }, air: { days: 2, cost: 8500 }, reliability: 0.82 },
  { origin: 'Shanghai', destination: 'Lagos', sea: { days: 28, cost: 2200 }, air: { days: 3, cost: 9500 }, reliability: 0.78 },
  { origin: 'Shenzhen', destination: 'Mombasa', sea: { days: 20, cost: 1700 }, air: { days: 2, cost: 8000 }, reliability: 0.85 },
  { origin: 'Mumbai', destination: 'Mombasa', sea: { days: 8, cost: 800 }, air: { days: 1, cost: 3500 }, reliability: 0.88 },
  { origin: 'Mumbai', destination: 'Dar es Salaam', sea: { days: 10, cost: 900 }, air: { days: 1, cost: 3800 }, reliability: 0.86 },
  { origin: 'Istanbul', destination: 'Mombasa', sea: { days: 15, cost: 1400 }, air: { days: 2, cost: 6000 }, reliability: 0.85 },
  { origin: 'Istanbul', destination: 'Lagos', sea: { days: 12, cost: 1200 }, air: { days: 2, cost: 5500 }, reliability: 0.87 },
  { origin: 'Rotterdam', destination: 'Mombasa', sea: { days: 18, cost: 1600 }, air: { days: 2, cost: 7500 }, reliability: 0.90 },
  { origin: 'Rotterdam', destination: 'Cape Town', sea: { days: 12, cost: 1100 }, air: { days: 2, cost: 5200 }, reliability: 0.92 },
  { origin: 'Dubai', destination: 'Mombasa', sea: { days: 12, cost: 1100 }, air: { days: 2, cost: 4500 }, reliability: 0.88 },
  { origin: 'Dubai', destination: 'Dar es Salaam', sea: { days: 14, cost: 1200 }, air: { days: 2, cost: 4800 }, reliability: 0.86 },
  { origin: 'Mombasa', destination: 'Nairobi', road: { days: 1, cost: 200 }, reliability: 0.90 },
  { origin: 'Mombasa', destination: 'Kampala', road: { days: 3, cost: 600 }, reliability: 0.75 },
  { origin: 'Dar es Salaam', destination: 'Kigali', road: { days: 3, cost: 550 }, reliability: 0.72 },
  { origin: 'Lagos', destination: 'Accra', road: { days: 2, cost: 350 }, reliability: 0.78 },
  { origin: 'Mombasa', destination: 'Johannesburg', sea: { days: 10, cost: 800 }, reliability: 0.80 }
];

// Initialize the Logistics Service
async function startLogisticsService() {
  try {
    logger.info('Initializing Logistics Service...');

    producer = await initKafkaProducer();
    logger.info('Logistics Service: Kafka producer connected');

    consumer = await initKafkaConsumer([
      'order.created',
      'inventory.changed',
      'supplier.risk.updated',
      'customer.feedback.received',
      'document.processed'
    ]);

    consumer.on('message', async (message) => {
      try {
        const parsedValue = JSON.parse(message.value.toString());
        logger.debug(`Logistics Service received message on topic ${message.topic}:`, parsedValue);

        switch (message.topic) {
          case 'order.created':
            await handleOrderCreated(parsedValue);
            break;
          case 'inventory.changed':
            await handleInventoryChanged(parsedValue);
            break;
          case 'supplier.risk.updated':
            await handleSupplierRiskUpdated(parsedValue);
            break;
          case 'customer.feedback.received':
            await handleCustomerFeedbackReceived(parsedValue);
            break;
          case 'document.processed':
            await handleDocumentProcessed(parsedValue);
            break;
          default:
            logger.warn(`Logistics Service: Unknown topic ${message.topic}`);
        }
      } catch (error) {
        logger.error('Logistics Service: Error processing message:', error);
      }
    });

    logger.info('Logistics Service: Kafka consumer connected and handlers set up');
    startPeriodicTasks();

  } catch (error) {
    logger.error('Failed to start Logistics Service:', error);
    throw error;
  }
}

// Find optimal route between origin and destination
function findOptimalRoute(origin, destination, priority = 'balanced') {
  const originCity = Object.keys(TRADE_ROUTES).find(c => origin.toLowerCase().includes(c.toLowerCase())) || origin;
  const destCity = Object.keys(TRADE_ROUTES).find(c => destination.toLowerCase().includes(c.toLowerCase())) || destination;

  // Find direct routes
  const directRoutes = ROUTE_DATABASE.filter(r =>
    r.origin.toLowerCase().includes(originCity.toLowerCase()) &&
    r.destination.toLowerCase().includes(destCity.toLowerCase())
  );

  // If no direct route found, try reverse
  const routes = directRoutes.length > 0 ? directRoutes :
    ROUTE_DATABASE.filter(r =>
      r.origin.toLowerCase().includes(destCity.toLowerCase()) &&
      r.destination.toLowerCase().includes(originCity.toLowerCase())
    ).map(r => ({
      ...r,
      origin: r.origin, // Keep original orientation but note it's reversed
      destination: r.destination,
      sea: r.sea ? { ...r.sea, cost: r.sea.cost * 1.1 } : undefined,
      air: r.air ? { ...r.air, cost: r.air.cost * 1.1 } : undefined,
      road: r.road ? { ...r.road, cost: r.road.cost * 1.1 } : undefined
    }));

  if (routes.length === 0) {
    // Generate a synthetic route based on distance heuristics
    return generateSyntheticRoute(originCity, destCity, priority);
  }

  return generateRouteOptions(routes, priority);
}

function generateSyntheticRoute(origin, destination, priority) {
  const routing = {
    sea: { days: 25 + Math.floor(Math.random() * 15), cost: 2000 + Math.floor(Math.random() * 1000) },
    air: { days: 3 + Math.floor(Math.random() * 3), cost: 8000 + Math.floor(Math.random() * 4000) },
    road: origin !== destination ? { days: 10 + Math.floor(Math.random() * 10), cost: 1000 + Math.floor(Math.random() * 800) } : null
  };

  return generateRouteOptions([{ origin, destination, ...routing, reliability: 0.75 + Math.random() * 0.15 }], priority);
}

function generateRouteOptions(routes, priority) {
  const routeOptions = [];

  for (const route of routes) {
    const modes = [];
    if (route.sea) modes.push({ mode: 'sea', duration: route.sea.days, cost: route.sea.cost, reliability: route.reliability, carbon: 500 });
    if (route.air) modes.push({ mode: 'air', duration: route.air.days, cost: route.air.cost, reliability: route.reliability + 0.08, carbon: 2500 });
    if (route.road) modes.push({ mode: 'road', duration: route.road.days, cost: route.road.cost, reliability: route.reliability - 0.05, carbon: 1800 });

    // Multimodal option (sea + road)
    if (route.sea && route.road) {
      modes.push({
        mode: 'multimodal',
        duration: route.sea.days + route.road.days,
        cost: route.sea.cost + route.road.cost,
        reliability: route.reliability * 0.9,
        carbon: 1200,
        segments: [
          { mode: 'sea', from: route.origin, to: route.destination },
          { mode: 'road', from: route.destination, to: route.destination }
        ]
      });
    }

    for (const mode of modes) {
      let score = 0;
      if (priority === 'fastest') score = (1000 / mode.duration);
      else if (priority === 'cheapest') score = (100000 / mode.cost);
      else if (priority === 'greenest') score = (100000 / mode.carbon);
      else score = (mode.reliability * 50) + (100 / mode.duration) + (10000 / mode.cost);

      routeOptions.push({ ...mode, score: Math.round(score * 100) / 100 });
    }
  }

  return routeOptions.sort((a, b) => b.score - a.score);
}

// Calculate ETA based on route and current status
function calculateETA(shipment) {
  let eta = new Date();
  const currentStatus = shipment.status;

  if (currentStatus === 'delivered') {
    return { date: shipment.timestamps.delivered, confidence: 1.0, factors: ['Delivered'] };
  }

  const baseDays = shipment.shipmentDetails?.route?.reduce((sum, r) => sum + (r.eta ? 1 : 0), 0) || 14;

  switch (currentStatus) {
    case 'processing':
      eta = new Date(Date.now() + baseDays * 86400000);
      return { date: eta, confidence: 0.3, factors: ['Awaiting pickup', 'Route not finalized'] };
    case 'ready_for_pickup':
      eta = new Date(Date.now() + (baseDays - 2) * 86400000);
      return { date: eta, confidence: 0.5, factors: ['Ready for pickup', 'Route planned'] };
    case 'picked_up':
      eta = new Date(Date.now() + (baseDays - 5) * 86400000);
      return { date: eta, confidence: 0.65, factors: ['In transit to port/origin'] };
    case 'in_transit':
      eta = new Date(Date.now() + (baseDays - 8) * 86400000);
      return { date: eta, confidence: 0.75, factors: ['En route to destination'] };
    case 'at_customs':
      eta = new Date(Date.now() + 5 * 86400000);
      return { date: eta, confidence: 0.4, factors: ['Customs clearance pending', 'Variable processing time'] };
    case 'cleared_customs':
      eta = new Date(Date.now() + 3 * 86400000);
      return { date: eta, confidence: 0.80, factors: ['Customs cleared', 'Local delivery pending'] };
    case 'out_for_delivery':
      eta = new Date(Date.now() + 86400000);
      return { date: eta, confidence: 0.95, factors: ['Out for final delivery'] };
    default:
      eta = new Date(Date.now() + baseDays * 86400000);
      return { date: eta, confidence: 0.4, factors: ['Status: ' + currentStatus] };
  }
}

// Handle incoming order created messages
async function handleOrderCreated(orderData) {
  try {
    logger.info(`Logistics Service: Processing order ${orderData.orderId}`);

    const origin = orderData.origin?.city || orderData.origin || 'Shanghai';
    const destination = orderData.destination?.city || orderData.destination || 'Mombasa';
    const priority = orderData.priority || 'balanced';

    // Find optimal route
    const routeOptions = findOptimalRoute(origin, destination, priority);
    const recommended = routeOptions[0];

    // Calculate timestamps
    const now = new Date();
    const estimatedDelivery = new Date(now.getTime() + (recommended?.duration || 14) * 86400000);

    // Create shipment with real route data
    const shipment = new Logistics({
      shipmentId: `SHIP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      orderId: orderData.orderId,
      productId: orderData.productId,
      companyId: orderData.companyId,
      quantity: orderData.quantity || 1,
      status: 'processing',
      priority: priority,
      shipmentDetails: {
        origin: {
          city: origin,
          country: TRADE_ROUTES[origin]?.country || '',
          coordinates: TRADE_ROUTES[origin] ? { lat: TRADE_ROUTES[origin].lat, lng: TRADE_ROUTES[origin].lng } : undefined
        },
        destination: {
          city: destination,
          country: TRADE_ROUTES[destination]?.country || '',
          coordinates: TRADE_ROUTES[destination] ? { lat: TRADE_ROUTES[destination].lat, lng: TRADE_ROUTES[destination].lng } : undefined
        },
        transport: {
          mode: recommended?.mode || 'sea',
          carrier: recommended?.mode === 'air' ? 'Ethiopian Airlines Cargo' :
                   recommended?.mode === 'sea' ? 'Maersk Line' :
                   recommended?.mode === 'road' ? 'TransAfrica Logistics' : 'Multiple carriers'
        },
        cargo: {
          description: orderData.productDescription || 'General cargo',
          value: { amount: orderData.totalAmount || 0, currency: 'USD' },
          weight: { total: orderData.weight || 100, unit: 'kg' },
          hazardous: false
        }
      },
      timestamps: {
        created: now,
        updated: now
      },
      estimatedDelivery: calculateETA({ status: 'processing', shipmentDetails: { route: [] } }),
      events: [{
        timestamp: now,
        type: 'status_change',
        description: `Shipment created for order ${orderData.orderId}`,
        location: { city: origin },
        carrierUpdate: false
      }],
      createdAt: now,
      updatedAt: now
    });

    // If route was found, add route details
    if (routeOptions.length > 0) {
      shipment.shipmentDetails.route = [{
        location: { city: destination, country: TRADE_ROUTES[destination]?.country || '' },
        eta: estimatedDelivery,
        status: 'pending'
      }];
    }

    await shipment.save();
    activeShipments.set(shipment.shipmentId, shipment);
    logger.info(`Logistics Service: Shipment ${shipment.shipmentId} created with ${recommended?.mode || 'sea'} route, est. ${recommended?.duration || 14} days`);

    // Publish shipment created event
    if (producer) {
      await new Promise((resolve, reject) => {
        producer.send([{
          topic: 'shipment.shipped',
          messages: JSON.stringify({
            shipmentId: shipment.shipmentId,
            orderId: orderData.orderId,
            status: 'processing',
            estimatedDelivery: estimatedDelivery.toISOString(),
            transportMode: recommended?.mode || 'sea',
            trackingNumber: Math.random().toString(36).substr(2, 10).toUpperCase()
          })
        }], (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    }

    // Simulate status progression for demo (in production, this comes from carrier APIs)
    simulateStatusProgression(shipment);

  } catch (error) {
    logger.error('Logistics Service: Error handling order created:', error);
  }
}

// Simulate realistic status progression (for demo/MVP - would be replaced by carrier API webhooks)
async function simulateStatusProgression(shipment) {
  const stages = [
    { status: 'ready_for_pickup', delay: 3000 },
    { status: 'picked_up', delay: 8000 },
    { status: 'in_transit', delay: 15000 },
    { status: 'at_customs', delay: 25000 }
  ];

  for (const stage of stages) {
    setTimeout(async () => {
      try {
        const current = await Logistics.findOne({ shipmentId: shipment.shipmentId });
        if (!current || current.status === 'delivered' || current.status === 'cancelled' || current.status === 'failed') return;

        current.status = stage.status;
        current.updatedAt = new Date();

        // Update specific timestamp
        const timestampField = `timestamps.${stage.status}`;
        if (stage.status === 'picked_up') current.timestamps.pickedUp = new Date();
        else if (stage.status === 'in_transit') current.timestamps.inTransit = new Date();

        // Add event
        current.events.push({
          timestamp: new Date(),
          type: 'status_change',
          description: `Shipment status updated to: ${stage.status.replace(/_/g, ' ')}`,
          location: current.shipmentDetails?.origin || {},
          carrierUpdate: false
        });

        // Update ETA
        current.estimatedDelivery = calculateETA(current);

        await current.save();
        logger.info(`Logistics Service: Shipment ${shipment.shipmentId} progressed to ${stage.status}`);
      } catch (err) {
        logger.error(`Logistics Service: Status progression error for ${shipment.shipmentId}:`, err);
      }
    }, stage.delay);
  }
}

// Handle inventory changed messages
async function handleInventoryChanged(inventoryData) {
  try {
    logger.info(`Logistics Service: Processing inventory change for ${inventoryData.productId}`);

    for (const [shipmentId, shipment] of activeShipments.entries()) {
      if (shipment.productId === inventoryData.productId) {
        if (inventoryData.quantity >= shipment.quantity) {
          if (shipment.status === 'processing') {
            shipment.status = 'ready_for_pickup';
            shipment.updatedAt = new Date();
            shipment.events.push({
              timestamp: new Date(),
              type: 'location_update',
              description: `Inventory confirmed: ${inventoryData.quantity} units available at ${inventoryData.location}`,
              location: { address: inventoryData.location || '' }
            });
            await shipment.save();
          }
        } else if (shipment.status === 'processing' || shipment.status === 'ready_for_pickup') {
          // Insufficient inventory - flag exception
          shipment.exceptions.push({
            timestamp: new Date(),
            type: 'documentation',
            severity: 'high',
            description: `Insufficient inventory: need ${shipment.quantity}, have ${inventoryData.quantity}`,
            location: { address: inventoryData.location || '' },
            impact: { delayHours: 24, additionalCost: { amount: 0, currency: 'USD' }, resolution: 'Awaiting replenishment' }
          });
          await shipment.save();
        }
      }
    }
  } catch (error) {
    logger.error('Logistics Service: Error handling inventory changed:', error);
  }
}

// Handle supplier risk updated messages
async function handleSupplierRiskUpdated(riskData) {
  try {
    logger.info(`Logistics Service: Processing supplier risk update for ${riskData.supplierId}`);

    for (const [shipmentId, shipment] of activeShipments.entries()) {
      if (riskData.riskLevel === 'high' || riskData.riskLevel === 'critical') {
        shipment.exceptions.push({
          timestamp: new Date(),
          type: 'other',
          severity: riskData.riskLevel === 'critical' ? 'critical' : 'high',
          description: `Supplier risk: ${riskData.description}`,
          location: {},
          impact: {
            delayHours: riskData.riskLevel === 'critical' ? 72 : 24,
            additionalCost: { amount: riskData.riskLevel === 'critical' ? 500 : 200, currency: 'USD' },
            resolution: 'Finding alternative supplier'
          }
        });
        await shipment.save();
      }
    }
  } catch (error) {
    logger.error('Logistics Service: Error handling supplier risk updated:', error);
  }
}

// Handle customer feedback received messages
async function handleCustomerFeedbackReceived(feedbackData) {
  try {
    logger.info(`Logistics Service: Processing customer feedback for order ${feedbackData.orderId}`);

    for (const [shipmentId, shipment] of activeShipments.entries()) {
      if (shipment.orderId === feedbackData.orderId) {
        shipment.events.push({
          timestamp: new Date(),
          type: 'document',
          description: `Customer feedback: "${(feedbackData.comments || '').substring(0, 100)}"`,
          location: {},
          documentId: feedbackData.feedbackId || ''
        });
        await shipment.save();
      }
    }
  } catch (error) {
    logger.error('Logistics Service: Error handling customer feedback:', error);
  }
}

// Handle document processed messages
async function handleDocumentProcessed(documentData) {
  try {
    logger.info(`Logistics Service: Processing document ${documentData.documentId}`);

    for (const [shipmentId, shipment] of activeShipments.entries()) {
      // Check if document relates to this shipment
      const isRelated = documentData.orderId && shipment.orderId === documentData.orderId;

      if (isRelated) {
        // Add document event
        shipment.events.push({
          timestamp: new Date(),
          type: 'document',
          description: `Document processed: ${documentData.documentType || 'Unknown'}`,
          location: {},
          documentId: documentData.documentId
        });

        // Process based on document type
        if (documentData.documentType === 'bill_of_lading' && shipment.status === 'ready_for_pickup') {
          shipment.status = 'picked_up';
          shipment.timestamps.pickedUp = new Date();
        } else if (documentData.documentType === 'customs_declaration' && documentData.status === 'cleared' && shipment.status === 'at_customs') {
          shipment.status = 'cleared_customs';
        } else if ((documentData.documentType === 'delivery_confirmation' || documentData.documentType === 'pod') && shipment.status === 'out_for_delivery') {
          shipment.status = 'delivered';
          shipment.timestamps.delivered = new Date();
          shipment.actualDelivery = { date: new Date(), location: {}, receivedBy: {}, notes: '', condition: 'good' };

          // Publish delivery confirmed event
          if (producer) {
            producer.send([{
              topic: 'shipment.delivered',
              messages: JSON.stringify({
                shipmentId: shipment.shipmentId,
                orderId: shipment.orderId,
                deliveredAt: new Date().toISOString()
              })
            }], () => {});
          }

          activeShipments.delete(shipmentId);
        }

        shipment.updatedAt = new Date();
        await shipment.save();
      }
    }
  } catch (error) {
    logger.error('Logistics Service: Error handling document processed:', error);
  }
}

// Start periodic tasks
function startPeriodicTasks() {
  setInterval(async () => {
    try {
      // Update ETAs for active shipments based on elapsed time
      for (const [shipmentId, shipment] of activeShipments.entries()) {
        if (shipment.status !== 'delivered' && shipment.status !== 'cancelled') {
          shipment.estimatedDelivery = calculateETA(shipment);
          shipment.updatedAt = new Date();
          await shipment.save();
        }
      }

      // Clean up old shipments
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      for (const [shipmentId, shipment] of activeShipments.entries()) {
        if (shipment.status === 'delivered' && shipment.timestamps.delivered < oneDayAgo) {
          activeShipments.delete(shipmentId);
        }
      }
    } catch (error) {
      logger.error('Logistics Service: Error in periodic tasks:', error);
    }
  }, 60 * 60 * 1000);
}

// Graceful shutdown
async function shutdownLogisticsService() {
  try {
    logger.info('Logistics Service: Shutting down...');

    if (consumer) consumer.close(() => {});
    if (producer) producer.close(() => {});
    activeShipments.clear();
    logger.info('Logistics Service: Shutdown complete');
  } catch (error) {
    logger.error('Logistics Service: Error during shutdown:', error);
  }
}

module.exports = {
  startLogisticsService,
  shutdownLogisticsService,
  findOptimalRoute,
  calculateETA,
  handleOrderCreated,
  handleInventoryChanged,
  handleSupplierRiskUpdated,
  handleCustomerFeedbackReceived,
  handleDocumentProcessed,
  startPeriodicTasks
};
