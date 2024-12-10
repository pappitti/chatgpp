import {ProgressInfo} from '@huggingface/transformers';

export interface Chunk{
    id: string;
    dossier: string;
    date: string;
    titre: string;
    auteurs: string[];
    score: number;
    chunk: string;
}

// Pipeline types
export interface ProgressCallbackInfo {
    status: 'initiate' | 'download' | 'processing' | 'sources' | 'progress' | 'done' | 'ready' | 'error';
    message?: string;
    name?: string;
    info?: ProgressInfo;
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
    [key: string]: any;
};
  
// Dataset types
export interface DataChunk {
    id: string;
    dossier: string;
    date: string;
    titre: string;
    auteurs: string[];
    chunk: string;
    embeddings: Float32Array; // removing this for 
    [key: string]: any; // For any additional metadata
}
  
// Search result types
export interface SearchResult {
    textScore: number;
    docId: string;
}


  
export interface HybridSearchResult {
    semanticScore: number;
    textScore: number;
}
  
export interface QueryResponse {
    answer: string;
    sources: Chunk[];
}
  
// Worker message types
export type WorkerMessageType = {
    init: {
        // embeddings: "gte-multilingual-base";
    };
    query: {
        question: string;
        semanticWeight: number;
    };
};
  
export type WorkerResponseType = {
    progress: {
      status: 'initiate' | 'download' | 'processing' | 'progress' | 'ready' | 'error';
      message: string;
    };
    ready: void;
    result: QueryResponse;
};
  
// Worker message type
export interface WorkerMessage<T extends keyof WorkerMessageType> {
    data: {
        task: T;
        payload: WorkerMessageType[T];
    };
}
  
// Worker response type
export interface WorkerResponse<T extends keyof WorkerResponseType> {
    type: T;
    payload: WorkerResponseType[T];
}
  
// Type guard for worker responses
export function isWorkerResponse<T extends keyof WorkerResponseType>(
    message: any,
    type: T
): message is WorkerResponse<T> {
    return message.type === type;
}