import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, deleteDoc, getDoc, collectionData, DocumentReference } from '@angular/fire/firestore';
import { FireStoreStory } from '../models/firestore-story';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(private firestore: Firestore) { }

  async saveGeneratedStory(userId: string, story: FireStoreStory): Promise<DocumentReference> {
    const storiesCollection = collection(this.firestore, `users/${userId}/generatedStories`);
    return await addDoc(storiesCollection, story);
  }

  async deleteGeneratedStory(userId: string, storyId: string): Promise<void> {
    const storyDocRef = doc(this.firestore, `users/${userId}/generatedStories/${storyId}`);
    await deleteDoc(storyDocRef);
  }

  async getGeneratedStory(userId: string, storyId: string): Promise<FireStoreStory | null> {
    const storyDocRef = doc(this.firestore, `users/${userId}/generatedStories/${storyId}`);
    const storyDocSnap = await getDoc(storyDocRef);
    return storyDocSnap.exists() ? (storyDocSnap.data() as FireStoreStory) : null;
  }

  getGeneratedStories(userId: string): Observable<FireStoreStory[]> {
    const storiesCollection = collection(this.firestore, `users/${userId}/generatedStories`);
    return collectionData(storiesCollection, { idField: 'id' }) as Observable<FireStoreStory[]>;
  }
}
