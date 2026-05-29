import React, { useState, useEffect, useCallback } from 'react'
import { supplierTrustAPI } from '../services/api'

const ratingColor = (score) => {
  if (score >= 90) return 'text-green-600 bg-green-50 border-green-200'
  if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200'
  if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

const tierBadge = (tier) => {
  const tiers = {
    premium: { label: 'Premium', class: 'bg-purple-100 text-purple-700 border-purple-200' },
    verified: { label: 'Verified', class: 'bg-blue-100 text-blue-700 border-blue-200' },
    basic: { label: 'Basic', class: 'bg-gray-100 text-gray-600 border-gray-200' },
    free: { label: 'Free', class: 'bg-gray-50 text-gray-400 border-gray-100' }
  }
  return tiers[tier] || tiers.free
}

export default function SupplierTrustDashboard() {
  const [suppliers, setSuppliers] = useState([])
  const [topSuppliers, setTopSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterVerified, setFilterVerified] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' })
  const [activeTab, setActiveTab] = useState('discover')

  useEffect(() => {
    loadSuppliers()
    loadTopSuppliers()
  }, [])

  const loadSuppliers = async (params = {}) => {
    setLoading(true)
    try {
      const { data } = await supplierTrustAPI.searchSuppliers(params)
      setSuppliers(data.data || [])
    } catch (err) {
      console.error('Failed to load suppliers:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTopSuppliers = async () => {
    try {
      const { data } = await supplierTrustAPI.getTopSuppliers(6)
      setTopSuppliers(data.data || [])
    } catch (err) {
      console.error('Failed to load top suppliers:', err.message)
    }
  }

  const handleSearch = useCallback(() => {
    const params = {}
    if (searchQuery.trim()) params.query = searchQuery.trim()
    if (filterCategory) params.category = filterCategory
    if (filterVerified) params.verifiedOnly = 'true'
    loadSuppliers(params)
  }, [searchQuery, filterCategory, filterVerified])

  const handleSelectSupplier = async (supplierId) => {
    try {
      const { data } = await supplierTrustAPI.getSupplier(supplierId)
      setSelectedSupplier(data.data)
    } catch (err) {
      console.error('Failed to load supplier detail:', err.message)
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedSupplier || !reviewForm.comment.trim()) return
    try {
      const supplierId = selectedSupplier.supplierId || selectedSupplier._id
      await supplierTrustAPI.addReview(supplierId, {
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment
      })
      setShowReviewForm(false)
      setReviewForm({ rating: 5, title: '', comment: '' })
      // Reload supplier detail
      await handleSelectSupplier(supplierId)
    } catch (err) {
      console.error('Failed to submit review:', err.message)
    }
  }

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'textiles', label: 'Textiles & Fabrics' },
    { value: 'apparel', label: 'Apparel & Uniforms' },
    { value: 'agricultural', label: 'Agricultural' },
    { value: 'food_beverage', label: 'Food & Beverage' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'chemicals', label: 'Chemicals' },
    { value: 'machinery', label: 'Machinery' },
    { value: 'raw_materials', label: 'Raw Materials' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Trust Network</h1>
          <p className="text-sm text-gray-500 mt-1">
            Verified suppliers with transparent trust scores — built for African importers
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="px-3 py-1.5 bg-white rounded-lg border border-gray-200">
            <span className="text-gray-500">Suppliers: </span>
            <span className="font-semibold">{suppliers.length + (topSuppliers.length > suppliers.length ? topSuppliers.length - topSuppliers.filter(t => suppliers.some(s => s.supplierId === t.supplierId)).length : 0)}</span>
          </div>
        </div>
      </div>

      {/* Top Suppliers Strip */}
      {topSuppliers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">🏆 Top Rated Suppliers</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {topSuppliers.map(sup => (
              <button
                key={sup.supplierId || sup._id}
                onClick={() => handleSelectSupplier(sup.supplierId || sup._id)}
                className="p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all text-left"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold text-xs">
                    {sup.supplierName?.charAt(0)}
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${ratingColor(sup.trustScore?.overall)}`}>
                    {sup.trustScore?.overall}%
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-900 truncate">{sup.supplierName}</p>
                <p className="text-[10px] text-gray-400 truncate">{sup.publicProfile?.country} · {sup.publicProfile?.categories?.[0]}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search & Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Search Suppliers</h2>
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name, product, location..."
                className="input w-full text-sm"
              />
            </div>
            <div>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="input w-full text-sm"
              >
                {categories.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={filterVerified}
                onChange={e => setFilterVerified(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Verified suppliers only
            </label>
            <button onClick={handleSearch} className="btn-primary w-full text-sm">
              Search
            </button>
          </div>

          {/* Supplier List */}
          <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Loading suppliers...</p>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No suppliers found</p>
                <p className="text-xs text-gray-300 mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              suppliers.map(sup => (
                <button
                  key={sup.supplierId || sup._id}
                  onClick={() => handleSelectSupplier(sup.supplierId || sup._id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedSupplier?.supplierId === sup.supplierId || selectedSupplier?._id === sup._id
                      ? 'border-primary-200 bg-primary-50'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{sup.supplierName}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${ratingColor(sup.trustScore?.overall)}`}>
                      {sup.trustScore?.overall}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{sup.publicProfile?.country} · {sup.publicProfile?.categories?.slice(0, 2).join(', ')}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tierBadge(sup.subscription?.tier).class}`}>
                      {tierBadge(sup.subscription?.tier).label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      sup.verification?.status === 'verified'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {sup.verification?.status === 'verified' ? '✅ Verified' : 'Pending'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Supplier Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedSupplier ? (
            <>
              {/* Profile Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold text-xl">
                      {selectedSupplier.supplierName?.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedSupplier.supplierName}</h2>
                      <p className="text-sm text-gray-500">
                        {selectedSupplier.publicProfile?.country} · {selectedSupplier.publicProfile?.city}
                        {selectedSupplier.publicProfile?.foundedYear && ` · Est. ${selectedSupplier.publicProfile.foundedYear}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {selectedSupplier.publicProfile?.categories?.join(' · ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg border text-sm font-bold ${ratingColor(selectedSupplier.trustScore?.overall)}`}>
                      {selectedSupplier.trustScore?.overall}%
                    </span>
                  </div>
                </div>

                {selectedSupplier.publicProfile?.headline && (
                  <p className="text-gray-700 text-sm mb-4 italic">
                    "{selectedSupplier.publicProfile.headline}"
                  </p>
                )}

                {selectedSupplier.publicProfile?.description && (
                  <p className="text-gray-600 text-sm mb-4">{selectedSupplier.publicProfile.description}</p>
                )}

                {/* Trust Score Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  {[
                    { label: 'Delivery', value: selectedSupplier.trustScore?.deliveryReliability },
                    { label: 'Quality', value: selectedSupplier.trustScore?.qualityConsistency },
                    { label: 'Communication', value: selectedSupplier.trustScore?.communicationEffectiveness },
                    { label: 'Pricing', value: selectedSupplier.trustScore?.pricingFairness },
                    { label: 'Disputes', value: selectedSupplier.trustScore?.disputeResolution }
                  ].map(metric => (
                    <div key={metric.label} className="text-center p-2 bg-gray-50 rounded-lg">
                      <div className={`text-lg font-bold ${ratingColor(metric.value || 0)}`}>{metric.value || 0}%</div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{metric.label}</p>
                    </div>
                  ))}
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-400">Min Order</span>
                    <p className="font-medium text-gray-700">
                      {selectedSupplier.publicProfile?.minOrderValue ? `$${selectedSupplier.publicProfile.minOrderValue.amount?.toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-400">Lead Time</span>
                    <p className="font-medium text-gray-700">
                      {selectedSupplier.publicProfile?.leadTimeDays
                        ? `${selectedSupplier.publicProfile.leadTimeDays.min}-${selectedSupplier.publicProfile.leadTimeDays.max} days`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-400">Orders</span>
                    <p className="font-medium text-gray-700">
                      {selectedSupplier.transactionSummary?.totalOrders?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-400">On-Time</span>
                    <p className="font-medium text-gray-700">
                      {selectedSupplier.transactionSummary?.onTimeDeliveryRate
                        ? `${(selectedSupplier.transactionSummary.onTimeDeliveryRate * 100).toFixed(0)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className={`px-2.5 py-1 rounded-full border text-xs font-medium ${tierBadge(selectedSupplier.subscription?.tier).class}`}>
                    {selectedSupplier.subscription?.tier?.toUpperCase()}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full border text-xs font-medium ${
                    selectedSupplier.verification?.status === 'verified'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  }`}>
                    {selectedSupplier.verification?.status === 'verified'
                      ? `✅ Verified (${selectedSupplier.verification.level})`
                      : `⏳ ${selectedSupplier.verification?.status?.replace('_', ' ') || 'Unverified'}`}
                  </span>
                  {selectedSupplier.publicProfile?.certifications?.map(cert => (
                    <span key={cert} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs border border-indigo-100">
                      {cert}
                    </span>
                  ))}
                  {selectedSupplier.publicProfile?.incoterms?.map(incoterm => (
                    <span key={incoterm} className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs border border-gray-200">
                      {incoterm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Reviews ({selectedSupplier.reviews?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {showReviewForm ? 'Cancel' : '+ Write Review'}
                  </button>
                </div>

                {showReviewForm && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                            className={`text-2xl transition-all ${
                              n <= reviewForm.rating ? 'scale-110' : 'opacity-30'
                            }`}
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={reviewForm.title}
                        onChange={e => setReviewForm({ ...reviewForm, title: e.target.value })}
                        placeholder="Summary of your experience"
                        className="input w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        rows={3}
                        placeholder="Share your experience working with this supplier..."
                        className="input w-full resize-none text-sm"
                      />
                    </div>
                    <button onClick={handleSubmitReview} className="btn-primary text-sm">
                      Submit Review
                    </button>
                  </div>
                )}

                {selectedSupplier.reviews?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSupplier.reviews.slice().reverse().slice(0, 10).map((review, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{review.buyerName}</span>
                            {review.isVerifiedPurchase && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">Verified Purchase</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(n => (
                              <span key={n} className={`text-xs ${n <= review.rating ? '' : 'opacity-20'}`}>⭐</span>
                            ))}
                          </div>
                        </div>
                        {review.title && <p className="text-xs font-medium text-gray-700 mb-1">{review.title}</p>}
                        <p className="text-xs text-gray-600">{review.comment}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    ))}
                    {selectedSupplier.reviews.length > 10 && (
                      <p className="text-xs text-gray-400 text-center pt-2">
                        +{selectedSupplier.reviews.length - 10} more reviews
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 text-sm">No reviews yet</p>
                    <p className="text-xs text-gray-300 mt-1">Be the first to review this supplier</p>
                  </div>
                )}
              </div>

              {/* Transaction Summary */}
              {selectedSupplier.transactionSummary && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Transaction History</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs">Total Orders</span>
                      <p className="font-semibold text-gray-900">{selectedSupplier.transactionSummary.totalOrders?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Completed</span>
                      <p className="font-semibold text-green-600">{selectedSupplier.transactionSummary.completedOrders?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Disputed</span>
                      <p className="font-semibold text-amber-600">{selectedSupplier.transactionSummary.disputedOrders || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Total Value</span>
                      <p className="font-semibold text-gray-900">
                        ${selectedSupplier.transactionSummary.totalValue?.amount?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-5xl mb-4">🤝</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Supplier</h3>
                <p className="text-sm text-gray-500">
                  Browse suppliers from the list to see their trust scores, reviews, verification status, and transaction history.
                  SokogateOS calculates trust scores automatically based on transaction data and verified reviews.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-gray-400">
                  <div className="p-2 bg-gray-50 rounded-lg">🔍 Verified Profiles</div>
                  <div className="p-2 bg-gray-50 rounded-lg">📊 Trust Scores</div>
                  <div className="p-2 bg-gray-50 rounded-lg">💰 Escrow Protection</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
