import { Project } from "./project.model";
import { TestCase } from "./test-case.model";

export interface TestSuite {
    id: string;
    project?: Project;
    testCases: TestCase[];
    error_range: number;
}
