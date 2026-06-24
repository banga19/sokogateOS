// Seed data — Tariff schedules for cross-border customs engine

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

module.exports = SEED_TARIFFS;
