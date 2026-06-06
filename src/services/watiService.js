// WATI.io WhatsApp Integration Service for SokogateOS
// Provides WhatsApp Business API via WATI.io for messaging, broadcasts, and commerce

const axios = require('axios');
const logger = require('../utils/logger');

const WATI_API_KEY = process.env.WATI_API_KEY;
const WATI_BASE_URL = process.env.WATI_BASE_URL || 'https://app.wati.io/api/v1';

class WatiService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  initialize() {
    try {
      if (!WATI_API_KEY) {
        logger.warn('WATI Service: WATI_API_KEY not set - operating in degraded mode');
        this.initialized = true;
        return { success: false, mode: 'degraded' };
      }

      this.client = axios.create({
        baseURL: WATI_BASE_URL,
        headers: {
          'Authorization': `Bearer ${WATI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      this.initialized = true;
      logger.info('WATI Service: Initialized successfully');
      return { success: true, mode: 'full' };
    } catch (error) {
      logger.error('WATI Service: Initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendMessage(to, body, options = {}) {
    try {
      const { templateName, templateData } = options;
      const sanitizedNumber = this._sanitizePhone(to);

      let response;
      if (templateName) {
        response = await this.client.post('/sendTemplateMessage', {
          template_name: templateName,
          broadcast_name: `broadcast_${Date.now()}`,
          receivers: [{
            whatsappNumber: sanitizedNumber,
            customParams: templateData || []
          }]
        });
      } else {
        response = await this.client.post(`/sendSessionMessage/${sanitizedNumber}`, {
          messageText: body
        });
      }

      return {
        success: true,
        messageId: response.data?.msgId || `wati_${Date.now()}`,
        status: response.data?.status || 'sent'
      };
    } catch (error) {
      logger.error('WATI Service: Send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendBulkMessages(recipients, templateName) {
    try {
      const response = await this.client.post('/sendTemplateMessage', {
        template_name: templateName,
        broadcast_name: `bulk_${Date.now()}`,
        receivers: recipients.map(r => ({
          whatsappNumber: this._sanitizePhone(r.phone),
          customParams: r.params || []
        }))
      });

      return {
        success: true,
        recipients: recipients.length,
        status: response.data?.status
      };
    } catch (error) {
      logger.error('WATI Service: Bulk send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getTemplates() {
    try {
      const response = await this.client.get('/getTemplates');
      return { success: true, templates: response.data || [] };
    } catch (error) {
      logger.error('WATI Service: Get templates failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getContact(phone) {
    try {
      const response = await this.client.get(`/getContact/${this._sanitizePhone(phone)}`);
      return { success: true, contact: response.data };
    } catch (error) {
      logger.error('WATI Service: Get contact failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  _sanitizePhone(phone) {
    return phone.replace(/\D/g, '').replace(/^\+?/, '');
  }

  getStatus() {
    return {
      initialized: this.initialized,
      apiConfigured: !!WATI_API_KEY
    };
  }
}

module.exports = new WatiService();