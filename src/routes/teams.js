const express = require('express');
const router = express.Router();
const teamService = require('../services/teamService');
const { authenticate } = require('../middleware/auth');
const { rbacAuthorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const teams = await teamService.list(req.user.companyId);
    res.json({ success: true, data: teams });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:teamId', async (req, res) => {
  try {
    const team = await teamService.get(req.params.teamId, req.user.id, req.user.role);
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

router.post('/', rbacAuthorize('teams', 'create'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const team = await teamService.create(req.user.companyId, req.user.id, { name, description });
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.patch('/:teamId', rbacAuthorize('teams', 'update'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const team = await teamService.update(req.params.teamId, req.user.id, { name, description });
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:teamId/members', rbacAuthorize('teams', 'manageMembers'), async (req, res) => {
  try {
    const { userId, role, invitedBy } = req.body;
    const team = await teamService.addMember(req.params.teamId, req.user.id, req.user.role, {
      userId,
      role,
      invitedBy,
    });
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete(
  '/:teamId/members/:memberId',
  rbacAuthorize('teams', 'manageMembers'),
  async (req, res) => {
    try {
      const team = await teamService.removeMember(
        req.params.teamId,
        req.user.id,
        req.user.role,
        req.params.memberId
      );
      res.json({ success: true, data: team });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

router.delete('/:teamId', rbacAuthorize('teams', 'delete'), async (req, res) => {
  try {
    const team = await teamService.delete(req.params.teamId, req.user.id, req.user.role);
    res.json({ success: true, data: team });
  } catch (err) {
    res.status(403).json({ success: false, error: err.message });
  }
});

module.exports = router;
