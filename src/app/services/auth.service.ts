import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';

import { Project, User, ProjectSummary, ProjectDetailsDto, CurrentUserProfile } from '../models/project.model';

export interface LoginResponse {
  token: string;
}

export interface ProjectRequest {
  email: string;
  token: string;
}

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/users`;
  private readonly RECOVERY_URL = `${environment.apiUrl}/recovery`;
  private readonly PROJECTS_URL = `${environment.apiUrl}/projects`;
  // Token is now handled via HttpOnly cookie
  private readonly USER_KEY = 'current_user';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<string | null>(this.getCurrentUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  // In-memory user profile with role and isAdmin (NEVER persisted to browser storage to prevent tampering)
  private currentUserProfileSubject = new BehaviorSubject<CurrentUserProfile | null>(null);
  public currentUserProfile$ = this.currentUserProfileSubject.asObservable();
  public isAdmin$ = this.currentUserProfileSubject.pipe(map(profile => profile?.isAdmin === true));

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.hasUser().subscribe(isAuthenticated => {
        this.isAuthenticatedSubject.next(isAuthenticated);
        if (isAuthenticated) {
          this.getUser().subscribe({
            next: (profile) => console.log('Session user loaded:', profile?.email),
            error: () => this.clearSession()
          });
        }
      });
    }
  }

  /**
   * Register a new user
   */
  register(user: User): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/create`, user);
  }

  /**
   * Login user
   * Returns validation response:
   * - { status: '2fa' } (or similar) -> 2FA required
   * - { token: '...' } -> Success
   */
  login(user: User): Observable<any> {
    this.clearSession(); // Ensure fresh start
    return this.http.post<any>(`${this.API_URL}/login`, user);
  }

  /**
   * Refresh the authentication token using the refresh token cookie
   */
  refreshToken(): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/refreshToken`, {}, { withCredentials: true });
  }

  /**
   * Logout user
   */
  logout(): void {
    this.http.post(`${this.API_URL}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {
        this.clearSession();
        this.router.navigate(['/login']);
      },
      error: () => {
        // Even if the backend fails, clear local session and redirect
        this.clearSession();
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Step 1: Request Password Recovery
   */
  requestRecovery(email: string): Observable<string> {
    return this.http.post(`${this.RECOVERY_URL}/request`, { email }, { responseType: 'text' });
  }

  /**
   * Step 2: Validate Recovery Code
   */
  validateRecoveryCode(email: string, tokenId: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.RECOVERY_URL}/validate`, { email, tokenId, code }, { withCredentials: true }).pipe(
      tap(() => {
        // The backend sets SESSION_TOKEN and REFRESH_TOKEN cookies.
        // We set the session locally to indicate the user is now authenticated (temporarily for reset).
        this.setSession(email);
      })
    );
  }

  /**
   * Step 3: Reset Password
   */
  resetPassword(email: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.RECOVERY_URL}/reset`, { email, newPassword }, { withCredentials: true });
  }

  /**
   * Get authentication token
   * @deprecated Token is now in HttpOnly cookie
   */
  getToken(): string | null {
    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  loadQRCode(): Observable<any> {
    if (typeof window === 'undefined') {
      return of(null);
    }
    let email = sessionStorage.getItem('email');
    // Note: withCredentials will be handled by interceptor
    return this.http.post<any>(`${this.API_URL}/activate2FA`, { email }).pipe(
      tap(data => {
        console.log('QR Code Data:', data);
      })
    );
  }

  verify2FACode(email: string, code: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/verify2FACode`, { email, code });
  }

  getUser(): Observable<CurrentUserProfile> {
    return this.http.post<CurrentUserProfile>(`${this.API_URL}/getUser`, {}, {
      withCredentials: true
    }).pipe(
      tap(userProfile => {
        console.log('GetUser response:', userProfile);
        if (userProfile) {
          this.currentUserProfileSubject.next(userProfile);
          if (userProfile.email) {
            this.setSession(userProfile.email);
          }
        }
      })
    );
  }

  /**
   * Get current user profile from memory or fetch from backend
   */
  getUserProfile(): Observable<CurrentUserProfile | null> {
    const current = this.currentUserProfileSubject.value;
    if (current) {
      return of(current);
    }
    return this.getUser().pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Check in-memory if the current user is an admin (never reads from localStorage)
   */
  isAdmin(): boolean {
    return this.currentUserProfileSubject.value?.isAdmin === true;
  }


  /**
   * Get current user email from local storage (real session)
   */
  getCurrentUser(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.USER_KEY);
    }
    return null;
  }

  /**
   * Get user projects lightweight DTO for details page
   */
  getProjectDetails(projectId: string): Observable<ProjectDetailsDto> {
    const email = this.currentUserSubject.value || '';
    console.log("Fetching project details", projectId, "for user", email);
    return this.http.post<ProjectDetailsDto>(`${this.PROJECTS_URL}/getProjectDetails`, {
      email: email,
      projectId: projectId
    }, { withCredentials: true });
  }

  getUserProjectSummaries(): Observable<ProjectSummary[]> {
    const email = this.getCurrentUser();

    if (!email) {
      return throwError(() => new Error('User not authenticated'));
    }

    const request: any = {
      email: email
    };

    return this.http.post<ProjectSummary[]>(`${this.PROJECTS_URL}/getAllByUserSummary`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  public setSession(email: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, email);
      this.isAuthenticatedSubject.next(true);
      this.currentUserSubject.next(email);
    }
  }

  private clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.USER_KEY);
      this.isAuthenticatedSubject.next(false);
      this.currentUserSubject.next(null);
      this.currentUserProfileSubject.next(null);
    }
  }


  private hasUser(): Observable<boolean> {
    if (isPlatformBrowser(this.platformId)) {
      // Check if we have a user in localStorage (real session)
      const user = localStorage.getItem(this.USER_KEY);
      if (user) {
        return of(true);
      }
    }
    return of(false);
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
          errorMessage = `An error occurred`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
