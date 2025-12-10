import React, { useState } from 'react';
import {
  Dialog,
  DialogContainer,
  Content,
  Divider,
  Button,
  Text,
  Heading
} from '@react-spectrum/s2';
import Copy from '@react-spectrum/s2/icons/Copy';

// Generic history item interface - any object with id and timestamp
export interface HistoryItem {
  id: string;
  timestamp: any;
  [key: string]: any;
}

export interface GenericHistoryModalProps<T extends HistoryItem> {
  isOpen: boolean;
  title: string;
  items: T[];
  selectedItem: T | null;
  onItemSelect: (item: T) => void;
  onClose: () => void;

  // Render functions for customization
  renderListItem: (item: T) => React.ReactNode;
  renderDetails: (item: T) => React.ReactNode;

  // Optional
  onCopy?: (item: T) => Promise<void>;
  emptyMessage?: string;
}

export function GenericHistoryModal<T extends HistoryItem>({
  isOpen,
  title,
  items,
  selectedItem,
  onItemSelect,
  onClose,
  renderListItem,
  renderDetails,
  onCopy,
  emptyMessage = 'No items'
}: GenericHistoryModalProps<T>) {
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (!selectedItem || !onCopy) return;
    try {
      setCopying(true);
      await onCopy(selectedItem);
    } finally {
      setCopying(false);
    }
  };

  return (
    <DialogContainer onDismiss={onClose}>
      {isOpen && (
        <Dialog size="L" UNSAFE_style={{ width: '90vw', maxWidth: '90vw', height: '85vh', maxHeight: '85vh' }}>
          <Heading>{title}</Heading>
          <Divider />
          <Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', height: '60vh', overflow: 'hidden' }}>
                {/* LEFT: List (21%) */}
                <div style={{ width: '21%', borderRight: '1px solid #D3D3D3', overflowY: 'auto', paddingRight: '16px' }}>
                  {items.length === 0 ? (
                    <Text>{emptyMessage}</Text>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => onItemSelect(item)}
                          style={{
                            border: selectedItem?.id === item.id ? '2px solid #1473E6' : '1px solid #D3D3D3',
                            borderRadius: '8px',
                            padding: '12px',
                            backgroundColor: selectedItem?.id === item.id ? '#F0F7FF' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedItem?.id !== item.id) {
                              e.currentTarget.style.backgroundColor = '#F5F5F5';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedItem?.id !== item.id) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              onItemSelect(item);
                            }
                          }}
                        >
                          {renderListItem(item)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* RIGHT: Details (79%) */}
                <div style={{ width: '79%', overflowY: 'auto', paddingLeft: '16px', maxWidth: '100%' }}>
                  {selectedItem ? (
                    renderDetails(selectedItem)
                  ) : (
                    <Text>Select a history item to view details</Text>
                  )}
                </div>
              </div>

              {/* Buttons at bottom */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                {onCopy && selectedItem && (
                  <Button
                    variant="primary"
                    onPress={handleCopy}
                    isDisabled={copying}
                  >
                    <Copy /> Copy
                  </Button>
                )}
                <Button variant="secondary" onPress={onClose}>
                  Close
                </Button>
              </div>
            </div>
          </Content>
        </Dialog>
      )}
    </DialogContainer>
  );
}

export default GenericHistoryModal;
