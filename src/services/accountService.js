// Account Service — minimal stub for accounts/contacts routes
// Will be expanded with full DB-backed implementation in a follow-up

const logger = require('../utils/logger');

/**
 * List accounts for a company
 */
async function list(companyId) {
  logger.debug('accountService.list called', { companyId });
  return [];
}

/**
 * Create a new account
 */
async function create(companyId, userId, body) {
  logger.debug('accountService.create called', { companyId, userId, body });
  return { id: 'stub', companyId, ...body };
}

/**
 * Find account by ID
 */
async function findById(id, companyId) {
  logger.debug('accountService.findById called', { id, companyId });
  return null;
}

/**
 * Update an account
 */
async function update(id, companyId, body) {
  logger.debug('accountService.update called', { id, companyId, body });
  return { id, companyId, ...body };
}

/**
 * Remove an account (soft delete, scoped to company)
 */
async function remove(id, companyId) {
  logger.debug('accountService.remove called', { id, companyId });
  // In full implementation: Account.findOneAndUpdate({ _id: id, companyId }, { isActive: false })
  return { id, companyId, deleted: true };
}

module.exports = { list, create, findById, update, remove };
