import dotenv from "dotenv";

dotenv.config();

const getEnv = (key, defaultValue = null) => {
  if (!process.env[key] && defaultValue === null) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return process.env[key] || defaultValue;
};

export const config = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  PORT: getEnv("PORT", 5000),

  DB_HOST: getEnv("DB_HOST"),
  DB_USER: getEnv("DB_USER"),
  DB_PASSWORD: getEnv("DB_PASSWORD"),
  DB_NAME: getEnv("DB_NAME"),
  DB_PORT: getEnv("DB_PORT", 3306),

  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_EXPIRATION: getEnv("JWT_EXPIRATION", "1d"),

  FRONTEND_URL: getEnv("FRONTEND_URL","*"),
  ALLOWED_ORIGINS: getEnv("ALLOWED_ORIGINS", "*"),

  LOG_LEVEL: getEnv("LOG_LEVEL", "debug"),
};
