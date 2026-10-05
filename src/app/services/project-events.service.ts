import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProjectEventsService {
  readonly projectsChanged$ = new Subject<void>();

  notifyProjectsChanged(): void {
    this.projectsChanged$.next();
  }
}
