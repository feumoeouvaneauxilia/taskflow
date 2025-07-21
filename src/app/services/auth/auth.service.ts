import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { catchError, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';



@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private http: HttpClient,
    private router: Router,
    private cookieService: CookieService
  ) { }

  register(data: any): Observable<any> {
    // Let the backend return its message (string or object)
    return this.http.post(`${environment.baseUrl}/auth/register`, data, { responseType: 'text' });
  }

  saveToken(token: string): void {
    this.cookieService.set('access_token', token);
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
    this.cookieService.delete('access_token');
    this.cookieService.deleteAll();
  }

  isLoggedIn(): Observable<boolean> {
  const token = this.cookieService.get('access_token');
  if (!token) {
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

login(credentials: { email: string; password: string }): Observable<any> {
  return this.http.post<any>(`${environment.baseUrl}/auth/login`, credentials);
}
}