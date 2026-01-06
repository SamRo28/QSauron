export interface QCircuit {
    id: string;
    qbits: number;
    quirkCode: any; // JsonNode
    mutableColumns: string;
    mutableRows: string;
}
