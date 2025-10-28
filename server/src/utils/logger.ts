/**
 * Simple logger that matches Fastly's log format
 * Format: YYYY-MM-DDTHH:mm:ss.sssssssZ  LEVEL message
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class FastlyLogger {
  private formatTimestamp(): string {
    // Just use real JavaScript millisecond precision, pad with spaces to match Fastly format
    const now = new Date();
    const isoString = now.toISOString();

    // Get the milliseconds part and pad with 3 spaces (no fake data)
    const [base, ms] = isoString.split('.');
    const realMs = ms.substring(0, 3);

    return `${base}.${realMs}   Z`;
  }

  private formatPrefix(message: string): string {
    // Extract prefix (everything before first colon)
    const colonIndex = message.indexOf(':');
    if (colonIndex === -1) {
      return message;
    }

    const prefix = message.substring(0, colonIndex);
    const rest = message.substring(colonIndex + 1);

    // Pad or truncate prefix to exactly 16 characters
    const paddedPrefix = prefix.length > 16
      ? prefix.substring(0, 16)
      : prefix.padEnd(16, ' ');

    return `${paddedPrefix}:${rest}`;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = this.formatTimestamp();
    const formattedMessage = args.length > 0 ? `${message} ${args.join(' ')}` : message;
    const alignedMessage = this.formatPrefix(formattedMessage);
    console.log(`${timestamp}  ${level} ${alignedMessage}`);
  }

  debug(message: string, ...args: any[]): void {
    this.log('DEBUG', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('ERROR', message, ...args);
  }
}

// Export singleton logger instance
export const logger = new FastlyLogger();