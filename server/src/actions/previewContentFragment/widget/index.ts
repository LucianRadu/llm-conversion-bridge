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
 * Preview Content Fragment Widget Metadata
 * The HTML content is automatically loaded from template.html during build
 */
export const widgetMeta = {
  uri: "ui://aem-widget/preview-content-fragment.html",
  name: "Preview Content Fragment Widget",
  description: "Displays a rendered preview of a content fragment using a template",
  mimeType: "text/html+skybridge",
  htmlFile: "template.html",
  _meta: {
    "openai/widgetPrefersBorder": false,
    "openai/widgetDescription": "Renders content fragment HTML preview in an iframe",
  }
};

