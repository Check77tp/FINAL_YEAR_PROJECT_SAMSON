// Loads environment variables from .env into process.env. Imported once,
// as early as possible, from server.js.
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
