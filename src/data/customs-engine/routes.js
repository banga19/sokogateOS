// Seed data — Customs routes for cross-border customs engine

const SEED_ROUTES = [
  {
    name: 'China → Kenya (Mombasa)', originPort: 'Shanghai', destinationPort: 'Mombasa',
    originCountry: 'China', destinationCountry: 'Kenya', tradeBloc: 'none',
    avgTransitDays: 25, preferredCarriers: ['Maersk', 'MSC', 'CMA CGM'],
    requiredDocuments: [
      { type: 'bill_of_lading', required: true, description: 'Original or telex release' },
      { type: 'commercial_invoice', required: true, description: '3 signed originals' },
      { type: 'packing_list', required: true, description: 'Detailed packing list' },
      { type: 'certificate_of_origin', required: true, description: 'For duty assessment' },
      { type: 'import_declaration', required: true, description: 'Single administrative document for Kenya' },
      { type: 'certificate_of_insurance', required: true, description: 'CIF value coverage' }
    ],
    estimatedDutyRate: 20,
    popularityScore: 95
  },
  {
    name: 'India → Kenya (Mombasa)', originPort: 'Mumbai', destinationPort: 'Mombasa',
    originCountry: 'India', destinationCountry: 'Kenya', tradeBloc: 'none',
    avgTransitDays: 18, preferredCarriers: ['Maersk', 'Evergreen', 'Hapag-Lloyd'],
    requiredDocuments: [
      { type: 'bill_of_lading', required: true },
      { type: 'commercial_invoice', required: true },
      { type: 'packing_list', required: true },
      { type: 'certificate_of_origin', required: true },
      { type: 'import_declaration', required: true },
      { type: 'certificate_of_insurance', required: true }
    ],
    estimatedDutyRate: 20,
    popularityScore: 80
  },
  {
    name: 'China → Nigeria (Lagos)', originPort: 'Guangzhou', destinationPort: 'Lagos',
    originCountry: 'China', destinationCountry: 'Nigeria', tradeBloc: 'none',
    avgTransitDays: 30, preferredCarriers: ['MSC', 'CMA CGM', 'Maersk'],
    requiredDocuments: [
      { type: 'bill_of_lading', required: true },
      { type: 'commercial_invoice', required: true },
      { type: 'packing_list', required: true },
      { type: 'certificate_of_origin', required: true },
      { type: 'import_declaration', required: true },
      { type: 'certificate_of_insurance', required: true },
      { type: 'fumigation_cert', required: true, description: 'Required for goods in wooden packaging' }
    ],
    estimatedDutyRate: 18,
    popularityScore: 90
  },
  {
    name: 'Turkey → Kenya (Mombasa)', originPort: 'Istanbul', destinationPort: 'Mombasa',
    originCountry: 'Turkey', destinationCountry: 'Kenya', tradeBloc: 'none',
    avgTransitDays: 20, preferredCarriers: ['Maersk', 'MSC'],
    requiredDocuments: [
      { type: 'bill_of_lading', required: true },
      { type: 'commercial_invoice', required: true },
      { type: 'packing_list', required: true },
      { type: 'certificate_of_origin', required: true },
      { type: 'import_declaration', required: true }
    ],
    estimatedDutyRate: 22,
    popularityScore: 65
  },
  {
    name: 'Kenya → Uganda (Nairobi-Kampala Overland)', originPort: 'Nairobi', destinationPort: 'Kampala',
    originCountry: 'Kenya', destinationCountry: 'Uganda', tradeBloc: 'EAC',
    avgTransitDays: 5, preferredCarriers: ['EAC Rail', 'Express Kenya', 'Uganda Railways'],
    requiredDocuments: [
      { type: 'commercial_invoice', required: true },
      { type: 'packing_list', required: true },
      { type: 'certificate_of_origin', required: true, description: 'EAC certificate for duty-free treatment' },
      { type: 'transit_document', required: true },
      { type: 'single_administrative_document', required: true }
    ],
    estimatedDutyRate: 0,
    popularityScore: 85
  },
  {
    name: 'Kenya → Tanzania (Nairobi-Dar es Salaam Overland)', originPort: 'Nairobi', destinationPort: 'Dar es Salaam',
    originCountry: 'Kenya', destinationCountry: 'Tanzania', tradeBloc: 'EAC',
    avgTransitDays: 7, preferredCarriers: ['EAC Rail', 'Tanzania Road Haulage'],
    requiredDocuments: [
      { type: 'commercial_invoice', required: true },
      { type: 'packing_list', required: true },
      { type: 'certificate_of_origin', required: true },
      { type: 'transit_document', required: true },
      { type: 'single_administrative_document', required: true }
    ],
    estimatedDutyRate: 0,
    popularityScore: 75
  },
  {
    name: 'China → South Africa (Durban)', originPort: 'Shanghai', destinationPort: 'Durban',
    originCountry: 'China', destinationCountry: 'South Africa', tradeBloc: 'none',
    avgTransitDays: 22, preferredCarriers: ['Maersk', 'MSC', 'CMA CGM'],
    requiredDocuments: [
      { type: 'bill_of_lading', required: true },
      { type: 'commercial_invoice', required: true },
      { type: 'packing_list', required: true },
      { type: 'certificate_of_origin', required: true },
      { type: 'import_declaration', required: true },
      { type: 'single_administrative_document', required: true }
    ],
    estimatedDutyRate: 15,
    popularityScore: 70
  },
  {
    name: 'Kenya → Rwanda (Nairobi-Kigali Overland)', originPort: 'Nairobi', destinationPort: 'Kigali',
    originCountry: 'Kenya', destinationCountry: 'Rwanda', tradeBloc: 'EAC',
    avgTransitDays: 10, preferredCarriers: ['EAC Rail', 'Rwanda Road Haulage'],
    requiredDocuments: [
      { type: 'commercial_invoice', required: true },
      { type: 'packing_list', required: true },
      { type: 'certificate_of_origin', required: true },
      { type: 'transit_document', required: true },
      { type: 'single_administrative_document', required: true }
    ],
    estimatedDutyRate: 0,
    popularityScore: 55
  },
  {
    name: 'China → Tanzania (Dar es Salaam)', originPort: 'Guangzhou', destinationPort: 'Dar es Salaam',
    originCountry: 'China', destinationCountry: 'Tanzania', tradeBloc: 'none',
    avgTransitDays: 28, preferredCarriers: ['Maersk', 'MSC'],
    requiredDocuments: [
      { type: 'bill_of_lading', required: true },
      { type: 'commercial_invoice', required: true },
      { type: 'packing_list', required: true },
      { type: 'certificate_of_origin', required: true },
      { type: 'import_declaration', required: true }
    ],
    estimatedDutyRate: 20,
    popularityScore: 60
  },
  {
    name: 'China → Uganda (via Mombasa-Kampala Corridor)', originPort: 'Shanghai', destinationPort: 'Kampala',
    originCountry: 'China', destinationCountry: 'Uganda', tradeBloc: 'none',
    avgTransitDays: 35, preferredCarriers: ['Maersk', 'MSC', 'CMA CGM'],
    requiredDocuments: [
      { type: 'bill_of_lading', required: true },
      { type: 'commercial_invoice', required: true },
      { type: 'packing_list', required: true },
      { type: 'certificate_of_origin', required: true },
      { type: 'import_declaration', required: true },
      { type: 'single_administrative_document', required: true }
    ],
    estimatedDutyRate: 22,
    popularityScore: 50
  }
];

module.exports = SEED_ROUTES;
