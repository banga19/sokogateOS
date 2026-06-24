// Seed data — HS Code classifications for cross-border customs engine

const SEED_HS_CODES = [
  // Textiles (Chapter 50-63)
  { code: '5209.39', chapter: '52', heading: '5209', description: 'Woven fabrics of cotton, dyed', category: 'textiles', keywords: ['cotton fabric', 'woven cotton', 'dyed cotton', 'textile', 'fabric'] },
  { code: '5208.12', chapter: '52', heading: '5208', description: 'Woven fabrics of cotton, plain weave, unbleached', category: 'textiles', keywords: ['cotton fabric', 'plain weave', 'unbleached cotton', 'textile'] },
  { code: '5512.19', chapter: '55', heading: '5512', description: 'Woven fabrics of polyester staple fibers', category: 'textiles', keywords: ['polyester fabric', 'synthetic fabric', 'polyester textile'] },
  { code: '5407.10', chapter: '54', heading: '5407', description: 'Woven fabrics of synthetic filament yarn', category: 'textiles', keywords: ['synthetic fabric', 'nylon fabric', 'filament fabric'] },
  { code: '6301.20', chapter: '63', heading: '6301', description: 'Blankets and travelling rugs of wool or fine animal hair', category: 'textiles', keywords: ['blankets', 'wool blankets', 'travelling rugs'] },
  { code: '6204.62', chapter: '62', heading: '6204', description: "Women's or girls' trousers of cotton", category: 'textiles', keywords: ['trousers', 'pants', 'cotton trousers', 'women clothing'] },
  { code: '6109.10', chapter: '61', heading: '6109', description: 'T-shirts, singlets of cotton, knitted', category: 'textiles', keywords: ['t-shirts', 'cotton tshirts', 'knitted shirts', 'apparel'] },
  { code: '6203.42', chapter: '62', heading: '6203', description: "Men's or boys' trousers of cotton", category: 'textiles', keywords: ['men trousers', 'cotton trousers', 'boys pants'] },

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
  { code: '1005.90', chapter: '10', heading: '1005', description: 'Maize (corn) other than seed', category: 'agricultural', keywords: ['maize', 'corn', 'grain'] },
];

module.exports = SEED_HS_CODES;
