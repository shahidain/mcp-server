// Model representing database Role entity
export interface Role {
    Id: number;
    Name: string;
    Delete: boolean;
    CreatedOn?: Date;
    CreatedBy?: number;
    ModifiedOn?: Date;
    ModifiedBy?: number;
}
