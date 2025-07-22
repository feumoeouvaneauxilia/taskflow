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
}
