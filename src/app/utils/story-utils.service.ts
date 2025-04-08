import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Story } from '../models/story';

@Injectable({
  providedIn: 'root'
})
export class StoryUtilsService {
  async exportToPDF(story: Story | null, storyContentElement: HTMLElement) {
    if (!story || !storyContentElement) {
      console.error("Story or storyContentElement is missing.");
      return;
    }

    const margin = 10;
    const pageWidth = 297;
    const pageHeight = 210;
    const doc = new jsPDF('l', 'mm', 'a4');

    const safeFileName = story.title.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "export";

    const pages = Array.from(storyContentElement.querySelectorAll('.cover-page, .chapter-container, .last-page'));

    if (!pages.length) {
      console.error("No chapters found for export!");
      return;
    }

    let isFirstPage = true;

    for (const chapter of pages) {
      try {
        const canvas = await html2canvas(chapter as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (!isFirstPage) {
          doc.addPage();
        }

        doc.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        isFirstPage = false;
      } catch (error) {
        console.error("Error processing chapter:", error);
      }
    }

    doc.save(`${safeFileName}.pdf`);
  }
}
