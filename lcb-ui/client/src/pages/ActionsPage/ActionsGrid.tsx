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

import { Text, ProgressCircle } from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import type { MCPTool, MCPResource } from '../../../../shared/types';
import ActionCard from './components/ActionCard';

interface ActionsGridProps {
  tools: MCPTool[];
  widgets: Map<string, MCPResource>; // Map of action name -> widget
  draftActionNames: Set<string>;
  isLocalManaged: boolean;
  loading: boolean;
  onEdit: (action: MCPTool) => void;
  onExecute: (action: MCPTool) => void;
}

export default function ActionsGrid({
  tools,
  widgets,
  draftActionNames,
  isLocalManaged,
  loading,
  onEdit,
  onExecute
}: ActionsGridProps) {
  if (loading) {
    return (
      <div
        className={style({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        })}
      >
        <ProgressCircle aria-label="Loading actions" isIndeterminate />
        <Text UNSAFE_style={{ marginTop: '16px' }}>Loading actions...</Text>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div
        className={style({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          backgroundColor: 'gray-50',
          borderRadius: 'lg',
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: 'gray-200',
        })}
      >
        <Text styles={style({ font: 'heading', color: 'gray-600' })}>
          No actions available
        </Text>
        <Text styles={style({ font: 'body', color: 'gray-600', marginTop: 8 })}>
          Create a new action or connect to a server with actions
        </Text>
      </div>
    );
  }

  return (
    <div
      className={style({
        display: 'grid',
        gap: 20,
      })}
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
      }}
    >
      {tools.map((action) => {
        const widget = widgets.get(action.name);
        return (
          <ActionCard
            key={action.name}
            action={action}
            widget={widget}
            draftActionNames={draftActionNames}
            isLocalManaged={isLocalManaged}
            onEdit={() => onEdit(action)}
            onExecute={() => onExecute(action)}
          />
        );
      })}
    </div>
  );
}

