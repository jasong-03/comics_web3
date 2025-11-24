import networkConfig from "./networkConfig.json";

export { networkConfig };
export const NetworkConfig = networkConfig;

// Environment configuration
export const getTestPrivateKey = (): string | null => {
  return process.env.REACT_APP_TEST_PRIVATE_KEY || null;
};

export const getGeminiApiKey = (): string | null => {
  return process.env.REACT_APP_GEMINI_API_KEY || process.env.REACT_APP_API_KEY || null;
};
