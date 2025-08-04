import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  ModalComponent,
  ModalHeaderComponent,
  ModalBodyComponent,
  ModalFooterComponent,
  ModalTitleDirective,
  ButtonCloseDirective,
  ButtonDirective,
  BadgeComponent,
  SpinnerComponent
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { cilHistory, cilUser, cilClock, cilCheckCircle, cilX } from '@coreui/icons';
import { TaskHistoryService, TaskHistoryEvent } from '../../services/task-history/task-history.service';

@Component({
  selector: 'app-task-history-modal',
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent,
    ModalHeaderComponent,
    ModalBodyComponent,
    ModalFooterComponent,
    ModalTitleDirective,
    ButtonCloseDirective,
    ButtonDirective,
    BadgeComponent,
    SpinnerComponent,
    IconDirective
  ],
  templateUrl: './task-history-modal.component.html',
  styleUrls: ['./task-history-modal.component.scss']
})
export class TaskHistoryModalComponent implements OnInit {
  @Input() visible = false;
  @Input() taskId: string = '';
  @Input() taskName: string = '';
  @Output() visibleChange = new EventEmitter<boolean>();

  historyEvents: TaskHistoryEvent[] = [];
  isLoading = false;
  
  icons = {
    cilHistory,
    cilUser,
    cilClock,
    cilCheckCircle,
    cilX
  };

  constructor(private taskHistoryService: TaskHistoryService) {}

  ngOnInit() {
    if (this.visible && this.taskId) {
      this.loadHistory();
    }
  }

  ngOnChanges() {
    if (this.visible && this.taskId) {
      this.loadHistory();
    }
  }

  loadHistory() {
    this.isLoading = true;
    this.taskHistoryService.getTaskHistory(this.taskId).subscribe({
      next: (events) => {
        this.historyEvents = events.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading task history:', error);
        this.isLoading = false;
      }
    });
  }

  onClose() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  getActionIcon(action: string): any {
    switch (action) {
      case 'COMPLETED':
        return cilCheckCircle;
      case 'REOPENED':
        return cilHistory;
      case 'VALIDATED':
      case 'UNVALIDATED':
        return cilCheckCircle;
      case 'ADMIN_COMPLETED':
      case 'ADMIN_UNCOMPLETED':
        return cilCheckCircle;
      case 'STATUS_CHANGED':
        return cilHistory;
      case 'ASSIGNED':
      case 'UNASSIGNED':
        return cilUser;
      default:
        return cilHistory;
    }
  }

  getActionColor(action: string): string {
    switch (action) {
      case 'COMPLETED':
      case 'VALIDATED':
      case 'ADMIN_COMPLETED':
        return 'success';
      case 'REOPENED':
      case 'UNVALIDATED':
      case 'ADMIN_UNCOMPLETED':
        return 'warning';
      case 'STATUS_CHANGED':
        return 'info';
      case 'ASSIGNED':
        return 'primary';
      case 'UNASSIGNED':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getTimeAgo(timestamp: string): string {
    const now = new Date();
    const eventDate = new Date(timestamp);
    const diffMs = now.getTime() - eventDate.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return this.formatTimestamp(timestamp);
  }
}
