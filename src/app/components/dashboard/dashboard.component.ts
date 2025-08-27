import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, Project } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser: string | null = null;
  projects: Project[] = [];
  selectedProject: Project | null = null;
  loading: boolean = false;
  error: string | null = null;
  sidebarCollapsed: boolean = false;
  expandedProjects: Set<number> = new Set();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    // Subscribe to authentication state changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadUserProjects();
      }
    });

    // Load projects if user is already authenticated
    if (this.currentUser) {
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

  logout() {
    this.authService.logout();
  }

  selectProject(project: Project) {
    this.selectedProject = project;
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

  hasGeneratedCode(project: Project): boolean {
    // Implementar lógica para verificar si el proyecto tiene código generado
    return project.qProgram !== null && project.qProgram !== undefined;
  }

  hasMutantCycles(project: Project): boolean {
    return project.mutantCycles && project.mutantCycles.length > 0;
  }

  hasTestCases(project: Project): boolean {
    return project.testSuite !== null && project.testSuite !== undefined;
  }
}
