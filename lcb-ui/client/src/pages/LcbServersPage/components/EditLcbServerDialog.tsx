import { useState, useEffect } from 'react';
import {
  DialogContainer,
  Dialog,
  Heading,
  Divider,
  Content,
  TextField,
  TextArea,
  Button,
  ButtonGroup,
  ActionButton,
  Picker,
  PickerItem
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import LinkOut from '@react-spectrum/s2/icons/Link';
import type { MCPServer } from '../../../../../shared/types';

interface EditLcbServerDialogProps {
  isOpen: boolean;
  server: MCPServer | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<MCPServer>) => Promise<void>;
}

export default function EditLcbServerDialog({ isOpen, server, onClose, onSave }: EditLcbServerDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [connectionType, setConnectionType] = useState('http');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // EDS config fields (only for local-managed servers)
  const [edsBranch, setEdsBranch] = useState('');
  const [edsRepo, setEdsRepo] = useState('');
  const [edsOwner, setEdsOwner] = useState('');

  // Update form when server changes
  useEffect(() => {
    if (server) {
      setName(server.name);
      setDescription(server.description || '');
      setUrl(server.url);
      setConnectionType(server.transport);
      
      // Load EDS config for local-managed servers
      if (server.serverType === 'local-managed' && server.edsConfig) {
        setEdsBranch(server.edsConfig.branch || '');
        setEdsRepo(server.edsConfig.repo || '');
        setEdsOwner(server.edsConfig.owner || '');
      } else {
        setEdsBranch('');
        setEdsRepo('');
        setEdsOwner('');
      }
    }
  }, [server]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setUrl('');
    setConnectionType('http');
    setError(null);
    setEdsBranch('');
    setEdsRepo('');
    setEdsOwner('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    console.log('[EditServerDialog] Submitting form...');

    if (!server) return;

    // Validate
    if (!name.trim()) {
      setError('Server name is required');
      return;
    }
    
    const isManaged = server.serverType === 'local-managed' || server.serverType === 'remote-managed';
    
    // Only validate URL for non-managed servers
    if (!isManaged && !url.trim()) {
      setError('Server URL is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const updates: Partial<MCPServer> = {
        name: name.trim(),
        description: description.trim() || undefined,
        // Only include url and transport for non-managed servers
        ...(isManaged ? {} : {
          url: url.trim(),
          transport: connectionType as 'http' | 'sse' | 'stdio'
        }),
        // Include EDS config for local-managed servers
        ...(server.serverType === 'local-managed' ? {
          edsConfig: edsBranch && edsRepo && edsOwner ? {
            branch: edsBranch.trim(),
            repo: edsRepo.trim(),
            owner: edsOwner.trim()
          } : undefined
        } : {})
      };

      await onSave(server.id, updates);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update server');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!server || !isOpen) return null;

  const isLocalManaged = server.serverType === 'local-managed';
  const isManaged = server.serverType === 'local-managed' || server.serverType === 'remote-managed';

  // Validation: Check if required fields are filled
  const isFormValid = (() => {
    // Server name is always required
    if (!name.trim()) return false;

    // For local-managed servers, EDS config fields are required
    if (isLocalManaged) {
      if (!edsBranch.trim() || !edsRepo.trim() || !edsOwner.trim()) return false;
    }

    // For non-managed servers, URL is required
    if (!isManaged && !url.trim()) return false;

    return true;
  })();

  return (
    <DialogContainer onDismiss={handleClose}>
      <Dialog
        size={isLocalManaged ? 'XL' : 'L'}
      >
        <Heading slot="title">Edit {server.name}</Heading>
        <Content>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isLocalManaged ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateAreas: '"left divider right"',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 24
                }}>
                  {/* Left Column: Basic Information */}
                  <div style={{ gridArea: 'left' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h4 className={style({ font: 'heading', margin: 0 })}>Basic Information</h4>

                      <TextField
                        label="Name"
                        value={name}
                        onChange={setName}
                        isRequired
                        autoFocus
                        UNSAFE_style={{ width: '100%' }}
                        maxLength={128}
                        isInvalid={!name.trim() || name.length > 128}
                        description={`${name.length}/128 characters`}
                      />

                      <TextArea
                        label="Description"
                        value={description}
                        onChange={setDescription}
                        UNSAFE_style={{ width: '100%', height: 120 }}
                        maxLength={512}
                        isInvalid={description.length > 512}
                        description={`${description.length}/512 characters`}
                      />

                      <TextField
                        label="Server URL"
                        value={url}
                        onChange={setUrl}
                        isRequired
                        isDisabled
                        description={`The HTTP endpoint URL (e.g., http://localhost:${import.meta.env.LCB_SERVER_PORT || '7676'}/mcp-server)`}
                        UNSAFE_style={{ width: '100%' }}
                      />

                      <Picker
                        label="Connection Type"
                        selectedKey={connectionType}
                        onSelectionChange={(key) => setConnectionType(key as string)}
                        isRequired
                        isDisabled
                        UNSAFE_style={{ width: '100%' }}
                      >
                        <PickerItem id="http">Streamable HTTP</PickerItem>
                        <PickerItem id="sse">SSE</PickerItem>
                        <PickerItem id="stdio">STDIO</PickerItem>
                      </Picker>
                    </div>
                  </div>

                  {/* Vertical Divider */}
                  <Divider size="S" orientation="vertical" UNSAFE_style={{ gridArea: 'divider' }} />

                  {/* Right Column: EDS Configuration */}
                  <div style={{ gridArea: 'right' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h4 className={style({ font: 'heading', margin: 0 })}>EDS Configuration</h4>

                      <TextField
                        label="EDS Branch"
                        value={edsBranch}
                        onChange={setEdsBranch}
                        UNSAFE_style={{ width: '100%' }}
                        maxLength={128}
                        isRequired
                        isInvalid={!edsBranch.trim() || edsBranch.length > 128}
                        description={`${edsBranch.length}/128 characters - Branch name (e.g., branch-001)`}
                      />
                      <TextField
                        label="EDS Repository"
                        value={edsRepo}
                        onChange={setEdsRepo}
                        UNSAFE_style={{ width: '100%' }}
                        maxLength={128}
                        isRequired
                        isInvalid={!edsRepo.trim() || edsRepo.length > 128}
                        description={`${edsRepo.length}/128 characters - Repository name (e.g., repo-001)`}
                      />
                      <TextField
                        label="EDS Owner"
                        value={edsOwner}
                        onChange={setEdsOwner}
                        UNSAFE_style={{ width: '100%' }}
                        maxLength={128}
                        isRequired
                        isInvalid={!edsOwner.trim() || edsOwner.length > 128}
                        description={`${edsOwner.length}/128 characters - Owner/organization name (e.g., owner-001)`}
                      />

                      {/* GitHub URL with clickable icon */}
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'end' }}>
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="GitHub URL"
                            value={edsBranch && edsRepo && edsOwner ? `https://github.com/${edsOwner}/${edsRepo}/tree/${edsBranch}` : ''}
                            isDisabled
                            UNSAFE_style={{ width: '100%' }}
                            description="Auto-generated from EDS configuration"
                          />
                        </div>
                        {edsBranch && edsRepo && edsOwner && (
                          <ActionButton
                            isQuiet
                            onPress={() => window.open(`https://github.com/${edsOwner}/${edsRepo}/tree/${edsBranch}`, '_blank')}
                            aria-label="Open GitHub URL in new tab"
                            UNSAFE_className="link-button"
                            UNSAFE_style={{ marginBottom: '28px' }}
                          >
                            <LinkOut />
                          </ActionButton>
                        )}
                      </div>

                      {/* EDS URL with clickable icon */}
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'end' }}>
                        <div style={{ flex: 1 }}>
                          <TextField
                            label="EDS URL"
                            value={edsBranch && edsRepo && edsOwner ? `https://${edsBranch}--${edsRepo}--${edsOwner}.aem.page` : ''}
                            isDisabled
                            UNSAFE_style={{ width: '100%' }}
                            description="Auto-generated from EDS configuration"
                          />
                        </div>
                        {edsBranch && edsRepo && edsOwner && (
                          <ActionButton
                            isQuiet
                            onPress={() => window.open(`https://${edsBranch}--${edsRepo}--${edsOwner}.aem.page`, '_blank')}
                            aria-label="Open EDS URL in new tab"
                            UNSAFE_className="link-button"
                            UNSAFE_style={{ marginBottom: '28px' }}
                          >
                            <LinkOut />
                          </ActionButton>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Server Name */}
                <TextField
                  label="Name"
                  value={name}
                  onChange={setName}
                  isRequired
                  autoFocus
                  UNSAFE_style={{ width: '100%' }}
                  maxLength={128}
                  isInvalid={!name.trim() || name.length > 128}
                  description={`${name.length}/128 characters`}
                />

                {/* Description */}
                <TextArea
                  label="Description"
                  value={description}
                  onChange={setDescription}
                  UNSAFE_style={{ width: '100%', height: 120 }}
                  maxLength={512}
                  isInvalid={description.length > 512}
                  description={`${description.length}/512 characters`}
                />

                {/* Server URL */}
                <TextField
                  label="Server URL"
                  value={url}
                  onChange={setUrl}
                  isRequired
                  isDisabled={server.serverType === 'remote-managed'}
                  isInvalid={!url.trim() || url.length > 256}
                  description={`The HTTP endpoint URL (e.g., http://localhost:${import.meta.env.LCB_SERVER_PORT || '7676'}/mcp-server)`}
                  UNSAFE_style={{ width: '100%' }}
                />

                {/* Connection Type - Dropdown */}
                <Picker
                  label="Connection Type"
                  selectedKey={connectionType}
                  onSelectionChange={(key) => setConnectionType(key as string)}
                  isRequired
                  isDisabled={server.serverType === 'remote-managed'}
                  UNSAFE_style={{ width: '100%' }}
                >
                  <PickerItem id="http">Streamable HTTP</PickerItem>
                  <PickerItem id="sse">SSE</PickerItem>
                  <PickerItem id="stdio">STDIO</PickerItem>
                </Picker>
              </div>
            )}

            {/* Error message */}
            {error && (
              <span className={style({ color: 'red-600' })}>
                {error}
              </span>
            )}
          </div>
        </Content>

        <ButtonGroup>
          <Button variant="secondary" onPress={handleClose} isDisabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="accent"
            onPress={handleSubmit}
            isDisabled={isSubmitting || !isFormValid}
            autoFocus
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogContainer>
  );
}
