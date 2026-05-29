const mongoose = require('mongoose');
const { Schema } = mongoose;

// Logistics service model - Handles shipment tracking and logistics operations
const logisticsSchema = new Schema({
  // Reference to the company that owns this shipment
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Reference to the order that triggered this shipment
  orderId: {
    type: String,
    required: true,
    index: true
  },

  // Reference to the product being shipped
  productId: {
    type: String,
    required: true,
    index: true
  },

  // Shipment tracking details
  shipmentId: {
    type: String,
    unique: true,
    required: true
  },

  // Tracking number from carrier
  trackingNumber: {
    type: String,
    index: true
  },

  // Shipment details
  shipmentDetails: {
    origin: {
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    destination: {
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    // Route information
    route: [{
      location: {
        address: String,
        city: String,
        state: String,
        country: String
      },
      eta: Date,
      status: { type: String, enum: ['pending', 'in_transit', 'completed', 'delayed'] },
      actualArrival: Date
    }],
    // Transport details
    transport: {
      mode: { type: String, enum: ['road', 'rail', 'air', 'sea', 'multimodal'] },
      carrier: String,
      carrierScac: String, // Standard Carrier Alpha Code
      vehicleNumber: String,
      containerNumber: String,
      sealNumber: String
    },
    // Package details
    packages: [{
      packageId: String,
      type: String, // e.g., 'pallet', 'box', 'crate', 'drum'
      quantity: Number,
      weight: {
        value: Number,
        unit: { type: String, enum: ['kg', 'lb', 'tons'] }
      },
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: { type: String, enum: ['cm', 'in', 'm', 'ft'] }
      }
    }],
    // Cargo details
    cargo: {
      description: String,
      hsCode: String, // Harmonized System code
      value: {
        amount: Number,
        currency: { type: String, default: 'USD' }
      },
      weight: {
        total: Number,
        unit: { type: String, enum: ['kg', 'lb', 'tons'] }
      },
      volume: {
        value: Number,
        unit: { type: String, enum: ['cm3', 'm3', 'ft3'] }
      },
      hazardous: Boolean,
      hazardousClass: String, // For hazardous materials
      specialHandling: [String] // e.g., ['refrigerated', 'fragile', 'this_side_up']
    }
  },

  // Shipment status and tracking
  status: {
    type: String,
    enum: ['processing', 'ready_for_pickup', 'picked_up', 'in_transit', 'at_customs', 'cleared_customs', 'out_for_delivery', 'delivered', 'failed', 'cancelled'],
    default: 'processing'
  },

  // Key timestamps
  timestamps: {
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    pickedUp: Date,
    inTransit: Date,
    atOriginFacility: Date,
    atDestinationFacility: Date,
    outForDelivery: Date,
    delivered: Date,
    exception: Date
  },

  // Current location and ETA
  currentLocation: {
    address: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    lastUpdated: Date
  },

  estimatedDelivery: {
    date: Date,
    confidence: { type: Number, min: 0, max: 1 }, // AI confidence in ETA
    factors: [String] // Factors affecting delivery time
  },

  // Actual delivery confirmation
  actualDelivery: {
    date: Date,
    location: {
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    receivedBy: {
      name: String,
      title: String,
      signature: String, // Base64 encoded signature
      photo: String // Base64 encoded photo
    },
    notes: String,
    condition: { type: String, enum: ['good', 'damaged', 'shortage', 'overage'] }
  },

  // Events and milestones
  events: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['status_change', 'location_update', 'exception', 'document', 'customs'] },
    description: String,
    location: {
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    carrierUpdate: Boolean, // Whether this came from carrier tracking
    documentId: String // Reference to any associated document
  }],

  // Exceptions and issues
  exceptions: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['weather', 'mechanical', 'traffic', 'customs', 'documentation', 'labor_strike', 'accident', 'theft', 'other'] },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    description: String,
    location: {
      address: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    impact: {
      delayHours: Number,
      additionalCost: {
        amount: Number,
        currency: { type: String, default: 'USD' }
      },
      resolution: String
    },
    resolution: {
      actionTaken: String,
      resolvedAt: Date,
      resolvedBy: String
    }
  }],

  // Documentation and paperwork
  documents: [{
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document'
    },
    type: { type: String, enum: ['commercial_invoice', 'packing_list', 'bill_of_lading', 'certificate_of_origin', 'insurance_certificate', 'customs_declaration'] },
    title: String,
    issuedDate: Date,
    expiryDate: Date,
    issuingAuthority: String,
    documentNumber: String,
    status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected', 'expired'] },
    url: String, // URL to stored document
    metadata: Schema.Types.Mixed
  }],

  // Cost and pricing
  costs: {
    baseRate: {
      amount: Number,
      currency: { type: String, default: 'USD' }
    },
    fuelSurcharge: {
      amount: Number,
      currency: { type: String, default: 'USD' }
    },
    accessorials: [{
      type: { type: String, enum: ['liftgate', 'inside_delivery', 'residential', 'appointments', 'storage', 'detention'] },
      amount: Number,
      currency: { type: String, default: 'USD' },
      description: String
    }],
    taxesAndDuties: [{
      type: { type: String, enum: ['import_duty', 'export_duty', 'vat', 'gst', 'customs_fee'] },
      amount: Number,
      currency: { type: String, default: 'USD' },
      description: String
    }],
    totalCost: {
      amount: Number,
      currency: { type: String, default: 'USD' }
    },
    currency: { type: String, default: 'USD' },
    incoterms: { type: String, enum: ['EXW', 'FOB', 'CIF', 'DDP', 'DAP'] },
    paymentTerms: { type: String, enum: ['Net30', 'Net60', 'LC', 'Advance', 'Partial', 'COD'] }
  },

  // Performance and SLAs
  performance: {
    onTimePickup: Boolean,
    onTimeDelivery: Boolean,
    transitTimeHours: Number,
    promisedDelivery: Date,
    actualDelivery: Date,
    delayHours: Number,
    delayReason: String,
    carrierPerformanceScore: { type: Number, min: 0, max: 5 }, // Out of 5
    serviceLevel: { type: String, enum: ['standard', 'expedited', 'express', 'same_day', 'next_day'] }
  },

  // Customer notifications and communication
  notifications: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['email', 'sms', 'whatsapp', 'push', 'webhook'] },
    recipient: String,
    template: String, // Notification template used
    status: { type: String, enum: ['sent', 'delivered', 'failed', 'read'] },
    messageId: String, // External message ID
    content: Schema.Types.Mixed
  }],

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  expiresAt: Date, // When this shipment record expires
  isActive: { type: Boolean, default: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  source: { // How this shipment originated
    type: String,
    enum: ['api', 'web', 'mobile', 'erp_integration', 'warehouse_system', 'carrier_portal'],
    default: 'api'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
logisticsSchema.index({ companyId: 1 });
logisticsSchema.index({ orderId: 1 });
logisticsSchema.index({ productId: 1 });
logisticsSchema.index({ shipmentId: 1 });
logisticsSchema.index({ trackingNumber: 1 });
logisticsSchema.index({ status: 1 });
logisticsSchema.index({ 'timestamps.created': -1 });
logisticsSchema.index({ 'estimatedDelivery.date': 1 });
logisticsSchema.index({ 'currentLocation.country': 1 });
logisticsSchema.index({ 'events.timestamp': -1 });

// Virtual for transit time
logisticsSchema.virtual('transitTime').get(function() {
  if (!this.timestamps.pickedUp || !this.timestamps.delivered) {
    return null;
  }
  return this.timestamps.delivered - this.timestamps.pickedUp;
});

// Virtual for delay calculation
logisticsSchema.virtual('delayCalculated').get(function() {
  if (!this.timestamps.delivered || !this.estimatedDelivery.date) {
    return null;
  }
  return this.timestamps.delivered - this.estimatedDelivery.date;
});

// Method to calculate delay risk based on current status and events
logisticsSchema.methods.calculateDelayRisk = function() {
  // Base risk on current status and recent events
  const statusRisk = {
    processing: 0.1,
    ready_for_pickup: 0.2,
    picked_up: 0.3,
    in_transit: 0.4,
    at_customs: 0.5,
    cleared_customs: 0.3,
    out_for_delivery: 0.2,
    delivered: 0.0,
    failed: 1.0,
    cancelled: 1.0
  }[this.status] || 0.5;

  // Adjust for recent exceptions
  const recentExceptions = this.events.filter(event =>
    event.type === 'exception' &&
    new Date() - new Date(event.timestamp) < 24 * 60 * 60 * 1000 // Last 24 hours
  ).length;

  const exceptionRisk = Math.min(0.5, recentExceptions * 0.1);

  // Adjust for customs events
  const customsEvents = this.events.filter(event =>
    event.type === 'customs' &&
    new Date() - new Date(event.timestamp) < 48 * 60 * 60 * 1000 // Last 48 hours
  ).length;

  const customsRisk = Math.min(0.3, customsEvents * 0.15);

  return Math.min(1.0, statusRisk + exceptionRisk + customsRisk);
};

// Static method to get logistics analytics for a company
logisticsSchema.statics.getCompanyAnalytics = async function(companyId, options = {}) {
  const match = { companyId: new mongoose.Types.ObjectId(companyId) };
  if (options.startDate) {
    match.createdAt = { $gte: options.startDate };
  }
  if (options.endDate) {
    if (!match.createdAt) match.createdAt = {};
    match.createdAt.$lte = options.endDate;
  }

  const analytics = await this.aggregate([
    { $match: match },
    {
      $facet: {
        volume: [
          { $match: { status: 'delivered' } },
          { $group: { _id: null, totalShipments: { $sum: 1 } } }
        ],
        performance: [
          { $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgTransitTimeHours: { $avg: '$transitTime' }
          }}
        ],
        exceptions: [
          { $match: { 'events.type': 'exception' } },
          { $group: { _id: '$events.type', count: { $sum: 1 } } }
        ],
        onTimeDelivery: [
          { $match: { 'performance.onTimeDelivery': true } },
          { $group: { _id: null, onTimeCount: { $sum: 1 } } }
        ]
      }
    }
  ]);

  return analytics[0] || {};
};

module.exports = mongoose.model('Logistics', logisticsSchema);