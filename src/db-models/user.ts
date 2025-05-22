export interface User {
  Id: number;
  Name: string;
  Email: string;
  Username: string;
  RoleId: number;
  Blocked: boolean;
  Attempt: number;
  Deleted: number;
  CreatedOn: Date;
  CreatedBy: number;
  ModifiedOn: Date;
  ModifiedBy: number;
  DigitalSignature: string;
  LastLogin: Date;
  CurrentLogin: Date;
  RoleName: string | null;
}
