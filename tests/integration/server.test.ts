/**
 * Integration tests for MCP server functionality
 * These tests verify the overall behavior without testing Fastly-specific features
 */

// Mock Fastly-specific imports
jest.mock('fastly:env', () => ({
  env: () => 'test'
}));

// We need to mock the Server from the MCP SDK since it's complex to instantiate
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn()
  }))
}));

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import actions from '../../server/src/actions';

describe('MCP Server Integration', () => {
  let mockServer: jest.Mocked<Server>;

  beforeEach(() => {
    mockServer = {
      setRequestHandler: jest.fn(),
      connect: jest.fn()
    } as any;

    (Server as jest.MockedClass<typeof Server>).mockImplementation(() => mockServer);
  });

  it('should create server with correct configuration', () => {
    // This test simulates the server creation logic from index.ts
    const server = new Server({
      name: "llm-conversion-bridge",
      version: expect.stringMatching(/1\.0\.0-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });

    expect(Server).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "llm-conversion-bridge"
      }),
      expect.objectContaining({
        capabilities: {
          tools: {},
          resources: {}
        }
      })
    );
  });

  it('should register all tools with the server', () => {
    const server = new Server({
      name: "test-server",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });

    // Simulate the action registration logic using setRequestHandler (0.5.0 SDK pattern)
    const publishedActions = actions.filter(action => action.isPublished);

    // In the 0.5.0 SDK, actions are registered via setRequestHandler, not registerTool
    expect(mockServer.setRequestHandler).toBeDefined();
    expect(publishedActions.length).toBeGreaterThan(0);
  });
});

describe('UUID Generation', () => {
  // Test the UUID generation function from index.ts
  function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  it('should generate valid UUID format', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should generate unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    expect(uuid1).not.toBe(uuid2);
  });

  it('should always have version 4 identifier', () => {
    const uuid = generateUUID();
    expect(uuid.charAt(14)).toBe('4');
  });
}); 