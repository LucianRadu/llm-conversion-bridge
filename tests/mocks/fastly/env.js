/**
 * Mock for fastly:env module
 */

// Mock the env function that returns environment variable values
function env(key) {
  const mockValues = {
    'PUBLISH_BASE_URL': 'https://test-publish.example.com',
    'PUBLISH_FASTLY_BACKEND': 'test-backend',
    'IMS_FASTLY_BACKEND': 'test-ims-backend'
  };
  return mockValues[key];
}

module.exports = { env }; 