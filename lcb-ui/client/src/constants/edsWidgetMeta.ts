/**
 * OpenAI Apps SDK metadata keys for EDS Widget Resources
 * Reference: https://developers.openai.com/apps-sdk/reference
 */
export const EDS_WIDGET_META = {
  /** ChatGPT-specific widget description */
  WIDGET_DESCRIPTION: 'openai/widgetDescription',

  /** Widget border preference (boolean) */
  WIDGET_PREFERS_BORDER: 'openai/widgetPrefersBorder',

  /** Content Security Policy configuration */
  WIDGET_CSP: 'openai/widgetCSP',

  /** Widget domain string */
  WIDGET_DOMAIN: 'openai/widgetDomain',

  /** Custom field (not official OpenAI) - stores template URLs for generating template.html during deployment */
  LCB_WIDGET_META: 'openai:widget_meta',

  // Nested keys within openai/widgetCSP
  CSP_CONNECT_DOMAINS: 'connect_domains',
  CSP_RESOURCE_DOMAINS: 'resource_domains',

  // Nested keys within openai:widget_meta
  SCRIPT_URL: 'script_url',
  WIDGET_EMBED_URL: 'widget_embed_url',
} as const;

export type EdsWidgetMetaKey = typeof EDS_WIDGET_META[keyof typeof EDS_WIDGET_META];
