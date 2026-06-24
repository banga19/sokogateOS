// Team Model Test
let capturedSchema = null;

jest.mock('mongoose', () => {
  const mockSchema = function(obj) {
    this.paths = {};
    this.virtuals = {};
    this.indexes = [];
    
    // Mock path creation for destructuring
    Object.keys(obj || {}).forEach(key => {
      this.paths[key] = { options: obj[key] || {} };
    });
    
    // Mock virtual method
    this.virtual = function(name) {
      if (!this.virtuals[name]) {
        this.virtuals[name] = {};
      }
      return {
        get: (fn) => {
          this.virtuals[name].get = fn;
          return this;
        }
      };
    };
    
    // Mock index method
    this.index = function(fields, options) {
      this.indexes.push({ fields, options });
      return this;
    };
    
    return this;
  };
  
  mockSchema.Types = {
    ObjectId: () => ({ toString: () => 'mock-id' })
  };
  
  // Capture the schema when model is called
  const modelMock = jest.fn((name, schema) => {
    capturedSchema = schema;
    return {};
  });
  
  return {
    Schema: mockSchema,
    model: modelMock
  };
});

// Load the module — this triggers mongoose.model with the schema
const Team = require('../src/models/team');

describe('Team Model', () => {
  test('should have required name field', () => {
    expect(capturedSchema).not.toBeNull();
    expect(capturedSchema.paths.name.options.required).toBe(true);
  });

  test('should have required companyId field', () => {
    expect(capturedSchema.paths.companyId.options.required).toBe(true);
  });

  test('should have required ownerId field', () => {
    expect(capturedSchema.paths.ownerId.options.required).toBe(true);
  });

  test('should set isActive default to true', () => {
    expect(capturedSchema.paths.isActive.options.default).toBe(true);
  });

  test('should have members as an array', () => {
    expect(capturedSchema.paths.members).toBeDefined();
  });
});
