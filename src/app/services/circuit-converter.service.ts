import { Injectable } from '@angular/core';

// @ts-ignore
import QuantumCircuit from 'quantum-circuit/dist/quantum-circuit.min.js';

// Fix para el bug interno de la biblioteca quantum-circuit en `exportQuirk`:
// En módulos ES ('use strict'), la biblioteca asigna a variables no declaradas
// (`circuit = new QuantumCircuit`, `definedGate = false`, `angle = math.round(...)`),
// lo que lanza "ReferenceError: circuit is not defined".
// Al definir estas propiedades en el objeto global (globalThis / window),
// la asignación es tratada como una propiedad del objeto global y no falla en modo estricto.
const globalScope: any = typeof globalThis !== 'undefined'
  ? globalThis
  : (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {}));

function ensureQuirkGlobals(): void {
  if (globalScope) {
    if (!('circuit' in globalScope)) globalScope.circuit = undefined;
    if (!('definedGate' in globalScope)) globalScope.definedGate = undefined;
    if (!('angle' in globalScope)) globalScope.angle = undefined;
  }
}
ensureQuirkGlobals();

if (QuantumCircuit && QuantumCircuit.prototype && !(QuantumCircuit.prototype as any)._quirkStrictPatched) {
  const origExportQuirk = QuantumCircuit.prototype.exportQuirk;
  QuantumCircuit.prototype.exportQuirk = function(...args: any[]) {
    ensureQuirkGlobals();
    return origExportQuirk.apply(this, args);
  };
  (QuantumCircuit.prototype as any)._quirkStrictPatched = true;
}

export interface SupportedFormat {
  id: string;
  name: string;
  extension: string;
  isSource: boolean;
  isDest: boolean;
  description: string;
}

export interface ConversionResult {
  output: string;
  quirkUrl?: string;
  quirkUrlTooLong?: boolean;
  isSvg?: boolean;
  numQubits?: number;
  numGates?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CircuitConverterService {
  readonly supportedFormats: SupportedFormat[] = [
    {
      id: 'qasm',
      name: 'OpenQASM (2.0)',
      extension: '.qasm',
      isSource: true,
      isDest: true,
      description: 'Estándar abierto para circuitos cuánticos (IBM/OpenQASM)'
    },
    {
      id: 'quil',
      name: 'pyQuil / Quil',
      extension: '.quil',
      isSource: true,
      isDest: true,
      description: 'Lenguaje de instrucciones de Rigetti Computing / pyQuil'
    },
    {
      id: 'qobj',
      name: 'IBM Qobj (JSON)',
      extension: '.json',
      isSource: true,
      isDest: true,
      description: 'Estructura JSON de especificación de ejecuciones de IBM Quantum'
    },
    {
      id: 'quirk',
      name: 'Quirk (Simulador Web)',
      extension: '.json',
      isSource: false,
      isDest: true,
      description: 'Formato para el simulador interactivo Quirk (con enlace directo)'
    },
    {
      id: 'qiskit',
      name: 'Qiskit (Python)',
      extension: '.py',
      isSource: false,
      isDest: true,
      description: 'Código ejecutable de IBM Qiskit en Python'
    },
    {
      id: 'cirq',
      name: 'Cirq (Google Python)',
      extension: '.py',
      isSource: false,
      isDest: true,
      description: 'Código para Google Cirq en Python'
    },
    {
      id: 'qsharp',
      name: 'Q# (Microsoft)',
      extension: '.qs',
      isSource: false,
      isDest: true,
      description: 'Microsoft Quantum Development Kit (Q#)'
    },
    {
      id: 'cudaq',
      name: 'CUDA-Q (NVIDIA C++)',
      extension: '.cpp',
      isSource: false,
      isDest: true,
      description: 'Plataforma cuántica acelerada de NVIDIA'
    },
    {
      id: 'braket',
      name: 'AWS Braket (Python)',
      extension: '.py',
      isSource: false,
      isDest: true,
      description: 'Amazon Braket Quantum SDK en Python'
    },
    {
      id: 'svg',
      name: 'Diagrama SVG',
      extension: '.svg',
      isSource: false,
      isDest: true,
      description: 'Representación vectorial visual del circuito'
    }
  ];

  /**
   * Convierte directamente código QASM al formato Quirk y genera opcionalmente la URL
   */
  qasmToQuirk(qasmCode: string, returnUrl: boolean = true): string {
    const qc = new QuantumCircuit();

    let parseErrors: any[] = [];
    qc.importQASM(qasmCode, (errors: any[]) => {
      if (errors && errors.length) {
        parseErrors = errors;
      }
    });

    if (parseErrors.length > 0) {
      throw new Error(`Error parseando QASM: ${parseErrors.map(e => e.message || e).join(', ')}`);
    }

    ensureQuirkGlobals();
    const quirkData = qc.exportQuirk();
    const quirkJson = JSON.stringify(quirkData);

    if (returnUrl) {
      // Si la URL es menor a 64KB la generamos; de lo contrario Quirk no podrá cargarla por límite de URL
      if (quirkJson.length <= 64000) {
        return `https://algassert.com/quirk#circuit=${encodeURIComponent(quirkJson)}`;
      }
    }

    return JSON.stringify(quirkData, null, 2);
  }

  /**
   * Conversión universal entre cualquier formato soportado directamente en el cliente
   */
  convert(inputCode: string, sourceFormat: string, destFormat: string): ConversionResult {
    if (!inputCode || !inputCode.trim()) {
      throw new Error('El código de entrada no puede estar vacío.');
    }

    // Instanciar QuantumCircuit (utilizamos `qc` para evitar conflictos con exportQuirk)
    const qc = new QuantumCircuit();
    let importErrors: any[] = [];

    // 1. IMPORTAR SEGÚN FORMATO DE ORIGEN
    switch (sourceFormat.toLowerCase()) {
      case 'qasm':
      case 'openqasm':
        qc.importQASM(inputCode, (errors: any[]) => {
          if (errors && errors.length) importErrors = errors;
        });
        break;

      case 'quil':
      case 'pyquil':
        qc.importQuil(inputCode, (errors: any[]) => {
          if (errors && errors.length) importErrors = errors;
        });
        break;

      case 'qobj':
        try {
          const parsed = typeof inputCode === 'string' ? JSON.parse(inputCode) : inputCode;
          qc.importQobj(parsed, (errors: any[]) => {
            if (errors && errors.length) importErrors = errors;
          });
        } catch (e: any) {
          throw new Error(`El formato Qobj debe ser un JSON válido: ${e.message}`);
        }
        break;

      default:
        throw new Error(`Formato de origen no soportado: ${sourceFormat}`);
    }

    if (importErrors.length > 0) {
      const msgs = importErrors.map(e => (typeof e === 'object' ? e.message || JSON.stringify(e) : e)).join('\n');
      throw new Error(`Error al procesar el circuito ${sourceFormat.toUpperCase()}:\n${msgs}`);
    }

    // 2. EXPORTAR SEGÚN FORMATO DE DESTINO
    let output = '';
    let quirkUrl: string | undefined = undefined;
    let isSvg = false;

    switch (destFormat.toLowerCase()) {
      case 'quirk': {
        ensureQuirkGlobals();
        const quirkData = qc.exportQuirk();
        output = JSON.stringify(quirkData, null, 2);
        const quirkJson = JSON.stringify(quirkData);
        // Quirk Simulator se ejecuta en el navegador mediante el fragmento hash (#circuit=...).
        // Los navegadores imponen límites estrictos a la longitud de una URL (~64KB recomendado para hash).
        // Si el JSON del circuito es demasiado grande, no se debe generar una URL gigantesca
        // (podría colgar la pestaña o fallar en window.open), y en su lugar se sugiere copiar/descargar el JSON.
        if (quirkJson.length <= 64000) {
          quirkUrl = `https://algassert.com/quirk#circuit=${encodeURIComponent(quirkJson)}`;
        } else {
          quirkUrl = undefined;
        }
        break;
      }

      case 'qasm':
      case 'openqasm':
        output = qc.exportQASM();
        break;

      case 'quil':
        output = qc.exportQuil();
        break;

      case 'pyquil':
        output = qc.exportPyquil();
        break;

      case 'qiskit':
        output = qc.exportQiskit();
        break;

      case 'cirq':
        output = qc.exportCirq();
        break;

      case 'qsharp':
        output = qc.exportQSharp();
        break;

      case 'cudaq':
        output = qc.exportCudaQ();
        break;

      case 'braket':
        output = qc.exportBraket();
        break;

      case 'qobj':
        output = JSON.stringify(qc.exportQobj(), null, 2);
        break;

      case 'svg':
        output = qc.exportSVG();
        isSvg = true;
        break;

      default:
        throw new Error(`Formato de destino no soportado: ${destFormat}`);
    }

    return {
      output,
      quirkUrl,
      quirkUrlTooLong: destFormat.toLowerCase() === 'quirk' && !quirkUrl,
      isSvg,
      numQubits: qc.numQubits,
      numGates: qc.numGates ? qc.numGates() : undefined
    };
  }

  getSourceFormats(): SupportedFormat[] {
    return this.supportedFormats.filter(f => f.isSource);
  }

  getDestFormats(): SupportedFormat[] {
    return this.supportedFormats.filter(f => f.isDest);
  }
}
