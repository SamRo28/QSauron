import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ConvertedCircuit,
  ImportFormatsResponse,
  ImportItem,
  ImportResult
} from '../models/import.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectImportService {
  private readonly baseUrl = `${environment.apiUrl}/projects/import`;

  constructor(private http: HttpClient) {}

  getFormats(): Observable<ImportFormatsResponse> {
    return this.http
      .get<ImportFormatsResponse>(`${this.baseUrl}/formats`, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  importProjects(email: string, items: ImportItem[]): Observable<ImportResult> {
    return this.http
      .post<ImportResult>(this.baseUrl, { email, items }, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  convertOnly(
    email: string,
    item: { fileName?: string | null; format: string; code: string }
  ): Observable<ConvertedCircuit> {
    return this.http
      .post<ConvertedCircuit>(`${this.baseUrl}/convert`, { email, ...item }, { withCredentials: true })
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    let msg: string | undefined = err.error?.error;
    if (!msg) {
      if (err.status === 401) {
        msg = 'Your session has expired. Please log in again.';
      } else if (err.status === 413) {
        msg = 'The selected files are too large';
      } else if (err.status === 0) {
        msg = 'Server not reachable';
      } else {
        msg = err.message || 'An error occurred';
      }
    }
    return throwError(() => new Error(msg));
  }
}
