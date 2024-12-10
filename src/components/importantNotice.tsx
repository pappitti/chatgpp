function Warning({acknowledgeWarning}:{acknowledgeWarning:() => void;}) {
    return (
        <div className="w-full flex flex-wrap justify-start p-2">
            <div className="w-full text-start font-semibold text-xl">Important</div>
            <p className="w-full text-start py-1">ChatGPP est une démo de RAG (<em>Retrieval Augmented Generation</em>) fonctionnant entièrement dans le navigateur ce qui garantit la confidentialité des données.</p>
          <p className="w-full text-start py-1">Comme toute application locale utilisant des modèles de <em>machine learning</em>, ChatGPP nécessite de télécharger les modèles. Pour cette application, deux modèles en format onnx sont téléchargés depuis HuggingFace:</p>
          <ul className="list-disc list-inside">
               <li className="w-full text-start py-1"><a href="https://huggingface.co/onnx-community/gte-multilingual-base">gte-multilingual-base</a> est un modèle d'embedding multilingue développé par Alibaba. Il permet de convertir les éléments du jeu de données et le <em>prompt</em> en vecteurs de dimension 768. Il est essentiel à la partie <em>retrieval</em> de l'application de RAG. Ce modèle représente environ 1.3Go.</li>
               <li className="w-full text-start py-1"><a href="https://huggingface.co/onnx-community/Pleias-Pico">Pleias Pico</a>, est un modèle de language développé par Pleias. Il est spécifiquement entraîné pour les applications de RAG et prend en charge la partie <em>generation</em>. Ce modèle représente environ 1.4Go.</li>
           </ul>
           <p className="w-full text-start py-1">Pour que cette démonstration soit complète, un jeu de données est aussi téléchargé. Il représente environ 100Mo et contient plus de 5000 documents du jeu de données <a href="https://www.pitti.io/projects/microu-fr">Microu</a>, découpé en passages de moins de 500 tokens et pré-<em>embedded</em> (les données elles-mêmes représentent 10Mo, les embeddings 90Mo). </p>
           <p className="w-full text-start py-1">Au total, près de 3Go doivent donc être téléchargés pour faire fonctionner cette application. C'est la [triste] réalité des applications de RAG, et celle-ci est de taille minimale. Les fichiers téléchargés sont typiquement conservés dans le cache du navigateur pour ne pas avoir à les re-télécharger à la prochaine visite. </p>
          <p className="w-full text-start py-1">Retrouver notre article sur ce projet <a href="https://www.pitti.io/projects/microu-fr">ici (TODO)</a>. Le code est disponible <a href="https://github.com/pappitti/sector-classification-assistant">ici (TODO)</a>.</p>
           <div className="w-full flex justify-end py-2">
               <button className="text-white font-bold py-2 px-4 rounded" onClick={()=>acknowledgeWarning()}>Commencer</button>

            </div>
        </div>
    )
  }

export default Warning;