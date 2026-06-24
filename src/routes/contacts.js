const express = require('express');
const router = express.Router();
const cs = require('../services/contactService');
const as = require('../services/accountService');
const { authenticate } = require('../middleware/auth');
const { rbacAuthorize: rbac } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', rbac('contacts', 'read'), async (req, res) => {
  try {
    const list = await cs.list(req.companyId, {
      tags: req.query.tag ? { $in: req.query.tag.split(',') } : {},
    });
    res.json({ items: list, count: list.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', rbac('contacts', 'write'), async (req, res) => {
  try {
    const c = await cs.create(req.companyId, req.user._id, req.body);
    res.status(201).json(c);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/:id', rbac('contacts', 'read'), async (req, res) => {
  try {
    res.json(await cs.findById(req.params.id));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.patch('/:id', rbac('contacts', 'write'), async (req, res) => {
  try {
    res.json(await cs.update(req.params.id, req.companyId, req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/account/:accountId', rbac('contacts', 'write'), async (req, res) => {
  try {
    res.json(await cs.assignAccount(req.params.id, req.params.accountId, req.companyId));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', rbac('contacts', 'delete'), async (req, res) => {
  try {
    res.json(await cs.remove(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
