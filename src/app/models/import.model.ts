export interface ImportFormat {
  id: string;
  label: string;
  extensions: string[];
  representable: boolean;
}

export interface ImportLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  maxQubits: number;
}

export interface ImportFormatsResponse {
  formats: ImportFormat[];
  limits: ImportLimits;
}

export interface ImportItem {
  fileName: string | null;
  format: string;
  projectName: string;
  code: string;
}

export interface ImportItemResult {
  index: number;
  fileName: string | null;
  format: string;
  projectName: string;
  success: boolean;
  projectId?: string;
  qubits?: number;
  columns?: number;
  errorCode?: string;
  error?: string;
}

export interface ImportResult {
  total: number;
  successCount: number;
  failureCount: number;
  items: ImportItemResult[];
}

export interface ConvertedCircuit {
  format: string;
  qubits: number;
  columns: number;
  quirk: any;
}

export interface Representation {
  format: string;
  extension: string;
  code: string;
}
