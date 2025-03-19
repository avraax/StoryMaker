import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { FirestoreService } from '../services/firestore.service';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-share-story-dialog',
  templateUrl: 'share-story-dialog.component.html',
  styleUrls: ['share-story-dialog.component.scss'],
    imports: [MatDialogContent, MatDialogActions, MatButtonModule, MatListModule]
})
export class ShareStoryDialogComponent {
  assignedUsers: { uid: string; email: string; selected: boolean }[] = [];

  constructor(
    public dialogRef: MatDialogRef<ShareStoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { story: any },
    private firestoreService: FirestoreService
  ) {}

  ngOnInit() {
    this.firestoreService.getAssignedUsers().subscribe(users => {
      console.log('users', users);
      this.assignedUsers = users.map(user => ({
        uid: user.uid,
        email: user.email,
        selected: this.data.story.sharedWith.includes(user.uid)
      }));
    });
  }

  saveSharing() {
    const selectedUserIds = this.assignedUsers.filter(user => user.selected).map(user => user.uid);
    this.dialogRef.close(selectedUserIds);
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
