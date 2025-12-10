import { IMS } from '../../server/src/ims';

// Mock the constants module
jest.mock('../../server/src/constants', () => ({
  IMS_URL: 'https://test-ims.example.com/token',
  IMS_FASTLY_BACKEND: 'test-ims-backend'
}));

describe('IMS', () => {
  let ims: IMS;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    ims = new IMS('test-client-id', 'test-client-secret', 'test-scope');
    fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockClear();
  });

  describe('constructor', () => {
    it('should create IMS instance with correct properties', () => {
      expect(ims).toBeInstanceOf(IMS);
      // Properties are private, so we test through behavior
    });
  });

  describe('fetchToken', () => {
    it('should successfully fetch token with valid response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      };
      
      fetchMock.mockResolvedValue(mockResponse as any);

      const token = await ims.fetchToken();

      expect(token).toBe('mock-access-token');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://test-ims.example.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials&client_id=test-client-id&client_secret=test-client-secret&scope=test-scope',
          backend: 'test-ims-backend'
        })
      );
    });

    it('should throw error when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: jest.fn().mockResolvedValue('Invalid credentials')
      };
      
      fetchMock.mockResolvedValue(mockResponse as any);

      await expect(ims.fetchToken()).rejects.toThrow(
        'IMS token request failed: 401 Unauthorized - Invalid credentials'
      );
    });

    it('should throw error when access_token is missing from response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          token_type: 'Bearer',
          expires_in: 3600
          // Missing access_token
        })
      };
      
      fetchMock.mockResolvedValue(mockResponse as any);

      await expect(ims.fetchToken()).rejects.toThrow(
        'IMS token response missing access_token'
      );
    });

    it('should throw error when fetch fails', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(ims.fetchToken()).rejects.toThrow('Network error');
    });

    it('should throw error when JSON parsing fails', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      };
      
      fetchMock.mockResolvedValue(mockResponse as any);

      await expect(ims.fetchToken()).rejects.toThrow('Invalid JSON');
    });
  });
}); 