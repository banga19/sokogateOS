const express = require('express');
const router = express.Router();
const ss = require('../services/sequenceService');
const { authenticate } = require('../middleware/auth');
const { rbacAuthorize: rbac } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', rbac('sequences', 'read'), async (req, res) => {
  try {
    const list = await ss.list(req.user.companyId);
    res.json({ items: list, count: list.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', rbac('sequences', 'write'), async (req, res) => {
  try {
    const s = await ss.create(req.user.companyId, req.user._id, req.body);
    res.status(201).json(s);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', rbac('sequences', 'read'), async (req, res) => {
  try {
    res.json(await ss.findById(req.params.id, req.user.companyId));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.patch('/:id', rbac('sequences', 'write'), async (req, res) => {
  try {
    res.json(await ss.update(req.params.id, req.user.companyId, req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', rbac('sequences', 'delete'), async (req, res) => {
  try {
    res.json(await ss.remove(req.params.id, req.user.companyId));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
