import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  FormatsResponse,
  SingleConvertRequest,
  SingleConvertResponse,
  BatchConvertItem,
  BatchConvertResponse
} from '../models/converter.model';

@Injectable({
  providedIn: 'root'
})
export class ConverterService {
  constructor(private http: HttpClient) {}

  /**
   * Resuelve la URL de la API de forma flexible y segura,
   * admitiendo rutas con o sin prefijo `/api` o barras finales.
   */
  private getApiUrl(endpoint: string): string {
    const rawBase = (environment as any).converterUrl || 'http://localhost:3000';
    const cleanBase = rawBase.replace(/\/+$/, '');
    const apiBase = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${apiBase}${cleanEndpoint}`;
  }

  /**
   * Obtiene el catálogo de formatos soportados por q-convert-api
   * (formatos nativos, formatos puente como Quirk, formatos de destino y elegibles para Jupyter).
   */
  getFormats(): Observable<FormatsResponse> {
    return this.http.get<FormatsResponse>(this.getApiUrl('/formats')).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Ejecuta una conversión individual de circuito cuántico.
   */
  convertSingle(request: SingleConvertRequest): Observable<SingleConvertResponse> {
    return this.http.post<SingleConvertResponse>(this.getApiUrl('/convert'), request).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Ejecuta una conversión en lote (mismo o distintos formatos).
   */
  convertBatch(items: BatchConvertItem[]): Observable<BatchConvertResponse> {
    return this.http.post<BatchConvertResponse>(this.getApiUrl('/convert/batch'), { items }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Comprueba el estado de vida del microservicio de conversión.
   */
  checkHealth(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(this.getApiUrl('/health')).pipe(
      catchError(error => this.handleError(error))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ocurrió un error inesperado al comunicarse con el conversor.';

    if (error.error) {
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
      message = `No se pudo conectar con el microservicio de conversión (${this.getApiUrl('/')}). Verifique que q-convert-api esté en ejecución.`;
    } else {
      message = `Error del servidor (${error.status}): ${error.statusText || error.message}`;
    }

    return throwError(() => new Error(message));
  }
}

