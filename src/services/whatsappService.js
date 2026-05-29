// WhatsApp Commerce Co-pilot Service for SokogateOS
// Handles WhatsApp Business API webhook, NLP message parsing, structured RFQ extraction,
// supplier search, response template building, and M-Pesa payment link generation

const logger = require('../utils/logger');
const WhatsAppMessage = require('../models/whatsAppMessage');
const Sourcing = require('../models/sourcing');
const { matchSuppliersToQuery, generateQuote, handleProductQueryReceived } = require('./sourcingService');

// Service state
let twilioClient = null;
let initialized = false;

// ===== INITIALIZATION =====

async function startWhatsAppService() {
  try {
    logger.info('Initializing WhatsApp Commerce Co-pilot Service...');

    // Initialize Twilio client (graceful if env vars not set — service will queue messages)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      const twilio = require('twilio');
      twilioClient = twilio(accountSid, authToken);
      logger.info('WhatsApp Service: Twilio client initialized');
    } else {
      logger.warn('WhatsApp Service: TWILIO_ACCOUNT_SID/AUTH_TOKEN not set — messages will be logged only');
    }

    initialized = true;
    logger.info('WhatsApp Commerce Co-pilot Service started successfully');
    return true;
  } catch (error) {
    logger.error('WhatsApp Service: Failed to initialize:', error.message);
    initialized = false;
    return false;
  }
}

// ===== WEBHOOK HANDLING =====

// Handle incoming WhatsApp message from Twilio webhook
async function handleIncomingMessage({ from, to, body, mediaUrl, messageSid, profileName, numMedia }) {
  try {
    logger.info(`WhatsApp Service: Received message from ${from}`);

    // Generate conversation ID
    const conversationId = [from, to].sort().join('_');

    // Find or create conversation context from last 5 messages
    const recentMessages = await WhatsAppMessage.getConversation(conversationId, 5);
    const lastMessage = recentMessages[recentMessages.length - 1];

    // Determine context
    const contextType = detectConversationContext(body || '', recentMessages);

    // NLP Processing
    const nlpResult = await processMessageNLP(body || '', contextType);

    // Save inbound message
    const message = new WhatsAppMessage({
      messageId: `wa_${messageSid || Date.now()}`,
      conversationId,
      from,
      to,
      direction: 'inbound',
      content: body || (mediaUrl ? `[${numMedia > 0 ? 'Media' : 'Unknown'} message]` : ''),
      contentType: numMedia > 0 ? (numMedia > 1 ? 'document' : 'image') : 'text',
      mediaUrl: mediaUrl || undefined,
      nlpProcessing: nlpResult,
      contextType,
      channel: 'whatsapp',
      deliveryStatus: 'delivered'
    });

    await message.save();
    logger.debug(`WhatsApp Service: Saved inbound message ${message.messageId} (intent: ${nlpResult.intent})`);

    // Generate and send response
    const response = await generateResponse(message, nlpResult, recentMessages);
    await sendWhatsAppMessage(from, to, response.text, response.mediaUrl);

    // Update message with response
    message.responseContent = response.text;
    message.responseSentAt = new Date();

    // If this is an RFQ with structured data, create a sourcing request
    if (nlpResult.intent === 'sourcing_request' && nlpResult.structuredQuery?.productQuery) {
      await createSourcingFromWhatsApp(message, nlpResult);
    }

    await message.save();
    return { success: true, intent: nlpResult.intent, response: response.text };
  } catch (error) {
    logger.error('WhatsApp Service: Error handling incoming message:', error.message);
    // Send fallback error message to user
    try {
      await sendWhatsAppMessage(from, to,
        '👋 Hi! I\'m SokogateOS — your AI sourcing assistant.\n\n' +
        'I can help you:\n' +
        '🔍 Find suppliers for your products\n' +
        '📦 Track your shipments\n' +
        '📄 Get quotes and compare prices\n\n' +
        'Try sending me: "Find me 5000 meters of cotton fabric delivered to Mombasa"'
      );
    } catch { /* swallow */ }
    return { success: false, error: error.message };
  }
}

// ===== NLP MESSAGE PROCESSING =====

async function processMessageNLP(text, contextType) {
  const lower = (text || '').toLowerCase().trim();
  const result = {
    intent: 'unknown',
    confidence: 0,
    extractedEntities: [],
    structuredQuery: null,
    sentiment: 'neutral'
  };

  if (!lower) return result;

  // Detect intent
  const intents = {
    sourcing_request: [
      'find', 'looking for', 'need', 'source', 'get me', 'quote', 'price',
      'buy', 'purchase', 'order', 'supply', 'procurement'
    ],
    order_status: ['where is', 'order status', 'my order', 'track', 'shipping status', 'update on my'],
    supplier_search: ['supplier', 'vendor', 'manufacturer', 'who makes', 'who sells'],
    quote_request: ['how much', 'cost', 'price', 'quote', 'quotation', 'pricing'],
    payment_inquiry: ['payment', 'paid', 'pay', 'mpesa', 'transaction', 'receipt'],
    shipment_tracking: ['shipment', 'tracking', 'delivery', 'arrived', 'cargo', 'container'],
    customs_query: ['customs', 'duty', 'tax', 'import', 'clearance', 'tariff'],
    support: ['help', 'support', 'problem', 'issue', 'error', 'not working', 'agent', 'human'],
    greeting: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', '👋'],
    confirmation: ['yes', 'confirm', 'correct', 'right', 'ok', 'okay', 'sure', 'go ahead']
  };

  // Score each intent
  let bestScore = 0;
  let bestIntent = 'unknown';
  for (const [intent, keywords] of Object.entries(intents)) {
    const score = keywords.filter(k => lower.includes(k)).length / keywords.length;
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Boost score for sourcing requests with product details
  if (bestIntent === 'sourcing_request' || bestIntent === 'quote_request') {
    const hasQuantity = /\d[\d,.]*(?:\s*(?:kg|kgs|tons|tonnes|pieces|pcs|meters|liters|ltrs|units|rolls|packs|cartons|boxes))/i.test(lower);
    const hasProduct = lower.length > 15;
    if (hasQuantity && hasProduct) bestScore = Math.min(1, bestScore + 0.3);
    else if (hasProduct) bestScore = Math.min(1, bestScore + 0.15);
  }

  // Greeting detection
  if (bestIntent === 'greeting' && bestScore > 0.3) {
    result.intent = 'greeting';
    result.confidence = bestScore;
    result.sentiment = 'positive';
    return result;
  }

  // Confirmation detection
  if (bestIntent === 'confirmation' && bestScore > 0.3 && contextType === 'rfq') {
    result.intent = 'confirmation';
    result.confidence = bestScore;
    result.sentiment = 'positive';
    return result;
  }

  result.intent = bestIntent;
  result.confidence = Math.round(bestScore * 100) / 100;

  // Extract entities for sourcing requests
  if (result.intent === 'sourcing_request' || result.intent === 'quote_request') {
    result.structuredQuery = extractStructuredQuery(text);
    result.extractedEntities = extractEntities(text);
  }

  // Sentiment analysis
  const positiveWords = ['great', 'excellent', 'good', 'love', 'perfect', 'amazing', 'thanks', 'thank', 'please', 'urgent'];
  const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'hate', 'worst', 'slow', 'damaged', 'broken', 'late'];
  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const negCount = negativeWords.filter(w => lower.includes(w)).length;
  const urgencyWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'rush', 'hurry'];
  const urgent = urgencyWords.some(w => lower.includes(w));

  if (urgent) result.sentiment = 'urgent';
  else if (posCount > negCount) result.sentiment = 'positive';
  else if (negCount > posCount) result.sentiment = 'negative';
  else result.sentiment = 'neutral';

  return result;
}

// Extract structured product query from natural language
function extractStructuredQuery(text) {
  const query = {
    productQuery: text,
    category: null,
    quantity: null,
    destination: null,
    specs: [],
    budget: null,
    timeline: null
  };

  const lower = text.toLowerCase();

  // Extract quantity
  const quantityPatterns = [
    /(\d[\d,.]*)\s*(?:kg|kgs|kilograms?|tonnes?|tons?|pieces?|pcs|units?|meters?|liters?|litres?|ltrs?|rolls?|packs?|cartons?|boxes?)/gi,
    /(\d[\d,.]*)\s*(?:thousand|hundred|million)/gi
  ];

  for (const pattern of quantityPatterns) {
    const match = pattern.exec(lower);
    if (match) {
      const raw = match[1].replace(/,/g, '');
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        // Get the unit
        const unitMatch = lower.match(new RegExp(`${raw}\\s*(kg|kgs|kilograms?|tonnes?|tons?|pieces?|pcs|units?|meters?|liters?|litres?|meters?|rolls?|packs?|cartons?|boxes?,?)`));
        const unit = unitMatch ? unitMatch[1].replace(/s$/, '').replace(/,$/, '') : 'units';
        query.quantity = { value: num, unit: unit === 'pieces' ? 'pieces' : unit };
        break;
      }
    }
  }

  // Extract destination
  const africanDestinations = [
    'mombasa', 'nairobi', 'dar es salaam', 'lagos', 'accra', 'johannesburg',
    'cape town', 'kampala', 'kigali', 'addis ababa', 'dakar', 'abidjan',
    'n\'djamena', 'bamako', 'lilongwe', 'lusaka', 'harare', 'maputo'
  ];
  for (const dest of africanDestinations) {
    if (lower.includes(dest)) {
      query.destination = dest.charAt(0).toUpperCase() + dest.slice(1);
      break;
    }
  }

  // If no African destination found, check for common international ports
  if (!query.destination) {
    const intlDestinations = [
      'shanghai', 'shenzhen', 'mumbai', 'istanbul', 'dubai', 'rotterdam'
    ];
    for (const dest of intlDestinations) {
      if (lower.includes(dest)) {
        query.destination = dest.charAt(0).toUpperCase() + dest.slice(1);
        break;
      }
    }
  }

  // Extract budget
  const budgetPatterns = [
    /(?:budget|target|max|up to|around|about)\s*(?:of\s*)?(?:USD|KSH|KES|\$)?\s*([\d,]+)\s*(?:USD|KSH|KES|\$)?/gi,
    /(?:USD|KSH|KES|\$)\s*([\d,]+)/gi
  ];
  for (const pattern of budgetPatterns) {
    const match = pattern.exec(lower);
    if (match) {
      const raw = match[1].replace(/,/g, '');
      const amount = parseFloat(raw);
      if (!isNaN(amount) && amount > 0) {
        const currency = lower.includes('kes') || lower.includes('ksh') ? 'KES' : 'USD';
        query.budget = { amount, currency };
        break;
      }
    }
  }

  // Extract specs
  const specKeywords = ['premium', 'standard', 'organic', 'grade a', 'grade b', 'food grade',
    'industrial', 'heavy duty', 'waterproof', 'fire resistant', 'anti-bacterial',
    'eco-friendly', 'recycled', 'virgin', 'bleached', 'unbleached', 'printed',
    'plain', 'woven', 'knitted', 'non-woven'];
  query.specs = specKeywords.filter(s => lower.includes(s));

  // Categorize
  const categoryMap = {
    'textile': 'textiles', 'fabric': 'textiles', 'cotton': 'textiles', 'linen': 'textiles',
    'garment': 'apparel', 'clothing': 'apparel', 'shirt': 'apparel', 'uniform': 'apparel',
    'electronics': 'electronics', 'electronic': 'electronics', 'phone': 'electronics',
    'food': 'food_beverage', 'coffee': 'food_beverage', 'tea': 'food_beverage',
    'packaging': 'packaging', 'package': 'packaging', 'bag': 'packaging',
    'chemical': 'chemicals', 'chemicals': 'chemicals',
    'furniture': 'furniture', 'furniture': 'furniture',
    'machine': 'machinery', 'machinery': 'machinery', 'equipment': 'machinery'
  };
  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (lower.includes(keyword)) {
      query.category = category;
      break;
    }
  }

  // Extract timeline
  const timelinePatterns = [
    /(?:in|within|by|before)\s+(\d+)\s*(day|week|month|year)s?/gi,
    /(?:urgent|asap|immediately)/gi
  ];
  for (const pattern of timelinePatterns) {
    const match = pattern.exec(lower);
    if (match) {
      query.timeline = match[0];
      break;
    }
  }

  return query;
}

// Extract structured entities from text
function extractEntities(text) {
  const entities = [];
  const lower = text.toLowerCase();

  // Product extraction
  const productPatterns = [
    /(\d[\d,.]*\s*(?:kg|ton|meter|liter|piece|roll|pack|carton|box)\s*(?:of|of\s+)?(.{5,40}?))(?:\.|,|\s+to|\s+for|\s+delivered|\s+from|$)/gi,
    /(?:find|source|need|looking for|get me)\s+(.{5,40}?)(?:\s+delivered|\s+in\s+|\.|,|$)/gi
  ];

  for (const pattern of productPatterns) {
    const match = pattern.exec(lower);
    if (match) {
      const product = match[2] || match[1];
      if (product && product.length > 3) {
        entities.push({
          type: 'product',
          value: product.trim(),
          confidence: 0.7
        });
        break;
      }
    }
  }

  // Location extraction
  const locationPattern = /(?:to|in|for|at|deliver\s+to)\s+([A-Za-z\s]+?)(?:\s*\.|,|\s+from|\s+within|\s+before|\s*$)/gi;
  const locMatch = locationPattern.exec(text);
  if (locMatch) {
    const loc = locMatch[1].trim();
    if (loc.length > 2 && loc.length < 30) {
      entities.push({
        type: 'location',
        value: loc,
        confidence: 0.6
      });
    }
  }

  return entities;
}

// ===== DETECT CONVERSATION CONTEXT =====

function detectConversationContext(text, recentMessages) {
  if (!text) return 'general';

  // Check for continuation context from previous messages
  if (recentMessages.length > 0) {
    const lastContext = recentMessages[recentMessages.length - 1]?.contextType;
    if (lastContext && lastContext !== 'general') {
      // If last message was an RFQ and this looks like a confirmation, keep RFQ context
      if (lastContext === 'rfq' && isConfirmation(text)) return 'rfq';
      if (lastContext === 'order' && isConfirmation(text)) return 'order';
    }
  }

  const lower = text.toLowerCase();
  if (lower.includes('find') || lower.includes('looking') || lower.includes('source') ||
      lower.includes('quote') || lower.includes('buy') || lower.includes('price')) return 'rfq';
  if (lower.includes('order') || lower.includes('track')) return 'order';
  if (lower.includes('ship') || lower.includes('deliver') || lower.includes('cargo') ||
      lower.includes('container')) return 'shipment';
  if (lower.includes('pay') || lower.includes('mpesa') || lower.includes('money') ||
      lower.includes('transaction')) return 'payment';
  if (lower.includes('help') || lower.includes('agent') || lower.includes('problem') ||
      lower.includes('issue')) return 'support';
  return 'general';
}

function isConfirmation(text) {
  const lower = text.toLowerCase();
  return ['yes', 'yeah', 'correct', 'right', 'confirm', 'ok', 'okay', 'sure', 'go ahead', 'proceed'].some(w => lower.includes(w));
}

// ===== RESPONSE GENERATION =====

async function generateResponse(message, nlpResult, recentMessages) {
  let text = '';
  let mediaUrl = null;

  switch (nlpResult.intent) {
    case 'greeting':
      text = getGreetingResponse();
      break;

    case 'sourcing_request':
    case 'quote_request':
      text = await generateSourcingResponse(nlpResult);
      break;

    case 'order_status':
      text = await generateOrderStatusResponse(nlpResult);
      break;

    case 'supplier_search':
      text = await generateSupplierSearchResponse(nlpResult);
      break;

    case 'confirmation':
      text = generateConfirmationResponse(recentMessages);
      break;

    case 'shipment_tracking':
      text = generateShipmentTrackingResponse(nlpResult);
      break;

    case 'payment_inquiry':
      text = generatePaymentResponse(nlpResult);
      break;

    case 'support':
      text = generateSupportResponse();
      break;

    default:
      text = generateHelpResponse();
      break;
  }

  return { text, mediaUrl };
}

function getGreetingResponse() {
  const greetings = [
    '👋 Hi there! I\'m SokogateOS — your AI trade co-pilot.\n\n' +
    'I can help you:\n' +
    '🔍 **Find suppliers** for any product\n' +
    '📦 **Track shipments** in real time\n' +
    '💰 **Compare prices** and get quotes\n' +
    '📋 **Generate customs documents**\n\n' +
    'Just tell me what you need! Try:\n' +
    '> "Find me 5000 meters of premium cotton fabric"',

    '👋 Welcome back! I\'m SokogateOS.\n\n' +
    'How can I help with your trade today?\n' +
    '• "Source 2000 school uniforms for Nairobi"\n' +
    '• "Where is my shipment SHIP-12345?"\n' +
    '• "What\'s the price of Grade A coffee?"'
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

async function generateSourcingResponse(nlpResult) {
  const structured = nlpResult.structuredQuery;
  if (!structured || !structured.productQuery) {
    return 'I can help find suppliers! Just tell me what you\'re looking for — e.g., "Find me 5000 meters of cotton fabric delivered to Mombasa"';
  }

  // Check if we have enough details
  if (!nlpResult.extractedEntities.some(e => e.type === 'product')) {
    return 'What product are you looking for? Please include details like type, quantity, and delivery location.';
  }

  // Search suppliers using the existing sourcing service
  const matches = matchSuppliersToQuery(structured.productQuery);

  if (matches.length === 0) {
    return 'I couldn\'t find any suppliers matching that request. Could you provide more details? (product type, quantity, specifications)';
  }

  // Build response
  const topMatches = matches.slice(0, 3);
  let response = '✅ **I found suppliers for your request!**\n\n';

  topMatches.forEach((match, i) => {
    const quote = match.quote || {};
    response += `*${i + 1}. ${match.supplierName}* — ${match.supplierName === 'Asian Fabrics Ltd' ? '⭐ Trust Score: 92%' : match.supplierName === 'Global Textiles Ltd' ? '⭐ Trust Score: 88%' : '⭐ Trust Score: 84%'}\n`;
    response += match.matchReasons.slice(0, 2).map(r => `   ✅ ${r}`).join('\n') + '\n';
    if (quote.price) {
      response += `   💰 Est. $${quote.price.amount.toFixed(2)}/unit (${quote.incoterms || 'FOB'})\n`;
    }
    response += `   ⏱️ Lead time: ${match.quote?.leadTime?.totalDays || 21} days\n\n`;
  });

  response += 'Reply with the number (1, 2, or 3) to get a detailed quote, or send more specifications.';

  return response;
}

async function generateOrderStatusResponse(nlpResult) {
  return 'I\'ll check your order status. Can you provide your order number? (e.g., SRC-12345 or SHIP-98765)';
}

async function generateSupplierSearchResponse(nlpResult) {
  const category = nlpResult.structuredQuery?.category || 'products';
  return `We have ${8} verified suppliers in the "${category}" category on our network.\n\n` +
    'Top matches:\n' +
    '1. **Global Textiles Ltd** (China) — ⭐ 88% — Min 500 units, FOB/CIF\n' +
    '2. **Asian Fabrics Ltd** (India) — ⭐ 92% — Min 300 units, GOTS certified\n' +
    '3. **African Mills Co** (Kenya) — ⭐ 78% — Min 200 units, faster delivery\n\n' +
    'Want me to get detailed quotes? Send "Find me [product] delivered to [location]".';
}

function generateConfirmationResponse(recentMessages) {
  const lastRfq = [...recentMessages].reverse().find(m => m.contextType === 'rfq');
  if (lastRfq) {
    return '✅ Great! I\'ll proceed with that. I\'ll send you the detailed quote and supplier information shortly.';
  }
  return '✅ Noted! Is there anything else I can help you with?';
}

function generateShipmentTrackingResponse(nlpResult) {
  return 'I can track your shipment! Please provide your tracking number or shipment ID.\n\n' +
    'Or send me a message like: "Where is my shipment SHIP-12345?"';
}

function generatePaymentResponse(nlpResult) {
  return '💳 **Payment Options:**\n\n' +
    'We support:\n' +
    '• **M-Pesa** (Kenya, Tanzania)\n' +
    '• Bank Transfer (USD)\n' +
    '• Letter of Credit (LC)\n' +
    '• Mobile Money (Airtel Money, MTN MoMo)\n\n' +
    'To make a payment, provide your invoice number and I\'ll send a payment link.';
}

function generateSupportResponse() {
  return 'I\'m here to help! Here\'s what I can assist with:\n\n' +
    '🔍 **Sourcing** — Find suppliers and get quotes\n' +
    '📦 **Tracking** — Check shipment status\n' +
    '💰 **Payments** — Make payments and get receipts\n' +
    '📋 **Documents** — Generate customs paperwork\n' +
    '⚡ **Urgent** — Escalate to our support team\n\n' +
    'What do you need help with?';
}

function generateHelpResponse() {
  return '👋 I\'m SokogateOS — your AI trade co-pilot.\n\n' +
    'Try these examples:\n' +
    '> "Find me 2000kg of Grade A coffee" ☕\n' +
    '> "Source 5000 school uniforms for Nairobi" 🎒\n' +
    '> "Track my shipment SHIP-A3B2C1" 🚢\n' +
    '> "What\'s the price of premium cotton fabric?" 💰\n' +
    '> "I need help with customs clearance" 📋';
}

// ===== SEND WHATSAPP MESSAGE =====

async function sendWhatsAppMessage(to, from, body, mediaUrl) {
  // to = customer number, from = business number
  try {
    if (twilioClient) {
      const messageBody = {
        from: `whatsapp:${from}`,
        body: body,
        to: `whatsapp:${to}`
      };
      if (mediaUrl) messageBody.mediaUrl = [mediaUrl];

      const twilioMsg = await twilioClient.messages.create(messageBody);
      logger.debug(`WhatsApp Service: Sent message SID ${twilioMsg.sid}`);

      return { success: true, messageId: twilioMsg.sid };
    } else {
      // Log-only mode (development)
      logger.info(`WhatsApp Service: [DEV] Would send to ${to}: ${body.substring(0, 80)}...`);
      return { success: true, messageId: `dev_${Date.now()}`, dev: true };
    }
  } catch (error) {
    logger.error('WhatsApp Service: Failed to send message:', error.message);
    // Try SMS fallback
    return await sendSmsFallback(to, body);
  }
}

// ===== SMS FALLBACK =====

async function sendSmsFallback(phoneNumber, body) {
  try {
    if (twilioClient && process.env.TWILIO_SMS_NUMBER) {
      const sms = await twilioClient.messages.create({
        from: process.env.TWILIO_SMS_NUMBER,
        body: body,
        to: phoneNumber
      });
      logger.info(`WhatsApp Service: Sent SMS fallback to ${phoneNumber}`);
      return { success: true, messageId: sms.sid, channel: 'sms' };
    }
    logger.warn(`WhatsApp Service: SMS fallback not configured — message to ${phoneNumber} not delivered`);
    return { success: false, error: 'SMS not configured' };
  } catch (error) {
    logger.error('WhatsApp Service: SMS fallback failed:', error.message);
    return { success: false, error: error.message };
  }
}

// ===== CREATE SOURCING REQUEST FROM WHATSAPP =====

async function createSourcingFromWhatsApp(message, nlpResult) {
  try {
    const structured = nlpResult.structuredQuery;
    if (!structured) return null;

    // Create sourcing request using the same patterns as the API
    const sourcing = new Sourcing({
      companyId: message.companyId || undefined,
      requestId: `SRC-WA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      productQuery: {
        original: message.content,
        processed: message.content.toLowerCase().trim(),
        structured: {
          category: structured.category,
          specifications: structured.specs.map(s => ({ name: s, value: true })),
          quantity: structured.quantity ? { value: structured.quantity.value, unit: structured.quantity.unit } : undefined,
          targetPrice: structured.budget ? { amount: structured.budget.amount, currency: structured.budget.currency, type: 'target' } : undefined
        }
      },
      priority: nlpResult.sentiment === 'urgent' ? 'high' : 'medium',
      source: 'whatsapp',
      workflow: {
        status: 'submitted',
        currentStep: 'submitted',
        stepsCompleted: ['submitted'],
        stepTimestamps: { submitted: new Date() },
        automationLevel: 'fully_automated'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await sourcing.save();
    logger.info(`WhatsApp Service: Created sourcing request ${sourcing.requestId} from WhatsApp message`);    // Trigger supplier matching via existing service
      handleProductQueryReceived({
      queryId: sourcing.requestId,
      companyId: message.companyId,
      query: message.content,
      quantity: structured.quantity?.value
    }).catch(err => logger.warn('WhatsApp Service: Supplier matching trigger:', err.message));

    return sourcing;
  } catch (error) {
    logger.error('WhatsApp Service: Error creating sourcing from WhatsApp:', error.message);
    return null;
  }
}

// ===== GENERATE M-PESA PAYMENT LINK =====

function generateMpesaPaymentLink(amount, phoneNumber, reference) {
  // In production, this would call Safaricom's M-Pesa API
  // For now, return a formatted payment request
  return {
    success: true,
    paymentRequest: {
      method: 'mpesa',
      amount: amount,
      currency: 'KES',
      phoneNumber: phoneNumber,
      reference: reference || `INV-${Date.now()}`,
      instructions: `Send KES ${amount.toLocaleString()} to PayBill XXXXXX via M-Pesa. Account: ${reference || 'SOKOGATE-' + Date.now()}`,
      paymentLink: null // In production, this would be an M-Pesa STK Push URL
    }
  };
}

// ===== STATUS & UTILITY =====

function getWhatsAppServiceStatus() {
  return {
    initialized,
    twilioConnected: !!twilioClient,
    messageCount: null // Would be populated from DB query
  };
}

// Graceful shutdown
async function shutdownWhatsAppService() {
  logger.info('WhatsApp Service: Shutting down...');
  initialized = false;
  twilioClient = null;
}

module.exports = {
  startWhatsAppService,
  handleIncomingMessage,
  sendWhatsAppMessage,
  processMessageNLP,
  extractStructuredQuery,
  generateMpesaPaymentLink,
  getWhatsAppServiceStatus,
  shutdownWhatsAppService
};
