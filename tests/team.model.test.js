// Team Model Test
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
  
  return {
    Schema: mockSchema,
    model: jest.fn()
  };
});

const Team = require('../src/models/team');
describe('Team Model', () => {
  let teamSchema;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should have required name field', () => {
    // Access the schema from the first call to model
    const mongoose = require('mongoose');
    expect(mongoose.model.mock.calls.length).toBeGreaterThan(0);
    teamSchema = mongoose.model.mock.calls[0][1];
    expect(teamSchema.paths.name.options.required).toBe(true);
  });
});
