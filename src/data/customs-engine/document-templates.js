// Seed data — Document templates for cross-border customs engine

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

module.exports = SEED_DOCUMENT_TEMPLATES;
