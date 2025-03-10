import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, deleteDoc, getDoc, collectionData, getDocs, DocumentData, CollectionReference } from '@angular/fire/firestore';
import { getApp } from '@angular/fire/app';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { FireStoreStory } from '../models/firestore-story';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getAuth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: Firestore) { }

  async saveStory(userId: string, story: FireStoreStory): Promise<void> {
    const app = getApp();
    const auth = getAuth(app);
    const storage = getStorage(app);
    const storiesCollection = collection(this.firestore, `users/${userId}/stories`);

    // 🔹 Ensure the user is authenticated before proceeding
    if (!auth.currentUser) {
      console.error("❌ User is not authenticated!");
      throw new Error("User must be authenticated to save a story.");
    }

    // 🔹 Refresh authentication token before upload
    await auth.currentUser.getIdToken(true);

    console.log("🔹 Current User:", auth.currentUser);

    // Prepare story object WITHOUT images first
    let storyToSave: FireStoreStory = {
      title: story.title,
      createdAt: new Date(),
      updatedAt: new Date(),
      chapters: []
    };

    // 🔹 Upload images to Firebase Storage and replace them with URLs
    for (let chapter of story.chapters) {
      let updatedChapter = { ...chapter, images: [] as string[] };

      if (chapter.images && chapter.images.length > 0) {
        const now = Date.now();
        for (let i = 0; i < chapter.images.length; i++) {
          const safeTitle = `${encodeURIComponent(story.title).replace(/%20/g, "_")}_${now}`;
          const imagePath = `users/${userId}/stories/${safeTitle}/chapter_${i}.jpg`;
          const imageRef = ref(storage, imagePath);

          console.log(`📤 Uploading image: ${imagePath}`);

          try {
            // 🔹 Ensure valid Base64 image before upload
            if (!chapter.images[i].startsWith("data:image")) {
              throw new Error("Invalid Base64 image format.");
            }

            await uploadString(imageRef, chapter.images[i], 'data_url');
            const downloadURL = await getDownloadURL(imageRef);

            const finalUrl = downloadURL.includes("firebasestorage.googleapis.com")
              ? `${downloadURL}&alt=media`
              : downloadURL;

            updatedChapter.images.push(finalUrl);
            console.log(`✅ Image uploaded successfully: ${finalUrl}`);
          } catch (error) {
            console.error("❌ Image upload failed:", error);
            throw error;
          }
        }
      }

      storyToSave.chapters.push(updatedChapter);
    }

    // 🔹 Save the modified story with image URLs to Firestore
    await addDoc(storiesCollection, storyToSave);
    console.log(`✅ Story saved successfully with uploaded images.`);
  }

  async deleteStory(userId: string, storyId: string) {
    const app = getApp();
    const storage = getStorage(app);

    const storyDocRef = doc(this.firestore, `users/${userId}/stories/${storyId}`);
    const chaptersCollection = collection(this.firestore, `users/${userId}/stories/${storyId}/chapters`);
    const chaptersSnapshot = await getDocs(chaptersCollection);

    for (let chapterDoc of chaptersSnapshot.docs) {
      const chapter = chapterDoc.data(); // Firestore DocumentData

      if (chapter['images']) {
        for (let imageUrl of chapter['images']) {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        }
      }
    }

    await deleteDoc(storyDocRef);
    console.log(`✅ Story and images deleted successfully.`);
  }

  async getStory(userId: string, storyId: string): Promise<FireStoreStory | null> {
    const storyDocRef = doc(this.firestore, `users/${userId}/stories/${storyId}`);
    const storySnap = await getDoc(storyDocRef);

    if (!storySnap.exists()) {
      console.error("❌ Story not found");
      return null;
    }

    let storyData = storySnap.data() as FireStoreStory;

    console.log("📥 Fetched story with images:", storyData);
    return storyData;
  }

  getStories(userId: string): Observable<FireStoreStory[]> {
    const storiesCollection = collection(this.firestore, `users/${userId}/stories`) as CollectionReference<DocumentData>;

    return collectionData(storiesCollection, { idField: 'id' }).pipe(
      map((stories: DocumentData[]) =>
        stories.map(story => ({
          ...story,
          chapters: (story['chapters'] as any[])?.map((chapter: any) => ({
            ...chapter,
            images: (chapter['images'] as string[])?.map(img => img.startsWith('http') ? img : null) || []
          })) || []
        }) as FireStoreStory)
      )
    );
  }
}
