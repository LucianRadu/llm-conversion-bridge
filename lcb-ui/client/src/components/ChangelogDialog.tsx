import { useState, useEffect } from 'react';
import GenericHistoryModal from './GenericHistoryModal';
import type { ChangelogEntry } from '../../../shared/types';

interface ChangelogDialogProps {
  isOpen: boolean;
  entries: ChangelogEntry[];
  onClose: () => void;
}

export default function ChangelogDialog({
  isOpen,
  entries,
  onClose
}: ChangelogDialogProps) {
  const [selectedEntry, setSelectedEntry] = useState<ChangelogEntry | null>(null);

  const sortedEntries = [...entries].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  useEffect(() => {
    if (isOpen && sortedEntries.length > 0) {
      setSelectedEntry(sortedEntries[0]);
    }
  }, [isOpen]);

  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      action_added: 'Action Added',
      action_modified: 'Action Modified',
      action_deleted: 'Action Deleted',
      action_name_changed: 'Name Changed',
      action_description_changed: 'Description Changed',
      field_added: 'Field Added',
      field_modified: 'Field Modified',
      field_deleted: 'Field Deleted',
      field_type_changed: 'Field Type Changed',
      field_required_changed: 'Field Required Changed',
      resource_added: 'Resource Added',
      resource_modified: 'Resource Modified',
      resource_deleted: 'Resource Deleted',
      resource_name_changed: 'Resource Name Changed',
      resource_description_changed: 'Resource Description Changed',
      resource_uri_changed: 'Resource URI Changed',
      resource_mimetype_changed: 'Resource MIME Type Changed'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string): string => {
    const typeStr = String(type || '');
    if (typeStr.includes('added')) return 'var(--spectrum-global-color-green-600)';
    if (typeStr.includes('deleted')) return 'var(--spectrum-global-color-red-600)';
    if (typeStr.includes('modified') || typeStr.includes('changed')) return 'var(--spectrum-global-color-orange-600)';
    return 'var(--spectrum-global-color-gray-700)';
  };

  const renderListItem = (entry: ChangelogEntry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{
        fontWeight: 'bold',
        color: getTypeColor(entry.type),
        fontSize: '14px'
      }}>
        {getTypeLabel(entry.type)}
      </span>
      <span style={{
        fontSize: '12px',
        color: 'var(--spectrum-global-color-gray-600)'
      }}>
        {formatTimestamp(entry.timestamp)}
      </span>
    </div>
  );

  const renderDetails = (entry: ChangelogEntry) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <span style={{ fontSize: '14px' }}>
        {entry.description}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {entry.actionName && (
          <span style={{
            fontSize: '12px',
            color: 'var(--spectrum-global-color-gray-700)'
          }}>
            <strong>Action:</strong> {entry.actionName}
          </span>
        )}

        {entry.resourceUri && (
          <span style={{
            fontSize: '12px',
            color: 'var(--spectrum-global-color-gray-700)'
          }}>
            <strong>Resource:</strong> {entry.resourceUri}
          </span>
        )}

        {entry.fieldName && (
          <span style={{
            fontSize: '12px',
            color: 'var(--spectrum-global-color-gray-700)'
          }}>
            <strong>Field:</strong> {entry.fieldName}
          </span>
        )}

        {entry.oldValue !== undefined && (
          <span style={{
            fontSize: '12px',
            color: 'var(--spectrum-global-color-gray-700)'
          }}>
            <strong>Old:</strong> {typeof entry.oldValue === 'object'
              ? JSON.stringify(entry.oldValue)
              : String(entry.oldValue || '')}
          </span>
        )}

        {entry.newValue !== undefined && (
          <span style={{
            fontSize: '12px',
            color: 'var(--spectrum-global-color-gray-700)'
          }}>
            <strong>New:</strong> {typeof entry.newValue === 'object'
              ? JSON.stringify(entry.newValue)
              : String(entry.newValue || '')}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <GenericHistoryModal
      isOpen={isOpen}
      title={`Uncommitted Changes (${sortedEntries.length})`}
      items={sortedEntries}
      selectedItem={selectedEntry}
      onItemSelect={setSelectedEntry}
      onClose={onClose}
      renderListItem={renderListItem}
      renderDetails={renderDetails}
      emptyMessage="No uncommitted changes in this session"
    />
  );
}
