import axios from 'axios';
import { Product, ProductsResponse } from '../models/product.js';
import { API_BASE_URL } from '../config/apiConfig.js';

export class ProductService {
  /**
   * Fetch all products with optional limit and skip parameters
   */
  static async getProducts(limit?: number, skip?: number): Promise<ProductsResponse> {
    const url = `${API_BASE_URL}/products`;
    const params = {};
    
    if (limit) {
      Object.assign(params, { limit });
    }
    
    if (skip) {
      Object.assign(params, { skip });
    }
    
    const response = await axios.get<ProductsResponse>(url, { params });
    return response.data;
  }

  /**
   * Get a specific product by ID
   */
  static async getProductById(id: number): Promise<Product> {
    const url = `${API_BASE_URL}/products/${id}`;
    const response = await axios.get<Product>(url);
    return response.data;
  }

  /**
   * Search products by query term
   */
  static async searchProducts(query: string): Promise<ProductsResponse> {
    const url = `${API_BASE_URL}/products/search`;
    const response = await axios.get<ProductsResponse>(url, {
      params: { q: query }
    });
    return response.data;
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(category: string): Promise<ProductsResponse> {
    const url = `${API_BASE_URL}/products/category/${category}`;
    const response = await axios.get<ProductsResponse>(url);
    return response.data;
  }
  /**
   * Get all product categories
   */
  static async getCategories(): Promise<any[]> {
    const url = `${API_BASE_URL}/products/categories`;
    const response = await axios.get<any[]>(url);
    return response.data;
  }
}
