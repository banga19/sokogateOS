# SokogateOS Authentication & Permissions Enhancement

## Current State Analysis

### What's Already Implemented
1. **JWT-based Authentication**: Access tokens (24h) and refresh tokens (7d)
2. **Role-Based Access Control (RBAC)**: Role definitions with permissions per domain/action
3. **Attribute-Based Access Control (ABAC)**: Policy engine with contextual access decisions
4. **User Registration**: With email verification and terms acceptance
5. **Login/Logout/Refresh**: Standard auth flows
6. **Password Management**: Change password, reset password flows
7. **Company Scoping**: Users restricted to their company data (except super_admins)
8. **Middleware Protection**: All routes protected by authentication middleware
9. **Terms Acceptance**: Required for registration and continued access
10. **Activity Tracking**: Sign-up, activation, and terms acceptance tracking

### RBAC Roles Currently Defined
From recent commits and code inspection:
- `super_admin`: Full system access
- `company_admin`: Company-level administration
- `procurement_manager`: Core sourcing/customization/logistics operations
- `sales_team`: Sales and customer-facing operations
- `logistics_coordinator`: Shipment tracking and warehouse operations
- `compliance_officer`: Regulatory checking and documentation
- `finance_analyst`: Financial reporting and analysis
- `data_scientist`: AI/ML model training and experimentation
- `support_agent`: Customer support and issue resolution

### Current Permission Structure
Permissions are defined in role documents with:
- **Domains**: sourcing, customization, logistics, analytics, admin, etc.
- **Actions**: create, read, update, delete, approve, export, track, etc.
- **Inheritance**: Roles can inherit permissions from other roles

## Identified Gaps & Enhancement Opportunities

### 1. Authentication Enhancements
#### Missing Features to Implement:
- **Multi-Factor Authentication (MFA)**: TOTP, SMS, email-based 2FA
- **Social Login**: Google, LinkedIn, Microsoft authentication
- **Passwordless Login**: Magic links or one-time codes
- **Session Management**: Active session tracking and device management
- **Brute Force Protection**: Advanced rate limiting with IP reputation
- **Account Lockout**: Temporary lockout after failed attempts
- **Password Breach Detection**: Check against known breached passwords
- **Login Anomaly Detection**: Impossible travel, new device notifications

#### Security Improvements:
- **Access Token Shortening**: Reduce to 15-30 minutes with refresh token rotation
- **Refresh Token Rotation**: One-time use refresh tokens
- **Token Binding**: Bind tokens to client characteristics (User Agent, IP)
- **JWT Best Practices**: Use asymmetric signing (RS256) instead of HS256
- **Audience/Issuer Validation**: Validate token aud/iss claims
- **Key Rotation**: Automated JWT signing key rotation

### 2. Authorization Enhancements
#### Missing Features to Implement:
- **Fine-Grained Permissions**: Resource-level permissions (not just domain/action)
- **Condition-Based Access**: Time-based, location-based, attribute-based rules
- **Delegation & Impersonation**: Allow authorized users to act on behalf of others
- **Emergency Access**: Break-glass procedures for critical situations
- **Just-In-Time Access**: Temporary elevated privileges for specific tasks
- **Permission Templates**: Reusable permission sets for common job functions
- **Access Request Workflow**: Users can request additional permissions

#### Policy Improvements:
- **Policy-as-Code**: Store ABAC policies in version control
- **Policy Testing**: Automated testing of policy decisions
- **Policy Simulation**: "What-if" analysis for policy changes
- **Policy Versioning**: Track changes to access policies over time
- **Policy Analytics**: Usage statistics and unused permission detection

### 3. User Experience Improvements
#### To Implement:
- **Password Strength Meter**: Real-time feedback during registration/password change
- **Visibility Toggle**: Show/hide password in input fields
- **Remember Device**: Trusted device bypass for MFA
- **Recovery Codes**: Backup codes for account recovery
- **Account Activity Dashboard**: Recent logins, devices, locations
- **Security Notifications**: Email alerts for suspicious activity
- **Session Management UI**: View and terminate active sessions

## Comprehensive Enhancement Plan

### Phase 1: Foundation Security (Weeks 1-2)
#### Authentication Layer
- [ ] Implement OpenID Connect compatible authentication flow
- [ ] Add refresh token rotation with one-time use tokens
- [ ] Shorten access token lifetime to 20 minutes
- [ ] Implement asymmetric JWT signing (RS256) with key rotation
- [ ] Add audience and issuer validation to JWT verification
- [ ] Create secure token storage recommendations (HttpOnly cookies)
- [ ] Implement password strength estimator (zxcvbn-based)
- [ ] Add password breach checking via HaveIBeenPwned API (hashed k-anonymity)

#### Authorization Layer
- [ ] Enhance RBAC with resource-scoped permissions
- [ ] Add condition fields to ABAC policies (time, IP, device)
- [ ] Implement permission inheritance visualization tool
- [ ] Create policy testing framework with Jest
- [ ] Add policy simulation capability ("what if" analysis)
- [ ] Implement unused permission detection and reporting
- [ ] Add policy versioning with Git-based storage

### Phase 2: Advanced Authentication (Weeks 3-4)
#### Multi-Factor Authentication
- [ ] Implement TOTP-based MFA (Google Authenticator, Authy)
- [ ] Add SMS-based MFA via Twilio integration
- [ ] Add email-based MFA with time-limited codes
- [ ] Create MFA enrollment and management UI
- [ ] Add backup/recovery codes generation
- [ ] Implement trusted device functionality (30-day remember)
- [ ] Add MFA bypass for service accounts/API keys

#### Social Login & Passwordless
- [ ] Implement Google OAuth 2.0 authentication
- [ ] Add LinkedIn OAuth 2.0 authentication
- [ ] Add Microsoft/Azure AD authentication
- [ ] Implement magic link passwordless login
- [ ] Add one-time code authentication (email/SMS)
- [ ] Implement account linking (multiple auth methods per user)
- [ ] Add social login profile data enrichment

#### Session Management
- [ ] Implement server-side session tracking (Redis-backed)
- [ ] Add active sessions dashboard (view all devices/locations)
- [ ] Implement remote logout capability
- [ ] Add session expiration warnings
- [ ] Implement concurrent session limits
- [ ] Add device fingerprinting for session security

### Phase 3: Authorization Intelligence (Weeks 5-6)
#### Fine-Grained Access Control
- [ ] Implement resource-based permissions (specific documents, records)
- [ ] Add time-based access rules (business hours only, etc.)
- [ ] Implement location-based access controls (geo-fencing)
- [ ] Add attribute-based rules (department, clearance level, etc.)
- [ ] Create policy decision point (PDP) caching for performance
- [ ] Implement policy information point (PIP) for dynamic attributes
- [ ] Add policy obligation and advice capabilities

#### Delegation & Emergency Access
- [ ] Implement delegated authority framework
- [ ] Add approval workflows for permission delegation
- [ ] Create break-glass emergency access procedures
- [ ] Add just-in-time access request and approval system
- [ ] Implement time-bound elevation of privileges
- [ ] Add comprehensive audit logging for all elevation events
- [ ] Create emergency access monitoring and alerting

### Phase 4: User Experience & Monitoring (Weeks 7-8)
#### Security UX
- [ ] Implement password strength meter with real-time feedback
- [ ] Add show/hide password toggle in all password fields
- [ ] Create trusted device management UI
- [ ] Add recovery code generation and storage instructions
- [ ] Implement account activity dashboard (login history)
- [ ] Add security notifications for suspicious activity
- [ ] Implement session management interface
- [ ] Add security settings center (privacy, security, notifications)

#### Monitoring & Analytics
- [ ] Implement authentication success/failure metrics
- [ ] Add authorization decision logging and analytics
- [ ] Create real-time authentication anomaly detection
- [ ] Implement brute force attack detection and prevention
- [ ] Add credential stuffing protection
- [ ] Create account takeover protection mechanisms
- [ ] Implement security dashboard for admins
- [ ] Add compliance reporting (SOC2, ISO27001, GDPR)

## Technical Implementation Details

### 1. Enhanced Authentication Service
```javascript
// Enhanced token generation with RS256
const { createSign, createVerify } = require('crypto');

function generateTokensRS256(user) {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    iat: Math.floor(Date.now() / 1000),
    // Short-lived access token
    exp: Math.floor(Date.now() / 1000) + (20 * 60), // 20 minutes
    // Audiences and issuers for validation
    aud: 'sokogateos-platform',
    iss: 'https://auth.sokogateos.com'
  };

  // Sign with private key (rotated periodically)
  const sign = createSign('RSA-SHA256');
  sign.write(JSON.stringify(payload));
  sign.end();
  const accessToken = sign.toString('base64', privateKey);

  // Refresh token with rotation
  const refreshTokenPayload = {
    id: user._id,
    // One-time use refresh token
    jti: crypto.randomBytes(16).toString('hex'),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  const refreshSign = createSign('RSA-SHA256');
  refreshSign.write(JSON.stringify(refreshTokenPayload));
  refreshSign.end();
  const refreshToken = refreshSign.toString('base64', privateKey);

  return { accessToken, refreshToken };
}

// Token verification with validation
function verifyTokenRS256(token) {
  try {
    const verify = createVerify('RSA-SHA256');
    verify.update(JSON.stringify({
      // Extract payload without verifying first
      ...JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    }));
    verify.end();
    
    // Verify signature with current or previous valid key
    const isValid = verify.verify(currentPublicKey, token.split('.')[2], 'base64');
    
    if (!isValid) {
      // Try previous key for rotation period
      return verify.verify(previousPublicKey, token.split('.')[2], 'base64');
    }
    
    return true;
  } catch (err) {
    return false;
  }
}
```

### 2. Enhanced RBAC with Resource Scoping
```javascript
// Enhanced role schema with resource constraints
const enhancedRoleSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  
  isSystem: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  
  // Enhanced permissions with resource constraints
  permissions: [{
    domain: { type: String, required: true },
    actions: [{ type: String, required: true }],
    // Resource constraints for fine-grained access
    resourceConstraints: [{
      resourceType: { type: String, enum: ['document', 'record', 'report', 'dashboard'] },
      resourceIdPattern: { type: String }, // Regex or exact match
      attributes: [{ // Additional attribute conditions
        key: { type: String },
        value: { type: mongoose.Schema.Types.Mixed },
        operator: { type: String, enum: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in', 'nin'] }
      }]
    }],
    // Time-based access rules
    timeConstraints: [{
      daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0=Sunday, 6=Saturday
      startTime: { type: String, match: /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/ }, // HH:MM
      endTime: { type: String, match: /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/ },
      timezone: { type: String, default: 'UTC' },
      dates: [{ type: Date }] // Specific dates when access is allowed/denied
    }],
    
    // Location-based access (IP ranges, countries)
    locationConstraints: [{
      ipRanges: [{ type: String }], // CIDR notation
      countries: [{ type: String }], // ISO country codes
      blockedIpRanges: [{ type: String }],
      blockedCountries: [{ type: String }]
    }]
  }],
  
  // Role inheritance and composition
  inheritsFrom: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
  restrictedFrom: [{ type: Schema.Types.ObjectId, ref: 'Role' }], // Roles this role cannot inherit from
  
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', index: true, default: null },
  
  // Metadata for policy management
  metadata: {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 },
    effectiveDate: { type: Date },
    expirationDate: { type: Date },
    tags: [{ type: String }],
    complianceFramework: { type: String, enum: ['SOC2', 'ISO27001', 'GDPR', 'HIPAA', 'NONE'] }
  }
}, { timestamps: true });
```

### 3. Enhanced ABAC Policy Engine
```javascript
// Enhanced policy evaluation with context enrichment
class EnhancedABACPolicyEngine {
  constructor() {
    this.policies = [];
    this.attributeSources = new Map(); // Functions to resolve dynamic attributes
    this.policyCache = new Map(); // LRU cache for policy decisions
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  // Register attribute source for dynamic resolution
  registerAttributeSource(name, resolverFunction) {
    this.attributeSources.set(name, resolverFunction);
  }

  // Enhanced request context building
  buildRequestContext(rawRequest) {
    const context = {
      subject: {
        ...rawRequest.subject,
        // Resolve dynamic attributes from sources
        ...this.resolveDynamicAttributes(rawRequest.subject)
      },
      resource: {
        ...rawRequest.resource,
        // Resolve dynamic resource attributes
        ...this.resolveDynamicAttributes(rawRequest.resource)
      },
      action: rawRequest.action,
      environment: {
        ...rawRequest.environment,
        // Resolve dynamic environment attributes
        ...this.resolveDynamicAttributes(rawRequest.environment)
      }
    };

    // Apply policy defaults and overrides
    return this.applyPolicyDefaults(context);
  }

  resolveDynamicAttributes(entity) {
    const resolved = {};
    for (const [sourceName, resolver] of this.attributeSources.entries()) {
      try {
        const attributes = resolver(entity);
        Object.assign(resolved, attributes);
      } catch (error) {
        logger.warn(`Failed to resolve attributes from source ${sourceName}:`, error);
      }
    }
    return resolved;
  }

  // Enhanced policy evaluation with caching
  evaluate(requestContext) {
    // Generate cache key from request
    const cacheKey = this.generateCacheKey(requestContext);
    
    // Check cache first
    if (this.policyCache.has(cacheKey)) {
      this.cacheHits++;
      return this.policyCache.get(cacheKey);
    }
    
    this.cacheMisses++;
    
    // Evaluate policies
    const result = this.evaluatePolicies(requestContext);
    
    // Cache result (with LRU eviction)
    this.cachePolicyDecision(cacheKey, result);
    
    return result;
  }

  // Policy evaluation logic
  evaluatePolicies(context) {
    // Sort policies by priority (deny overrides allow)
    const sortedPolicies = [...this.policies].sort((a, b) => 
      (a.priority || 0) - (b.priority || 0)
    );

    let decision = false; // Default deny
    let applicablePolicies = [];

    for (const policy of sortedPolicies) {
      if (this.policyApplies(policy, context)) {
        applicablePolicies.push(policy);
        if (policy.type === 'deny') {
          decision = false;
          break; // Deny overrides everything
        } else if (policy.type === 'allow') {
          decision = true;
          // Continue checking for deny policies that might override
        }
      }
    }

    // Log decision for audit
    this.logDecision(context, decision, applicablePolicies);
    
    return decision;
  }

  policyApplies(policy, context) {
    // Check all policy conditions
    return policy.conditions.every(condition => 
      this.evaluateCondition(condition, context)
    );
  }

  evaluateCondition(condition, context) {
    // Handle different condition types
    switch (condition.type) {
      case 'attributeEquals':
        return this.getValue(context, condition.path) === condition.value;
      case 'attributeGreaterThan':
        return this.getValue(context, condition.path) > condition.value;
      case 'attributeInRange':
        const value = this.getValue(context, condition.path);
        return value >= condition.min && value <= condition.max;
      case 'attributeMatchesRegex':
        const value = this.getValue(context, condition.path);
        return new RegExp(condition.pattern).test(value);
      case 'attributeInList':
        const value = this.getValue(context, condition.path);
        return condition.values.includes(value);
      case 'timeBased':
        return this.evaluateTimeCondition(condition, context);
      case 'locationBased':
        return this.evaluateLocationCondition(condition, context);
      case 'customFunction':
        return condition.function(context);
      default:
        return false;
    }
  }

  getValue(obj, path) {
    // Safe path traversal (e.g., "subject.role" or "resource.attributes.costCenter")
    return path.split('.').reduce((current, part) => 
      current && current[part] !== undefined ? current[part] : undefined, 
      obj
    );
  }

  // Cache management
  generateCacheKey(context) {
    // Create deterministic hash of context for caching
    const contextString = JSON.stringify({
      subject: this.filterSensitiveData(context.subject),
      resource: this.filterSensitiveData(context.resource),
      action: context.action,
      // Exclude highly variable environment data like timestamps
      environment: {
        ipAddress: context.environment.ipAddress,
        userAgent: context.environment.userAgent
      }
    });
    
    return crypto.createHash('sha256').update(contextString).digest('hex');
  }

  filterSensitiveData(obj) {
    // Remove sensitive fields before caching
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    const filtered = { ...obj };
    
    for (const field of sensitiveFields) {
      delete filtered[field];
    }
    
    // Recursively filter nested objects
    for (const key in filtered) {
      if (filtered[key] && typeof filtered[key] === 'object') {
        filtered[key] = this.filterSensitiveData(filtered[key]);
      }
    }
    
    return filtered;
  }

  cachePolicyDecision(key, decision) {
    // Implement LRU cache with max size
    if (this.policyCache.size >= 1000) {
      // Remove oldest entry
      const firstKey = this.policyCache.keys().next().value;
      this.policyCache.delete(firstKey);
    }
    
    this.policyCache.set(key, {
      decision,
      timestamp: Date.now()
    });
  }

  // Statistics and monitoring
  getCacheStatistics() {
    const total = this.cacheHits + this.cacheMisses;
    return {
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: total > 0 ? (this.cacheHits / total) * 100 : 0,
      cacheSize: this.policyCache.size
    };
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation Security (Weeks 1-2)
**Week 1:**
- Implement RS256 JWT signing with key rotation
- Add token audience/issuer validation
- Enhance password strength estimation
- Implement breached password checking
- Create secure token storage guidelines

**Week 2:**
- Enhance RBAC with resource constraints
- Add time-based and location-based access rules
- Implement policy testing framework
- Add policy simulation capabilities
- Create unused permission detection

### Phase 2: Advanced Authentication (Weeks 3-4)
**Week 3:**
- Implement TOTP-based MFA
- Add SMS-based MFA via Twilio
- Create MFA enrollment and management UI
- Add backup/recovery codes
- Implement trusted device functionality

**Week 4:**
- Implement Google OAuth 2.0 authentication
- Add LinkedIn and Microsoft authentication
- Implement magic link passwordless login
- Create account linking functionality
- Add social login profile enrichment

### Phase 3: Authorization Intelligence (Weeks 5-6)
**Week 5:**
- Implement resource-based permissions
- Add time-based and geo-fencing access controls
- Create PDP caching for performance
- Implement PIP for dynamic attributes
- Add policy obligation and advice capabilities

**Week 6:**
- Implement delegated authority framework
- Add approval workflows for delegation
- Create break-glass emergency access
- Implement just-in-time access system
- Add time-bound privilege elevation
- Create comprehensive audit logging

### Phase 4: User Experience & Monitoring (Weeks 7-8)
**Week 7:**
- Implement password strength meter UI
- Add show/hide password toggles
- Create trusted device management UI
- Add recovery code generation
- Implement account activity dashboard
- Add security notifications for suspicious activity

**Week 8:**
- Implement session management interface
- Create security settings center
- Add authentication success/failure metrics
- Implement real-time anomaly detection
- Add brute force and credential stuffing protection
- Create security dashboard for admins
- Add compliance reporting capabilities

## Success Metrics

### Security Metrics
- **Mean Time to Detect (MTTD)**: < 5 minutes for security incidents
- **Mean Time to Respond (MTTR)**: < 30 minutes for confirmed incidents
- **False Positive Rate**: < 5% for security alerts
- **Authentication Success Rate**: > 99.9% for legitimate users
- **Unauthorized Access Attempts Blocked**: > 99.9%
- **MFA Adoption Rate**: > 80% of users within 30 days of rollout
- **Password Reset Rate**: < 2% per month (indicates good password hygiene)

### Performance Metrics
- **Authentication Latency**: < 200ms p95
- **Authorization Decision Latency**: < 50ms p95
- **Token Validation Overhead**: < 1ms per validation
- **Policy Evaluation Time**: < 10ms p95 for complex policies
- **Cache Hit Rate**: > 80% for policy decisions
- **Concurrent Sessions Supported**: > 10,000 active sessions

### Compliance Metrics
- **Audit Log Completeness**: 100% of access decisions logged
- **Policy Change Tracking**: 100% of policy changes audited
- **Access Review Frequency**: Quarterly reviews completed on time
- **Privileged Access Monitoring**: 100% of privileged sessions monitored
- **Breach Notification Time**: < 72 hours as required by regulations
- **Compliance Report Generation**: < 2 hours for standard reports

## Risk Mitigation

### Technical Risks
1. **Performance Degradation**: Mitigate with caching, async processing, and load testing
2. **Lockout Scenarios**: Implement emergency access procedures and fallback authentication
3. **Token Theft**: Mitigate with short-lived tokens, rotation, and binding
4. **Policy Conflicts**: Implement policy testing and simulation before deployment
5. **Third-Party Service Dependencies**: Implement circuit breakers and graceful degradation

### Operational Risks
1. **User Resistance**: Mitigate with extensive training, clear communication, and phased rollout
2. **Administrative Overhead**: Mitigate with automation, self-service portals, and delegation
3. **Compliance Gaps**: Mitigate with regular audits, automated evidence collection, and compliance mapping
4. **False Sense of Security**: Mitigate with penetration testing, red team exercises, and continuous monitoring
5. **Key Management Issues**: Mitigate with hardware security modules, automated rotation, and split knowledge

## Dependencies & Integration Points

### Internal Dependencies
- **User Service**: For user profile and credential management
- **Company Service**: For company scoping and multi-tenancy
- **Audit Service**: For comprehensive logging of access decisions
- **Notification Service**: For security alerts and user notifications
- **Cache Service**: (Redis) for policy decision caching and session storage
- **Message Queue**: (Kafka) for asynchronous processing of auth events
- **Monitoring Service**: (Prometheus/Grafana) for metrics and alerting

### External Dependencies
- **Twilio**: For SMS-based MFA and notifications
- **Google APIs**: For Google OAuth 2.0 and Workspace integration
- **LinkedIn APIs:** For LinkedIn OAuth 2.0 integration
- **Microsoft Graph:** For Azure AD/OAuth 2.0 integration
- **HaveIBeenPwned**: For breach password checking (via k-anonymity API)
- **Email Service**: (SendGrid/SMTP) for magic links and OTP delivery
- **Hardware Security Module**: For private key storage (AWS CloudHSM, Azure Key Vault, or HashiCorp Vault)

## Conclusion

This authentication and permissions enhancement plan transforms sokogateOS from a solid baseline auth system to an enterprise-grade identity and access management platform. By implementing industry-standard security practices, fine-grained authorization controls, and excellent user experiences, the system will be well-equipped to handle the evolving security and compliance requirements of African enterprises while maintaining the seamless user experience that drives adoption.

The enhancements align with zero trust principles, defense-in-depth strategy, and continuous authentication concepts, ensuring that sokogateOS remains secure against evolving threats while enabling legitimate users to access the resources they need efficiently and securely.

Next steps involve beginning implementation with Phase 1 foundation security enhancements, focusing on strengthening the core authentication mechanisms before progressing to advanced features and user experience improvements.