import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ConverterService } from '../../services/converter.service';
import { FormatMetadata, SingleConvertResponse } from '../../models/converter.model';

@Component({
  selector: 'app-code-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './code-converter.component.html',
  styleUrl: './code-converter.component.css'
})
export class CodeConverterComponent implements OnInit, OnDestroy {
  private converterService = inject(ConverterService);
  private sanitizer = inject(DomSanitizer);

  // Formatos soportados
  sourceFormats: FormatMetadata[] = [];
  destFormats: FormatMetadata[] = [];
  jupyterEligibleFormats: string[] = [];
  bridgedFormats: Record<string, string> = {};
  formatLabels: Record<string, string> = {};
  formatExtensions: Record<string, string[]> = {};
  formatDescriptions: Record<string, string> = {};
  catalogLoaded = false;

  // Selección actual
  selectedSource: string = 'qasm';
  selectedDest: string = 'qiskit';
  generateJupyter: boolean = false;
  showSvgCode: boolean = false;

  // Código de entrada inicial (Estado de Bell)
  codeInput: string = `OPENQASM 2.0;
include "qelib1.inc";

qreg q[2];
creg c[2];

// Estado de Bell (|00> + |11>) / sqrt(2)
h q[0];
cx q[0], q[1];
measure q -> c;`;

  // Estados de ejecución y UI
  isConverting: boolean = false;
  conversionError: string | null = null;
  result: SingleConvertResponse | null = null;
  safeSvg: SafeHtml | null = null;
  apiConnected: boolean | null = null;
  copySuccess: boolean = false;

  // Sujeto para auto-conversión reactiva con debounce
  private codeChangeSubject = new Subject<string>();
  private sub?: Subscription;
  private convertSub?: Subscription;

  ngOnInit(): void {
    this.loadCatalogFromApi();

    // Auto-conversión suave tras 700ms de inactividad al teclear
    this.sub = this.codeChangeSubject.pipe(
      debounceTime(700),
      distinctUntilChanged()
    ).subscribe(() => {
      this.convert();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.convertSub?.unsubscribe();
  }

  private buildMetadata(id: string, isSource: boolean, isDest: boolean): FormatMetadata {
    return {
      id,
      name: this.formatLabels[id] ?? id,
      extension: this.formatExtensions[id]?.[0] ?? '',
      isSource,
      isDest,
      supportsJupyter: this.jupyterEligibleFormats.includes(id),
      isBridged: !!this.bridgedFormats[id],
      description: this.formatDescriptions[id] ?? ''
    };
  }

  loadCatalogFromApi(): void {
    this.converterService.getFormats().subscribe({
      next: (resp) => {
        this.apiConnected = true;
        this.formatLabels = resp.formatLabels ?? {};
        this.formatExtensions = resp.formatExtensions ?? {};
        this.formatDescriptions = resp.formatDescriptions ?? {};
        if (resp.jupyterEligibleDestFormats) {
          this.jupyterEligibleFormats = resp.jupyterEligibleDestFormats;
        }
        if (resp.bridgedSourceFormats) {
          this.bridgedFormats = resp.bridgedSourceFormats;
        }

        if (Array.isArray(resp.sourceFormats) && resp.sourceFormats.length > 0) {
          this.sourceFormats = resp.sourceFormats.map(id =>
            this.buildMetadata(id, true, resp.destFormats?.includes(id) ?? false)
          );
        }

        if (Array.isArray(resp.destFormats) && resp.destFormats.length > 0) {
          this.destFormats = resp.destFormats.map(id =>
            this.buildMetadata(id, resp.sourceFormats?.includes(id) ?? false, true)
          );
        }

        // Si la selección actual no está en la lista recibida, ajustarla
        if (!this.sourceFormats.some(f => f.id === this.selectedSource)) {
          this.selectedSource = this.sourceFormats[0]?.id || 'qasm';
        }
        if (!this.destFormats.some(f => f.id === this.selectedDest)) {
          this.selectedDest = this.destFormats[0]?.id || 'qiskit';
        }

        // La conversión inicial espera a tener catálogo
        if (!this.catalogLoaded) {
          this.catalogLoaded = true;
          this.convert();
        }
      },
      error: () => {
        this.apiConnected = false;
        this.conversionError = 'Code converter is not available';
      }
    });
  }

  checkHealth(): void {
    this.converterService.checkHealth().subscribe({
      next: () => {
        this.apiConnected = true;
      },
      error: () => {
        this.apiConnected = false;
      }
    });
  }

  onCodeChange(val: string): void {
    this.codeInput = val;
    this.codeChangeSubject.next(val);
  }

  onSourceChange(newSource: string): void {
    this.selectedSource = newSource;
    this.loadSampleCode(newSource);
    this.convert();
  }

  onDestChange(newDest: string): void {
    this.selectedDest = newDest;
    // Si el destino ya no admite Jupyter, desmarcarlo
    if (!this.isJupyterSupported()) {
      this.generateJupyter = false;
    }
    this.showSvgCode = false;
    this.convert();
  }

  toggleJupyter(): void {
    this.generateJupyter = !this.generateJupyter;
    this.convert();
  }

  isJupyterSupported(): boolean {
    return this.jupyterEligibleFormats.includes(this.selectedDest);
  }

  get isSvgOutput(): boolean {
    return this.selectedDest === 'svg' || this.selectedDest === 'svg-inline';
  }

  convert(): void {
    if (!this.codeInput || !this.codeInput.trim()) {
      this.result = null;
      this.safeSvg = null;
      this.conversionError = null;
      return;
    }

    this.isConverting = true;
    this.conversionError = null;

    const req = {
      code: this.codeInput,
      sourceFormat: this.selectedSource,
      destFormat: this.selectedDest,
      jupyter: this.isJupyterSupported() ? this.generateJupyter : false
    };

    this.convertSub?.unsubscribe();
    this.convertSub = this.converterService.convertSingle(req).subscribe({
      next: (res) => {
        this.result = res;
        this.isConverting = false;
        this.apiConnected = true;

        if (this.isSvgOutput && res.output) {
          this.safeSvg = this.sanitizer.bypassSecurityTrustHtml(res.output);
        } else {
          this.safeSvg = null;
        }
      },
      error: (err: Error) => {
        this.isConverting = false;
        this.result = null;
        this.safeSvg = null;
        this.conversionError = err.message || 'Error desconocido al comunicar con el servicio de conversión.';
      }
    });
  }

  openInQuirk(): void {
    // Si la entrada es una URL completa de Quirk
    const trimmed = this.codeInput.trim();
    if (trimmed.startsWith('https://algassert.com/quirk#circuit=') || trimmed.startsWith('http://algassert.com/quirk#circuit=')) {
      window.open(trimmed, '_blank');
      return;
    }

    // Si la entrada es un JSON válido de Quirk
    try {
      JSON.parse(trimmed);
      const url = `https://algassert.com/quirk#circuit=${encodeURIComponent(trimmed)}`;
      window.open(url, '_blank');
    } catch {
      // Si no es JSON puro, intentar abrir la página base de Quirk
      window.open('https://algassert.com/quirk', '_blank');
    }
  }

  copyOutput(): void {
    if (!this.result?.output) return;

    navigator.clipboard.writeText(this.result.output).then(() => {
      this.copySuccess = true;
      setTimeout(() => {
        this.copySuccess = false;
      }, 2000);
    });
  }

  downloadOutput(): void {
    if (!this.result?.output) return;

    const filename = this.result.filename || this.suggestFilename();
    const mimeType = this.generateJupyter ? 'application/x-ipynb+json;charset=utf-8' : 'text/plain;charset=utf-8';

    const blob = new Blob([this.result.output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private suggestFilename(): string {
    const destObj = this.destFormats.find(f => f.id === this.selectedDest);
    let ext = destObj ? destObj.extension : '.txt';
    if (this.generateJupyter) {
      ext = '.ipynb';
    }
    return `circuito_${this.selectedSource}_a_${this.selectedDest}${ext}`;
  }

  loadSampleCode(format: string): void {
    switch (format) {
      case 'qasm':
        this.codeInput = `OPENQASM 2.0;
include "qelib1.inc";

qreg q[2];
creg c[2];

// Estado de Bell (|00> + |11>) / sqrt(2)
h q[0];
cx q[0], q[1];
measure q -> c;`;
        break;

      case 'qasm3':
        this.codeInput = `OPENQASM 3.0;
include "stdgates.inc";

// Oráculo definido con gate: en Quirk se dibuja como una caja
gate oracle a, b, c {
  ccx a, b, c;
}

qubit[3] q;
bit[3] c;

h q[0];
h q[1];
x q[2];
h q[2];
oracle q[0], q[1], q[2];
c = measure q;`;
        break;

      case 'qiskit':
        this.codeInput = `from qiskit import QuantumCircuit

# Estado de Bell (|00> + |11>) / sqrt(2)
qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure([0, 1], [0, 1])`;
        break;

      case 'cirq':
        this.codeInput = `import cirq

q = cirq.LineQubit.range(2)

# Estado de Bell (|00> + |11>) / sqrt(2)
circuit = cirq.Circuit(
    cirq.H(q[0]),
    cirq.CNOT(q[0], q[1]),
    cirq.measure(*q, key='c'),
)`;
        break;

      case 'quirk':
        this.codeInput = `https://algassert.com/quirk#circuit={"cols":[["H"],["•","X"],["Measure","Measure"]]}`;
        break;

      case 'quil':
        this.codeInput = `# Circuito Bell State en Quil
H 0
CNOT 0 1
MEASURE 0 [0]
MEASURE 1 [1]`;
        break;

      case 'qobj':
        this.codeInput = JSON.stringify({
          qobj_id: 'bell_state',
          type: 'QASM',
          schema_version: '1.0',
          experiments: [
            {
              header: { number_of_qubits: 2, memory_slots: 2 },
              instructions: [
                { name: 'h', qubits: [0] },
                { name: 'cx', qubits: [0, 1] },
                { name: 'measure', qubits: [0], memory: [0] },
                { name: 'measure', qubits: [1], memory: [1] }
              ]
            }
          ]
        }, null, 2);
        break;

      case 'ionq':
        this.codeInput = JSON.stringify({
          qubits: 2,
          circuit: [
            { gate: 'h', target: 0 },
            { gate: 'cnot', control: 0, target: 1 }
          ]
        }, null, 2);
        break;

      case 'quantum-circuit':
        this.codeInput = JSON.stringify({
          numQubits: 2,
          gates: [
            { name: 'h', qubits: [0] },
            { name: 'cx', qubits: [0, 1] }
          ]
        }, null, 2);
        break;

      default:
        this.codeInput = `// Introduce circuito en formato ${format.toUpperCase()}`;
    }
  }

  getFormatDescription(formatId: string, isSource: boolean): string {
    const list = isSource ? this.sourceFormats : this.destFormats;
    const found = list.find(f => f.id === formatId);
    return found ? found.description : '';
  }
}

