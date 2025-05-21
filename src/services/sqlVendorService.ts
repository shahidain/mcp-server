import { Vendor } from '../db-models/vendor.js';
import sql from 'mssql';
import { getPool } from '../config/db.js';

export class SqlVendorService {
    async getPaginatedVendors(skip = 0, limit = 10): Promise<Vendor[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            request.input('skip', sql.Int, skip);
            request.input('limit', sql.Int, limit);

            const result = await request.query(
                `SELECT * FROM Vendors WHERE (Deleted IS NULL OR Deleted = 0) ORDER BY Id OFFSET @skip ROWS FETCH NEXT @limit ROWS ONLY`
            );

            return result.recordset;
        } catch (error) {
            console.error('Error in getPaginatedVendors:', error);
            throw error;
        }
    }

    async getVendorById(id: number): Promise<Vendor | null> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            request.input('id', sql.Int, id);

            const result = await request.query(
                `SELECT * FROM Vendors WHERE Id = @id AND (Deleted IS NULL OR Deleted = 0)`
            );

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error in getVendorById:', error);
            throw error;
        }
    }

    async searchVendors(query: string): Promise<Vendor[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            request.input('query', sql.VarChar, `%${query}%`);

            const result = await request.query(
                `SELECT * FROM Vendors 
                 WHERE (Deleted IS NULL OR Deleted = 0) 
                 AND (Name LIKE @query 
                      OR Address LIKE @query 
                      OR ContactNo LIKE @query
                      OR Email LIKE @query
                      OR Type LIKE @query
                      OR BankCode LIKE @query)`
            );

            return result.recordset;
        } catch (error) {
            console.error('Error in searchVendors:', error);
            throw error;
        }
    }
}
