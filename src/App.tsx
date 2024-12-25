import { useState, useEffect, useRef } from 'react'
import Header from './components/header';
import Footer from './components/footer';
import Progress from './components/progressBar';
import ChunkItem from './components/outputSectors';
import Warning from './components/importantNotice';
import Loader from './components/loader';
import './App.css';
import { Chunk} from './types';
import { EMBEDDING, GENERATION, DATASET } from './sources';

function App() {
  const [embeddingModel, setEmbeddingModel] = useState<string | null >(null); //null until user acknowledges warning. 
  const [generationModel, setGenerationModel] = useState<string | null >(null); //null until user acknowledges warning. 
  const [dataSet, setDataset] = useState<string | null >(null); //null until user acknowledges warning. 
  const [progress, setProgress] = useState<any[]>([]); //list of files when model is downloading
  const [disabled, setDisabled] = useState(true); //disable button until model is loaded
  const [semanticWeight, setSemanticWeight] = useState<number>(0.7); //default value
  const [inputText, setInputText] = useState<string>(""); //can't be null
  const [output, setOutput] = useState<string[]>([""]); //output from the model
  const [chunks, setChunks] = useState<Chunk[]>([]); //Retrieved chunks
  const [selectedChunk, setSelectedChunk] = useState<number| null>(null);//index of the selected output
  const [selectionFocus, setSelectionFocus] = useState<boolean>(false); // to allow arrow key navigation
  const [processing, setProcessing] = useState<string | boolean>(false); // to show loader


  const worker = useRef<Worker | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);

  function acknowledgeWarning() {
    // setting the model will trigger the useEffect hook to load the model
    setEmbeddingModel(EMBEDDING.name);
    setGenerationModel(GENERATION.name);
    setDataset(DATASET.name);
  }

  function handleClick() {  
    if (!worker.current) return;
    // clicking the button will trigger the worker to classify the input text
    setDisabled(true);
    setProcessing(true);
    worker.current.postMessage({ 
      task: 'query', 
      payload:{
        question: inputText,
        semanticWeight: semanticWeight
      }
    });
  }

  function parentFocus() {
    // necessary to allow arrow key navigation
    parentRef.current && parentRef.current.focus();
  }

  function handleArrowKeyPress(e: KeyboardEvent) {
    if (!parentRef.current) return;

    // when the sector list is in focus, arrow keys can be used to navigate the list
    if (selectedChunk === null) {
      setSelectedChunk(0);
    } else {
      if (e.key === 'ArrowUp') {
        setSelectedChunk(prevSelected => Math.max(prevSelected! - 1, 0))
      }
      if (e.key === 'ArrowDown') {
        setSelectedChunk(prevSelected => Math.min(prevSelected! + 1, 9))
      }
    }
  }

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  // this hook is largely inspired by https://huggingface.co/docs/transformers.js/tutorials/react
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(
        new URL('./worker.ts', import.meta.url), 
        { type: 'module'}
      );
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e: MessageEvent) => {
      setDisabled(true);
      console.log(e.data);
      switch (e.data.status) {
        // TODO : redo the switch cases (typing, handling of the messages, information to display, etc)
        case 'initiate':
          setProgress(prev => [...prev, e.data]);
          setProcessing(e.data.message);
          break;
        
        case 'download':
          setProcessing(e.data.message);
          break;
    
        case 'progress':
          // Model file progress: update one of the progress items.
          if (e.data.message) {
            setProcessing(e.data.message);
          }
          else if (e.data.progress) {
            setProcessing(e.data.progress);

          }
          // setProgress(
          //   prev => prev.map(item => {
          //     if (item.file === e.data.file) {
          //       return { ...item, progress: e.data.progress }
          //     }
          //     return item;
          //   })
          // );
          break;

        case 'processing':
          setProcessing(e.data.message);
          break;
    
        case 'clean':
          // Model file loaded: remove the progress item from the list.
          setProgress([]);
          break;
    
        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setDisabled(false);
          setProcessing(false);
          break;

        case 'sources':
          setChunks(e.data.chunks);
          break;

        case 'streaming':
          setProcessing(false);
          const stream = e.data.stream;
  
          if (stream.includes("<|source_analysis_end|>")) {
            const [before, after] = stream.split("<|source_analysis_end|>");
            setOutput(prev => [
              ...prev.slice(0, -1), 
              prev[prev.length-1] + before,
              after || ""
            ]);
          } else {
            const cleanStream = stream
              .replace("<|answer_start|>", "")
              .replace("<|answer_end|>", "")
              .replace("<|end_of_text|>", "");
            setOutput(prev => [...prev.slice(0, -1), prev[prev.length-1] + cleanStream]);
          }
          break;

        case 'complete':
          // Generation complete: re-enable the "Generate" button
          setDisabled(false);
          setProcessing(false);
          // setOutput(e.data.payload.answer); // to prevent the removing of the tags (which are used in streaming above)
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current?.removeEventListener('message', onMessageReceived);
  });

  useEffect(() => {
    if (!worker.current) return;
    // Load model in the background (only if user has acknowledged the warning).
    if (embeddingModel && generationModel && dataSet) {
      worker.current.postMessage({ 
        task: 'init' , 
        payload: {}
      });
    }
  },[embeddingModel, generationModel, dataSet]);
  
  useEffect(() => {
    // key handling only if list of results is in focus
    if (selectionFocus) {
      window.addEventListener('keydown', handleArrowKeyPress);
    }
    else {
      window.removeEventListener('keydown', handleArrowKeyPress);
    }
    return () => window.removeEventListener('keydown', handleArrowKeyPress);
  },[selectionFocus])

  return (
    <div className="h-fit w-full min-h-screen flex flex-col justify-between">
      <Header/>
      {!(embeddingModel && generationModel && dataSet) &&
        <div className="relative w-full flex-grow p-4 max-w-[1280px] m-auto">
          <Warning acknowledgeWarning={acknowledgeWarning}/> 
        </div>
      }
      {(embeddingModel && generationModel && dataSet) &&
        <div className="relative w-full flex-grow px-4 py-10 max-w-[1280px] m-auto">
          <div className='flex w-full flex-wrap justify-between'>
            {/* TODO*/}
            <Progress items={progress} processing={processing}/>
          </div>
          <textarea 
            className="w-full border-2 border-gray-300 rounded-lg p-2 h-36 mt-3 mb-2" placeholder={`Interrogez la base de données ${disabled ? "(vous pouvez commencer votre prompt en attendant le chargement des modèles)": ""}...`} 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)}
          ></textarea>
          <div className='flex w-full flex-nowrap justify-between items-center mb-10'>
            <div className='flex flex-nowrap items-start'>
              <label className="text-start text-xs italic">
                Pondération de la recherche sémantique
              </label>
              <input 
                type="range" 
                min="0" max="1" step="0.1" 
                value={semanticWeight} 
                onChange={(e) => setSemanticWeight(parseFloat(e.target.value))} 
                className="w-40 ml-2"
              />
            </div>
            <button className="text-white font-bold py-2 px-4 rounded" onClick={handleClick} disabled={disabled}>{disabled?"Patientez":"Générer"}</button> 
          </div>
          
          {processing && <Loader/> }
          {output[0] && 
            <div className={`relative w-full flex flex-col justify-start min-[750px]:flex-row gap-3 mt-10`}>
              <div className="w-full min-[750px]:w-2/3">
                <div className={`w-full px-6`}>
                    <div className="w-full text-start text-xl font-bold mb-4">Résultat</div>
                    <div className="w-full text-start ">
                      {output[0] &&
                        <div className="w-full">
                          <div className="w-full text-start text-start text-xl mb-4">Analyse</div>
                          <div className="w-full text-start mb-4">{output[0]}</div>
                        </div>
                      }
                      {output[1] &&
                        <div className="w-full">
                          <div className="w-full text-start text-start text-xl mb-4">Réponse</div>
                          <div className="w-full text-start mb-4">{output[1]}</div>
                        </div>
                      }
                    </div>
                </div>
              </div>
              <div className={`w-full min-[750px]:w-1/3 flex-col h-full`}>
                <div className="w-full flex flex-nowrap mb-2 justify-between">
                  <div className="text-start text-xl font-bold mb-4">Sources</div>
                </div>
                <div 
                  className="border-2 border-gray-300 rounded-lg overflow-hidden" 
                  tabIndex={0} 
                  ref={parentRef} 
                  onFocus={() => setSelectionFocus(true)} 
                  onBlur={() => setSelectionFocus(false)}
                >
                  {chunks
                    .slice(0,10)
                    .map((item : Chunk, index : number) => 
                      <ChunkItem 
                        key={`topK${index}`} 
                        item={item} 
                        index={index} 
                        selected={index===selectedChunk} 
                        setSelectedOutput={setSelectedChunk} 
                        setParentFocus={parentFocus}
                      />
                    )} 
                </div>
              </div>
          </div>}
        </div>}
      <Footer/>
    </div>
  );
}

export default App
