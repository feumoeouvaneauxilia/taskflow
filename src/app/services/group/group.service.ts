import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { CookieService } from 'ngx-cookie-service';

export interface Group {
  id: string;
  name: string;
  description?: string;
  managerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupDto {
  name: string;
  description?: string;
  managerId: string;
}

export interface UpdateGroupDto {
  name?: string;
  description?: string;
  managerId?: string;
}

export interface AddMembersDto {
  memberIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
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

  createGroup(createGroupDto: CreateGroupDto): Observable<Group> {
    return this.http.post<Group>(`${environment.baseUrl}/groups`, createGroupDto, {
      headers: this.getAuthHeaders()
    });
  }

  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${environment.baseUrl}/groups`, {
      headers: this.getAuthHeaders()
    });
  }

  getGroupById(id: string): Observable<Group> {
    return this.http.get<Group>(`${environment.baseUrl}/groups/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  getGroupsByUser(userId: string): Observable<Group[]> {
    return this.http.get<Group[]>(`${environment.baseUrl}/groups/user/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  getMyGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${environment.baseUrl}/groups/my-groups`, {
      headers: this.getAuthHeaders()
    });
  }

  getGroupsByManager(managerId: string): Observable<Group[]> {
    return this.http.get<Group[]>(`${environment.baseUrl}/groups/managed-by/${managerId}`, {
      headers: this.getAuthHeaders()
    });
  }

  updateGroup(id: string, updateGroupDto: UpdateGroupDto): Observable<Group> {
    return this.http.patch<Group>(`${environment.baseUrl}/groups/${id}`, updateGroupDto, {
      headers: this.getAuthHeaders()
    });
  }

  addGroupMembers(id: string, addMembersDto: AddMembersDto): Observable<Group> {
    return this.http.patch<Group>(`${environment.baseUrl}/groups/${id}/members`, addMembersDto, {
      headers: this.getAuthHeaders()
    });
  }

  removeGroupMember(groupId: string, userId: string): Observable<Group> {
    return this.http.delete<Group>(`${environment.baseUrl}/groups/${groupId}/members/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.baseUrl}/groups/${id}`, {
      headers: this.getAuthHeaders()
    });
  }
}