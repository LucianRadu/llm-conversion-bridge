import { useState, useEffect } from 'react';
import {
  Dialog,
  Heading,
  Divider,
  Content,
  ButtonGroup,
  Button,
  Text,
  TreeView,
  TreeViewItem,
  TreeViewItemContent
} from '@react-spectrum/s2';
import Folder from '@react-spectrum/s2/icons/Folder';
import FileText from '@react-spectrum/s2/icons/FileText';
import { apiClient } from '../../../services/api';
import { ACTION_META } from '../../../constants/actionMeta';

/**
 * EDS Action Delete Dialog Component
 * Shows file tree and associated resource warning for EDS actions
 */
interface EDSActionDeleteDialogProps {
  actionName: string;
  serverId: string;
  action: any;  // The full action object to access metadata
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EDSActionDeleteDialog({ actionName, serverId, action, onConfirm, onCancel }: EDSActionDeleteDialogProps) {
  const [associatedResource, setAssociatedResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssociatedResource = async () => {
      try {
        setLoading(true);
        // Fetch resources from BOTH live MCP server AND database
        // (widget resources from never-deployed actions only exist in database)
        const [liveResources, dbResources] = await Promise.all([
          apiClient.getResourcesForServer(serverId).catch(() => []),
          apiClient.getWidgetResources(serverId).catch(() => [])
        ]);

        const allResources = [...liveResources, ...dbResources];

        // Try multiple ways to find the associated resource (same logic as in handleDeleteAction)
        let resource = allResources.find((r: any) => r.actionName === actionName);

        if (!resource && action?._meta?.[ACTION_META.OUTPUT_TEMPLATE]) {
          // Try matching by outputTemplate URI
          const outputTemplateUri = action._meta[ACTION_META.OUTPUT_TEMPLATE];
          resource = allResources.find((r: any) => r.uri === outputTemplateUri);
        }

        if (!resource) {
          // Try extracting action name from URI pattern
          resource = allResources.find((r: any) => {
            if (!r.uri) return false;
            const match = r.uri.match(/\/([^/]+)\.html$/);
            return match && match[1] === actionName;
          });
        }

        setAssociatedResource(resource);
      } catch (error) {
        console.error('Failed to fetch associated resource:', error);
      } finally {
        setLoading(false);
      }
    };

    if (actionName && serverId) {
      fetchAssociatedResource();
    }
  }, [actionName, serverId, action]);

  return (
    <Dialog>
      <Heading>Delete Action</Heading>
      <Divider />
      <Content>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Text>
            Are you sure you want to delete the action "{actionName}"? This action will be marked for deletion and can be restored before deployment.
          </Text>

          {/* Warning Box for Associated Resource */}
          {!loading && associatedResource && (
            <div
              style={{
                border: '1px solid var(--spectrum-global-color-orange-500)',
                borderRadius: '4px',
                padding: '16px',
                backgroundColor: 'var(--spectrum-global-color-orange-100)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--spectrum-global-color-orange-900)' }}>
                  <Text>⚠️ Deleting this action will also delete the associated EDS Widget resource: {associatedResource.name}</Text>
                </div>
                <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--spectrum-global-color-gray-700)' }}>
                  <Text>Note: This will not delete the actual block in EDS.</Text>
                </div>
              </div>
            </div>
          )}

          {/* Warning Box for Permanent Deletion */}
          <div
            style={{
              border: '1px solid var(--spectrum-global-color-red-500)',
              borderRadius: '4px',
              padding: '16px',
              backgroundColor: 'var(--spectrum-global-color-red-100)'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontWeight: 'bold', color: 'var(--spectrum-global-color-red-700)' }}>
                <Text>Warning: Files will be permanently deleted on deployment</Text>
              </div>
              <div style={{ fontSize: '14px' }}>
                <Text>The following files and folders will be permanently removed from the server during deployment:</Text>
              </div>
            </div>
          </div>

          {/* File Tree Preview */}
          <div
            style={{
              backgroundColor: 'var(--spectrum-global-color-gray-50)',
              border: '1px solid var(--spectrum-global-color-gray-300)',
              borderRadius: '6px',
              padding: '16px',
              cursor: 'default'
            }}
            className="tree-preview-container"
          >
            <TreeView
              aria-label="Files to be deleted"
              defaultExpandedKeys={['root', 'action-folder', 'widget-folder']}
              UNSAFE_style={{ maxWidth: '100%' }}
              disabledKeys={['root', 'action-folder', 'schema', 'index', 'widget-folder', 'widget-index', 'widget-template', 'widget-schema']}
            >
              <TreeViewItem id="root" textValue="lcb-server">
                <TreeViewItemContent>
                  <div style={{ color: '#000000' }}><Text>lcb-server/server/src/actions/</Text></div>
                  <Folder />
                </TreeViewItemContent>
                <TreeViewItem id="action-folder" textValue={actionName}>
                  <TreeViewItemContent>
                    <div style={{ color: '#000000' }}><Text>{actionName}/</Text></div>
                    <Folder />
                  </TreeViewItemContent>
                  <TreeViewItem id="schema" textValue="schema.json">
                    <TreeViewItemContent>
                      <div style={{ color: '#000000' }}><Text>schema.json</Text></div>
                      <FileText />
                    </TreeViewItemContent>
                  </TreeViewItem>
                  <TreeViewItem id="index" textValue="index.ts">
                    <TreeViewItemContent>
                      <div style={{ color: '#000000' }}><Text>index.ts</Text></div>
                      <FileText />
                    </TreeViewItemContent>
                  </TreeViewItem>
                  <TreeViewItem id="widget-folder" textValue="widget">
                    <TreeViewItemContent>
                      <div style={{ color: '#000000' }}><Text>widget/</Text></div>
                      <Folder />
                    </TreeViewItemContent>
                    <TreeViewItem id="widget-index" textValue="index.ts">
                      <TreeViewItemContent>
                        <div style={{ color: '#000000' }}><Text>index.ts</Text></div>
                        <FileText />
                      </TreeViewItemContent>
                    </TreeViewItem>
                    <TreeViewItem id="widget-template" textValue="template.html">
                      <TreeViewItemContent>
                        <div style={{ color: '#000000' }}><Text>template.html</Text></div>
                        <FileText />
                      </TreeViewItemContent>
                    </TreeViewItem>
                    <TreeViewItem id="widget-schema" textValue="widget-schema.json">
                      <TreeViewItemContent>
                        <div style={{ color: '#000000' }}><Text>widget-schema.json</Text></div>
                        <FileText />
                      </TreeViewItemContent>
                    </TreeViewItem>
                  </TreeViewItem>
                </TreeViewItem>
              </TreeViewItem>
            </TreeView>
          </div>
        </div>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        <Button
          variant="negative"
          onPress={onConfirm}
          isDisabled={loading}
        >
          Delete
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}
