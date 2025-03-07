import { StoryChapter } from "./story-chapter";

export interface FireStoreStory {
    id?: string;       // Firestore document ID (optional, set after save)
    title: string;     // Story title
    chapters: StoryChapter[];
    createdAt: Date;   // Timestamp for creation
    updatedAt: Date;  // Timestamp for updates
}
