// Service Worker do SDGP — guarda o próprio site e as bibliotecas externas em cache,
// pra ser possível ABRIR o site mesmo sem internet nenhuma (depois de já ter aberto
// pelo menos uma vez conectado). Login, dados novos e sincronização continuam
// precisando de internet — isso aqui só resolve o "carregar a página".

const CACHE_NAME = 'sdgp-app-shell-v1';

const URLS_PARA_CACHE = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx-js-style/dist/xlsx.bundle.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_PARA_CACHE))
      .catch((err) => console.error('Falha ao preparar o cache offline:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((chave) => chave !== CACHE_NAME).map((chave) => caches.delete(chave)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // A própria página (navegação): tenta a internet primeiro (pra sempre pegar a versão mais
  // nova), e só usa o cache guardado se estiver sem conexão.
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          return resposta;
        })
        .catch(() => caches.match(req).then((resp) => resp || caches.match('./index.html')))
    );
    return;
  }

  // Bibliotecas externas (jsPDF, Excel, Firebase): usa o cache direto se já tiver,
  // sem esperar a rede, já que essas versões praticamente não mudam.
  event.respondWith(
    caches.match(req).then((resp) => {
      if(resp) return resp;
      return fetch(req).then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
        return resposta;
      }).catch(() => resp);
    })
  );
});
