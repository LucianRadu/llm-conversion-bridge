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

import {
  Text,
  Button,
  ActionButton,
  TextField,
  ProgressCircle,
  TooltipTrigger,
  Tooltip
} from "@react-spectrum/s2";
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Edit from '@react-spectrum/s2/icons/Edit';
import Delete from '@react-spectrum/s2/icons/Delete';
import Copy from '@react-spectrum/s2/icons/Copy';
import Checkmark from '@react-spectrum/s2/icons/Checkmark';
import Close from '@react-spectrum/s2/icons/Close';
import Preview from '@react-spectrum/s2/icons/Preview';
import Send from '@react-spectrum/s2/icons/Send';
import Undo from '@react-spectrum/s2/icons/Undo';
import type { MCPTool } from '../../../../shared/types';

interface ActionDetailsProps {
  selectedTool: MCPTool | null;
  loading?: boolean;
  isExecuting: boolean;
  executionResponse: any;
  inputValues: Record<string, string>;
  copyStatus: {
    request: 'idle' | 'success' | 'error',
    response: 'idle' | 'success' | 'error',
    mainResponse: 'idle' | 'success' | 'error',
    annotations: 'idle' | 'success' | 'error',
    metadata: 'idle' | 'success' | 'error'
  };
  aemWidgetData: any;
  onInputChange: (key: string, value: string) => void;
  onExecute: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  onPreviewWidget: () => void;
  onCopyToClipboard: (content: any, type: 'request' | 'response' | 'mainResponse' | 'annotations' | 'metadata') => void;
  isLocalManaged?: boolean;
}

const JsonViewer = ({ content, onCopy, copyStatus, className }: any) => (
  <div style={{ position: 'relative' }}>
    <div
      style={{
        border: '1px solid var(--spectrum-global-color-gray-400)',
        borderRadius: '4px',
        padding: '16px',
        backgroundColor: 'var(--spectrum-global-color-gray-800)',
        overflowX: 'auto'
      }}
    >
      <Text
        styles={style({ font: 'code-sm' })}
        UNSAFE_style={{
          color: 'var(--spectrum-global-color-gray-50)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          display: 'block',
          margin: 0
        }}
      >
        {JSON.stringify(content, null, 2)}
      </Text>
    </div>
    <ActionButton
      onPress={onCopy}
      isQuiet
      UNSAFE_className={className}
      UNSAFE_style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        opacity: '0',
        transition: 'opacity 0.2s ease',
        color: '#ffffff'
      }}
    >
      {copyStatus === 'success' ? (
        <Checkmark />
      ) : copyStatus === 'error' ? (
        <Close />
      ) : (
        <Copy />
      )}
    </ActionButton>
  </div>
);

export default function ActionDetails({
  selectedTool,
  loading = false,
  isExecuting,
  executionResponse,
  inputValues,
  copyStatus,
  aemWidgetData,
  onInputChange,
  onExecute,
  onEdit,
  onDelete,
  onRestore,
  onPreviewWidget,
  onCopyToClipboard,
  isLocalManaged = false
}: ActionDetailsProps) {
  return (
    <div
      id="action-request-container"
      className={style({
        display: 'flex',
        flexDirection: 'column',
        height: 'full',
        overflow: 'hidden',
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: 'gray-75',
        borderRadius: 'lg',
        backgroundColor: 'base',
      })}
    >
      {loading ? (
        <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'full', padding: 24 })}>
          <ProgressCircle aria-label="Loading actions" isIndeterminate />
          <Text UNSAFE_style={{ marginTop: '16px' }}>Importing discovered actions...</Text>
        </div>
      ) : selectedTool ? (
        isExecuting ? (
          <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'full', padding: 24 })}>
            <ProgressCircle aria-label="Executing action" isIndeterminate />
            <Text UNSAFE_style={{ marginTop: '16px' }}>Executing {selectedTool.name}...</Text>
          </div>
        ) : (
          <>
            {/* Header with Title and Actions */}
            <div
              className={style({
                display: 'flex',
                flexDirection: 'column',
                padding: 24,
                borderBottomWidth: 1,
                borderBottomColor: 'gray-200',
              })}
            >
              <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' })}>
                <Text styles={style({ font: 'heading', fontWeight: 'bold' })}>{selectedTool.name}</Text>
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
                  {selectedTool.deleted ? (
                    // Show Restore button for deleted actions (only for local-managed)
                    isLocalManaged && (
                      <Button
                        variant="accent"
                        onPress={onRestore}
                        isDisabled={!onRestore}
                        aria-label="Restore action"
                      >
                        <Undo />
                        <Text>Restore Action</Text>
                      </Button>
                    )
                  ) : (
                    // Show action buttons for non-deleted actions
                    <>
                      {isLocalManaged && (
                        <>
                          <ActionButton
                           
                            aria-label="Delete action"
                            onPress={onDelete}
                            isDisabled={!selectedTool}
                            UNSAFE_className="delete-button"
                          >
                            <Delete />
                          </ActionButton>
                          <ActionButton
                           
                            aria-label="Preview AEM widget"
                            onPress={onPreviewWidget}
                            isDisabled={!aemWidgetData || !selectedTool?._meta?.['openai/outputTemplate']}
                          >
                            <Preview />
                          </ActionButton>
                          <ActionButton
                           
                            aria-label="Edit action"
                            onPress={onEdit}
                            isDisabled={!selectedTool}
                          >
                            <Edit />
                          </ActionButton>
                        </>
                      )}
                      {(() => {
                        const hasUncommittedChanges = selectedTool?.draft === true ||
                                                        (selectedTool && 'deployed' in selectedTool && selectedTool.deployed === false) ||
                                                        !!selectedTool?.deleted;
                        
                        // If has uncommitted changes, show disabled button with tooltip
                        if (hasUncommittedChanges) {
                          return (
                            <TooltipTrigger delay={0}>
                              <Button
                                variant="secondary"
                                size="M"
                                isDisabled
                                aria-label="Cannot execute - uncommitted changes"
                                UNSAFE_style={{ opacity: 0.5 }}
                              >
                                <Send />
                              </Button>
                              <Tooltip>Action has uncommitted changes. Deploy before executing.</Tooltip>
                            </TooltipTrigger>
                          );
                        }
                        
                        // Normal enabled button
                        return (
                          <Button
                            variant="accent"
                            size="M"
                            onPress={onExecute}
                            isDisabled={!selectedTool}
                            aria-label="Execute action"
                          >
                            <Send />
                          </Button>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className={style({ flex: 1, overflow: 'auto', padding: 24 })}>
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                {/* Description */}
                {selectedTool.description && (
                  <Text styles={style({ font: 'body' })}>{selectedTool.description}</Text>
                )}

            {/* Tool Annotations */}
            {(selectedTool as any).annotations && (
              <>
                <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })} UNSAFE_style={{ marginTop: '24px', marginBottom: '4px' }}>Annotations</Text>
                <div
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('.copy-button-tool-annotations') as HTMLElement;
                    if (btn) btn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('.copy-button-tool-annotations') as HTMLElement;
                    if (btn) btn.style.opacity = '0';
                  }}
                >
                  <JsonViewer
                    content={(selectedTool as any).annotations}
                    onCopy={() => onCopyToClipboard((selectedTool as any).annotations, 'annotations')}
                    copyStatus={copyStatus.annotations}
                    className="copy-button-tool-annotations"
                  />
                </div>
              </>
            )}

            {/* Tool Metadata */}
            {(selectedTool as any)._meta && (
              <>
                <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })} UNSAFE_style={{ marginTop: '24px', marginBottom: '4px' }}>Metadata</Text>
                <div
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('.copy-button-tool-metadata') as HTMLElement;
                    if (btn) btn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('.copy-button-tool-metadata') as HTMLElement;
                    if (btn) btn.style.opacity = '0';
                  }}
                >
                  <JsonViewer
                    content={(selectedTool as any)._meta}
                    onCopy={() => onCopyToClipboard((selectedTool as any)._meta, 'metadata')}
                    copyStatus={copyStatus.metadata}
                    className="copy-button-tool-metadata"
                  />
                </div>
              </>
            )}

            {/* Input Parameters */}
            {selectedTool.inputSchema?.properties && Object.keys(selectedTool.inputSchema.properties).length > 0 ? (
              <>
                <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })} UNSAFE_style={{ marginTop: '24px', marginBottom: '4px' }}>Input Parameters</Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(selectedTool.inputSchema.properties).map(([key, schema]: [string, any]) => (
                    <TextField
                      key={key}
                      label={key}
                      description={schema.description}
                      isRequired={selectedTool.inputSchema?.required?.includes(key)}
                      value={inputValues[key] || ''}
                      onChange={(value) => onInputChange(key, value)}
                      UNSAFE_style={{ width: '100%' }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div
                style={{
                  backgroundColor: 'var(--spectrum-global-color-gray-75)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '24px',
                  border: '1px dashed var(--spectrum-global-color-gray-400)'
                }}
              >
                <Text styles={style({ font: 'body' })} UNSAFE_style={{
                  color: 'var(--spectrum-global-color-gray-700)',
                  fontStyle: 'italic'
                }}>
                  No parameters configured. This action will take no input.
                </Text>
              </div>
            )}

            {/* Execution Response */}
            {executionResponse && (
              <>
                {/* Response Annotations */}
                {executionResponse._annotations && (
                  <>
                    <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })} UNSAFE_style={{ marginTop: '24px', marginBottom: '4px' }}>Annotations</Text>
                    <div
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget.querySelector('.copy-button-annotations') as HTMLElement;
                        if (btn) btn.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget.querySelector('.copy-button-annotations') as HTMLElement;
                        if (btn) btn.style.opacity = '0';
                      }}
                    >
                      <JsonViewer
                        content={executionResponse._annotations}
                        onCopy={() => onCopyToClipboard(executionResponse._annotations, 'annotations')}
                        copyStatus={copyStatus.annotations}
                        className="copy-button-annotations"
                      />
                    </div>
                  </>
                )}

                {/* Response Metadata */}
                {executionResponse._meta && (
                  <>
                    <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })} UNSAFE_style={{ marginTop: '24px', marginBottom: '4px' }}>Metadata</Text>
                    <div
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget.querySelector('.copy-button-metadata') as HTMLElement;
                        if (btn) btn.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget.querySelector('.copy-button-metadata') as HTMLElement;
                        if (btn) btn.style.opacity = '0';
                      }}
                    >
                      <JsonViewer
                        content={executionResponse._meta}
                        onCopy={() => onCopyToClipboard(executionResponse._meta, 'metadata')}
                        copyStatus={copyStatus.metadata}
                        className="copy-button-metadata"
                      />
                    </div>
                  </>
                )}

                {/* Response */}
                <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })} UNSAFE_style={{ marginTop: '24px', marginBottom: '4px' }}>Response</Text>
                <div
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('.copy-button-main-response') as HTMLElement;
                    if (btn) btn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('.copy-button-main-response') as HTMLElement;
                    if (btn) btn.style.opacity = '0';
                  }}
                >
                  <JsonViewer
                    content={executionResponse}
                    onCopy={() => onCopyToClipboard(executionResponse, 'mainResponse')}
                    copyStatus={copyStatus.mainResponse}
                    className="copy-button-main-response"
                  />
                </div>
              </>
            )}
              </div>
            </div>
          </>
        )
      ) : (
        <div className={style({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'full', padding: 24 })}>
          <Text styles={style({ font: 'body', color: 'gray-600' })}>Select an action to view details</Text>
        </div>
      )}
    </div>
  );
}

