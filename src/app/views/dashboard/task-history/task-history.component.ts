import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { 
  CardBodyComponent, 
  CardComponent, 
  CardHeaderComponent, 
  ColComponent, 
  RowComponent, 
  SpinnerComponent,
  BadgeComponent,
  ButtonDirective
} from '@coreui/angular';
import { IconDirective } from '@coreui/icons-angular';
import { cilArrowLeft, cilHistory, cilUser, cilClock, cilCheckCircle, cilX, cilShieldAlt } from '@coreui/icons';
import { TaskHistoryService, TaskHistoryEvent } from '../../../services/task-history/task-history.service';
import { TaskService } from '../../../services/task/task.service';

interface ITaskData {
  id?: string;
  name?: string;
  description?: string;
  status?: string;
}

@Component({
  selector: 'app-task-history',
  imports: [
    CommonModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    SpinnerComponent,
    BadgeComponent,
    ButtonDirective,
    IconDirective
  ],
  templateUrl: './task-history.component.html',
  styleUrl: './task-history.component.scss'
})
export class TaskHistoryComponent implements OnInit {
  taskId: string = '';
  taskName: string = '';
  historyEvents: TaskHistoryEvent[] = [];
  isLoading: boolean = false;
  
  icons = {
    cilArrowLeft,
    cilHistory,
    cilUser,
    cilClock,
    cilCheckCircle,
    cilX,
    cilShieldAlt
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private taskHistoryService: TaskHistoryService,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.taskId = params['taskId'];
      if (this.taskId) {
        this.loadTaskDetails();
        this.loadTaskHistory();
      }
    });
  }

  loadTaskDetails(): void {
    this.taskService.getTaskById(this.taskId).subscribe({
      next: (task: ITaskData) => {
        this.taskName = task.name || 'Unknown Task';
      },
      error: (error) => {
        console.error('Error loading task details:', error);
        this.taskName = 'Unknown Task';
      }
    });
  }

  loadTaskHistory(): void {
    this.isLoading = true;
    this.taskHistoryService.getTaskHistory(this.taskId).subscribe({
      next: (events: TaskHistoryEvent[]) => {
        this.historyEvents = events.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading task history:', error);
        this.historyEvents = [];
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/task']);
  }

  getActionIcon(action: string): any {
    switch (action) {
      case 'COMPLETED':
        return this.icons.cilCheckCircle;
      case 'REOPENED':
        return this.icons.cilX;
      case 'STATUS_CHANGED':
        return this.icons.cilClock;
      case 'VALIDATED':
      case 'UNVALIDATED':
        return this.icons.cilShieldAlt;
      case 'ADMIN_COMPLETED':
      case 'ADMIN_UNCOMPLETED':
        return this.icons.cilShieldAlt;
      case 'ASSIGNED':
      case 'UNASSIGNED':
        return this.icons.cilUser;
      case 'CREATED':
      case 'UPDATED':
        return this.icons.cilHistory;
      default:
        return this.icons.cilHistory;
    }
  }

  getActionBadgeColor(action: string): string {
    switch (action) {
      case 'COMPLETED':
        return 'success';
      case 'REOPENED':
        return 'warning';
      case 'STATUS_CHANGED':
        return 'info';
      case 'VALIDATED':
        return 'success';
      case 'UNVALIDATED':
        return 'warning';
      case 'ADMIN_COMPLETED':
        return 'primary';
      case 'ADMIN_UNCOMPLETED':
        return 'secondary';
      case 'ASSIGNED':
        return 'info';
      case 'UNASSIGNED':
        return 'dark';
      case 'CREATED':
        return 'success';
      case 'UPDATED':
        return 'warning';
      default:
        return 'light';
    }
  }

  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  trackByEventId(index: number, event: TaskHistoryEvent): string {
    return event.id || `${event.taskId}-${event.timestamp}-${index}`;
  }
}
