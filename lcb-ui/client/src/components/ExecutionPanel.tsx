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

import { useState } from 'react';
import { TextField, TextArea, Button, ProgressCircle, Tabs, TabList, Tab, TabPanel, Text } from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Send from '@react-spectrum/s2/icons/Send';
import Copy from '@react-spectrum/s2/icons/Copy';
import Checkmark from '@react-spectrum/s2/icons/Checkmark';
import Close from '@react-spectrum/s2/icons/Close';
import type { MCPTool, MCPResource } from '../../../shared/types';
import { AEMWidgetRenderer } from './AEMWidgetRenderer';

interface ExecutionPanelProps {
  isOpen: boolean;
  action: MCPTool | null;
  onClose: () => void;
  onExecute: (args: Record<string, string>) => Promise<any>;
  widget?: MCPResource | null;
  serverId?: string;
}

export default function ExecutionPanel({
  isOpen,
  action,
  onClose: _onClose,
  onExecute,
  widget,
  serverId
}: ExecutionPanelProps) {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResponse, setExecutionResponse] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<string>('response');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [copyStatus, setCopyStatus] = useState<{
    response: 'idle' | 'success' | 'error',
    annotations: 'idle' | 'success' | 'error',
    metadata: 'idle' | 'success' | 'error'
  }>({
    response: 'idle',
    annotations: 'idle',
    metadata: 'idle'
  });

  const handleInputChange = (key: string, value: string) => {
    setInputValues(prev => ({ ...prev, [key]: value }));
    
    // Validate field and update errors
    if (action?.inputSchema?.properties) {
      const fieldSchema = action.inputSchema.properties[key] as any;
      const isRequired = action.inputSchema.required?.includes(key);
      let error = '';

      // Required validation
      if (isRequired && (!value || value.trim() === '')) {
        error = 'This field is required';
      }
      // Only validate constraints if there's a value
      else if (value && value.trim() !== '') {
        // minLength validation
        if (fieldSchema?.minLength !== undefined && value.length < fieldSchema.minLength) {
          error = `Must be at least ${fieldSchema.minLength} characters`;
        }
        // maxLength validation
        else if (fieldSchema?.maxLength !== undefined && value.length > fieldSchema.maxLength) {
          error = `Must be at most ${fieldSchema.maxLength} characters`;
        }
        // pattern validation
        else if (fieldSchema?.pattern) {
          const regex = new RegExp(fieldSchema.pattern);
          if (!regex.test(value)) {
            error = 'Invalid format';
          }
        }
      }

      setValidationErrors(prev => {
        if (error) {
          return { ...prev, [key]: error };
        } else {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
      });
    }
  };

  // Comprehensive validation for all schema constraints
  const isFormValid = () => {
    if (!action?.inputSchema) return true;

    const properties = action.inputSchema.properties || {};
    const required = action.inputSchema.required || [];

    // Check all fields (both required and optional)
    for (const [key, schema] of Object.entries(properties)) {
      const value = inputValues[key];
      const isRequired = required.includes(key);
      
      // Required field validation
      if (isRequired) {
        if (value === undefined || value === null || value.trim() === '') {
          return false;
        }
      }

      // Only validate other constraints if there's a value
      if (value && value.trim() !== '') {
        const fieldSchema = schema as any;
        
        // minLength validation
        if (fieldSchema.minLength !== undefined && value.length < fieldSchema.minLength) {
          return false;
        }
        
        // maxLength validation
        if (fieldSchema.maxLength !== undefined && value.length > fieldSchema.maxLength) {
          return false;
        }
        
        // pattern (regex) validation
        if (fieldSchema.pattern) {
          const regex = new RegExp(fieldSchema.pattern);
          if (!regex.test(value)) {
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleExecute = async () => {
    if (!action) return;

    // Clear previous response and start executing
    setExecutionResponse(null);
    setIsExecuting(true);
    try {
      const result = await onExecute(inputValues);
      setExecutionResponse(result);
      // If there's a widget, switch to the Widget Preview tab after execution
      if (widget) {
        setSelectedTab('widget');
      }
    } catch (error) {
      setExecutionResponse({ error: error instanceof Error ? error.message : 'Execution failed' });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = async (content: any, type: 'response' | 'annotations' | 'metadata') => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(content, null, 2));
      setCopyStatus(prev => ({ ...prev, [type]: 'success' }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 2000);
    } catch (err) {
      setCopyStatus(prev => ({ ...prev, [type]: 'error' }));
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [type]: 'idle' }));
      }, 2000);
    }
  };

  if (!isOpen || !action) return null;

  return (
    <div className={style({ padding: 24, display: 'flex', flexDirection: 'column', height: 'full' })}>
      <div className={style({ padding: 24 })}>
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 24 })}>
          {/* Description */}
          {action.description && (
            <div>
              <p className={style({ font: 'body', color: 'gray-700', margin: 0 })}>
                {action.description}
              </p>
            </div>
          )}

          {/* Input Parameters */}
          {action.inputSchema?.properties && Object.keys(action.inputSchema.properties).length > 0 ? (
            <div>
              <h3 className={style({ font: 'heading', margin: 0, marginBottom: 16 })}>Input Parameters</h3>
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                {Object.entries(action.inputSchema.properties).map(([key, schema]: [string, any]) => {
                  const isLongText = schema.type === 'string' && (!schema.maxLength || schema.maxLength > 100);
                  // Convert empty string to undefined so component doesn't render empty description
                  const description = schema.description && schema.description.trim() ? schema.description : undefined;
                  // Extract validators
                  const minLength = schema.minLength;
                  const maxLength = schema.maxLength;
                  const hasError = !!validationErrors[key];
                  
                  return isLongText ? (
                    <TextArea
                      key={key}
                      label={key}
                      description={description}
                      isRequired={action.inputSchema?.required?.includes(key)}
                      minLength={minLength}
                      maxLength={maxLength}
                      value={inputValues[key] || ''}
                      onChange={(value) => handleInputChange(key, value)}
                      isInvalid={hasError}
                      errorMessage={validationErrors[key]}
                      UNSAFE_style={{ width: '100%', minHeight: '100px' }}
                    />
                  ) : (
                    <TextField
                      key={key}
                      label={key}
                      description={description}
                      isRequired={action.inputSchema?.required?.includes(key)}
                      minLength={minLength}
                      maxLength={maxLength}
                      value={inputValues[key] || ''}
                      onChange={(value) => handleInputChange(key, value)}
                      isInvalid={hasError}
                      errorMessage={validationErrors[key]}
                      UNSAFE_style={{ width: '100%' }}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={style({ backgroundColor: 'gray-75', borderRadius: 'lg', padding: 16 })}>
              <p className={style({ font: 'body', color: 'gray-700', margin: 0 })}>
                No parameters required for this action
              </p>
            </div>
          )}

          {/* Execute Button */}
          <Button
            variant="accent"
            onPress={handleExecute}
            isDisabled={isExecuting || !isFormValid()}
          >
            {isExecuting ? (
              <>
                <ProgressCircle isIndeterminate size="S" />
                <Text>Executing...</Text>
              </>
            ) : (
              <>
                <Send />
                <Text>Execute</Text>
              </>
            )}
          </Button>

          {/* Loading Spinner */}
          {isExecuting && !executionResponse && (
            <div className={style({ marginTop: 24 })}>
              <h3 className={style({ font: 'heading', margin: 0, marginBottom: 16 })}>Response</h3>
              <div className={style({ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: 48,
                backgroundColor: 'gray-75',
                borderRadius: 'lg',
                gap: 16
              })}>
                <ProgressCircle isIndeterminate size="L" aria-label="Loading response" />
                <span className={style({ font: 'body', color: 'gray-700' })}>
                  Executing action...
                </span>
              </div>
            </div>
          )}

          {/* Execution Response */}
          {executionResponse && (
            <div className={style({ marginTop: 24 })}>
              <h3 className={style({ font: 'heading', margin: 0, marginBottom: 16 })}>Response</h3>
              
              {widget ? (
                <Tabs
                  selectedKey={selectedTab}
                  onSelectionChange={(key) => setSelectedTab(key as string)}
                  aria-label="Response tabs"
                >
                  <TabList>
                    <Tab id="widget">Widget Preview</Tab>
                    <Tab id="response">Raw Response</Tab>
                  </TabList>

                  {/* Widget Preview Tab */}
                  <TabPanel id="widget">
                    <div>
                      {serverId && widget.uri && (
                        <AEMWidgetRenderer
                          componentUrl={widget.uri}
                          toolName={action?.name || ''}
                          toolId={action?.name || ''}
                          toolInput={inputValues}
                          toolOutput={(executionResponse as any).structuredContent || executionResponse}
                          toolResponseMetadata={executionResponse._meta}
                          serverId={serverId}
                        />
                      )}
                    </div>
                  </TabPanel>

                  {/* Raw Response Tab */}
                  <TabPanel id="response">
                    <div>
                      {/* Annotations */}
                      {executionResponse._annotations && (
                        <div className={style({ marginBottom: 16 })}>
                          <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                            <h4 className={style({ font: 'body', fontWeight: 'bold', margin: 0 })}>Annotations</h4>
                            <Button
                              variant="secondary"
                              size="S"
                              onPress={() => handleCopy(executionResponse._annotations, 'annotations')}
                              aria-label="Copy annotations"
                            >
                              {copyStatus.annotations === 'success' ? <Checkmark /> : copyStatus.annotations === 'error' ? <Close /> : <Copy />}
                            </Button>
                          </div>
                          <div className={style({ backgroundColor: 'gray-800', borderRadius: 'lg', padding: 16, overflow: 'auto' })}>
                            <pre
                              className={style({ font: 'code-sm', color: 'gray-50', margin: 0 })}
                              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            >
                              {JSON.stringify(executionResponse._annotations, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      {executionResponse._meta && (
                        <div className={style({ marginBottom: 16 })}>
                          <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                            <h4 className={style({ font: 'body', fontWeight: 'bold', margin: 0 })}>Metadata</h4>
                            <Button
                              variant="secondary"
                              size="S"
                              onPress={() => handleCopy(executionResponse._meta, 'metadata')}
                              aria-label="Copy metadata"
                            >
                              {copyStatus.metadata === 'success' ? <Checkmark /> : copyStatus.metadata === 'error' ? <Close /> : <Copy />}
                            </Button>
                          </div>
                          <div className={style({ backgroundColor: 'gray-800', borderRadius: 'lg', padding: 16, overflow: 'auto' })}>
                            <pre
                              className={style({ font: 'code-sm', color: 'gray-50', margin: 0 })}
                              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            >
                              {JSON.stringify(executionResponse._meta, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Main Response */}
                      <div>
                        <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                          <h4 className={style({ font: 'body', fontWeight: 'bold', margin: 0 })}>Content</h4>
                          <Button
                            variant="secondary"
                            size="S"
                            onPress={() => handleCopy(executionResponse, 'response')}
                            aria-label="Copy response"
                          >
                            {copyStatus.response === 'success' ? <Checkmark /> : copyStatus.response === 'error' ? <Close /> : <Copy />}
                          </Button>
                        </div>
                        <div className={style({ backgroundColor: 'gray-800', borderRadius: 'lg', padding: 16, overflow: 'auto' })}>
                          <pre
                            className={style({ font: 'code-sm', color: 'gray-50', margin: 0 })}
                            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                          >
                            {JSON.stringify(executionResponse, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </TabPanel>
                </Tabs>
              ) : (
                /* No widget - show response only */
                <div>
                  {/* Annotations */}
                  {executionResponse._annotations && (
                    <div className={style({ marginBottom: 16 })}>
                      <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                        <h4 className={style({ font: 'body', fontWeight: 'bold', margin: 0 })}>Annotations</h4>
                        <Button
                          variant="secondary"
                          size="S"
                          onPress={() => handleCopy(executionResponse._annotations, 'annotations')}
                          aria-label="Copy annotations"
                        >
                          {copyStatus.annotations === 'success' ? <Checkmark /> : copyStatus.annotations === 'error' ? <Close /> : <Copy />}
                        </Button>
                      </div>
                      <div className={style({ backgroundColor: 'gray-800', borderRadius: 'lg', padding: 16, overflow: 'auto' })}>
                        <pre
                          className={style({ font: 'code-sm', color: 'gray-50', margin: 0 })}
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {JSON.stringify(executionResponse._annotations, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {executionResponse._meta && (
                    <div className={style({ marginBottom: 16 })}>
                      <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                        <h4 className={style({ font: 'body', fontWeight: 'bold', margin: 0 })}>Metadata</h4>
                        <Button
                          variant="secondary"
                          size="S"
                          onPress={() => handleCopy(executionResponse._meta, 'metadata')}
                          aria-label="Copy metadata"
                        >
                          {copyStatus.metadata === 'success' ? <Checkmark /> : copyStatus.metadata === 'error' ? <Close /> : <Copy />}
                        </Button>
                      </div>
                      <div className={style({ backgroundColor: 'gray-800', borderRadius: 'lg', padding: 16, overflow: 'auto' })}>
                        <pre
                          className={style({ font: 'code-sm', color: 'gray-50', margin: 0 })}
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {JSON.stringify(executionResponse._meta, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Main Response */}
                  <div>
                    <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 })}>
                      <h4 className={style({ font: 'body', fontWeight: 'bold', margin: 0 })}>Content</h4>
                      <Button
                        variant="secondary"
                        size="S"
                        onPress={() => handleCopy(executionResponse, 'response')}
                        aria-label="Copy response"
                      >
                        {copyStatus.response === 'success' ? <Checkmark /> : copyStatus.response === 'error' ? <Close /> : <Copy />}
                      </Button>
                    </div>
                    <div className={style({ backgroundColor: 'gray-800', borderRadius: 'lg', padding: 16, overflow: 'auto' })}>
                      <pre
                        className={style({ font: 'code-sm', color: 'gray-50', margin: 0 })}
                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {JSON.stringify(executionResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

