import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProjectDetailsDto } from '../../models/project.model';
import { map, switchMap } from 'rxjs/operators';
import { ProjectNotesComponent } from '../project-notes/project-notes.component';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [CommonModule, ProjectNotesComponent],
  templateUrl: './project-details.component.html',
  styleUrl: './project-details.component.css'
})
export class ProjectDetailsComponent implements OnInit {
  project: ProjectDetailsDto | null = null;
  loading: boolean = true;
  error: string | null = null;

  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.paramMap.pipe(
      map(params => params.get('id')),
      switchMap(id => {
        this.loading = true;
        this.project = null; // Reset to trigger DOM re-render and animations
        if (id) {
          return this.authService.getProjectDetails(id);
        } else {
          throw new Error("Project ID not found in route");
        }
      })
    ).subscribe({
      next: (project) => {
        this.project = project || null;
        this.loading = false;
        if (!this.project) {
          this.error = "Project not found";
        }
      },
      error: (err) => {
        this.error = "Error loading project properties";
        this.loading = false;
        console.error(err);
      }
    });
  }

  // QuCo Logic
  hasQuCo(): boolean {
    return !!this.project?.quCoDetails && !!this.project.quCoDetails.generatorType;
  }

  getQuCoInfo() {
    if (!this.project?.quCoDetails) return null;
    return {
      generatorType: this.project.quCoDetails.generatorType || 'Unknown',
      qubits: this.project.quCoDetails.qubits
    };
  }

  // QuTe Logic
  hasQuTe(): boolean {
    return !!(this.project?.quTeDetails && this.project.quTeDetails.length > 0);
  }

  getQuTeDetails() {
    return this.project?.quTeDetails || [];
  }

  getTestCaseType(suite: any): string {
    return suite.suiteType || 'Unknown';
  }

  // QuMu Logic
  hasQuMu(): boolean {
    return !!(this.project?.quMuDetails && this.project.quMuDetails.length > 0);
  }

  getQuMuDetails() {
    return this.project?.quMuDetails || [];
  }

  openTool(toolName: string) {
    if (!this.project?.id) return;

    if (toolName === 'QuMu') {
      window.location.href = `${environment.quMuUrl}/project/${this.project.id}`;
    } else if (toolName === 'QuCo') {
      let localSName = 'selectedProjectId_algorithm'
      if (this.project.quCoDetails?.generatorType === 'MATRIX') {
        localSName = 'selectedProjectId_matrices'
      }

      localStorage.setItem(`${localSName}`, this.project.id);

      window.location.href = `${environment.quCoUrl}/${this.project.quCoDetails?.generatorType}`;

    } else if (toolName === 'QuTe') {
      window.location.href = `${environment.quTeUrl}/project/${this.project.id}`;
    }
  }

  addTool(toolName: string) {
    if (!this.project?.id) return;

    if (toolName === 'QuMu') {
      window.location.href = `${environment.quMuUrl}/project/${this.project.id}`;


    } else if (toolName === 'QuCo') {

      window.location.href = `${environment.quCoUrl}`;

    } else if (toolName === 'QuTe') {
      window.location.href = `${environment.quTeUrl}/project/${this.project.id}`;
    }
  }
}
