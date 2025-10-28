/**
 * Test setup file for Jest
 * This file runs before all tests and sets up global mocks and configurations
 */

// Mock global fetch if not available in test environment
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests unless explicitly testing them
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock AbortController and AbortSignal which might not be available in test environment
class MockAbortSignal extends EventTarget {
  aborted: boolean = false;
  reason: any = undefined;

  constructor() {
    super();
  }

  abort(reason?: any) {
    if (this.aborted) return;
    this.aborted = true;
    this.reason = reason || new Error('AbortError');
    this.dispatchEvent(new Event('abort'));
  }

  throwIfAborted() {
    if (this.aborted) {
      throw this.reason;
    }
  }
}

global.AbortController = class MockAbortController {
  signal: MockAbortSignal;
  constructor() {
    this.signal = new MockAbortSignal();
  }
  abort(reason?: any) {
    this.signal.abort(reason);
  }
} as any;

global.AbortSignal = MockAbortSignal as any;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 