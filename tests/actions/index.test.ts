import actions from '../../server/src/actions';

describe('Actions Index', () => {
  it('should export an array of actions', () => {
    expect(Array.isArray(actions)).toBe(true);
    expect(actions.length).toBeGreaterThan(0);
  });

  it('should contain Bitdefender.searchProducts action', () => {
    const bitdefenderSearchAction = actions.find(action => action.name === 'Bitdefender.searchProducts');
    expect(bitdefenderSearchAction).toBeDefined();
    expect(bitdefenderSearchAction?.version).toBeDefined();
  });

  it('should have actions with required properties', () => {
    actions.forEach(action => {
      expect(action).toHaveProperty('name');
      expect(action).toHaveProperty('definition');
      expect(action).toHaveProperty('handler');
      expect(action).toHaveProperty('version');
      
      expect(typeof action.name).toBe('string');
      expect(typeof action.handler).toBe('function');
      expect(typeof action.version).toBe('string');
      
      expect(action.definition).toHaveProperty('title');
      expect(action.definition).toHaveProperty('description');
      expect(action.definition).toHaveProperty('inputSchema');
    });
  });

  it('should have unique action names', () => {
    const names = actions.map(action => action.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
}); 