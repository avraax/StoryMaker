import { User } from "firebase/auth";

export interface UserModel extends User {
    uid: string;
    email: string;
    role: 'reader' | 'contributor' | 'administrator';
    assignedUsers: string[];
}  