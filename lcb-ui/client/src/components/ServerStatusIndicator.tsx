interface ServerStatusIndicatorProps {
  status?: 'connected' | 'disconnected' | 'connecting' | 'error';
  size?: 'S' | 'M' | 'L';
}

const getStatusConfig = (status?: ServerStatusIndicatorProps['status']) => {
  switch (status) {
    case 'connected':
      return {
        color: '#2c9e54', // Green
        animate: false
      };
    case 'connecting':
      return {
        color: '#e97500', // Orange
        animate: true
      };
    case 'error':
      return {
        color: '#d7373f', // Red
        animate: false
      };
    case 'disconnected':
    default:
      return {
        color: '#b1b1b1', // Gray
        animate: false
      };
  }
};

const getSizeInPixels = (size?: 'S' | 'M' | 'L') => {
  switch (size) {
    case 'S':
      return 6;
    case 'L':
      return 12;
    case 'M':
    default:
      return 8;
  }
};

export default function ServerStatusIndicator({ status, size = 'M' }: ServerStatusIndicatorProps) {
  const config = getStatusConfig(status);
  const sizeInPx = getSizeInPixels(size);
  
  return (
    <span
      style={{
        display: 'inline-block',
        width: `${sizeInPx}px`,
        height: `${sizeInPx}px`,
        backgroundColor: config.color,
        borderRadius: '9999px',
        flexShrink: 0,
        animation: config.animate ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
      }}
      aria-label={`Server status: ${status || 'disconnected'}`}
    />
  );
}

