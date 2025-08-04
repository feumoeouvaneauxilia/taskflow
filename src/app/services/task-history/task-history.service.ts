import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { Observable } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

export interface TaskHistoryEvent {
  id?: string;
  taskId: string;
  userId: string;
  action: 'COMPLETED' | 'REOPENED' | 'STATUS_CHANGED' | 'VALIDATED' | 'UNVALIDATED' | 'ADMIN_COMPLETED' | 'ADMIN_UNCOMPLETED' | 'CREATED' | 'UPDATED' | 'ASSIGNED' | 'UNASSIGNED';
  oldValue?: string;
  newValue?: string;
  timestamp: string;
  description: string;
  userEmail?: string;
  userName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskHistoryService {
  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.cookieService.get('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get task history by task ID
  getTaskHistory(taskId: string): Observable<TaskHistoryEvent[]> {
    return this.http.get<TaskHistoryEvent[]>(`${environment.baseUrl}/task/${taskId}/history`, {
      headers: this.getAuthHeaders()
    });
  }

  // Add a new history event
  addHistoryEvent(historyEvent: Omit<TaskHistoryEvent, 'id' | 'timestamp'>): Observable<TaskHistoryEvent> {
    return this.http.post<TaskHistoryEvent>(`${environment.baseUrl}/task/history`, historyEvent, {
      headers: this.getAuthHeaders()
    });
  }

  // Get user's activity history
  getUserTaskHistory(userId: string): Observable<TaskHistoryEvent[]> {
    return this.http.get<TaskHistoryEvent[]>(`${environment.baseUrl}/task-history/user/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all task history (admin only)
  getAllTaskHistory(): Observable<TaskHistoryEvent[]> {
    return this.http.get<TaskHistoryEvent[]>(`${environment.baseUrl}/task-history`, {
      headers: this.getAuthHeaders()
    });
  }
}
