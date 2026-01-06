import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../../models/project.model';
import { ProjectNote } from '../../models/project-note.model';

@Component({
    selector: 'app-project-notes',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './project-notes.component.html',
    styleUrl: './project-notes.component.css'
})
export class ProjectNotesComponent {

    @Input() project: Project | null = null;
    isPanelOpen: boolean = false;

    /**
     * Obtiene las notas ordenadas por timestamp descendente (más reciente primero)
     */
    get sortedNotes(): ProjectNote[] {
        if (!this.project?.projectNotes) {
            return [];
        }
        return [...this.project.projectNotes].sort((a, b) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
    }

    /**
     * Abre/cierra el panel de notas
     */
    togglePanel(): void {
        if (!this.project) return;
        this.isPanelOpen = !this.isPanelOpen;
    }

    /**
     * Formatea la fecha para mostrar
     */
    formatDate(date: any): string {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Ahora mismo';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;

        return d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
}
