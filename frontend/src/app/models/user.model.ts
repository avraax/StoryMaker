import { User } from "firebase/auth";

export interface UserModel extends User {
    uid: string;
    email: string;
    role: 'reader' | 'writer' | 'contributor' | 'administrator';
    assignedUsers: string[];
}