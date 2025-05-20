// User interface based on DummyJSON API response

// Hair object interface
export interface Hair {
  color: string;
  type: string;
}

// Coordinates interface for addresses
export interface Coordinates {
  lat: number;
  lng: number;
}

// Address interface
export interface Address {
  address: string;
  city: string;
  state: string;
  stateCode: string;
  postalCode: string;
  coordinates: Coordinates;
  country: string;
}

// Bank details interface
export interface Bank {
  cardExpire: string;
  cardNumber: string;
  cardType: string;
  currency: string;
  iban: string;
}

// Company interface
export interface Company {
  department: string;
  name: string;
  title: string;
  address: Address;
}

// Cryptocurrency interface
export interface Crypto {
  coin: string;
  wallet: string;
  network: string;
}

// User interface
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  maidenName: string;
  age: number;
  gender: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  birthDate: string;
  image: string;
  bloodGroup: string;
  height: number;
  weight: number;
  eyeColor: string;
  hair: Hair;
  ip: string;
  address: Address;
  macAddress: string;
  university: string;
  bank: Bank;
  company: Company;
  ein: string;
  ssn: string;
  userAgent: string;
  crypto: Crypto;
  role: string;
}

// Response structure from DummyJSON API
export interface UsersResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}
