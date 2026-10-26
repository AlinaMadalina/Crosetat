/* Configurația Firebase.
   Se completează o singură dată, din consola Firebase:
   Project settings → General → Your apps → Web app → "SDK setup and configuration" → Config.

   Valorile de aici NU sunt secrete — cheia `apiKey` e publică prin design la Firebase.
   Datele sunt protejate de regulile Firestore (fiecare cont vede doar ce e sub uid-ul lui)
   și de lista de domenii autorizate din Authentication → Settings.

   Cât timp e `null`, aplicația merge exact ca până acum: totul local, fără sincronizare.
*/
window.CROSET_FIREBASE = null;

/* După configurare arată așa:

window.CROSET_FIREBASE = {
  apiKey: "...",
  authDomain: "proiectul-tau.firebaseapp.com",
  projectId: "proiectul-tau",
  storageBucket: "proiectul-tau.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};
*/
