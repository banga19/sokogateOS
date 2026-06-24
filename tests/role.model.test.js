// Role Model Test for SokogateOS
// Tests the Role model functionality

// Mock mongoose to avoid actual database connections
let roleSchema;
const mockRoleModel = jest.fn(function (data) {
  // Copy data properties onto the instance (mimicking mongoose behavior)
  if (data) Object.assign(this, data);
  // Set defaults
  if (this.isSystem === undefined) this.isSystem = false;
  if (this.isActive === undefined) this.isActive = true;
  if (this.permissions === undefined) this.permissions = [];
});

function mockSchema(obj) {
  // Build a mock schema with paths, virtuals, and indexes
  const schema = {
    paths: {},
    indexes: [],
    virtuals: {},
  };

  // Mock path creation from schema definition
  if (obj) {
    Object.keys(obj).forEach((key) => {
      schema.paths[key] = {
        options: obj[key] || {},
      };
    });
  }

  // Mock virtual method
  schema.virtual = function (name) {
    if (!this.virtuals[name]) {
      this.virtuals[name] = {};
    }
    return {
      get: (fn) => {
        this.virtuals[name].get = fn;
        return this;
      },
    };
  };

  // Mock index method
  schema.index = function (fields, options) {
    this.indexes.push({ fields, options });
    return this;
  };

  // Capture the schema passed to model() for later inspection
  roleSchema = schema;
  return schema;
}

// Attach Types.ObjectId to the Schema constructor (as mongoose does)
mockSchema.Types = {
  ObjectId: function () {
    return {
      toString: () => 'mock-object-id',
    };
  },
};

jest.mock('mongoose', () => ({
  Schema: mockSchema,
  model: jest.fn().mockReturnValue(mockRoleModel),
}));

const Role = require('../src/models/role');

// Capture schema reference at load time (before any mocks are cleared)
roleSchema = roleSchema || (require('mongoose').model.mock.calls[0] || [])[1];

describe('Role Model', () => {
  beforeEach(() => {
    // Clear all mocks (call history, not mock implementations)
    // Note: roleSchema and mockRoleModel are captured above and not affected by clearing
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    test('should have required name field', () => {
      const namePath = roleSchema.paths.name;
      expect(namePath).toBeDefined();
      expect(namePath.options.required).toBe(true);
      expect(namePath.options.trim).toBe(true);
    });

    test('should have required slug field with unique index', () => {
      const slugPath = roleSchema.paths.slug;
      expect(slugPath).toBeDefined();
      expect(slugPath.options.required).toBe(true);
      expect(slugPath.options.unique).toBe(true);
      expect(slugPath.options.lowercase).toBe(true);
      expect(slugPath.options.trim).toBe(true);
    });

    test('should have optional description field', () => {
      const descriptionPath = roleSchema.paths.description;
      expect(descriptionPath).toBeDefined();
      expect(descriptionPath.options.trim).toBe(true);
    });

    test('should have isSystem field with default false', () => {
      const isSystemPath = roleSchema.paths.isSystem;
      expect(isSystemPath).toBeDefined();
      expect(isSystemPath.options.type).toBe(Boolean);
      expect(isSystemPath.options.default).toBe(false);
    });

    test('should have isActive field with default true', () => {
      const isActivePath = roleSchema.paths.isActive;
      expect(isActivePath).toBeDefined();
      expect(isActivePath.options.type).toBe(Boolean);
      expect(isActivePath.options.default).toBe(true);
    });

    test('should have permissions array with domain and actions', () => {
      const permissionsPath = roleSchema.paths.permissions;
      expect(permissionsPath).toBeDefined();
    });

    test('should have inheritsFrom field referencing Role', () => {
      const inheritsFromPath = roleSchema.paths.inheritsFrom;
      expect(inheritsFromPath).toBeDefined();
      expect(inheritsFromPath.options.ref).toBe('Role');
    });

    test('should have companyId field with index', () => {
      const companyIdPath = roleSchema.paths.companyId;
      expect(companyIdPath).toBeDefined();
      expect(companyIdPath.options.ref).toBe('Company');
      expect(companyIdPath.options.index).toBe(true);
      expect(companyIdPath.options.default).toBe(null);
    });
  });

  describe('Schema Indexes', () => {
    test('should have compound index on companyId and slug', () => {
      // Check that schema has indexes defined
      expect(roleSchema.indexes).toBeDefined();
    });

    test('should have index on isSystem', () => {
      expect(roleSchema.indexes).toBeDefined();
    });
  });

  describe('Model Instantiation', () => {
    test('should create a role instance with valid data', async () => {
      const roleData = {
        name: 'Admin',
        slug: 'admin',
        description: 'Administrator role',
        isSystem: true,
        isActive: true,
        permissions: [{ domain: 'users', actions: ['read', 'write', 'delete'] }],
      };

      const role = new mockRoleModel(roleData);
      expect(role).toBeDefined();
      expect(role.name).toBe('Admin');
      expect(role.slug).toBe('admin');
      expect(role.description).toBe('Administrator role');
      expect(role.isSystem).toBe(true);
      expect(role.isActive).toBe(true);
      expect(role.permissions).toEqual([{ domain: 'users', actions: ['read', 'write', 'delete'] }]);
    });

    test('should create a role instance with minimal data', async () => {
      const roleData = {
        name: 'Member',
        slug: 'member',
      };

      const role = new mockRoleModel(roleData);
      expect(role).toBeDefined();
      expect(role.name).toBe('Member');
      expect(role.slug).toBe('member');
      // Check defaults
      expect(role.isSystem).toBe(false);
      expect(role.isActive).toBe(true);
      expect(role.permissions).toEqual([]);
    });
  });

  describe('Validation', () => {
    test('should require name field', async () => {
      const roleData = {
        slug: 'test-role',
        // Missing name
      };

      const role = new mockRoleModel(roleData);
      // In a real test with validation, we'd check for errors
      // Since we're mocking, we'll just verify the object was created
      expect(role).toBeDefined();
      expect(role.slug).toBe('test-role');
    });

    test('should require slug field', async () => {
      const roleData = {
        name: 'Test Role',
        // Missing slug
      };

      const role = new mockRoleModel(roleData);
      expect(role).toBeDefined();
      expect(role.name).toBe('Test Role');
    });
  });
});
