const Role = require('../models/role');
const logger = require('../utils/logger');

function rbacAuthorize(domain, action, options = {}) {
  const requireOwnership = options.requireOwnership || false;

  return async (req, res, next) => {
    try {
      if (!req.user)
        return res.status(401).json({ success: false, error: 'Authentication required.' });

      if (req.user.role === 'super_admin') return next();

      let permitted = false;
      const roleDoc = await Role.findOne({ slug: req.user.role, isActive: true }).lean();
      if (roleDoc) {
        const dp = roleDoc.permissions.find((p) => p.domain === domain);
        permitted = dp ? dp.actions.includes(action) : false;
      } else {
        const User = require('../models/user');
        const fullUser = await User.findById(req.user.id).select('+permissions');
        if (fullUser) permitted = fullUser.hasPermission(domain, action);
      }

      if (!permitted) {
        logger.warn(`RBAC: denied ${req.user.email} ${domain}:${action}`);
        return res
          .status(403)
          .json({ success: false, error: `Missing permission: ${domain}.${action}` });
      }

      if (requireOwnership && !['super_admin', 'company_admin'].includes(req.user.role)) {
        const isOwner =
          req.params.id &&
          (req.user.id === req.params.id ||
            req.user.id === req.body.userId ||
            req.user.id === req.body.ownerId);
        if (!isOwner) return res.status(403).json({ success: false, error: 'Ownership required.' });
      }

      next();
    } catch (err) {
      logger.error('RBAC middleware error:', err);
      res.status(500).json({ success: false, error: 'Authorization failed.' });
    }
  };
}

module.exports = { rbacAuthorize };
