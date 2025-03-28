import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, deleteDoc, getDoc, getDocs, updateDoc, CollectionReference, setDoc, query, where } from '@angular/fire/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { FireStoreStory } from '../models/firestore-story';
import { getAuth } from '@angular/fire/auth';
import { UserModel } from '../models/user.model';
import { UserShareModel } from '../models/user-share.model';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: Firestore) { }

  async saveStory(userId: string, story: FireStoreStory): Promise<void> {
    const auth = getAuth();
    if (!auth.currentUser || auth.currentUser.uid !== userId) throw new Error('Unauthorized');

    const storage = getStorage();
    const storiesCollection = collection(this.firestore, 'stories');

    // Save story skeleton (without images)
    const storyToSave: FireStoreStory = {
      title: story.title,
      author: story.author,
      description: story.description,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      sharedWith: [],
      chapters: [],
      lix: story.lix,
      image: ''
    };

    const storyDocRef = await addDoc(storiesCollection, storyToSave);
    const storyId = storyDocRef.id;

    // Upload Cover Image
    if (story.image?.startsWith('data:image')) {
      const coverImagePath = this.getCoverImagePath(userId, storyId);
      const coverImageRef = ref(storage, coverImagePath);
      const metadata = { customMetadata: { creator: userId } };

      await uploadString(coverImageRef, story.image, 'data_url', metadata);
      storyToSave.image = await getDownloadURL(coverImageRef);
    }

    // Upload Chapter Images
    const updatedChapters = await Promise.all(
      story.chapters.map(async (chapter, chapterIndex) => {
        const updatedChapter = { ...chapter, images: [] as string[] };

        if (chapter.images?.length) {
          for (let imageIndex = 0; imageIndex < chapter.images.length; imageIndex++) {
            const imgData = chapter.images[imageIndex];
            if (!imgData.startsWith('data:image')) continue;

            const imagePath = this.getChapterImagePath(userId, storyId, chapterIndex, imageIndex);
            const imageRef = ref(storage, imagePath);

            await uploadString(imageRef, imgData, 'data_url');
            updatedChapter.images.push(await getDownloadURL(imageRef));
          }
        }

        return updatedChapter;
      })
    );

    // Final update with images added
    await updateDoc(storyDocRef, {
      image: storyToSave.image,
      chapters: updatedChapters
    });
  }

  async deleteStory(storyId: string) {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error('Unauthorized');

    const userId = auth.currentUser.uid;
    const storage = getStorage();
    const storyDocRef = doc(this.firestore, `stories/${storyId}`);
    const storySnap = await getDoc(storyDocRef);

    if (!storySnap.exists()) return;

    const story = storySnap.data() as FireStoreStory;
    if (story.createdBy !== userId) throw new Error('Unauthorized');

    // Delete cover image
    try {
      const coverPath = this.getCoverImagePath(userId, storyId);
      await deleteObject(ref(storage, coverPath));
    } catch (err) {
      console.warn('Cover image deletion issue:', err);
    }

    // Delete chapter images
    for (let chapterIndex = 0; chapterIndex < story.chapters.length; chapterIndex++) {
      const chapter = story.chapters[chapterIndex];
      if (chapter.images?.length) {
        for (let imageIndex = 0; imageIndex < chapter.images.length; imageIndex++) {
          const imagePath = this.getChapterImagePath(userId, storyId, chapterIndex, imageIndex);
          try {
            await deleteObject(ref(storage, imagePath));
          } catch (err) {
            console.warn(`Failed to delete ${imagePath}:`, err);
          }
        }
      }
    }

    await deleteDoc(storyDocRef);
  }

  private getCoverImagePath(userId: string, storyId: string): string {
    return `stories/${userId}/${storyId}/cover.jpg`;
  }

  private getChapterImagePath(userId: string, storyId: string, chapterIndex: number, imageIndex: number): string {
    return `stories/${userId}/${storyId}/chapter_${chapterIndex}_${imageIndex}.jpg`;
  }

  async getStoryById(storyId: string): Promise<FireStoreStory | null> {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error('Unauthorized');

    const storyDocRef = doc(this.firestore, `stories/${storyId}`);
    const storySnap = await getDoc(storyDocRef);

    if (!storySnap.exists()) return null;

    const story = storySnap.data() as FireStoreStory;
    if (story.createdBy !== auth.currentUser.uid && !story.sharedWith.includes(auth.currentUser.uid)) {
      throw new Error('Unauthorized');
    }

    return story;
  }

  async updateStoryPageNumber(storyId: string, userEmail: string, pageNumber: number) {
    const storyRef = doc(this.firestore, `stories/${storyId}`);
    const safeEmail = userEmail.replace(/\./g, '_');

    try {
      await updateDoc(storyRef, {
        [`pageNumber.${safeEmail}`]: pageNumber
      });
    } catch (error) {
      console.error('Error saving page index:', error);
    }
  }

  async getUserFromFirestore(userId: string): Promise<UserModel | null> {
    const userRef = doc(this.firestore, `users/${userId}`);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return null;

    return userDoc.data() as UserModel;
  }

  async getAssignedUsers(): Promise<UserModel[]> {
    const authInstance = getAuth();
    const loggedInUser = authInstance.currentUser;

    if (!loggedInUser) return [];

    try {
      const userDocRef = doc(this.firestore, `users/${loggedInUser.uid}`);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) return [];

      const assignedUsersEmails: string[] = userDoc.data()?.['assignedUsers'] ?? [];

      if (!Array.isArray(assignedUsersEmails) || assignedUsersEmails.length === 0) return [];

      const userFetchPromises = assignedUsersEmails.map(async (email) => {
        

        const usersRef = collection(this.firestore, 'users') as CollectionReference<UserModel>;
        const q = query(usersRef, where('email', '==', email));
    
        try {
          const snapshot = await getDocs(q);
    
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            return { ...docSnap.data(), uid: docSnap.id };
          }
        } catch (error) {
          console.error("Error getting user by email", error);
        }
        return null;
      });

      const userResults = await Promise.all(userFetchPromises);

      // Filter out null results (failed fetches)
      return userResults.filter((user): user is UserModel => user !== null);

    } catch (error) {
      console.error("Error fetching assigned users:", error);
      return [];
    }
  }

  async getStoriesForUser(user: UserModel): Promise<FireStoreStory[]> {
    const storiesCollection = collection(this.firestore, 'stories') as CollectionReference<FireStoreStory>;

    try {
      const storiesSnapshot = await getDocs(storiesCollection);

      return storiesSnapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .filter(story => story.createdBy === user.uid || story.sharedWith.includes(user.email))
        .map(story => ({
          ...story,
          image: story.image || '',
          chapters: story.chapters?.map(chapter => ({
            ...chapter,
            images: chapter.images?.filter(img => img.startsWith('http')) || []
          })) || []
        }));
    } catch (error) {
      console.error("Error fetching stories for user:", error);
      return [];
    }
  }

  async updateStorySharing(storyId: string, assignedUsers: UserShareModel[]) {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error('Unauthorized');

    const storyRef = doc(this.firestore, `stories/${storyId}`);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) return;

    const story = storySnap.data() as FireStoreStory;
    if (story.createdBy !== auth.currentUser.uid) throw new Error('Unauthorized');

    await updateDoc(storyRef, { sharedWith: assignedUsers.map(x => x.email) });
  }

  private async setUserRole(user: UserModel, role: string) {
    if (!user) return;

    const userRef = doc(this.firestore, `users/${user.uid}`);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      role: role,
      assignedUsers: []
    }, { merge: true });
  }

  async getUserRole(userId: string): Promise<string> {
    try {
      const userRef = doc(this.firestore, `users/${userId}`);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserModel;
        return userData.role || 'reader'; // Default role if missing
      }

      return 'reader'; // Default role for new users
    } catch (error) {
      console.error("Error fetching user role:", error);
      return 'reader'; // Fallback role
    }
  }

  async getUserByEmail(email: string): Promise<UserModel | null> {
    const usersRef = collection(this.firestore, 'users') as CollectionReference<UserModel>;
    const q = query(usersRef, where('email', '==', email));

    try {
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        return { ...docSnap.data(), uid: docSnap.id };
      }
    } catch (error) {
      console.error("Error getting user by email", error);
    }

    return null;
  }

  public async checkAndSetUserRole(user: UserModel) {
    if (!user) return;

    const userRef = doc(this.firestore, `users/${user.uid}`);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() as UserModel | undefined;

    if (!userDoc.exists() || !userData?.role) {
      await this.setUserRole(user, 'reader');
    }
  }
}
