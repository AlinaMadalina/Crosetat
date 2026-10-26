/* Sincronizare între telefon și laptop, peste Firebase.
 *
 * Cum funcționează:
 *   - toată starea aplicației (st din index.html) se ține ca un singur document
 *     Firestore, la users/<uid>/state/current, cu starea serializată în câmpul `json`
 *     (Firestore nu acceptă liste în liste, iar st are rows în parts în projects);
 *   - fiecare salvare locală se trimite sus, cu o pauză de 1,5 s ca să nu scrie la fiecare tastă;
 *   - onSnapshot aduce imediat ce s-a schimbat pe celălalt dispozitiv;
 *   - Firestore ține un cache local persistent, deci merge și fără internet:
 *     scrierile se strâng în coadă și pleacă singure când revine semnalul.
 *
 * Fără window.CROSET_FIREBASE nu se încarcă nimic și aplicația rămâne strict locală.
 */
(function () {
  'use strict';

  var SDK = 'https://www.gstatic.com/firebasejs/11.0.2/';
  var META = 'croset-sync-meta';
  var DEBOUNCE = 1500;

  var fb = null;           // modulele Firebase, odată încărcate
  var docRef = null;
  var unsub = null;
  var user = null;
  var timer = null;
  var pushing = false;
  var again = false;
  var firstSnapshot = true;

  /* ---------- memorie locală a sincronizării ---------- */
  function meta() {
    try { return JSON.parse(localStorage.getItem(META)) || {}; } catch (e) { return {}; }
  }
  function setMeta(patch) {
    var m = meta();
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) m[k] = patch[k];
    try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) {}
    return m;
  }
  function deviceId() {
    var m = meta();
    if (!m.dev) m = setMeta({ dev: Math.random().toString(36).slice(2, 10) });
    return m.dev;
  }

  /* ---------- interfață ---------- */
  var el = {};
  function $(id) { return document.getElementById(id); }
  function grab() {
    el.box = $('syncBox'); el.state = $('syncState'); el.form = $('syncForm');
    el.email = $('syncEmail'); el.pass = $('syncPass'); el.inBtn = $('syncIn');
    el.outBox = $('syncOutBox'); el.outBtn = $('syncOut'); el.msg = $('syncMsg');
    return !!el.box;
  }
  function say(text) { if (el.msg) el.msg.textContent = text || ''; }
  function status(text) { if (el.state) el.state.textContent = text; }
  function hhmm(t) {
    var d = new Date(t);
    return d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  }
  function showSignedOut() {
    if (el.form) el.form.hidden = false;
    if (el.outBox) el.outBox.hidden = true;
  }
  function showSignedIn() {
    if (el.form) el.form.hidden = true;
    if (el.outBox) el.outBox.hidden = false;
    if (el.pass) el.pass.value = '';
  }

  /* ---------- încărcarea SDK-ului ---------- */
  function load() {
    return Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-firestore.js')
    ]).then(function (m) {
      return { app: m[0], auth: m[1], fs: m[2] };
    });
  }

  /* ---------- trimiterea stării în sus ---------- */
  function pushNow() {
    if (!docRef || !window.CrosetApp) return Promise.resolve();
    if (pushing) { again = true; return Promise.resolve(); }
    pushing = true;
    var payload = {
      json: JSON.stringify(window.CrosetApp.getState()),
      v: window.CrosetApp.version,
      writer: deviceId(),
      clientAt: Date.now(),
      updatedAt: fb.fs.serverTimestamp()
    };
    return fb.fs.setDoc(docRef, payload).then(function () {
      setMeta({ syncedAt: Date.now() });
      status('Sincronizat ' + hhmm(Date.now()) + '.');
      say('');
    }).catch(function (e) {
      /* offline nu e eroare: Firestore trimite singur când revine internetul */
      say('Nu s-a putut trimite acum (' + (e && e.code ? e.code : 'offline') + '). Se reia singur.');
    }).then(function () {
      pushing = false;
      if (again) { again = false; return pushNow(); }
    });
  }

  function schedulePush() {
    if (!docRef) return;
    status('Se trimite…');
    clearTimeout(timer);
    timer = setTimeout(pushNow, DEBOUNCE);
  }

  /* ---------- primirea stării de sus ---------- */
  function applyRemote(d, note) {
    var ns;
    try { ns = JSON.parse(d.json); } catch (e) { return false; }
    if (!window.CrosetApp.setState(ns)) return false;
    setMeta({ syncedAt: Date.now(), localChangedAt: d.clientAt || Date.now() });
    status(note);
    return true;
  }

  function listen() {
    firstSnapshot = true;
    unsub = fb.fs.onSnapshot(docRef, function (snap) {
      if (firstSnapshot) {
        firstSnapshot = false;
        if (!snap.exists()) {            // prima oară: urcăm ce avem aici
          status('Se trimite prima dată…');
          pushNow();
          return;
        }
        var d = snap.data();
        var localAt = meta().localChangedAt || 0;
        var remoteAt = d.clientAt || 0;
        if (localAt > remoteAt) {        // aici e mai nou decât în cloud
          pushNow();
          return;
        }
        applyRemote(d, 'Adus din cloud ' + hhmm(Date.now()) + '.');
        return;
      }

      if (!snap.exists()) return;
      var data = snap.data();
      if (data.writer === deviceId()) {  // ecoul propriei scrieri
        setMeta({ syncedAt: Date.now() });
        status('Sincronizat ' + hhmm(Date.now()) + '.');
        return;
      }
      applyRemote(data, 'Actualizat de pe celălalt dispozitiv ' + hhmm(Date.now()) + '.');
    }, function (e) {
      status('Sincronizarea s-a oprit.');
      say(e && e.code ? e.code : String(e));
    });
  }

  /* ---------- autentificare ---------- */
  function onUser(u) {
    user = u;
    if (unsub) { unsub(); unsub = null; }
    clearTimeout(timer);

    if (!u) {
      docRef = null;
      showSignedOut();
      status('Deconectat. Datele rămân pe acest dispozitiv.');
      return;
    }
    docRef = fb.fs.doc(fb.store, 'users/' + u.uid + '/state/current');
    showSignedIn();
    status('Conectat ca ' + (u.email || 'cont') + '. Se verifică…');
    listen();
  }

  function signIn() {
    var email = (el.email.value || '').trim();
    var pass = el.pass.value || '';
    if (!email || !pass) { say('Scrie emailul și parola contului de sincronizare.'); return; }
    el.inBtn.disabled = true;
    say('Se conectează…');
    fb.auth.signInWithEmailAndPassword(fb.authi, email, pass).catch(function (e) {
      var c = e && e.code ? e.code : '';
      if (c.indexOf('invalid-credential') >= 0 || c.indexOf('wrong-password') >= 0 || c.indexOf('user-not-found') >= 0)
        say('Email sau parolă greșite.');
      else if (c.indexOf('network') >= 0)
        say('Fără internet acum. Încearcă din nou când ai semnal.');
      else
        say('Nu s-a putut conecta: ' + (c || e));
    }).then(function () { el.inBtn.disabled = false; });
  }

  function signOut() {
    say('');
    fb.auth.signOut(fb.authi).catch(function () {});
  }

  /* ---------- hook-ul chemat de index.html la fiecare salvare locală ---------- */
  window.CrosetSync = {
    onLocalSave: function () {
      setMeta({ localChangedAt: Date.now() });
      schedulePush();
    }
  };

  /* ---------- pornire ---------- */
  function start() {
    if (!grab()) return;

    if (!window.CROSET_FIREBASE) {
      status('Nu e configurată încă. Proiectele se țin doar pe acest dispozitiv.');
      if (el.form) el.form.hidden = true;
      return;
    }

    status('Se pregătește…');
    load().then(function (m) {
      var app = m.app.initializeApp(window.CROSET_FIREBASE);
      var store = m.fs.initializeFirestore(app, {
        localCache: m.fs.persistentLocalCache({ tabManager: m.fs.persistentMultipleTabManager() })
      });
      var authi = m.auth.getAuth(app);

      fb = {
        auth: m.auth, fs: m.fs, store: store, authi: authi,
        serverTimestamp: m.fs.serverTimestamp
      };

      el.inBtn.addEventListener('click', signIn);
      el.outBtn.addEventListener('click', signOut);
      el.pass.addEventListener('keydown', function (e) { if (e.key === 'Enter') signIn(); });

      return m.auth.setPersistence(authi, m.auth.browserLocalPersistence)
        .catch(function () {})
        .then(function () { m.auth.onAuthStateChanged(authi, onUser); });
    }).catch(function (e) {
      status('Sincronizarea nu a putut porni.');
      say('Aplicația merge normal, local. (' + (e && e.message ? e.message : e) + ')');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
