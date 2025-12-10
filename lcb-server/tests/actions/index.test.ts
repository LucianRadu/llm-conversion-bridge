import fs from 'fs';
import path from 'path';
import actions from '../../server/src/actions';

/**
 * Dynamically read schema.json files to find published actions
 * This ensures tests match the actual isPublished flags
 */
function getPublishedActionsFromSchemas(): { name: string; schema: any }[] {
  const actionsDir = path.join(__dirname, '../../server/src/actions');
  const folders = fs.readdirSync(actionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory());
  
  const published = [];
  for (const dirent of folders) {
    const schemaPath = path.join(actionsDir, dirent.name, 'schema.json');
    if (fs.existsSync(schemaPath)) {
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      if (schema.isPublished === true) {
        published.push({ name: dirent.name, schema });
      }
    }
  }
  return published;
}

describe('Actions Index', () => {
  const publishedActions = getPublishedActionsFromSchemas();
  
  // Warn if no actions are published
  if (publishedActions.length === 0) {
    console.warn('⚠️  WARNING: No actions have isPublished=true. All actions are filtered out.');
  }

  it('should export an array of actions', () => {
    expect(Array.isArray(actions)).toBe(true);
    // Assert against actual number of published actions
    expect(actions.length).toBe(publishedActions.length);
  });

  it('should contain contentSearch action (if published)', () => {
    const isContentSearchPublished = publishedActions.some(a => a.name === 'contentSearch');
    
    if (!isContentSearchPublished) {
      console.log('ℹ️  contentSearch is not published, skipping test');
      return;
    }
    
    const contentSearchAction = actions.find(action => action.name === 'contentSearch');
    expect(contentSearchAction).toBeDefined();
    expect(contentSearchAction?.version).toBeDefined();
  });

  it('should have actions with required properties', () => {
    if (actions.length === 0) {
      console.log('ℹ️  No published actions to test');
      return;
    }
    
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

  describe('Input Validation', () => {
    it('should have valid Zod schemas for all actions', () => {
      if (actions.length === 0) {
        console.log('ℹ️  No published actions to test');
        return;
      }
      
      actions.forEach(action => {
        const schema = action.definition.inputSchema;
        expect(schema).toBeDefined();
        // Should have parse and safeParse methods (Zod API)
        expect(typeof schema.parse).toBe('function');
        expect(typeof schema.safeParse).toBe('function');
      });
    });

    it('heartbeat should accept empty object (if published)', () => {
      const heartbeat = actions.find(a => a.name === 'Internal.heartbeat');
      if (heartbeat) {
        const result = heartbeat.definition.inputSchema.safeParse({});
        expect(result.success).toBe(true);
      } else {
        console.log('ℹ️  heartbeat is not published, skipping test');
      }
    });

    it('heartbeatWidget should accept empty object (if published)', () => {
      const widget = actions.find(a => a.name === 'Internal.heartbeatWidget');
      if (widget) {
        const result = widget.definition.inputSchema.safeParse({});
        expect(result.success).toBe(true);
      } else {
        console.log('ℹ️  heartbeatWidget is not published, skipping test');
      }
    });

    it('contentSearch should require query parameter (if published)', () => {
      const search = actions.find(a => a.name === 'contentSearch');
      if (search) {
        const result = search.definition.inputSchema.safeParse({});
        expect(result.success).toBe(false);
      } else {
        console.log('ℹ️  contentSearch is not published, skipping test');
      }
    });

    it('contentSearch should accept string query (if published)', () => {
      const search = actions.find(a => a.name === 'contentSearch');
      if (search) {
        const result = search.definition.inputSchema.safeParse({ query: 'test' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect((result.data as any).query).toBe('test');
        }
      } else {
        console.log('ℹ️  contentSearch is not published, skipping test');
      }
    });

    it('helloWorldEDS should accept empty object (if published)', () => {
      const widget = actions.find(a => a.name === 'helloWorldEDS');
      if (widget) {
        const result = widget.definition.inputSchema.safeParse({});
        expect(result.success).toBe(true);
      } else {
        console.log('ℹ️  helloWorldEDS is not published, skipping test');
      }
    });

    it('systemStatusWidget should accept empty object (if published)', () => {
      const widget = actions.find(a => a.name === 'Internal.systemStatusWidget');
      if (widget) {
        const result = widget.definition.inputSchema.safeParse({});
        expect(result.success).toBe(true);
      } else {
        console.log('ℹ️  systemStatusWidget is not published, skipping test');
      }
    });

    it('should reject invalid input types (if contentSearch published)', () => {
      const search = actions.find(a => a.name === 'contentSearch');
      if (search) {
        // Should reject non-string query
        expect(search.definition.inputSchema.safeParse({ query: 123 }).success).toBe(false);
        expect(search.definition.inputSchema.safeParse({ query: null }).success).toBe(false);
        expect(search.definition.inputSchema.safeParse({ query: {} }).success).toBe(false);
      } else {
        console.log('ℹ️  contentSearch is not published, skipping test');
      }
    });
  });
}); 