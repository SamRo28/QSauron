import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Project, ProjectSummary } from '../../models/project.model';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-side-bar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './side-bar.component.html',
    styleUrl: './side-bar.component.css'
})
export class SideBarComponent implements OnInit {
    projects: ProjectSummary[] = [];
    selectedProject: ProjectSummary | null = null;
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
            } else {
                this.projects = [];
            }
        });
    }

    loadUserProjects() {
        this.loading = true;
        this.error = null;

        this.authService.getUserProjectSummaries().subscribe({
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

    toggleProjectExpansion(project: ProjectSummary, event: Event) {
        event.stopPropagation();
        const newSet = new Set(this.expandedProjects);
        if (newSet.has(project.id)) {
            newSet.delete(project.id);
        } else {
            newSet.add(project.id);
        }
        this.expandedProjects = newSet;
        console.log('Project visibility toggled:', project.name, 'Expanded:', this.expandedProjects.has(project.id));
    }

    selectProject(project: ProjectSummary) {
        this.selectedProject = project;
        this.router.navigate(['/dashboard/project', project.id]);
    }

    hasGeneratedCode(project: ProjectSummary): boolean {
        return project.hasGeneratedCode;
    }

    hasMutantCycles(project: ProjectSummary): boolean {
        return project.hasMutantCycles;
    }

    hasTestCases(project: ProjectSummary): boolean {
        return project.hasTestCases;
    }
}
