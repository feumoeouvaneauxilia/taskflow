import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, interval, Subscription, of } from 'rxjs';
import { tap, switchMap, catchError } from 'rxjs/operators';
import type { Notification } from '../../interfaces/notification.interface';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = `${environment.baseUrl}/notifications`;
  
  // Reactive state management
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  
  // Public observables
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  // Real-time polling properties
  private pollingSubscription?: Subscription;
  private pollingInterval = 30000; // 30 seconds
  private isPollingActive = false;

  constructor(private http: HttpClient) {
    this.loadUnreadCount();
    this.startRealTimePolling();
  }

  ngOnDestroy(): void {
    this.stopRealTimePolling();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get all notifications for the current user
   */
  getMyNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/my-notifications`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(notifications => {
        this.notificationsSubject.next(notifications);
        this.updateUnreadCount(notifications);
      })
    );
  }

  /**
   * Get unread notifications for the current user
   */
  getUnreadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/unread`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(notifications => {
        this.unreadCountSubject.next(notifications.length);
      })
    );
  }

  /**
   * Mark a specific notification as read
   */
  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.apiUrl}/${notificationId}/read`, {}, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(() => {
        // Update local state
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        );
        this.notificationsSubject.next(updatedNotifications);
        this.updateUnreadCount(updatedNotifications);
      })
    );
  }

  /**
   * Mark all notifications as read for the current user
   */
  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/mark-all-read`, {}, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(() => {
        // Update local state
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(n => 
          ({ ...n, isRead: true, readAt: new Date() })
        );
        this.notificationsSubject.next(updatedNotifications);
        this.unreadCountSubject.next(0);
      })
    );
  }

  /**
   * Load initial unread count
   */
  private loadUnreadCount(): void {
    this.getUnreadNotifications().subscribe();
  }

  /**
   * Update unread count based on current notifications
   */
  private updateUnreadCount(notifications: Notification[]): void {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    this.unreadCountSubject.next(unreadCount);
  }

  /**
   * Refresh notifications and unread count
   */
  refreshNotifications(): void {
    this.getMyNotifications().subscribe();
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'task_assigned':
        return 'cilTask';
      case 'task_completed':
        return 'cilCheckCircle';
      case 'task_validation':
        return 'cilShieldAlt';
      case 'task_reminder':
        return 'cilClock';
      case 'task_overdue':
        return 'cilWarning';
      case 'group_added':
        return 'cilPeople';
      case 'general':
      default:
        return 'cilBell';
    }
  }

  /**
   * Get notification color based on type
   */
  getNotificationColor(type: string): string {
    switch (type) {
      case 'task_assigned':
        return 'primary';
      case 'task_completed':
        return 'success';
      case 'task_validation':
        return 'info';
      case 'task_reminder':
        return 'warning';
      case 'task_overdue':
        return 'danger';
      case 'group_added':
        return 'secondary';
      case 'general':
      default:
        return 'info';
    }
  }

  /**
   * Format notification time
   */
  formatNotificationTime(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Start real-time polling for notifications
   */
  private startRealTimePolling(): void {
    if (this.isPollingActive) {
      return;
    }

    console.log('Starting real-time notification polling...');
    this.isPollingActive = true;

    // Poll every 30 seconds
    this.pollingSubscription = interval(this.pollingInterval).pipe(
      switchMap(() => this.getUnreadNotifications()),
      catchError(error => {
        console.error('Error in notification polling:', error);
        // Return empty array to continue polling
        return of([]);
      })
    ).subscribe({
      next: (notifications) => {
        // The tap operator in getUnreadNotifications already updates the count
        console.log(`Polled notifications: ${notifications.length} unread`);
      },
      error: (error) => {
        console.error('Notification polling error:', error);
        // Restart polling after error
        setTimeout(() => this.startRealTimePolling(), 5000);
      }
    });
  }

  /**
   * Stop real-time polling
   */
  private stopRealTimePolling(): void {
    if (this.pollingSubscription) {
      console.log('Stopping real-time notification polling...');
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
      this.isPollingActive = false;
    }
  }

  /**
   * Set polling interval (in milliseconds)
   */
  public setPollingInterval(interval: number): void {
    this.pollingInterval = interval;
    if (this.isPollingActive) {
      this.stopRealTimePolling();
      this.startRealTimePolling();
    }
  }

  /**
   * Manually trigger notification refresh
   */
  public forceRefresh(): void {
    console.log('Force refreshing notifications...');
    this.getMyNotifications().subscribe();
    this.getUnreadNotifications().subscribe();
  }

  /**
   * Pause real-time polling (useful when app is not visible)
   */
  public pausePolling(): void {
    this.stopRealTimePolling();
  }

  /**
   * Resume real-time polling
   */
  public resumePolling(): void {
    if (!this.isPollingActive) {
      this.startRealTimePolling();
    }
  }
}
