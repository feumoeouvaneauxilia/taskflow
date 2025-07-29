import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private messaging: any;

  constructor(private http: HttpClient) {
    try {
      const app = initializeApp(environment.firebase);
      this.messaging = getMessaging(app);
      
      // Start listening for messages immediately
      this.listenForMessages();
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }

  requestPermission() {
    if (!this.messaging) {
      console.error('Firebase messaging not initialized');
      return;
    }

    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('✅ Notification permission granted.');
        this.retrieveToken();
      } else {
        console.log('❌ Unable to get permission to notify.');
      }
    });
  }

  retrieveToken() {
    if (!this.messaging) {
      console.error('Firebase messaging not initialized');
      return;
    }

    getToken(this.messaging, { vapidKey: environment.firebase.vapidKey }).then((currentToken) => {
      if (currentToken) {
        console.log('🔑 FCM Token:', currentToken);
        // TODO: Send this token to your backend server
        // You can call an API endpoint here to register this token with the current user
        this.sendTokenToServer(currentToken);
      } else {
        console.log('⚠️ No registration token available. Request permission to generate one.');
      }
    }).catch((err) => {
      console.log('❌ An error occurred while retrieving token: ', err);
    });
  }

  private sendTokenToServer(token: string) {
    // Get the auth token from localStorage
    const authToken = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('access_token');
    
    if (!authToken) {
      console.warn('⚠️ No auth token found. Cannot register FCM token without authentication.');
      return;
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    });

    const body = {
      token: token,
      deviceType: 'web',
      deviceId: navigator.userAgent
    };

    this.http.post(`${environment.baseUrl}/push-notifications/register-token`, body, { headers })
      .subscribe({
        next: (data) => {
          console.log('✅ Token registered with server:', data);
        },
        error: (error) => {
          console.error('❌ Failed to register token with server:', error);
        }
      });
  }

  listenForMessages() {
    if (!this.messaging) {
      console.error('Firebase messaging not initialized');
      return;
    }

    onMessage(this.messaging, (payload) => {
      console.log('📨 Message received: ', payload);
      
      // Handle foreground notifications
      if (payload.notification) {
        const notificationTitle = payload.notification.title || 'TaskFlow Notification';
        const notificationOptions = {
          body: payload.notification.body || 'You have a new notification',
          icon: payload.notification.icon || '/assets/icons/android-chrome-192x192.png',
          badge: '/assets/icons/android-chrome-192x192.png',
          tag: 'taskflow-notification',
          data: payload.data,
          requireInteraction: true
        };
        
        new Notification(notificationTitle, notificationOptions);
      }
    });
  }
}
