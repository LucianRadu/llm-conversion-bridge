import { ErrorCode, JSON_RPC_VERSION, MCP_REQUEST_TIMEOUT } from '../../server/src/constants/mcp';

describe('MCP Constants', () => {
  describe('ErrorCode', () => {
    it('should have correct JSON-RPC error codes', () => {
      expect(ErrorCode.ParseError).toBe(-32700);
      expect(ErrorCode.InvalidRequest).toBe(-32600);
      expect(ErrorCode.MethodNotFound).toBe(-32601);
      expect(ErrorCode.InvalidParams).toBe(-32602);
      expect(ErrorCode.InternalError).toBe(-32603);
    });
  });

  describe('JSON_RPC_VERSION', () => {
    it('should be version 2.0', () => {
      expect(JSON_RPC_VERSION).toBe('2.0');
    });
  });

  describe('MCP_REQUEST_TIMEOUT', () => {
    it('should be 30 seconds in milliseconds', () => {
      expect(MCP_REQUEST_TIMEOUT).toBe(30000);
    });
  });
}); 