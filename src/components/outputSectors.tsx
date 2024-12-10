import {Chunk} from '../types';
function ChunkItem({
    item, 
    index, 
    selected, 
    setSelectedOutput,
    setParentFocus
}:{
    item: Chunk, 
    index: number, 
    selected: boolean, 
    setSelectedOutput: (index: number | null)=>void,
    setParentFocus: ()=>void
}) {
    return (
        <div className={`w-full cursor-pointer text-start p-1 text-sm`} 
        >   
            <div className="flex flex-nowrpa w-full">
                <div 
                    className={`w-full flex text-xs p-1 flex-nowrap gap-2 ${selected?"bg-[rgb(var(--pitti-color))] text-white":""}`}
                    onClick={()=>{
                        setSelectedOutput(index);
                        setParentFocus();
                    }}
                >
                    <div>{item.id}</div>
                    <div className="w-full text-start text-xs italic">
                        Score : {(item.score*100).toFixed(2)}%
                    </div>
                </div>
                {selected &&
                    <div className="w-6 h-6 flex justify-center items-center bg-[rgb(var(--pitti-color))]" onClick={()=>setSelectedOutput(null)}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="var(--opposite-color)">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                }
            </div>
            {selected &&
                <div className="">
                    <div className={`w-full text-start p-1 ${selected?"bg-[rgb(var(--pitti-color))] text-white":""}`}>{item.titre}</div>
                    <div className="w-full text-start p-1 font-xs mt-1">{item.chunk}</div>
                    <div className="w-full text-start font-xs p-1 bg-gray-400/20 text-[rgb(var(--pitti-color))]">
                        <div className="w-full italic">date : {item.date}</div>
                        <div className="w-full italic">
                            auteur(s) : {item.auteurs.join(", ")}
                        </div>
                        <div className="w-full italic">dossier : {item.dossier}</div>
                    </div>
                </div>
            }
        </div>
    )
  }

export default ChunkItem;