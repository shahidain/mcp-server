export interface Commodity {
  Id: number;
  Code: string;
  Name: string;
  Unit: string;
  Deleted: number;
  CreatedOn: Date;
  CreatedBy: number;
  ModifiedOn: Date;
  ModifiedBy: number;
  ShortName: string;
  LotSize: number;
  BankCode: string;
  ISINTERNATIONAL: boolean;
}