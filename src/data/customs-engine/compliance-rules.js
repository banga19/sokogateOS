// Seed data — Compliance rules for cross-border customs engine

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
  { country: 'Kenya', hsCode: '4403.11', ruleType: 'requires_license', description: 'Timber imports require phytosanitary certificate and KFS approval', authority: 'Kenya Forest Service (KFS)', allowedWithDocuments: ['phytosanitary_cert', 'import_permit'] },
];

module.exports = SEED_COMPLIANCE_RULES;
