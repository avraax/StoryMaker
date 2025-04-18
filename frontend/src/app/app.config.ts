import { provideRouter } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore, setLogLevel } from '@angular/fire/firestore';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
import { environment } from '../environments/environment';
import { routes } from './routes/app.routes';
import { ApplicationConfig } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),

    // 👇 Custom logic for Firestore debug logging
    provideFirestore(() => {
      const firestore = getFirestore();
      if (!environment.production) {
        setLogLevel('debug');
      }
      return firestore;
    }),

    provideAnalytics(() => getAnalytics())
  ]
};
