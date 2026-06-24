const express = require('express');
const router = express.Router();
const Enrollment = require('../models/enrollment');
const Sequence = require('../models/sequence');
const Contact = require('../models/contact');
const { authenticate } = require('../middleware/auth');
const { rbacAuthorize: rbac } = require('../middleware/rbac');

router.use(authenticate);

router.post('/', rbac('enrollments', 'write'), async (req, res) => {
  try {
    const { contactId, sequenceId } = req.body;
    const [contact, sequence] = await Promise.all([
      Contact.findById(contactId),
      Sequence.findById(sequenceId),
    ]);
    if (!contact || !sequence) throw new Error('Contact or sequence not found.');

    const existing = await Enrollment.findOne({ contactId, sequenceId, companyId: req.companyId });
    if (existing) throw new Error('Contact already enrolled in this sequence.');

    const enrollment = await Enrollment.create({
      contactId,
      sequenceId,
      companyId: req.companyId,
      ownerId: req.user._id,
      contactSnapshot: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
      },
      sequenceSnapshot: { name: sequence.name, steps: sequence.steps },
    });

    res.status(201).json(enrollment);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get('/', rbac('enrollments', 'read'), async (req, res) => {
  try {
    const q = {
      companyId: req.companyId,
      ...(req.query.status ? { status: req.query.status } : {}),
    };
    const list = await Enrollment.find(q)
      .sort({ enrolledAt: -1 })
      .populate('contactId', 'firstName lastName email')
      .populate('sequenceId', 'name');
    res.json({ items: list, count: list.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/step', rbac('enrollments', 'write'), async (req, res) => {
  try {
    const e = await Enrollment.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!e) throw new Error('Enrollment not found.');
    const { step, status } = req.body;
    if (step != null) {
      e.currentStep = Math.max(0, step);
      const sequence = await Sequence.findById(e.sequenceId);
      if (sequence && e.currentStep < sequence.steps.length) {
        const delay = sequence.steps[e.currentStep].delayMinutes || 0;
        e.nextStepAt = new Date(Date.now() + delay * 60000);
      }
    }
    if (status) e.status = status;
    if (status === 'completed') e.completedAt = new Date();
    await e.save();
    res.json(e);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', rbac('enrollments', 'delete'), async (req, res) => {
  try {
    const e = await Enrollment.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!e) throw new Error('Enrollment not found.');
    e.status = 'paused';
    await e.save();
    res.json({ paused: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
