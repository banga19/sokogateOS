// Cross-Border Customs Engine Model for SokogateOS
// Mongoose schemas for HS codes, tariff schedules, customs routes,
// shipment documents, compliance rules, and trade agreements

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ===== HS CODE CLASSIFICATION =====

const hsCodeSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  chapter: { type: String, required: true },        // 2-digit (e.g., "52")
  heading: { type: String, required: true },          // 4-digit (e.g., "5209")
  subheading: { type: String },                        // 6-digit (e.g., "520939")
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['textiles', 'electronics', 'machinery', 'food_beverage', 'chemicals',
           'construction', 'vehicles', 'plastics', 'metals', 'agricultural',
           'pharmaceuticals', 'footwear', 'furniture', 'paper', 'glass_ceramics',
           'leather', 'wood', 'minerals', 'jewelry', 'arms', 'other'],
    required: true
  },
  parentCategory: String,   // Broader grouping for taxonomies
  keywords: [String],       // Search keywords for AI classifier
  restrictions: {
    restrictedCountries: [String],     // Countries with import restrictions
    requiresLicense: Boolean,
    licenseTypes: [String],             // e.g., ['import_permit', 'quarantine_cert']
    prohibitedInCountries: [String],    // Outright banned in these countries
    specialHandling: String
  },
  unitOfMeasure: { type: String, default: 'pieces' },  // kg, meters, pieces, liters, units
  notes: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

hsCodeSchema.index({ category: 1, isActive: 1 });
hsCodeSchema.index({ keywords: 'text' });
hsCodeSchema.index({ description: 'text' });
hsCodeSchema.index({ code: 1, category: 1 });

// ===== TARIFF SCHEDULE (Country-specific duty rates) =====

const tariffScheduleSchema = new Schema({
  hsCode: { type: String, required: true, index: true },
  country: { type: String, required: true },          // Destination country
  originCountry: { type: String, required: true },     // Source country
  baseDutyRate: { type: Number, required: true },      // Percentage (e.g., 25 means 25%)
  vatRate: { type: Number, default: 16 },              // VAT/GST percentage
  exciseDuty: { type: Number, default: 0 },            // Excise duty if applicable
  otherTaxes: [{                                        // Additional levies
    name: String,
    rate: { type: Number },                            // Percentage
    fixedAmount: { type: Number },                     // Or fixed per unit
    currency: { type: String, default: 'USD' }
  }],
  preferentialRate: { type: Number },                   // Under trade agreement (if lower)
  tradeAgreement: {
    name: { type: String },                             // e.g., 'AfCFTA', 'EAC', 'COMESA', 'SADC'
    rulesOfOrigin: String,                              // Origin requirements
    requiresCertificateOfOrigin: Boolean
  },
  effectiveDate: { type: Date, default: Date.now },
  expiryDate: Date,
  isActive: { type: Boolean, default: true },
  notes: String,
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

tariffScheduleSchema.index({ hsCode: 1, country: 1, originCountry: 1 }, { unique: true });
tariffScheduleSchema.index({ country: 1, isActive: 1 });

// ===== CUSTOMS ROUTE (Pre-configured trade routes) =====

const customsRouteSchema = new Schema({
  name: { type: String, required: true },
  originPort: { type: String, required: true },
  destinationPort: { type: String, required: true },
  originCountry: { type: String, required: true },
  destinationCountry: { type: String, required: true },
  tradeBloc: {
    type: String,
    enum: ['EAC', 'COMESA', 'SADC', 'ECOWAS', 'AfCFTA', 'none'],
    default: 'none'
  },
  avgTransitDays: { type: Number, required: true },
  preferredCarriers: [String],
  requiredDocuments: [{
    type: { type: String, enum: ['bill_of_lading', 'commercial_invoice', 'packing_list',
      'certificate_of_origin', 'import_declaration', 'export_declaration',
      'certificate_of_insurance', 'quarantine_cert', 'fumigation_cert',
      'phytosanitary_cert', 'certificate_of_analysis', 'customs_bond',
      'single_administrative_document', 'transit_document',
      'preference_certificate', 'manufacturers_declaration'] },
    required: { type: Boolean, default: true },
    description: String,
    notes: String
  }],
  estimatedDutyRate: { type: Number },                 // Average duty rate for mixed goods
  customsBroker: {
    name: String,
    contact: String,
    fee: { amount: Number, currency: { type: String, default: 'USD' } }
  },
  specialRequirements: [String],
  isActive: { type: Boolean, default: true },
  popularityScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

customsRouteSchema.index({ originCountry: 1, destinationCountry: 1 });
customsRouteSchema.index({ tradeBloc: 1 });
customsRouteSchema.index({ popularityScore: -1 });

// Virtual: Route key
customsRouteSchema.virtual('routeKey').get(function() {
  return `${this.originCountry}→${this.destinationCountry}`;
});

// ===== CUSTOMS SHIPMENT (Per-shipment customs record) =====

const customsShipmentSchema = new Schema({
  shipmentId: { type: String, required: true, unique: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  sourcingRequestId: { type: String },
  logisticsShipmentId: { type: String },

  // Cargo details
  hsCode: { type: String, required: true },
  productDescription: { type: String, required: true },
  productCategory: String,
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'pieces' },
  totalWeightKg: { type: Number },
  totalVolumeM3: { type: Number },
  invoiceValue: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' }
  },
  freightCost: { type: Number, default: 0 },
  insuranceCost: { type: Number, default: 0 },

  // Route
  originCountry: { type: String, required: true },
  originPort: String,
  destinationCountry: { type: String, required: true },
  destinationPort: String,
  incoterm: {
    type: String,
    enum: ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'],
    default: 'CIF'
  },

  // Duty calculation
  dutyCalculation: {
    cifValue: { type: Number },          // Cost + Insurance + Freight
    dutyRate: { type: Number },           // Applied duty rate
    dutyAmount: { type: Number },         // Calculated duty
    vatRate: { type: Number },
    vatAmount: { type: Number },
    exciseDuty: { type: Number },
    totalTaxesAndDuties: { type: Number },
    preferentialRate: { type: Number },
    tradeAgreementApplied: { type: String },
    savingsUnderAgreement: { type: Number },
    processingFee: { type: Number },
    currency: { type: String, default: 'USD' },
    calculatedAt: Date
  },

  // Compliance
  compliance: {
    status: {
      type: String,
      enum: ['pending', 'compliant', 'non_compliant', 'requires_license', 'restricted', 'prohibited'],
      default: 'pending'
    },
    restrictedGoods: [String],
    requiredLicenses: [String],
    obtainedLicenses: [String],
    warnings: [String],
    checkedAt: Date
  },

  // Generated documents
  documents: [{
    type: { type: String, enum: ['bill_of_lading', 'commercial_invoice', 'packing_list',
      'certificate_of_origin', 'import_declaration', 'export_declaration',
      'certificate_of_insurance', 'single_administrative_document',
      'customs_bond', 'preference_certificate', 'manufacturers_declaration'] },
    documentNumber: String,
    status: {
      type: String,
      enum: ['draft', 'generated', 'submitted', 'approved', 'rejected'],
      default: 'draft'
    },
    content: Schema.Types.Mixed,           // Generated document data
    generatedAt: Date,
    submittedAt: Date,
    approvedAt: Date,
    notes: String
  }],

  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'documents_generated', 'submitted', 'in_processing',
           'cleared', 'held_for_inspection', 'rejected', 'released', 'exported'],
    default: 'draft'
  },
  clearanceDate: Date,
  customsOfficer: String,
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    notes: String,
    updatedBy: String
  }],

  // Metadata
  estimatedClearanceDays: { type: Number },
  actualClearanceDays: { type: Number },
  notes: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

customsShipmentSchema.index({ companyId: 1, createdAt: -1 });
customsShipmentSchema.index({ status: 1 });
customsShipmentSchema.index({ destinationCountry: 1, status: 1 });
customsShipmentSchema.index({ hsCode: 1, destinationCountry: 1 });

// Virtual: Total landed cost
customsShipmentSchema.virtual('landedCost').get(function() {
  const invoice = this.invoiceValue?.amount || 0;
  const freight = this.freightCost || 0;
  const insurance = this.insuranceCost || 0;
  const duties = this.dutyCalculation?.totalTaxesAndDuties || 0;
  const processing = this.dutyCalculation?.processingFee || 0;
  return invoice + freight + insurance + duties + processing;
});

// ===== COMPLIANCE RULES =====

const complianceRuleSchema = new Schema({
  country: { type: String, required: true, index: true },
  hsCode: { type: String, required: true },
  ruleType: {
    type: String,
    enum: ['restricted', 'prohibited', 'requires_license', 'requires_certificate',
           'quota', 'sanctioned', 'requires_inspection', 'special_tax'],
    required: true
  },
  description: { type: String, required: true },
  authority: String,                        // Regulatory body
  referenceRegulation: String,              // Law or regulation reference
  allowedWithDocuments: [String],           // Allowed if these docs provided
  exemptions: [String],                     // Exemption categories
  penalty: String,                          // Penalty for non-compliance
  isActive: { type: Boolean, default: true },
  effectiveDate: { type: Date, default: Date.now },
  expiryDate: Date,
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

complianceRuleSchema.index({ country: 1, hsCode: 1 }, { unique: true });
complianceRuleSchema.index({ ruleType: 1 });

// ===== TRADE AGREEMENTS =====

const tradeAgreementSchema = new Schema({
  name: { type: String, required: true, unique: true },  // e.g., 'AfCFTA', 'EAC', 'COMESA'
  shortName: { type: String, required: true },
  type: {
    type: String,
    enum: ['multilateral', 'bilateral', 'regional', 'preferential'],
    default: 'regional'
  },
  memberCountries: [String],
  description: { type: String },
  keyBenefits: [String],
  rulesOfOrigin: {
    description: String,
    localContentRequirement: { type: Number },            // % local content required
    productSpecificRules: [{                              // e.g., textiles require local fabric
      category: String,
      rule: String
    }]
  },
  dutyReductionSchedule: {
    immediateDutyFree: [String],                          // Categories duty-free now
    phasedReduction: [{                                    // Categories with phase-in
      category: String,
      yearsToZero: Number,
      currentRate: Number
    }],
    excludedProducts: [String]                             // Categories excluded from agreement
  },
  documentation: {
    requiresCertificateOfOrigin: { type: Boolean, default: true },
    certificateOfOriginFormat: String,                     // e.g., 'SADC Form', 'EAC Form'
    additionalDocuments: [String]
  },
  isActive: { type: Boolean, default: true },
  effectiveDate: { type: Date },
  expiryDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

tradeAgreementSchema.index({ memberCountries: 1 });
tradeAgreementSchema.index({ type: 1, isActive: 1 });

// ===== DOCUMENT TEMPLATES =====

const documentTemplateSchema = new Schema({
  type: {
    type: String,
    enum: ['bill_of_lading', 'commercial_invoice', 'packing_list',
      'certificate_of_origin', 'import_declaration', 'export_declaration',
      'certificate_of_insurance', 'single_administrative_document',
      'customs_bond', 'preference_certificate', 'manufacturers_declaration'],
    required: true
  },
  country: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  fields: [{
    fieldName: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'boolean', 'currency', 'address', 'company', 'signature'],
      default: 'text'
    },
    required: { type: Boolean, default: false },
    placeholder: String,
    options: [String],                          // For select type
    validation: {
      pattern: String,
      minLength: Number,
      maxLength: Number,
      message: String
    },
    autoFill: { type: Boolean, default: false }, // Can be auto-filled from shipment data
    autoFillField: String                        // Maps to shipment schema path
  }],
  sections: [{                                     // Document sections/groups
    title: String,
    order: Number,
    fields: [String]                                // References fieldName
  }],
  format: {
    pageSize: { type: String, default: 'A4' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    margins: { top: Number, right: Number, bottom: Number, left: Number }
  },
  legalDisclaimer: String,
  isActive: { type: Boolean, default: true },
  version: { type: String, default: '1.0' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

documentTemplateSchema.index({ type: 1, country: 1 }, { unique: true });

// ===== EXPORT THE MODEL =====

module.exports = {
  CustomHSCode: mongoose.model('CustomHSCode', hsCodeSchema),
  TariffSchedule: mongoose.model('TariffSchedule', tariffScheduleSchema),
  CustomsRoute: mongoose.model('CustomsRoute', customsRouteSchema),
  CustomsShipment: mongoose.model('CustomsShipment', customsShipmentSchema),
  ComplianceRule: mongoose.model('ComplianceRule', complianceRuleSchema),
  TradeAgreement: mongoose.model('TradeAgreement', tradeAgreementSchema),
  DocumentTemplate: mongoose.model('DocumentTemplate', documentTemplateSchema)
};
