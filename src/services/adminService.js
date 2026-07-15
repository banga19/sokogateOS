const mongoose = require('mongoose');
const Role = require('../models/role');
const logger = require('../utils/logger');

function hasPrototypeKey(obj) {
  if (!obj || typeof obj !== 'object') return false;
  // Check both own keys AND nested prototype keys recursively
  // This prevents bypass attempts like {"__proto__": {"isAdmin": true}}
  // where __proto__ is a direct key, not on the prototype chain
  const blockedKeys = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.keys(obj)) {
    if (blockedKeys.includes(key)) return true;
    // Deep check nested objects
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasPrototypeKey(obj[key])) return true;
    }
  }
  return false;
}

const SYSTEM_ROLES = [
  { slug: 'super_admin', name: 'Super Admin', permissions: [{ domain: '*', actions: ['*'] }] },
  {
    slug: 'company_admin',
    name: 'Company Admin',
    permissions: [
      { domain: 'contacts', actions: ['create', 'read', 'update', 'delete'] },
      { domain: 'accounts', actions: ['create', 'read', 'update', 'delete'] },
      {
        domain: 'sequences',
        actions: ['create', 'read', 'update', 'delete', 'enroll', 'pause', 'resume'],
      },
      { domain: 'campaigns', actions: ['create', 'read', 'update', 'delete', 'launch', 'pause'] },
      { domain: 'calls', actions: ['read', 'listen', 'score', 'export'] },
      { domain: 'analytics', actions: ['view', 'export'] },
      { domain: 'integrations', actions: ['connect', 'disconnect', 'configure'] },
      { domain: 'users', actions: ['read', 'invite', 'update', 'deactivate', 'assignRole'] },
      { domain: 'teams', actions: ['create', 'read', 'update', 'delete', 'manageMembers'] },
      { domain: 'billing', actions: ['view', 'update', 'downloadInvoice'] },
    ],
  },
  {
    slug: 'sales_rep',
    name: 'Sales Rep',
    permissions: [
      { domain: 'contacts', actions: ['create', 'read', 'update'] },
      { domain: 'accounts', actions: ['read', 'update'] },
      { domain: 'sequences', actions: ['read', 'enroll', 'pause', 'resume'] },
      { domain: 'campaigns', actions: ['read', 'launch'] },
      { domain: 'calls', actions: ['read', 'listen'] },
      { domain: 'analytics', actions: ['view'] },
    ],
  },
  {
    slug: 'sdr',
    name: 'SDR',
    permissions: [
      { domain: 'contacts', actions: ['create', 'read', 'update'] },
      { domain: 'accounts', actions: ['read'] },
      { domain: 'sequences', actions: ['read', 'enroll'] },
      { domain: 'campaigns', actions: ['read', 'launch'] },
      { domain: 'calls', actions: ['read'] },
      { domain: 'analytics', actions: ['view'] },
    ],
  },
  {
    slug: 'manager',
    name: 'Sales Manager',
    permissions: [
      { domain: 'contacts', actions: ['create', 'read', 'update', 'delete', 'export'] },
      { domain: 'accounts', actions: ['create', 'read', 'update', 'delete'] },
      {
        domain: 'sequences',
        actions: ['create', 'read', 'update', 'delete', 'enroll', 'pause', 'resume'],
      },
      { domain: 'campaigns', actions: ['create', 'read', 'update', 'delete', 'launch', 'pause'] },
      { domain: 'calls', actions: ['read', 'listen', 'score', 'export'] },
      { domain: 'analytics', actions: ['view', 'export'] },
      { domain: 'users', actions: ['read', 'invite'] },
      { domain: 'teams', actions: ['read', 'manageMembers'] },
    ],
  },
];

class AdminService {
  async ensureSystemRoles() {
    const ops = SYSTEM_ROLES.map((r) =>
      Role.findOneAndUpdate(
        { slug: r.slug, companyId: null },
        { $set: { name: r.name, permissions: r.permissions, isSystem: true, isActive: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean()
    );
    const result = await Promise.all(ops);
    logger.info(`AdminService: ensured ${result.length} system roles`);
    return result;
  }

  async listRoles(companyId) {
    return Role.find({ $or: [{ companyId: null }, { companyId }] }).sort({ isSystem: -1, name: 1 });
  }

  async createRole(companyId, { name, slug, description = '', permissions = [] }) {
    const exists = await Role.findOne({ companyId, slug });
    if (exists) throw new Error(`Role "${slug}" already exists in this company.`);
    const role = await Role.create({
      name,
      slug,
      description,
      permissions,
      companyId,
      isSystem: false,
    });
    return role;
  }

  async updateRole(roleId, companyId, patch) {
    if (patch.slug) throw new Error('Cannot change role slug — create a new role.');
    const role = await Role.findOne({ _id: roleId, companyId });
    if (!role) throw new Error('Role not found.');
    if (hasPrototypeKey(patch)) {
      throw new Error('Invalid request payload');
    }
    Object.assign(role, patch);
    await role.save();
    return role;
  }

  async deleteRole(roleId, companyId) {
    const role = await Role.findOne({ _id: roleId, companyId, isSystem: { $ne: true } });
    if (!role) throw new Error('Role not found or is a system role (cannot delete).');
    await Role.findByIdAndUpdate(roleId, { $set: { isActive: false } });
    return { deleted: true };
  }

  async assignRole(userId, roleSlug, assignedBy) {
    const role = await Role.findOne({ slug: roleSlug, isActive: true });
    if (!role) throw new Error(`Role "${roleSlug}" not found.`);
    const user = await require('../models/user').findById(userId);
    if (!user) throw new Error('User not found.');
    user.role = roleSlug;
    await user.save();
    const safe = user.toObject ? user.toObject() : user;
    delete safe.password;
    logger.info(`AdminService: assigned role "${roleSlug}" to user ${userId} by ${assignedBy}`);
    return safe;
  }

  async inviteUser(companyId, invitedBy, { email, name, role, teamIds }) {
    // In a full implementation, this would:
    // 1. Check if user already exists
    // 2. If exists, add to company
    // 3. If not, create invitation token and send email
    logger.info(
      `AdminService: invited user ${email} (${name}) to company ${companyId} by ${invitedBy}`
    );
    return {
      _id: new mongoose.Types.ObjectId().toString(),
      email,
      name,
      role: role || 'member',
      teamIds: teamIds || [],
      companyId,
      invitedBy,
      status: 'pending',
      createdAt: new Date(),
    };
  }

  async platformStats() {
    // Return aggregate platform statistics
    const User = require('../models/user');
    const Team = require('../models/team');
    const Account = require('../models/account');

    const [totalUsers, totalTeams, totalAccounts] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Team.countDocuments({ isActive: true }),
      Account.countDocuments({ isActive: true }),
    ]);

    return { totalUsers, totalTeams, totalAccounts };
  }

  async health() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}

module.exports = new AdminService();
