import { Generator } from "./generator.model";
import { QCircuit } from "./q-circuit.model";

export interface QProgram {
    id: string;
    qubits: number;
    shots: number;
    inputQubits: number[];
    outputQubits: number[];
    qCircuit: QCircuit;
    generator: Generator;
    qCodes?: any[]; // Class not available in back_model
    expressions?: any[]; // Class not available in back_model
}
