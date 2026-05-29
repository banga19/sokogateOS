import React, { useState, useEffect, useCallback } from 'react'
import { customsAPI } from '../services/api'

const COLORS = {
  primary: 'bg-blue-600',
  primaryHover: 'hover:bg-blue-700',
  primaryLight: 'bg-blue-50',
  primaryText: 'text-blue-700',
  border: 'border-blue-200',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  gray: 'bg-gray-500'
}

// ===== CATEGORY COLORS =====
const categoryColors = {
  textiles: '#8B5CF6', electronics: '#3B82F6', machinery: '#10B981',
  food_beverage: '#F59E0B', chemicals: '#EF4444', construction: '#F97316',
  vehicles: '#06B6D4', plastics: '#EC4899', metals: '#6B7280',
  agricultural: '#84CC16', pharmaceuticals: '#14B8A6'
}

const categoryLabels = {
  textiles: 'Textiles', electronics: 'Electronics', machinery: 'Machinery',
  food_beverage: 'Food & Beverage', chemicals: 'Chemicals', construction: 'Construction Materials',
  vehicles: 'Vehicles & Parts', plastics: 'Plastics & Rubber', metals: 'Metals',
  agricultural: 'Agricultural', pharmaceuticals: 'Pharmaceuticals', other: 'Other'
}

// ===== STAT COUNTER =====
function StatCard({ label, value, color, subtitle }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-gray-900'}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

// ===== TAB BAR =====
function TabBar({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="flex flex-wrap gap-1 bg-white rounded-xl border border-gray-200 p-1.5 shadow-sm">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <span className="text-lg">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ===== HS CODE CLASSIFIER TAB =====
function HSCodeClassifier({ api }) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const classify = async () => {
    if (!description.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.classify(description.trim(), category || undefined)
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Classification failed')
    }
    setLoading(false)
  }

  const searchCodes = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const res = await api.searchHSCodes(searchQuery, category || undefined)
      setSearchResults(res.data.data)
    } catch (err) {
      setError('Search failed')
    }
    setSearchLoading(false)
  }

  const quickClassify = async (text) => {
    setDescription(text)
    setTimeout(() => {
      document.getElementById('classify-btn')?.click()
    }, 100)
  }

  const quickSearches = [
    { label: 'Cotton fabric for uniforms', text: '5000 meters of premium cotton fabric for school uniforms' },
    { label: 'Smartphones', text: 'Smartphones for cellular networks' },
    { label: 'Portland cement', text: 'Portland cement for construction' },
    { label: 'Rice imports', text: 'Semi-milled white rice for food distribution' }
  ]

  return (
    <div className="space-y-6">
      {/* Classification */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1">AI HS Code Classifier</h3>
        <p className="text-sm text-gray-500 mb-4">Describe your product and we'll predict the correct HS code</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input h-20 w-full"
              placeholder="e.g., 5000 meters of premium cotton fabric for school uniforms"
            />
          </div>
          <div className="flex flex-col gap-2 sm:w-48">
            <select value={category} onChange={e => setCategory(e.target.value)} className="input">
              <option value="">All categories</option>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button
              id="classify-btn"
              onClick={classify}
              disabled={loading || !description.trim()}
              className="btn btn-primary"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Analyzing...
                </span>
              ) : 'Classify Product'}
            </button>
          </div>
        </div>

        {/* Quick examples */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickSearches.map(q => (
            <button key={q.label} onClick={() => quickClassify(q.text)}
              className="text-xs px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full border border-gray-200 transition-colors">
              {q.label}
            </button>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        {/* Classification results */}
        {result && (
          <div className="mt-6 space-y-4">
            {result.topMatch ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-blue-900">Top Match</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    result.topMatch.confidence >= 80 ? 'bg-green-100 text-green-800' :
                    result.topMatch.confidence >= 50 ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {result.topMatch.confidence}% confidence
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-mono font-bold text-blue-700">{result.topMatch.code}</span>
                  <div>
                    <p className="font-medium text-gray-900">{result.topMatch.description}</p>
                    <p className="text-sm text-gray-500 capitalize">{result.topMatch.category}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-amber-800 text-sm">{result.message}</p>
                {result.suggestion && (
                  <p className="text-amber-600 text-xs mt-1">Suggested category: <strong className="capitalize">{result.suggestion}</strong></p>
                )}
              </div>
            )}

            {/* Alternative matches */}
            {result.matches && result.matches.length > 1 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Alternative Matches</p>
                <div className="space-y-2">
                  {result.matches.slice(1).map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <span className="text-sm font-mono font-bold text-gray-600">{m.code}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{m.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs capitalize text-gray-400">{m.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${m.confidence}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">{m.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.totalCandidatesChecked && (
              <p className="text-xs text-gray-400">Searched {result.totalCandidatesChecked} HS codes</p>
            )}
          </div>
        )}
      </div>

      {/* HS Code Browser */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1">HS Code Browser</h3>
        <p className="text-sm text-gray-500 mb-4">Search the Harmonized System by keyword or code</p>

        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input flex-1"
            placeholder="Search by code, description, or keyword..."
            onKeyDown={e => e.key === 'Enter' && searchCodes()}
          />
          <button onClick={searchCodes} disabled={searchLoading || !searchQuery.trim()} className="btn btn-secondary">
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults && (
          <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {searchResults.data?.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No results found</p>
            ) : (
              searchResults.data?.map(hs => (
                <div key={hs._id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="text-sm font-mono font-bold text-gray-700 min-w-[80px]">{hs.code}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{hs.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>Chapter {hs.chapter}</span>
                      {hs.category && <span>· {categoryLabels[hs.category] || hs.category}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
            {searchResults.total > 0 && (
              <p className="text-xs text-gray-400 text-center pt-2">{searchResults.total} results found</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== DUTY CALCULATOR TAB =====
function DutyCalculator({ api }) {
  const [form, setForm] = useState({
    hsCode: '', originCountry: 'China', destinationCountry: 'Kenya',
    invoiceAmount: 10000, freightCost: 1500, insuranceCost: 200,
    incoterm: 'CIF', invoiceCurrency: 'USD', quantity: 1
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const calculate = async () => {
    if (!form.hsCode || !form.invoiceAmount) return
    setLoading(true)
    setError('')
    try {
      const res = await api.calculateDuty(form)
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed')
    }
    setLoading(false)
  }

  const countries = ['China', 'India', 'Turkey', 'Kenya', 'Nigeria', 'Tanzania', 'Uganda', 'South Africa', 'Rwanda', 'Ethiopia', 'Egypt', 'Ghana', 'Zambia', 'Zimbabwe']

  const quickProducts = [
    { label: 'Cotton fabric (HS 5209.39)', data: { hsCode: '5209.39', invoiceAmount: 25000, freightCost: 2000, insuranceCost: 300 } },
    { label: 'Smartphones (HS 8517.13)', data: { hsCode: '8517.13', invoiceAmount: 50000, freightCost: 1000, insuranceCost: 200 } },
    { label: 'Cement (HS 2523.29)', data: { hsCode: '2523.29', invoiceAmount: 15000, freightCost: 3000, insuranceCost: 400 } },
    { label: 'Rice (HS 1006.30)', data: { hsCode: '1006.30', invoiceAmount: 30000, freightCost: 4000, insuranceCost: 500 } }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1">Duty & Tax Calculator</h3>
        <p className="text-sm text-gray-500 mb-4">Calculate import duties, VAT, and total landed cost</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">HS Code</label>
            <input type="text" value={form.hsCode} onChange={e => update('hsCode', e.target.value)} className="input" placeholder="e.g., 5209.39" />
          </div>
          <div>
            <label className="label">Origin Country</label>
            <select value={form.originCountry} onChange={e => update('originCountry', e.target.value)} className="input">
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Destination Country</label>
            <select value={form.destinationCountry} onChange={e => update('destinationCountry', e.target.value)} className="input">
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Invoice Amount ({form.invoiceCurrency})</label>
            <input type="number" value={form.invoiceAmount} onChange={e => update('invoiceAmount', parseFloat(e.target.value) || 0)} className="input" min="0" />
          </div>
          <div>
            <label className="label">Incoterm</label>
            <select value={form.incoterm} onChange={e => update('incoterm', e.target.value)} className="input">
              {['CIF', 'FOB', 'EXW', 'CFR', 'DAP', 'DDP'].map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Freight Cost (USD)</label>
            <input type="number" value={form.freightCost} onChange={e => update('freightCost', parseFloat(e.target.value) || 0)} className="input" min="0" />
          </div>
          <div>
            <label className="label">Insurance (USD)</label>
            <input type="number" value={form.insuranceCost} onChange={e => update('insuranceCost', parseFloat(e.target.value) || 0)} className="input" min="0" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={calculate} disabled={loading || !form.hsCode} className="btn btn-primary flex-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Calculating...
              </span>
            ) : 'Calculate Duties'}
          </button>
        </div>

        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">Quick fill:</p>
          <div className="flex flex-wrap gap-1.5">
            {quickProducts.map(q => (
              <button key={q.label} onClick={() => { setForm(f => ({ ...f, ...q.data })) }}
                className="text-xs px-2 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md border border-gray-200 transition-colors">
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {result?.calculation ? (
          <>
            {/* Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Landed Cost Summary</h3>
                {result.calculation.tradeAgreement && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    🏷️ {result.calculation.tradeAgreement}
                  </span>
                )}
              </div>

              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-gray-900">
                  ${result.calculation.totalLandedCost?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500">Total Landed Cost</p>
              </div>

              {result.calculation.savingsUnderAgreement > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
                  💰 <strong>${result.calculation.savingsUnderAgreement.toFixed(2)}</strong> saved under {result.calculation.tradeAgreement}
                </div>
              )}

              {result.estimated && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-4">
                  ⚠️ Estimated rates — exact tariff not found for this combination
                </div>
              )}

              <div className="space-y-1.5">
                {result.calculation.breakdown?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg hover:bg-gray-50">
                    <span className="text-gray-600">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Calculation Details</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between py-1"><span className="text-gray-500">Duty Rate</span><span className="font-medium">{result.calculation.dutyRate}%</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-500">VAT Rate</span><span className="font-medium">{result.calculation.vatRate}%</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-500">CIF Value</span><span className="font-medium">${result.calculation.cifValue?.toFixed(2)}</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-500">Effective Tax Rate</span><span className="font-medium">{result.calculation.effectiveTaxRate}%</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-500">Incoterm</span><span className="font-medium">{result.calculation.incoterm}</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-500">Currency</span><span className="font-medium">{result.calculation.currency}</span></div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-center min-h-[300px]">
            <div className="text-center text-gray-400">
              <p className="text-4xl mb-2">📊</p>
              <p className="text-sm">Enter HS code and details, then calculate</p>
              <p className="text-xs mt-1">Use quick fill buttons for examples</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== DOCUMENT GENERATOR TAB =====
function DocumentGenerator({ api }) {
  const [shipmentId, setShipmentId] = useState('')
  const [documentType, setDocumentType] = useState('commercial_invoice')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState(null)

  useEffect(() => {
    api.getDocumentTemplates().then(res => setTemplates(res.data.data)).catch(() => {})
  }, [])

  const generate = async () => {
    if (!shipmentId.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.generateDocument(shipmentId, documentType)
      setResult(res.data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed')
    }
    setLoading(false)
  }

  const documentTypes = [
    { value: 'commercial_invoice', label: 'Commercial Invoice', icon: '📄' },
    { value: 'packing_list', label: 'Packing List', icon: '📦' },
    { value: 'certificate_of_origin', label: 'Certificate of Origin', icon: '🏛️' },
    { value: 'bill_of_lading', label: 'Bill of Lading', icon: '🚢' },
    { value: 'import_declaration', label: 'Import Declaration (Kenya)', icon: '🛃' },
    { value: 'single_administrative_document', label: 'EAC Single Admin Document', icon: '📋' }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1">Document Generator</h3>
        <p className="text-sm text-gray-500 mb-4">Auto-fill customs documents from shipment data</p>

        <div className="space-y-3">
          <div>
            <label className="label">Shipment ID</label>
            <input type="text" value={shipmentId} onChange={e => setShipmentId(e.target.value)} className="input" placeholder="e.g., CUS-1717000000-abc123" />
          </div>
          <div>
            <label className="label">Document Type</label>
            <div className="grid grid-cols-1 gap-1.5 mt-1">
              {documentTypes.map(dt => (
                <button key={dt.value}
                  onClick={() => setDocumentType(dt.value)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    documentType === dt.value
                      ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                      : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>
                  <span className="text-lg">{dt.icon}</span>
                  {dt.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={generate} disabled={loading || !shipmentId.trim()} className="btn btn-primary w-full">
            {loading ? 'Generating...' : 'Generate Document'}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      <div className="space-y-4">
        {result ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">✅ Generated Document</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {result.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">Type</span><span className="font-medium capitalize">{result.documentType?.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">Document #</span><span className="font-medium">{result.documentNumber}</span></div>
              <div className="flex justify-between py-1 border-b border-gray-100"><span className="text-gray-500">Template</span><span className="font-medium">{result.template?.name}</span></div>
            </div>
            {result.sections && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Generated Fields</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {result.sections.map((section, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-1">{section.title}</p>
                      <div className="space-y-0.5">
                        {section.fields.map(field => (
                          result.content?.[field] && (
                            <div key={field} className="flex justify-between text-xs">
                              <span className="text-gray-400">{field.replace(/([A-Z])/g, ' $1')}</span>
                              <span className="text-gray-700 font-medium truncate ml-2 max-w-[200px]">{String(result.content[field])}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-center min-h-[300px]">
            <div className="text-center text-gray-400">
              <p className="text-4xl mb-2">📝</p>
              <p className="text-sm">Select document type and enter shipment ID</p>
              <p className="text-xs mt-1">Documents auto-fill from shipment data</p>
            </div>
          </div>
        )}

        {templates && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Available Templates ({templates.data?.length || 0})</h3>
            <div className="grid grid-cols-2 gap-2">
              {(templates.grouped ? Object.entries(templates.grouped) : []).map(([type, tmpls]) => (
                <div key={type} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-gray-700 capitalize">{type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tmpls.length} version{tmpls.length > 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== COMPLIANCE CHECKER TAB =====
function ComplianceChecker({ api }) {
  const [hsCode, setHsCode] = useState('')
  const [country, setCountry] = useState('Kenya')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const check = async () => {
    if (!hsCode.trim() || !country) return
    setLoading(true)
    try {
      const res = await api.checkCompliance(hsCode, country)
      setResult(res.data.data)
    } catch (err) {
      setResult({ status: 'error', checks: [] })
    }
    setLoading(false)
  }

  const statusConfig = {
    compliant: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: '✅', label: 'Compliant' },
    restricted: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', icon: '⚠️', label: 'Restricted' },
    requires_license: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: '📋', label: 'License Required' },
    prohibited: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: '🚫', label: 'Prohibited' },
  }

  const countries = ['Kenya', 'Nigeria', 'Tanzania', 'Uganda', 'Rwanda', 'South Africa', 'Ethiopia', 'Egypt', 'Ghana', 'Zambia', 'Zimbabwe']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1">Compliance Checker</h3>
        <p className="text-sm text-gray-500 mb-4">Check import restrictions, license requirements, and prohibited goods</p>

        <div className="space-y-3">
          <div>
            <label className="label">HS Code</label>
            <input type="text" value={hsCode} onChange={e => setHsCode(e.target.value)} className="input" placeholder="e.g., 5209.39" />
          </div>
          <div>
            <label className="label">Destination Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)} className="input">
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={check} disabled={loading || !hsCode.trim()} className="btn btn-primary w-full">
            {loading ? 'Checking...' : 'Check Compliance'}
          </button>
        </div>
      </div>

      <div>
        {result && (
          <div className={`rounded-xl border p-6 shadow-sm ${statusConfig[result.status]?.bg || 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{statusConfig[result.status]?.icon || 'ℹ️'}</span>
              <div>
                <h3 className={`font-semibold ${statusConfig[result.status]?.text || 'text-gray-700'}`}>
                  {statusConfig[result.status]?.label || result.status}
                </h3>
                <p className="text-sm text-gray-500">HS Code {result.hsCode} → {result.country}</p>
              </div>
            </div>

            {result.requiredLicenses?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Required Documents / Licenses</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(result.requiredLicenses)].map(l => (
                    <span key={l} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-700">
                      {l.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.restrictions?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Restrictions</p>
                <ul className="space-y-1">
                  {result.restrictions.map((r, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span>•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Warnings</p>
                <ul className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-700">{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.checks?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">All Checks</p>
                <div className="space-y-2">
                  {result.checks.map((c, i) => (
                    <div key={i} className="bg-white bg-opacity-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          c.compliant ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {c.ruleType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-gray-700">{c.description}</p>
                      {c.authority && <p className="text-xs text-gray-400 mt-0.5">Authority: {c.authority}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.tradeAgreements?.length > 0 && (
              <div className="mt-4 bg-white bg-opacity-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1">Applicable Trade Agreements</p>
                {result.tradeAgreements.map((a, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mr-1 mb-1">
                    {a.shortName}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ===== TRADE AGREEMENT OPTIMIZER TAB =====
function TradeAgreementOptimizer({ api }) {
  const [hsCode, setHsCode] = useState('')
  const [origin, setOrigin] = useState('Kenya')
  const [destination, setDestination] = useState('Uganda')
  const [result, setResult] = useState(null)
  const [agreements, setAgreements] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getTradeAgreements().then(res => setAgreements(res.data.data)).catch(() => {})
  }, [])

  const optimize = async () => {
    if (!hsCode.trim() || !origin || !destination) return
    setLoading(true)
    try {
      const res = await api.optimizeTradeAgreement(hsCode, origin, destination)
      setResult(res.data.data)
    } catch (err) {
      setResult(null)
    }
    setLoading(false)
  }

  const countries = ['Kenya', 'Nigeria', 'Tanzania', 'Uganda', 'Rwanda', 'South Africa', 'Ethiopia', 'Egypt', 'Ghana', 'Zambia', 'Zimbabwe', 'Burundi', 'Malawi', 'Mauritius']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-1">Trade Agreement Optimizer</h3>
          <p className="text-sm text-gray-500 mb-4">Find duty savings through trade agreements</p>

          <div className="space-y-3">
            <div>
              <label className="label">HS Code</label>
              <input type="text" value={hsCode} onChange={e => setHsCode(e.target.value)} className="input" placeholder="e.g., 5209.39" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Origin Country</label>
                <select value={origin} onChange={e => setOrigin(e.target.value)} className="input">
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Destination</label>
                <select value={destination} onChange={e => setDestination(e.target.value)} className="input">
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button onClick={optimize} disabled={loading || !hsCode.trim()} className="btn btn-primary w-full">
              {loading ? 'Analyzing...' : 'Find Best Agreement'}
            </button>
          </div>
        </div>

        {agreements && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Available Trade Agreements</h3>
            <div className="space-y-2">
              {agreements.map(a => (
                <div key={a._id} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">{a.shortName}</p>
                    <span className="text-xs text-gray-400">{a.type}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{a.memberCountries?.length} member countries</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        {result ? (
          <div className="space-y-4">
            {result.eligibleAgreements?.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-green-900 mb-3">🎯 Eligible Agreement{result.eligibleAgreements.length > 1 ? 's' : ''}</h3>
                {result.eligibleAgreements.map((a, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900">{a.shortName} — {a.name}</p>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{a.type}</span>
                    </div>
                    {a.keyBenefits?.slice(0, 2).map((b, j) => (
                      <p key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-green-500">✓</span> {b}
                      </p>
                    ))}
                    {a.rulesOfOrigin && (
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Local content requirement: <strong>{a.rulesOfOrigin.localContentRequirement}%</strong></p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result.hasPreferentialRate && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">💰 Savings Analysis</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Standard Duty Rate</span><span className="font-medium">{result.standardRate}%</span></div>
                  <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Preferential Rate</span><span className="font-medium text-green-600">{result.currentBestRate}%</span></div>
                  <div className="flex justify-between text-sm py-1 border-t border-gray-100 pt-2"><span className="text-gray-500">Savings</span><span className="font-bold text-green-600">{result.savingsPercentage}%</span></div>
                </div>
              </div>
            )}

            {result.route && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">🚢 Recommended Route</h3>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{result.route.name}</p>
                  <p className="text-gray-500">{result.route.avgTransitDays} days transit</p>
                  {result.route.tradeBloc !== 'none' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {result.route.tradeBloc} route
                    </span>
                  )}
                </div>
              </div>
            )}

            {result.requirements && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">📋 Requirements for Preferential Rate</h3>
                <ul className="space-y-1.5 text-sm">
                  {result.requirements.certificateOfOrigin && (
                    <li className="flex items-start gap-2 text-gray-700">
                      <span>•</span>
                      <span>Certificate of Origin required</span>
                    </li>
                  )}
                  {result.requirements.certificateFormat?.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600 text-xs">
                      <span className="ml-4">Format: {f}</span>
                    </li>
                  ))}
                  {result.requirements.localContentRequirement?.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span>•</span>
                      <span>{r}% local content required for origin qualification</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!result.eligibleAgreements?.length && !result.hasPreferentialRate && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm text-center">
                <p className="text-3xl mb-2">🔍</p>
                <p className="text-sm text-amber-800">No preferential trade agreements found for this route</p>
                <p className="text-xs text-amber-600 mt-1">Standard duty rates will apply</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-center min-h-[300px]">
            <div className="text-center text-gray-400">
              <p className="text-4xl mb-2">🏛️</p>
              <p className="text-sm">Enter trade route to find savings</p>
              <p className="text-xs mt-1">Try Kenya → Uganda for EAC preferential rates</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== CUSTOMS ROUTES TAB =====
function CustomsRoutes({ api }) {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ origin: '', destination: '' })

  const loadRoutes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getCustomsRoutes(filter.origin || undefined, filter.destination || undefined)
      setRoutes(res.data.data?.data || [])
    } catch (err) {
      setRoutes([])
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { loadRoutes() }, [loadRoutes])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-1">Customs Routes Intelligence</h3>
      <p className="text-sm text-gray-500 mb-4">Pre-configured trade routes with transit times and document requirements</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs text-gray-500 mb-1 block">Filter by Origin</label>
          <select value={filter.origin} onChange={e => setFilter(f => ({ ...f, origin: e.target.value }))} className="input text-sm">
            <option value="">All origins</option>
            {['China', 'India', 'Turkey', 'Kenya', 'South Africa'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs text-gray-500 mb-1 block">Filter by Destination</label>
          <select value={filter.destination} onChange={e => setFilter(f => ({ ...f, destination: e.target.value }))} className="input text-sm">
            <option value="">All destinations</option>
            {['Kenya', 'Nigeria', 'Tanzania', 'Uganda', 'Rwanda', 'South Africa'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={loadRoutes} className="btn btn-secondary text-sm">Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" /></div>
      ) : (
        <div className="space-y-3">
          {routes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No routes found for the selected filters</p>
          ) : (
            routes.map((route, i) => (
              <div key={i} className="bg-gray-50 rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">{route.name}</h4>
                      {route.tradeBloc && route.tradeBloc !== 'none' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          {route.tradeBloc}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">🚢 {route.avgTransitDays} days</span>
                      <span className="flex items-center gap-1">📄 {route.requiredDocuments?.length} documents</span>
                      <span className="flex items-center gap-1">⭐ {route.popularityScore}% popularity</span>
                    </div>
                    {route.estimatedDutyRate > 0 && (
                      <p className="text-xs text-gray-400 mt-1">Avg. duty rate: ~{route.estimatedDutyRate}%</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{route.originPort}</p>
                    <p className="text-xs font-mono text-gray-400">→</p>
                    <p className="text-xs text-gray-400">{route.destinationPort}</p>
                  </div>
                </div>

                {/* Required documents */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Required Documents</p>
                  <div className="flex flex-wrap gap-1.5">
                    {route.requiredDocuments?.map((doc, j) => (
                      <span key={j} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                        doc.required ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`} title={doc.description}>
                        {doc.type.replace(/_/g, ' ')}
                        {doc.required && <span className="ml-0.5 text-blue-500">*</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ===== MAIN CUSTOMS DASHBOARD =====

const tabs = [
  { id: 'classify', label: 'HS Classifier', icon: '🔍' },
  { id: 'duty', label: 'Duty Calculator', icon: '💰' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'compliance', label: 'Compliance', icon: '🛡️' },
  { id: 'agreements', label: 'Trade Deals', icon: '🏛️' },
  { id: 'routes', label: 'Routes', icon: '🚢' }
]

export default function CustomsDashboard() {
  const [activeTab, setActiveTab] = useState('classify')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    customsAPI.getStatus().then(res => setStats(res.data.data)).catch(() => {})
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🛃</span>
            <h1 className="text-xl font-bold text-gray-900">Cross-Border Customs Engine</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">HS Code Classification · Duty Calculation · Document Generation · Compliance · Trade Agreements</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="HS Codes" value={stats.hsCodesLoaded} color="text-violet-600" />
          <StatCard label="Active Routes" value={stats.activeRoutes} color="text-blue-600" />
          <StatCard label="Compliance Rules" value={stats.complianceRules} color="text-amber-600" />
          <StatCard label="Capabilities" value={stats.capabilities?.length || 0} color="text-green-600" subtitle="All active" />
        </div>
      )}

      {/* Tabs */}
      <TabBar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'classify' && <HSCodeClassifier api={customsAPI} />}
        {activeTab === 'duty' && <DutyCalculator api={customsAPI} />}
        {activeTab === 'documents' && <DocumentGenerator api={customsAPI} />}
        {activeTab === 'compliance' && <ComplianceChecker api={customsAPI} />}
        {activeTab === 'agreements' && <TradeAgreementOptimizer api={customsAPI} />}
        {activeTab === 'routes' && <CustomsRoutes api={customsAPI} />}
      </div>
    </div>
  )
}
