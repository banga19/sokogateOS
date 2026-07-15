// Sequence Service — minimal stub for sequence routes
// Will be expanded with full DB-backed implementation in a follow-up

const logger = require('../utils/logger');

async function list(companyId) {
  logger.debug('sequenceService.list called', { companyId });
  return [];
}

async function create(companyId, userId, body) {
  logger.debug('sequenceService.create called', { companyId, userId, body });
  return { id: 'stub', companyId, ...body };
}

async function findById(id, companyId) {
  logger.debug('sequenceService.findById called', { id, companyId });
  return null;
}

async function update(id, companyId, body) {
  logger.debug('sequenceService.update called', { id, companyId, body });
  return { id, companyId, ...body };
}

async function remove(id, companyId) {
  logger.debug('sequenceService.remove called', { id, companyId });
  // In full implementation: Sequence.findOneAndUpdate({ _id: id, companyId }, { isActive: false })
  return { id, companyId, deleted: true };
}

module.exports = { list, create, findById, update, remove };
