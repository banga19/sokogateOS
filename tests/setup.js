// Load environment variables for tests
require('dotenv').config({ path: '.env.development' });

// Set up setImmediate for jsdom environment
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => {
    return setTimeout(callback, 0, ...args);
  };
}