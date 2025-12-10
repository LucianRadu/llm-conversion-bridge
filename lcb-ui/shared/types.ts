export type TransportType = 'stdio' | 'http' | 'sse';

export type ServerType = 'local-managed' | 'remote-managed' | 'remote-external';

export interface MCPServer {
  id: string;
  name: string;
  description?: string; // Brief description of the server
  url: string;
  transport: TransportType;
  status?: 'connected' | 'disconnected' | 'connecting';
  lastConnectedAt?: string; // ISO timestamp of last successful connection
  sessionId?: string; // MCP session ID (when connected)
  command?: string; // For STDIO servers
  env?: Record<string, string>; // Environment variables for STDIO

  // Server type classification
  serverType?: ServerType; // Type of server: local-managed, remote-managed, or remote-external
  sourceProjectPath?: string; // Path to lcb-server source (for managed servers only)

  // Server process state (for local-managed servers only)
  processState?: 'started' | 'stopped' | 'starting' | 'stopping';
  processSessionId?: string; // Session ID for the background make serve process

  // EDS configuration (for local-managed servers only)
  edsConfig?: {
    branch: string;
    repo: string;
    owner: string;
  };
}

export interface MCPTool {
  name: string;
  title?: string;
  description?: string;
  version?: string;
  inputSchema?: any;
  annotations?: {
    destructiveHint?: boolean;
    openWorldHint?: boolean;
    readOnlyHint?: boolean;
  };
  _meta?: {
    "openai/outputTemplate"?: string; // Resource URI for component HTML template (text/html+skybridge)
    "openai/widgetAccessible"?: boolean; // Allow component→tool calls through the client bridge (default: false)
    "openai/toolInvocation/invoking"?: string; // Short status text while the tool runs (≤64 chars)
    "openai/toolInvocation/invoked"?: string; // Short status text after the tool completes (≤64 chars)
    [key: string]: any; // Allow other meta fields
  };
  // Draft metadata (used in UI/DB overlays, not part of MCP spec)
  draft?: boolean;
  draftSource?: 'schema';
  deleted?: boolean; // Indicates if this action has been deleted (pending deployment)
  deployed?: boolean; // Indicates if this action has been deployed (false for newly created actions)
  hasEdsWidget?: boolean; // Indicates if this action has an EDS widget
  discovered?: boolean; // Indicates if this action was imported via Discovery Wizard (shows DISCOVERED badge)
}

export interface MCPResource {
  uri: string;
  name?: string;
  description: string; // MANDATORY - Standard MCP description field (displayed in list)
  mimeType?: string;
  actionName?: string; // Action folder name (for widget resources)
  _meta?: {
    "openai/widgetDescription"?: string; // OPTIONAL - ChatGPT-specific widget description
    "openai/widgetPrefersBorder"?: boolean; // OPTIONAL - Widget border preference
    "openai/widgetCSP"?: {
      connect_domains?: string[];
      resource_domains?: string[];
    };
    "openai/widgetDomain"?: string; // OPTIONAL - Widget domain
    scriptUrl?: string; // For template.html generation (script src URL)
    widgetEmbedUrl?: string; // For template.html generation (aem-embed url)
    [key: string]: any; // Allow other meta fields
  };
  // Draft metadata (used in UI/DB overlays, not part of MCP spec)
  deployed?: boolean; // false for newly created resources (pending deployment)
  draft?: boolean;
  deleted?: boolean; // Indicates if this resource has been deleted (pending deployment)
}

export interface MCPContentLegacy {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export type ResourceContentLegacy = MCPContentLegacy[] | { error: string };

export interface ToolExecutionResult {
  content: { type: string; text: string }[];
  success?: boolean;
  error?: string;
  [key: string]: any;
}

export type ChangelogEntryType =
  | 'action_added'
  | 'action_modified'
  | 'action_deleted'
  | 'action_name_changed'
  | 'action_description_changed'
  | 'field_added'
  | 'field_modified'
  | 'field_deleted'
  | 'field_type_changed'
  | 'field_required_changed'
  | 'conversion_flow_added'
  | 'conversion_flow_modified'
  | 'conversion_flow_deleted'
  | 'actions_discovered'
  | 'resource_added'
  | 'resource_modified'
  | 'resource_deleted'
  | 'resource_name_changed'
  | 'resource_description_changed'
  | 'resource_uri_changed'
  | 'resource_mimetype_changed'
  | 'resource_widget_description_changed' // For openai/widgetDescription
  | 'resource_script_url_changed'         // For openai:widget_meta.script_url
  | 'resource_widget_embed_url_changed';  // For openai:widget_meta.widget_embed_url

export interface ChangelogEntry {
  id: string;                    // Unique ID for the entry
  timestamp: string;              // ISO timestamp
  type: ChangelogEntryType;       // Type of change
  actionName?: string;            // Name of the action affected (for action changes)
  resourceUri?: string;           // URI of the resource affected (for resource changes)
  fieldName?: string;             // Name of the field (if field-related change)
  oldValue?: any;                 // Previous value
  newValue?: any;                 // New value
  description: string;            // Human-readable description of the change
  committed: boolean;             // Whether this change has been committed to files
  sessionId?: string;             // Session identifier (optional)
}

export interface Environment {
  id: string;
  name: string;
  description: string;
  type: 'remote' | 'local';
  managed?: boolean;              // True for system-created environments (cannot be deleted)
  aemServiceId?: string;          // Required for remote type
  aemServiceToken?: string;       // Required for remote type
  createdAt?: string;             // ISO timestamp (stored in DB, not shown in UI)
}

export interface Deployment {
  id: string;                     // UUID
  environmentId: string;          // Parent environment
  serverId: string;               // Grandparent server (for queries)
  status: 'pending' | 'running' | 'success' | 'failed' | 'killed' | 'cancelled';
  command: string;                // Bash command executed
  output: string;                 // Accumulated output
  startedAt: string;              // ISO timestamp
  completedAt?: string;           // ISO timestamp (when finished)
  exitCode?: number;              // Process exit code
  sessionId?: string;             // For killing process
}

// ============================================================================
// MCP Protocol Types - Strongly typed interfaces for MCP requests/responses
// ============================================================================

/**
 * MCP Request structure
 * Used for tracking requests to MCP servers
 */
export interface MCPRequest {
  method: string;
  params: Record<string, unknown>;
}

/**
 * MCP Response Metadata
 * Extensible metadata that can be attached to responses
 */
export interface MCPResponseMeta {
  [key: string]: unknown;
}

/**
 * MCP Response Annotations
 * Standard annotations defined by MCP spec
 */
export interface MCPResponseAnnotations {
  audience?: string[];
  priority?: number;
  [key: string]: unknown;
}

/**
 * MCP Text Content
 * Represents textual content in MCP responses
 */
export interface MCPTextContent {
  type: 'text';
  text: string;
  mimeType?: string;
}

/**
 * MCP Image Content
 * Represents image content in MCP responses
 */
export interface MCPImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

/**
 * MCP Content Union Type
 * All possible content types in MCP responses
 */
export type MCPContent = MCPTextContent | MCPImageContent;

/**
 * MCP Response structure
 * Standard response format from MCP servers
 */
export interface MCPResponse {
  content?: MCPContent[];
  structuredContent?: unknown;
  _annotations?: MCPResponseAnnotations;
  _meta?: MCPResponseMeta;
  error?: string;
  [key: string]: unknown;  // Allow additional fields for extensibility
}

// ============================================================================
// History Types - For tracking MCP operations
// ============================================================================

/**
 * History Entry
 * Tracks a single MCP operation (request/response pair)
 * Used for both actions and resources history
 */
export interface HistoryEntry {
  id: string;
  timestamp: Date;
  operationName: string;      // e.g., "tools/call", "resources/read", "resources/list"
  request: MCPRequest;
  response: MCPResponse;
}

// ============================================================================
// Resource Types
// ============================================================================

/**
 * Resource Content
 * Content returned from reading a resource
 * Can be either content array or error
 */
export type ResourceContent = MCPContent[] | { error: string };

// ============================================================================
// Tool Execution Types
// ============================================================================

/**
 * Tool Arguments
 * Arguments passed to tool execution
 * More specific than generic Record<string, any>
 */
export type ToolArguments = Record<string, string | number | boolean | null | undefined>;
