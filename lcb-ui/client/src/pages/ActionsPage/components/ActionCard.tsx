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

import { useState } from 'react';
import { Text, ActionButton, Button, Badge } from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Edit from '@react-spectrum/s2/icons/Edit';
import Send from '@react-spectrum/s2/icons/Send';
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown';
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight';
import ViewDetailIcon from '@react-spectrum/s2/icons/InfoCircle';
import type { MCPTool, MCPResource } from '../../../../../shared/types';
import WidgetSection from './WidgetSection';

interface ActionCardProps {
  action: MCPTool;
  widget?: MCPResource | null;
  draftActionNames: Set<string>;
  isLocalManaged: boolean;
  onEdit: () => void;
  onExecute: () => void;
}

// Get single badge to display based on priority
const getBadgeToShow = (action: MCPTool, draftActionNames: Set<string>) => {
  if (action.deleted) return { text: 'DELETED', variant: 'negative' as const };
  if (action.discovered) return { text: 'DISCOVERED', variant: 'purple' as const };
  if (action.deployed === false) return { text: 'NOT DEPLOYED', variant: 'yellow' as const };
  if (action.draft || draftActionNames.has(action.name)) return { text: 'UPDATED', variant: 'blue' as const };
  return null;
};

export default function ActionCard({
  action,
  widget,
  draftActionNames,
  isLocalManaged,
  onEdit,
  onExecute
}: ActionCardProps) {
  const [isWidgetExpanded, setIsWidgetExpanded] = useState(false);
  const badge = getBadgeToShow(action, draftActionNames);
  const hasWidget = !!widget || !!action._meta?.['openai/outputTemplate'];
  const hasUncommittedChanges = action.draft === true ||
                                 (action && 'deployed' in action && action.deployed === false) ||
                                 !!action.deleted;

  return (
    <div
      className={style({
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'gray-200',
        borderRadius: 'lg',
        backgroundColor: 'base',
        overflow: 'hidden',
      })}
      style={{
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Card Header */}
      <div
        className={style({
          padding: 20,
        })}
        style={{
          backgroundColor: action.deleted ? 'var(--spectrum-global-color-gray-75)' : 'var(--spectrum-global-color-gray-50)',
        }}
      >
        <div className={style({ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'start', gap: 12 })}>
          {/* Left side: Icon + Title + Description */}
          <div className={style({ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 })}>
            <div className={style({ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' })}>
              {hasWidget && (
                <ViewDetailIcon UNSAFE_style={{ flexShrink: 0, color: 'var(--spectrum-global-color-blue-600)' }} />
              )}
              <Text
                styles={style({ font: 'heading', fontWeight: 'bold' })}
                UNSAFE_style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {action.name}
              </Text>
              {badge && (
                <Badge variant={badge.variant}>{badge.text}</Badge>
              )}
            </div>
            {action.description && (
              <Text
                styles={style({ font: 'body-sm', color: 'gray-700' })}
                UNSAFE_style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {action.description}
              </Text>
            )}
          </div>

          {/* Right side: Action Buttons */}
          <div className={style({ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', flexShrink: 0 })}>
            {!action.deleted && isLocalManaged && (
              <ActionButton
                aria-label="Edit action"
                onPress={onEdit}
                isQuiet
              >
                <Edit />
              </ActionButton>
            )}
            
            {!action.deleted && (
              hasUncommittedChanges ? (
                <Button
                  variant="secondary"
                  size="M"
                  isDisabled
                  UNSAFE_style={{ opacity: 0.5 }}
                  aria-label="Cannot execute - uncommitted changes"
                >
                  <Send />
                  <Text>Execute</Text>
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="M"
                  onPress={onExecute}
                  aria-label="Execute action"
                >
                  <Send />
                  <Text>Execute</Text>
                </Button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Widget Section (Expandable) */}
      {hasWidget && (
        <>
          <div
            className={style({
              borderTopWidth: 1,
              borderTopColor: 'gray-200',
              padding: 12,
              backgroundColor: 'gray-50',
            })}
            style={{
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onClick={() => setIsWidgetExpanded(!isWidgetExpanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-100)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-50)';
            }}
          >
            <div className={style({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 })}>
              {isWidgetExpanded ? <ChevronDown /> : <ChevronRight />}
              <Text styles={style({ font: 'body', fontWeight: 'bold' })}>
                Widget
              </Text>
              {widget && widget.draft && (
                <Badge variant="blue">UPDATED</Badge>
              )}
              {widget && widget.deployed === false && (
                <Badge variant="yellow">NOT DEPLOYED</Badge>
              )}
            </div>
          </div>

          {isWidgetExpanded && widget && (
            <WidgetSection
              widget={widget}
            />
          )}
        </>
      )}
    </div>
  );
}

