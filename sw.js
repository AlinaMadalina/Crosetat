/* Service worker — Schema mea de croșetat
   La fiecare deploy se schimbă VERSION: asta face telefonul să ia versiunea nouă.
   Strategii:
     - index.html / manifest.json / sync.js / firebase-config.js / navigări
       → rețea întâi, cache ca rezervă (updateurile apar imediat)
     - iconițe, fonturi Google și SDK-ul Firebase de pe gstatic
       → cache întâi, reîmprospătat în fundal (ca să meargă offline)
   Apelurile către Firestore și Identity Toolkit NU trec pe aici: le lăsăm
   în seama SDK-ului, care are cozile și cache-ul lui offline.
*/
var VERSION = 'v21.6.0';
var SHELL = 'croset-shell-' + VERSION;
var RUNTIME = 'croset-runtime-' + VERSION;

var SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './firebase-config.js',
  './sync.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

var FRESH = ['/', '/index.html', '/manifest.json', '/sync.js', '/firebase-config.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) {
      return c.addAll(SHELL_FILES);
    }).catch(function () { /* o resursă lipsă nu trebuie să blocheze instalarea */ })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL && k !== RUNTIME) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* pagina cere trecerea imediată la versiunea nouă */
self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
  if (e.data === 'version' && e.source) e.source.postMessage({ type: 'version', version: VERSION });
});

function isFresh(req, url) {
  if (req.mode === 'navigate') return true;
  for (var i = 0; i < FRESH.length; i++) {
    if (url.pathname.endsWith(FRESH[i])) return true;
  }
  return false;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  var sameOrigin = url.origin === self.location.origin;
  var cacheable = url.hostname === 'fonts.googleapis.com' ||
                  url.hostname === 'fonts.gstatic.com' ||
                  url.hostname === 'www.gstatic.com';
  if (!sameOrigin && !cacheable) return;

  /* documentul și fișierele care se schimbă des: rețea întâi */
  if (sameOrigin && isFresh(req, url)) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(SHELL).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  /* restul: cache întâi, reîmprospătat în fundal */
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
