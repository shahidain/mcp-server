import { User } from '../db-models/user.js';
import sql from 'mssql';
import { getPool } from '../config/db.js';

export class SqlUserService {
    async getPaginatedUsers(skip = 0, limit = 10): Promise<User[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);

            request.input('skip', sql.Int, skip);
            request.input('limit', sql.Int, limit);

            const result = await request.query(
                `SELECT U.*, R.Name As RoleName FROM Users U
                INNER JOIN Roles R ON R.Id = U.RoleId ORDER BY U.Id OFFSET @skip ROWS FETCH NEXT @limit ROWS ONLY`
            );

            return result.recordset;
        } catch (error) {
            console.error('Error in getPaginatedUsers:', error);
            throw error;
        }
    }

    async getUserById(id: number): Promise<User | null> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);

            request.input('id', sql.Int, id);

            const result = await request.query(
                `SELECT U.*, R.Name AS RoleName FROM Users U 
                INNER JOIN Roles R ON R.Id = U.RoleId WHERE U.Id = @id`
            );

            return result.recordset[0] || null;
        } catch (error) {
            console.error('Error in getUserById:', error);
            throw error;
        }
    }

    async searchUsers(query: string): Promise<User[]> {
        try {
            const pool = await getPool();
            const request = new sql.Request(pool);

            request.input('query', sql.VarChar, `%${query}%`);

            const result = await request.query(
                `SELECT U.*, R.Name AS RoleName FROM Users U
                  INNER JOIN Roles R ON U.RoleId = R.Id
                  WHERE 1 = 1
                 AND (U.Name LIKE @query 
                      OR U.Email LIKE @query 
                      OR U.Username LIKE @query)`
            );

            return result.recordset;
        } catch (error) {
            console.error('Error in searchUsers:', error);
            throw error;
        }
    }
}
