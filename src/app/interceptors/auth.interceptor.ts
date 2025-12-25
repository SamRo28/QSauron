import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Always set withCredentials: true to send cookies
  const authReq = req.clone({
    withCredentials: true
  });

  return next(authReq);
};
