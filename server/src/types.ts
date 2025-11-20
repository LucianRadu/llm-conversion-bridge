/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

export interface GripResponse {
  contentType: string;
  gripHold: string;
  gripChannel: string;
}

export interface HttpStreamData {
  content: string;
  // contentBin?: string;
}

export interface MessageData {
  'http-stream': HttpStreamData;
}

export interface PublishItem {
  channel: string;
  formats: MessageData;
}

export interface PublishData {
  items: PublishItem[];
}

export type ContentItem = 
  | { type: "text"; text: string }
  | { type: "resource"; resource: { uri: string; mimeType: string; text: string } };

export type ActionHandlerResult = {
  content: ContentItem[];
  [key: string]: any;
};

export interface Action {
  name: string;
  isPublished: boolean;
  hasAemWidget: boolean;
  version: string;
  definition: {
    title: string;
    description: string;
    inputSchema: any;
    annotations?: {
      destructiveHint?: boolean;
      openWorldHint?: boolean;
      readOnlyHint?: boolean;
      idempotentHint?: boolean;
    };
    _meta?: Record<string, any>;
  };
  handler: (args: any) => Promise<ActionHandlerResult>;
}

export interface SearchIndexConfig {
  indexes: {
    name: string;
  }[];
}

export interface VectorQueryOptions {
  numCandidates: number;
  boost: number;
}

export interface VectorQuery {
  type: "vector";
  text: string;
  options: VectorQueryOptions;
}

export interface LexicalSpaceSelection {
  space: "fulltext";
}

export interface FulltextQueryOptions {
  lexicalSpaceSelection: LexicalSpaceSelection;
  boost: number;
}

export interface FulltextQuery {
  type: "fulltext";
  text: string;
  options: FulltextQueryOptions;
}

export type SearchQuery = VectorQuery | FulltextQuery;

export interface CompositeQuery {
  type: "composite";
  operator: "OR" | "AND";
  queries: SearchQuery[];
}

export interface SearchRequestBody {
  searchIndexConfig: SearchIndexConfig;
  query: CompositeQuery;
} 