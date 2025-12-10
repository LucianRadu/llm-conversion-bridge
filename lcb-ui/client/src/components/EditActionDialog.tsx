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
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContainer,
  Content,
  TextField,
  TextArea,
  Button,
  ActionButton,
  Picker,
  PickerItem,
  CheckboxGroup,
  Checkbox,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Heading,
  ButtonGroup,
  Divider
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Add from '@react-spectrum/s2/icons/Add';
import Delete from '@react-spectrum/s2/icons/Delete';
import Lock from '@react-spectrum/s2/icons/Lock';
import type { MCPTool } from '../../../shared/types';
import { changelogService } from '../services/changelog';
import { toastService } from '../services/toast';
import { ACTION_META } from '../constants/actionMeta';

interface EditActionDialogProps {
  isOpen: boolean;
  action: MCPTool | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<MCPTool>) => Promise<void>;
  serverId: string; // Required for fetching widget resources
}

interface SchemaProperty {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  isNew?: boolean;
  isModified?: boolean;
  originalName?: string;
  // String validators
  minLength?: number;
  maxLength?: number;
}

export default function EditActionDialog({
  isOpen,
  action,
  onClose,
  onSave,
  serverId
}: EditActionDialogProps) {
  // Tab state
  const [selectedTab, setSelectedTab] = useState<string>('tab1');
  const [isWidgetAction, setIsWidgetAction] = useState(false);

  // Basic action fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [properties, setProperties] = useState<SchemaProperty[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [annotations, setAnnotations] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Widget-specific state (Tab 2: Action OpenAI Metadata)
  const [outputTemplate, setOutputTemplate] = useState(''); // READ-ONLY
  const [widgetAccessible, setWidgetAccessible] = useState(true);
  const [invokingText, setInvokingText] = useState('');
  const [invokedText, setInvokedText] = useState('');

  // Track original state for changelog
  const originalState = useRef<{
    name: string;
    description: string;
    properties: SchemaProperty[];
    annotations: string[];
    // Widget metadata
    invokingText?: string;
    invokedText?: string;
    widgetAccessible?: boolean;
  } | null>(null);

  useEffect(() => {
    if (action) {
      const actionName = action.name;
      const actionDescription = action.description || '';

      setName(actionName);
      setDescription(actionDescription);
      // Check if widget action: either hasEdsWidget flag OR has openai/outputTemplate in _meta
      const isWidget = action.hasEdsWidget === true || !!action._meta?.[ACTION_META.OUTPUT_TEMPLATE];
      setIsWidgetAction(isWidget);

      // Parse inputSchema properties
      let props: SchemaProperty[] = [];
      if (action.inputSchema?.properties) {
        props = Object.entries(action.inputSchema.properties).map(
          ([key, schema]: [string, any]) => ({
            name: key,
            type: schema.type || 'string',
            description: schema.description || '',
            required: action.inputSchema?.required?.includes(key) || false,
            isNew: false,
            isModified: false,
            originalName: key,
            // String validators
            minLength: schema.minLength,
            maxLength: schema.maxLength
          })
        );
        setProperties(props);
        setRequiredFields(action.inputSchema?.required || []);
      } else {
        setProperties([]);
        setRequiredFields([]);
      }

      // Initialize annotations from action
      const selectedAnnotations: string[] = [];
      if (action.annotations?.destructiveHint) selectedAnnotations.push('destructiveHint');
      if (action.annotations?.openWorldHint) selectedAnnotations.push('openWorldHint');
      if (action.annotations?.readOnlyHint) selectedAnnotations.push('readOnlyHint');
      setAnnotations(selectedAnnotations);

      if (isWidget) {
        // Widget action: Populate Tab 2 fields from action._meta (always available)
        const outputTemplateUri = action._meta?.[ACTION_META.OUTPUT_TEMPLATE] || '';
        setOutputTemplate(outputTemplateUri);
        setWidgetAccessible(action._meta?.[ACTION_META.WIDGET_ACCESSIBLE] !== false);
        setInvokingText(action._meta?.[ACTION_META.TOOL_INVOCATION_INVOKING] || 'Short status text while the tool runs');
        setInvokedText(action._meta?.[ACTION_META.TOOL_INVOCATION_INVOKED] || 'Short status text after the tool completes');
      }

      // Capture original state for changelog
      originalState.current = {
        name: actionName,
        description: actionDescription,
        properties: JSON.parse(JSON.stringify(props)), // Deep copy
        annotations: [...selectedAnnotations],
        // Widget metadata
        invokingText: action._meta?.[ACTION_META.TOOL_INVOCATION_INVOKING] || 'Short status text while the tool runs',
        invokedText: action._meta?.[ACTION_META.TOOL_INVOCATION_INVOKED] || 'Short status text after the tool completes',
        widgetAccessible: action._meta?.[ACTION_META.WIDGET_ACCESSIBLE] !== false
      };

      setError(null);
      setSelectedTab('tab1'); // Reset to first tab
    }
  }, [action, serverId]);

  const validateCurrentTab = (tab: string = selectedTab): boolean => {
    switch (tab) {
      case 'tab1':
        // Validate Details & Input Schema
        if (!name.trim()) {
          toastService.error('Action name is required');
          return false;
        }
        if (!description.trim()) {
          toastService.error('Description is required');
          return false;
        }
        // Check for duplicate parameter names
        const paramNames = properties.map(p => p.name.trim()).filter(n => n);
        const uniqueNames = new Set(paramNames);
        if (paramNames.length !== uniqueNames.size) {
          toastService.error('Duplicate parameter names found');
          return false;
        }
        return true;

      case 'tab2':
        // Validate OpenAI Metadata (widget actions only) - both fields are optional
        if (invokingText && invokingText.length > 64) {
          toastService.error('Invoking text must be 64 characters or less');
          return false;
        }
        if (invokedText && invokedText.length > 64) {
          toastService.error('Invoked text must be 64 characters or less');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleTabChange = (newTab: string | number) => {
    // Validate current tab before switching
    if (!validateCurrentTab()) {
      return; // Block tab change
    }
    
    setSelectedTab(newTab as string);
  };

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

    // Remove from required fields if it was required
    if (requiredFields.includes(removedProp.name)) {
      setRequiredFields(requiredFields.filter(f => f !== removedProp.name));
    }
  };

  const handlePropertyChange = (index: number, field: keyof SchemaProperty, value: any) => {
    const newProperties = [...properties];
    const oldName = newProperties[index].name;
    const prop = newProperties[index];

    // Check for duplicate parameter names
    if (field === 'name' && value.trim()) {
      const trimmedValue = value.trim();
      const isDuplicate = newProperties.some((prop, idx) => 
        idx !== index && prop.name.trim() === trimmedValue
      );
      
      if (isDuplicate) {
        // Don't update - show error toast
        toastService.error(`Parameter name "${trimmedValue}" already exists. Each parameter must have a unique name.`);
        return;
      }
    }

    if (field === 'name' && oldName !== value) {
      // Update required fields array if name changes
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

    // Mark as modified if not already new and value changed
    const isModified = !prop.isNew && (
      (field === 'name' && value !== prop.originalName) ||
      (field === 'type' && value !== prop.type) ||
      (field === 'description' && value !== prop.description) ||
      (field === 'required' && value !== prop.required)
    );

    newProperties[index] = {
      ...newProperties[index],
      [field]: value,
      isModified: prop.isModified || isModified
    };
    setProperties(newProperties);
  };

  const handleSave = async () => {
    if (!action || !originalState.current) return;

    try {
      setSaving(true);
      setError(null);

      // Validate ALL tabs before saving
      const tabsToValidate = isWidgetAction ? ['tab1', 'tab2'] : ['tab1'];

      for (const tab of tabsToValidate) {
        const isValid = validateCurrentTab(tab);

        if (!isValid) {
          toastService.error('Please fix validation errors in all tabs');
          setSaving(false);
          return;
        }
      }

      // Build input schema from properties
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

        // Add string validators if present
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

      const updates: Partial<MCPTool> = {
        name,
        description,
        inputSchema: properties.length > 0 ? inputSchema : undefined,
        annotations: {
          destructiveHint: annotations.includes('destructiveHint'),
          openWorldHint: annotations.includes('openWorldHint'),
          readOnlyHint: annotations.includes('readOnlyHint')
        },
        draft: true // Mark as UPDATED
      };

      // For widget actions: Add _meta fields
      if (isWidgetAction) {
        updates._meta = {
          [ACTION_META.OUTPUT_TEMPLATE]: outputTemplate,
          [ACTION_META.WIDGET_ACCESSIBLE]: widgetAccessible,
          [ACTION_META.TOOL_INVOCATION_INVOKING]: invokingText,
          [ACTION_META.TOOL_INVOCATION_INVOKED]: invokedText
        };
      }

      // Detect and log changes to changelog
      const original = originalState.current;

      // Check if description changed
      if (description !== original.description) {
        await changelogService.addEntry(
          'action_description_changed',
          name,
          `Updated description for action "${name}"`,
          {
            oldValue: original.description,
            newValue: description
          }
        );
      }

      // Check if annotations changed
      const originalAnnotationsSet = new Set(original.annotations);
      const currentAnnotationsSet = new Set(annotations);
      const annotationsChanged = 
        originalAnnotationsSet.size !== currentAnnotationsSet.size ||
        ![...originalAnnotationsSet].every(a => currentAnnotationsSet.has(a));
      
      if (annotationsChanged) {
        await changelogService.addEntry(
          'action_modified',
          name,
          `Updated annotations for action "${name}"`,
          {
            oldValue: {
              destructiveHint: originalAnnotationsSet.has('destructiveHint'),
              openWorldHint: originalAnnotationsSet.has('openWorldHint'),
              readOnlyHint: originalAnnotationsSet.has('readOnlyHint')
            },
            newValue: {
              destructiveHint: currentAnnotationsSet.has('destructiveHint'),
              openWorldHint: currentAnnotationsSet.has('openWorldHint'),
              readOnlyHint: currentAnnotationsSet.has('readOnlyHint')
            }
          }
        );
      }

      // Check for field changes
      const originalFieldMap = new Map(original.properties.map(p => [p.originalName || p.name, p]));
      const currentFieldMap = new Map(properties.map(p => [p.name, p]));

      // Check for deleted fields
      for (const [fieldName, originalField] of originalFieldMap) {
        if (!currentFieldMap.has(fieldName)) {
          await changelogService.addEntry(
            'field_deleted',
            name,
            `Deleted field "${fieldName}" from action "${name}"`,
            {
              fieldName,
              oldValue: originalField
            }
          );
        }
      }

      // Check for added or modified fields
      for (const [fieldName, currentField] of currentFieldMap) {
        const originalField = originalFieldMap.get(currentField.originalName || fieldName);

        if (!originalField) {
          // New field added
          await changelogService.addEntry(
            'field_added',
            name,
            `Added new field "${fieldName}" to action "${name}"`,
            {
              fieldName,
              newValue: currentField
            }
          );
        } else {
          // Check if field was modified
          if (currentField.type !== originalField.type) {
            await changelogService.addEntry(
              'field_type_changed',
              name,
              `Changed type of field "${fieldName}" from "${originalField.type}" to "${currentField.type}"`,
              {
                fieldName,
                oldValue: originalField.type,
                newValue: currentField.type
              }
            );
          }

          if (currentField.description !== originalField.description) {
            await changelogService.addEntry(
              'field_modified',
              name,
              `Updated description for field "${fieldName}"`,
              {
                fieldName,
                oldValue: originalField.description,
                newValue: currentField.description
              }
            );
          }

          if (currentField.required !== originalField.required) {
            await changelogService.addEntry(
              'field_required_changed',
              name,
              `Changed field "${fieldName}" to ${currentField.required ? 'required' : 'optional'}`,
              {
                fieldName,
                oldValue: originalField.required,
                newValue: currentField.required
              }
            );
          }

          // Check if field name changed
          if (currentField.name !== (originalField.originalName || originalField.name)) {
            await changelogService.addEntry(
              'field_modified',
              name,
              `Renamed field from "${originalField.originalName || originalField.name}" to "${currentField.name}"`,
              {
                fieldName: currentField.name,
                oldValue: originalField.originalName || originalField.name,
                newValue: currentField.name
              }
            );
          }
        }
      }

      // For widget actions: Log widget metadata changes
      if (isWidgetAction && original.invokingText !== undefined) {
        if (invokingText !== original.invokingText || invokedText !== original.invokedText) {
          await changelogService.addEntry(
            'action_modified',
            name,
            `Updated OpenAI tool invocation metadata for action "${name}"`,
            {
              oldValue: { invoking: original.invokingText, invoked: original.invokedText },
              newValue: { invoking: invokingText, invoked: invokedText }
            }
          );
        }

      }

      // Save action to DB
      await onSave(action.name, updates);

      toastService.success('Action updated successfully');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save action');
    } finally {
      setSaving(false);
    }
  };

  if (!action) return null;

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog size="XL" isDismissible>
          <Heading slot="title">Edit Action</Heading>
          <Content>
            <Tabs
              selectedKey={selectedTab}
              onSelectionChange={handleTabChange}
              aria-label="Edit action configuration"
            >
              <TabList>
                <Tab id="tab1">Details & Input Schema</Tab>
                {isWidgetAction && <Tab id="tab2">Action OpenAI Metadata</Tab>}
              </TabList>

              <TabPanel id="tab1">
                {/* Tab 1: Details & Input Schema */}
                <div style={{
                  display: 'grid',
                  gridTemplateAreas: '"left divider right"',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 24,
                  height: '500px',
                  overflow: 'hidden'
                }}>
                    {/* Left Column: Action Details */}
                    <div style={{ gridArea: 'left', overflow: 'auto', paddingRight: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                        <TextField
                          label="Action Name"
                          value={name}
                          isDisabled
                          UNSAFE_style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
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
                          UNSAFE_style={{ width: '100%', height: 128 }}
                          maxLength={512}
                          description={`${description.length}/512 characters`}
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

                        {/* Has EDS Widget (READ-ONLY) */}
                        <TextField
                          label="Has EDS Widget"
                          value={isWidgetAction ? 'Yes' : 'No'}
                          isDisabled
                          UNSAFE_style={{ width: '100%' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <Lock />
                          <span className={style({ font: 'ui-sm', color: 'gray-700' })}>
                            Cannot be changed (prevents type mutation)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vertical Divider */}
                    <Divider size="S" orientation="vertical" UNSAFE_style={{ gridArea: 'divider' }} />
                    
                    {/* Right Column: Input Parameters */}
                    <div style={{ gridArea: 'right', overflow: 'auto', paddingRight: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 className={style({ font: 'heading', margin: 0 })}>Input Parameters</h3>
                          <ActionButton onPress={handleAddProperty}>
                            <Add />
                            Add Field
                          </ActionButton>
                        </div>

                        {properties.length === 0 ? (
                          <div style={{
                            backgroundColor: 'var(--spectrum-global-color-gray-75)',
                            borderRadius: 'var(--spectrum-alias-border-radius-medium)',
                            padding: 16,
                            border: '1px dashed var(--spectrum-global-color-gray-400)'
                          }}>
                            <span className={style({ font: 'body', color: 'gray-700' })} style={{ fontStyle: 'italic' }}>
                              No parameters configured. This action will take no input.
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {properties.map((prop, index) => {
                              // Determine border color based on state
                              let borderColor = 'dark';
                              let borderWidth = 'thin';
                              if (prop.isNew) {
                                borderColor = 'blue-600';
                                borderWidth = 'thick';
                              } else if (prop.isModified) {
                                borderColor = 'orange-600';
                                borderWidth = 'thick';
                              }

                              return (
                              <div
                                key={index}
                                style={{
                                  border: borderWidth === 'thick' ? '2px solid' : '1px solid',
                                  borderColor: `var(--spectrum-global-color-${borderColor})`,
                                  borderRadius: 'var(--spectrum-alias-border-radius-medium)',
                                  padding: 16,
                                  backgroundColor: 'var(--spectrum-global-color-gray-50)',
                                  position: 'relative'
                                }}
                              >
                                {/* Field Label */}
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: 8
                                }}>
                                  <span className={style({ font: 'ui-sm' })} style={{ fontWeight: 'bold' }}>
                                    {prop.isNew ? '🆕 New Parameter' : prop.isModified ? '✏️ Modified Parameter' : 'Parameter'}
                                  </span>
                                  <ActionButton
                                    isQuiet
                                    onPress={() => handleRemoveProperty(index)}
                                    aria-label="Remove field"
                                    UNSAFE_className="delete-button"
                                  >
                                    <Delete />
                                  </ActionButton>
                                </div>

                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'start' }}>
                                  <TextField
                                    label="Field Name"
                                    value={prop.name}
                                    onChange={value => handlePropertyChange(index, 'name', value)}
                                    UNSAFE_style={{ width: '35%' }}
                                    isRequired
                                  />
                                  <Picker
                                    label="Type"
                                    selectedKey={prop.type}
                                    onSelectionChange={value => handlePropertyChange(index, 'type', value)}
                                    UNSAFE_style={{ width: '30%' }}
                                  >
                                    <PickerItem id="string">String</PickerItem>
                                    <PickerItem id="number">Number</PickerItem>
                                    <PickerItem id="integer">Integer</PickerItem>
                                    <PickerItem id="boolean">Boolean</PickerItem>
                                    <PickerItem id="array">Array</PickerItem>
                                    <PickerItem id="object">Object</PickerItem>
                                  </Picker>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 24 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={requiredFields.includes(prop.name)}
                                        onChange={e => handlePropertyChange(index, 'required', e.target.checked)}
                                      />
                                      <span className={style({ font: 'body' })}>Required</span>
                                    </label>
                                  </div>
                                </div>
                                <TextArea
                                  label="Description"
                                  value={prop.description}
                                  onChange={value => handlePropertyChange(index, 'description', value)}
                                  UNSAFE_style={{ width: '100%', height: 128 }}
                                  placeholder={
                                    prop.type === 'string' ? 'e.g., "example text"' :
                                    prop.type === 'number' ? 'e.g., 42.5' :
                                    prop.type === 'integer' ? 'e.g., 42' :
                                    prop.type === 'boolean' ? 'e.g., true or false' :
                                    prop.type === 'array' ? 'e.g., ["item1", "item2", "item3"]' :
                                    prop.type === 'object' ? 'e.g., {"key": "value", "nested": {"prop": 123}}' :
                                    'Describe this parameter'
                                  }
                                />

                                {/* String Validators - only show for string type */}
                                {prop.type === 'string' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                    <span className={style({ font: 'ui-sm', color: 'gray-700' })} style={{ fontWeight: 'bold' }}>
                                      Validators
                                    </span>
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
                                      <TextField
                                        label="Minimum"
                                        type="number"
                                        value={prop.minLength?.toString() || '0'}
                                        onChange={value => handlePropertyChange(index, 'minLength', value ? parseInt(value) : 0)}
                                        UNSAFE_style={{ width: '50%', fontSize: '14px' }}
                                      />
                                      <TextField
                                        label="Maximum"
                                        type="number"
                                        value={prop.maxLength?.toString() || '256'}
                                        onChange={value => handlePropertyChange(index, 'maxLength', value ? parseInt(value) : 256)}
                                        UNSAFE_style={{ width: '50%', fontSize: '14px' }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                              </div>
                            );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabPanel>

                {/* Tab 2: OpenAI Metadata (widget actions only) */}
                {isWidgetAction && (
                  <TabPanel id="tab2">
                    <div style={{
                      display: 'grid',
                      gridTemplateAreas: '"left divider right"',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: 24,
                      height: '500px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ gridArea: 'left', overflow: 'auto', paddingRight: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <TextField
                            label="Output Template"
                            value={outputTemplate}
                            isDisabled
                            UNSAFE_style={{ width: '100%' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <Lock />
                            <span className={style({ font: 'ui-sm', color: 'gray-700' })}>
                              Auto-derived from action name
                            </span>
                          </div>

                          <TextField
                            label="Widget Accessible"
                            value="Yes"
                            isDisabled
                            UNSAFE_style={{ width: '100%', opacity: 0.6 }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Lock />
                            <span className={style({ font: 'ui-sm', color: 'gray-700' })}>
                              Always enabled for widget actions
                            </span>
                          </div>
                        </div>
                      </div>

                      <Divider size="S" orientation="vertical" UNSAFE_style={{ gridArea: 'divider' }} />

                      <div style={{ gridArea: 'right', overflow: 'auto', paddingRight: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <TextField
                            label="Invoking Status Text"
                            value={invokingText}
                            onChange={setInvokingText}
                            UNSAFE_style={{ width: '100%' }}
                            description="Optional, max 64 characters"
                          />
                          <TextField
                            label="Invoked Status Text"
                            value={invokedText}
                            onChange={setInvokedText}
                            UNSAFE_style={{ width: '100%' }}
                            description="Optional, max 64 characters"
                          />
                        </div>
                      </div>
                    </div>
                  </TabPanel>
                )}
            </Tabs>
            
            {/* Error display */}
            {error && (
              <span className={style({ color: 'red-600' })} style={{ marginTop: '12px' }}>
                {error}
              </span>
            )}
          </Content>

          <ButtonGroup>
            <Button variant="secondary" onPress={onClose} isDisabled={saving}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onPress={handleSave}
              isDisabled={saving || !name.trim()}
              autoFocus
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogContainer>
  );
}
