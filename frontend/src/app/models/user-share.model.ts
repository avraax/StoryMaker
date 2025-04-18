import { UserModel } from "./user.model";

export interface UserShareModel extends UserModel {
    selected: boolean
}  