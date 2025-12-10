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

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContainer,
  Heading,
  Content,
  Divider,
  Form,
  TextField,
  TextArea,
  Button,
  Text,
  ActionButton,
  Picker,
  PickerItem,
  CheckboxGroup,
  Checkbox,
  TreeView,
  TreeViewItem,
  TreeViewItemContent,
  ProgressCircle
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Add from '@react-spectrum/s2/icons/Add';
import Delete from '@react-spectrum/s2/icons/Delete';
import Folder from '@react-spectrum/s2/icons/Folder';
import File from '@react-spectrum/s2/icons/File';
import type { MCPTool, MCPResource } from '../../../shared/types';
import { changelogService } from '../services/changelog';
import { toastService } from '../services/toast';
import { apiClient } from '../services/api';
import { ACTION_META } from '../constants/actionMeta';
import { EDS_WIDGET_META } from '../constants/edsWidgetMeta';
import { STORAGE_KEYS } from '../constants/storage';

interface SchemaProperty {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  // String validators
  minLength?: number;
  maxLength?: number;
}

interface CreateActionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newAction: MCPTool) => Promise<void>;
  existingActions: MCPTool[];
  serverId: string; // Required for adding widget resources
  connectedServer?: any; // Connected server with edsConfig
}

export default function CreateActionWizard({
  isOpen,
  onClose,
  onAdd,
  existingActions,
  serverId,
  connectedServer
}: CreateActionWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [name, setName] = useState('');
  const [nameValidation, setNameValidation] = useState<'valid' | 'invalid'>('valid');
  const [nameDuplicateError, setNameDuplicateError] = useState<boolean>(false);
  const [nameSpaceError, setNameSpaceError] = useState<boolean>(false);
  const [description, setDescription] = useState('');
  const [hasEdsWidget, setHasEdsWidget] = useState<string>('');
  const [properties, setProperties] = useState<SchemaProperty[]>([]);
  const [requiredFields, setRequiredFields] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Annotations state - array of selected annotation names
  const [annotations, setAnnotations] = useState<string[]>([]);

  // Action OpenAI Metadata (Step 2 for widget actions)
  const [formOpenAIOutputTemplate, setFormOpenAIOutputTemplate] = useState('');
  const [formOpenAIWidgetAccessible, setFormOpenAIWidgetAccessible] = useState(true);
  const [formOpenAIToolInvocationInvoking, setFormOpenAIToolInvocationInvoking] = useState('Short status text while the tool runs');
  const [formOpenAIToolInvocationInvoked, setFormOpenAIToolInvocationInvoked] = useState('Short status text after the tool completes');

  // EDS Widget Resource Metadata (Step 3 for widget actions)
  const [formWidgetName, setFormWidgetName] = useState('');
  const [formWidgetUri, setFormWidgetUri] = useState('');
  const [formWidgetDescription, setFormWidgetDescription] = useState('');
  const [formWidgetMimeType] = useState('text/html+skybridge');
  const [formWidgetOpenAIDescription, setFormWidgetOpenAIDescription] = useState('');
  const [formWidgetPrefersBorder, setFormWidgetPrefersBorder] = useState(false);
  const [formWidgetCSPConnectDomains, setFormWidgetCSPConnectDomains] = useState<string[]>([]);
  const [formWidgetCSPResourceDomains, setFormWidgetCSPResourceDomains] = useState<string[]>([]);
  const [formWidgetDomain, setFormWidgetDomain] = useState('');

  // EDS Widget URL Configuration (Step 4 for widget actions)
  const [formScriptUrl, setFormScriptUrl] = useState('');
  const [formWidgetEmbedUrl, setFormWidgetEmbedUrl] = useState('');

  // URL validation errors for Step 4
  const [scriptUrlError, setScriptUrlError] = useState<string>('');
  const [widgetEmbedUrlError, setWidgetEmbedUrlError] = useState<string>('');

  // Preview iframe state
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Handle EDS page preview refresh
  const handleRefreshPreview = () => {
    setIsPreviewLoading(true);
    setIframeKey(prev => prev + 1);
  };

  // Set loading when URL changes
  useEffect(() => {
    if (formWidgetEmbedUrl) {
      setIsPreviewLoading(true);
    }
  }, [formWidgetEmbedUrl]);

  // Extract da.live URL from Widget Embed URL for "new EDS Page" link
  const getDaLiveUrlFromWidgetEmbedUrl = (): string => {
    if (!formWidgetEmbedUrl) return '';
    try {
      const url = new URL(formWidgetEmbedUrl);

      // Extract owner and repo from hostname pattern: branch--repo--owner.aem.page
      const hostParts = url.hostname.split('--');
      if (hostParts.length >= 3) {
        const owner = hostParts[2].split('.')[0]; // Remove .aem.page
        const repo = hostParts[1];

        // Extract folder from pathname (e.g., /eds-widgets/action_name -> eds-widgets)
        const pathParts = url.pathname.split('/').filter(p => p);
        const folder = pathParts[0] || 'eds-widgets';

        return `https://da.live/#/${owner}/${repo}/${folder}`;
      }

      return '';
    } catch {
      return '';
    }
  };

  // Validation regex for folder name (letters, numbers, underscore, hyphen - NO SPACES)
  const isValidFolderName = (value: string): boolean => {
    if (!value) return true; // Allow empty for now, required validation handles this
    // Explicitly check for spaces first
    if (value.includes(' ')) return false;
    return /^[a-zA-Z0-9_-]+$/.test(value);
  };

  // URL validation helper - Check if URL is valid HTTPS
  const isValidHttpsUrl = (url: string): boolean => {
    if (!url) return true; // Allow empty for now
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // URL path validation helper - Check if path starts with /
  const isValidUrlPath = (url: string): boolean => {
    if (!url) return true; // Allow empty for now
    try {
      const parsed = new URL(url);
      return parsed.pathname.startsWith('/') && parsed.pathname.length > 1;
    } catch {
      return false;
    }
  };

  // Check if action name already exists
  const isDuplicateActionName = (value: string): boolean => {
    if (!value) return false;
    return existingActions.some(action => action.name === value);
  };

  // Reset wizard state when dialog opens with conditional random defaults for testing
  useEffect(() => {
    if (isOpen) {
      const sandboxMode = sessionStorage.getItem(STORAGE_KEYS.SANDBOX_MODE) === 'true';

      setStep(1);

      // Only set random data if sandbox mode is enabled
      if (sandboxMode) {
        const randomId = Math.random().toString(36).substring(2, 8);
        setName(`action_${randomId}`);
        setDescription(`Auto-generated test action ${randomId} for quick testing and validation`);
      } else {
        setName('');
        setDescription('');
      }

      setNameValidation('valid');
      setNameDuplicateError(false);
      setNameSpaceError(false);
      setHasEdsWidget('no');
      setProperties([]);
      setRequiredFields([]);
      setError(null);
      setSaving(false);
      // Reset annotations to empty array (all unchecked)
      setAnnotations([]);

      // Reset OpenAI metadata fields
      setFormOpenAIOutputTemplate('');
      setFormOpenAIWidgetAccessible(true);
      setFormOpenAIToolInvocationInvoking('Short status text while the tool runs');
      setFormOpenAIToolInvocationInvoked('Short status text after the tool completes');

      // Reset widget resource fields
      setFormWidgetName('');
      setFormWidgetUri('');
      setFormWidgetDescription('');
      setFormWidgetOpenAIDescription('');
      setFormWidgetPrefersBorder(false);
      setFormWidgetCSPConnectDomains([]);
      setFormWidgetCSPResourceDomains([]);
      setFormWidgetDomain('');

      // Reset template URL fields
      setFormScriptUrl('');
      setFormWidgetEmbedUrl('');

      // Reset URL validation errors
      setScriptUrlError('');
      setWidgetEmbedUrlError('');
    }
  }, [isOpen]);

  const handleAddProperty = () => {
    setProperties([
      ...properties,
      {
        name: 'newField',
        type: 'string',
        description: '',
        required: false
      }
    ]);
  };

  const handleRemoveProperty = (index: number) => {
    const newProperties = properties.filter((_, i) => i !== index);
    setProperties(newProperties);

    // Remove from required fields if it was required
    const removedProp = properties[index];
    if (removedProp && requiredFields.includes(removedProp.name)) {
      setRequiredFields(requiredFields.filter(f => f !== removedProp.name));
    }
  };

  const handlePropertyChange = (index: number, field: keyof SchemaProperty, value: any) => {
    const newProperties = [...properties];
    const oldName = newProperties[index].name;

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

    newProperties[index] = {
      ...newProperties[index],
      [field]: value
    };

    // If name changed and it was in required fields, update required fields
    if (field === 'name' && oldName !== value) {
      if (requiredFields.includes(oldName)) {
        setRequiredFields(requiredFields.map(f => f === oldName ? value : f));
      }
    }

    // Handle required checkbox
    if (field === 'required') {
      const propName = newProperties[index].name;
      if (value) {
        if (!requiredFields.includes(propName)) {
          setRequiredFields([...requiredFields, propName]);
        }
      } else {
        setRequiredFields(requiredFields.filter(f => f !== propName));
      }
    }

    setProperties(newProperties);
  };

  // URL validation handlers for Step 4
  const handleScriptUrlChange = (value: string) => {
    setFormScriptUrl(value);

    // Validate HTTPS and path
    if (value && !isValidHttpsUrl(value)) {
      setScriptUrlError('URL must use HTTPS protocol');
    } else if (value && !isValidUrlPath(value)) {
      setScriptUrlError('URL must include a valid path (e.g., /scripts/file.js)');
    } else {
      setScriptUrlError('');
    }
  };

  const handleWidgetEmbedUrlChange = (value: string) => {
    setFormWidgetEmbedUrl(value);

    // Validate HTTPS and path
    if (value && !isValidHttpsUrl(value)) {
      setWidgetEmbedUrlError('URL must use HTTPS protocol');
    } else if (value && !isValidUrlPath(value)) {
      setWidgetEmbedUrlError('URL must include a valid path (e.g., /eds-widgets/widget)');
    } else {
      setWidgetEmbedUrlError('');
    }
  };

  // Convert camelCase to kebab-case (matches backend script pattern)
  // Handles consecutive uppercase letters correctly: "helloWorldEDS" -> "hello-world-eds"
  const toKebabCase = (str: string): string => {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')  // Add hyphen between lowercase/digit and uppercase
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2') // Handle consecutive uppercase: "XMLParser" -> "XML-Parser"
      .toLowerCase();
  };

  const handleNext = () => {
    // Step 1 → Step 2: Auto-populate OpenAI metadata for widget actions
    if (step === 1 && hasEdsWidget === 'yes') {
      // Generate output template URI using kebab-case + '-widget.html' suffix
      const kebabName = toKebabCase(name);
      const outputTemplateUri = `ui://eds-widget/${kebabName}-widget.html`;
      setFormOpenAIOutputTemplate(outputTemplateUri);
      setFormOpenAIToolInvocationInvoking(`Loading ${name}...`);
      setFormOpenAIToolInvocationInvoked(`${name} complete`);
      setFormOpenAIWidgetAccessible(true);
    }

    // Step 2 → Step 3: Auto-populate widget resource fields (widget actions only)
    if (step === 2 && hasEdsWidget === 'yes') {
      // Validation for Step 2 (OpenAI metadata)
      if (!formOpenAIToolInvocationInvoking.trim()) {
        toastService.error('Invoking status text is required');
        return;
      }
      if (formOpenAIToolInvocationInvoking.length > 64) {
        toastService.error('Invoking status text must be 64 characters or less');
        return;
      }
      if (!formOpenAIToolInvocationInvoked.trim()) {
        toastService.error('Invoked status text is required');
        return;
      }
      if (formOpenAIToolInvocationInvoked.length > 64) {
        toastService.error('Invoked status text must be 64 characters or less');
        return;
      }

      // Auto-populate widget URI (required for all EDS widget actions)
      setFormWidgetUri(formOpenAIOutputTemplate); // Use same URI as outputTemplate

      // Auto-populate widget name (required naming convention: ${actionName}Widget)
      setFormWidgetName(`${name}Widget`);

      // Auto-populate CSP domains and widget domain (always needed for ChatGPT widgets)
      setFormWidgetDomain('https://web-sandbox.oaiusercontent.com');

      // Build CSP domains from EDS config if available
      if (connectedServer?.edsConfig) {
        const { branch, repo, owner } = connectedServer.edsConfig;
        const baseUrl = `https://${branch}--${repo}--${owner}.aem.page`;
        setFormWidgetCSPConnectDomains([baseUrl]);
        setFormWidgetCSPResourceDomains([baseUrl]);
      } else {
        // Fallback to empty arrays if no EDS config
        setFormWidgetCSPConnectDomains([]);
        setFormWidgetCSPResourceDomains([]);
      }

      // Only auto-fill optional widget metadata if sandbox mode is enabled
      const sandboxMode = sessionStorage.getItem(STORAGE_KEYS.SANDBOX_MODE) === 'true';
      if (sandboxMode) {
        setFormWidgetDescription(`Widget for ${name}`);
        setFormWidgetOpenAIDescription(`ChatGPT widget description for ${name}`);
        setFormWidgetPrefersBorder(true);
      }

      // Auto-fill template URLs from server's EDS config (always, not just sandbox mode)
      if (connectedServer?.edsConfig) {
        const { branch, repo, owner } = connectedServer.edsConfig;
        const baseUrl = `https://${branch}--${repo}--${owner}.aem.page`;
        setFormScriptUrl(`${baseUrl}/scripts/aem-embed.js`);
        setFormWidgetEmbedUrl(`${baseUrl}/eds-widgets/${name}`);
      }
    }

    // Step 3 → Step 4: Clear any previous validation errors
    if (step === 3 && hasEdsWidget === 'yes') {
      setScriptUrlError('');
      setWidgetEmbedUrlError('');
    }

    // Step 4 → Step 5: Validate URL fields (widget actions only)
    if (step === 4 && hasEdsWidget === 'yes') {
      // Check for validation errors
      if (scriptUrlError || widgetEmbedUrlError) {
        toastService.error('Please fix URL validation errors before continuing');
        return;
      }

      // Check required fields
      if (!formScriptUrl.trim()) {
        toastService.error('Script URL is required');
        return;
      }
      if (!formWidgetEmbedUrl.trim()) {
        toastService.error('Widget Embed URL is required');
        return;
      }
    }

    // Navigate to next step
    if (step < 5) {
      setStep((step + 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const trimmedName = name.trim();

      if (!trimmedName) {
        setError('Action name is required');
        return;
      }

      if (!isValidFolderName(trimmedName)) {
        setError('Action name cannot contain spaces. Only letters, numbers, underscores, and hyphens are allowed.');
        return;
      }

      if (!description.trim()) {
        setError('Description is required');
        return;
      }

      if (!hasEdsWidget) {
        setError('Has EDS Widget selection is required');
        return;
      }

      // Validate parameter names are unique
      const paramNames = properties.map(p => p.name.trim()).filter(n => n);
      const uniqueNames = new Set(paramNames);
      if (paramNames.length !== uniqueNames.size) {
        setError('Duplicate parameter names found. Each parameter must have a unique name.');
        return;
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

      const newAction: MCPTool = {
        name: trimmedName,
        description: description.trim(),
        inputSchema: properties.length > 0 ? inputSchema : undefined,
        deployed: false,
        hasEdsWidget: hasEdsWidget === 'yes',
        annotations: {
          destructiveHint: annotations.includes('destructiveHint'),
          openWorldHint: annotations.includes('openWorldHint'),
          readOnlyHint: annotations.includes('readOnlyHint')
        },
        // Add OpenAI metadata for widget actions
        _meta: hasEdsWidget === 'yes' ? {
          [ACTION_META.OUTPUT_TEMPLATE]: formOpenAIOutputTemplate,
          [ACTION_META.WIDGET_ACCESSIBLE]: formOpenAIWidgetAccessible,
          [ACTION_META.TOOL_INVOCATION_INVOKING]: formOpenAIToolInvocationInvoking,
          [ACTION_META.TOOL_INVOCATION_INVOKED]: formOpenAIToolInvocationInvoked,
          [ACTION_META.RESULT_CAN_PRODUCE_WIDGET]: true
        } : undefined
        // Note: draft flag is NOT set for newly created actions (only for modifications)
      };

      // Log action changelog
      await changelogService.addEntry(
        'action_added',
        trimmedName,
        `Created new action "${trimmedName}"`,
        {
          newValue: newAction
        }
      );

      await onAdd(newAction);

      // If widget action, create and save widget resource
      if (hasEdsWidget === 'yes') {
        const newResource: MCPResource = {
          uri: formWidgetUri,
          name: formWidgetName,
          description: formWidgetDescription, // Mandatory
          mimeType: formWidgetMimeType,
          actionName: trimmedName,
          deployed: false,
          _meta: {
            [EDS_WIDGET_META.WIDGET_DESCRIPTION]: formWidgetOpenAIDescription || undefined,
            [EDS_WIDGET_META.WIDGET_PREFERS_BORDER]: formWidgetPrefersBorder,
            [EDS_WIDGET_META.WIDGET_CSP]: (formWidgetCSPConnectDomains.length > 0 || formWidgetCSPResourceDomains.length > 0) ? {
              [EDS_WIDGET_META.CSP_CONNECT_DOMAINS]: formWidgetCSPConnectDomains.filter(d => d.trim()),
              [EDS_WIDGET_META.CSP_RESOURCE_DOMAINS]: formWidgetCSPResourceDomains.filter(d => d.trim())
            } : undefined,
            [EDS_WIDGET_META.WIDGET_DOMAIN]: formWidgetDomain || undefined,
            [EDS_WIDGET_META.LCB_WIDGET_META]: {
              [EDS_WIDGET_META.SCRIPT_URL]: formScriptUrl,
              [EDS_WIDGET_META.WIDGET_EMBED_URL]: formWidgetEmbedUrl
            }
          }
        };

        // Log resource changelog
        await changelogService.addEntry(
          'resource_added',
          newResource.uri,
          `Created widget resource "${newResource.name || newResource.uri}"`,
          {
            resourceUri: newResource.uri,
            newValue: newResource
          }
        );

        // Save resource to database
        await apiClient.addWidgetResource(serverId, newResource);
      }

      // Reset form
      setName('');
      setNameValidation('valid');
      setDescription('');
      setHasEdsWidget('');
      setProperties([]);
      setRequiredFields([]);
      setAnnotations([]);

      // Reset widget fields
      setFormWidgetName('');
      setFormWidgetUri('');
      setFormWidgetDescription('');
      setFormWidgetOpenAIDescription('');
      setFormWidgetPrefersBorder(false);
      setFormWidgetCSPConnectDomains([]);
      setFormWidgetCSPResourceDomains([]);
      setFormWidgetDomain('');

      // Reset template URL fields
      setFormScriptUrl('');
      setFormWidgetEmbedUrl('');

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create action');
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (value: string) => {
    // Detect if input contains spaces BEFORE removing them
    const hasSpaces = /\s/.test(value);

    // Remove ALL spaces (not just trim leading/trailing)
    const noSpaces = value.replace(/\s/g, '');
    setName(noSpaces);

    // Set space error flag if spaces were detected
    setNameSpaceError(hasSpaces);

    // Validate folder name format
    if (noSpaces && !isValidFolderName(noSpaces)) {
      setNameValidation('invalid');
      setNameDuplicateError(false);
    } else {
      setNameValidation('valid');
      // Check for duplicate name
      setNameDuplicateError(isDuplicateActionName(noSpaces));
    }
  };

  const handleClose = () => {
    // Reset form on close
    setName('');
    setNameValidation('valid');
    setNameDuplicateError(false);
    setNameSpaceError(false);
    setDescription('');
    setHasEdsWidget('');
    setProperties([]);
    setRequiredFields([]);
    setError(null);
    setStep(1);
    setAnnotations([]);

    // Reset OpenAI metadata fields
    setFormOpenAIOutputTemplate('');
    setFormOpenAIWidgetAccessible(true);
    setFormOpenAIToolInvocationInvoking('');
    setFormOpenAIToolInvocationInvoked('');

    // Reset widget fields
    setFormWidgetName('');
    setFormWidgetUri('');
    setFormWidgetDescription('');
    setFormWidgetOpenAIDescription('');
    setFormWidgetPrefersBorder(false);
    setFormWidgetCSPConnectDomains([]);
    setFormWidgetCSPResourceDomains([]);
    setFormWidgetDomain('');

    // Reset template URL fields
    setFormScriptUrl('');
    setFormWidgetEmbedUrl('');

    onClose();
  };

  const getStepTitle = () => {
    const isWidget = hasEdsWidget === 'yes';

    switch (step) {
      case 1: return 'Step 1 - Action Details & Input Schema';
      case 2:
        if (isWidget) {
          return 'Step 2 - Action OpenAI Metadata';
        } else {
          return 'Step 2 - Files Preview';
        }
      case 3:
        if (isWidget) {
          return 'Step 3 - EDS Widget Resource Metadata';
        }
        return '';
      case 4:
        if (isWidget) {
          return 'Step 4 - EDS Widget URL Configuration';
        }
        return '';
      case 5:
        if (isWidget) {
          return 'Step 5 - Files Preview';
        }
        return '';
      default: return '';
    }
  };

  return (
    <DialogContainer onDismiss={handleClose}>
      {isOpen && (
        <Dialog size="XL" isDismissible>
          {() => (
            <>
              <Heading slot="title">
                {getStepTitle()}
              </Heading>
              <Content styles={style({ padding: 24 })}>

            {/* Scrollable Content Area */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', height: '100%' }}>

                {/* Step 1 Content - 2 Column Layout */}
                {step === 1 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateAreas: '"name divider schema"',
                    gridTemplateColumns: '1fr auto 1fr',
                    gap: '24px',
                    height: '100%'
                  }}>
                    {/* Left Column: Name & Description */}
                    <div style={{ gridArea: 'name' }}>
                      <Form>
                        <TextField
                          label="Name"
                          value={name}
                          onChange={handleNameChange}
                          isRequired
                          UNSAFE_style={{ width: '100%' }}
                          maxLength={64}
                          isInvalid={nameValidation === 'invalid' || nameDuplicateError || nameSpaceError}
                          errorMessage={
                            nameSpaceError
                              ? 'Spaces are not allowed and have been removed. Use letters, numbers, underscores, and hyphens only.'
                              : nameValidation === 'invalid'
                              ? 'Only letters, numbers, underscores, and hyphens are allowed.'
                              : nameDuplicateError
                              ? 'An action with this name already exists'
                              : undefined
                          }
                          description={`${name.length}/64 characters`}
                        />
                        <TextArea
                          label="Description"
                          value={description}
                          onChange={setDescription}
                          UNSAFE_style={{ width: '100%', height: '128px' }}
                          maxLength={512}
                          isRequired
                          description={`${description.length}/512 characters`}
                        />

                        {/* Annotations Section */}
                        <CheckboxGroup
                          label="Annotations"
                          value={annotations}
                          onChange={setAnnotations}
                        >
                          <Checkbox value="destructiveHint">destructiveHint</Checkbox>
                          <Checkbox value="openWorldHint">openWorldHint</Checkbox>
                          <Checkbox value="readOnlyHint">readOnlyHint</Checkbox>
                        </CheckboxGroup>

                        <Picker
                          label="Has EDS Widget"
                          placeholder="Choose"
                          selectedKey={hasEdsWidget}
                          onSelectionChange={(key) => setHasEdsWidget(key as string)}
                          UNSAFE_style={{ width: '100%' }}
                          isRequired
                        >
                          <PickerItem id="yes">Yes</PickerItem>
                          <PickerItem id="no">No</PickerItem>
                        </Picker>
                      </Form>
                    </div>

                    {/* Vertical Divider */}
                    <Divider orientation="vertical" UNSAFE_style={{ gridArea: 'divider', height: '100%' }} />

                    {/* Right Column: Input Schema Editor */}
                    <div style={{ gridArea: 'schema', maxHeight: '550px', overflowY: 'auto', paddingRight: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })} UNSAFE_style={{ margin: 0 }}>Input Parameters</Text>
                          <ActionButton onPress={handleAddProperty}>
                            <Add />
                            <Text>Add Field</Text>
                          </ActionButton>
                        </div>

                        {properties.length === 0 && (
                          <div style={{
                            backgroundColor: 'var(--spectrum-global-color-gray-75)',
                            borderRadius: '4px',
                            padding: '16px',
                            border: '1px dashed var(--spectrum-global-color-gray-400)'
                          }}>
                            <Text UNSAFE_style={{
                              fontSize: '14px',
                              color: 'var(--spectrum-global-color-gray-700)',
                              fontStyle: 'italic'
                            }}>
                              No parameters configured. This action will take no input.
                            </Text>
                          </div>
                        )}

                        {properties.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {properties.map((prop, index) => (
                              <div
                                key={index}
                                style={{
                                  borderWidth: '2px',
                                  borderStyle: 'solid',
                                  borderColor: 'var(--spectrum-blue-600)',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  backgroundColor: 'var(--spectrum-gray-50)'
                                }}
                              >
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '8px'
                                }}>
                                  <Text UNSAFE_style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                    🆕 New Parameter
                                  </Text>
                                  <ActionButton onPress={() => handleRemoveProperty(index)}
                                    aria-label="Remove field" UNSAFE_className="delete-button">
                                    <Delete />
                                  </ActionButton>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'flex-start' }}>
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
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '4px',
                                      marginTop: '24px'
                                    }}>
                                      <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer'
                                      }}>
                                        <input
                                          type="checkbox"
                                          checked={requiredFields.includes(prop.name)}
                                          onChange={e => handlePropertyChange(index, 'required', e.target.checked)}
                                        />
                                        <Text>Required</Text>
                                      </label>
                                    </div>
                                  </div>
                                  <TextArea
                                    label="Description"
                                    value={prop.description}
                                    onChange={value => handlePropertyChange(index, 'description', value)}
                                    UNSAFE_style={{ width: '100%', height: '128px' }}
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
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                      <Text UNSAFE_style={{
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: 'var(--spectrum-global-color-gray-700)'
                                      }}>
                                        Validators
                                      </Text>
                                      <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                                        <TextField
                                          label="Minimum"
                                          type="number"
                                          value={prop.minLength?.toString() || '0'}
                                          onChange={value => handlePropertyChange(index, 'minLength',
                                            value ? parseInt(value) : 0)}
                                          UNSAFE_style={{ width: '50%', fontSize: '14px' }}
                                        />
                                        <TextField
                                          label="Maximum"
                                          type="number"
                                          value={prop.maxLength?.toString() || '256'}
                                          onChange={value => handlePropertyChange(index, 'maxLength',
                                            value ? parseInt(value) : 256)}
                                          UNSAFE_style={{ width: '50%', fontSize: '14px' }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2 Content - Widgetless: Files Preview */}
                {step === 2 && hasEdsWidget === 'no' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                    {/* Info Message */}
                    <div style={{
                      borderRadius: '8px',
                      padding: '16px',
                      border: '1px solid var(--spectrum-global-color-gray-400)',
                      backgroundColor: 'var(--spectrum-global-color-gray-75)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                        <Text>ℹ️</Text>
                        <Text>
                          These files and folders will be created during deployment.
                          The action will be available for calling only after successful deployment.
                        </Text>
                      </div>
                    </div>

                    {/* TreeView - File Structure */}
                    <div style={{
                      backgroundColor: 'var(--spectrum-gray-50)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: 'var(--spectrum-gray-300)',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'default'
                    }} className="tree-preview-container">
                      <TreeView
                        aria-label="Action files to be created"
                        defaultExpandedKeys={['root', 'action-folder']}
                        disabledKeys={['root', 'action-folder', 'schema', 'index']}
                        UNSAFE_style={{ color: '#000000', cursor: 'default', maxWidth: '100%' }}
                        UNSAFE_className="tree-preview"
                      >
                        <TreeViewItem id="root" textValue="lcb-server">
                          <TreeViewItemContent>
                            <Text UNSAFE_style={{ color: '#000000' }}>lcb-server/server/src/actions/</Text>
                            <Folder />
                          </TreeViewItemContent>
                          <TreeViewItem id="action-folder" textValue={name}>
                            <TreeViewItemContent>
                              <Text UNSAFE_style={{ color: '#000000' }}>{name}/</Text>
                              <Folder />
                            </TreeViewItemContent>
                            <TreeViewItem id="schema" textValue="schema.json">
                              <TreeViewItemContent>
                                <Text UNSAFE_style={{ color: '#000000' }}>schema.json</Text>
                                <File />
                              </TreeViewItemContent>
                            </TreeViewItem>
                            <TreeViewItem id="index" textValue="index.ts">
                              <TreeViewItemContent>
                                <Text UNSAFE_style={{ color: '#000000' }}>index.ts</Text>
                                <File />
                              </TreeViewItemContent>
                            </TreeViewItem>
                          </TreeViewItem>
                        </TreeViewItem>
                      </TreeView>
                    </div>
                  </div>
                )}

                {/* Step 2 Content - Widget: Action OpenAI Metadata (2-column layout) */}
                {step === 2 && hasEdsWidget === 'yes' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateAreas: '"left divider right"',
                    gridTemplateColumns: '1fr auto 1fr',
                    gap: '24px',
                    height: '100%'
                  }}>
                    {/* Left Column: OpenAI Action Metadata */}
                    <div style={{ gridArea: 'left' }}>
                      <Form>
                        <TextField
                          label="Output Template (URI)"
                          value={formOpenAIOutputTemplate}
                          UNSAFE_style={{ width: '100%' }}
                          isDisabled
                          isReadOnly
                          description="Resource URI for component HTML template"
                        />
                        <Checkbox
                          isSelected={formOpenAIWidgetAccessible}
                          onChange={setFormOpenAIWidgetAccessible}
                          isDisabled
                        >
                          Widget Accessible
                        </Checkbox>
                        <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-700)' }}>
                          Allow component→tool calls through the client bridge
                        </Text>
                        <TextField
                          label="Invoking Status Text"
                          value={formOpenAIToolInvocationInvoking}
                          onChange={setFormOpenAIToolInvocationInvoking}
                          UNSAFE_style={{ width: '100%' }}
                          placeholder={`Loading ${name}...`}
                          maxLength={64}
                          description={`Short status text while the tool runs (${formOpenAIToolInvocationInvoking.length}/64)`}
                          isRequired
                        />
                        <TextField
                          label="Invoked Status Text"
                          value={formOpenAIToolInvocationInvoked}
                          onChange={setFormOpenAIToolInvocationInvoked}
                          UNSAFE_style={{ width: '100%' }}
                          placeholder={`${name} complete`}
                          maxLength={64}
                          description={`Short status text after the tool completes (${formOpenAIToolInvocationInvoked.length}/64)`}
                          isRequired
                        />
                      </Form>
                    </div>

                    {/* Vertical Divider */}
                    <Divider orientation="vertical" UNSAFE_style={{ gridArea: 'divider', height: '100%' }} />

                    {/* Right Column: Info Box */}
                    <div style={{ gridArea: 'right', maxHeight: '550px', overflowY: 'auto' }}>
                      <div style={{
                        borderRadius: '8px',
                        padding: '24px',
                        border: '1px solid var(--spectrum-global-color-gray-400)',
                        backgroundColor: 'var(--spectrum-global-color-gray-75)'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })} UNSAFE_style={{ margin: 0 }}>OpenAI Metadata</Text>
                          <Text>
                            These fields define how your action integrates with ChatGPT Apps and the OpenAI platform.
                          </Text>
                          <Divider />
                          <Text UNSAFE_style={{ fontWeight: 'bold' }}>Output Template</Text>
                          <Text>
                            The URI of the HTML template resource that will be rendered as a widget.
                            This is auto-synchronized with the widget resource URI you'll define in the next step.
                          </Text>
                          <Text UNSAFE_style={{ fontWeight: 'bold' }}>Widget Accessible</Text>
                          <Text>
                            When enabled, the widget can call back to this tool through the OpenAI client bridge,
                            enabling interactive components.
                          </Text>
                          <Text UNSAFE_style={{ fontWeight: 'bold' }}>Status Texts</Text>
                          <Text>
                            These short messages (max 64 characters each) are displayed to the user while your
                            tool is running and after it completes, providing real-time feedback.
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3 Content - Widget: EDS Widget Resource Metadata (2-column layout) */}
                {step === 3 && hasEdsWidget === 'yes' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateAreas: '"left divider right"',
                    gridTemplateColumns: '1fr auto 1fr',
                    gap: '24px',
                    height: '100%'
                  }}>
                    {/* Left Column: MCP Strict Resource Fields */}
                    <div style={{ gridArea: 'left' }}>
                      <Form>
                        <TextField
                          label="Name"
                          value={formWidgetName}
                          onChange={setFormWidgetName}
                          UNSAFE_style={{ width: '100%' }}
                          isRequired
                          isReadOnly
                          description="Auto-generated from action name (required naming convention)"
                        />
                        <TextField
                          label="URI"
                          value={formWidgetUri}
                          UNSAFE_style={{ width: '100%' }}
                          isDisabled
                          isReadOnly
                          description="Synchronized with Action OpenAI Metadata (Step 2)"
                        />
                        <TextArea
                          label="Description"
                          value={formWidgetDescription}
                          onChange={setFormWidgetDescription}
                          UNSAFE_style={{ width: '100%', height: '128px' }}
                          description="MANDATORY - Standard MCP resource description (displayed in list)"
                          isRequired
                        />
                        <TextField
                          label="MIME Type"
                          value={formWidgetMimeType}
                          UNSAFE_style={{ width: '100%' }}
                          isDisabled
                          isReadOnly
                        />
                      </Form>
                    </div>

                    {/* Vertical Divider */}
                    <Divider orientation="vertical" UNSAFE_style={{ gridArea: 'divider', height: '100%' }} />

                    {/* Right Column: OpenAI Metadata (scrollable) */}
                    <div style={{ gridArea: 'right', maxHeight: '550px', overflowY: 'auto', paddingRight: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Heading level={4} UNSAFE_style={{ margin: 0 }}>OpenAI Metadata</Heading>

                        <TextArea
                          label="Widget Description"
                          value={formWidgetOpenAIDescription}
                          onChange={setFormWidgetOpenAIDescription}
                          UNSAFE_style={{ width: '100%', height: '128px' }}
                          description="ChatGPT-specific widget description (OPTIONAL)"
                        />

                        <Checkbox
                          isSelected={formWidgetPrefersBorder}
                          onChange={setFormWidgetPrefersBorder}
                        >
                          Prefers Border
                        </Checkbox>

                        <Heading level={5} UNSAFE_style={{ margin: 0 }}>Widget CSP</Heading>

                        {/* Connect Domains */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Text UNSAFE_style={{ fontWeight: 'bold' }}>Connect Domains</Text>
                          {formWidgetCSPConnectDomains.map((domain, idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                              <TextField
                                value={domain}
                                onChange={(val) => {
                                  const newDomains = [...formWidgetCSPConnectDomains];
                                  newDomains[idx] = val;
                                  setFormWidgetCSPConnectDomains(newDomains);
                                }}
                                UNSAFE_style={{ width: '100%' }}
                                placeholder="Enter domain URL"
                              />
                              <ActionButton
                                onPress={() => {
                                  setFormWidgetCSPConnectDomains(
                                    formWidgetCSPConnectDomains.filter((_, i) => i !== idx)
                                  );
                                }}
                               
                              >
                                <Delete />
                              </ActionButton>
                            </div>
                          ))}
                          <ActionButton
                            onPress={() => setFormWidgetCSPConnectDomains([...formWidgetCSPConnectDomains, ''])}
                          >
                            <Add />
                            <Text>Add Connect Domain</Text>
                          </ActionButton>
                        </div>

                        {/* Resource Domains */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <Text UNSAFE_style={{ fontWeight: 'bold' }}>Resource Domains</Text>
                          {formWidgetCSPResourceDomains.map((domain, idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                              <TextField
                                value={domain}
                                onChange={(val) => {
                                  const newDomains = [...formWidgetCSPResourceDomains];
                                  newDomains[idx] = val;
                                  setFormWidgetCSPResourceDomains(newDomains);
                                }}
                                UNSAFE_style={{ width: '100%' }}
                                placeholder="Enter domain URL"
                              />
                              <ActionButton
                                onPress={() => {
                                  setFormWidgetCSPResourceDomains(
                                    formWidgetCSPResourceDomains.filter((_, i) => i !== idx)
                                  );
                                }}
                               
                              >
                                <Delete />
                              </ActionButton>
                            </div>
                          ))}
                          <ActionButton
                            onPress={() => setFormWidgetCSPResourceDomains([...formWidgetCSPResourceDomains, ''])}
                          >
                            <Add />
                            <Text>Add Resource Domain</Text>
                          </ActionButton>
                        </div>

                        <TextField
                          label="Widget Domain"
                          value={formWidgetDomain}
                          onChange={setFormWidgetDomain}
                          UNSAFE_style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4 Content - Widget: EDS Widget URL Configuration */}
                {step === 4 && hasEdsWidget === 'yes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                    {/* Warning Box */}
                    <div style={{
                      borderRadius: '8px',
                      padding: '16px',
                      border: '2px solid var(--spectrum-global-color-orange-600)',
                      backgroundColor: 'var(--spectrum-global-color-orange-100)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'flex-start' }}>
                        <Text UNSAFE_style={{ fontSize: '20px' }}>⚠️</Text>
                        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-orange-900)' }}>
                          Enter an existing EDS Page URL or create a{' '}
                          {getDaLiveUrlFromWidgetEmbedUrl() ? (
                            <a
                              href={getDaLiveUrlFromWidgetEmbedUrl()}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--spectrum-global-color-blue-700)',
                                textDecoration: 'underline',
                                fontWeight: 'bold'
                              }}
                            >
                              new EDS Page
                            </a>
                          ) : (
                            <span style={{ fontWeight: 'bold' }}>new EDS Page</span>
                          )}
                          {' '}for this Action.
                        </Text>
                      </div>
                    </div>
                    <TextField
                      label="Script URL"
                      value={formScriptUrl}
                      onChange={handleScriptUrlChange}
                      UNSAFE_style={{ width: '100%' }}
                      placeholder="https://<branch>--<repo>--<owner>.aem.page/scripts/aem-embed.js"
                      description="Full URL to the aem-embed.js script"
                      isDisabled
                      isReadOnly
                    />

                    <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label="Widget Embed URL"
                          value={formWidgetEmbedUrl}
                          onChange={handleWidgetEmbedUrlChange}
                          UNSAFE_style={{ width: '100%' }}
                          placeholder={`https://<branch>--<repo>--<owner>.aem.page/eds-widgets/${name || '<action-name>'}`}
                          description="Full URL to the widget embed endpoint"
                          isInvalid={!!widgetEmbedUrlError}
                          errorMessage={widgetEmbedUrlError}
                          isRequired
                        />
                      </div>
                      <Button
                        variant="secondary"
                        onPress={handleRefreshPreview}
                        isDisabled={!formWidgetEmbedUrl || isPreviewLoading}
                        UNSAFE_style={{
                          marginTop: '24px',
                          minWidth: '120px',
                          flexShrink: 0,
                          height: '32px'
                        }}
                      >
                        {isPreviewLoading ? 'Refreshing...' : 'Refresh'}
                      </Button>
                    </div>

                    {/* EDS Page Preview */}
                    {formWidgetEmbedUrl && (
                      <div style={{
                        width: '100%',
                        height: '400px',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--spectrum-global-color-gray-50)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'var(--spectrum-gray-400)',
                        borderRadius: '8px'
                      }}>
                        {isPreviewLoading && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--spectrum-global-color-gray-50)',
                            zIndex: 10
                          }}>
                            <ProgressCircle aria-label="Loading EDS page preview" isIndeterminate />
                          </div>
                        )}
                        <iframe
                          key={iframeKey}
                          src={formWidgetEmbedUrl}
                          title="EDS Page Preview"
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none'
                          }}
                          onLoad={() => setIsPreviewLoading(false)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5 Content - Widget: Files Preview */}
                {step === 5 && hasEdsWidget === 'yes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                    {/* Info Message */}
                    <div style={{
                      borderRadius: '8px',
                      padding: '16px',
                      border: '1px solid var(--spectrum-global-color-gray-400)',
                      backgroundColor: 'var(--spectrum-global-color-gray-75)'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                        <Text>ℹ️</Text>
                        <Text>
                          These files and folders will be created during deployment.
                          The action will be available for calling only after successful deployment.
                        </Text>
                      </div>
                    </div>

                    {/* TreeView - File Structure with Widget */}
                    <div style={{
                      backgroundColor: 'var(--spectrum-gray-50)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: 'var(--spectrum-gray-300)',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'default'
                    }} className="tree-preview-container">
                      <TreeView
                        aria-label="Action and widget files to be created"
                        defaultExpandedKeys={['root', 'action-folder', 'widget-folder']}
                        disabledKeys={['root', 'action-folder', 'schema', 'index', 'widget-folder', 'widget-schema', 'widget-index', 'widget-template']}
                        UNSAFE_style={{ color: '#000000', cursor: 'default', maxWidth: '100%' }}
                        UNSAFE_className="tree-preview"
                      >
                        <TreeViewItem id="root" textValue="lcb-server">
                          <TreeViewItemContent>
                            <Text UNSAFE_style={{ color: '#000000' }}>lcb-server/server/src/actions/</Text>
                            <Folder />
                          </TreeViewItemContent>
                          <TreeViewItem id="action-folder" textValue={name}>
                            <TreeViewItemContent>
                              <Text UNSAFE_style={{ color: '#000000' }}>{name}/</Text>
                              <Folder />
                            </TreeViewItemContent>
                            <TreeViewItem id="schema" textValue="schema.json">
                              <TreeViewItemContent>
                                <Text UNSAFE_style={{ color: '#000000' }}>schema.json</Text>
                                <File />
                              </TreeViewItemContent>
                            </TreeViewItem>
                            <TreeViewItem id="index" textValue="index.ts">
                              <TreeViewItemContent>
                                <Text UNSAFE_style={{ color: '#000000' }}>index.ts</Text>
                                <File />
                              </TreeViewItemContent>
                            </TreeViewItem>
                            <TreeViewItem id="widget-folder" textValue="widget">
                              <TreeViewItemContent>
                                <Text UNSAFE_style={{ color: '#000000' }}>widget/</Text>
                                <Folder />
                              </TreeViewItemContent>
                              <TreeViewItem id="widget-schema" textValue="widget-schema.json">
                                <TreeViewItemContent>
                                  <Text UNSAFE_style={{ color: '#000000' }}>widget-schema.json</Text>
                                  <File />
                                </TreeViewItemContent>
                              </TreeViewItem>
                              <TreeViewItem id="widget-index" textValue="index.ts">
                                <TreeViewItemContent>
                                  <Text UNSAFE_style={{ color: '#000000' }}>index.ts</Text>
                                  <File />
                                </TreeViewItemContent>
                              </TreeViewItem>
                              <TreeViewItem id="widget-template" textValue="template.html">
                                <TreeViewItemContent>
                                  <Text UNSAFE_style={{ color: '#000000' }}>template.html</Text>
                                  <File />
                                </TreeViewItemContent>
                              </TreeViewItem>
                            </TreeViewItem>
                          </TreeViewItem>
                        </TreeViewItem>
                      </TreeView>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)', marginBottom: '12px' }}>
                {error}
              </Text>
            )}

            {/* Fixed Footer */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', justifyContent: 'space-between' }}>
              <div>
                {step > 1 && (
                  <Button variant="secondary" onPress={handleBack} isDisabled={saving}>
                    Back
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                <Button variant="secondary" onPress={handleClose} isDisabled={saving}>
                  Cancel
                </Button>
                {/* Step 1: Next button (common for both flows) */}
                {step === 1 && (
                  <Button
                    variant="secondary"
                    onPress={handleNext}
                    isDisabled={!name.trim() || nameValidation === 'invalid' || nameDuplicateError ||
                      !description.trim() || !hasEdsWidget}
                  >
                    Next
                  </Button>
                )}

                {/* Step 2 - Widgetless: Create Action button (final step) */}
                {step === 2 && hasEdsWidget === 'no' && (
                  <Button
                    variant="accent"
                    onPress={handleSave}
                    isDisabled={saving}
                    autoFocus
                  >
                    {saving ? 'Creating...' : 'Create Action'}
                  </Button>
                )}

                {/* Step 2 - Widget: Next button (OpenAI metadata validation) */}
                {step === 2 && hasEdsWidget === 'yes' && (
                  <Button
                    variant="secondary"
                    onPress={handleNext}
                    isDisabled={!formOpenAIToolInvocationInvoking.trim() || !formOpenAIToolInvocationInvoked.trim()}
                  >
                    Next
                  </Button>
                )}

                {/* Step 3 - Widget: Next button (EDS Widget Resource metadata validation) */}
                {step === 3 && hasEdsWidget === 'yes' && (
                  <Button
                    variant="secondary"
                    onPress={handleNext}
                    isDisabled={!formWidgetName.trim() || !formWidgetDescription.trim()}
                  >
                    Next
                  </Button>
                )}

                {/* Step 4 - Widget: Next button */}
                {step === 4 && hasEdsWidget === 'yes' && (
                  <Button
                    variant="secondary"
                    onPress={handleNext}
                  >
                    Next
                  </Button>
                )}

                {/* Step 5 - Widget: Create Action button (final step) */}
                {step === 5 && hasEdsWidget === 'yes' && (
                  <Button
                    variant="accent"
                    onPress={handleSave}
                    isDisabled={saving}
                    autoFocus
                  >
                    {saving ? 'Creating...' : 'Create Action'}
                  </Button>
                )}
              </div>
            </div>
          </Content>
            </>
          )}
        </Dialog>
      )}
    </DialogContainer>
  );
}
