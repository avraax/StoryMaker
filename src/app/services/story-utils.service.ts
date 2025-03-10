import { Injectable } from '@angular/core';
import { FireStoreStory } from '../models/firestore-story';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { StoryViewerComponent } from '../story-viewer/story-viewer.component';

@Injectable({
  providedIn: 'root'
})
export class StoryUtilsService {
  exportToPDF(story: FireStoreStory | null, storyContentElement: HTMLElement) {
    if (!story || !storyContentElement) {
      console.error("Story or storyContentElement is missing.");
      return;
    }

    const margin = 10; // Side margins in mm
    const pageWidth = 297; // A4 width in landscape (A4 height in portrait)
    const pageHeight = 210; // A4 height in landscape (A4 width in portrait)
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape mode

    const chapters = storyContentElement.querySelectorAll('.chapter-container');

    if (!chapters.length) {
      console.error("No chapters found for export!");
      return;
    }

    // Sanitize fileName to remove unsafe characters
    const safeFileName = story.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "export";

    let isFirstPage = true;

    const processChapter = async (index: number) => {
      if (index >= chapters.length) {
        doc.save(`${safeFileName}.pdf`);
        return;
      }

      const chapter = chapters[index] as HTMLElement;

      try {
        const canvas = await html2canvas(chapter, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin; // Adjust width for margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width; // Maintain aspect ratio

        if (!isFirstPage) {
          doc.addPage(); // Add a new page for each chapter
        }

        doc.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);

        isFirstPage = false; // Ensure new pages are added after the first

        await processChapter(index + 1); // Process the next chapter recursively
      } catch (error) {
        console.error("Error processing chapter:", error);
      }
    };

    processChapter(0); // Start processing chapters
  }
}
