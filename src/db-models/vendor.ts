export interface Vendor {
  Id: number;
  Name: string;
  Address: string;
  ContactNo: string;
  Type: string;
  Deleted: number;
  CreatedOn: Date;
  CreatedBy: number;
  ModifiedOn: Date;
  ModifiedBy: number;
  ContractDate: Date;
  AccNo: string;
  Email: string;
  SettlementText: string;
  IsInternational: boolean;
  BankCode: string;
}
