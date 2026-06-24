const express = require('express');
const router = express.Router();
const as = require('../services/accountService');
const { authenticate } = require('../middleware/auth');
const { rbacAuthorize: rbac } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', rbac('accounts', 'read'), async (req, res) => {
  try {
    const list = await as.list(req.companyId);
    res.json({ items: list, count: list.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', rbac('accounts', 'write'), async (req, res) => {
  try {
    const a = await as.create(req.companyId, req.user._id, req.body);
    res.status(201).json(a);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', rbac('accounts', 'read'), async (req, res) => {
  try {
    res.json(await as.findById(req.params.id, req.companyId));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.patch('/:id', rbac('accounts', 'write'), async (req, res) => {
  try {
    res.json(await as.update(req.params.id, req.companyId, req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', rbac('accounts', 'delete'), async (req, res) => {
  try {
    res.json(await as.remove(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
