// Seed data — Trade agreements for cross-border customs engine

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

module.exports = SEED_TRADE_AGREEMENTS;
