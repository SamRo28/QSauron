export interface TestCase {
    id: string;
    entryIndexes: number[];
    outputIndexes: number[];
    type?: 'STOCHASTIC' | 'DETERMINISTIC';
}
