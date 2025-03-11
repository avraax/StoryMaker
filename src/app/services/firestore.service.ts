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

    let storyToSave: FireStoreStory = {
      title: story.title,
      author: story.author,
      description: story.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      chapters: [],
      image: "" // Placeholder for cover image URL
    };

    // 🔹 Upload the cover image first (if available)
    if (story.image && story.image.startsWith("data:image")) {
      const now = Date.now();
      const safeTitle = `${encodeURIComponent(story.title).replace(/%20/g, "_")}_${now}`;
      const coverImagePath = `users/${userId}/stories/${safeTitle}/cover.jpg`;
      const coverImageRef = ref(storage, coverImagePath);

      console.log(`📤 Uploading cover image: ${coverImagePath}`);

      try {
        await uploadString(coverImageRef, story.image, 'data_url');
        const downloadURL = await getDownloadURL(coverImageRef);

        const finalUrl = downloadURL.includes("firebasestorage.googleapis.com")
          ? `${downloadURL}&alt=media`
          : downloadURL;

        storyToSave.image = finalUrl;
        console.log(`✅ Cover image uploaded successfully: ${finalUrl}`);
      } catch (error) {
        console.error("❌ Cover image upload failed:", error);
        throw error;
      }
    }

    // 🔹 Upload images for each chapter
    for (let chapterIndex = 0; chapterIndex < story.chapters.length; chapterIndex++) {
      let updatedChapter = { ...story.chapters[chapterIndex], images: [] as string[] };

      if (story.chapters[chapterIndex].images && story.chapters[chapterIndex].images.length > 0) {
        const now = Date.now();
        for (let imageIndex = 0; imageIndex < story.chapters[chapterIndex].images.length; imageIndex++) {
          const safeTitle = `${encodeURIComponent(story.title).replace(/%20/g, "_")}_${now}`;
          const imagePath = `users/${userId}/stories/${safeTitle}/chapter_${chapterIndex}_${imageIndex}.jpg`;
          const imageRef = ref(storage, imagePath);

          console.log(`📤 Uploading chapter image: ${imagePath}`);

          try {
            // 🔹 Ensure valid Base64 image before upload
            if (!story.chapters[chapterIndex].images[imageIndex].startsWith("data:image")) {
              console.warn(`Invalid Base64 image format. Skipping! Image: ${story.chapters[chapterIndex].images[imageIndex]}`);
              continue;
            }

            await uploadString(imageRef, story.chapters[chapterIndex].images[imageIndex], 'data_url');
            const downloadURL = await getDownloadURL(imageRef);

            const finalUrl = downloadURL.includes("firebasestorage.googleapis.com")
              ? `${downloadURL}&alt=media`
              : downloadURL;

            updatedChapter.images.push(finalUrl);
            console.log(`✅ Chapter image uploaded successfully: ${finalUrl}`);
          } catch (error) {
            console.error("❌ Chapter image upload failed:", error);
            throw error;
          }
        }
      }

      storyToSave.chapters.push(updatedChapter);
    }

    // 🔹 Save the modified story with cover & chapter images to Firestore
    await addDoc(storiesCollection, storyToSave);
    console.log(`✅ Story saved successfully with cover and chapter images.`);
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

    // ✅ Ensure image is included
    const storyWithImage: FireStoreStory = {
      ...storyData,
      image: storyData.image || "" // Default empty string if missing
    };

    console.log("📥 Fetched story with cover image:", storyWithImage);
    return storyWithImage;
  }

  getStories(userId: string): Observable<FireStoreStory[]> {
    const storiesCollection = collection(this.firestore, `users/${userId}/stories`) as CollectionReference<DocumentData>;

    return collectionData(storiesCollection, { idField: 'id' }).pipe(
      map((stories: DocumentData[]) =>
        stories.map(story => ({
          ...story,
          image: story['image'] || "", // ✅ Ensure cover image is mapped
          chapters: (story['chapters'] as any[])?.map((chapter: any) => ({
            ...chapter,
            images: (chapter['images'] as string[])?.map(img => img.startsWith('http') ? img : null) || []
          })) || []
        }) as FireStoreStory)
      )
    );
  }
}
