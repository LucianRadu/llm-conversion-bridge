# Testing Guide

This directory contains the test suite for the LLM Conversion Bridge project.

## Test Structure

```
tests/
├── README.md                    # This file
├── setup.ts                     # Jest test setup and global mocks
├── mocks/                       # Mock implementations
│   └── fastly/                  # Fastly-specific mocks
│       ├── env.js              # Mock for fastly:env
│       └── secret-store.js     # Mock for fastly:secret-store
├── constants/                   # Tests for constants
│   ├── index.test.ts           # Main constants tests
│   └── mcp.test.ts             # MCP constants tests
├── utils/                       # Tests for utilities
│   └── tool-logging.test.ts    # Action logging utilities tests
├── ims/                         # Tests for IMS authentication
│   └── index.test.ts           # IMS class tests
├── actions/                     # Tests for MCP actions
│   ├── index.test.ts           # Actions index tests
│   └── contentSearch.test.ts   # Content search action tests
└── integration/                 # Integration tests
    └── server.test.ts          # MCP server integration tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Integration Tests Only (Fastly deployment)
```bash
npm run test:integration
```

## Test Configuration

The test suite is configured with:

- **Jest**: Testing framework with TypeScript support
- **ts-jest**: TypeScript preprocessor for Jest
- **Mock System**: Comprehensive mocking of Fastly-specific modules
- **Setup File**: Global test setup with common mocks and utilities

## Key Features

### Fastly Module Mocking

The test suite includes comprehensive mocks for Fastly-specific modules that aren't available in the Node.js test environment:

- `fastly:env` - Environment variables
- `fastly:secret-store` - Secret management

### Global Setup

The `setup.ts` file provides:

- Global fetch mock
- Console method mocking for cleaner test output
- AbortController/AbortSignal polyfills
- Automatic mock reset between tests

### Test Categories

1. **Unit Tests**: Test individual modules in isolation
2. **Integration Tests**: Test component interactions
3. **Tool Tests**: Comprehensive testing of MCP actions

## Writing New Tests

### Adding a New Action Test

1. Create a new test file in `tests/actions/`
2. Mock required dependencies
3. Test action definition and handler functionality
4. Include error handling scenarios

Example:
```typescript
import myAction from '../../server/src/actions/myAction';

jest.mock('../../server/src/constants', () => ({
  // Mock required constants
}));

describe('myAction', () => {
  // Test implementation
});
```

### Adding Fastly Module Mocks

Add new mock files in `tests/mocks/fastly/` following the pattern:

```javascript
// tests/mocks/fastly/new-module.js
module.exports = {
  // Mock exports
};
```

Then update `jest.config.js` moduleNameMapping if needed.

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Mocking**: Mock external dependencies and side effects
3. **Coverage**: Aim for high test coverage, especially for critical paths
4. **Error Cases**: Test both success and error scenarios
5. **Readable**: Write clear, descriptive test names and organize with describe blocks

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all Fastly modules are properly mocked
2. **TypeScript Errors**: Check that mocks match expected interfaces
3. **Async Issues**: Use proper async/await patterns in tests
4. **Mock Leaks**: Verify mocks are reset between tests

### Debugging

- Use `console.log` in tests (mocked by default, but can be restored)
- Run single test files: `npx jest tests/path/to/test.test.ts`
- Use `--verbose` flag for detailed output
- Check coverage reports to identify untested code paths 