// Export Readiness Score (ERS) Controller for SokogateOS
// Exposes ERS calculation functionality through API endpoints

const ersService = require('../../../../services/ers/ersService');
const logger = require('../../../../utils/logger');
const auth = require('../../../../middleware/auth');

/**
 * Get ERS for the authenticated user's company
 * @route GET /api/v1/ers/me
 * @access Private
 */
async function getMyERS(req, res) {
  try {
    // Check if user has a company association
    if (!req.user || !req.user.companyId) {
      return res.status(400).json({
        success: false,
        error: 'User is not associated with a company'
      });
    }

    const ersData = await ersService.calculateERS(req.user.companyId);

    res.json({
      success: true,
      data: ersData
    });
  } catch (error) {
    logger.error('Error in getMyERS controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get ERS for a specific company (admin/super_admin only)
 * @route GET /api/v1/ers/:companyId
 * @access Private (Admin/Super Admin)
 */
async function getCompanyERS(req, res) {
  try {
    // Check if user has permission to view this company's ERS
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Super admin can view any company's ERS
    // Company admin can only view their own company's ERS
    // Others need explicit permission
    if (req.user.role !== 'super_admin') {
      if (req.user.role === 'company_admin' && req.user.companyId.toString() === req.params.companyId) {
        // allowed
      } else if (req.user.permissions?.admin?.manageUsers === true && req.user.companyId.toString() === req.params.companyId) {
        // allowed
      } else {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view this company\'s ERS'
        });
      }
    }

    const ersData = await ersService.calculateERS(req.params.companyId);

    res.json({
      success: true,
      data: ersData
    });
  } catch (error) {
    logger.error('Error in getCompanyERS controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get ERS breakdown and recommendations for the authenticated user's company
 * @route GET /api/v1/ers/me/breakdown
 * @access Private
 */
async function getMyERSBreakdown(req, res) {
  try {
    if (!req.user || !req.user.companyId) {
      return res.status(400).json({
        success: false,
        error: 'User is not associated with a company'
      });
    }

    const ersData = await ersService.calculateERS(req.user.companyId);

    // Return detailed breakdown
    res.json({
      success: true,
      data: {
        score: ersData.total,
        tier: ersData.tier,
        breakdown: {
          profileCompletion: ersData.profileCompletion,
          transactionHistory: ersData.transactionHistory,
          compliance: ersData.compliance,
          marketReadiness: ersData.marketReadiness,
          financialHealth: ersData.financialHealth
        },
        recommendations: ersData.recommendations,
        lastUpdated: ersData.lastUpdated
      }
    });
  } catch (error) {
    logger.error('Error in getMyERSBreakdown controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Get company rankings by ERS (for leaderboards)
 * @route GET /api/v1/ers/rankings
 * @access Private (Admin/Super Admin)
 */
async function getERSRankings(req, res) {
  try {
    // Only admins and super admins can view rankings
    if (req.user.role !== 'super_admin' &&
        req.user.role !== 'company_admin' &&
        req.user.role !== 'executive' &&
        req.user.role !== 'finance') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to view ERS rankings'
      });
    }

    // Get limit from query params (default 10, max 100)
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    // In a real implementation, this would query all companies and calculate ERS for each
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        rankings: [], // Would contain array of {companyId, companyName, ersScore, tier}
        totalCount: 0,
        limit: limit,
        note: 'ERS rankings feature coming soon - individual ERS scores available via /me endpoint'
      }
    });
  } catch (error) {
    logger.error('Error in getERSRankings controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

module.exports = {
  getMyERS,
  getCompanyERS,
  getMyERSBreakdown,
  getERSRankings
};
