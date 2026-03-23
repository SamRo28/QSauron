import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Always set withCredentials: true to send cookies
  const authReq = req.clone({
    withCredentials: true
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized and not already trying to refresh or login
      if (error.status === 401 && !req.url.includes('/login') && !req.url.includes('/refreshToken')) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            // If refresh succeeds, retry the original request
            return next(authReq);
          }),
          catchError((refreshError) => {
            // If refresh fails, logout
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
