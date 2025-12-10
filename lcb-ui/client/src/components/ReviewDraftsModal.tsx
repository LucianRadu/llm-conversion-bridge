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

import { useEffect, useState } from 'react';
import {
  Text,
  ActionButton,
  ProgressCircle,
  Badge
} from '@react-spectrum/s2';
import Export from '@react-spectrum/s2/icons/Export';
import Alert from '@react-spectrum/s2/icons/AlertTriangle';
import type { MCPTool } from '../../../shared/types';
import { apiClient } from '../services/api';
import { toastService } from '../services/toast';
import GenericHistoryModal from './GenericHistoryModal';

interface ReviewDraftsModalProps {
  serverId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Extend MCPTool to include id for GenericHistoryModal
interface DraftItem extends MCPTool {
  id: string;
  timestamp: string;
}

export default function ReviewDraftsModal({ serverId, isOpen, onClose }: ReviewDraftsModalProps) {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<DraftItem | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDrafts = async () => {
    setLoading(true);
    try {
      // Load modified drafts, newly created actions, and deleted actions
      const modifiedDrafts = await apiClient.getActionDrafts(serverId);
      const allActions = await apiClient.getActions(serverId);

      // Create mutually exclusive filters to avoid duplicates:
      // 1. Deleted actions (deleted: true) - highest priority
      // 2. Newly created actions (deployed: false AND NOT deleted) - second priority
      // 3. Modified drafts (from drafts collection) - third priority
      const deletedActions = allActions.filter(a => a.deleted === true);
      const newlyCreatedActions = allActions.filter(a => a.deployed === false && a.deleted !== true);

      // Combine all types of uncommitted changes and add id + timestamp
      const allDrafts: DraftItem[] = [...deletedActions, ...newlyCreatedActions, ...modifiedDrafts].map((draft) => ({
        ...draft,
        id: draft.name,
        timestamp: new Date().toISOString()
      }));

      setDrafts(allDrafts);
      // Auto-select first draft
      if (allDrafts.length > 0) {
        setSelectedDraft(allDrafts[0]);
      }
    } catch (e) {
      toastService.error('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDrafts();
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

  const handleExport = (draft: DraftItem) => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.name}-draft.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render functions for GenericHistoryModal
  const renderListItem = (draft: DraftItem) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}><Text>{draft.name}</Text></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {draft.deleted === true && <Badge variant="negative">DELETED</Badge>}
        {draft.deployed === false && !draft.deleted && <Badge variant="yellow">NOT DEPLOYED</Badge>}
        {draft.draft && !draft.deleted && draft.deployed !== false && <Badge variant="blue">UPDATED</Badge>}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
        <Text>{formatTimestamp(draft.timestamp)}</Text>
      </div>
    </div>
  );

  const renderDetails = (draft: DraftItem) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontWeight: 600, fontSize: '18px' }}><Text>{draft.name}</Text></div>
          <div style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)' }}>
            <Text>{draft.description || 'No description'}</Text>
          </div>
        </div>
        <ActionButton isQuiet onPress={() => handleExport(draft)} aria-label="Export draft">
          <Export />
        </ActionButton>
      </div>

      {draft.deleted === true && draft.hasEdsWidget && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            alignItems: 'center',
            backgroundColor: 'var(--spectrum-global-color-red-100)',
            padding: '12px',
            borderRadius: '4px'
          }}
        >
          <Alert UNSAFE_style={{ color: 'var(--spectrum-global-color-red-700)' }} />
          <div style={{ fontSize: '12px', color: 'var(--spectrum-global-color-red-700)' }}>
            <Text>Associated EDS Widget will also be deleted</Text>
          </div>
        </div>
      )}

      {/* JSON Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontWeight: 600 }}>
            <Text>{draft.deployed === false ? 'Will create:' : 'Will update:'}</Text>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--spectrum-global-color-gray-800)' }}>
            <Text>lcb-server/server/src/actions/{draft.name}/schema.json</Text>
          </div>
        </div>
        <div
          style={{
            backgroundColor: '#F5F5F5',
            padding: '16px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #D3D3D3'
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(draft, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <GenericHistoryModal
        isOpen={isOpen}
        title="Review Drafts"
        items={[]}
        selectedItem={null}
        onItemSelect={() => {}}
        onClose={onClose}
        renderListItem={() => null}
        renderDetails={() => (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
            <ProgressCircle isIndeterminate aria-label="Loading drafts" />
            <Text>Loading drafts…</Text>
          </div>
        )}
        emptyMessage="Loading drafts..."
      />
    );
  }

  return (
    <GenericHistoryModal
      isOpen={isOpen}
      title={`Review Drafts (${drafts.length})`}
      items={drafts}
      selectedItem={selectedDraft}
      onItemSelect={setSelectedDraft}
      onClose={onClose}
      renderListItem={renderListItem}
      renderDetails={renderDetails}
      emptyMessage="No drafts available"
    />
  );
}


