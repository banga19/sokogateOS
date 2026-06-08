// Agent registry for Hermes Agent System
// Exports all specialized agents for easy importing

const { ResearchAgent } = require('./specialized/researchAgent');
const { AnalysisAgent } = require('./specialized/analysisAgent');
const { OptimizationAgent } = require('./specialized/optimizationAgent');
const { ComplianceAgent } = require('./specialized/complianceAgent');
const { MarketIntelligenceAgent } = require('./specialized/marketIntelligenceAgent');

module.exports = {
  ResearchAgent,
  AnalysisAgent,
  OptimizationAgent,
  ComplianceAgent,
  MarketIntelligenceAgent
};