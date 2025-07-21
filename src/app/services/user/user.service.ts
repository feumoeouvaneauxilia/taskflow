import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.baseUrl}/users`;

  constructor(private http: HttpClient) {}

  // GET /users
  getUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}`);
  }

  // GET /users/{id}
  getUserById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // PATCH /users/{id}
  updateUser(id: string | number, data: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  // PATCH /users/{id}/deactivate
  deactivateUser(id: string | number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  // PATCH /users/{id}/role
  updateUserRole(id: string | number, role: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/role`, role);
  }
  updateUserStatus(userId: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${environment.baseUrl}/users/${userId}/status`, { isActive });
  }

  // updateUserRights(userId: string, rights: any): Observable<any> {
  //   return this.http.patch(`${environment.baseUrl}/users/${userId}/rights`, rights);
  // }
}
