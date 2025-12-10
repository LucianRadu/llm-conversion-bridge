import type { ServerType } from '../../../shared/types';

interface ServerBadgeProps {
  serverType?: ServerType;
  size?: 'S' | 'M';
}

const getBadgeConfig = (serverType?: ServerType) => {
  switch (serverType) {
    case 'local-managed':
      return {
        label: 'LOCAL',
        backgroundColor: 'rgb(20, 115, 230)', // Blue
        color: 'white'
      };
    case 'remote-managed':
      return {
        label: 'REMOTE',
        backgroundColor: 'rgb(157, 78, 221)', // Purple
        color: 'white'
      };
    case 'remote-external':
      return {
        label: 'EXTERNAL',
        backgroundColor: 'rgb(75, 75, 75)', // Dark Gray
        color: 'white'
      };
    default:
      return {
        label: 'UNKNOWN',
        backgroundColor: 'rgb(177, 177, 177)', // Gray
        color: 'rgb(50, 50, 50)' // Dark Gray text
      };
  }
};

export default function ServerBadge({ serverType, size = 'M' }: ServerBadgeProps) {
  const config = getBadgeConfig(serverType);
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        backgroundColor: config.backgroundColor,
        color: config.color,
        paddingLeft: size === 'S' ? '4px' : '6px',
        paddingRight: size === 'S' ? '4px' : '6px',
        paddingTop: size === 'S' ? '2px' : '3px',
        paddingBottom: size === 'S' ? '2px' : '3px',
        fontSize: size === 'S' ? '10px' : '11px',
        fontFamily: 'adobe-clean-spectrum-vf, adobe-clean-variable, adobe-clean, ui-sans-serif, system-ui, sans-serif',
        lineHeight: '1',
      }}
    >
      {config.label}
    </span>
  );
}

