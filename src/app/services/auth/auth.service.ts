import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { catchError, Observable, throwError, tap } from 'rxjs';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { PushNotificationService } from '../push-notification.service';

interface DecodedToken {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  iat: number;
  exp: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private http: HttpClient,
    private router: Router,
    private cookieService: CookieService,
    private pushNotificationService: PushNotificationService
  ) { }

  register(data: any): Observable<any> {
    // Let the backend return its message (string or object)
    return this.http.post(`${environment.baseUrl}/auth/register`, data, { responseType: 'text' });
  }

  saveToken(token: string): void {
    this.cookieService.set('access_token', token);
    localStorage.setItem('token', token); // Also save to localStorage for push notifications
    
    // Extract and save username from token
    const decodedToken = this.decodeToken(token);
    if (decodedToken && decodedToken.username) {
      localStorage.setItem('username', decodedToken.username);
    }

    // Request push notification permission and register token after login
    this.pushNotificationService.requestPermission();
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  getToken(): string | null {
    return localStorage.getItem('jwtToken');
}

verifyToken(token: string): Observable<any> {
    const params = new HttpParams().set('token', token);
    return this.http.post(`${environment.baseUrl}/auth/verify-token`, null, { params, responseType: 'text' })
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any) {
  let errorMessage = 'Something bad happened; please try again later.';
  if (error.error instanceof ErrorEvent) {
    // A client-side or network error occurred.
    errorMessage = `Error: ${error.error.message}`;
  } else {
    // The backend returned an unsuccessful response code.
    if (error.status === 404 && error.error === 'User with the given email not found.') {
      errorMessage = 'User with this email does not exist.';
    } else if (error.status === 400 && error.error === 'Invalid or expired token.') {
      errorMessage = 'Invalid or expired token.';
    } else if (error.status === 401 && error.error === 'Invalid username or password.') {
      errorMessage = 'Invalid username or password.';
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
  }
  return throwError(errorMessage); // Return an observable with a user-facing error message
}

logout(): void {
    const token = this.getToken();
    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      this.http.post(`${environment.baseUrl}/auth/logout`, {}, { headers }).subscribe(
        () => {
          this.clearTokens();
          this.router.navigate(['/auth']);
        },
        (error) => {
          console.error('Error during logout:', error);
          this.clearTokens();
          this.router.navigate(['/auth']);
        }
      );
    } else {
      this.clearTokens();
      this.router.navigate(['/auth']);
    }
  }

  private clearTokens(): void {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('token'); // Clear the token used for push notifications
    localStorage.removeItem('username'); // Clear username on logout
    this.cookieService.delete('access_token');
    this.cookieService.deleteAll();
  }

  /**
   * Decode JWT token and return its payload
   * @param token - JWT token string
   * @returns Decoded token payload or null if invalid
   */
  private decodeToken(token: string): DecodedToken | null {
    try {
      // Split the token into parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      
      // Add padding if needed for proper base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      
      // Decode from base64 and parse JSON
      const decodedPayload = JSON.parse(atob(paddedPayload));
      
      return decodedPayload as DecodedToken;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get decoded token from cookies
   * @returns Decoded token payload or null if no valid token exists
   */
  getDecodedToken(): DecodedToken | null {
    const token = this.cookieService.get('access_token');
    if (!token) {
      return null;
    }
    return this.decodeToken(token);
  }

  /**
   * Get current user information from token
   * @returns User information object or null
   */
  getCurrentUser(): { id: string; email: string; username: string; roles: string[] } | null {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken) {
      return null;
    }

    return {
      id: decodedToken.sub,
      email: decodedToken.email,
      username: decodedToken.username,
      roles: decodedToken.roles
    };
  }

  /**
   * Check if token is expired
   * @returns true if token is expired, false otherwise
   */
  isTokenExpired(): boolean {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decodedToken.exp < currentTime;
  }

  /**
   * Check if user has specific role
   * @param role - Role to check
   * @returns true if user has the role, false otherwise
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user) {
      return false;
    }
    return user.roles.includes(role) || user.roles.includes(`ROLE_${role.toUpperCase()}`);
  }

  isLoggedIn(): Observable<boolean> {
  const token = this.cookieService.get('access_token');
  if (!token || this.isTokenExpired()) {
    return new Observable<boolean>(observer => {
      observer.next(false);
      observer.complete();
    });
  }
  return new Observable<boolean>(observer => {
    this.http.get(`${environment.baseUrl}/auth/validate`, {
      params: { token }
    }).subscribe({
      next: () => {
        observer.next(true);
        observer.complete();
      },
      error: () => {
        observer.next(false);
        observer.complete();
      }
    });
  });
}

login(credentials: { email: string; password: string }): Observable<{ accessToken: string, refreshToken: string }> {
  return this.http.post<{ accessToken: string, refreshToken: string }>(
    `${environment.baseUrl}/auth/login`,
    credentials
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      // Extract the error message from the backend or fallback
      const errorMessage = error.error?.message || 'Login failed. Please try again.';
      return throwError(() => new Error(errorMessage));
    })
  );
}
}