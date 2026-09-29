export interface FormatsResponse {
  sourceFormats: string[];
  bridgedSourceFormats?: Record<string, string>;
  destFormats: string[];
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

export interface BatchConvertItem {
  code: string;
  sourceFormat: string;
  destFormat: string;
  jupyter?: boolean;
}

export interface BatchConvertRequest {
  items: BatchConvertItem[];
}

export interface BatchItemResult {
  index: number;
  success: boolean;
  output?: string;
  sourceFormat?: string;
  destFormat?: string;
  jupyter?: boolean;
  filename?: string;
  error?: string;
  statusCode?: number;
  pipeline?: string[];
}

export interface BatchConvertResponse {
  total: number;
  successCount: number;
  failureCount: number;
  results: BatchItemResult[];
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

