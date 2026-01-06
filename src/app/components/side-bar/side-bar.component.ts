import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Project } from '../../models/project.model';
import { Router } from '@angular/router';

@Component({
    selector: 'app-side-bar',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './side-bar.component.html',
    styleUrl: './side-bar.component.css'
})
export class SideBarComponent implements OnInit {
    projects: Project[] = [];
    selectedProject: Project | null = null;
    loading: boolean = false;
    error: string | null = null;
    sidebarCollapsed: boolean = false;
    expandedProjects: Set<string> = new Set();

    private authService = inject(AuthService);
    private router = inject(Router);

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.loadUserProjects();
            }
        });

        if (this.authService.getCurrentUser()) {
            this.loadUserProjects();
        }
    }

    loadUserProjects() {
        this.loading = true;
        this.error = null;

        this.authService.getUserProjects().subscribe({
            next: (projects) => {
                this.projects = projects;
                this.loading = false;
            },
            error: (error) => {
                this.error = error.message || 'Error al cargar los proyectos';
                this.loading = false;
                console.error('Error loading projects:', error);
            }
        });
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
    }

    toggleProjectExpansion(project: Project, event: Event) {
        event.stopPropagation();
        if (this.expandedProjects.has(project.id)) {
            this.expandedProjects.delete(project.id);
        } else {
            this.expandedProjects.add(project.id);
        }
    }

    selectProject(project: Project) {
        this.selectedProject = project;
        this.router.navigate(['/dashboard/project', project.id]);
    }

    hasGeneratedCode(project: Project): boolean {
        return project.qProgram !== null && project.qProgram !== undefined && project.qProgram.generator !== null && project.qProgram.generator !== undefined;
    }

    hasMutantCycles(project: Project): boolean {
        return project.mutantCycles && project.mutantCycles.length > 0;
    }

    hasTestCases(project: Project): boolean {
        return project.testSuites !== null && project.testSuites !== undefined && project.testSuites.length > 0;
    }
}
