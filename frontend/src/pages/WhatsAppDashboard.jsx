import React, { useState, useEffect, useCallback, useRef } from 'react'
import { whatsappAPI, mpesaAPI } from '../services/api'

export default function WhatsAppDashboard() {
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [composeText, setComposeText] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [nlpResult, setNlpResult] = useState(null)
  const [stats, setStats] = useState(null)
  const [activeTab, setActiveTab] = useState('conversations')
  const [mpesaModal, setMpesaModal] = useState(false)
  const [mpesaAmount, setMpesaAmount] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [mpesaResult, setMpesaResult] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadConversations()
    loadStats()
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.from)
    }
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    try {
      const { data } = await whatsappAPI.getConversations()
      setConversations(data.data || [])
    } catch (err) {
      console.error('Failed to load conversations:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (from) => {
    try {
      const { data } = await whatsappAPI.getConversations({ from, limit: 100 })
      setMessages((data.data || []).reverse())
    } catch (err) {
      console.error('Failed to load messages:', err.message)
    }
  }

  const loadStats = async () => {
    try {
      const { data } = await whatsappAPI.getStatus()
      setStats(data.data)
    } catch (err) {
      // Non-critical
    }
  }

  const handleSendMessage = async () => {
    if (!composeText.trim() || !phoneNumber.trim()) return
    setSending(true)
    try {
      const { data } = await whatsappAPI.sendMessage(phoneNumber.trim(), composeText.trim())
      if (data.success) {
        setComposeText('')
        // Refresh conversations after sending
        setTimeout(loadConversations, 500)
      }
    } catch (err) {
      console.error('Failed to send message:', err.message)
    } finally {
      setSending(false)
    }
  }

  const handleParseText = async () => {
    if (!composeText.trim()) return
    try {
      const { data } = await whatsappAPI.parseNLP(composeText.trim())
      setNlpResult(data.data)
    } catch (err) {
      console.error('NLP parse failed:', err.message)
    }
  }

  const handleMpesaPayment = async () => {
    if (!mpesaAmount || !mpesaPhone) return
    try {
      const { data } = await mpesaAPI.initiatePayment({
        amount: parseFloat(mpesaAmount),
        phoneNumber: mpesaPhone.trim(),
        reference: `WA-${Date.now()}`
      })
      setMpesaResult(data.data)
    } catch (err) {
      console.error('M-Pesa payment failed:', err.message)
      setMpesaResult({ error: err.message })
    }
  }

  const groupedConversations = conversations.reduce((groups, msg) => {
    const key = msg.from
    if (!groups[key]) {
      groups[key] = {
        from: msg.from,
        lastMessage: msg.content,
        lastTime: msg.createdAt,
        contextType: msg.contextType,
        nlpIntent: msg.nlpProcessing?.intent,
        messageCount: 0,
        conversationId: msg.conversationId
      }
    }
    groups[key].messageCount++
    if (new Date(msg.createdAt) > new Date(groups[key].lastTime)) {
      groups[key].lastMessage = msg.content
      groups[key].lastTime = msg.createdAt
      groups[key].contextType = msg.contextType
      groups[key].nlpIntent = msg.nlpProcessing?.intent
    }
    return groups
  }, {})

  const conversationList = Object.values(groupedConversations)
    .sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))

  const intentColors = {
    sourcing_request: 'bg-blue-100 text-blue-700',
    order_status: 'bg-purple-100 text-purple-700',
    supplier_search: 'bg-teal-100 text-teal-700',
    quote_request: 'bg-amber-100 text-amber-700',
    payment_inquiry: 'bg-green-100 text-green-700',
    shipment_tracking: 'bg-cyan-100 text-cyan-700',
    customs_query: 'bg-orange-100 text-orange-700',
    support: 'bg-red-100 text-red-700',
    greeting: 'bg-gray-100 text-gray-600',
    unknown: 'bg-gray-50 text-gray-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Commerce Co-pilot</h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered WhatsApp sourcing assistant for African importers
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="px-3 py-1.5 bg-white rounded-lg border border-gray-200">
              <span className="text-gray-500">Messages: </span>
              <span className="font-semibold">{stats.totalMessages || 0}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
              stats.twilioConnected
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            }`}>
              {stats.twilioConnected ? 'Twilio Connected' : 'Dev Mode'}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'conversations', label: 'Conversations', icon: '💬' },
          { key: 'compose', label: 'Send Message', icon: '✉️' },
          { key: 'nlp', label: 'NLP Parse', icon: '🧠' },
          { key: 'mpesa', label: 'M-Pesa Payment', icon: '📱' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversations Tab */}
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation List */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Conversations</h2>
              <p className="text-xs text-gray-400">{conversationList.length} active</p>
            </div>
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {conversationList.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  {loading ? 'Loading conversations...' : 'No conversations yet. Messages will appear here when customers reach out via WhatsApp.'}
                </div>
              ) : (
                conversationList.map(conv => (
                  <button
                    key={conv.from}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                      selectedConversation?.from === conv.from ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                        {conv.from.replace('254', '0')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(conv.lastTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-1">{conv.lastMessage}</p>
                    <div className="flex items-center gap-2">
                      {conv.nlpIntent && conv.nlpIntent !== 'unknown' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${intentColors[conv.nlpIntent] || 'bg-gray-100 text-gray-600'}`}>
                          {conv.nlpIntent.replace('_', ' ')}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{conv.messageCount} msgs</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Conversation Detail */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConversation.from.replace('254', '0')}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {selectedConversation.conversationId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        selectedConversation.contextType === 'rfq' ? 'bg-blue-100 text-blue-700' :
                        selectedConversation.contextType === 'shipment' ? 'bg-cyan-100 text-cyan-700' :
                        selectedConversation.contextType === 'payment' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedConversation.contextType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto max-h-[400px] space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">No messages loaded</p>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={msg.messageId || i} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[75%] rounded-lg p-3 text-sm ${
                          msg.direction === 'inbound'
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-primary-600 text-white'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.nlpProcessing?.intent && msg.direction === 'inbound' && (
                            <div className="mt-1.5 pt-1.5 border-t border-white/20">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                msg.direction === 'inbound' ? 'bg-gray-200 text-gray-600' : 'bg-white/20 text-white'
                              }`}>
                                {msg.nlpProcessing.intent.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                          <p className={`text-[10px] mt-1 ${msg.direction === 'inbound' ? 'text-gray-400' : 'text-white/60'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-gray-500 text-sm">Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Send WhatsApp Message</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (E.164 format)</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="e.g., 254712345678"
              className="input w-full"
            />
            <p className="text-xs text-gray-400 mt-1">Kenyan numbers: 254XXXXXXXXX (without +)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              rows={4}
              placeholder="Type your message here... The AI will automatically detect intents like sourcing requests, shipment tracking, etc."
              className="input w-full resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSendMessage}
              disabled={sending || !composeText.trim() || !phoneNumber.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Sending...
                </>
              ) : (
                <>
                  <span>✉️</span>
                  Send via WhatsApp
                </>
              )}
            </button>
            <button
              onClick={handleParseText}
              disabled={!composeText.trim()}
              className="btn-secondary flex items-center gap-2"
            >
              <span>🧠</span>
              Parse NLP
            </button>
          </div>

          {/* Quick templates */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2 font-medium">QUICK TEMPLATES</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Sourcing Request', text: 'Find me 5000 meters of premium cotton fabric delivered to Mombasa' },
                { label: 'Track Shipment', text: 'Where is my shipment SHIP-A3B2C1?' },
                { label: 'Supplier Search', text: 'Find verified textile suppliers in India' },
                { label: 'Price Quote', text: 'How much for 2000kg of Grade A coffee beans FOB Mombasa?' }
              ].map(t => (
                <button
                  key={t.label}
                  onClick={() => {
                    setComposeText(t.text)
                    setPhoneNumber('254712345678')
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NLP Parse Tab */}
      {activeTab === 'nlp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">NLP Parser</h2>
            <textarea
              value={composeText}
              onChange={e => setComposeText(e.target.value)}
              rows={4}
              placeholder="Type a natural language request to test NLP parsing..."
              className="input w-full resize-none mb-3"
            />
            <button
              onClick={handleParseText}
              disabled={!composeText.trim()}
              className="btn-primary"
            >
              Parse Text
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Parse Result</h2>
            {nlpResult ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Intent:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    intentColors[nlpResult.intent] || 'bg-gray-100 text-gray-600'
                  }`}>
                    {nlpResult.intent?.replace('_', ' ')}
                  </span>
                  <span className="text-gray-400 text-xs">
                    (confidence: {(nlpResult.confidence * 100).toFixed(0)}%)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Sentiment:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    nlpResult.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    nlpResult.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    nlpResult.sentiment === 'urgent' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {nlpResult.sentiment}
                  </span>
                </div>

                {nlpResult.structuredQuery && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wider">Structured Query</h3>
                    <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(nlpResult.structuredQuery, null, 2)}
                    </pre>
                  </div>
                )}

                {nlpResult.extractedEntities?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wider">Extracted Entities</h3>
                    <div className="space-y-1">
                      {nlpResult.extractedEntities.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{e.type}</span>
                          <span className="text-gray-700">{typeof e.value === 'string' ? e.value : JSON.stringify(e.value)}</span>
                          <span className="text-gray-400">({(e.confidence * 100).toFixed(0)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-400 text-sm">Enter text and click "Parse Text" to see NLP results</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* M-Pesa Payment Tab */}
      {activeTab === 'mpesa' && (
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">📱</div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">M-Pesa Payment</h2>
                <p className="text-sm text-gray-500">Send payment request via M-Pesa to customer</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone Number</label>
              <input
                type="tel"
                value={mpesaPhone}
                onChange={e => setMpesaPhone(e.target.value)}
                placeholder="254XXXXXXXXX"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">KES</span>
                <input
                  type="number"
                  value={mpesaAmount}
                  onChange={e => setMpesaAmount(e.target.value)}
                  placeholder="e.g., 5000"
                  min="10"
                  max="150000"
                  className="input w-full pl-12"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Min: KES 10 | Max: KES 150,000</p>
            </div>

            <button
              onClick={handleMpesaPayment}
              disabled={!mpesaAmount || !mpesaPhone}
              className="btn-primary w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <span>📱</span>
              Send M-Pesa Payment Request
            </button>

            {mpesaResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                mpesaResult.error
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-green-50 border border-green-200'
              }`}>
                {mpesaResult.error ? (
                  <div className="flex items-center gap-2 text-red-700 text-sm">
                    <span>❌</span>
                    {mpesaResult.error}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-green-700">
                      <span>✅</span>
                      <span className="font-medium">Payment request sent successfully</span>
                    </div>
                    <div className="text-gray-600 text-xs space-y-1 pl-6">
                      <p>Checkout ID: {mpesaResult.checkoutRequestId}</p>
                      <p>Amount: KES {mpesaResult.amount?.toLocaleString()}</p>
                      <p>Status: {mpesaResult.status}</p>
                      <p className="text-green-600 mt-1">{mpesaResult.customerMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-2">QUICK AMOUNTS</p>
              <div className="flex flex-wrap gap-2">
                {[500, 1000, 2500, 5000, 10000, 25000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setMpesaAmount(String(amt))}
                    className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    KES {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
