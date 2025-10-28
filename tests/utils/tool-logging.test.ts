import { logRequestDetails, logResponseHeaders } from '../../server/src/utils/tool-logging';

describe('Tool Logging Utilities', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('logRequestDetails', () => {
    it('should log request details with all parameters', () => {
      const mockOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"test": "data"}',
        backend: 'test-backend'
      };

      logRequestDetails('testTool', 'https://example.com/api', mockOptions, 'remote');

      expect(console.log).toHaveBeenCalledWith('[testTool] REQUEST DETAILS:');
      expect(console.log).toHaveBeenCalledWith('[testTool]   URL: https://example.com/api');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Method: POST');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Backend Mode: remote');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Headers: {\n  "Content-Type": "application/json"\n}');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Body: {"test": "data"}');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Backend: test-backend');
    });

    it('should handle missing body and backend', () => {
      const mockOptions = {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      };

      logRequestDetails('testTool', 'https://example.com/api', mockOptions, 'local');

      expect(console.log).toHaveBeenCalledWith('[testTool] REQUEST DETAILS:');
      expect(console.log).toHaveBeenCalledWith('[testTool]   URL: https://example.com/api');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Method: GET');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Backend Mode: local');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Headers: {\n  "Accept": "application/json"\n}');
      // Should not log body or backend when they're not present
    });

    it('should redact authorization header', () => {
      const mockOptions = {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer secret-token'
        }
      };

      logRequestDetails('testTool', 'https://example.com/api', mockOptions, 'remote');

      expect(console.log).toHaveBeenCalledWith('[testTool]   Headers: {\n  "Content-Type": "application/json",\n  "Authorization": "[PRESENT]"\n}');
    });

    it('should handle missing headers', () => {
      const mockOptions = {
        method: 'GET'
      };

      logRequestDetails('testTool', 'https://example.com/api', mockOptions, 'local');

      expect(console.log).toHaveBeenCalledWith('[testTool] REQUEST DETAILS:');
      expect(console.log).toHaveBeenCalledWith('[testTool]   URL: https://example.com/api');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Method: GET');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Backend Mode: local');
      // Should not log headers when they're not present
    });
  });

  describe('logResponseHeaders', () => {
    it('should log response headers and status', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          entries: jest.fn().mockReturnValue([
            ['content-type', 'application/json'],
            ['x-custom-header', 'test-value']
          ])
        }
      } as any;

      logResponseHeaders('testTool', mockResponse);

      expect(console.log).toHaveBeenCalledWith('[testTool] RESPONSE DETAILS:');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Status: 200 OK');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Response Headers:');
      expect(console.log).toHaveBeenCalledWith('[testTool]     content-type: application/json');
      expect(console.log).toHaveBeenCalledWith('[testTool]     x-custom-header: test-value');
    });

    it('should handle response without headers', () => {
      const mockResponse = {
        status: 404,
        statusText: 'Not Found',
        headers: { 
          entries: jest.fn().mockReturnValue([])
        }
      } as any;

      logResponseHeaders('testTool', mockResponse);

      expect(console.log).toHaveBeenCalledWith('[testTool] RESPONSE DETAILS:');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Status: 404 Not Found');
      expect(console.log).toHaveBeenCalledWith('[testTool]   Response Headers:');
      // Should not log any header entries when there are none
    });
  });
}); 