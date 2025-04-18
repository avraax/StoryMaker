import { StoryChapter } from "./story-chapter";

export interface Story {
    id: string;
    title: string;
    aiPrompt: string;
    description: string;
    updatedAt: Date;
    chapters: StoryChapter[];
    image: string;
    sharedWith: string[];
    pageNumber?: {
        [email: string]: number;
    };
}
