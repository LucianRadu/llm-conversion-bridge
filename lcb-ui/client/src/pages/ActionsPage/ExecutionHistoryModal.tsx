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

import { Button, Dialog, DialogContainer, Content, Heading, Text, ActionButton } from "@react-spectrum/s2";
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Copy from '@react-spectrum/s2/icons/Copy';
import type { HistoryEntry } from '../../services/history';

interface ExecutionHistoryModalProps {
  isOpen: boolean;
  history: HistoryEntry[];
  selectedHistoryEntry: HistoryEntry | null;
  onDismiss: () => void;
  onSelectEntry: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export default function ExecutionHistoryModal({
  isOpen,
  history,
  selectedHistoryEntry,
  onDismiss,
  onSelectEntry,
  onClear
}: ExecutionHistoryModalProps) {
  return (
    <DialogContainer onDismiss={onDismiss}>
      {isOpen && (
        <Dialog size="XL" isDismissible>
          {({close}) => (
            <>
              <Heading slot="title">
                Execution History ({history.length})
              </Heading>
              <Content styles={style({ padding: 24 })}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', height: '60vh', overflow: 'hidden' }}>
                {/* LEFT: History List (30%) */}
                <div style={{ width: '30%', borderRight: '1px solid var(--spectrum-global-color-gray-300)', overflowY: 'auto', paddingRight: '16px' }}>
                  {history.length === 0 ? (
                    <Text>No execution history</Text>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {history.map((entry, index) => {
                        const isSelected = selectedHistoryEntry?.id === entry.id;
                        return (
                        <div
                          key={entry.id}
                          style={{
                            border: isSelected ? '2px solid var(--spectrum-global-color-blue-600)' : '1px solid var(--spectrum-global-color-gray-400)',
                            borderRadius: '8px',
                            padding: '12px',
                            backgroundColor: isSelected ? 'var(--spectrum-global-color-blue-100)' : 'var(--spectrum-global-color-gray-50)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 2px 8px rgba(20, 115, 230, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.08)'
                          }}
                          onClick={() => onSelectEntry(entry)}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-100)';
                              e.currentTarget.style.borderColor = 'var(--spectrum-global-color-gray-500)';
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-50)';
                              e.currentTarget.style.borderColor = 'var(--spectrum-global-color-gray-400)';
                              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
                            }
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <Text styles={style({ font: 'code-sm', fontWeight: 'bold' })}>
                              {history.length - index}. {entry.operationName}
                            </Text>
                            <Text styles={style({ font: 'body-xs' })} UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }}>
                              {entry.timestamp.toLocaleTimeString()}
                            </Text>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT: Details (70%) */}
                <div style={{ width: '70%', overflowY: 'auto', paddingLeft: '16px', maxWidth: '100%' }}>
                  {selectedHistoryEntry ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Request Section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })}>
                          Request
                        </Text>
                        <div
                          style={{ position: 'relative' }}
                          onMouseEnter={(e) => {
                            const btn = e.currentTarget.querySelector('.copy-button-history-request') as HTMLElement;
                            if (btn) btn.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            const btn = e.currentTarget.querySelector('.copy-button-history-request') as HTMLElement;
                            if (btn) btn.style.opacity = '0';
                          }}
                        >
                          <div
                            style={{
                              border: '1px solid #333',
                              borderRadius: '4px',
                              padding: '16px',
                              backgroundColor: 'var(--spectrum-global-color-gray-800)',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              color: 'var(--spectrum-global-color-gray-50)',
                              overflowX: 'auto',
                              overflowY: 'auto',
                              maxHeight: '25vh',
                              maxWidth: '100%'
                            }}
                          >
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {JSON.stringify(selectedHistoryEntry.request, null, 2)}
                            </pre>
                          </div>
                          <ActionButton
                            onPress={() => {
                              navigator.clipboard.writeText(JSON.stringify(selectedHistoryEntry.request, null, 2));
                            }}
                            isQuiet
                            UNSAFE_className="copy-button-history-request"
                            UNSAFE_style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              opacity: '0',
                              transition: 'opacity 0.2s ease',
                              color: '#ffffff'
                            }}
                          >
                            <Copy />
                          </ActionButton>
                        </div>
                      </div>

                      {/* Response Section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Text styles={style({ font: 'body-lg', fontWeight: 'bold' })}>
                          Response
                        </Text>
                        <div
                          style={{ position: 'relative' }}
                          onMouseEnter={(e) => {
                            const btn = e.currentTarget.querySelector('.copy-button-history-response') as HTMLElement;
                            if (btn) btn.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            const btn = e.currentTarget.querySelector('.copy-button-history-response') as HTMLElement;
                            if (btn) btn.style.opacity = '0';
                          }}
                        >
                          <div
                            style={{
                              border: '1px solid #333',
                              borderRadius: '4px',
                              padding: '16px',
                              backgroundColor: 'var(--spectrum-global-color-gray-800)',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              color: 'var(--spectrum-global-color-gray-50)',
                              overflowX: 'auto',
                              maxHeight: '45vh',
                              overflowY: 'auto'
                            }}
                          >
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {JSON.stringify(selectedHistoryEntry.response, null, 2)}
                            </pre>
                          </div>
                          <ActionButton
                            onPress={() => {
                              navigator.clipboard.writeText(JSON.stringify(selectedHistoryEntry.response, null, 2));
                            }}
                            isQuiet
                            UNSAFE_className="copy-button-history-response"
                            UNSAFE_style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              opacity: '0',
                              transition: 'opacity 0.2s ease',
                              color: '#ffffff'
                            }}
                          >
                            <Copy />
                          </ActionButton>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Text>Select a history entry to view details</Text>
                  )}
                </div>
              </div>

              {/* Buttons - INSIDE Content at bottom */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <Button variant="secondary" onPress={close}>
                  <Text>Cancel</Text>
                </Button>
                <Button variant="accent" onPress={onClear} isDisabled={history.length === 0}>
                  <Text>Clear</Text>
                </Button>
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

