import {
  Dialog,
  Heading,
  Divider,
  Content,
  Button,
  ButtonGroup,
  Text,
  TreeView,
  TreeViewItem,
  TreeViewItemContent
} from '@react-spectrum/s2';
import Folder from '@react-spectrum/s2/icons/Folder';
import FileText from '@react-spectrum/s2/icons/FileText';

/**
 * Widgetless Action Delete Dialog Component
 * Shows file tree for actions without EDS widgets
 */
interface WidgetlessActionDeleteDialogProps {
  actionName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function WidgetlessActionDeleteDialog({ actionName, onConfirm, onCancel }: WidgetlessActionDeleteDialogProps) {
  return (
    <Dialog>
      <Heading>Delete Action</Heading>
      <Divider />
      <Content>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Text>
            Are you sure you want to delete the action "{actionName}"? This action will be marked for deletion and can be restored before deployment.
          </Text>

          {/* Warning Box */}
          <div
            style={{
              border: '1px solid var(--spectrum-global-color-red-500)',
              borderRadius: '4px',
              padding: '12px',
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
              backgroundColor: 'var(--spectrum-global-color-gray-100)',
              border: '1px solid var(--spectrum-global-color-gray-300)',
              borderRadius: '6px',
              padding: '12px',
              cursor: 'default'
            }}
            className="tree-preview-container"
          >
            <TreeView
              aria-label="Files to be deleted"
              defaultExpandedKeys={['root', 'action-folder']}
              UNSAFE_style={{ maxWidth: '100%' }}
              disabledKeys={['root', 'action-folder', 'schema', 'index']}
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
        >
          Delete
        </Button>
      </ButtonGroup>
    </Dialog>
  );
}
