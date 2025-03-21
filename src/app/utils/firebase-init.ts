import { getAuth, onAuthStateChanged } from '@angular/fire/auth';

export function waitForFirebaseAuth(): Promise<void> {
  const auth = getAuth();

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub(); // stop listening once initialized
      resolve();
    });
  });
}
