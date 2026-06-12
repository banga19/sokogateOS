const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService');
const { authenticate } = require('../middleware/auth');
const { rbacAuthorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/roles', rbacAuthorize('teams', 'manageMembers'), async (req, res) => {
  try {
    const roles = await adminService.listRoles(req.user.companyId);
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/roles/seed', async (_req, res) => {
  try {
    const roles = await adminService.ensureSystemRoles();
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/roles', rbacAuthorize('users', 'manageSettings'), async (req, res) => {
  try {
    const { name, slug, description, permissions } = req.body;
    if (!name || !slug)
      return res.status(400).json({ success: false, error: 'name and slug are required.' });
    const role = await adminService.createRole(req.user.companyId, {
      name,
      slug,
      description,
      permissions,
    });
    res.status(201).json({ success: true, data: role });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.patch('/roles/:roleId', rbacAuthorize('users', 'manageSettings'), async (req, res) => {
  try {
    const role = await adminService.updateRole(req.params.roleId, req.user.companyId, req.body);
    res.json({ success: true, data: role });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/roles/:roleId', rbacAuthorize('users', 'manageSettings'), async (req, res) => {
  try {
    const result = await adminService.deleteRole(req.params.roleId, req.user.companyId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/users/:userId/role', rbacAuthorize('users', 'assignRole'), async (req, res) => {
  try {
    const { roleSlug } = req.body;
    if (!roleSlug) return res.status(400).json({ success: false, error: 'roleSlug is required.' });
    const user = await adminService.assignRole(req.params.userId, roleSlug, req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/invites', rbacAuthorize('users', 'invite'), async (req, res) => {
  try {
    const { email, name, role, teamIds } = req.body;
    if (!email || !name)
      return res.status(400).json({ success: false, error: 'email and name are required.' });
    const result = await adminService.inviteUser(req.user.companyId, req.user.id, {
      email,
      name,
      role,
      teamIds,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/stats', rbacAuthorize('analytics', 'view'), async (req, res) => {
  try {
    const stats = await adminService.platformStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/health', async (_req, res) => {
  try {
    const health = await adminService.health();
    res.json({ success: true, data: health });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
