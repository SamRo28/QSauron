import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Project } from '../../models/project.model';
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
  project: Project | null = null;
  loading: boolean = true;
  error: string | null = null;

  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  ngOnInit() {
    this.route.paramMap.pipe(
      map(params => params.get('id')),
      switchMap(id => {
        this.loading = true;
        if (id) {
          return this.authService.getProject(id);
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
    return !!this.project?.qProgram?.generator;
  }

  getQuCoInfo() {
    if (!this.project?.qProgram) return null;
    return {
      generatorType: this.project.qProgram.generator?.type || 'Unknown',
      qubits: this.project.qProgram.qubits
    };
  }

  // QuTe Logic
  hasQuTe(): boolean {
    return !!(this.project?.testSuites && this.project.testSuites.length > 0);
  }

  getQuTeDetails() {
    return this.project?.testSuites || [];
  }

  getTestCaseType(testSuite: any): string {
    // Assuming all test cases in a suite have the same type, or we pick the first one
    if (testSuite.testCases && testSuite.testCases.length > 0) {
      return testSuite.testCases[0].type || 'Unknown';
    }
    return 'Empty Suite';
  }

  // QuMu Logic
  hasQuMu(): boolean {
    return !!(this.project?.mutantCycles && this.project.mutantCycles.length > 0);
  }

  getQuMuDetails() {
    return this.project?.mutantCycles || [];
  }

  openTool(toolName: string) {
    if (!this.project?.id) return;

    if (toolName === 'QuMu') {
      window.location.href = `${environment.quMuUrl}/project/${this.project.id}`;
    } else if (toolName === 'QuCo') {
      let localSName = 'selectedProjectId_algorithm'
      if (this.project.qProgram.generator.type === 'MATRIX') {
        localSName = 'selectedProjectId_matrices'
      }

      localStorage.setItem(`${localSName}`, this.project.id);

      window.location.href = `${environment.quCoUrl}/${this.project.qProgram.generator.type}`;

    } else if (toolName === 'QuTe') {
      window.location.href = `${environment.quTeUrl}/project/${this.project.id}`;
    }
  }

  addTool(toolName: string) {
    if (!this.project?.id) return;

    if (toolName === 'QuMu') {
      window.location.href = `${environment.quMuUrl}/project/${this.project.id}`;


    } else if (toolName === 'QuCo') {

      window.location.href = `${environment.quCoUrl}/${this.project.qProgram.generator.type}`;

    } else if (toolName === 'QuTe') {
      window.location.href = `${environment.quTeUrl}/project/${this.project.id}`;
    }
  }
}
