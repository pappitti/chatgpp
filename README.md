# CHATGPP

Proof of concept for RAG app running entirely in the browser.  
see src/sources.ts to set :
- the embedding model for semantic search
- the LLM for generation
- the location of the dataset (via an env variable for this public repo). The app is in Typescript so, if you change the dataset, you'll have the change the types in src/types.ts  
  
The project is WIP.    

## transformers.js
Most models should work out of the box but you can set inference parameters in src/worker.ts  
Webgpu support for the LLM still requires some work

## UI
The code and the comments in the code are in English but the UI is un French because the dataset used for the RAG test was in French. So for the non-French speakers: the page that is displayed when the app starts is a warning to give the user an opportunity to NOT download 3GB of model weights. Download only starts after this page.  

Still a lot of work left on the UI. Without GPU support, performance is probably not good enough to justify spending time on UI/UX details. 


## TODO
- webgpu
- UI improvements
- cleaning the repo