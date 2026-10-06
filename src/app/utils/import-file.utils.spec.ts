import {
  extensionOf,
  acceptAttrFor,
  defaultProjectName,
  readCircuitFile,
  checkBatch,
  formatBytes
} from './import-file.utils';
import { ImportFormat, ImportItem, ImportLimits } from '../models/import.model';

describe('import-file.utils', () => {
  const qasmFormat: ImportFormat = {
    id: 'qasm',
    label: 'OpenQASM 2.0',
    extensions: ['.qasm'],
    representable: true
  };

  const defaultLimits: ImportLimits = {
    maxFiles: 20,
    maxFileBytes: 2097152, // 2 MB
    maxTotalBytes: 20971520, // 20 MB
    maxQubits: 16
  };

  it('should extract extension and format accept attribute correctly', () => {
    expect(extensionOf('test.QASM')).toBe('.qasm');
    expect(extensionOf('noext')).toBe('');
    expect(acceptAttrFor(qasmFormat)).toBe('.qasm');
    expect(defaultProjectName('bell.qasm')).toBe('bell');
  });

  it('should read a valid .qasm file and return item with projectName "bell"', async () => {
    const file = new File(['OPENQASM 2.0;\nqreg q[2];\nh q[0];\n'], 'bell.qasm', { type: 'text/plain' });
    const result = await readCircuitFile(file, qasmFormat, defaultLimits);

    expect(result.error).toBeUndefined();
    expect(result.item).toBeDefined();
    expect(result.item?.projectName).toBe('bell');
    expect(result.item?.fileName).toBe('bell.qasm');
    expect(result.item?.format).toBe('qasm');
    expect(result.item?.code).toContain('OPENQASM 2.0;');
  });

  it('should return extension error when file extension does not match format', async () => {
    const file = new File(['{}'], 'circuit.json', { type: 'application/json' });
    const result = await readCircuitFile(file, qasmFormat, defaultLimits);

    expect(result.item).toBeUndefined();
    expect(result.error).toContain('Only .qasm files are allowed for OpenQASM 2.0');
  });

  it('should return error for an empty file', async () => {
    const file = new File([], 'empty.qasm', { type: 'text/plain' });
    const result = await readCircuitFile(file, qasmFormat, defaultLimits);

    expect(result.item).toBeUndefined();
    expect(result.error).toBe('File is empty');
  });

  it('should return error if file begins with MZ binary signature', async () => {
    const mzBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    const file = new File([mzBytes], 'executable.qasm', { type: 'application/octet-stream' });
    const result = await readCircuitFile(file, qasmFormat, defaultLimits);

    expect(result.item).toBeUndefined();
    expect(result.error).toBe('This is not a text file');
  });

  it('should return error for invalid UTF-8 bytes [0xC3, 0x28]', async () => {
    const invalidUtf8 = new Uint8Array([0xc3, 0x28]);
    const file = new File([invalidUtf8], 'invalid.qasm', { type: 'text/plain' });
    const result = await readCircuitFile(file, qasmFormat, defaultLimits);

    expect(result.item).toBeUndefined();
    expect(result.error).toBe('File is not valid UTF-8 text');
  });

  it('should return error when checkBatch exceeds maxFiles (e.g. 21 items)', () => {
    const items: ImportItem[] = [];
    for (let i = 0; i < 21; i++) {
      items.push({
        fileName: `file${i}.qasm`,
        format: 'qasm',
        projectName: `proj${i}`,
        code: 'h q[0];'
      });
    }

    const error = checkBatch(items, defaultLimits);
    expect(error).toBe('Too many files (maximum 20)');
  });

  it('should return error if file exceeds maxFileBytes (2 MB + 1 byte)', async () => {
    const file = new File([new Uint8Array(2097152 + 1)], 'toolarge.qasm', { type: 'text/plain' });
    const result = await readCircuitFile(file, qasmFormat, defaultLimits);

    expect(result.item).toBeUndefined();
    expect(result.error).toContain('2 MB');
  });

  it('should format bytes properly with formatBytes', () => {
    expect(formatBytes(2097152)).toBe('2 MB');
    expect(formatBytes(524288)).toBe('512 KB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });
});
