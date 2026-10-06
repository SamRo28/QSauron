import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  ImportFormat,
  ImportFormatsResponse,
  ImportItem,
  ImportLimits,
  ImportResult
} from '../../models/import.model';
import { ProjectImportService } from '../../services/project-import.service';
import { ProjectEventsService } from '../../services/project-events.service';
import { AuthService } from '../../services/auth.service';
import {
  acceptAttrFor,
  checkBatch,
  formatBytes,
  readCircuitFile
} from '../../utils/import-file.utils';

export interface ImportEntry {
  item?: ImportItem;
  error?: string;
  lastError?: string;
  sizeKb?: number;
}

@Component({
  selector: 'app-project-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './project-import.component.html',
  styleUrls: ['./project-import.component.css']
})
export class ProjectImportComponent implements OnInit {
  formats: ImportFormat[] = [];
  limits: ImportLimits = {
    maxFiles: 20,
    maxFileBytes: 2097152,
    maxTotalBytes: 20971520,
    maxQubits: 16
  };
  loadingFormats: boolean = true;

  selectedFormatId: string = '';
  get selectedFormat(): ImportFormat | null {
    return this.formats.find(f => f.id === this.selectedFormatId) || null;
  }
  activeTab: 'upload' | 'paste' = 'upload';
  isDragging: boolean = false;

  entries: ImportEntry[] = [];
  private lastSentItems: ImportItem[] = [];

  // Paste code form
  pastedProjectName: string = '';
  pastedCode: string = '';

  // Process state
  importing: boolean = false;
  importResult: ImportResult | null = null;
  globalError: string | null = null;

  environment = environment;

  constructor(
    private importService: ProjectImportService,
    private projectEvents: ProjectEventsService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFormats();
    }
  }

  loadFormats(): void {
    this.loadingFormats = true;
    this.importService.getFormats().subscribe({
      next: (resp: ImportFormatsResponse) => {
        this.formats = resp.formats || [];
        if (resp.limits) {
          this.limits = resp.limits;
        }
        this.loadingFormats = false;
      },
      error: (err: any) => {
        this.globalError = err.message || 'Failed to load supported formats';
        this.loadingFormats = false;
      }
    });
  }

  formatLabel(id: string | null | undefined): string {
    if (!id) return '';
    const fmt = this.formats.find(f => f.id === id);
    return fmt ? fmt.label : id;
  }

  get limitsText(): string {
    return `Up to ${this.limits.maxFiles} files · ${formatBytes(this.limits.maxFileBytes)} per file · ${formatBytes(this.limits.maxTotalBytes)} in total · ${this.limits.maxQubits} qubits max`;
  }

  get acceptAttr(): string {
    return this.selectedFormat ? acceptAttrFor(this.selectedFormat) : '';
  }

  // Drag and drop handlers
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    if (this.selectedFormat) {
      this.isDragging = true;
    }
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    if (!this.selectedFormat) return;

    if (e.dataTransfer && e.dataTransfer.files) {
      this.handleFileList(e.dataTransfer.files);
    }
  }

  onFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileList(input.files);
      input.value = '';
    }
  }

  private async handleFileList(files: FileList): Promise<void> {
    if (!this.selectedFormat) return;
    const currentFormat = this.selectedFormat;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Avoid duplicates by fileName and format
      const exists = this.entries.some(
        e => e.item && e.item.fileName === file.name && e.item.format === currentFormat.id
      );
      if (exists) {
        continue;
      }

      const res = await readCircuitFile(file, currentFormat, this.limits);
      const sizeKb = Number((file.size / 1024).toFixed(1));

      if (res.error) {
        this.entries.push({
          error: `${file.name}: ${res.error}`,
          sizeKb
        });
      } else if (res.item) {
        this.entries.push({
          item: res.item,
          sizeKb
        });
      }
    }
  }

  addPastedCode(): void {
    if (!this.selectedFormat) return;
    const name = this.pastedProjectName.trim();
    const code = this.pastedCode.trim();

    if (!name || !code) return;

    const sizeKb = Number((new TextEncoder().encode(code).length / 1024).toFixed(1));

    this.entries.push({
      item: {
        fileName: null,
        format: this.selectedFormat.id,
        projectName: name,
        code
      },
      sizeKb
    });

    this.pastedProjectName = '';
    this.pastedCode = '';
  }

  removeEntry(index: number): void {
    this.entries.splice(index, 1);
  }

  clearEntries(): void {
    this.entries = [];
    this.importResult = null;
    this.globalError = null;
  }

  get validItems(): ImportItem[] {
    return this.entries
      .filter(e => !!e.item && !e.error)
      .map(e => e.item!);
  }

  get batchValidationError(): string | null {
    if (this.validItems.length === 0) {
      return 'No valid circuits to import';
    }
    return checkBatch(this.validItems, this.limits);
  }

  importAll(): void {
    const items = this.validItems;
    if (items.length === 0 || this.batchValidationError) return;

    const email = this.authService.getCurrentUser();
    if (!email) {
      this.globalError = 'Your session has expired. Please log in again.';
      return;
    }

    this.importing = true;
    this.globalError = null;
    this.lastSentItems = items.map(it => ({ ...it }));

    this.importService.importProjects(email, items).subscribe({
      next: (result: ImportResult) => {
        this.importResult = result;
        this.importing = false;
        if (result.successCount > 0) {
          this.projectEvents.notifyProjectsChanged();
        }
      },
      error: (err: any) => {
        this.globalError = err.message || 'Import failed';
        this.importing = false;
      }
    });
  }

  retryFailed(): void {
    if (!this.importResult) return;

    this.entries = this.importResult.items
      .filter(it => !it.success && !!this.lastSentItems[it.index])
      .map(f => {
        const original = this.lastSentItems[f.index];
        return {
          item: { ...original },
          lastError: f.error || f.errorCode,
          sizeKb: Number((new TextEncoder().encode(original.code).length / 1024).toFixed(1))
        };
      });

    this.importResult = null;
    this.globalError = null;
  }

  viewProject(projectId: string): void {
    this.router.navigate(['/dashboard/project', projectId]);
  }

  openInQuMu(projectId: string): void {
    window.open(`${environment.quMuUrl}/project/${projectId}`, '_blank');
  }
}
