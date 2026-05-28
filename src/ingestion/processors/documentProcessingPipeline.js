// Document Processing Pipeline for sokogateOS
// Simulates processing documents using Apache Tika and publishing extracted content to Kafka

const { initKafkaProducer } = require('../../config/kafka');
const logger = require('../../utils/logger');

let producer = null;

// Mock document types and their extensions
const DOCUMENT_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  eml: 'message/rfc822',
  txt: 'text/plain'
};

// Mock document processing function simulating Apache Tika
function processDocument(document) {
  // Simulate Tika processing delay
  const processingDelay = Math.floor(Math.random() * 100) + 50; // 50-150ms

  // Extract text content (simulated)
  const contentLength = Math.floor(Math.random() * 5000) + 100; // 100-5100 characters
  const extractedText = ' '.repeat(contentLength).split('').map(() =>
    String.fromCharCode(97 + Math.floor(Math.random() * 26)) // random lowercase letters
  ).join('');

  // Generate mock metadata
  const metadata = {
    title: `Document_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    author: ['John Doe', 'Jane Smith', 'Business Analyst', 'Procurement Manager'][Math.floor(Math.random() * 4)],
    creationDate: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(), // Last 30 days
    modificationDate: new Date().toISOString(),
    pageCount: Math.floor(Math.random() * 50) + 1, // 1-50 pages
    wordCount: Math.floor(contentLength / 5), // rough estimate
    language: ['en', 'fr', 'es', 'sw', 'ar'][Math.floor(Math.random() * 5)],
    ...document.metadata // preserve original metadata
  };

  return {
    documentId: document.documentId || `DOC-${Math.floor(Math.random() * 100000)}`,
    originalFilename: document.filename || `document_${Date.now()}${getRandomExtension()}`,
    documentType: document.type || Object.keys(DOCUMENT_TYPES)[Math.floor(Math.random() * Object.keys(DOCUMENT_TYPES).length)],
    extractedText: extractedText,
    metadata: metadata,
    processedAt: new Date().toISOString(),
    processingTimeMs: processingDelay,
    source: 'Document Processing Pipeline',
    tikaVersion: '2.4.0' // simulated Tika version
  };
}

function getRandomExtension() {
  const extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.eml', '.txt'];
  return extensions[Math.floor(Math.random() * extensions.length)];
}

// Initialize and start the document processing pipeline
async function startDocumentProcessingPipeline() {
  try {
    logger.info('Initializing Document Processing Pipeline...');

    // Initialize Kafka producer
    producer = await initKafkaProducer();
    logger.info('Document Processing Pipeline: Kafka producer connected');

    // Simulate document processing every 15 seconds
    setInterval(async () => {
      try {
        // Generate mock document for processing
        const mockDocument = {
          filename: `sample_document_${Date.now()}${getRandomExtension()}`,
          size: Math.floor(Math.random() * 1000000) + 10000, // 10KB - 1MB
          receivedAt: new Date().toISOString(),
          source: ['email_upload', 'web_portal', 'ftp_drop', 'api_integration'][Math.floor(Math.random() * 4)],
          metadata: {
            uploader: `user_${Math.floor(Math.random() * 1000)}`,
            department: ['procurement', 'sales', 'finance', 'operations'][Math.floor(Math.random() * 4)]
          }
        };

        // Process the document
        const processedDocument = processDocument(mockDocument);
        const payload = JSON.stringify(processedDocument);

        // Publish to Kafka topic
        producer.send([
          { topic: 'document.processed', messages: payload, partition: 0 }
        ], (err, data) => {
          if (err) {
            logger.error('Document Processing Pipeline: Failed to send processed document:', err);
          } else {
            logger.debug(`Document Processing Pipeline: Processed document:`, processedDocument.documentId);
          }
        });
      } catch (processError) {
        logger.error('Document Processing Pipeline: Error processing document:', processError);
      }
    }, 15000); // 15 seconds

    logger.info('Document Processing Pipeline started successfully');
  } catch (error) {
    logger.error('Document Processing Pipeline: Failed to start:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function shutdown() {
  if (producer) {
    producer.close(() => {
      logger.info('Document Processing Pipeline: Kafka producer closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { startDocumentProcessingPipeline };