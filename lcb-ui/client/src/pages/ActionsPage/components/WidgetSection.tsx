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

import { Text, ActionButton } from '@react-spectrum/s2';
import { style } from '@react-spectrum/s2/style' with { type: 'macro' };
import Link from '@react-spectrum/s2/icons/Link';
import Preview from '@react-spectrum/s2/icons/Preview';
import type { MCPResource } from '../../../../../shared/types';
import { EDS_WIDGET_META } from '../../../constants/edsWidgetMeta';

interface WidgetSectionProps {
  widget: MCPResource;
  onPreview?: () => void;
  edsUrl?: string | null;
}

export default function WidgetSection({
  widget,
  onPreview,
  edsUrl
}: WidgetSectionProps) {
  const widgetDescription = widget._meta?.[EDS_WIDGET_META.WIDGET_DESCRIPTION];
  const scriptUrl = widget._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.SCRIPT_URL];
  const widgetEmbedUrl = widget._meta?.[EDS_WIDGET_META.LCB_WIDGET_META]?.[EDS_WIDGET_META.WIDGET_EMBED_URL];

  return (
    <div
      className={style({
        padding: 16,
        backgroundColor: 'gray-75',
        borderTopWidth: 1,
        borderTopColor: 'gray-200',
      })}
    >
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
        {/* Widget URI */}
        <div>
          <Text
            styles={style({ font: 'body-sm', fontWeight: 'bold', color: 'gray-800' })}
          >
            URI
          </Text>
          <Text
            styles={style({ font: 'code-sm', color: 'gray-700' })}
            UNSAFE_style={{
              wordBreak: 'break-all',
            }}
          >
            {widget.uri}
          </Text>
        </div>

        {/* Widget Description (OpenAI-specific) */}
        {widgetDescription && (
          <div>
            <Text
              styles={style({ font: 'body-sm', fontWeight: 'bold', color: 'gray-800' })}
            >
              Widget Description
            </Text>
            <Text
              styles={style({ font: 'body-sm', color: 'gray-700' })}
            >
              {widgetDescription}
            </Text>
          </div>
        )}

        {/* MCP Description */}
        {widget.description && (
          <div>
            <Text
              styles={style({ font: 'body-sm', fontWeight: 'bold', color: 'gray-800' })}
            >
              MCP Description
            </Text>
            <Text
              styles={style({ font: 'body-sm', color: 'gray-700' })}
            >
              {widget.description}
            </Text>
          </div>
        )}

        {/* Template URLs */}
        {(scriptUrl || widgetEmbedUrl) && (
          <div>
            <Text
              styles={style({ font: 'body-sm', fontWeight: 'bold', color: 'gray-800' })}
              UNSAFE_style={{ marginBottom: '4px' }}
            >
              Template URLs
            </Text>
            {scriptUrl && (
              <div className={style({ marginBottom: 4 })}>
                <Text
                  styles={style({ font: 'code-xs', color: 'gray-600' })}
                  UNSAFE_style={{ wordBreak: 'break-all' }}
                >
                  Script: {scriptUrl}
                </Text>
              </div>
            )}
            {widgetEmbedUrl && (
              <div>
                <Text
                  styles={style({ font: 'code-xs', color: 'gray-600' })}
                  UNSAFE_style={{ wordBreak: 'break-all' }}
                >
                  Embed: {widgetEmbedUrl}
                </Text>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className={style({ display: 'flex', flexDirection: 'row', gap: 8, marginTop: 8 })}>
          {onPreview && (
            <ActionButton
              size="S"
              onPress={onPreview}
              aria-label="Preview widget"
            >
              <Preview />
              <Text>Preview</Text>
            </ActionButton>
          )}
          {edsUrl && (
            <ActionButton
              size="S"
              onPress={() => window.open(edsUrl, '_blank')}
              aria-label="Open in EDS"
            >
              <Link />
              <Text>Open in EDS</Text>
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

