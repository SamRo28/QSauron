import { Project } from "./project.model";

export interface MutantCycle {
    id: number;
    date: Date;
    mutants: any[]; // Class not available in back_model
    execConfig: any; // Class not available in back_model
    project?: Project;
}
