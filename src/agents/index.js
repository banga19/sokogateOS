// Agent Exports for sokogateOS Autonomous AI Agent Engine
// Export all specialized agents for easy importing

const ChatAgent = require('./chatAgent');
const SourcingAgent = require('./specialized/sourcingAgent');
const CustomizationAgent = require('./specialized/customizationAgent');
const LogisticsAgent = require('./specialized/logisticsAgent');
const ComplianceAgent = require('./specialized/complianceAgent');
const NegotiationAgent = require('./specialized/negotiationAgent');

module.exports = {
  ChatAgent,
  SourcingAgent,
  CustomizationAgent,
  LogisticsAgent,
  ComplianceAgent,
  NegotiationAgent
};