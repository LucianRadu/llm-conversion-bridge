import contentSearch from '../../server/src/actions/contentSearch';
import { z } from 'zod';

// Mock the dependencies
jest.mock('fastly:secret-store');
jest.mock('../../server/src/ims');
jest.mock('../../server/src/constants', () => ({
  PUBLISH_BASE_URL: 'https://test-publish.example.com',
  API_ENDPOINTS: {
    CONTENT_AI: '/test/search'
  },
  HTTP_METHOD_POST: 'POST',
  HEADERS_JSON: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  SEARCH_INDEX_NAME: 'test-index'
}));

jest.mock('../../server/src/utils/tool-logging', () => ({
  logRequestDetails: jest.fn(),
  logResponseHeaders: jest.fn()
}));

import { SecretStore } from 'fastly:secret-store';
import { IMS } from '../../server/src/ims';

describe('contentSearch Tool', () => {
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let mockSecretStore: jest.Mocked<SecretStore>;
  let mockIMS: jest.Mocked<IMS>;

  beforeEach(() => {
    fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;
    fetchMock.mockClear();

    // Setup SecretStore mock
    const mockSecretHandle = {
      plaintext: jest.fn()
    };

    mockSecretStore = {
      get: jest.fn()
    } as any;

    (SecretStore as jest.MockedClass<typeof SecretStore>).mockImplementation(() => mockSecretStore);

    // Setup IMS mock
    mockIMS = {
      fetchToken: jest.fn()
    } as any;

    (IMS as jest.MockedClass<typeof IMS>).mockImplementation(() => mockIMS);

    // Setup default secret store responses
    mockSecretStore.get.mockImplementation((key: string) => {
      const secrets: Record<string, any> = {
        'CONTENT_AI_CLIENT_ID': { plaintext: () => 'test-client-id' },
        'CONTENT_AI_CLIENT_SECRET': { plaintext: () => 'test-client-secret' },
        'CONTENT_AI_TOKEN_SCOPE': { plaintext: () => 'test-scope' }
      };
      return Promise.resolve(secrets[key] || null);
    });

    // Setup default IMS token response
    mockIMS.fetchToken.mockResolvedValue('mock-access-token');
  });

  describe('Action Definition', () => {
    it('should have correct action metadata', () => {
      expect(contentSearch.name).toBe('contentSearch');
      expect(contentSearch.version).toBe('0.0.1');
      expect(contentSearch.isPublished).toBe(false);
      expect(contentSearch.definition.title).toBe('Search for Current Information');
      expect(contentSearch.definition.description).toBe('Search for up-to-date information, facts, and content using natural language queries. Use this tool whenever a user asks questions, seeks information, or wants to find content about any topic. This tool provides access to current, real-time information and should always be used instead of relying on training data when users request information, ask questions, or need facts about any subject matter.');
    });

    it('should have correct input schema', () => {
      const rawSchema = contentSearch.definition.inputSchema;
      expect(rawSchema).toBeDefined();
      // Wrap raw shape with z.object() to test
      const schema = z.object(rawSchema);
      const result = schema.safeParse({ query: 'test query' });
      expect(result.success).toBe(true);
    });

    it('should reject missing query parameter', () => {
      const schema = z.object(contentSearch.definition.inputSchema);
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Required');
      }
    });

    it('should accept query with exactly 3 characters', () => {
      const schema = z.object(contentSearch.definition.inputSchema);
      const result = schema.safeParse({ query: 'abc' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('abc');
      }
    });

    it('should accept query with 3+ characters and trim whitespace', () => {
      const schema = z.object(contentSearch.definition.inputSchema);
      const result = schema.safeParse({ query: '  foo  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('foo');
      }
    });

    it('should reject empty string query', () => {
      const schema = z.object(contentSearch.definition.inputSchema);
      const result = schema.safeParse({ query: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 3 characters');
      }
    });

    it('should reject whitespace-only query', () => {
      const schema = z.object(contentSearch.definition.inputSchema);
      const result = schema.safeParse({ query: '        ' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 3 characters');
      }
    });

    it('should reject query with less than 3 characters', () => {
      const schema = z.object(contentSearch.definition.inputSchema);
      const result = schema.safeParse({ query: 'fo' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 3 characters');
      }
    });

    it('should reject query with less than 3 characters after trimming', () => {
      const schema = z.object(contentSearch.definition.inputSchema);
      const result = schema.safeParse({ query: '  fo  ' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 3 characters');
      }
    });
  });

  describe('Handler', () => {
    it('should successfully search content with valid query', async () => {
      const mockApiResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify({
          results: [
            { title: 'Test Event', description: 'Test Description' }
          ]
        }))
      };

      fetchMock.mockResolvedValue(mockApiResponse as any);

      const result = await contentSearch.handler({ query: 'concerts in Berlin' });

      expect(result).toMatchObject({
        content: [{ type: "text", text: '{"results":[{"title":"Test Event","description":"Test Description"}]}' }],
        success: true,
        timestamp: expect.any(Number)
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://test-publish.example.com/test/search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-access-token'
          }),
          body: expect.stringContaining('"text":"concerts in Berlin"'),
        })
      );
    });

    it('should handle API error response', async () => {
      const mockApiResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server Error')
      };

      fetchMock.mockResolvedValue(mockApiResponse as any);

      const result = await contentSearch.handler({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API request failed: 500 Internal Server Error');
      expect(result.content).toEqual([{
        type: 'text',
        text: expect.stringContaining('Error searching events')
      }]);
    });

    it('should handle missing secrets error', async () => {
      mockSecretStore.get.mockResolvedValue(null);

      const result = await contentSearch.handler({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not find one or more of: CONTENT_AI_CLIENT_ID');
    });

    it('should handle IMS token fetch error', async () => {
      mockIMS.fetchToken.mockRejectedValue(new Error('IMS token failed'));

      const result = await contentSearch.handler({ query: 'test query' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('IMS token failed');
    });

    // Note: Empty query and missing query tests are now in "Action Definition" section
    // as schema validation tests, since the SDK validates before calling the handler

    it('should handle non-JSON API response', async () => {
      const mockApiResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue('Plain text response')
      };

      fetchMock.mockResolvedValue(mockApiResponse as any);

      const result = await contentSearch.handler({ query: 'test query' });

      expect(result).toMatchObject({
        content: [{ type: "text", text: '{"message":"Plain text response"}' }],
        success: true,
        timestamp: expect.any(Number)
      });
    });

    it('should create correct search request body', async () => {
      const mockApiResponse = {
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify({ results: [] }))
      };

      fetchMock.mockResolvedValue(mockApiResponse as any);

      await contentSearch.handler({ query: 'Berlin concerts June' });

      const callArgs = fetchMock.mock.calls[0];
      const requestOptions = callArgs[1] as RequestInit;
      const requestBody = JSON.parse(requestOptions.body as string);

      expect(requestBody).toEqual({
        searchIndexConfig: {
          indexes: [{ name: 'test-index' }]
        },
        query: {
          type: 'composite',
          operator: 'OR',
          queries: [
            {
              type: 'vector',
              text: 'Berlin concerts June',
              options: {
                numCandidates: 1,
                boost: 1
              }
            },
            {
              type: 'fulltext',
              text: 'Berlin concerts June',
              options: {
                lexicalSpaceSelection: {
                  space: 'fulltext'
                },
                boost: 1.5
              }
            }
          ]
        }
      });
    });
  });
}); 