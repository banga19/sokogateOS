// Cross-Border Customs Engine Service for SokogateOS
// AI-powered tariff classification, duty calculation, document generation,
// compliance checking, and trade agreement optimization for African trade routes

const logger = require('../utils/logger');
const {
  CustomHSCode,
  TariffSchedule,
  CustomsRoute,
  CustomsShipment,
  ComplianceRule,
  TradeAgreement,
  DocumentTemplate
} = require('../models/customsEngine');

// ===== SERVICE STATE =====

let initialized = false;
let hsCodeCache = new Map();          // description -> { code, confidence, category }
let tariffCache = new Map();          // hsCode:country:origin -> duty rates
let routeCache = new Map();           // origin:destination -> route details
let agreementCache = new Map();       // country -> trade agreements
let complianceCache = new Map();      // country:hsCode -> compliance rules
let documentCache = new Map();        // type:country -> document template

// ===== SEED DATA =====

const SEED_HS_CODES = [
  // Textiles (Chapter 50-63)
  { code: '5209.39', chapter: '52', heading: '5209', description: 'Woven fabrics of cotton, dyed', category: 'textiles', keywords: ['cotton fabric', 'woven cotton', 'dyed cotton', 'textile', 'fabric'] },
  { code: '5208.12', chapter: '52', heading: '5208', description: 'Woven fabrics of cotton, plain weave, unbleached', category: 'textiles', keywords: ['cotton fabric', 'plain weave', 'unbleached cotton', 'textile'] },
  { code: '5512.19', chapter: '55', heading: '5512', description: 'Woven fabrics of polyester staple fibers', category: 'textiles', keywords: ['polyester fabric', 'synthetic fabric', 'polyester textile'] },
  { code: '5407.10', chapter: '54', heading: '5407', description: 'Woven fabrics of synthetic filament yarn', category: 'textiles', keywords: ['synthetic fabric', 'nylon fabric', 'filament fabric'] },
  { code: '6301.20', chapter: '63', heading: '6301', description: 'Blankets and travelling rugs of wool or fine animal hair', category: 'textiles', keywords: ['blankets', 'wool blankets', 'travelling rugs'] },
  { code: '6204.62', chapter: '62', heading: '6204', description: 'Women\'s or girls\' trousers of cotton', category: 'textiles', keywords: ['trousers', 'pants', 'cotton trousers', 'women clothing'] },
  { code: '6109.10', chapter: '61', heading: '6109', description: 'T-shirts, singlets of cotton, knitted', category: 'textiles', keywords: ['t-shirts', 'cotton tshirts', 'knitted shirts', 'apparel'] },
  { code: '6203.42', chapter: '62', heading: '6203', description: 'Men\'s or boys\' trousers of cotton', category: 'textiles', keywords: ['men trousers', 'cotton trousers', 'boys pants'] },

  // Electronics (Chapter 85)
  { code: '8517.13', chapter: '85', heading: '8517', description: 'Smartphones for cellular networks', category: 'electronics', keywords: ['smartphone', 'mobile phone', 'cell phone', 'iphone', 'android'] },
  { code: '8517.12', chapter: '85', heading: '8517', description: 'Telephones for cellular networks or other wireless networks', category: 'electronics', keywords: ['mobile phone', 'cell phone', 'feature phone'] },
  { code: '8471.30', chapter: '84', heading: '8471', description: 'Portable digital automatic data processing machines (laptops)', category: 'electronics', keywords: ['laptop', 'notebook', 'computer', 'portable computer'] },
  { code: '8471.41', chapter: '84', heading: '8471', description: 'Data processing machines (desktop computers) not elsewhere specified', category: 'electronics', keywords: ['desktop computer', 'computer', 'pc'] },
  { code: '8528.72', chapter: '85', heading: '8528', description: 'Television receivers, color, not incorporating video recording', category: 'electronics', keywords: ['television', 'tv', 'tv set', 'flat screen tv'] },
  { code: '8518.30', chapter: '85', heading: '8518', description: 'Loudspeakers, headphones, earphones', category: 'electronics', keywords: ['speakers', 'headphones', 'earphones', 'audio equipment'] },
  { code: '8542.31', chapter: '85', heading: '8542', description: 'Electronic integrated circuits as processors and controllers', category: 'electronics', keywords: ['microchip', 'processor', 'integrated circuit', 'semiconductor'] },
  { code: '8525.80', chapter: '85', heading: '8525', description: 'Television cameras, digital cameras, video camera recorders', category: 'electronics', keywords: ['camera', 'digital camera', 'cctv', 'video camera'] },
  { code: '8470.10', chapter: '84', heading: '8470', description: 'Electronic calculators capable of operation without external power', category: 'electronics', keywords: ['calculator', 'electronic calculator'] },

  // Machinery (Chapter 84)
  { code: '8429.20', chapter: '84', heading: '8429', description: 'Bulldozers, angledozers, graders, levellers', category: 'machinery', keywords: ['bulldozer', 'construction machinery', 'grader', 'leveller'] },
  { code: '8429.51', chapter: '84', heading: '8429', description: 'Front-end shovel loaders', category: 'machinery', keywords: ['loader', 'shovel loader', 'construction equipment'] },
  { code: '8431.49', chapter: '84', heading: '8431', description: 'Parts of machinery for construction, mining, and earth-moving', category: 'machinery', keywords: ['machine parts', 'construction parts', 'mining equipment parts'] },
  { code: '8481.80', chapter: '84', heading: '8481', description: 'Taps, cocks, valves and similar appliances for pipes', category: 'machinery', keywords: ['valves', 'taps', 'pipes', 'plumbing'] },
  { code: '8413.70', chapter: '84', heading: '8413', description: 'Centrifugal pumps for liquids', category: 'machinery', keywords: ['pump', 'centrifugal pump', 'water pump'] },
  { code: '8414.80', chapter: '84', heading: '8414', description: 'Air or gas pumps, compressors, fans', category: 'machinery', keywords: ['compressor', 'air pump', 'fan', 'ventilator'] },
  { code: '8421.23', chapter: '84', heading: '8421', description: 'Oil or fuel filters for internal combustion engines', category: 'machinery', keywords: ['oil filter', 'fuel filter', 'engine filter'] },
  { code: '8450.11', chapter: '84', heading: '8450', description: 'Fully automatic washing machines of dry capacity not exceeding 10 kg', category: 'machinery', keywords: ['washing machine', 'laundry machine'] },

  // Food & Beverage (Chapters 1-24)
  { code: '1006.30', chapter: '10', heading: '1006', description: 'Semi-milled or wholly milled rice', category: 'food_beverage', keywords: ['rice', 'milled rice', 'white rice', 'grain'] },
  { code: '1006.20', chapter: '10', heading: '1006', description: 'Husked (brown) rice', category: 'food_beverage', keywords: ['brown rice', 'husked rice', 'grain'] },
  { code: '1101.00', chapter: '11', heading: '1101', description: 'Wheat or meslin flour', category: 'food_beverage', keywords: ['flour', 'wheat flour', 'bread flour'] },
  { code: '1511.10', chapter: '15', heading: '1511', description: 'Crude palm oil', category: 'food_beverage', keywords: ['palm oil', 'crude palm oil', 'cooking oil'] },
  { code: '1517.90', chapter: '15', heading: '1517', description: 'Edible vegetable oil blends', category: 'food_beverage', keywords: ['cooking oil', 'vegetable oil', 'edible oil'] },
  { code: '1701.14', chapter: '17', heading: '1701', description: 'Raw cane sugar', category: 'food_beverage', keywords: ['sugar', 'cane sugar', 'raw sugar'] },
  { code: '1704.90', chapter: '17', heading: '1704', description: 'Sugar confectionery not containing cocoa', category: 'food_beverage', keywords: ['candy', 'sweets', 'confectionery'] },
  { code: '2101.11', chapter: '21', heading: '2101', description: 'Coffee extracts, essences and concentrates', category: 'food_beverage', keywords: ['coffee', 'coffee extract', 'instant coffee'] },
  { code: '2202.10', chapter: '22', heading: '2202', description: 'Waters with added sugar or sweeteners (soft drinks)', category: 'food_beverage', keywords: ['soft drinks', 'soda', 'beverages', 'juice drink'] },
  { code: '0901.11', chapter: '9', heading: '0901', description: 'Coffee, not roasted, not decaffeinated', category: 'food_beverage', keywords: ['green coffee', 'coffee beans', 'raw coffee'] },
  { code: '1801.00', chapter: '18', heading: '1801', description: 'Cocoa beans, whole or broken, raw or roasted', category: 'food_beverage', keywords: ['cocoa beans', 'cocoa', 'chocolate'] },
  { code: '0402.10', chapter: '4', heading: '0402', description: 'Milk powder with fat content not exceeding 1.5%', category: 'food_beverage', keywords: ['milk powder', 'powdered milk', 'dairy'] },

  // Chemicals (Chapter 28-38)
  { code: '2807.00', chapter: '28', heading: '2807', description: 'Sulphuric acid, oleum', category: 'chemicals', keywords: ['sulphuric acid', 'sulfuric acid', 'industrial chemical'] },
  { code: '2815.11', chapter: '28', heading: '2815', description: 'Sodium hydroxide (caustic soda), solid', category: 'chemicals', keywords: ['caustic soda', 'sodium hydroxide', 'industrial chemical'] },
  { code: '2836.20', chapter: '28', heading: '2836', description: 'Disodium carbonate (soda ash)', category: 'chemicals', keywords: ['soda ash', 'sodium carbonate', 'industrial chemical'] },
  { code: '3105.20', chapter: '31', heading: '3105', description: 'Mineral or chemical fertilizers with nitrogen, phosphorus, potassium', category: 'chemicals', keywords: ['fertilizer', 'NPK', 'chemical fertilizer', 'agricultural input'] },
  { code: '3808.91', chapter: '38', heading: '3808', description: 'Insecticides for retail sale', category: 'chemicals', keywords: ['insecticide', 'pesticide', 'agricultural chemical'] },
  { code: '3401.11', chapter: '34', heading: '3401', description: 'Soap for toilet use', category: 'chemicals', keywords: ['soap', 'toilet soap', 'personal care'] },
  { code: '3401.19', chapter: '34', heading: '3401', description: 'Soap for other purposes (laundry soap)', category: 'chemicals', keywords: ['laundry soap', 'washing soap', 'detergent'] },
  { code: '3303.00', chapter: '33', heading: '3303', description: 'Perfumes and toilet waters', category: 'chemicals', keywords: ['perfume', 'fragrance', 'toilet water'] },
  { code: '3004.90', chapter: '30', heading: '3004', description: 'Medicaments for retail sale, not elsewhere specified', category: 'pharmaceuticals', keywords: ['medicine', 'pharmaceuticals', 'drugs', 'medication'] },

  // Construction Materials (Chapters 25-27, 68-70)
  { code: '2523.29', chapter: '25', heading: '2523', description: 'Portland cement not elsewhere specified', category: 'construction', keywords: ['cement', 'portland cement', 'construction material'] },
  { code: '2523.10', chapter: '25', heading: '2523', description: 'Cement clinkers', category: 'construction', keywords: ['clinker', 'cement clinker', 'cement'] },
  { code: '7210.41', chapter: '72', heading: '7210', description: 'Flat-rolled iron/steel products, corrugated', category: 'construction', keywords: ['steel sheet', 'corrugated iron', 'building material', 'iron sheet'] },
  { code: '7214.20', chapter: '72', heading: '7214', description: 'Bars and rods of iron/steel, with indentations (rebar)', category: 'construction', keywords: ['rebar', 'steel bar', 'reinforcement bar', 'construction steel'] },
  { code: '7306.30', chapter: '73', heading: '7306', description: 'Welded tubes and pipes of iron/steel', category: 'construction', keywords: ['steel pipe', 'steel tube', 'pipes'] },
  { code: '6901.00', chapter: '69', heading: '6901', description: 'Bricks, blocks, tiles of siliceous earth', category: 'construction', keywords: ['bricks', 'tiles', 'ceramic tiles', 'floor tiles'] },
  { code: '6810.11', chapter: '68', heading: '6810', description: 'Building blocks and bricks of cement/concrete', category: 'construction', keywords: ['concrete blocks', 'building blocks', 'paving blocks'] },
  { code: '4403.11', chapter: '44', heading: '4403', description: 'Coniferous wood treated with paint or preservatives', category: 'wood', keywords: ['timber', 'wood', 'lumber', 'pine wood'] },

  // Plastics & Rubber (Chapter 39-40)
  { code: '3923.10', chapter: '39', heading: '3923', description: 'Boxes, cases, crates of plastic for packaging', category: 'plastics', keywords: ['plastic packaging', 'plastic boxes', 'crates', 'containers'] },
  { code: '3926.90', chapter: '39', heading: '3926', description: 'Articles of plastic not elsewhere specified', category: 'plastics', keywords: ['plastic articles', 'plastic products', 'plasticware'] },
  { code: '4011.20', chapter: '40', heading: '4011', description: 'Pneumatic tires for buses or trucks', category: 'plastics', keywords: ['tires', 'tyres', 'truck tires', 'bus tires'] },
  { code: '4016.93', chapter: '40', heading: '4016', description: 'Gaskets, washers and other seals of rubber', category: 'plastics', keywords: ['rubber gaskets', 'rubber seals', 'washing machines'] },

  // Vehicles (Chapter 87)
  { code: '8703.23', chapter: '87', heading: '8703', description: 'Motor vehicles with engine > 1500cc but not > 3000cc', category: 'vehicles', keywords: ['car', 'automobile', 'motor vehicle', 'used car', 'SUV'] },
  { code: '8704.21', chapter: '87', heading: '8704', description: 'Motor vehicles for goods transport, GVW not exceeding 5 tonnes', category: 'vehicles', keywords: ['truck', 'pickup truck', 'delivery van', 'commercial vehicle'] },
  { code: '8704.22', chapter: '87', heading: '8704', description: 'Motor vehicles for goods transport, GVW 5-20 tonnes', category: 'vehicles', keywords: ['truck', 'lorry', 'heavy truck', 'cargo truck'] },
  { code: '8711.20', chapter: '87', heading: '8711', description: 'Motorcycles with reciprocating engine > 50cc but not > 250cc', category: 'vehicles', keywords: ['motorcycle', 'motorbike', 'boda boda'] },
  { code: '8711.30', chapter: '87', heading: '8711', description: 'Motorcycles with reciprocating engine > 250cc but not > 500cc', category: 'vehicles', keywords: ['motorcycle', 'bike', 'motorbike'] },

  // Metals (Chapter 72-83)
  { code: '7601.10', chapter: '76', heading: '7601', description: 'Unwrought aluminium, not alloyed', category: 'metals', keywords: ['aluminium', 'aluminum', 'aluminium ingot'] },
  { code: '7403.11', chapter: '74', heading: '7403', description: 'Refined copper, cathodes', category: 'metals', keywords: ['copper', 'copper cathode', 'refined copper'] },
  { code: '7208.39', chapter: '72', heading: '7208', description: 'Flat-rolled iron/steel products, hot-rolled', category: 'metals', keywords: ['steel coil', 'hot rolled steel', 'steel sheet'] },

  // Agricultural (Chapters 6-14)
  { code: '0701.90', chapter: '7', heading: '0701', description: 'Fresh or chilled potatoes', category: 'agricultural', keywords: ['potatoes', 'fresh potatoes', 'vegetables'] },
  { code: '0803.10', chapter: '8', heading: '0803', description: 'Fresh plantains', category: 'agricultural', keywords: ['plantains', 'bananas', 'fresh fruit'] },
  { code: '1201.90', chapter: '12', heading: '1201', description: 'Soya beans, whether or not broken', category: 'agricultural', keywords: ['soybeans', 'soya beans', 'oil seeds'] },
  { code: '1005.90', chapter: '10', heading: '1005', description: 'Maize (corn) other than seed', category: 'agricultural', keywords: ['maize', 'corn', 'grain'] }
];

const SEED_TARIFFS = [
  // China → Kenya (typical textile duties)
  { hsCode: '5209.39', country: 'Kenya', originCountry: 'China', baseDutyRate: 25, vatRate: 16, preferentialRate: null },
  { hsCode: '5512.19', country: 'Kenya', originCountry: 'China', baseDutyRate: 25, vatRate: 16 },
  { hsCode: '8517.13', country: 'Kenya', originCountry: 'China', baseDutyRate: 0, vatRate: 16 },      // Smartphones duty-free
  { hsCode: '8471.30', country: 'Kenya', originCountry: 'China', baseDutyRate: 0, vatRate: 16 },      // Laptops duty-free
  { hsCode: '2523.29', country: 'Kenya', originCountry: 'China', baseDutyRate: 25, vatRate: 16 },
  { hsCode: '7214.20', country: 'Kenya', originCountry: 'China', baseDutyRate: 25, vatRate: 16 },
  { hsCode: '8703.23', country: 'Kenya', originCountry: 'China', baseDutyRate: 25, vatRate: 16, exciseDuty: 20 },
  { hsCode: '4011.20', country: 'Kenya', originCountry: 'China', baseDutyRate: 25, vatRate: 16 },
  { hsCode: '1006.30', country: 'Kenya', originCountry: 'China', baseDutyRate: 35, vatRate: 16 },     // Rice higher duty
  { hsCode: '3923.10', country: 'Kenya', originCountry: 'China', baseDutyRate: 25, vatRate: 16 },
  { hsCode: '8429.51', country: 'Kenya', originCountry: 'China', baseDutyRate: 10, vatRate: 16 },
  { hsCode: '3004.90', country: 'Kenya', originCountry: 'China', baseDutyRate: 0, vatRate: 16 },

  // India → Kenya
  { hsCode: '5209.39', country: 'Kenya', originCountry: 'India', baseDutyRate: 25, vatRate: 16, preferentialRate: null },
  { hsCode: '3004.90', country: 'Kenya', originCountry: 'India', baseDutyRate: 0, vatRate: 16 },
  { hsCode: '1511.10', country: 'Kenya', originCountry: 'India', baseDutyRate: 10, vatRate: 16 },
  { hsCode: '1006.30', country: 'Kenya', originCountry: 'India', baseDutyRate: 35, vatRate: 16 },

  // Turkey → Kenya
  { hsCode: '5209.39', country: 'Kenya', originCountry: 'Turkey', baseDutyRate: 25, vatRate: 16 },
  { hsCode: '8450.11', country: 'Kenya', originCountry: 'Turkey', baseDutyRate: 25, vatRate: 16 },

  // China → Nigeria
  { hsCode: '5209.39', country: 'Nigeria', originCountry: 'China', baseDutyRate: 20, vatRate: 7.5 },
  { hsCode: '8517.13', country: 'Nigeria', originCountry: 'China', baseDutyRate: 5, vatRate: 7.5 },
  { hsCode: '8471.30', country: 'Nigeria', originCountry: 'China', baseDutyRate: 0, vatRate: 7.5 },
  { hsCode: '1006.30', country: 'Nigeria', originCountry: 'China', baseDutyRate: 30, vatRate: 7.5 },
  { hsCode: '8703.23', country: 'Nigeria', originCountry: 'China', baseDutyRate: 35, vatRate: 7.5, exciseDuty: 15 },

  // China → Tanzania
  { hsCode: '5209.39', country: 'Tanzania', originCountry: 'China', baseDutyRate: 25, vatRate: 18 },
  { hsCode: '8517.13', country: 'Tanzania', originCountry: 'China', baseDutyRate: 0, vatRate: 18 },
  { hsCode: '2523.29', country: 'Tanzania', originCountry: 'China', baseDutyRate: 25, vatRate: 18 },
  { hsCode: '1006.30', country: 'Tanzania', originCountry: 'China', baseDutyRate: 35, vatRate: 18 },

  // China → Uganda
  { hsCode: '5209.39', country: 'Uganda', originCountry: 'China', baseDutyRate: 25, vatRate: 18 },
  { hsCode: '8517.13', country: 'Uganda', originCountry: 'China', baseDutyRate: 0, vatRate: 18 },

  // China → South Africa
  { hsCode: '5209.39', country: 'South Africa', originCountry: 'China', baseDutyRate: 22, vatRate: 15 },
  { hsCode: '8517.13', country: 'South Africa', originCountry: 'China', baseDutyRate: 0, vatRate: 15 },
  { hsCode: '8703.23', country: 'South Africa', originCountry: 'China', baseDutyRate: 25, vatRate: 15 },
  { hsCode: '1006.30', country: 'South Africa', originCountry: 'China', baseDutyRate: 10, vatRate: 15 },
  { hsCode: '3004.90', country: 'South Africa', originCountry: 'China', baseDutyRate: 0, vatRate: 15 },
  { hsCode: '3923.10', country: 'South Africa', originCountry: 'China', baseDutyRate: 10, vatRate: 15 },

  // EAC intra-trade (Kenya → Uganda, Tanzania → Kenya, etc.) — preferential rates
  { hsCode: '5209.39', country: 'Uganda', originCountry: 'Kenya', baseDutyRate: 25, vatRate: 18, preferentialRate: 0, tradeAgreement: { name: 'EAC', rulesOfOrigin: 'Produced in EAC', requiresCertificateOfOrigin: true } },
  { hsCode: '2523.29', country: 'Uganda', originCountry: 'Kenya', baseDutyRate: 25, vatRate: 18, preferentialRate: 0, tradeAgreement: { name: 'EAC', rulesOfOrigin: 'Produced in EAC', requiresCertificateOfOrigin: true } },
  { hsCode: '1511.10', country: 'Kenya', originCountry: 'Tanzania', baseDutyRate: 10, vatRate: 16, preferentialRate: 0, tradeAgreement: { name: 'EAC', rulesOfOrigin: 'Produced in EAC', requiresCertificateOfOrigin: true } },
  { hsCode: '2523.29', country: 'Rwanda', originCountry: 'Kenya', baseDutyRate: 25, vatRate: 18, preferentialRate: 0, tradeAgreement: { name: 'EAC', rulesOfOrigin: 'Produced in EAC', requiresCertificateOfOrigin: true } },

  // COMESA preferential (Ethiopia → Kenya, Zambia → Kenya, etc.)
  { hsCode: '0901.11', country: 'Kenya', originCountry: 'Ethiopia', baseDutyRate: 10, vatRate: 16, preferentialRate: 0, tradeAgreement: { name: 'COMESA', rulesOfOrigin: 'Produced in COMESA member', requiresCertificateOfOrigin: true } },
];

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

const SEED_COMPLIANCE_RULES = [
  { country: 'Kenya', hsCode: '5209.39', ruleType: 'requires_license', description: 'Textile import permit required for commercial quantities exceeding 1000 meters', authority: 'Kenya Bureau of Standards (KEBS)', allowedWithDocuments: ['import_permit'] },
  { country: 'Kenya', hsCode: '1006.30', ruleType: 'restricted', description: 'Rice imports subject to import declaration and quality inspection', authority: 'KRA Customs', allowedWithDocuments: ['import_declaration', 'phytosanitary_cert'] },
  { country: 'Kenya', hsCode: '3004.90', ruleType: 'requires_license', description: 'Pharmaceutical imports require registration with Pharmacy and Poisons Board', authority: 'Pharmacy and Poisons Board (PPB)', allowedWithDocuments: ['import_permit', 'registration_cert'] },
  { country: 'Kenya', hsCode: '8703.23', ruleType: 'requires_license', description: 'Motor vehicle imports require pre-shipment inspection and registration', authority: 'NTSA, KRA', allowedWithDocuments: ['pre_shipment_inspection', 'import_declaration'] },
  { country: 'Nigeria', hsCode: '1006.30', ruleType: 'restricted', description: 'Rice imports subject to quota and import license requirements', authority: 'NAFDAC, Nigeria Customs Service', allowedWithDocuments: ['import_license', 'quota_allocation'] },
  { country: 'Nigeria', hsCode: '3004.90', ruleType: 'requires_license', description: 'Pharmaceuticals require NAFDAC registration', authority: 'NAFDAC', allowedWithDocuments: ['nafdac_registration'] },
  { country: 'Nigeria', hsCode: '0803.10', ruleType: 'requires_inspection', description: 'Plantains require phytosanitary certificate and port inspection', authority: 'Nigeria Agricultural Quarantine Service', allowedWithDocuments: ['phytosanitary_cert'] },
  { country: 'Tanzania', hsCode: '1006.30', ruleType: 'restricted', description: 'Rice imports require permit from Ministry of Agriculture', authority: 'Tanzania Food and Drugs Authority (TFDA)', allowedWithDocuments: ['import_permit'] },
  { country: 'Tanzania', hsCode: '7214.20', ruleType: 'requires_license', description: 'Steel imports require Tanzania Bureau of Standards verification', authority: 'TBS (Tanzania Bureau of Standards)', allowedWithDocuments: ['import_permit', 'quality_cert'] },
  { country: 'Uganda', hsCode: '2523.29', ruleType: 'requires_license', description: 'Cement imports require Uganda National Bureau of Standards certification', authority: 'UNBS', allowedWithDocuments: ['import_permit', 'quality_cert'] },
  { country: 'South Africa', hsCode: '1006.30', ruleType: 'requires_license', description: 'Rice imports require import permit from DALRRD', authority: 'Department of Agriculture, Land Reform and Rural Development', allowedWithDocuments: ['import_permit'] },
  { country: 'South Africa', hsCode: '8703.23', ruleType: 'requires_license', description: 'Used motor vehicles require import permit and compliance with SABS standards', authority: 'SABS, ITAC', allowedWithDocuments: ['import_permit', 'compliance_cert'] },
  { country: 'Kenya', hsCode: '7214.20', ruleType: 'requires_license', description: 'Steel products require KEBS quality certification', authority: 'KEBS', allowedWithDocuments: ['kebs_cert'] },
  { country: 'Kenya', hsCode: '4011.20', ruleType: 'requires_certificate', description: 'Tire imports require KEBS quality mark', authority: 'KEBS', allowedWithDocuments: ['kebs_cert'] },
  { country: 'Kenya', hsCode: '1511.10', ruleType: 'requires_license', description: 'Palm oil imports require registration with KEBS', authority: 'KEBS', allowedWithDocuments: ['import_permit', 'quality_cert'] },
  { country: 'Rwanda', hsCode: '2523.29', ruleType: 'requires_license', description: 'Cement imports require Rwanda Standards Board certification', authority: 'RSB (Rwanda Standards Board)', allowedWithDocuments: ['import_permit'] },
  { country: 'Uganda', hsCode: '1006.30', ruleType: 'requires_license', description: 'Rice imports require UNBS quality certification', authority: 'UNBS', allowedWithDocuments: ['import_permit', 'phytosanitary_cert'] },
  { country: 'Nigeria', hsCode: '8517.13', ruleType: 'requires_certificate', description: 'Smartphones require SON (Standards Organization of Nigeria) certification', authority: 'SON', allowedWithDocuments: ['son_cert'] },
  { country: 'Nigeria', hsCode: '8703.23', ruleType: 'restricted', description: 'Vehicles must be less than 15 years old for import into Nigeria', authority: 'Nigeria Customs Service', allowedWithDocuments: [] },
  { country: 'Kenya', hsCode: '4403.11', ruleType: 'requires_license', description: 'Timber imports require phytosanitary certificate and KFS approval', authority: 'Kenya Forest Service (KFS)', allowedWithDocuments: ['phytosanitary_cert', 'import_permit'] }
];

const SEED_TRADE_AGREEMENTS = [
  {
    name: 'African Continental Free Trade Area (AfCFTA)',
    shortName: 'AfCFTA',
    type: 'multilateral',
    memberCountries: ['Kenya', 'Nigeria', 'Tanzania', 'Uganda', 'Rwanda', 'South Africa', 'Ethiopia', 'Egypt', 'Ghana', "Côte d'Ivoire", 'Senegal', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia', 'Morocco', 'Tunisia', 'Mauritius', 'Cameroon', 'Kenya'],
    description: 'Pan-African trade agreement establishing a single continental market for goods and services. 90% of tariff lines will be liberalized over 5-10 years.',
    keyBenefits: [
      'Duty-free access for 90% of product categories',
      'Reduced non-tariff barriers',
      'Simplified customs procedures',
      'Rules of origin framework for qualifying products'
    ],
    rulesOfOrigin: {
      description: 'Goods must originate from an AfCFTA member state, with at least 35% local content value',
      localContentRequirement: 35,
      productSpecificRules: [
        { category: 'textiles', rule: 'Fabric must be woven in AfCFTA member state' },
        { category: 'vehicles', rule: 'At least 40% local content by value' },
        { category: 'electronics', rule: 'At least 30% local content by value' }
      ]
    },
    dutyReductionSchedule: {
      immediateDutyFree: ['non-sensitive', 'some industrial goods'],
      phasedReduction: [
        { category: 'sensitive industrial goods', yearsToZero: 5, currentRate: 10 },
        { category: 'agricultural products', yearsToZero: 10, currentRate: 15 }
      ],
      excludedProducts: ['weapons', 'ammunition', 'military equipment']
    },
    documentation: {
      requiresCertificateOfOrigin: true,
      certificateOfOriginFormat: 'AfCFTA Certificate of Origin',
      additionalDocuments: ['Commercial invoice', 'Packing list', 'Bill of lading']
    },
    isActive: true,
    effectiveDate: new Date('2021-01-01')
  },
  {
    name: 'East African Community Customs Union',
    shortName: 'EAC',
    type: 'regional',
    memberCountries: ['Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Burundi', 'South Sudan', 'DR Congo'],
    description: 'Customs union among East African Community partners. Goods originating from EAC member states trade duty-free.',
    keyBenefits: [
      'Duty-free trade on goods originating from EAC member states',
      'Common external tariff for non-EAC imports',
      'Simplified trade documentation',
      'One-stop border posts'
    ],
    rulesOfOrigin: {
      description: 'Goods must be produced within the EAC with at least 30% local content for third-country materials',
      localContentRequirement: 30,
      productSpecificRules: [
        { category: 'textiles', rule: 'Fabric woven in EAC from yarn originating in EAC' },
        { category: 'agricultural', rule: 'Wholly produced in EAC member state' }
      ]
    },
    dutyReductionSchedule: {
      immediateDutyFree: ['all originating goods within EAC'],
      phasedReduction: [],
      excludedProducts: ['arms and ammunition']
    },
    documentation: {
      requiresCertificateOfOrigin: true,
      certificateOfOriginFormat: 'EAC Certificate of Origin (Form EAC-CO)',
      additionalDocuments: ['Commercial invoice', 'Packing list']
    },
    isActive: true,
    effectiveDate: new Date('2005-01-01')
  },
  {
    name: 'COMESA Free Trade Area',
    shortName: 'COMESA',
    type: 'regional',
    memberCountries: ['Kenya', 'Uganda', 'Rwanda', 'Burundi', 'Ethiopia', 'Eritrea', 'Djibouti', 'DR Congo', 'Zambia', 'Zimbabwe', 'Malawi', 'Mauritius', 'Seychelles', 'Comoros', 'Madagascar', 'Egypt', 'Libya', 'Sudan', 'Tunisia'],
    description: 'Free trade area among COMESA member states. Tariffs eliminated on goods originating from member states.',
    keyBenefits: [
      'Zero duty on originating goods from COMESA members',
      'Common external tariff applied to non-COMESA imports',
      'Trade facilitation measures including simplified customs procedures',
      'Dispute resolution mechanism'
    ],
    rulesOfOrigin: {
      description: 'Goods must have at least 35% local content or sufficient processing in a COMESA member state',
      localContentRequirement: 35,
      productSpecificRules: [
        { category: 'textiles', rule: 'Fabric woven in COMESA from yarn originating in COMESA' },
        { category: 'agricultural', rule: 'Wholly produced in COMESA' }
      ]
    },
    dutyReductionSchedule: {
      immediateDutyFree: ['all originating goods from COMESA member states'],
      phasedReduction: [],
      excludedProducts: []
    },
    documentation: {
      requiresCertificateOfOrigin: true,
      certificateOfOriginFormat: 'COMESA Certificate of Origin',
      additionalDocuments: ['Commercial invoice', 'Packing list']
    },
    isActive: true,
    effectiveDate: new Date('2000-10-31')
  },
  {
    name: 'SADC Free Trade Area',
    shortName: 'SADC',
    type: 'regional',
    memberCountries: ['South Africa', 'Botswana', 'Namibia', 'Lesotho', 'Eswatini', 'Zimbabwe', 'Zambia', 'Malawi', 'Mozambique', 'Tanzania', 'DR Congo', 'Mauritius', 'Seychelles', 'Madagascar', 'Comoros'],
    description: 'Free trade area aimed at creating a fully integrated regional economy. Substantial progress on tariff liberalization among SADC members.',
    keyBenefits: [
      'Tariff reductions on goods originating from SADC members',
      'Trade facilitation programs',
      'Standards harmonization',
      'Simplified customs procedures'
    ],
    rulesOfOrigin: {
      description: 'Goods must have at least 35% local content in SADC member states',
      localContentRequirement: 35,
      productSpecificRules: []
    },
    dutyReductionSchedule: {
      immediateDutyFree: ['manufactured goods', 'processed agricultural products'],
      phasedReduction: [
        { category: 'sensitive products', yearsToZero: 8, currentRate: 15 },
        { category: 'automotive', yearsToZero: 12, currentRate: 20 }
      ],
      excludedProducts: ['certain agricultural products', 'used goods']
    },
    documentation: {
      requiresCertificateOfOrigin: true,
      certificateOfOriginFormat: 'SADC Certificate of Origin (Form SADC-CO)',
      additionalDocuments: ['Commercial invoice', 'Transport document']
    },
    isActive: true,
    effectiveDate: new Date('2008-08-17')
  }
];

const SEED_DOCUMENT_TEMPLATES = [
  {
    type: 'commercial_invoice',
    country: 'general',
    name: 'Standard Commercial Invoice',
    description: 'Standard commercial invoice for international trade shipments',
    fields: [
      { fieldName: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: true, autoFill: true, autoFillField: 'shipmentId' },
      { fieldName: 'date', label: 'Date', type: 'date', required: true, autoFill: true, autoFillField: 'createdAt' },
      { fieldName: 'sellerName', label: 'Seller Name', type: 'text', required: true },
      { fieldName: 'sellerAddress', label: 'Seller Address', type: 'text', required: true },
      { fieldName: 'buyerName', label: 'Buyer Name', type: 'text', required: true },
      { fieldName: 'buyerAddress', label: 'Buyer Address', type: 'text', required: true },
      { fieldName: 'billToName', label: 'Bill To Name', type: 'text' },
      { fieldName: 'shipToName', label: 'Ship To Name', type: 'text' },
      { fieldName: 'incoterm', label: 'Incoterm', type: 'select', required: true, options: ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] },
      { fieldName: 'originCountry', label: 'Country of Origin', type: 'text', required: true },
      { fieldName: 'destinationCountry', label: 'Destination Country', type: 'text', required: true },
      { fieldName: 'portOfLoading', label: 'Port of Loading', type: 'text', required: true },
      { fieldName: 'portOfDischarge', label: 'Port of Discharge', type: 'text', required: true },
      { fieldName: 'vesselFlight', label: 'Vessel/Flight Number', type: 'text' },
      { fieldName: 'itemDescription', label: 'Item Description', type: 'text', required: true },
      { fieldName: 'hsCode', label: 'HS Code', type: 'text', required: true },
      { fieldName: 'quantity', label: 'Quantity', type: 'number', required: true },
      { fieldName: 'unit', label: 'Unit', type: 'text' },
      { fieldName: 'unitPrice', label: 'Unit Price (USD)', type: 'currency', required: true },
      { fieldName: 'totalAmount', label: 'Total Amount (USD)', type: 'currency', required: true },
      { fieldName: 'currency', label: 'Currency', type: 'text' },
      { fieldName: 'paymentTerms', label: 'Payment Terms', type: 'text' },
      { fieldName: 'remarks', label: 'Remarks', type: 'text' }
    ],
    sections: [
      { title: 'Header Information', order: 1, fields: ['invoiceNumber', 'date'] },
      { title: 'Parties', order: 2, fields: ['sellerName', 'sellerAddress', 'buyerName', 'buyerAddress', 'billToName', 'shipToName'] },
      { title: 'Transport Details', order: 3, fields: ['incoterm', 'originCountry', 'destinationCountry', 'portOfLoading', 'portOfDischarge', 'vesselFlight'] },
      { title: 'Goods Description', order: 4, fields: ['itemDescription', 'hsCode', 'quantity', 'unit', 'unitPrice', 'totalAmount', 'currency'] },
      { title: 'Terms', order: 5, fields: ['paymentTerms', 'remarks'] }
    ],
    isActive: true
  },
  {
    type: 'packing_list',
    country: 'general',
    name: 'Standard Packing List',
    description: 'Packing list detailing contents of each package in shipment',
    fields: [
      { fieldName: 'documentNumber', label: 'Document Number', type: 'text', required: true, autoFill: true, autoFillField: 'shipmentId' },
      { fieldName: 'date', label: 'Date', type: 'date', required: true, autoFill: true, autoFillField: 'createdAt' },
      { fieldName: 'sellerName', label: 'Seller Name', type: 'text', required: true },
      { fieldName: 'buyerName', label: 'Buyer Name', type: 'text', required: true },
      { fieldName: 'incoterm', label: 'Incoterm', type: 'select', options: ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] },
      { fieldName: 'packageCount', label: 'Number of Packages', type: 'number', required: true },
      { fieldName: 'totalNetWeight', label: 'Total Net Weight (kg)', type: 'number', required: true },
      { fieldName: 'totalGrossWeight', label: 'Total Gross Weight (kg)', type: 'number', required: true },
      { fieldName: 'totalVolume', label: 'Total Volume (m³)', type: 'number' },
      { fieldName: 'markingsNumbers', label: 'Marks & Numbers', type: 'text' },
      { fieldName: 'packageDetails', label: 'Package Details (JSON)', type: 'text' }
    ],
    sections: [
      { title: 'Header', order: 1, fields: ['documentNumber', 'date'] },
      { title: 'Parties', order: 2, fields: ['sellerName', 'buyerName'] },
      { title: 'Package Summary', order: 3, fields: ['packageCount', 'totalNetWeight', 'totalGrossWeight', 'totalVolume', 'markingsNumbers', 'packageDetails'] }
    ],
    isActive: true
  },
  {
    type: 'certificate_of_origin',
    country: 'general',
    name: 'Standard Certificate of Origin',
    description: 'Certificate of Origin for duty preference claims',
    fields: [
      { fieldName: 'certificateNumber', label: 'Certificate Number', type: 'text', required: true },
      { fieldName: 'exporterName', label: 'Exporter Name', type: 'text', required: true },
      { fieldName: 'consigneeName', label: 'Consignee Name', type: 'text', required: true },
      { fieldName: 'transportDetails', label: 'Transport Details', type: 'text' },
      { fieldName: 'originCountry', label: 'Country of Origin', type: 'text', required: true },
      { fieldName: 'destinationCountry', label: 'Destination Country', type: 'text', required: true },
      { fieldName: 'tradeAgreement', label: 'Trade Agreement (if applicable)', type: 'select', options: ['AfCFTA', 'EAC', 'COMESA', 'SADC', 'General / None'] },
      { fieldName: 'blNumber', label: 'Bill of Lading Number', type: 'text' },
      { fieldName: 'itemDetails', label: 'Item Details (JSON)', type: 'text', required: true },
      { fieldName: 'originCriterion', label: 'Origin Criterion', type: 'select', required: true, options: ['Wholly obtained', 'Sufficiently processed (≥35% local)', 'Sufficiently processed (≥30% local for EAC)'] }
    ],
    sections: [
      { title: 'Certificate Info', order: 1, fields: ['certificateNumber', 'exporterName', 'consigneeName'] },
      { title: 'Transport & Origin', order: 2, fields: ['transportDetails', 'originCountry', 'destinationCountry', 'tradeAgreement', 'blNumber'] },
      { title: 'Goods & Origin', order: 3, fields: ['itemDetails', 'originCriterion'] }
    ],
    isActive: true
  },
  {
    type: 'bill_of_lading',
    country: 'general',
    name: 'Standard Bill of Lading',
    description: 'Ocean Bill of Lading for containerized cargo',
    fields: [
      { fieldName: 'blNumber', label: 'Bill of Lading Number', type: 'text', required: true },
      { fieldName: 'shipperName', label: 'Shipper Name', type: 'text', required: true },
      { fieldName: 'consigneeName', label: 'Consignee Name', type: 'text', required: true },
      { fieldName: 'notifyParty', label: 'Notify Party', type: 'text' },
      { fieldName: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
      { fieldName: 'voyageNumber', label: 'Voyage Number', type: 'text' },
      { fieldName: 'portOfLoading', label: 'Port of Loading', type: 'text', required: true },
      { fieldName: 'portOfDischarge', label: 'Port of Discharge', type: 'text', required: true },
      { fieldName: 'placeOfDelivery', label: 'Place of Delivery', type: 'text' },
      { fieldName: 'containerNumbers', label: 'Container Numbers', type: 'text', required: true },
      { fieldName: 'sealNumbers', label: 'Seal Numbers', type: 'text' },
      { fieldName: 'containerType', label: 'Container Type', type: 'select', options: ['20ft', '40ft', '40ft HC', '45ft', '20ft Reefer', '40ft Reefer', 'LCL'] },
      { fieldName: 'grossWeight', label: 'Gross Weight (kg)', type: 'number', required: true },
      { fieldName: 'cargoVolume', label: 'Cargo Volume (m³)', type: 'number' },
      { fieldName: 'numberOfPackages', label: 'Number of Packages', type: 'number', required: true },
      { fieldName: 'descriptionOfGoods', label: 'Description of Goods', type: 'text', required: true },
      { fieldName: 'hsCode', label: 'HS Code', type: 'text' },
      { fieldName: 'freightCharge', label: 'Freight Charge', type: 'currency' },
      { fieldName: 'freightPayableAt', label: 'Freight Payable At', type: 'text' },
      { fieldName: 'placeOfIssue', label: 'Place of Issue', type: 'text' },
      { fieldName: 'dateOfIssue', label: 'Date of Issue', type: 'date', required: true }
    ],
    sections: [
      { title: 'Document Info', order: 1, fields: ['blNumber', 'dateOfIssue', 'placeOfIssue'] },
      { title: 'Parties', order: 2, fields: ['shipperName', 'consigneeName', 'notifyParty'] },
      { title: 'Voyage Details', order: 3, fields: ['vesselName', 'voyageNumber', 'portOfLoading', 'portOfDischarge', 'placeOfDelivery'] },
      { title: 'Cargo Details', order: 4, fields: ['containerNumbers', 'sealNumbers', 'containerType', 'numberOfPackages', 'grossWeight', 'cargoVolume', 'descriptionOfGoods', 'hsCode'] },
      { title: 'Freight', order: 5, fields: ['freightCharge', 'freightPayableAt'] }
    ],
    isActive: true
  },
  {
    type: 'import_declaration',
    country: 'Kenya',
    name: 'Kenya Import Declaration (KRA Customs Entry)',
    description: 'Kenya Revenue Authority customs entry declaration for imported goods',
    fields: [
      { fieldName: 'entryNumber', label: 'Entry Number', type: 'text', required: true },
      { fieldName: 'importerName', label: 'Importer Name/Company', type: 'text', required: true },
      { fieldName: 'importerPIN', label: 'KRA PIN', type: 'text', required: true },
      { fieldName: 'customsAgentCode', label: 'Customs Agent Code', type: 'text' },
      { fieldName: 'countryOfOrigin', label: 'Country of Origin', type: 'text', required: true },
      { fieldName: 'countryOfExport', label: 'Country of Export', type: 'text', required: true },
      { fieldName: 'portOfEntry', label: 'Port of Entry', type: 'text', required: true },
      { fieldName: 'blNumber', label: 'Bill of Lading/AWB Number', type: 'text', required: true },
      { fieldName: 'hsCode', label: 'HS Code (10-digit)', type: 'text', required: true },
      { fieldName: 'productDescription', label: 'Product Description', type: 'text', required: true },
      { fieldName: 'quantity', label: 'Quantity', type: 'number', required: true },
      { fieldName: 'unit', label: 'Unit of Measure', type: 'text', required: true },
      { fieldName: 'cifValue', label: 'CIF Value (KSh)', type: 'currency', required: true },
      { fieldName: 'dutyRate', label: 'Duty Rate (%)', type: 'number', required: true },
      { fieldName: 'dutyAmount', label: 'Duty Amount (KSh)', type: 'currency' },
      { fieldName: 'vatAmount', label: 'VAT Amount (KSh)', type: 'currency' },
      { fieldName: 'exciseAmount', label: 'Excise Duty (KSh)', type: 'currency' },
      { fieldName: 'totalTaxes', label: 'Total Taxes & Duties (KSh)', type: 'currency' },
      { fieldName: 'containerNumbers', label: 'Container Numbers', type: 'text' },
      { fieldName: 'sealNumber', label: 'Seal Number', type: 'text' },
      { fieldName: 'declarantName', label: 'Declarant Name', type: 'text', required: true },
      { fieldName: 'declarationDate', label: 'Declaration Date', type: 'date', required: true }
    ],
    sections: [
      { title: 'Entry Details', order: 1, fields: ['entryNumber', 'declarationDate', 'declarantName'] },
      { title: 'Importer Information', order: 2, fields: ['importerName', 'importerPIN', 'customsAgentCode'] },
      { title: 'Shipment Details', order: 3, fields: ['countryOfOrigin', 'countryOfExport', 'portOfEntry', 'blNumber', 'containerNumbers', 'sealNumber'] },
      { title: 'Goods Details', order: 4, fields: ['hsCode', 'productDescription', 'quantity', 'unit'] },
      { title: 'Valuation & Duties', order: 5, fields: ['cifValue', 'dutyRate', 'dutyAmount', 'vatAmount', 'exciseAmount', 'totalTaxes'] }
    ],
    isActive: true
  },
  {
    type: 'single_administrative_document',
    country: 'EAC',
    name: 'EAC Single Administrative Document',
    description: 'Common customs declaration form for EAC member states',
    fields: [
      { fieldName: 'documentReference', label: 'Document Reference', type: 'text', required: true },
      { fieldName: 'declarationType', label: 'Declaration Type', type: 'select', required: true, options: ['Import', 'Export', 'Transit', 'Warehouse'] },
      { fieldName: 'declarantName', label: 'Declarant Name', type: 'text', required: true },
      { fieldName: 'declarantID', label: 'Declarant Tax ID', type: 'text', required: true },
      { fieldName: 'importerExporterName', label: 'Importer/Exporter Name', type: 'text', required: true },
      { fieldName: 'importerExporterID', label: 'Importer/Exporter Tax ID', type: 'text', required: true },
      { fieldName: 'originCountry', label: 'Country of Origin', type: 'text', required: true },
      { fieldName: 'exportCountry', label: 'Country of Export', type: 'text', required: true },
      { fieldName: 'destinationCountry', label: 'Destination Country', type: 'text', required: true },
      { fieldName: 'transportMode', label: 'Transport Mode', type: 'select', required: true, options: ['Sea', 'Air', 'Road', 'Rail', 'Inland Waterway'] },
      { fieldName: 'containerNumbers', label: 'Container Numbers', type: 'text' },
      { fieldName: 'hsCode', label: 'HS Code (10-digit)', type: 'text', required: true },
      { fieldName: 'productDescription', label: 'Product Description', type: 'text', required: true },
      { fieldName: 'quantity', label: 'Quantity', type: 'number', required: true },
      { fieldName: 'grossWeight', label: 'Gross Weight (kg)', type: 'number', required: true },
      { fieldName: 'netWeight', label: 'Net Weight (kg)', type: 'number', required: true },
      { fieldName: 'invoiceAmount', label: 'Invoice Amount', type: 'currency', required: true },
      { fieldName: 'invoiceCurrency', label: 'Invoice Currency', type: 'text', required: true },
      { fieldName: 'freightCharges', label: 'Freight Charges', type: 'currency' },
      { fieldName: 'insuranceCharges', label: 'Insurance Charges', type: 'currency' },
      { fieldName: 'cifValue', label: 'CIF Value', type: 'currency', required: true },
      { fieldName: 'declarationDate', label: 'Declaration Date', type: 'date', required: true }
    ],
    sections: [
      { title: 'Declaration Info', order: 1, fields: ['documentReference', 'declarationType', 'declarationDate'] },
      { title: 'Parties', order: 2, fields: ['declarantName', 'declarantID', 'importerExporterName', 'importerExporterID'] },
      { title: 'Route & Transport', order: 3, fields: ['originCountry', 'exportCountry', 'destinationCountry', 'transportMode', 'containerNumbers'] },
      { title: 'Goods Description', order: 4, fields: ['hsCode', 'productDescription', 'quantity', 'grossWeight', 'netWeight'] },
      { title: 'Valuation', order: 5, fields: ['invoiceAmount', 'invoiceCurrency', 'freightCharges', 'insuranceCharges', 'cifValue'] }
    ],
    isActive: true
  }
];

// ===== INITIALIZATION =====

async function startCustomsEngineService() {
  try {
    logger.info('Initializing Cross-Border Customs Engine Service...');

    // Seed data if collections are empty
    await seedData();

    initialized = true;
    logger.info('Cross-Border Customs Engine Service started successfully');
    return true;
  } catch (error) {
    logger.error('Customs Engine: Failed to initialize:', error.message);
    initialized = false;
    return false;
  }
}

async function seedData() {
  try {
    const hsCount = await CustomHSCode.countDocuments();
    if (hsCount === 0) {
      await CustomHSCode.insertMany(SEED_HS_CODES);
      logger.info(`Customs Engine: Seeded ${SEED_HS_CODES.length} HS codes`);
    }

    const tariffCount = await TariffSchedule.countDocuments();
    if (tariffCount === 0) {
      await TariffSchedule.insertMany(SEED_TARIFFS);
      logger.info(`Customs Engine: Seeded ${SEED_TARIFFS.length} tariff schedules`);
    }

    const routeCount = await CustomsRoute.countDocuments();
    if (routeCount === 0) {
      await CustomsRoute.insertMany(SEED_ROUTES);
      logger.info(`Customs Engine: Seeded ${SEED_ROUTES.length} customs routes`);
    }

    const complianceCount = await ComplianceRule.countDocuments();
    if (complianceCount === 0) {
      await ComplianceRule.insertMany(SEED_COMPLIANCE_RULES);
      logger.info(`Customs Engine: Seeded ${SEED_COMPLIANCE_RULES.length} compliance rules`);
    }

    const agreementCount = await TradeAgreement.countDocuments();
    if (agreementCount === 0) {
      await TradeAgreement.insertMany(SEED_TRADE_AGREEMENTS);
      logger.info(`Customs Engine: Seeded ${SEED_TRADE_AGREEMENTS.length} trade agreements`);
    }

    const templateCount = await DocumentTemplate.countDocuments();
    if (templateCount === 0) {
      await DocumentTemplate.insertMany(SEED_DOCUMENT_TEMPLATES);
      logger.info(`Customs Engine: Seeded ${SEED_DOCUMENT_TEMPLATES.length} document templates`);
    }
  } catch (error) {
    logger.error('Customs Engine: Error seeding data:', error.message);
  }
}

// ===== HS CODE CLASSIFIER =====

/**
 * Classify product by description — returns best HS code match with confidence
 */
async function classifyHS(productDescription, productCategory) {
  try {
    const query = { isActive: true };

    // If category provided, filter by it
    if (productCategory) {
      query.category = productCategory;
    }

    const allCodes = await CustomHSCode.find(query);

    // Score each HS code based on keyword matching
    const scored = allCodes.map(hs => {
      let score = 0;
      const desc = productDescription.toLowerCase();
      const keywords = hs.keywords || [];

      // Match keywords
      for (const kw of keywords) {
        if (desc.includes(kw.toLowerCase())) {
          score += 10;
        }
      }

      // Match partial keywords
      for (const kw of keywords) {
        const parts = kw.toLowerCase().split(/\s+/);
        for (const part of parts) {
          if (part.length > 3 && desc.includes(part)) {
            score += 3;
          }
        }
      }

      // Boost for matching description
      if (desc.includes(hs.description.toLowerCase().slice(0, 20))) {
        score += 15;
      }

      // Boost for matching category
      if (productCategory && hs.category === productCategory) {
        score += 5;
      }

      return { hs, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Filter to meaningful matches
    const matches = scored.filter(s => s.score > 0).slice(0, 5);

    if (matches.length === 0) {
      // Return top codes in the most likely category based on description
      return {
        success: true,
        matches: [],
        message: 'No confident match found. Try providing more detail or a product category.',
        suggestion: suggestCategory(productDescription)
      };
    }

    const topScore = matches[0].score;
    const maxPossibleScore = 50; // Heuristic maximum

    return {
      success: true,
      matches: matches.map(m => ({
        code: m.hs.code,
        chapter: m.hs.chapter,
        heading: m.hs.heading,
        description: m.hs.description,
        category: m.hs.category,
        confidence: Math.min(100, Math.round((m.score / maxPossibleScore) * 100)),
        score: m.score,
        restrictions: m.hs.restrictions
      })),
      topMatch: {
        code: matches[0].hs.code,
        description: matches[0].hs.description,
        category: matches[0].hs.category,
        confidence: Math.min(100, Math.round((topScore / maxPossibleScore) * 100))
      },
      totalCandidatesChecked: allCodes.length
    };
  } catch (error) {
    logger.error('Customs Engine: HS classification error:', error.message);
    return { success: false, error: error.message };
  }
}

function suggestCategory(description) {
  const desc = description.toLowerCase();
  if (desc.match(/textile|fabric|cloth|yarn|cotton|silk|wool|garment|apparel|shirt|dress|uniform/)) return 'textiles';
  if (desc.match(/phone|smartphone|electronic|computer|laptop|tv|television|camera|speaker|headphone/)) return 'electronics';
  if (desc.match(/machine|engine|pump|compressor|valve|generator|motor|turbine/)) return 'machinery';
  if (desc.match(/food|rice|flour|oil|sugar|coffee|tea|spice|cocoa|beverage|drink|fruit|vegetable|grain/)) return 'food_beverage';
  if (desc.match(/chemical|acid|base|solvent|fertilizer|pesticide|soap|detergent|plastic|polymer/)) return 'chemicals';
  if (desc.match(/cement|steel|iron|brick|tile|pipe|rebar|concrete|timber|wood|plywood/)) return 'construction';
  if (desc.match(/car|vehicle|truck|motorcycle|auto|bus|tire|tyre|battery|tractor/)) return 'vehicles';
  if (desc.match(/pharma|medicine|drug|tablet|capsule|vaccine|medical/)) return 'pharmaceuticals';
  if (desc.match(/agriculture|crop|seed|fertilizer|pesticide|livestock|feed|grain/)) return 'agricultural';
  return 'other';
}

/**
 * Search HS codes by query string
 */
async function searchHSCodes(query, category, limit = 20) {
  try {
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { code: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { keywords: { $regex: escaped, $options: 'i' } }
      ];
    }

    const codes = await CustomHSCode.find(filter)
      .sort({ code: 1 })
      .limit(limit);

    const total = await CustomHSCode.countDocuments(filter);

    return {
      success: true,
      data: codes,
      total,
      limit
    };
  } catch (error) {
    logger.error('Customs Engine: HS code search error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get HS code detail by code
 */
async function getHSCodeDetail(code) {
  try {
    const hsCode = await CustomHSCode.findOne({ code, isActive: true });
    if (!hsCode) {
      return { success: false, error: 'HS Code not found' };
    }
    return { success: true, data: hsCode };
  } catch (error) {
    logger.error('Customs Engine: HS code detail error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== DUTY CALCULATOR =====

/**
 * Calculate duties and taxes for a shipment
 */
async function calculateDuty(data) {
  try {
    const {
      hsCode,
      originCountry,
      destinationCountry,
      invoiceAmount,
      invoiceCurrency = 'USD',
      freightCost = 0,
      insuranceCost = 0,
      quantity = 1,
      unit = 'pieces',
      weightKg,
      incoterm = 'CIF'
    } = data;

    if (!hsCode) return { success: false, error: 'HS Code is required' };
    if (!originCountry) return { success: false, error: 'Origin country is required' };
    if (!destinationCountry) return { success: false, error: 'Destination country is required' };
    if (!invoiceAmount) return { success: false, error: 'Invoice amount is required' };

    // Look up tariff schedule
    let tariff = await TariffSchedule.findOne({
      hsCode,
      country: destinationCountry,
      originCountry,
      isActive: true
    });

    if (!tariff) {
      // Try to find a base duty rate for this HS code and destination
      tariff = await TariffSchedule.findOne({
        hsCode,
        country: destinationCountry,
        isActive: true
      });

      if (!tariff) {
        // Estimate based on category average
        const hsCodeDoc = await CustomHSCode.findOne({ code: hsCode });
        const estimatedRate = estimateDutyRate(hsCodeDoc?.category, destinationCountry);

        return {
          success: true,
          estimated: true,
          message: 'Exact tariff not found. Used estimated rate based on product category.',
          calculation: buildDutyCalculation({
            hsCode, originCountry, destinationCountry, invoiceAmount,
            freightCost, insuranceCost, incoterm,
            dutyRate: estimatedRate.rate,
            vatRate: estimatedRate.vat,
            estimated: true
          })
        };
      }
    }

    // Determine applicable rate (preferential if available and qualifying)
    const applicableRate = (tariff.preferentialRate !== null && tariff.preferentialRate !== undefined)
      ? tariff.preferentialRate
      : tariff.baseDutyRate;

    const tradeAgreementApplied = tariff.preferentialRate !== null && tariff.preferentialRate !== undefined
      ? tariff.tradeAgreement?.name || null
      : null;

    const savings = tradeAgreementApplied
      ? ((tariff.baseDutyRate - tariff.preferentialRate) / 100) * invoiceAmount
      : 0;

    // Calculate CIF value
    let cifValue = invoiceAmount;
    if (incoterm === 'FOB') {
      cifValue = invoiceAmount + (freightCost || 0) + (insuranceCost || 0);
    } else if (incoterm === 'EXW') {
      cifValue = invoiceAmount + (freightCost || 0) + (insuranceCost || 0);
    }
    // CIF already includes freight + insurance

    const dutyAmount = (applicableRate / 100) * cifValue;
    const vatAmount = (tariff.vatRate / 100) * (cifValue + dutyAmount);
    const exciseAmount = (tariff.exciseDuty || 0) / 100 * cifValue;

    // Other taxes
    let otherTaxesTotal = 0;
    const otherTaxes = (tariff.otherTaxes || []).map(tax => {
      const amount = (tax.rate / 100) * cifValue;
      otherTaxesTotal += amount;
      return { name: tax.name, rate: tax.rate, amount: Math.round(amount * 100) / 100 };
    });

    // Processing fee (standard 1% or minimum $50)
    const processingFee = Math.max(50, cifValue * 0.01);

    const totalTaxesAndDuties = dutyAmount + vatAmount + exciseAmount + otherTaxesTotal + processingFee;

    const calculation = {
      hsCode,
      originCountry,
      destinationCountry,
      incoterm,
      invoiceAmount,
      invoiceCurrency,
      freightCost: freightCost || 0,
      insuranceCost: insuranceCost || 0,
      cifValue: Math.round(cifValue * 100) / 100,
      dutyRate: applicableRate,
      dutyAmount: Math.round(dutyAmount * 100) / 100,
      vatRate: tariff.vatRate,
      vatAmount: Math.round(vatAmount * 100) / 100,
      exciseDuty: tariff.exciseDuty || 0,
      exciseAmount: Math.round(exciseAmount * 100) / 100,
      otherTaxes,
      processingFee: Math.round(processingFee * 100) / 100,
      totalTaxesAndDuties: Math.round(totalTaxesAndDuties * 100) / 100,
      totalLandedCost: Math.round((cifValue + totalTaxesAndDuties) * 100) / 100,
      effectiveTaxRate: Math.round((totalTaxesAndDuties / cifValue) * 100 * 10) / 10,
      currency: invoiceCurrency,
      tradeAgreement: tariff.tradeAgreement?.name || null,
      preferentialRate: tariff.preferentialRate,
      savingsUnderAgreement: Math.round(savings * 100) / 100,
      estimated: false,
      calculatedAt: new Date().toISOString()
    };

    // Calculate breakdown by country for easy reference
    calculation.breakdown = [
      { label: 'Invoice Value', amount: invoiceAmount, percentage: (invoiceAmount / calculation.totalLandedCost * 100).toFixed(1) },
      { label: 'Freight & Insurance', amount: freightCost + insuranceCost, percentage: ((freightCost + insuranceCost) / calculation.totalLandedCost * 100).toFixed(1) },
      { label: 'Customs Duty', amount: calculation.dutyAmount, percentage: (calculation.dutyAmount / calculation.totalLandedCost * 100).toFixed(1) },
      { label: 'VAT/GST', amount: calculation.vatAmount, percentage: (calculation.vatAmount / calculation.totalLandedCost * 100).toFixed(1) }
    ];

    if (calculation.exciseAmount > 0) {
      calculation.breakdown.push({ label: 'Excise Duty', amount: calculation.exciseAmount, percentage: (calculation.exciseAmount / calculation.totalLandedCost * 100).toFixed(1) });
    }

    if (otherTaxes.length > 0) {
      calculation.breakdown.push({ label: 'Other Taxes', amount: otherTaxesTotal, percentage: (otherTaxesTotal / calculation.totalLandedCost * 100).toFixed(1) });
    }

    calculation.breakdown.push({ label: 'Processing Fee', amount: calculation.processingFee, percentage: (calculation.processingFee / calculation.totalLandedCost * 100).toFixed(1) });

    return { success: true, calculation };
  } catch (error) {
    logger.error('Customs Engine: Duty calculation error:', error.message);
    return { success: false, error: error.message };
  }
}

function estimateDutyRate(category, country) {
  const baseRates = {
    textiles: { rate: 25, vat: 16 },
    electronics: { rate: 5, vat: 16 },
    machinery: { rate: 10, vat: 16 },
    food_beverage: { rate: 20, vat: 16 },
    chemicals: { rate: 10, vat: 16 },
    construction: { rate: 25, vat: 16 },
    vehicles: { rate: 25, vat: 16 },
    plastics: { rate: 15, vat: 16 },
    metals: { rate: 10, vat: 16 },
    agricultural: { rate: 15, vat: 16 },
    pharmaceuticals: { rate: 0, vat: 16 },
    footwear: { rate: 25, vat: 16 },
    furniture: { rate: 20, vat: 16 },
    paper: { rate: 10, vat: 16 },
    wood: { rate: 10, vat: 16 }
  };

  const countryVat = {
    'Kenya': 16, 'Nigeria': 7.5, 'Tanzania': 18, 'Uganda': 18,
    'Rwanda': 18, 'South Africa': 15, 'Ethiopia': 15, 'Egypt': 14,
    'Ghana': 12.5, "Côte d'Ivoire": 18, 'Senegal': 18, 'Zambia': 16,
    'Zimbabwe': 14.5, 'Botswana': 12, 'Namibia': 15, 'Morocco': 20,
    'Tunisia': 19, 'Mauritius': 15, 'Cameroon': 19.25, 'DR Congo': 16
  };

  const rate = baseRates[category] || { rate: 15, vat: 16 };
  rate.vat = countryVat[country] || 16;
  return rate;
}

function buildDutyCalculation(data) {
  const { hsCode, originCountry, destinationCountry, invoiceAmount, freightCost, insuranceCost, incoterm, dutyRate, vatRate, estimated } = data;

  let cifValue = invoiceAmount;
  if (incoterm === 'FOB' || incoterm === 'EXW') {
    cifValue = invoiceAmount + freightCost + insuranceCost;
  }

  const dutyAmount = (dutyRate / 100) * cifValue;
  const vatAmount = (vatRate / 100) * (cifValue + dutyAmount);
  const processingFee = Math.max(50, cifValue * 0.01);
  const total = dutyAmount + vatAmount + processingFee;

  return {
    hsCode, originCountry, destinationCountry, incoterm,
    invoiceAmount, freightCost, insuranceCost,
    cifValue: Math.round(cifValue * 100) / 100,
    dutyRate, dutyAmount: Math.round(dutyAmount * 100) / 100,
    vatRate, vatAmount: Math.round(vatAmount * 100) / 100,
    processingFee: Math.round(processingFee * 100) / 100,
    totalTaxesAndDuties: Math.round(total * 100) / 100,
    totalLandedCost: Math.round((cifValue + total) * 100) / 100,
    effectiveTaxRate: Math.round((total / cifValue) * 100 * 10) / 10,
    estimated
  };
}

// ===== DOCUMENT GENERATOR =====

/**
 * Generate a customs document for a shipment
 */
async function generateDocument(shipmentId, documentType) {
  try {
    const shipment = await CustomsShipment.findOne({ shipmentId });
    if (!shipment) return { success: false, error: 'Shipment not found' };

    // Find the template
    const template = await DocumentTemplate.findOne({
      type: documentType,
      $or: [
        { country: shipment.destinationCountry },
        { country: 'general' }
      ],
      isActive: true
    }).sort({ country: -1 }); // Prefer country-specific over general

    if (!template) {
      return { success: false, error: `No document template found for type: ${documentType}` };
    }

    // Generate document content from shipment data
    const content = {};
    for (const field of template.fields) {
      if (field.autoFill && field.autoFillField) {
        // Map from shipment data
        const path = field.autoFillField;
        content[field.fieldName] = getNestedValue(shipment, path) || '';
      } else {
        content[field.fieldName] = '';
      }
    }

    // Fill in known values
    content.originCountry = shipment.originCountry;
    content.destinationCountry = shipment.destinationCountry;
    content.hsCode = shipment.hsCode;
    content.productDescription = shipment.productDescription;
    content.quantity = shipment.quantity;
    content.unit = shipment.unit;
    content.incoterm = shipment.incoterm;
    content.invoiceAmount = shipment.invoiceValue?.amount;
    content.currency = shipment.invoiceValue?.currency;

    if (documentType === 'commercial_invoice') {
      content.invoiceNumber = `INV-${shipmentId}`;
      content.date = new Date().toISOString().split('T')[0];
    }

    if (documentType === 'bill_of_lading') {
      content.blNumber = `BL-${shipmentId}`;
      content.dateOfIssue = new Date().toISOString().split('T')[0];
    }

    if (documentType === 'packing_list') {
      content.documentNumber = `PL-${shipmentId}`;
      content.date = new Date().toISOString().split('T')[0];
    }

    // Add to shipment documents
    const docEntry = {
      type: documentType,
      documentNumber: content.invoiceNumber || content.blNumber || content.documentNumber || `${documentType.toUpperCase()}-${shipmentId}`,
      status: 'generated',
      content,
      generatedAt: new Date()
    };

    shipment.documents.push(docEntry);
    shipment.status = 'documents_generated';
    await shipment.save();

    return {
      success: true,
      data: {
        documentType,
        documentNumber: docEntry.documentNumber,
        status: 'generated',
        content,
        template: {
          name: template.name,
          version: template.version
        },
        sections: template.sections
      }
    };
  } catch (error) {
    logger.error('Customs Engine: Document generation error:', error.message);
    return { success: false, error: error.message };
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * List available document templates
 */
async function getDocumentTemplates(country) {
  try {
    const filter = { isActive: true };
    if (country) {
      filter.$or = [
        { country },
        { country: 'general' }
      ];
    }

    const templates = await DocumentTemplate.find(filter)
      .select('type country name description fields sections format version')
      .sort({ type: 1, country: 1 });

    // Group by type
    const grouped = templates.reduce((acc, t) => {
      if (!acc[t.type]) acc[t.type] = [];
      acc[t.type].push(t);
      return acc;
    }, {});

    return {
      success: true,
      data: templates,
      grouped,
      total: templates.length
    };
  } catch (error) {
    logger.error('Customs Engine: Document templates error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== COMPLIANCE CHECKER =====

/**
 * Check compliance for a product in a destination country
 */
async function checkCompliance(hsCode, destinationCountry) {
  try {
    if (!hsCode || !destinationCountry) {
      return { success: false, error: 'HS Code and destination country are required' };
    }

    const rules = await ComplianceRule.find({
      hsCode,
      country: destinationCountry,
      isActive: true
    });

    // Also check broader chapter-level rules
    const chapter = hsCode.split('.')[0];
    const chapterRules = await ComplianceRule.find({
      hsCode: { $regex: `^${chapter}` },
      country: destinationCountry,
      isActive: true
    });

    const allRules = [...rules, ...chapterRules.filter(r => !rules.some(er => er._id.equals(r._id)))];

    const result = {
      hsCode,
      country: destinationCountry,
      status: 'compliant',
      checks: allRules.map(rule => ({
        ruleType: rule.ruleType,
        description: rule.description,
        authority: rule.authority,
        referenceRegulation: rule.referenceRegulation,
        compliant: true,
        requiredDocuments: rule.allowedWithDocuments || [],
        penalty: rule.penalty
      })),
      requiredLicenses: [],
      warnings: [],
      restrictions: []
    };

    // Determine overall status
    for (const check of result.checks) {
      if (check.ruleType === 'prohibited') {
        result.status = 'prohibited';
        check.compliant = false;
        result.restrictions.push(`${check.description} (${check.authority})`);
      } else if (check.ruleType === 'restricted') {
        result.status = result.status === 'prohibited' ? result.status : 'restricted';
        result.restrictions.push(`${check.description}`);
        result.requiredLicenses.push(...check.requiredDocuments);
      } else if (check.ruleType === 'requires_license') {
        result.status = result.status === 'prohibited' || result.status === 'restricted' ? result.status : 'requires_license';
        result.requiredLicenses.push(...check.requiredDocuments);
      } else if (check.ruleType === 'sanctioned') {
        result.status = 'restricted';
        result.warnings.push(`${check.description}`);
      }
    }

    // Deduplicate licenses
    result.requiredLicenses = [...new Set(result.requiredLicenses)];

    // Check if there are any trade agreements that could help
    const agreements = await TradeAgreement.find({
      memberCountries: destinationCountry,
      isActive: true
    });

    result.tradeAgreements = agreements.map(a => ({
      name: a.name,
      shortName: a.shortName,
      beneficial: true
    }));

    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('Customs Engine: Compliance check error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== TRADE AGREEMENT OPTIMIZER =====

/**
 * Find optimal trade routes and agreements
 */
async function optimizeTradeAgreement(hsCode, originCountry, destinationCountry) {
  try {
    if (!hsCode || !originCountry || !destinationCountry) {
      return { success: false, error: 'HS Code, origin and destination countries are required' };
    }

    // Find applicable trade agreements
    const agreements = await TradeAgreement.find({
      memberCountries: { $all: [originCountry, destinationCountry] },
      isActive: true
    });

    // Find tariff schedules with preferential rates
    const tariffs = await TariffSchedule.find({
      hsCode,
      country: destinationCountry,
      originCountry,
      isActive: true,
      preferentialRate: { $ne: null }
    });

    // Find the customs route
    const route = await CustomsRoute.findOne({
      originCountry,
      destinationCountry,
      isActive: true
    }).sort({ popularityScore: -1 });

    const standardTariff = await TariffSchedule.findOne({
      hsCode,
      country: destinationCountry,
      originCountry,
      isActive: true,
      preferentialRate: null
    });

    const savings = standardTariff && tariffs.length > 0
      ? standardTariff.baseDutyRate - tariffs[0].preferentialRate
      : 0;

    const result = {
      hsCode,
      originCountry,
      destinationCountry,
      eligibleAgreements: agreements.map(a => ({
        name: a.name,
        shortName: a.shortName,
        type: a.type,
        keyBenefits: a.keyBenefits,
        rulesOfOrigin: a.rulesOfOrigin,
        documentation: a.documentation
      })),
      currentBestRate: tariffs.length > 0 ? tariffs[0].preferentialRate : standardTariff?.baseDutyRate || null,
      standardRate: standardTariff?.baseDutyRate || null,
      savingsPercentage: savings,
      hasPreferentialRate: tariffs.length > 0,
      recommendedAgreement: agreements.length > 0 ? agreements[0].shortName : null,
      route: route ? {
        name: route.name,
        avgTransitDays: route.avgTransitDays,
        requiredDocuments: route.requiredDocuments,
        tradeBloc: route.tradeBloc
      } : null,
      // Calculate what certification is needed
      requirements: {
        certificateOfOrigin: agreements.some(a => a.documentation?.requiresCertificateOfOrigin),
        certificateFormat: agreements.filter(a => a.documentation?.requiresCertificateOfOrigin)
          .map(a => a.documentation.certificateOfOriginFormat).filter(Boolean),
        localContentRequirement: agreements.map(a => a.rulesOfOrigin?.localContentRequirement).filter(Boolean)
      }
    };

    return {
      success: true,
      data: result
    };
  } catch (error) {
    logger.error('Customs Engine: Trade agreement optimization error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== CUSTOMS ROUTES =====

/**
 * Get available customs routes
 */
async function getCustomsRoutes(origin, destination) {
  try {
    const filter = { isActive: true };
    if (origin) filter.originCountry = origin;
    if (destination) filter.destinationCountry = destination;

    const routes = await CustomsRoute.find(filter)
      .sort({ popularityScore: -1 });

    return {
      success: true,
      data: routes,
      total: routes.length
    };
  } catch (error) {
    logger.error('Customs Engine: Routes query error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== CUSTOMS SHIPMENTS =====

/**
 * Create a new customs shipment record
 */
async function createCustomsShipment(data) {
  try {
    const shipmentData = {
      ...data,
      shipmentId: data.shipmentId || `CUS-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      statusHistory: [{
        status: 'draft',
        timestamp: new Date(),
        notes: 'Customs shipment record created',
        updatedBy: 'system'
      }],
      estimatedClearanceDays: await estimateClearanceDays(data.destinationCountry, data.hsCode)
    };

    const shipment = new CustomsShipment(shipmentData);
    await shipment.save();

    return {
      success: true,
      data: shipment
    };
  } catch (error) {
    logger.error('Customs Engine: Create shipment error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get customs shipment detail
 */
async function getCustomsShipment(shipmentId) {
  try {
    const shipment = await CustomsShipment.findOne({ shipmentId });
    if (!shipment) return { success: false, error: 'Shipment not found' };
    return { success: true, data: shipment };
  } catch (error) {
    logger.error('Customs Engine: Get shipment error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * List customs shipments for a company
 */
async function getCompanyShipments(companyId, status, page = 1, limit = 20) {
  try {
    const filter = { companyId };
    if (status) filter.status = status;

    const shipments = await CustomsShipment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CustomsShipment.countDocuments(filter);

    return {
      success: true,
      data: shipments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  } catch (error) {
    logger.error('Customs Engine: Company shipments error:', error.message);
    return { success: false, error: error.message };
  }
}

async function estimateClearanceDays(country, hsCode) {
  const estimates = {
    'Kenya': 5, 'Nigeria': 14, 'Tanzania': 7, 'Uganda': 6,
    'Rwanda': 4, 'South Africa': 4, 'Ethiopia': 10, 'Egypt': 8,
    'Ghana': 8, 'Zambia': 6, 'Zimbabwe': 7
  };

  // EAC countries typically faster
  const eacCountries = ['Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Burundi', 'South Sudan'];
  if (eacCountries.includes(country)) return estimates[country] || 5;

  return estimates[country] || 7;
}

// ===== CATEGORIES / METADATA =====

/**
 * Get product categories with HS code counts
 */
async function getCategories() {
  try {
    const categories = await CustomHSCode.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return {
      success: true,
      data: categories.map(c => ({
        category: c._id,
        count: c.count
      }))
    };
  } catch (error) {
    logger.error('Customs Engine: Categories error:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== STATUS =====

function getServiceStatus() {
  return { initialized };
}

async function shutdownCustomsEngineService() {
  logger.info('Customs Engine: Shutting down...');
  initialized = false;
}

module.exports = {
  startCustomsEngineService,
  classifyHS,
  searchHSCodes,
  getHSCodeDetail,
  calculateDuty,
  generateDocument,
  getDocumentTemplates,
  checkCompliance,
  optimizeTradeAgreement,
  getCustomsRoutes,
  createCustomsShipment,
  getCustomsShipment,
  getCompanyShipments,
  getCategories,
  getServiceStatus,
  shutdownCustomsEngineService
};
