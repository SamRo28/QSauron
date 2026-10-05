import { ImportFormat, ImportItem, ImportLimits } from '../models/import.model';

export const BINARY_SIGNATURES: Uint8Array[] = [
  new Uint8Array([0x4d, 0x5a]),                         // MZ
  new Uint8Array([0x7f, 0x45, 0x4c, 0x46]),             // \x7fELF
  new Uint8Array([0x50, 0x4b, 0x03, 0x04]),             // PK\x03\x04 (ZIP)
  new Uint8Array([0x25, 0x50, 0x44, 0x46]),             // %PDF
  new Uint8Array([0xca, 0xfe, 0xba, 0xbe]),             // Java class
  new Uint8Array([0xfe, 0xed, 0xfa, 0xce]),             // Mach-O 32
  new Uint8Array([0xfe, 0xed, 0xfa, 0xcf]),             // Mach-O 64
  new Uint8Array([0xcf, 0xfa, 0xed, 0xfe]),             // Mach-O 64 reverse
  new Uint8Array([0xce, 0xfa, 0xed, 0xfe]),             // Mach-O 32 reverse
  new Uint8Array([0x1f, 0x8b]),                         // Gzip
  new Uint8Array([0x52, 0x61, 0x72, 0x21]),             // Rar!
  new Uint8Array([0x37, 0x7a, 0xbc, 0xaf])              // 7z\xBC\xAF
];

export function extensionOf(name: string): string {
  if (!name) return '';
  const lastDot = name.lastIndexOf('.');
  return lastDot !== -1 ? name.substring(lastDot).toLowerCase() : '';
}

export function acceptAttrFor(format: ImportFormat): string {
  return format?.extensions ? format.extensions.join(',') : '';
}

export function defaultProjectName(fileName: string): string {
  if (!fileName) return 'Imported project';
  const lastDot = fileName.lastIndexOf('.');
  const base = lastDot !== -1 ? fileName.substring(0, lastDot) : fileName;
  const trimmed = base.trim().substring(0, 80);
  return trimmed.length > 0 ? trimmed : 'Imported project';
}

function startsWithSignature(bytes: Uint8Array, signature: Uint8Array): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

export async function readCircuitFile(
  file: File,
  format: ImportFormat,
  limits: ImportLimits
): Promise<{ item?: ImportItem; error?: string }> {
  const ext = extensionOf(file.name);
  const allowed = (format.extensions || []).map(e => e.toLowerCase());
  if (!allowed.includes(ext)) {
    return { error: `Only ${format.extensions.join(', ')} files are allowed for ${format.label}` };
  }

  if (file.size === 0) {
    return { error: 'File is empty' };
  }
  if (file.size > limits.maxFileBytes) {
    return { error: 'File exceeds 512 KB' };
  }

  let buf: Uint8Array;
  if (typeof file.arrayBuffer === 'function') {
    buf = new Uint8Array(await file.arrayBuffer());
  } else {
    // Fallback for environments lacking arrayBuffer on File
    buf = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  if (BINARY_SIGNATURES.some(sig => startsWithSignature(buf, sig))) {
    return { error: 'This is not a text file' };
  }

  let code: string;
  try {
    code = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch (e) {
    return { error: 'File is not valid UTF-8 text' };
  }

  return {
    item: {
      fileName: file.name,
      format: format.id,
      projectName: defaultProjectName(file.name),
      code
    }
  };
}

export function checkBatch(items: ImportItem[], limits: ImportLimits): string | null {
  if (items.length > limits.maxFiles) {
    return `Too many files (maximum ${limits.maxFiles})`;
  }
  let totalBytes = 0;
  const encoder = new TextEncoder();
  for (const it of items) {
    totalBytes += encoder.encode(it.code || '').length;
  }
  if (totalBytes > limits.maxTotalBytes) {
    return 'Total size exceeds limit';
  }
  return null;
}
