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

/**
 * Heartbeat Widget Metadata
 * The HTML content is automatically loaded from template.html during build
 */
export const widgetMeta = {
  uri: "ui://aem-widget/heartbeat-widget.html",
  name: "Heartbeat Widget",
  description: "Simple heartbeat widget showing server timestamp",
  mimeType: "text/html+skybridge",
  htmlFile: "template.html",
  _meta: {
    "openai/widgetPrefersBorder": false,
    "openai/widgetDescription": "Displays server heartbeat status with current timestamp",
  }
};

