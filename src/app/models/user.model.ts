export interface UserModel {
    uid: string;
    email: string;
    role: 'reader' | 'contributor' | 'administrator';
    assignedUsers: string[];
}  