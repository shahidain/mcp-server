import axios from 'axios';
import { User, UsersResponse } from '../models/user.js';
import { API_BASE_URL } from '../config/apiConfig.js';

export class UserService {
  /**
   * Fetch all users with optional limit and skip parameters
   */
  static async getUsers(limit?: number, skip?: number): Promise<UsersResponse> {
    const url = `${API_BASE_URL}/users`;
    const params = {};
    
    if (limit) {
      Object.assign(params, { limit });
    }
    
    if (skip) {
      Object.assign(params, { skip });
    }
    
    const response = await axios.get<UsersResponse>(url, { params });
    return response.data;
  }

  /**
   * Get a specific user by ID
   */
  static async getUserById(id: number): Promise<User> {
    const url = `${API_BASE_URL}/users/${id}`;
    const response = await axios.get<User>(url);
    return response.data;
  }

  /**
   * Search users by query term (searches in firstName, lastName, and email)
   */
  static async searchUsers(query: string): Promise<UsersResponse> {
    const url = `${API_BASE_URL}/users/search`;
    const response = await axios.get<UsersResponse>(url, {
      params: { q: query }
    });
    return response.data;
  }
}
