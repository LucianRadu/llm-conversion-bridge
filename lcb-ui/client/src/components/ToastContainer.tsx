import { useState, useEffect } from 'react';
import { Button } from "@react-spectrum/s2";
import Close from '@react-spectrum/s2/icons/Close';
import CheckmarkCircle from '@react-spectrum/s2/icons/CheckmarkCircle';
import AlertDiamond from '@react-spectrum/s2/icons/AlertDiamond';
import InfoCircle from '@react-spectrum/s2/icons/InfoCircle';
import { toastService } from '../services/toast';

interface Toast {
  id: string;
  message: string;
  variant: 'positive' | 'negative' | 'info' | 'neutral';
  timeout?: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastService.subscribe((toast) => {
      setToasts(prev => [...prev, toast]);

      // Auto-remove after timeout
      if (toast.timeout) {
        setTimeout(() => {
          removeToast(toast.id);
        }, toast.timeout);
      }
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getBackgroundColor = (variant: string) => {
    switch (variant) {
      case 'positive': return '#E6F4EA';
      case 'negative': return '#FCE8E6';
      case 'info': return '#E8F0FE';
      default: return '#F5F5F5';
    }
  };

  const getBorderColor = (variant: string) => {
    switch (variant) {
      case 'positive': return '#34A853';
      case 'negative': return '#EA4335';
      case 'info': return '#4285F4';
      default: return '#9E9E9E';
    }
  };

  const getIcon = (variant: string) => {
    const iconStyle = { flexShrink: 0 };
    switch (variant) {
      case 'positive':
        return <CheckmarkCircle UNSAFE_style={{ color: '#34A853', ...iconStyle }} />;
      case 'negative':
        return <AlertDiamond UNSAFE_style={{ color: '#EA4335', ...iconStyle }} />;
      case 'info':
        return <InfoCircle UNSAFE_style={{ color: '#4285F4', ...iconStyle }} />;
      default:
        return <InfoCircle UNSAFE_style={{ color: '#9E9E9E', ...iconStyle }} />;
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 101,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px'
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid',
            backgroundColor: getBackgroundColor(toast.variant),
            borderColor: getBorderColor(toast.variant),
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
            {getIcon(toast.variant)}
            <span style={{ flex: 1, fontSize: '14px', color: '#333' }}>
              {toast.message}
            </span>
            <Button
              variant="secondary"
             
              onPress={() => removeToast(toast.id)}
              UNSAFE_style={{ minWidth: 'auto', flexShrink: 0 }}
              aria-label="Close notification"
            >
              <Close />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
