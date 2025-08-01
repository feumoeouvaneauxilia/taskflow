import { NgTemplateOutlet, AsyncPipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../services/user/user.service';
import { ReactiveFormsModule } from '@angular/forms';
import {
  AvatarComponent,
  BadgeComponent,
  BreadcrumbRouterComponent,
  ColorModeService,
  ContainerComponent,
  DropdownComponent,
  DropdownDividerDirective,
  DropdownHeaderDirective,
  DropdownItemDirective,
  DropdownMenuDirective,
  DropdownToggleDirective,
  HeaderComponent,
  HeaderNavComponent,
  HeaderTogglerDirective,
  ModalComponent,
  ModalHeaderComponent,
  ModalBodyComponent,
  ModalFooterComponent,
 
 // NavItemComponent,
  NavLinkDirective,
  SidebarToggleDirective
} from '@coreui/angular';

import { IconDirective } from '@coreui/icons-angular';
import { AuthService } from '../../../services/auth/auth.service';
import { NotificationService } from '../../../services/notification/notification.service';
import type { Notification } from '../../../interfaces/notification.interface';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-default-header',
  templateUrl: './default-header.component.html',
  imports: [ContainerComponent, HeaderTogglerDirective, SidebarToggleDirective, IconDirective, HeaderNavComponent, RouterLink, NgTemplateOutlet, AsyncPipe, BreadcrumbRouterComponent, DropdownComponent, DropdownToggleDirective, AvatarComponent, DropdownMenuDirective, DropdownHeaderDirective, DropdownItemDirective, BadgeComponent, DropdownDividerDirective]
})
export class DefaultHeaderComponent extends HeaderComponent implements OnInit, OnDestroy {

  readonly #colorModeService = inject(ColorModeService);
  readonly colorMode = this.#colorModeService.colorMode;

  readonly colorModes = [
    { name: 'light', text: 'Light', icon: 'cilSun' },
    { name: 'dark', text: 'Dark', icon: 'cilMoon' },
    { name: 'auto', text: 'Auto', icon: 'cilContrast' }
  ];

  readonly icons = computed(() => {
    const currentMode = this.colorMode();
    return this.colorModes.find(mode => mode.name === currentMode)?.icon ?? 'cilSun';
  });

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    super();
    this.loadUserName();
    this.unreadCount$ = this.notificationService.unreadCount$;
    this.notifications$ = this.notificationService.notifications$;
  }

  ngOnInit(): void {
    // Set up page visibility handling for better performance
    this.setupVisibilityHandling();
    
    // Request notification permission
    this.requestNotificationPermission();
    
    // Initial load of notifications
    this.loadNotifications();
    
    // Subscribe to unread count changes to detect new notifications
    this.subscribeToNotificationChanges();
  }

  /**
   * Request browser notification permission
   */
  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }

  ngOnDestroy(): void {
    // Cleanup is handled by the notification service
  }

  /**
   * Subscribe to notification changes to provide visual feedback
   */
  private subscribeToNotificationChanges(): void {
    let previousCount = 0;
    
    this.unreadCount$.subscribe(count => {
      // If count increased, show animation
      if (count > previousCount && previousCount > 0) {
        this.hasNewNotification = true;
        console.log('New notification received! Count:', count);
        
        // Show browser notification if permission granted
        this.showBrowserNotification();
        
        // Auto-hide the animation after 5 seconds
        setTimeout(() => {
          this.hasNewNotification = false;
        }, 5000);
      }
      previousCount = count;
    });
  }

  /**
   * Show browser notification for new notifications
   */
  private showBrowserNotification(): void {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('TaskFlow - New Notification', {
          body: 'You have received a new notification',
          icon: '/assets/angular.ico', // You can replace with your app icon
          badge: '/assets/angular.ico'
        });
      } else if (Notification.permission !== 'denied') {
        // Request permission
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            this.showBrowserNotification();
          }
        });
      }
    }
  }

  @HostListener('window:focus', [])
  onWindowFocus(): void {
    // When user returns to the app, refresh notifications immediately
    this.notificationService.forceRefresh();
  }

  @HostListener('window:blur', [])
  onWindowBlur(): void {
    // Optional: Could pause polling when window loses focus for battery optimization
  }

  /**
   * Set up page visibility API handling
   */
  private setupVisibilityHandling(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Page is hidden, could pause polling for battery optimization
          console.log('Page hidden - notifications still polling in background');
        } else {
          // Page is visible again, force refresh
          console.log('Page visible - refreshing notifications');
          this.notificationService.forceRefresh();
        }
      });
    }
  }

  private loadUserName(): void {
    this.userName = this.authService.getUsername();
  }

  getUserInitials(): string {
    if (!this.userName) {
      return '??';
    }
    
    // Get first two letters and convert to uppercase
    const initials = this.userName.substring(0, 2).toUpperCase();
    return initials;
  }

  // Notification methods
  loadNotifications(): void {
    if (!this.notificationsLoaded) {
      console.log('Loading notifications for the first time...');
      this.notificationService.getMyNotifications().subscribe({
        next: (notifications) => {
          console.log(`Loaded ${notifications.length} notifications`);
          this.notificationsLoaded = true;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
        }
      });
    } else {
      // Force refresh if already loaded
      this.notificationService.forceRefresh();
    }
  }

  markAsRead(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        console.log('All notifications marked as read');
        this.hasNewNotification = false;
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
      }
    });
  }

  /**
   * Manual refresh with user feedback
   */
  refreshNotifications(): void {
    console.log('Manually refreshing notifications...');
    this.notificationService.forceRefresh();
  }

  getNotificationIcon(type: string): string {
    return this.notificationService.getNotificationIcon(type);
  }

  getNotificationColor(type: string): string {
    return this.notificationService.getNotificationColor(type);
  }

  formatNotificationTime(date: Date): string {
    return this.notificationService.formatNotificationTime(date);
  }

  sidebarId = input('sidebar1');
  isModalVisible = false;
  


  public newMessages = [
    {
      id: 0,
      from: 'Jessica Williams',
      avatar: '7.jpg',
      status: 'success',
      title: 'Urgent: System Maintenance Tonight',
      time: 'Just now',
      link: 'apps/email/inbox/message',
      message: 'Attention team, we\'ll be conducting critical system maintenance tonight from 10 PM to 2 AM. Plan accordingly...'
    },
    {
      id: 1,
      from: 'Richard Johnson',
      avatar: '6.jpg',
      status: 'warning',
      title: 'Project Update: Milestone Achieved',
      time: '5 minutes ago',
      link: 'apps/email/inbox/message',
      message: 'Kudos on hitting sales targets last quarter! Let\'s keep the momentum. New goals, new victories ahead...'
    },
    {
      id: 2,
      from: 'Angela Rodriguez',
      avatar: '5.jpg',
      status: 'danger',
      title: 'Social Media Campaign Launch',
      time: '1:52 PM',
      link: 'apps/email/inbox/message',
      message: 'Exciting news! Our new social media campaign goes live tomorrow. Brace yourselves for engagement...'
    },
    {
      id: 3,
      from: 'Jane Lewis',
      avatar: '4.jpg',
      status: 'info',
      title: 'Inventory Checkpoint',
      time: '4:03 AM',
      link: 'apps/email/inbox/message',
      message: 'Team, it\'s time for our monthly inventory check. Accurate counts ensure smooth operations. Let\'s nail it...'
    },
    {
      id: 4,
      from: 'Ryan Miller',
      avatar: '3.jpg',
      status: 'info',
      title: 'Customer Feedback Results',
      time: '3 days ago',
      link: 'apps/email/inbox/message',
      message: 'Our latest customer feedback is in. Let\'s analyze and discuss improvements for an even better service...'
    }
  ];

  public newNotifications = [
    { id: 0, title: 'New user registered', icon: 'cilUserFollow', color: 'success' },
    { id: 1, title: 'User deleted', icon: 'cilUserUnfollow', color: 'danger' },
    { id: 2, title: 'Sales report is ready', icon: 'cilChartPie', color: 'info' },
    { id: 3, title: 'New client', icon: 'cilBasket', color: 'primary' },
    { id: 4, title: 'Server overloaded', icon: 'cilSpeedometer', color: 'warning' }
  ];

  public newStatus = [
    { id: 0, title: 'CPU Usage', value: 25, color: 'info', details: '348 Processes. 1/4 Cores.' },
    { id: 1, title: 'Memory Usage', value: 70, color: 'warning', details: '11444GB/16384MB' },
    { id: 2, title: 'SSD 1 Usage', value: 90, color: 'danger', details: '243GB/256GB' }
  ];

  public newTasks = [
    { id: 0, title: 'Upgrade NPM', value: 0, color: 'info' },
    { id: 1, title: 'ReactJS Version', value: 25, color: 'danger' },
    { id: 2, title: 'VueJS Version', value: 50, color: 'warning' },
    { id: 3, title: 'Add new layouts', value: 75, color: 'info' },
    { id: 4, title: 'Angular Version', value: 100, color: 'success' }
  ];

  user = { name: 'User' }; // Replace with actual user fetching logic
  userName: string | null = null;

  // Notification properties
  unreadCount$: Observable<number>;
  notifications$: Observable<Notification[]>;
  notificationsLoaded = false;
  hasNewNotification = false; // For visual feedback

}
