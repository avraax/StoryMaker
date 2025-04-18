import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

const firebaseApp = initializeApp(environment.firebaseConfig);
const firestore = getFirestore(firebaseApp); // Add this line

const waitForFirebaseAuth = (): Promise<void> => {
  return new Promise((resolve) => {
    const auth = getAuth(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });
};

waitForFirebaseAuth().then(() => {
  bootstrapApplication(AppComponent, appConfig)
    .catch(err => console.error(err));
});
