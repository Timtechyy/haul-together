// Web Push Notification Service
export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async notifyNewDelivery(deliveryInfo: {
    pickup: string;
    delivery: string;
    price: number;
    distance: number;
  }): Promise<void> {
    await this.showNotification('New Delivery Request!', {
      body: `${deliveryInfo.pickup} → ${deliveryInfo.delivery}\n$${deliveryInfo.price.toFixed(2)} • ${deliveryInfo.distance.toFixed(1)} mi`,
      tag: 'new-delivery',
      requireInteraction: true,
    });
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }
}

export const notificationService = NotificationService.getInstance();
