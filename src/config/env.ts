export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
};