import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import {
  FormatsResponse,
  SingleConvertRequest,
  SingleConvertResponse
} from '../models/converter.model';

/**
 * Traductor de circuitos. Todas las llamadas van a reper (`/converter`), que es el
 * único punto de acceso a q-convert-api; el navegador nunca lo llama directamente.
 */
@Injectable({
  providedIn: 'root'
})
export class ConverterService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private baseUrl = `${environment.apiUrl}/converter`;

  /** Catálogo de formatos (única fuente: q-convert-api, vía reper). */
  getFormats(): Observable<FormatsResponse> {
    return this.http.get<FormatsResponse>(`${this.baseUrl}/formats`, { withCredentials: true }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /** Conversión individual (solo administradores). */
  convertSingle(request: SingleConvertRequest): Observable<SingleConvertResponse> {
    const email = this.authService.getCurrentUser();
    return this.http.post<SingleConvertResponse>(
      `${this.baseUrl}/convert`,
      { email, ...request },
      { withCredentials: true }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /** Comprueba que reper llega a q-convert-api. */
  checkHealth(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(`${this.baseUrl}/health`, { withCredentials: true }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ocurrió un error inesperado al comunicarse con el conversor.';

    if (error.status === 403) {
      message = 'Administrator privileges required';
    } else if (error.error) {
      if (typeof error.error === 'object' && error.error.error) {
        message = error.error.error;
      } else if (typeof error.error === 'string') {
        try {
          const parsed = JSON.parse(error.error);
          message = parsed.error || error.error;
        } catch {
          message = error.error;
        }
      }
    } else if (error.status === 0) {
      message = 'Code converter is not available';
    } else {
      message = `Error del servidor (${error.status}): ${error.statusText || error.message}`;
    }

    return throwError(() => new Error(message));
  }
}
