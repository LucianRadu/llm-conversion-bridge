import { useState } from 'react';
import {
  DialogContainer,
  Dialog,
  Heading,
  Content,
  TextField,
  TextArea,
  Picker,
  PickerItem,
  Button,
  ButtonGroup
} from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import type { MCPServer } from '../../../../../shared/types';

interface AddLcbServerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (server: Omit<MCPServer, 'status'>) => Promise<void>;
}

export default function AddLcbServerDialog({ isOpen, onClose, onAdd }: AddLcbServerDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [connectionType, setConnectionType] = useState('http');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setUrl('');
    setConnectionType('http');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    console.log('[AddLcbServerDialog] Submitting form...');

    // Validate
    if (!name.trim()) {
      setError('Server name is required');
      return;
    }
    if (!url.trim()) {
      setError('Server URL is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Generate ID from name (lowercase, replace spaces with hyphens)
      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const newServer: Omit<MCPServer, 'status'> = {
        id,
        name: name.trim(),
        description: description.trim() || undefined,
        url: url.trim(),
        transport: connectionType as 'http' | 'sse' | 'stdio'
      };

      await onAdd(newServer);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <DialogContainer onDismiss={handleClose}>
      <Dialog>
        <Heading slot="title">Add Server</Heading>
        <Content>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Name */}
            <TextField
              label="Name"
              value={name}
              onChange={setName}
              isRequired
              autoFocus
              UNSAFE_style={{ width: '100%' }}
              maxLength={128}
              description={`${name.length}/128 characters`}
              placeholder="adobe-store-lcb"
            />

            {/* Description */}
            <TextArea
              label="Description"
              value={description}
              onChange={setDescription}
              maxLength={512}
              description={`${description.length}/512 characters`}
              UNSAFE_style={{ minHeight: '150px' }}
            />

            {/* URL */}
            <TextField
              label="URL"
              value={url}
              onChange={setUrl}
              isRequired
              maxLength={256}
              description={`${url.length}/256 characters`}
              UNSAFE_style={{ width: '100%' }}
              placeholder={`e.g., http://localhost:${import.meta.env.LCB_SERVER_PORT || '7676'}/mcp`}
            />

            {/* Connection Type - Dropdown */}
            <Picker
              label="Connection Type"
              selectedKey={connectionType}
              onSelectionChange={(key) => setConnectionType(key as string)}
              isRequired
              UNSAFE_style={{ width: '100%' }}
              disabledKeys={['sse', 'stdio']}
            >
              <PickerItem id="http">Streamable HTTP</PickerItem>
              <PickerItem id="sse">SSE</PickerItem>
              <PickerItem id="stdio">STDIO</PickerItem>
            </Picker>

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
            isDisabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogContainer>
  );
}
