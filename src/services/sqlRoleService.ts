import { Role } from '../db-models/role.js';
import sql from 'mssql';
import { getPool } from '../config/db.js';

export class SqlRoleService {    async getPaginatedRoles(skip = 0, limit = 10): Promise<Role[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            // Query all roles and handle filtering in code
            const result = await request.query(
                `SELECT * FROM Roles ORDER BY Id`
            );
            
            // Filter deleted roles in code
            const nonDeletedRoles = result.recordset.filter(role => !role.Delete);
            
            return nonDeletedRoles;
        } catch (error) {
            console.error('Error in getPaginatedRoles:', error);
            throw error;
        }
    }    async getRoleById(id: number): Promise<Role | null> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            
            request.input('id', sql.Int, id);

            const result = await request.query(
                `SELECT * FROM Roles WHERE Id = @id`
            );
            
            // Return null if no role or if it's deleted
            if (result.recordset.length === 0 || result.recordset[0].Delete) {
                return null;
            }

            return result.recordset[0];
        } catch (error) {
            console.error('Error in getRoleById:', error);
            throw error;
        }
    }    async searchRoles(query: string | null | undefined): Promise<Role[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);
            request.input('query', sql.VarChar, `%${query}%`);

            const result = await request.query(
                `SELECT * FROM Roles 
                 WHERE Name LIKE @query`
            );
            
            // Filter deleted roles in code
            const nonDeletedRoles = result.recordset.filter(role => !role.Delete);
            
            return nonDeletedRoles;
        } catch (error) {
            console.error('Error in searchRoles:', error);
            throw error;
        }
    }
}
