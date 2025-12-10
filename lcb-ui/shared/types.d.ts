export type TransportType = 'stdio' | 'http' | 'sse';
export type ServerType = 'local-managed' | 'remote-managed' | 'remote-external';
export interface MCPServer {
    id: string;
    name: string;
    description?: string;
    url: string;
    transport: TransportType;
    status?: 'connected' | 'disconnected' | 'connecting';
    lastConnectedAt?: string;
    sessionId?: string;
    command?: string;
    env?: Record<string, string>;
    serverType?: ServerType;
    sourceProjectPath?: string;
    processState?: 'started' | 'stopped' | 'starting' | 'stopping';
    processSessionId?: string;
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
        "openai/outputTemplate"?: string;
        "openai/widgetAccessible"?: boolean;
        "openai/toolInvocation/invoking"?: string;
        "openai/toolInvocation/invoked"?: string;
        [key: string]: any;
    };
    draft?: boolean;
    draftSource?: 'schema';
    deleted?: boolean;
    deployed?: boolean;
    hasEdsWidget?: boolean;
    discovered?: boolean;
}
export interface MCPResource {
    uri: string;
    name?: string;
    description: string;
    mimeType?: string;
    actionName?: string;
    _meta?: {
        "openai/widgetDescription"?: string;
        "openai/widgetPrefersBorder"?: boolean;
        "openai/widgetCSP"?: {
            connect_domains?: string[];
            resource_domains?: string[];
        };
        "openai/widgetDomain"?: string;
        scriptUrl?: string;
        widgetEmbedUrl?: string;
        [key: string]: any;
    };
    deployed?: boolean;
    draft?: boolean;
    deleted?: boolean;
}
export interface MCPContentLegacy {
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
}
export type ResourceContentLegacy = MCPContentLegacy[] | {
    error: string;
};
export interface FlowTransition {
    from: string;
    to: string;
    description: string;
}
export interface CustomerFlow {
    id: string;
    name: string;
    description: string;
    actions: string[];
    transitions: FlowTransition[];
    serverId: string;
}
export interface ToolExecutionResult {
    content: {
        type: string;
        text: string;
    }[];
    success?: boolean;
    error?: string;
    [key: string]: any;
}
export type ChangelogEntryType = 'action_added' | 'action_modified' | 'action_deleted' | 'action_name_changed' | 'action_description_changed' | 'field_added' | 'field_modified' | 'field_deleted' | 'field_type_changed' | 'field_required_changed' | 'conversion_flow_added' | 'conversion_flow_modified' | 'conversion_flow_deleted' | 'actions_discovered' | 'resource_added' | 'resource_modified' | 'resource_deleted' | 'resource_name_changed' | 'resource_description_changed' | 'resource_uri_changed' | 'resource_mimetype_changed' | 'resource_widget_description_changed' | 'resource_script_url_changed' | 'resource_widget_embed_url_changed';
export interface ChangelogEntry {
    id: string;
    timestamp: string;
    type: ChangelogEntryType;
    actionName?: string;
    resourceUri?: string;
    fieldName?: string;
    oldValue?: any;
    newValue?: any;
    description: string;
    committed: boolean;
    sessionId?: string;
}
export interface Environment {
    id: string;
    name: string;
    description: string;
    type: 'remote' | 'local';
    managed?: boolean;
    aemServiceId?: string;
    aemServiceToken?: string;
    createdAt?: string;
}
export interface Deployment {
    id: string;
    environmentId: string;
    serverId: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'killed' | 'cancelled';
    command: string;
    output: string;
    startedAt: string;
    completedAt?: string;
    exitCode?: number;
    sessionId?: string;
}
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
    [key: string]: unknown;
}
/**
 * History Entry
 * Tracks a single MCP operation (request/response pair)
 * Used for both actions and resources history
 */
export interface HistoryEntry {
    id: string;
    timestamp: Date;
    operationName: string;
    request: MCPRequest;
    response: MCPResponse;
}
/**
 * Resource Content
 * Content returned from reading a resource
 * Can be either content array or error
 */
export type ResourceContent = MCPContent[] | {
    error: string;
};
/**
 * Tool Arguments
 * Arguments passed to tool execution
 * More specific than generic Record<string, any>
 */
export type ToolArguments = Record<string, string | number | boolean | null | undefined>;
//# sourceMappingURL=types.d.ts.map