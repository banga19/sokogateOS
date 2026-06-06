// Investor data for sokogateOS - Africa-China-Korea B2B Trade Platform

export const investorData = {
  // Company Overview
  company: {
    name: "SokogateOS",
    tagline: "The AI operating system making African companies legible to global trade",
    mission: "To enable African wholesalers, importers, and exporters to trade seamlessly with China and Korea through autonomous AI agents.",
    vision: "Africa as the premier supplier of value-added goods to Asia's manufacturing powerhouses",
    founded: "2025",
    hq: "Nairobi, Kenya",
    website: "sokogate.com"
  },

  // Problem Statement (from investor perspective)
  problem: {
    title: "The $2.5 Trillion African Trade Gap",
    metrics: [
      { label: "Annual informal trade value", value: "$800B+", source: "AfDB 2024" },
      { label: "SMEs lacking export readiness", value: "68%", source: "World Bank 2024" },
      { label: "Avg. time to find reliable Asian supplier", value: "4-6 months", source: "IFC Survey" },
      { label: "Trade finance rejection rate for African SMEs", value: "42%", source: "Afreximbank" }
    ],
    details: [
      "African SMEs struggle with fragmented, manual trade processes",
      "Lack of verified supplier networks increases risk and cost",
      "Complex compliance requirements delay shipments by weeks",
      "Limited access to trade finance constrains growth",
      "No unified platform exists for Africa-China-Korea trade corridor"
    ]
  },

  // Solution Overview
  solution: {
    title: "SokogateOS: AI-Powered B2B Trade Infrastructure",
    subtitle: "An autonomous operating system that makes companies trade-ready",
    how_it_works: [
      "Step 1: Business registers & uploads compliance documents",
      "Step 2: AI agents analyze and calculate Export Readiness Score (ERS)",
      "Step 3: Autonomous sourcing finds verified suppliers in China/Korea",
      "Step 4: Smart logistics optimizes routes and handles customs",
      "Step 5: Sokogate Pay provides escrow and multi-currency settlement",
      "Step 6: Every transaction trains the system via self-improving loop"
    ],
    unique_advantages: [
      "Proprietary Export Readiness Score (ERS) framework",
      "24/7 autonomous AI agents for sourcing, logistics, compliance",
      "WhatsApp-first interface for African trader accessibility",
      "Direct integration with QMe AI operating system",
      "Built specifically for AfCFTA requirements",
      "Korea-Africa corridor specialization via KOTRA partnership"
    ]
  },

  // Market Analysis
  market: {
    tam: "$2.5 Trillion", // Total African-China-Korea trade value
    sam: "$150 Billion",  // Addressable market (formal SME trade)
    som: "$5 Billion",    // Obtainable market (first 3 years)
    growth_rate: "12% CAGR",
    target_countries: [
      { name: "Kenya", role: "HQ & East Africa hub" },
      { name: "Nigeria", role: "West Africa hub" },
      { name: "Ghana", role: "Gateway to Francophone West Africa" },
      { name: "South Africa", role: "Southern Africa hub" },
      { name: "Egypt", role: "North Africa & Suez corridor" },
      { name: "Tanzania", role: "Indian Ocean trade gateway" },
      { name: "Uganda", role: "Landlocked trade facilitator" }
    ],
    trade_corridors: [
      { route: "China→Africa", status: "Established", volume: "$180B annually" },
      { route: "Korea→Africa", status: "Emerging (2026 AfCFTA focus)", volume: "$45B annually" },
      { route: "Africa↔Africa", status: "Intra-AfCFTA", volume: "$320B annually" }
    ],
    competitors: [
      { name: "Alibaba.com", weakness: "Generic, not Africa-specialized" },
      { name: "Waystocap", weakness: "Limited to Francophone Africa" },
      { name: "Tridge", weakness: "Focus on agritech, not manufactured goods" },
      { name: "ExportHub", weakness: "No AI agents, manual processes" }
    ]
  },

  // Business Model
  business_model: {
    type: "SaaS + Transaction Fee Hybrid",
    pricing_tiers: [
      {
        name: "Starter",
        price: "$49/month",
        features: [
          "Core AI sourcing agent (5 tasks/month)",
          "Basic logistics tracking",
          "WhatsApp commerce",
          "ERS scoring",
          "Supplier directory access",
          "Community support"
        ],
        target: "New importers/exporters (<$50K monthly volume)"
      },
      {
        name: "Business",
        price: "$149/month",
        features: [
          "Everything in Starter",
          "Unlimited AI tasks",
          "Priority supplier matching",
          "Soko Ship logistics priority",
          "Sokogate Pay escrow (up to $10K/month)",
          "WhatsApp broadcasts",
          "Priority support"
        ],
        target: "Growing trading companies ($50K-$500K monthly)"
      },
      {
        name: "Enterprise",
        price: "Custom",
        features: [
          "Everything in Business",
          "Dedicated AI instances",
          "White-label portal",
          "API access",
          "Custom integrations (ERP/CRM)",
          "Account manager",
          "99.9% uptime SLA",
          "Custom ERS weighting"
        ],
        target: "Established wholesalers (>$500K monthly)"
      }
    ],
    revenue_streams: [
      { type: "Subscription SaaS", percentage: "60%", description: "Monthly tiered subscriptions" },
      { type: "Transaction Fees", percentage: "30%", description: "1.5% of Sokogate Pay volume" },
      { type: "Value-Added Services", percentage: "10%", description: "Customs brokerage, trade finance, data analytics" }
    ],
    unit_economics: {
      cac: "$120",
      ltv: "$2,400",
      payback_period: "2 months",
      gross_margin: "78%",
      ltv_cac_ratio: "20:1"
    }
  },

  // Traction & Metrics
  traction: {
    as_of: "June 2026",
    metrics: [
      { label: "Countries live", value: "7", target: "12 by EOY" },
      { label: "Verified suppliers", value: "520+", target: "2,000+" },
      { label: "Trade routes optimized", value: "180+", target: "500+" },
      { label: "GMV processed", value: "$2.1M", target: "$50M by EOY" },
      { label: "Average ERS improvement", value: "+34 points", target: "maintain >30" },
      { label: "User retention (30-day)", value: "89%", target: ">90%" },
      { label: "WhatsApp engagement rate", value: "76%", target: ">80%" }
    ],
    milestones: [
      { date: "Q1 2026", achievement: "MVP launched with core AI agents" },
      { date: "Q2 2026", achievement: "WATI.io integration live" },
      { date: "Q3 2026", achievement: "Korea compliance module completed" },
      { date: "Q4 2026", achievement: "Reach $10M annualized GMV" }
    ]
  },

  // Team
  team: [
    {
      name: "Bangaly Fofana",
      role: "CEO & Co-Founder",
      background: "Ex-Maersk Africa Trade Director, 15 years in African logistics",
      equity: "18%"
    },
    {
      name: "Dr. Aisha Mohamed",
      role: "CTO & Co-Founder",
      background: "PhD AI/Multi-agent Systems, ex-IBM Research Africa",
      equity: "15%"
    },
    {
      name: "Kenji Tanaka",
      role: "Head of Korea Relations",
      background: "Ex-KOTRA Nairobi Director, Korea trade specialist",
      equity: "5%"
    },
    {
      name: "Sarah Chen",
      role: "VP of Product",
      background: "Ex-Stripe