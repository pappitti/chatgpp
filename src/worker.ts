import { 
    DataChunk, 
    SearchResult, 
    HybridSearchResult, 
    ProgressCallbackInfo, 
    WorkerMessage, 
    QueryResponse 
} from './types';
import { 
    pipeline, 
    env, 
    FeatureExtractionPipeline, 
    TextGenerationPipeline,
    TextStreamer
} from '@huggingface/transformers';
import { 
    EMBEDDING, 
    GENERATION, 
    DATASET 
} from './sources';

env.allowLocalModels = false;
env.useBrowserCache= true; 
// largely based on https://huggingface.co/docs/transformers.js/tutorials/react

class RAGWorker {
    private embedder: FeatureExtractionPipeline | undefined;
    private generator: TextGenerationPipeline | undefined;
    private streamer: TextStreamer | undefined;
    private dataset: Map<string,DataChunk>;
    private searchIndex: Map<string, Set<string>>;

    constructor() {
        this.embedder = undefined;
        this.generator = undefined;
        this.streamer = undefined;
        this.dataset = new Map();
        this.searchIndex = new Map();
    }
  
    tokenizeForSearch(text: string): string[] {
      return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(term => term.length > 2);
    }
  
    buildSearchIndex(): void {
        this.dataset.forEach((doc) => {
            const terms = this.tokenizeForSearch(doc.chunk);
            terms.forEach(term => {
                const termSet = this.searchIndex.get(term) || new Set<string>();
                termSet.add(doc.id);
                this.searchIndex.set(term, termSet);
            });
        });
    }
  
    textSearch(query: string, k: number = 10): SearchResult[] {
        const queryTerms = this.tokenizeForSearch(query);
        const docScores = new Map<string, number>(); 
        
        queryTerms.forEach(term => {
            const docs = this.searchIndex.get(term) || new Set<string>();
            docs.forEach((docId : string) => {
                    const termFreq = this.tokenizeForSearch(this.dataset.get(docId)?.chunk || "")
                        .filter(t => t === term).length;
                    const score = termFreq * Math.log(Array.from(this.dataset.values()).length / (docs.size + 1));
                    docScores.set(docId, (docScores.get(docId) || 0) + score);
            });
        });
    
        const maxScore = Math.max(...Array.from(docScores.values()));
        return Array.from(docScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, k)
            .map(([docId, score]) => ({
                textScore: score / (maxScore || 1), // Avoid division by zero
                docId
            }));
    }
  
    async init(progress_callback : (progress : ProgressCallbackInfo) => void , embedding:string, generation:string, dataUrl : string): Promise<void> {
        try {
            // Load models
            progress_callback({ status: 'initiate', message: "Téléchargement du modèle d'embedding..."});
            const modelToFetch : string = embedding;
            this.embedder = await pipeline(
                'feature-extraction', 
                modelToFetch, 
                { 
                    device: "webgpu", 
                    progress_callback 
                }
            );
            
            progress_callback({ status: 'initiate', message: "Téléchargement du LLM..." });
            this.generator = await pipeline(
                'text-generation', 
                generation, 
                { 
                    dtype: "fp32",  // fp32
                    //device: "webgpu", // doesn't work
                    progress_callback 
                }
            );

            // Create text streamer
            this.streamer = new TextStreamer(this.generator.tokenizer, {
                skip_prompt: true,
                callback_function: (text: string) => {
                    self.postMessage({ status: 'streaming', stream: text });
                },
            })
                        
            // Fetch dataset
            progress_callback({ status: 'download', message: 'Téléchargement du dataset...' });
            const response = await fetch(dataUrl);
            // TODO : why no caching?
            if (!response.ok) throw new Error('Failed to fetch dataset');
            const jsonData = await response.json();
            this.dataset = new Map<string,DataChunk>(jsonData.map((doc: DataChunk) => [
                doc.id, 
                { 
                    ...doc,
                    embeddings: new Float32Array(doc.embeddings)
                }
            ]));
            
            progress_callback({ status: 'processing', message: "Construction de l'index..." });
            this.buildSearchIndex();
            
            progress_callback({ status: 'ready', message: 'System ready' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            progress_callback({ status: 'error',  message });
            throw error;
        }
    }
  
    cosineSimilarity(a : Float32Array | number[], b: Float32Array | number[]):number { 
        const dotProduct = Array.from(a).reduce((sum, val, i) => sum + val * b[i], 0);
        const normA = Math.sqrt(Array.from(a).reduce((sum, val) => sum + val * val, 0));
        const normB = Math.sqrt(Array.from(b).reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (normA * normB);
    }
  
    async hybridSearch(
        query : string, 
        topK : number = 3,
        semanticWeight : number = 0.7, 
        progress_callback : (progress : ProgressCallbackInfo) => void 
    ): Promise<{id: string; score: number}[]> {
        if (!this.embedder) throw new Error('Embedder not initialized');
        // Get semantic search results
        progress_callback({ status: 'processing', message: "Embedding de la recherche..." });
        const questionEmbedding = await this.embedder(query, { pooling: 'mean', normalize: true });
        const queryVector = new Float32Array(questionEmbedding.data);
        const semanticResults = [];
        progress_callback({ status: 'processing', message: "Recherche sémantique..." });
        for (const [docId, doc] of this.dataset) {
            const score = this.cosineSimilarity(queryVector, doc.embeddings);
            semanticResults.push({ docId, score });
        };

        // TODO : reranking?
    
        // Get text search results
        progress_callback({ status: 'processing', message: "Recherche textuelle..." });
        const textResults = this.textSearch(query);
    
        // Combine results
        const combinedResults = new Map<string,HybridSearchResult>();
        
        [...semanticResults, ...textResults].forEach(result => {
            const docId = result.docId;
            if (!combinedResults.has(docId)) {
            combinedResults.set(docId, {
                semanticScore: 0,
                textScore: 0
            });
            }
            const entry = combinedResults.get(docId);
            if (!entry) return
            if ( 'score' in result) {
                entry.semanticScore = result.score;
            } else {
                entry.textScore = result.textScore;
            }
        });
    
        // Final scoring (X semantic + (1-X) text) 
        return Array.from(combinedResults.entries())
            .map(([id, data]) => ({
            id: id,
            score: (data.semanticScore * semanticWeight) + (data.textScore * (1-semanticWeight))
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }
  
    async query(
        question : string, 
        semanticWeight : number = 0.7,
        progress_callback : (progress : ProgressCallbackInfo) => void 
    ): Promise<QueryResponse> {

        const similarities = await this.hybridSearch(
            question, 
            3, // TODO 3 
            semanticWeight, 
            progress_callback
        );
        const scoredChunks = similarities.map((doc) => {
            const chunk = this.dataset.get(doc.id)
            return {
                id: doc.id,
                dossier: chunk?.dossier || "",
                date: chunk?.date || "",
                titre: chunk?.titre || "",
                auteurs: chunk?.auteurs || [],
                chunk: chunk?.chunk || "",
                score: doc.score
            } ;
        });
        const context = similarities
            .map((doc) => `<|source_start|><|source_id_start|>${doc.id}<|source_id_end|>${this.dataset.get(doc.id)?.chunk || ""}<|source_end|>`)
            .join('\n');
        const prompt = `
            <|query_start|>${question}<|query_end|>\n${context}\n<|source_analysis_start|>`;
        
        if (!this.generator) throw new Error('Generator not initialized');
        
        progress_callback({ status: 'sources', chunks: scoredChunks }); 

        progress_callback({ status: 'processing', message: 'Generation en cours...' }); 
        const response = await this.generator(prompt.trim(), {
            max_new_tokens: 1024,
            do_sample: false, 
            return_full_text: false, 
            streamer : this.streamer,
        });

        // Get the first generation result, handling both possible response types
        const firstResponse = Array.isArray(response[0]) 
            ? response[0][0] 
            : response[0];

        if (!firstResponse) {
            throw new Error('No generation output received');
        }
  
        return {
            answer: typeof firstResponse.generated_text === 'string' 
                ? firstResponse.generated_text 
                : firstResponse.generated_text.reduce((acc, message) => acc + message.content, ''),
            sources: scoredChunks
        };
    }
  }

  const rag = new RAGWorker();
  
  // Worker message handler
  self.addEventListener('message', async (event : WorkerMessage<any>) => {
    const { task, payload } = event.data;
    
    switch (task) {
      case 'init':
        await rag.init(
            (x: ProgressCallbackInfo) => self.postMessage({ ...x }),
            EMBEDDING.url,
            GENERATION.url,
            DATASET.url
        );
        self.postMessage({ status: 'ready' });
        break;
        
      case 'query':
        const result = await rag.query(
            payload.question,
            payload.semanticWeight,
            (x: ProgressCallbackInfo) => self.postMessage({ ...x })
        );
        self.postMessage({ status: 'complete', payload: result });
        break;
    }
  });
  