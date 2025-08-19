import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { Observable } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
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

  getTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.baseUrl}/task`, {
      headers: this.getAuthHeaders()
    });
  }

  createTask(taskData: any): Observable<any> {
    return this.http.post<any>(`${environment.baseUrl}/task`, taskData, {
      headers: this.getAuthHeaders()
    });
  }

  getTaskById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.baseUrl}/task/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateTask(id: string, taskData: any): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}`, taskData, {
      headers: this.getAuthHeaders()
    });
  }

  deleteTask(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.baseUrl}/task/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  findOneByName(name: string): Observable<any> {
    return this.http.get<any>(`${environment.baseUrl}/task/by-name/${name}`, {
      headers: this.getAuthHeaders()
    });
  }

  changeStatus(id: string, status: string): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/status/${status}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  markAsCompleted(id: string, userId: string): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/mark-completed`, { userId }, {
      headers: this.getAuthHeaders()
    });
  }

  validateTask(id: string, isValidated: boolean, message?: string): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/validate`, { isValidated, message }, {
      headers: this.getAuthHeaders()
    });
  }

  adminCompleteTask(id: string, adminComplete: boolean): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/admin-complete`, { adminComplete }, {
      headers: this.getAuthHeaders()
    });
  }

  adminNotCompleteTask(id: string, message?: string): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/admin-not-complete`, { message }, {
      headers: this.getAuthHeaders()
    });
  }

  assignUser(id: string, userId: string): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/assign/${userId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  unassignUser(id: string, userId: string): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/unassign/${userId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  assignMultipleUsers(id: string, userIds: string[]): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/assign-users`, { userIds }, {
      headers: this.getAuthHeaders()
    });
  }

  assignGroup(id: string, groupId: string): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/assign-group/${groupId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  unassignGroup(id: string, groupId: string): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/task/${id}/unassign-group/${groupId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  getTasksByGroup(groupId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.baseUrl}/task/by-group/${groupId}`, {
      headers: this.getAuthHeaders()
    });
  }

  getTasksByUser(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.baseUrl}/task/by-user/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Check if current user is group manager for this task
  isGroupManagerForTask(taskId: string): Observable<boolean> {
    return this.http.get<boolean>(`${environment.baseUrl}/task/${taskId}/is-group-manager`, {
      headers: this.getAuthHeaders()
    });
  }
}
