/**
 * OpenAI Apps SDK metadata keys for MCP Actions/Tools
 * Reference: https://developers.openai.com/apps-sdk/reference
 */
export const ACTION_META = {
  /** Resource URI for component HTML template (text/html+skybridge) */
  OUTPUT_TEMPLATE: 'openai/outputTemplate',

  /** Allow component→tool calls through the client bridge (default: false) */
  WIDGET_ACCESSIBLE: 'openai/widgetAccessible',

  /** Short status text while the tool runs (≤64 chars) */
  TOOL_INVOCATION_INVOKING: 'openai/toolInvocation/invoking',

  /** Short status text after the tool completes (≤64 chars) */
  TOOL_INVOCATION_INVOKED: 'openai/toolInvocation/invoked',

  /** Indicates the tool result can produce a widget */
  RESULT_CAN_PRODUCE_WIDGET: 'openai/resultCanProduceWidget',
} as const;

export type ActionMetaKey = typeof ACTION_META[keyof typeof ACTION_META];
