import { StoryChapter } from "./story-chapter";

export interface FireStoreStory {
    id?: string;       // Firestore document ID (optional, set after save)
    title: string;     // Story title
    chapters: StoryChapter[];
    author: string;
    image: string;
    description: string;
    createdBy: string;
    createdAt: Date;   // Timestamp for creation
    updatedAt: Date;   // Timestamp for updates
    lix: number;       // 🔹 Nyt felt til LIX-niveau
    sharedWith: string[];
    pageNumber?: {
        [email: string]: number;
    };
}