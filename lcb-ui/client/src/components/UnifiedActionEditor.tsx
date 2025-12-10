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

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  TextField,
  TextArea,
  ActionButton,
  Picker,
  PickerItem,
  CheckboxGroup,
  Checkbox,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Divider
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Add from '@react-spectrum/s2/icons/Add';
import Delete from '@react-spectrum/s2/icons/Delete';
import Lock from '@react-spectrum/s2/icons/Lock';
import type { MCPTool, MCPResource } from '../../../shared/types';
import { ACTION_META } from '../constants/actionMeta';
import { EDS_WIDGET_META } from '../constants/edsWidgetMeta';
import { DomainListEditor } from './DomainListEditor';

interface SchemaProperty {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  isNew?: boolean;
  isModified?: boolean;
  originalName?: string;
  minLength?: number;
  maxLength?: number;
}

interface UnifiedActionEditorProps {
  isOpen: boolean;
  action: MCPTool | null;
  widget: MCPResource | null;
  onClose: () => void;
  onSave: (actionUpdates: Partial<MCPTool>, widgetUpdates?: Partial<MCPResource>) => Promise<void>;
  serverId?: string;
}

export interface UnifiedActionEditorRef {
  handleSave: () => Promise<void>;
  isSaving: boolean;
}

const UnifiedActionEditor = forwardRef<UnifiedActionEditorRef, UnifiedActionEditorProps>(({
  isOpen,
  action,
  widget,
  onClose,
  onSave
}, ref) => {
  const [selectedTab, setSelectedTab] = useState<string>('action');
  const [saving, setSaving] = useState(false);

  // Action fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [properties, setProperties] = useState<SchemaProperty[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<string[]>([]);

  // Action OpenAI metadata
  const [widgetAccessible, setWidgetAccessible] = useState(true);
  const [invokingText, setInvokingText] = useState('');
  const [invokedText, setInvokedText] = useState('');

  // Widget fields
  const [widgetName, setWidgetName] = useState('');
  const [widgetDescription, setWidgetDescription] = useState('');
  const [widgetMCPDescription, setWidgetMCPDescription] = useState('');
  const [widgetPrefersBorder, setWidgetPrefersBorder] = useState(false);
  const [widgetCSPConnectDomains, setWidgetCSPConnectDomains] = useState<string[]>([]);
  const [widgetCSPResourceDomains, setWidgetCSPResourceDomains] = useState<string[]>([]);
  const [widgetDomain, setWidgetDomain] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [widgetEmbedUrl, setWidgetEmbedUrl] = useState('');

  const hasWidget = !!widget || !!action?._meta?.[ACTION_META.OUTPUT_TEMPLATE];

  useEffect(() => {
    if (action) {
      // Initialize action fields
      setName(action.name);
      setDescription(action.description || '');

      // Parse input schema
      const props: SchemaProperty[] = [];
      if (action.inputSchema?.properties) {
        Object.entries(action.inputSchema.properties).forEach(([key, schema]: [string, any]) => {
          props.push({
            name: key,
            type: schema.type || 'string',
            description: schema.description || '',
            required: action.inputSchema?.required?.includes(key) || false,
            isNew: false,
            isModified: false,
            originalName: key,
            minLength: schema.minLength,
            maxLength: schema.maxLength
          });
        });
      }
      setProperties(props);
      setRequiredFields(action.inputSchema?.required || []);

      // Initialize annotations
      const selectedAnnotations: string[] = [];
      if (action.annotations?.destructiveHint) selectedAnnotations.push('destructiveHint');
      if (action.annotations?.openWorldHint) selectedAnnotations.push('openWorldHint');
      if (action.annotations?.readOnlyHint) selectedAnnotations.push('readOnlyHint');
      setAnnotations(selectedAnnotations);

      // Initialize action OpenAI metadata
      setWidgetAccessible(action._meta?.[ACTION_META.WIDGET_ACCESSIBLE] !== false);
      setInvokingText(action._meta?.[ACTION_META.TOOL_INVOCATION_INVOKING] || '');
      setInvokedText(action._meta?.[ACTION_META.TOOL_INVOCATION_INVOKED] || '');
    }

    if (widget) {
      console.log('[UnifiedActionEditor] Initializing widget:', widget);
      console.log('[UnifiedActionEditor] Widget _meta:', widget._meta);
      console.log('[UnifiedActionEditor] LCB_WIDGET_META key:', EDS_WIDGET_META.LCB_WIDGET_META);
      console.log('[UnifiedActionEditor] Script URL from widget:', widget._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.SCRIPT_URL]);
      
      // Initialize widget fields
      setWidgetName(widget.name || '');
      setWidgetMCPDescription(widget.description || '');
      setWidgetDescription(widget._meta?.[EDS_WIDGET_META.WIDGET_DESCRIPTION] || '');
      setWidgetPrefersBorder(widget._meta?.[EDS_WIDGET_META.WIDGET_PREFERS_BORDER] || false);
      setWidgetCSPConnectDomains(widget._meta?.[EDS_WIDGET_META.WIDGET_CSP]?.[EDS_WIDGET_META.CSP_CONNECT_DOMAINS] || []);
      setWidgetCSPResourceDomains(widget._meta?.[EDS_WIDGET_META.WIDGET_CSP]?.[EDS_WIDGET_META.CSP_RESOURCE_DOMAINS] || []);
      setWidgetDomain(widget._meta?.[EDS_WIDGET_META.WIDGET_DOMAIN] || '');
      setScriptUrl(widget._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.SCRIPT_URL] || '');
      setWidgetEmbedUrl(widget._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.WIDGET_EMBED_URL] || '');
    }

    setSelectedTab('action');
  }, [action, widget]);

  // Expose save handler to parent via ref
  useImperativeHandle(ref, () => ({
    handleSave,
    isSaving: saving
  }));

  const handleAddProperty = () => {
    setProperties([
      ...properties,
      {
        name: 'newField',
        type: 'string',
        description: '',
        required: false,
        isNew: true,
        isModified: false
      }
    ]);
  };

  const handleRemoveProperty = (index: number) => {
    const newProperties = [...properties];
    const removedProp = newProperties.splice(index, 1)[0];
    setProperties(newProperties);

    if (requiredFields.includes(removedProp.name)) {
      setRequiredFields(requiredFields.filter(f => f !== removedProp.name));
    }
  };

  const handlePropertyChange = (index: number, field: keyof SchemaProperty, value: any) => {
    const newProperties = [...properties];
    const oldName = newProperties[index].name;

    if (field === 'name' && oldName !== value) {
      if (requiredFields.includes(oldName)) {
        setRequiredFields(requiredFields.map(f => (f === oldName ? value : f)));
      }
    }

    if (field === 'required') {
      if (value) {
        setRequiredFields([...requiredFields, newProperties[index].name]);
      } else {
        setRequiredFields(requiredFields.filter(f => f !== newProperties[index].name));
      }
    }

    newProperties[index] = {
      ...newProperties[index],
      [field]: value
    };
    setProperties(newProperties);
  };

  const handleSave = async () => {
    if (!action) return;

    try {
      setSaving(true);

      // Build input schema
      const inputSchema: any = {
        type: 'object',
        properties: {},
        required: requiredFields.filter(f => properties.some(p => p.name === f))
      };

      properties.forEach(prop => {
        const propSchema: any = {
          type: prop.type,
          description: prop.description
        };

        if (prop.type === 'string') {
          if (prop.minLength !== undefined && prop.minLength > 0) {
            propSchema.minLength = prop.minLength;
          }
          if (prop.maxLength !== undefined && prop.maxLength > 0) {
            propSchema.maxLength = prop.maxLength;
          }
        }

        inputSchema.properties[prop.name] = propSchema;
      });

      const actionUpdates: Partial<MCPTool> = {
        name,
        description,
        inputSchema: properties.length > 0 ? inputSchema : undefined,
        annotations: {
          destructiveHint: annotations.includes('destructiveHint'),
          openWorldHint: annotations.includes('openWorldHint'),
          readOnlyHint: annotations.includes('readOnlyHint')
        },
        _meta: hasWidget ? {
          [ACTION_META.OUTPUT_TEMPLATE]: action._meta?.[ACTION_META.OUTPUT_TEMPLATE],
          [ACTION_META.WIDGET_ACCESSIBLE]: widgetAccessible,
          [ACTION_META.TOOL_INVOCATION_INVOKING]: invokingText,
          [ACTION_META.TOOL_INVOCATION_INVOKED]: invokedText
        } : undefined,
        draft: true
      };

      let widgetUpdates: Partial<MCPResource> | undefined;
      if (hasWidget && widget) {
        widgetUpdates = {
          name: widgetName,
          description: widgetMCPDescription,
          actionName: action.name,
          _meta: {
            [EDS_WIDGET_META.WIDGET_DESCRIPTION]: widgetDescription,
            [EDS_WIDGET_META.WIDGET_PREFERS_BORDER]: widgetPrefersBorder,
            [EDS_WIDGET_META.WIDGET_CSP]: (widgetCSPConnectDomains.length > 0 || widgetCSPResourceDomains.length > 0) ? {
              [EDS_WIDGET_META.CSP_CONNECT_DOMAINS]: widgetCSPConnectDomains,
              [EDS_WIDGET_META.CSP_RESOURCE_DOMAINS]: widgetCSPResourceDomains
            } : undefined,
            [EDS_WIDGET_META.WIDGET_DOMAIN]: widgetDomain,
            [EDS_WIDGET_META.LCB_WIDGET_META]: (scriptUrl || widgetEmbedUrl) ? {
              [EDS_WIDGET_META.SCRIPT_URL]: scriptUrl,
              [EDS_WIDGET_META.WIDGET_EMBED_URL]: widgetEmbedUrl
            } : undefined
          }
        };
      }

      await onSave(actionUpdates, widgetUpdates);
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !action) return null;

  return (
    <div className={style({ padding: 24, display: 'flex', flexDirection: 'column', height: 'full' })}>
      <Tabs
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as string)}
          aria-label="Action and widget configuration tabs"
        >
          <TabList>
            <Tab id="action">Action</Tab>
            {hasWidget && <Tab id="widget">Widget</Tab>}
          </TabList>

          {/* Action Tab */}
          <TabPanel id="action">
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 })}>
              {/* Basic Info */}
              <div>
                <h3 className={style({ font: 'heading', margin: 0, marginBottom: 16 })}>Basic Information</h3>
                <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                  <TextField
                    label="Action Name"
                    value={name}
                    isDisabled
                    UNSAFE_style={{ width: '100%' }}
                  />
                  <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 })}>
                    <Lock />
                    <span className={style({ font: 'ui-sm', color: 'gray-700' })}>
                      Cannot be changed (prevents folder rename)
                    </span>
                  </div>
                  <TextArea
                    label="Description"
                    value={description}
                    onChange={setDescription}
                    isRequired
                    UNSAFE_style={{ width: '100%', minHeight: '100px' }}
                  />
                  <CheckboxGroup
                    label="Annotations"
                    value={annotations}
                    onChange={setAnnotations}
                  >
                    <Checkbox value="destructiveHint">destructiveHint</Checkbox>
                    <Checkbox value="openWorldHint">openWorldHint</Checkbox>
                    <Checkbox value="readOnlyHint">readOnlyHint</Checkbox>
                  </CheckboxGroup>
                </div>
              </div>

              <Divider />

              {/* Input Parameters */}
              <div>
                <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 })}>
                  <h3 className={style({ font: 'heading', margin: 0 })}>Input Parameters</h3>
                  <ActionButton onPress={handleAddProperty}>
                    <Add />
                  </ActionButton>
                </div>

                {properties.length === 0 ? (
                  <div className={style({ backgroundColor: 'gray-75', borderRadius: 'lg', padding: 16 })}>
                    <span className={style({ font: 'body', color: 'gray-700' })}>
                      No parameters configured
                    </span>
                  </div>
                ) : (
                  <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                    {properties.map((prop, index) => (
                      <div
                        key={index}
                        className={style({
                          borderWidth: 1,
                          borderStyle: 'solid',
                          borderColor: 'gray-200',
                          borderRadius: 'lg',
                          padding: 16,
                          backgroundColor: 'gray-50'
                        })}
                      >
                        <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 })}>
                          <span className={style({ font: 'body', fontWeight: 'bold' })}>Parameter</span>
                          <ActionButton
                            isQuiet
                            onPress={() => handleRemoveProperty(index)}
                            aria-label="Remove field"
                          >
                            <Delete />
                          </ActionButton>
                        </div>
                        <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
                          <div className={style({ display: 'flex', flexDirection: 'row', gap: 12 })}>
                            <TextField
                              label="Name"
                              value={prop.name}
                              onChange={value => handlePropertyChange(index, 'name', value)}
                              UNSAFE_style={{ flex: 1 }}
                            />
                            <Picker
                              label="Type"
                              selectedKey={prop.type}
                              onSelectionChange={value => handlePropertyChange(index, 'type', value)}
                              UNSAFE_style={{ flex: 1 }}
                            >
                              <PickerItem id="string">String</PickerItem>
                              <PickerItem id="number">Number</PickerItem>
                              <PickerItem id="boolean">Boolean</PickerItem>
                            </Picker>
                          </div>
                          {prop.type === 'string' && (
                            <div className={style({ display: 'flex', flexDirection: 'row', gap: 12 })}>
                              <TextField
                                label="Min Length"
                                type="number"
                                value={prop.minLength?.toString() || ''}
                                onChange={value => handlePropertyChange(index, 'minLength', value ? parseInt(value) : undefined)}
                                UNSAFE_style={{ flex: 1 }}
                              />
                              <TextField
                                label="Max Length"
                                type="number"
                                value={prop.maxLength?.toString() || ''}
                                onChange={value => handlePropertyChange(index, 'maxLength', value ? parseInt(value) : undefined)}
                                UNSAFE_style={{ flex: 1 }}
                              />
                            </div>
                          )}
                          <TextArea
                            label="Description"
                            value={prop.description}
                            onChange={value => handlePropertyChange(index, 'description', value)}
                            UNSAFE_style={{ width: '100%' }}
                          />
                          <Checkbox
                            isSelected={requiredFields.includes(prop.name)}
                            onChange={checked => handlePropertyChange(index, 'required', checked)}
                          >
                            Required
                          </Checkbox>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* OpenAI Metadata for Actions with Widgets */}
              {hasWidget && (
                <>
                  <Divider />
                  <div>
                    <h3 className={style({ font: 'heading', margin: 0, marginBottom: 16 })}>OpenAI Metadata</h3>
                    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                      <TextField
                        label="Invoking Status Text"
                        value={invokingText}
                        onChange={setInvokingText}
                        description="Max 64 characters"
                        UNSAFE_style={{ width: '100%' }}
                      />
                      <TextField
                        label="Invoked Status Text"
                        value={invokedText}
                        onChange={setInvokedText}
                        description="Max 64 characters"
                        UNSAFE_style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabPanel>

          {/* Widget Tab */}
          {hasWidget && (
            <TabPanel id="widget">
              <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 })}>
                <div>
                  <h3 className={style({ font: 'heading', margin: 0, marginBottom: 16 })}>Widget Information</h3>
                  <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                    <TextField
                      label="Widget Name"
                      value={widgetName}
                      isDisabled
                      UNSAFE_style={{ width: '100%' }}
                    />
                    <TextArea
                      label="MCP Description"
                      value={widgetMCPDescription}
                      onChange={setWidgetMCPDescription}
                      description="Standard MCP resource description"
                      UNSAFE_style={{ width: '100%', minHeight: '80px' }}
                    />
                    <TextArea
                      label="Widget Description"
                      value={widgetDescription}
                      onChange={setWidgetDescription}
                      description="ChatGPT-specific widget description"
                      UNSAFE_style={{ width: '100%', minHeight: '80px' }}
                    />
                    <Checkbox
                      isSelected={widgetPrefersBorder}
                      onChange={setWidgetPrefersBorder}
                    >
                      Prefers Border
                    </Checkbox>
                  </div>
                </div>

                <Divider />

                <div>
                  <h3 className={style({ font: 'heading', margin: 0, marginBottom: 16 })}>Template URLs</h3>
                  <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
                    <TextField
                      label="Script URL"
                      value={scriptUrl}
                      onChange={setScriptUrl}
                      placeholder="https://..."
                      UNSAFE_style={{ width: '100%' }}
                    />
                    <TextField
                      label="Widget Embed URL"
                      value={widgetEmbedUrl}
                      onChange={setWidgetEmbedUrl}
                      placeholder="https://..."
                      UNSAFE_style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <Divider />

                <div>
                  <h3 className={style({ font: 'heading', margin: 0, marginBottom: 16 })}>CSP Configuration</h3>
                  <DomainListEditor
                    label="Connect Domains"
                    domains={widgetCSPConnectDomains}
                    onChange={setWidgetCSPConnectDomains}
                  />
                  <div className={style({ marginTop: 16 })}>
                    <DomainListEditor
                      label="Resource Domains"
                      domains={widgetCSPResourceDomains}
                      onChange={setWidgetCSPResourceDomains}
                    />
                  </div>
                  <TextField
                    label="Widget Domain"
                    value={widgetDomain}
                    onChange={setWidgetDomain}
                    placeholder="https://web-sandbox.oaiusercontent.com"
                    UNSAFE_style={{ width: '100%', marginTop: '16px' }}
                  />
                </div>
              </div>
            </TabPanel>
          )}
        </Tabs>
    </div>
  );
});

UnifiedActionEditor.displayName = 'UnifiedActionEditor';

export default UnifiedActionEditor;

