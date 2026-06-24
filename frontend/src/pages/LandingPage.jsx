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
        {menu && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm text-gray-600 hover:text-primary-600" onClick={() => setMenu(false)}>Features</a>
            <a href="#how" className="block text-sm text-gray-600 hover:text-primary-600" onClick={() => setMenu(false)}>How It Works</a>
            <a href="#pricing" className="block text-sm text-gray-600 hover:text-primary-600" onClick={() => setMenu(false)}>Pricing</a>
            <a href="#investors" className="block text-sm text-gray-600 hover:text-primary-600" onClick={() => setMenu(false)}>Investors</a>
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              <Link to="/login" className="text-sm font-medium text-primary-600 text-center py-2">Sign In</Link>
              <Link to="/login" className="text-sm font-semibold bg-primary-600 text-white text-center py-2.5 rounded-lg">Get Started Free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-primary-200 font-medium">AI Self-Improving Loop Active</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              AI That Runs Your Company
              <span className="block text-primary-300">While You Sleep</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-primary-200 max-w-2xl mx-auto">
              Autonomous AI agents handle sourcing, logistics, customs, and commerce —
              making African trade legible to AI. Self-improving. Always on.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login" className="px-8 py-3.5 text-base font-semibold bg-white text-primary-900 rounded-xl hover:bg-primary-50 shadow-xl hover:shadow-2xl transition-all">
                Get Started Free
              </Link>
              <a href="#how" className="px-8 py-3.5 text-base font-medium text-white border border-white/30 rounded-xl hover:bg-white/10 transition-all">
                Watch How It Works
              </a>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="mt-16 max-w-lg mx-auto bg-white/10 backdrop-blur rounded-2xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-primary-200 uppercase tracking-wider">Live AI Activity</span>
            </div>
            <div className="space-y-2 min-h-[60px]">
              <div className="flex items-start gap-3 text-sm">
                <span>{LIVE[idx].icon}</span>
                <p className="text-primary-100">{LIVE[idx].text}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* ====== PROBLEMS ====== */}
      <section id="how" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">The Problem</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-3">African Trade Is Broken</h2>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">Legacy systems and fragmented processes make procurement, logistics, and customs compliance slow, expensive, and opaque.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROBLEMS.map((p, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-2xl">{p.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-3">{p.t}</h3>
                <p className="text-sm text-gray-500 mt-2">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== SOLUTIONS ====== */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">The Solution</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-3">AI OS for Trade</h2>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">An autonomous operating system that runs your trade operations 24/7 through AI agents.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOLUTIONS.map((s, i) => (
              <div key={i} className="bg-gradient-to-br from-primary-50 to-indigo-50 rounded-xl p-6 border border-primary-100 shadow-sm">
                <span className="text-2xl">{s.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-3">{s.t}</h3>
                <p className="text-sm text-gray-500 mt-2">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section id="features" className="py-20 lg:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Platform Features</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-3">Everything You Need to Scale</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 hover:border-primary-200 hover:shadow-lg transition-all cursor-default">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-3">{f.t}</h3>
                <p className="text-sm text-gray-500 mt-2">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== PRICING ====== */}
      <section id="pricing" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider">Pricing</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-3">Simple, Transparent Pricing</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((p, i) => (
              <div key={i} className={`relative rounded-2xl p-8 border-2 shadow-sm ${p.pop ? 'border-primary-500 bg-primary-50 scale-105' : 'border-gray-200 bg-white'}`}>
                {p.pop && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-1 rounded-full">Popular</div>
                )}
                <h3 className="text-xl font-bold text-gray-900">{p.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold text-gray-900">{p.price}</span>
                  <span className="text-gray-500 ml-1">{p.period}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">{p.desc}</p>
                <ul className="mt-6 space-y-3">
                  {p.feats.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/login" className={`mt-8 block text-center py-3 rounded-xl font-semibold text-sm ${p.pop ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FAQ ====== */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${open === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open === i && (
                  <div className="px-6 pb-4 text-sm text-gray-600 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">SG</span>
              </div>
              <span className="font-semibold text-white">SokogateOS</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            </div>
            <p className="text-xs">© 2026 Sokogate Kenya. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}