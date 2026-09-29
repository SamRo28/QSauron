import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ConverterService } from '../../services/converter.service';
import { FormatMetadata, SingleConvertResponse } from '../../models/converter.model';

const FORMAT_METADATA: Record<string, { name: string; extension: string; description: string }> = {
  qasm: {
    name: 'OpenQASM (2.0)',
    extension: '.qasm',
    description: 'Estándar abierto para circuitos cuánticos (IBM/OpenQASM)'
  },
  quirk: {
    name: 'Quirk Simulator',
    extension: '.json',
    description: 'Formato JSON o URL interactiva de Quirk (formato puente)'
  },
  quil: {
    name: 'pyQuil / Quil',
    extension: '.quil',
    description: 'Lenguaje de instrucciones cuánticas de Rigetti Computing'
  },
  qobj: {
    name: 'IBM Qobj',
    extension: '.json',
    description: 'Especificación JSON de tareas para IBM Quantum'
  },
  ionq: {
    name: 'IonQ',
    extension: '.json',
    description: 'Especificación JSON de circuitos para procesadores de iones atrapados IonQ'
  },
  'quantum-circuit': {
    name: 'Quantum Circuit JS',
    extension: '.json',
    description: 'Estructura JSON de la librería quantum-circuit'
  },
  toaster: {
    name: 'Quirk Toaster',
    extension: '.json',
    description: 'Formato exportable de Quirk Toaster'
  },
  qiskit: {
    name: 'Qiskit (Python)',
    extension: '.py',
    description: 'Código ejecutable de IBM Qiskit con AerSimulator'
  },
  pyquil: {
    name: 'pyQuil (Python)',
    extension: '.py',
    description: 'Código ejecutable de Rigetti pyQuil'
  },
  braket: {
    name: 'AWS Braket (Python)',
    extension: '.py',
    description: 'Amazon Braket Quantum SDK en Python'
  },
  cirq: {
    name: 'Google Cirq (Python)',
    extension: '.py',
    description: 'Framework de algoritmos cuánticos de Google en Python'
  },
  tfq: {
    name: 'TensorFlow Quantum',
    extension: '.py',
    description: 'Librería cuántica de aprendizaje automático de Google'
  },
  qsharp: {
    name: 'Q# (Microsoft)',
    extension: '.qs',
    description: 'Microsoft Quantum Development Kit (Q#)'
  },
  quest: {
    name: 'QuEST (C)',
    extension: '.c',
    description: 'Quantum Exact Simulation Toolkit en C/C++'
  },
  cudaq: {
    name: 'NVIDIA CUDA-Q (C++)',
    extension: '.cpp',
    description: 'Plataforma híbrida CPU/GPU/QPU acelerada de NVIDIA'
  },
  js: {
    name: 'JavaScript',
    extension: '.js',
    description: 'Simulación del circuito cuántico en JavaScript nativo'
  },
  svg: {
    name: 'Diagrama SVG',
    extension: '.svg',
    description: 'Representación gráfica vectorial del circuito'
  },
  'svg-inline': {
    name: 'SVG (En línea)',
    extension: '.svg',
    description: 'Diagrama vectorial SVG sin envoltorios XML'
  }
};

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
  jupyterEligibleFormats: string[] = ['qiskit', 'pyquil', 'braket', 'cirq', 'tfq', 'qsharp', 'cudaq', 'js'];
  bridgedFormats: Record<string, string> = { quirk: 'qasm' };

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

  ngOnInit(): void {
    this.initDefaultFormats();
    this.loadCatalogFromApi();
    this.checkHealth();

    // Auto-conversión suave tras 700ms de inactividad al teclear
    this.sub = this.codeChangeSubject.pipe(
      debounceTime(700),
      distinctUntilChanged()
    ).subscribe(() => {
      this.convert();
    });

    // Conversión inicial
    this.convert();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private initDefaultFormats(): void {
    const defaultSources = ['qasm', 'quirk', 'quil', 'qobj', 'ionq', 'quantum-circuit', 'toaster'];
    const defaultDests = ['qiskit', 'qasm', 'svg', 'cirq', 'pyquil', 'braket', 'qsharp', 'cudaq', 'quest', 'tfq', 'js', 'qobj', 'quil', 'quantum-circuit', 'toaster', 'svg-inline'];

    this.sourceFormats = defaultSources.map(id => this.buildMetadata(id, true, defaultDests.includes(id)));
    this.destFormats = defaultDests.map(id => this.buildMetadata(id, defaultSources.includes(id), true));
  }

  private buildMetadata(id: string, isSource: boolean, isDest: boolean): FormatMetadata {
    const meta = FORMAT_METADATA[id] || {
      name: id.toUpperCase(),
      extension: `.${id}`,
      description: `Formato ${id}`
    };
    return {
      id,
      name: meta.name,
      extension: meta.extension,
      isSource,
      isDest,
      supportsJupyter: this.jupyterEligibleFormats.includes(id),
      isBridged: !!this.bridgedFormats[id],
      description: meta.description
    };
  }

  loadCatalogFromApi(): void {
    this.converterService.getFormats().subscribe({
      next: (resp) => {
        this.apiConnected = true;
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
      },
      error: () => {
        this.apiConnected = false;
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

    this.converterService.convertSingle(req).subscribe({
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

