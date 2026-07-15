// WhatsApp Webhook Routes for SokogateOS
// Handles incoming WhatsApp messages via Twilio webhook,
// provides message status callbacks, and exposes API endpoints
// for the WhatsApp Commerce Co-pilot

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');
const { validateTwilioSignature } = require('../middleware/twilioSignature');

const {
  handleIncomingMessage,
  sendWhatsAppMessage,
  getWhatsAppServiceStatus,
  generateMpesaPaymentLink,
  processMessageNLP
} = require('../services/whatsappService');

const WhatsAppMessage = require('../models/whatsAppMessage');

// ============ TWILIO WEBHOOK ============
// Receives incoming WhatsApp messages from Twilio
// This endpoint is called by Twilio when a customer sends a message to our WhatsApp number
// SECURITY: Validates X-Twilio-Signature to prevent spoofed webhook requests

router.post('/webhook', validateTwilioSignature(), async (req, res) => {
  try {
    const {
      From,         // The sender's WhatsApp number: "whatsapp:+254XXXXXXXXX"
      To,           // Our WhatsApp number: "whatsapp:+14155551234"
      Body,         // The message text
      MediaUrl0,    // Optional media URL
      MessageSid,   // Twilio message SID
      ProfileName,  // Sender's WhatsApp profile name
      NumMedia      // Number of media attachments
    } = req.body;

    if (!From || !Body) {
      return res.status(400).send('Missing required fields: From, Body');
    }

    // Strip "whatsapp:" prefix
    const fromNumber = From.replace('whatsapp:', '');
    const toNumber = To.replace('whatsapp:', '');

    // Process asynchronously — respond immediately to Twilio
    handleIncomingMessage({
      from: fromNumber,
      to: toNumber,
      body: Body,
      mediaUrl: MediaUrl0 || null,
      messageSid: MessageSid,
      profileName: ProfileName,
      numMedia: parseInt(NumMedia || '0')
    }).catch(err => {
      logger.error('WhatsApp Route: Async handling error:', err.message);
    });

    // Respond with TwiML (empty response = success)
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  } catch (error) {
    logger.error('WhatsApp Route: Webhook error:', error.message);
    res.status(500).send('Internal server error');
  }
});

// ============ MESSAGE STATUS CALLBACK ============
// Called by Twilio when message delivery status changes

router.post('/status', validateTwilioSignature(), async (req, res) => {
  try {
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
      To
    } = req.body;

    logger.debug(`WhatsApp Status: ${MessageSid} => ${MessageStatus}`);

    // Update message delivery status in database
    if (MessageSid) {
      await WhatsAppMessage.findOneAndUpdate(
        { messageId: `wa_${MessageSid}` },
        {
          deliveryStatus: MessageStatus || 'sent',
          deliveryError: ErrorMessage || undefined
        }
      ).catch(() => {}); // Non-critical
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error('WhatsApp Route: Status callback error:', error.message);
    res.sendStatus(200); // Always respond 200 to Twilio
  }
});

// ============ SEND MESSAGE API ============
// Send a WhatsApp message programmatically (authenticated)

router.post('/send', authenticate, authorize('company_admin', 'super_admin', 'procurement_manager'), async (req, res) => {
  try {
    const { to, body, mediaUrl } = req.body;

    if (!to || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, body'
      });
    }

    const result = await sendWhatsAppMessage(to, process.env.TWILIO_WHATSAPP_NUMBER || '', body, mediaUrl);

    if (result.success) {
      res.json({
        success: true,
        data: {
          messageId: result.messageId,
          channel: result.channel || 'whatsapp',
          to,
          body: body.substring(0, 100) + '...',
          sentAt: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send message'
      });
    }
  } catch (error) {
    logger.error('WhatsApp Route: Send error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ M-PESA PAYMENT LINK ============
// Generate M-Pesa payment request for a transaction

router.post('/mpesa-pay', authenticate, async (req, res) => {
  try {
    const { amount, phoneNumber, reference } = req.body;

    if (!amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, phoneNumber'
      });
    }

    const result = generateMpesaPaymentLink(amount, phoneNumber, reference || `INV-${Date.now()}`);

    res.json({
      success: true,
      data: result.paymentRequest
    });
  } catch (error) {
    logger.error('WhatsApp Route: M-Pesa error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CONVERSATION HISTORY ============
// Get WhatsApp conversation history for a company

router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { from, limit } = req.query;
    const query = {};

    if (from) query.from = from;

    // Filter by company if not super_admin
    if (req.user.role !== 'super_admin') {
      query.companyId = req.user.companyId;
    }

    const messages = await WhatsAppMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 50)
      .select('-__v');

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    logger.error('WhatsApp Route: Conversation fetch error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ NLP TRAINING DATA ============
// Get NLP training data for the self-improving loop

router.get('/training-data', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const data = await WhatsAppMessage.getTrainingData({
      startDate: req.query.startDate,
      intent: req.query.intent,
      limit: parseInt(req.query.limit) || 500
    });

    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    logger.error('WhatsApp Route: Training data error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ NLP PARSE (TEST) ============
// Test NLP parsing on arbitrary text (useful for debugging)

router.post('/parse', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    const nlpResult = await processMessageNLP(text, 'general');
    res.json({ success: true, data: nlpResult });
  } catch (error) {
    logger.error('WhatsApp Route: Parse error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SERVICE STATUS ============

router.get('/status', authenticate, async (req, res) => {
  try {
    const status = getWhatsAppServiceStatus();
    const messageCount = await WhatsAppMessage.countDocuments();

    res.json({
      success: true,
      data: {
        ...status,
        totalMessages: messageCount
      }
    });
  } catch (error) {
    logger.error('WhatsApp Route: Status error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
