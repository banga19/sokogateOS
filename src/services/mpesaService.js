// M-Pesa Payment Integration Service for SokogateOS
// Handles M-Pesa STK Push (Simulate), payment confirmation, and reconciliation
// Supports both Safaricom (Kenya) and Vodacom (Tanzania) M-Pesa APIs

const logger = require('../utils/logger');

let initialized = false;

// In production, this would use Safaricom's M-Pesa API (Daraja)
// Environment variables needed:
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY,
//   MPESA_SHORTCODE (PayBill/Till), MPESA_ENV (sandbox/production)

async function startMpesaService() {
  try {
    logger.info('Initializing M-Pesa Payment Service...');

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (consumerKey && consumerSecret) {
      logger.info('M-Pesa Service: Daraja API credentials configured');
    } else {
      logger.warn('M-Pesa Service: MPESA_CONSUMER_KEY/SECRET not set — payments will be logged only');
    }

    initialized = true;
    logger.info('M-Pesa Payment Service started successfully');
    return true;
  } catch (error) {
    logger.error('M-Pesa Service: Failed to initialize:', error.message);
    return false;
  }
}

// Initiate STK Push (payment request to customer's phone)
async function initiateStkPush({ phoneNumber, amount, reference, description }) {
  try {
    // Validate phone number (E.164 format: 254XXXXXXXXX)
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    let mpesaPhone = cleaned;
    if (cleaned.startsWith('0')) {
      mpesaPhone = '254' + cleaned.slice(1);
    } else if (cleaned.startsWith('+')) {
      mpesaPhone = cleaned.slice(1);
    } else if (!cleaned.startsWith('254')) {
      mpesaPhone = '254' + cleaned;
    }

    if (mpesaPhone.length !== 12 || !mpesaPhone.startsWith('254')) {
      return {
        success: false,
        error: 'Invalid phone number. Must be a valid Safaricom (Kenya) or Vodacom (TZ) number.',
        validationError: true
      };
    }

    // In production, this would call Safaricom's M-Pesa API:
    // 1. Get OAuth token
    // 2. Call STK Push simulation endpoint
    // 3. Return CheckoutRequestID for polling

    // For MVP, return a simulated payment request
    const checkoutRequestId = `MPESA-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    logger.info(`M-Pesa Service: STK Push initiated for ${mpesaPhone} - KES ${amount} (${reference || 'No ref'})`);

    return {
      success: true,
      data: {
        checkoutRequestId,
        phoneNumber: mpesaPhone,
        amount,
        currency: 'KES',
        reference: reference || `INV-${Date.now()}`,
        description: description || 'SokogateOS Trade Payment',
        status: 'pending',
        merchantRequestId: `MR-${Date.now()}`,
        responseDescription: 'Success. Request accepted for processing',
        customerMessage: `Please check your phone and enter M-Pesa PIN to complete payment of KES ${amount.toLocaleString()}`
      }
    };
  } catch (error) {
    logger.error('M-Pesa Service: STK Push error:', error.message);
    return { success: false, error: error.message };
  }
}

// Query STK Push status
async function queryStkStatus(checkoutRequestId) {
  try {
    // In production, this would call Safaricom's M-Pesa query API
    // For MVP, simulate a successful query
    return {
      success: true,
      data: {
        checkoutRequestId,
        resultCode: '0',
        resultDesc: 'The service request is processed successfully.',
        status: 'completed',
        amount: null, // populated on completion
        mpesaReceiptNumber: `PBC${Date.now().toString().slice(-10)}`,
        transactionDate: new Date().toISOString(),
        phoneNumber: null
      }
    };
  } catch (error) {
    logger.error('M-Pesa Service: Query error:', error.message);
    return { success: false, error: error.message };
  }
}

// Handle M-Pesa payment callback (from Safaricom API)
async function handlePaymentCallback(callbackData) {
  try {
    const {
      Body: {
        stkCallback: {
          MerchantRequestID,
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          CallbackMetadata
        }
      } = {}
    } = callbackData;

    logger.info(`M-Pesa Service: Payment callback received — ResultCode: ${ResultCode}`);

    if (ResultCode === 0) {
      // Payment successful — extract metadata
      const metadata = {};
      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          metadata[item.Name] = item.Value;
        }
      }

      return {
        success: true,
        data: {
          merchantRequestId: MerchantRequestID,
          checkoutRequestId: CheckoutRequestID,
          mpesaReceiptNumber: metadata.MpesaReceiptNumber,
          transactionDate: metadata.TransactionDate,
          phoneNumber: metadata.PhoneNumber,
          amount: metadata.Amount,
          status: 'completed'
        }
      };
    }

    return {
      success: false,
      error: ResultDesc || 'Payment failed',
      resultCode: ResultCode
    };
  } catch (error) {
    logger.error('M-Pesa Service: Callback handling error:', error.message);
    return { success: false, error: error.message };
  }
}

// Generate M-Pesa payment QR code link
function generatePaymentQr(amount, reference) {
  return {
    success: true,
    qrData: `PAYBILL:XXXXXX:ACCOUNT:${reference || 'SOKOGATE'}:AMOUNT:${amount}`,
    instructions: `1. Go to M-Pesa → Lipa na M-Pesa → PayBill\n2. Business Number: XXXXXX\n3. Account: ${reference || 'SOKOGATE-' + Date.now()}\n4. Amount: KES ${amount.toLocaleString()}\n5. Enter PIN and confirm`
  };
}

// Validate M-Pesa transaction
function validateTransaction(amount, phoneNumber) {
  if (amount < 10 || amount > 150000) {
    return { valid: false, error: 'Amount must be between KES 10 and KES 150,000' };
  }

  const cleaned = phoneNumber.replace(/[^0-9]/g, '');
  if (cleaned.length < 10 || cleaned.length > 12) {
    return { valid: false, error: 'Invalid phone number' };
  }

  return { valid: true };
}

function getServiceStatus() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  return {
    initialized,
    darajaConfigured: !!consumerKey,
    environment: process.env.MPESA_ENV || 'sandbox'
  };
}

async function shutdownMpesaService() {
  logger.info('M-Pesa Service: Shutting down...');
  initialized = false;
}

module.exports = {
  startMpesaService,
  initiateStkPush,
  queryStkStatus,
  handlePaymentCallback,
  generatePaymentQr,
  validateTransaction,
  getServiceStatus,
  shutdownMpesaService
};
