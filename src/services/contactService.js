const mongoose = require('mongoose');
const Contact = require('../models/contact');
const { logger } = require('../utils/logger');

class ContactService {
  validateStatus(s) {
    const valid = ['lead', 'prospect', 'qualified', 'unqualified', 'opportunity', 'customer', 'churned'];
    if (!valid.includes(s)) throw new Error(`Invalid status: ${s}`);
  }

  async create(companyId, ownerId, data) {
    this.validateStatus(data.status || 'lead');
    const c = await Contact.create({ ...data, companyId, ownerId });
    logger.info(`Contact created: ${c._id}`);
    return c;
  }

  async findById(contactId) {
    const c = await Contact.findOne({ _id: contactId, isActive: true });
    if (!c) throw new Error('Contact not found');
    return c;
  }

  async list(companyId, filter = {}) {
    const q = { companyId, isActive: true };
    if (filter.tags && filter.tags.$in) q.tags = { $in: filter.tags.$in };
    return Contact.find(q).sort({ createdAt: -1 });
  }

  async update(contactId, companyId, patch) {
    if (patch.status) this.validateStatus(patch.status);
    const c = await Contact.findOneAndUpdate({ _id: contactId, companyId, isActive: true }, patch, { new: true });
    if (!c) throw new Error('Contact not found');
    logger.info(`Contact updated: ${c._id}`);
    return c;
  }

  async assignAccount(contactId, accountId, companyId) {
    const c = await Contact.findOneAndUpdate({ _id: contactId, companyId, isActive: true }, { accountId }, { new: true });
    if (!c) throw new Error('Contact not found');
    logger.info(`Contact ${c._id} assigned to account ${accountId}`);
    return c;
  }

  async remove(contactId) {
    const c = await Contact.findOneAndUpdate({ _id: contactId, isActive: true }, { isActive: false }, { new: true });
    if (!c) throw new Error('Contact not found');
    logger.info(`Contact deleted: ${c._id}`);
    return { deleted: true };
  }
}

module.exports = new ContactService();
