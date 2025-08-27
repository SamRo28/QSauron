import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  email: string;
  pwd: string;
}

export interface LoginResponse {
  token: string;
}

export interface Project {
  id: number;
  name: string;
  mutantCycles: any[];
  testSuite: any;
  qProgram: any;
  users: {
    id: string;
  }[];
}

export interface ProjectRequest {
  email: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/users';
  private readonly PROJECTS_URL = 'http://localhost:8080/projects';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  private currentUserSubject = new BehaviorSubject<string | null>(this.getCurrentUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Register a new user
   */
  register(user: User): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/create`, user)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Login user
   */
  login(user: User): Observable<string> {
    return this.http.post<string>(`${this.API_URL}/login`, user, { responseType: 'text' as 'json' })
      .pipe(
        tap(token => {
          this.setSession(token, user.email);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.hasToken();
  }

  /**
   * Get current user email
   */
  getCurrentUser(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.USER_KEY);
    }
    return null;
  }

  /**
   * Get user projects
   */
  getUserProjects(): Observable<Project[]> {
    const email = this.getCurrentUser();
    const token = this.getToken();
    
    if (!email || !token) {
      return throwError(() => new Error('User not authenticated'));
    }
    
    const request: ProjectRequest = {
      email: email,
      token: token
    };
    
    return this.http.post<Project[]>(`${this.PROJECTS_URL}/getAllByUser`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  private setSession(token: string, email: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, email);
      this.isAuthenticatedSubject.next(true);
      this.currentUserSubject.next(email);
    }
  }

  private clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      this.isAuthenticatedSubject.next(false);
      this.currentUserSubject.next(null);
    }
  }

  private hasToken(): boolean {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(this.TOKEN_KEY);
      return token !== null && token.length > 0;
    }
    return false;
  }

  private getCurrentUserFromStorage(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.USER_KEY);
    }
    return null;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Bad request. Please check your input.';
          break;
        case 401:
        case 403:
          errorMessage = 'Invalid credentials. Please check your email and password.';
          break;
        case 409:
          errorMessage = 'User already exists. Please try with a different email.';
          break;
        case 500:
          errorMessage = 'Internal server error. Please try again later.';
          break;
        default:
          errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
