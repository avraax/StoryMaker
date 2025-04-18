import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { FirestoreService } from '../../services/firestore.service';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { UserShareModel } from '../../models/user-share.model';

@Component({
  selector: 'app-share-story-dialog',
  templateUrl: 'share-story-dialog.component.html',
  styleUrls: ['share-story-dialog.component.scss'],
  imports: [MatDialogContent, MatDialogActions, MatButtonModule, MatListModule]
})
export class ShareStoryDialogComponent {
  assignedUsers: UserShareModel[] = [];

  constructor(
    public dialogRef: MatDialogRef<ShareStoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { story: any },
    private firestoreService: FirestoreService
  ) { }

  ngOnInit() {
    this.refreshData();
  }

  async refreshData() {
    try {
      // Fetch the latest story data to ensure sharedWith is updated
      const updatedStory = await this.firestoreService.getStoryById(this.data.story.id);
      this.data.story.sharedWith = updatedStory?.sharedWith ?? [];

      // Now fetch users and update assignedUsers based on fresh sharedWith
      const users = await this.firestoreService.getAssignedUsers();
      this.assignedUsers = users.map(user => ({
        uid: user.uid,
        email: user.email,
        selected: this.data.story.sharedWith.includes(user.email), // Now uses latest sharedWith
        role: typeof user.role === 'string' ? user.role : '',
        assignedUsers: Array.isArray(user.assignedUsers) ? user.assignedUsers : []
      })) as UserShareModel[];
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  saveSharing() {
    const assignedUsers = this.assignedUsers.filter(user => user.selected);
    this.dialogRef.close(assignedUsers);
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
