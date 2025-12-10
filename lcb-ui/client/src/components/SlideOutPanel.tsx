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

import { useEffect, ReactNode } from 'react';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import { ActionButton } from '@react-spectrum/s2';
import Close from '@react-spectrum/s2/icons/Close';

interface SlideOutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string; // Default: 60%
  title?: string;
}

export default function SlideOutPanel({
  isOpen,
  onClose,
  children,
  width = '60%',
  title
}: SlideOutPanelProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll when panel is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={style({
          position: 'fixed',
          inset: 0,
          backgroundColor: '[rgba(0, 0, 0, 0.5)]',
          zIndex: '[99998]',
        })}
        onClick={onClose}
        style={{
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Panel */}
      <div
        className={style({
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'base',
          zIndex: '[99999]',
          boxShadow: 'elevated',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        })}
        style={{
          width: width,
          animation: 'slideInRight 0.3s ease-out',
          marginTop: '80px', // Add margin to start below header
        }}
      >
        {/* Header */}
        {title && (
          <div
            className={style({
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 24,
              borderBottomWidth: 1,
              borderBottomColor: 'gray-200',
            })}
          >
            <h2
              className={style({
                font: 'heading-xl',
                fontWeight: 'bold',
                margin: 0,
              })}
            >
              {title}
            </h2>
            <ActionButton
              aria-label="Close panel"
              onPress={onClose}
              isQuiet
            >
              <Close />
            </ActionButton>
          </div>
        )}

        {/* Content */}
        <div
          className={style({
            flex: 1,
            overflow: 'auto',
          })}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}

