import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  async saveStory(userId: string, mainCategory: string, subCategory: string, topic: string, story: { texts: string[], images: string[] }[]) {
    const storiesRef = collection(this.firestore, `users/${userId}/stories`);
    await addDoc(storiesRef, { topic, mainCategory, subCategory, story, timestamp: new Date() });
  }

  async getUserStories(userId: string) {
    const storiesRef = collection(this.firestore, `users/${userId}/stories`);
    const snapshot = await getDocs(storiesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async saveQuizResult(userId: string, storyId: string, score: number, totalQuestions: number) {
    const quizRef = doc(this.firestore, `users/${userId}/quizResults/${storyId}`);
    await setDoc(quizRef, { score, totalQuestions, timestamp: new Date() });
  }

  async getQuizResult(userId: string, storyId: string) {
    const quizRef = doc(this.firestore, `users/${userId}/quizResults/${storyId}`);
    const quizSnap = await getDoc(quizRef);  // ✅ Fixed getDoc instead of getDocs

    return quizSnap.exists() ? quizSnap.data() : null;
  }

  async deleteUserStory(userId: string, storyId: string) {
    const storyRef = doc(this.firestore, `users/${userId}/stories/${storyId}`);
    await deleteDoc(storyRef);
  }
}
