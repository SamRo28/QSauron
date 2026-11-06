export interface FormatsResponse {
  sourceFormats: string[];
  bridgedSourceFormats?: Record<string, string>;
  destFormats: string[];
  bridgedDestFormats?: Record<string, string>;
  formatLabels?: Record<string, string>;
  formatExtensions?: Record<string, string[]>;
  formatDescriptions?: Record<string, string>;
  jupyterEligibleDestFormats: string[];
}

export interface SingleConvertRequest {
  code: string;
  sourceFormat: string;
  destFormat: string;
  jupyter?: boolean;
}

export interface SingleConvertResponse {
  success: boolean;
  output: string;
  sourceFormat: string;
  destFormat: string;
  jupyter: boolean;
  filename: string;
  pipeline?: string[];
}

export interface FormatMetadata {
  id: string;
  name: string;
  extension: string;
  isSource: boolean;
  isDest: boolean;
  supportsJupyter?: boolean;
  isBridged?: boolean;
  description: string;
}

export interface ConvertErrorResponse {
  success: boolean;
  error: string;
}

