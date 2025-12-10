/**
 * Markdown Parser Utility
 *
 * Parses standard Markdown format to HTML for display in the UI.
 * Supports CommonMark specification features.
 */

/**
 * Escape HTML entities to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Process code blocks (```)
 * Must be processed AFTER escapeHtml and before inline code.
 *
 * SECURITY NOTE: Do NOT add escapeHtml() here - content is already escaped
 * in the main parseMarkdown flow (step 1). Re-escaping would break display
 * by double-encoding entities (&amp;lt; instead of &lt;).
 *
 * The regex extracts already-escaped content from the input, making it safe
 * to insert directly into <code> tags without additional escaping.
 */
function processCodeBlocks(text: string): string {
  // Match code blocks with optional language identifier
  return text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
    return `<pre style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; margin: 12px 0;"><code style="font-family: monospace; font-size: 13px;">${code.trim()}</code></pre>`;
  });
}

/**
 * Process inline code (`code`)
 * Must be processed AFTER escapeHtml and AFTER code blocks.
 *
 * SECURITY NOTE: Do NOT add escapeHtml() here - content is already escaped
 * in the main parseMarkdown flow (step 1). Re-escaping would break display
 * by double-encoding entities (&amp;lt; instead of &lt;).
 *
 * The regex extracts already-escaped content from the input, making it safe
 * to insert directly into <code> tags without additional escaping.
 */
function processInlineCode(text: string): string {
  return text.replace(/`([^`]+)`/g, (_, code) => {
    return `<code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; font-size: 13px;">${code}</code>`;
  });
}

/**
 * Process headers (##, ###, ####)
 */
function processHeaders(text: string): string {
  let html = text;

  // #### Heading 4
  html = html.replace(/^#### (.+)$/gm, '<h4 style="font-size: 14px; font-weight: 600; margin: 10px 0 4px 0;">$1</h4>');

  // ### Heading 3
  html = html.replace(/^### (.+)$/gm, '<h3 style="font-size: 16px; font-weight: 600; margin: 12px 0 6px 0;">$1</h3>');

  // ## Heading 2
  html = html.replace(/^## (.+)$/gm, '<h2 style="font-size: 18px; font-weight: 700; margin: 14px 0 8px 0;">$1</h2>');

  return html;
}

/**
 * Process bold (**text**) and italic (*text* or _text_)
 * Bold must be processed before italic
 */
function processBoldItalic(text: string): string {
  let html = text;

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (but not if part of bold or after colons/word chars)
  // Only match if asterisk/underscore is preceded by whitespace or start of line
  // and followed by non-whitespace
  html = html.replace(/(^|[\s])(?<!\*)\*([^\s*][^\*]*?)\*(?!\*)/gm, '$1<em>$2</em>');
  html = html.replace(/(^|[\s])(?<!_)_([^\s_][^_]*?)_(?!_)/gm, '$1<em>$2</em>');

  return html;
}

/**
 * Process links [text](url)
 * Validates URLs start with http:// or https://
 */
function processLinks(text: string): string {
  return text.replace(/\[(.+?)\]\((.+?)\)/g, (_, linkText, url) => {
    // Validate URL starts with http or https
    const isValidUrl = url.startsWith('http://') || url.startsWith('https://');
    if (!isValidUrl) {
      return linkText; // Return just the text if URL is invalid
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #0d66d0; text-decoration: underline;">${linkText}</a>`;
  });
}

/**
 * Process lists (numbered and unordered)
 * Handles nested lists with indentation
 */
function processLists(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let currentIndent = 0;
  const listStack: Array<{ type: 'ul' | 'ol'; indent: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trimStart();
    const indent = line.length - trimmedLine.length;

    // Check for ordered list item (1., 2., etc.)
    const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    // Check for unordered list item (-, *)
    const unorderedMatch = trimmedLine.match(/^[-*]\s+(.+)$/);

    if (orderedMatch || unorderedMatch) {
      const itemText = orderedMatch ? orderedMatch[2] : unorderedMatch![1];
      const itemType = orderedMatch ? 'ol' : 'ul';

      // Handle nesting
      if (indent > currentIndent) {
        // Start nested list
        listStack.push({ type: itemType, indent: currentIndent });
        result.push(`<${itemType} style="margin: 4px 0; padding-left: 20px;">`);
        currentIndent = indent;
      } else if (indent < currentIndent) {
        // Close nested lists
        while (listStack.length > 0 && listStack[listStack.length - 1].indent >= indent) {
          const prevList = listStack.pop()!;
          result.push(`</${prevList.type}>`);
        }
        currentIndent = indent;

        // If list type changed, close and open new list
        if (inList && listType !== itemType) {
          result.push(`</${listType}>`);
          result.push(`<${itemType} style="margin: 4px 0; padding-left: 20px;">`);
          listType = itemType;
        }
      } else if (inList && listType !== itemType) {
        // Same indent but different type, close and reopen
        result.push(`</${listType}>`);
        result.push(`<${itemType} style="margin: 4px 0; padding-left: 20px;">`);
        listType = itemType;
      }

      if (!inList) {
        result.push(`<${itemType} style="margin: 4px 0; padding-left: 20px;">`);
        inList = true;
        listType = itemType;
      }

      result.push(`<li style="margin: 2px 0;">${itemText}</li>`);
    } else {
      // Not a list item
      if (inList) {
        // Close all open lists
        if (listType) {
          result.push(`</${listType}>`);
        }
        while (listStack.length > 0) {
          const prevList = listStack.pop()!;
          result.push(`</${prevList.type}>`);
        }
        inList = false;
        listType = null;
        currentIndent = 0;
      }
      result.push(line);
    }
  }

  // Close any remaining open lists
  if (inList && listType) {
    result.push(`</${listType}>`);
  }
  while (listStack.length > 0) {
    const prevList = listStack.pop()!;
    result.push(`</${prevList.type}>`);
  }

  return result.join('\n');
}

/**
 * Process horizontal rules (---, ***, ___)
 * Must be processed before lists to avoid confusion with list items
 */
function processHorizontalRules(text: string): string {
  // Match lines with 3 or more hyphens, asterisks, or underscores
  // with optional spaces between them
  return text.replace(/^[\s]*[-*_]{3,}[\s]*$/gm, '<hr style="border: none; border-top: 1px solid #ddd; margin: 10px 0;">');
}

/**
 * Process line breaks
 * Converts remaining newlines to <br> tags, but avoid adding breaks inside lists
 */
function processLineBreaks(text: string): string {
  // Don't add <br> after closing list tags or list items
  let html = text.replace(/<\/(ul|ol|li)>\n/g, '</$1>');
  // Don't add <br> before opening list tags
  html = html.replace(/\n<(ul|ol|li)/g, '<$1');
  // Convert remaining newlines to <br>
  html = html.replace(/\n/g, '<br>');
  return html;
}

/**
 * Parse markdown text to HTML
 *
 * Supports:
 * - Headers (##, ###, ####)
 * - Bold (**text**)
 * - Italic (*text* or _text_)
 * - Numbered lists (1., 2., 3.)
 * - Unordered lists (-, *)
 * - Nested lists (indentation-based)
 * - Inline code (`code`)
 * - Code blocks (```)
 * - Links ([text](url))
 * - Horizontal rules (---, ***, ___)
 *
 * @param text - Raw markdown text
 * @returns HTML string
 */
export function parseMarkdown(text: string): string {
  if (!text) return '';

  // Processing order is important!
  let html = text;

  // 1. Escape HTML entities first (security)
  html = escapeHtml(html);

  // 2. Process code blocks (must be AFTER escaping for security, before inline code)
  html = processCodeBlocks(html);

  // 3. Process inline code (must be AFTER escaping for security)
  html = processInlineCode(html);

  // 4. Process headers
  html = processHeaders(html);

  // 5. Process horizontal rules (must be before lists)
  html = processHorizontalRules(html);

  // 6. Process lists (must be before line breaks)
  html = processLists(html);

  // 7. Process bold and italic
  html = processBoldItalic(html);

  // 8. Process links
  html = processLinks(html);

  // 9. Process line breaks (last step)
  html = processLineBreaks(html);

  return html;
}
