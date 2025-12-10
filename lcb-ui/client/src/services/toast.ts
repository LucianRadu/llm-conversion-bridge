interface ToastMessage {
  id: string;
  message: string;
  variant: 'positive' | 'negative' | 'info' | 'neutral';
  timeout?: number;
}

class ToastService {
  private listeners: ((toast: ToastMessage) => void)[] = [];

  subscribe(callback: (toast: ToastMessage) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  show(message: string, variant: 'positive' | 'negative' | 'info' | 'neutral' = 'neutral', timeout = 3000) {
    const toast: ToastMessage = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      message,
      variant,
      timeout
    };

    this.listeners.forEach(listener => listener(toast));
  }

  success(message: string, timeout = 3000) {
    this.show(message, 'positive', timeout);
  }

  error(message: string, timeout = 3000) {
    this.show(message, 'negative', timeout);
  }

  info(message: string, timeout = 3000) {
    this.show(message, 'info', timeout);
  }
}

export const toastService = new ToastService();
