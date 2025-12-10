/**
 * Mock for fastly:secret-store module
 */

class MockSecretHandle {
  constructor(value) {
    this.value = value;
  }

  plaintext() {
    return this.value;
  }
}

class MockSecretStore {
  constructor(name) {
    this.name = name;
    this.secrets = {
      // Default mock secrets for testing
      'CONTENT_AI_CLIENT_ID': 'mock-client-id',
      'CONTENT_AI_CLIENT_SECRET': 'mock-client-secret',
      'CONTENT_AI_TOKEN_SCOPE': 'mock-scope'
    };
  }

  async get(key) {
    const value = this.secrets[key];
    return value ? new MockSecretHandle(value) : null;
  }

  // Helper method for tests to set mock secrets
  setSecret(key, value) {
    this.secrets[key] = value;
  }
}

module.exports = { SecretStore: MockSecretStore }; 