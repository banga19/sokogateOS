// Korean Compliance Checker Controller for SokogateOS
// Exposes Korean compliance validation through API endpoints

const koreanComplianceService = require('../../../../services/compliance/koreanComplianceService');
const logger = require('../../../../utils/logger');
const auth = require('../../../../middleware/auth');

/**
 * Check Korean compliance for a specific product
 * @route POST /api/v1/compliance/korean/check
 * @access Private
 */
async function checkProductCompliance(req, res) {
  try {
    const { product, documents } = req.body;

    if (!product) {
      return res.status(400).json({
        success: false,
        error: 'Product data is required'
      });
    }

    // Validate product has minimum required fields
    if (!product.name && !product.productName) {
      return res.status(400).json({
        success: false,
        error: 'Product must have a name or productName field'
      });
    }

    const result = await koreanComplianceService.checkProductCompliance(
      product,
      documents || []
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in checkProductCompliance controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Check Korean compliance for multiple products (batch)
 * @route POST /api/v1/compliance/korean/batch
 * @access Private
 */
async function batchCheckCompliance(req, res) {
  try {
    const { products, productDocuments } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: 'Products array is required'
      });
    }

    // Validate each product has minimum required fields
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (!product.name && !product.productName) {
        return res.status(400).json({
          success: false,
          error: `Product at index ${i} must have a name or productName field`
        });
      }
    }

    const results = await koreanComplianceService.batchCheckCompliance(
      products,
      productDocuments || new Map()
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error in batchCheckCompliance controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get Korean requirements for a specific product category
 * @route GET /api/v1/compliance/korean/requirements/:category
 * @access Private
 */
async function getKoreanRequirements(req, res) {
  try {
    const { category } = req.params;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Product category is required'
      });
    }

    const requirements = koreanComplianceService.getRequirementsForCategory(category);

    res.json({
      success: true,
      data: {
        category: category,
        requirements: requirements
      }
    });
  } catch (error) {
    logger.error('Error in getKoreanRequirements controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get all supported product categories for Korean compliance
 * @route GET /api/v1/compliance/korean/categories
 * @access Private
 */
async function getSupportedCategories(req, res) {
  try {
    const categories = koreanComplianceService.getSupportedCategories();

    res.json({
      success: true,
      data: {
        categories: categories,
        count: categories.length
      }
    });
  } catch (error) {
    logger.error('Error in getSupportedCategories controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Validate documents for Korean compliance (pre-check)
 * @route POST /api/v1/compliance/korean/validate-documents
 * @access Private
 */
async function validateDocuments(req, res) {
  try {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        error: 'Documents array is required'
      });
    }

    // Simple document validation - in reality would check document authenticity, expiry, etc.
    const validatedDocuments = [];
    const invalidDocuments = [];

    documents.forEach((doc, index) => {
      // Basic validation
      if (!doc) {
        invalidDocuments.push({
          index: index,
          document: doc,
          error: 'Document is null or undefined'
        });
        return;
      }

      // For string documents, check if not empty
      if (typeof doc === 'string') {
        if (doc.trim() === '') {
          invalidDocuments.push({
            index: index,
            document: doc,
            error: 'Document string is empty'
          });
        } else {
          validatedDocuments.push(doc);
        }
        return;
      }

      // For object documents, check for basic structure
      if (typeof doc === 'object') {
        // Has either type, name, or certificateType
        if (doc.type || doc.name || doc.certificateType) {
          validatedDocuments.push(doc);
        } else {
          invalidDocuments.push({
            index: index,
            document: doc,
            error: 'Document object missing identification (type, name, or certificateType)'
          });
        }
        return;
      }

      // Unsupported document type
      invalidDocuments.push({
        index: index,
        document: doc,
        error: 'Unsupported document format'
      });
    });

    res.json({
      success: true,
      data: {
        validatedCount: validatedDocuments.length,
        invalidCount: invalidDocuments.length,
        validatedDocuments: validatedDocuments,
        invalidDocuments: invalidDocuments,
        recommendations: invalidDocuments.length > 0 ?
          ['Please provide valid documents with proper identification'] :
          ['All documents appear to be valid for compliance checking']
      }
    });
  } catch (error) {
    logger.error('Error in validateDocuments controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

module.exports = {
  checkProductCompliance,
  batchCheckCompliance,
  getKoreanRequirements,
  getSupportedCategories,
  validateDocuments
};
