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

import { Button, Text } from "@react-spectrum/s2";
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Add from '@react-spectrum/s2/icons/Add';

interface LcbServersHeaderProps {
  onAddClick: () => void;
}

export default function LcbServersHeader({ onAddClick }: LcbServersHeaderProps) {
  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 })}>
      <div 
        className={style({ display: 'flex', flexDirection: 'row' })}
        style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 })}>
          <Text 
            styles={style({ 
              font: 'heading-2xl', 
              fontWeight: 'bold'
            })}
            UNSAFE_style={{ 
              fontSize: '28px',
              letterSpacing: '-0.02em'
            }}
          >
            Servers
          </Text>
          <Text 
            styles={style({ 
              font: 'body', 
              color: 'gray-700'
            })}
            UNSAFE_style={{ lineHeight: 1.6, maxWidth: '600px' }}
          >
            Manage all MCP servers in detail. For quick switching, use the server selector in the top bar.
          </Text>
        </div>
        <Button
          variant="accent"
          onPress={onAddClick}
          UNSAFE_style={{ flexShrink: 0 }}
        >
          <Add />
          <Text>Add Server</Text>
        </Button>
      </div>
    </div>
  );
}

