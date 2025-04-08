import { StoryChapter } from "./story-chapter";

export interface FireStoreStory {
    id?: string;       // Firestore document ID (optional, set after save)
    title: string;     // Story title
    description: string;     // Placeholder for future description
    aiPrompt: string;     // input used for prompting AI for story generation
    chapters: StoryChapter[];
    image: string;
    createdBy: string;
    createdAt: Date;   // Timestamp for creation
    updatedAt: Date;   // Timestamp for updates
    lix: number;       // 🔹 Nyt felt til LIX-niveau
    sharedWith: string[];
    pageNumber?: {
        [email: string]: number;
    };
}