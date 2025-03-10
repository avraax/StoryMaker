import { Injectable } from '@angular/core';
import { FireStoreStory } from '../models/firestore-story';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class StoryUtilsService {
  async exportToPDF(story: FireStoreStory | null, storyContentElement: HTMLElement) {
    if (!story || !storyContentElement) {
      console.error("Story or storyContentElement is missing.");
      return;
    }

    const margin = 10; // Side margins in mm
    const pageWidth = 297; // A4 width in landscape (matches iPad)
    const pageHeight = 210; // A4 height in landscape (matches iPad)
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape mode

    const chapters = storyContentElement.querySelectorAll('.chapter-container');

    if (!chapters.length) {
      console.error("No chapters found for export!");
      return;
    }

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
          scale: 2, // Ensures high resolution
          useCORS: true,
          backgroundColor: null,
          width: 1024, // ✅ Match iPad width
          height: 768, // ✅ Match iPad height
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (!isFirstPage) {
          doc.addPage(); 
        }

        doc.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);

        isFirstPage = false;

        await processChapter(index + 1);
      } catch (error) {
        console.error("Error processing chapter:", error);
      }
    };

    processChapter(0);
  }
}
