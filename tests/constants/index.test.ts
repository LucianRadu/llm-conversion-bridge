// Note: We need to mock the fastly:env module before importing the constants
jest.mock('fastly:env', () => ({
  env: jest.fn((key: string) => {
    const mockValues: Record<string, string> = {
      'PUBLISH_BASE_URL': 'https://test-publish.example.com',
      'PUBLISH_FASTLY_BACKEND': 'test-backend',
      'IMS_FASTLY_BACKEND': 'test-ims-backend'
    };
    return mockValues[key];
  })
}));

import {
  APP_NAME,
  APP_VERSION,
  USER_AGENT,
  PUBLISH_BASE_URL,
  PUBLISH_FASTLY_BACKEND,
  IMS_FASTLY_BACKEND,
  IMS_URL,
  API_BASE_PATH,
  API_ENDPOINTS,
  SEARCH_INDEX_NAME,
  HTTP_METHOD_GET,
  HTTP_METHOD_POST,
  CONTENT_TYPE_JSON,
  CONTENT_TYPE_FORM_URLENCODED,
  HEADER_CONTENT_TYPE,
  HEADER_ACCEPT,
  HEADER_USER_AGENT,
  HEADER_MCP_SESSION_ID,
  HEADERS_COMMON,
  HEADERS_JSON,
  HEADERS_FORM
} from '../../server/src/constants';

describe('Constants', () => {
  describe('Application Constants', () => {
    it('should have correct app name and version', () => {
      expect(APP_NAME).toBe('MCP-Client');
      expect(APP_VERSION).toBe('1.0.0');
    });

    it('should create correct user agent string', () => {
      expect(USER_AGENT).toBe('MCP-Client/1.0.0');
    });
  });

  describe('URL Constants', () => {
    it('should use environment values for URLs', () => {
      expect(PUBLISH_BASE_URL).toBe('https://test-publish.example.com');
      expect(PUBLISH_FASTLY_BACKEND).toBe('test-backend');
      expect(IMS_FASTLY_BACKEND).toBe('test-ims-backend');
    });

    it('should have correct IMS URL', () => {
      expect(IMS_URL).toBe('https://ims-na1.adobelogin.com/ims/token/v3');
    });

    it('should have correct API base path', () => {
      expect(API_BASE_PATH).toBe('/bin/api');
    });

    it('should have correct API endpoints', () => {
      expect(API_ENDPOINTS.CONTENT_AI).toBe('/adobe/experimental/contentai-expires-20251231/contentAI/search');
    });

    it('should have correct search index name', () => {
      expect(SEARCH_INDEX_NAME).toBe('llm-conversion-accelerator-mcp');
    });
  });

  describe('HTTP Constants', () => {
    it('should have correct HTTP methods', () => {
      expect(HTTP_METHOD_GET).toBe('GET');
      expect(HTTP_METHOD_POST).toBe('POST');
    });

    it('should have correct content types', () => {
      expect(CONTENT_TYPE_JSON).toBe('application/json');
      expect(CONTENT_TYPE_FORM_URLENCODED).toBe('application/x-www-form-urlencoded');
    });

    it('should have correct header names', () => {
      expect(HEADER_CONTENT_TYPE).toBe('Content-Type');
      expect(HEADER_ACCEPT).toBe('Accept');
      expect(HEADER_USER_AGENT).toBe('AEM-Edge-MCP');
      expect(HEADER_MCP_SESSION_ID).toBe('mcp-session-id');
    });

    it('should have correct common headers', () => {
      expect(HEADERS_COMMON).toEqual({
        'Accept': 'application/json',
        'AEM-Edge-MCP': 'MCP-Client/1.0.0'
      });
    });

    it('should have correct JSON headers', () => {
      expect(HEADERS_JSON).toEqual({
        'Accept': 'application/json',
        'AEM-Edge-MCP': 'MCP-Client/1.0.0',
        'Content-Type': 'application/json'
      });
    });

    it('should have correct form headers', () => {
      expect(HEADERS_FORM).toEqual({
        'Accept': 'application/json',
        'AEM-Edge-MCP': 'MCP-Client/1.0.0',
        'Content-Type': 'application/x-www-form-urlencoded'
      });
    });
  });
}); 