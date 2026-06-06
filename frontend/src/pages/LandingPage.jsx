import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const LIVE = [
  { icon: '\u{1F6CD}', text: 'AI Sourcing Agent found 3 new suppliers in Guangzhou while you slept' },
  { icon: '\u{1F4E6}', text: 'Logistics Agent optimized Lagos→Mombasa route, saved 23%' },
  { icon: '\u{1F4F1}', text: 'WhatsApp order confirmed: 500 units from Korean supplier' },
  { icon: '\u{1F50D}', text: 'Customs Agent pre-cleared CUSTOMS-4421 for Kenya while you slept' },
  { icon: '\u{1F4B0}', text: 'Sokogate Pay escrow released $4,200 to supplier' },
  { icon: '\u{1F916}', text: 'AI Agents learned from 12 trades today, improving future suggestions' },
  { icon: '\u{1F4CA}', text: 'Export Readiness Score improved for 3 products based on recent transactions' },
]

const FAQ = [
  { q: 'What is SokogateOS?', a: 'AI That Runs Your Company While You Sleep — an autonomous AI operating system that handles sourcing, logistics, customs, and commerce through WhatsApp, so African traders can build and scale businesses without hiring.' },
  { q: 'How does pricing work?', a: 'Monthly subscription ($49 Starter, $149 Business) plus revenue share on transactions via Sokogate Pay. Like Polsia, we profit when you profit — our success is tied to yours.' },
  { q: 'Can I use WhatsApp?', a: 'Yes! Full WATI.io integration — orders, tracking, supplier matches, payments — all via WhatsApp. No new apps to learn.' },
  { q: 'What is the ERS?', a: 'Export Readiness Score — our AI evaluates compliance, quality, and logistics. Higher scores unlock trade finance and buyer matching.' },
  { q: 'How does it get smarter?', a: 'Every interaction feeds our self-improving loop. The system continuously learns from your trade patterns, preferences, and company history — getting better while you sleep.' },
  { q: 'Which countries?', a: 'Kenya, Nigeria, Ghana, South Africa, Egypt, Tanzania, Uganda. Trade corridors to China and South Korea.' },
  { q: 'How do I start?', a: 'Create account, upload documents, connect WhatsApp. AI agents begin sourcing within hours and work 24/7, even when you\'re offline.' },
]

const PROBLEMS = [
  { icon: '⏰', t: 'Slow Sourcing', d: 'Manual RFQs and opaque pricing delay shipments by weeks. Finding reliable Asian suppliers takes months.' },
  { icon: '\u{1F69A}', t: 'Complex Logistics', d: 'Fragmented freight and zero visibility into African shipping. One delay cascades your supply chain.' },
  { icon: '\u{1F4DC}', t: 'Compliance Barriers', d: 'Unique rules per country. One missed customs form holds containers for weeks and costs thousands.' },
  { icon: '\u{1F4BB}', t: 'Technical Complexity', d: 'Existing tools require expertise you don\'t have. You need trade operations, not another software to learn.' },
  { icon: '\u{1F6AA}', t: 'Time Constraints', d: 'You can\'t be available 24/7 to negotiate, track shipments, or handle customs delays.' },
]

const SOLUTIONS = [
  { icon: '\u{1F916}', t: 'AI That Sources', d: 'Agents search, negotiate, and match with verified suppliers. Weeks become hours.' },
  { icon: '\u{1F6A2}', t: 'End-to-End Logistics', d: 'Route optimization, real-time tracking, cold-chain. Visible factory-to-doorstep.' },
  { icon: '✅', t: 'Automated Compliance', d: 'Customs docs auto-generated per country. ERS tracks export readiness.' },
  { icon: '\u{1F4F1}', t: 'WhatsApp Commerce', d: 'Full WATI.io integration — orders, tracking, payments all via WhatsApp.' },
  { icon: '\u{1F4CA}', t: 'Export Readiness Score', d: 'AI evaluates compliance, quality, and logistics. Higher scores unlock trade finance.' },
  { icon: '\u{1F91D}', t: 'Self-Improving Loop', d: 'Every trade trains AI agents. Continuous optimization from user interactions.' },
]

const FEATURES = [
  { icon: '\u{1F916}', t: 'Autonomous AI Agents', d: 'Sourcing, logistics, customs — 24/7 operations without human handoffs.' },
  { icon: '\u{1F441}', t: 'Live Transparency', d: 'Watch every AI action in real-time — negotiations, routing, filing.' },
  { icon: '\u{1F4F1}', t: 'WhatsApp Commerce', d: 'WATI.io integration. Order, track, pay — all through WhatsApp.' },
  { icon: '\u{1F4CA}', t: 'ERS Scoring', d: 'Proprietary compliance + quality scoring. Match with buyers and finance.' },
  { icon: '\u{1F501}', t: 'Self-Improving Loop', d: 'Every trade trains the system. Continuous optimization.' },
  { icon: '\u{1F91D}', t: 'Supplier Trust', d: 'Verified ratings, history, and risk scores for every supplier.' },
  { icon: '\u{1F30D}', t: 'Customs Engine', d: 'HACCP, Halal, phytosanitary automation for all trade corridors.' },
  { icon: '\u{1F4B3}', t: 'Sokogate Pay', d: 'Multi-currency escrow (KES, NGN, CNY, KRW) with M-Pesa + Alipay.' },
  { icon: '\u{1F310}', t: 'Memory System', d: 'Remembers your preferences, past decisions, and company context for consistency.' },
  { icon: '\u{1F680}', t: 'Distribution Engine', d: 'Use product capabilities as marketing — AI raising funds autonomously.' },
]

const PLANS = [
  { name: 'Starter', price: '$49', period: '/mo', pop: false, desc: 'Small import/export businesses.', feats: ['Core AI Sourcing','Basic Logistics','WhatsApp Commerce','ERS Score','Supplier Trust','5 AI Tasks/mo'], cta: 'Start Free Trial' },
  { name: 'Business', price: '$149', period: '/mo', pop: true, desc: 'Growing trading companies.', feats: ['Everything in Starter','Customs Engine','Soko Ship Priority','Sokogate Pay Escrow','WhatsApp Broadcasts','Unlimited AI Tasks','Priority Support'], cta: 'Start Free Trial' },
  { name: 'Enterprise', price: 'Custom', period: '', pop: false, desc: 'Large wholesalers.', feats: ['Everything in Business','Dedicated AI Instances','White-Label','API Access','Custom Integrations','Account Manager','SLA'], cta: 'Contact Sales' },
]

export default function LandingPage() {
  const [idx, setIdx] = useState(0)
  const [open, setOpen] = useState(null)
  const [menu, setMenu] = useState(false)
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % LIVE.length), 3000); return () => clearInterval(t) }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* ====== NAV ====== */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-white font-extrabold text-sm">SG</span>
            </div>
            <span className="font-bold text-xl text-gray-900">SokogateOS</span>
          </Link>
          <div className="hidden lg:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">Features</a>
            <a href="#how" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">Pricing</a>
            <a href="#investors" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">Investors</a>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary-600 px-3 py-2">Sign In</Link>
            <Link to="/login" className="px-5 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-sm">Get Started Free</Link>
          </div>
          <button className="lg:hidden p-2 text-xl" onClick={() => setMenu(!menu)}>{menu ? '✕' : '☰'}</button>
        </div>
        {menu