// Logistics Controller for sokogateOS
// Handles API endpoints for logistics operations with real database queries

const Logistics = require('../../../models/logistics/logistics');
const qme = require('../../../qme/wrapper');
const logger = require('../../../utils/logger');

// Get shipment by ID
async function getShipment(req, res) {
  try {
    const { shipmentId } = req.params;
    logger.info(`Logistics Controller: Fetching shipment ${shipmentId}`);

    const shipment = await Logistics.findOne({
      $or: [
        { shipmentId },
        { _id: shipmentId.match(/^[0-9a-fA-F]{24}$/) ? shipmentId : null }
      ].filter(Boolean)
    }).populate('companyId', 'name businessType');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    if (req.user.role !== 'super_admin' && shipment.companyId._id.toString() !== req.user.companyId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const delayRisk = shipment.calculateDelayRisk();

    res.status(200).json({
      success: true,
      data: {
        ...shipment.toObject(),
        delayRisk
      }
    });
  } catch (error) {
    logger.error('Logistics Controller: Error fetching shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Create new shipment
async function createShipment(req, res) {
  try {
    const {
      orderId, productId, shipmentDetails, priority
    } = req.body;

    if (!orderId || !productId) {
      return res.status(400).json({
        success: false,
        error: 'orderId and productId are required'
      });
    }

    const shipment = new Logistics({
      companyId: req.user.companyId,
      orderId,
      productId,
      shipmentId: `SHIP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      shipmentDetails: shipmentDetails || {},
      status: 'processing',
      priority: priority || 'medium',
      timestamps: { created: new Date(), updated: new Date() }
    });

    await shipment.save();
    logger.info(`Logistics Controller: Created shipment ${shipment.shipmentId}`);

    // Trigger QMe route optimization in background
    if (shipmentDetails?.origin && shipmentDetails?.destination) {
      qme.runTask('logistics-route', {
        shipmentId: shipment.shipmentId,
        origin: shipmentDetails.origin.city || shipmentDetails.origin.address,
        destination: shipmentDetails.destination.city || shipmentDetails.destination.address,
        priority: priority || 'balanced'
      }).catch(err => {
        logger.warn('Logistics Controller: QMe route task trigger failed:', err.message);
      });
    }

    res.status(201).json({
      success: true,
      data: shipment
    });
  } catch (error) {
    logger.error('Logistics Controller: Error creating shipment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Get shipments for a company
async function getCompanyShipments(req, res) {
  try {
    const { companyId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;

    if (req.user.role !== 'super_admin' && companyId !== req.user.companyId?.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const query = { companyId: new (require('mongoose').Schema.Types.ObjectId)(companyId) };
    if (status) query.status = status;

    const total = await Logistics.countDocuments(query);
    const shipments = await Logistics.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: shipments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Logistics Controller: Error fetching company shipments:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Update shipment status
async function updateShipmentStatus(req, res) {
  try {
    const { shipmentId } = req.params;
    const { status, location, trackingNumber } = req.body;

    const validStatuses = ['processing', 'ready_for_pickup', 'picked_up', 'in_transit', 'at_customs', 'cleared_customs', 'out_for_delivery', 'delivered', 'failed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const update = {
      status,
      updatedAt: new Date()
    };

    const timestampMap = {
      'picked_up': 'timestamps.pickedUp',
      'in_transit': 'timestamps.inTransit',
      'delivered': 'timestamps.delivered'
    };
    if (timestampMap[status]) {
      update[timestampMap[status]] = new Date();
    }

    if (trackingNumber) update.trackingNumber = trackingNumber;
    if (location) update.currentLocation = location;

    const shipment = await Logistics.findOne({
      shipmentId,
      ...(req.user.role !== 'super_admin' ? { companyId: req.user.companyId } : {})
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }

    shipment.status = status;
    shipment.timestamps.updated = new Date();
    if (timestampMap[status]) {
      shipment.timestamps[timestampMap[status].split('.')[1]] = new Date();
    }
    if (trackingNumber) shipment.trackingNumber = trackingNumber;
    if (location) shipment.currentLocation = location;

    shipment.events.push({
      timestamp: new Date(),
      type: 'status_change',
      description: `Shipment status updated to ${status}`,
      location: location || {},
      carrierUpdate: false
    });

    await shipment.save();

    res.status(200).json({
      success: true,
      data: shipment,
      message: `Shipment status updated to ${status}`
    });
  } catch (error) {
    logger.error('Logistics Controller: Error updating shipment status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Track shipment
async function trackShipment(req, res) {
  try {
    const { shipmentId } = req.params;
    logger.info(`Logistics Controller: Tracking shipment ${shipmentId}`);

    const shipment = await Logistics.findOne({
      $or: [
        { shipmentId },
        { trackingNumber: shipmentId },
        { _id: shipmentId.match(/^[0-9a-fA-F]{24}$/) ? shipmentId : null }
      ].filter(Boolean),
      ...(req.user.role !== 'super_admin' ? { companyId: req.user.companyId } : {})
    });

    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: 'Shipment not found. Please check the tracking number.'
      });
    }

    const delayRisk = shipment.calculateDelayRisk();

    // Determine risk level
    let riskLevel = 'low';
    if (delayRisk > 0.7) riskLevel = 'high';
    else if (delayRisk > 0.4) riskLevel = 'medium';

    res.status(200).json({
      success: true,
      data: {
        shipmentId: shipment.shipmentId,
        trackingNumber: shipment.trackingNumber,
        status: shipment.status,
        currentLocation: shipment.currentLocation || shipment.shipmentDetails?.destination,
        estimatedDelivery: shipment.estimatedDelivery,
        events: shipment.events.slice(-10), // Last 10 events
        exceptions: shipment.exceptions,
        delayRisk: {
          score: delayRisk,
          level: riskLevel
        },
        timestamps: shipment.timestamps,
        performance: shipment.performance
      }
    });
  } catch (error) {
    logger.error('Logistics Controller: Error tracking shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

module.exports = {
  getShipment,
  createShipment,
  getCompanyShipments,
  updateShipmentStatus,
  trackShipment
};