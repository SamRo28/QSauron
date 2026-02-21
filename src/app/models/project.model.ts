import { MutantCycle } from "./mutant-cycle.model";
import { ProjectNote } from "./project-note.model";
import { QProgram } from "./q-program.model";
import { TestSuite } from "./test-suite.model";

export interface User {
    id?: string;
    email?: string;
    pwd?: string;
    projects?: Project[];
}

export interface Project {
    id: string;
    name: string;
    mutantCycles: MutantCycle[];
    testSuites: TestSuite[];
    qProgram: QProgram;
    users: User[];
    projectNotes: ProjectNote[];
}

export interface ProjectSummary {
    id: string;
    name: string;
    hasGeneratedCode: boolean;
    hasMutantCycles: boolean;
    hasTestCases: boolean;
}

export interface QuCoDetailsDto {
    generatorType: string;
    qubits: number;
}

export interface QuTeDetailsDto {
    testCasesCount: number;
    suiteType: string;
}

export interface QuMuDetailsDto {
    mutantsCount: number;
}

export interface ProjectDetailsDto {
    id: string;
    name: string;
    quCoDetails: QuCoDetailsDto | null;
    quTeDetails: QuTeDetailsDto[];
    quMuDetails: QuMuDetailsDto[];
    projectNotes: ProjectNote[];
}
