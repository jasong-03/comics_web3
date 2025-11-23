import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";

// Test private key - ONLY FOR LOCAL TESTING
const TEST_PRIVATE_KEY = "suiprivkey1qqxrynrsy2a2txs6usnkg5zql0atlkslx9azqwvpelc6q2c2uhuev6clpe4";

// Enable test mode via environment variable or localStorage
const isTestMode = () => {
  return (
    process.env.REACT_APP_TEST_MODE === "true" ||
    localStorage.getItem("testMode") === "true"
  );
};

let testKeypair: Ed25519Keypair | null = null;
let testClient: SuiClient | null = null;

export const getTestWallet = () => {
  if (!isTestMode()) {
    return null;
  }

  if (!testKeypair) {
    try {
      // Decode the Sui private key format (suiprivkey1...)
      const decoded = decodeSuiPrivateKey(TEST_PRIVATE_KEY);
      testKeypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
    } catch (error) {
      console.error("Failed to create test keypair:", error);
      return null;
    }
  }

  return testKeypair;
};

export const getTestClient = () => {
  if (!isTestMode()) {
    return null;
  }

  if (!testClient) {
    testClient = new SuiClient({
      url: getFullnodeUrl("testnet"),
    });
  }

  return testClient;
};

export const getTestAccount = () => {
  const keypair = getTestWallet();
  if (!keypair) return null;

  return {
    address: keypair.toSuiAddress(),
    publicKey: keypair.getPublicKey().toBase64(),
    chains: ["sui:testnet"] as const,
    label: "Test Wallet",
    icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkYwMEZGIi8+Cjwvc3ZnPgo=",
  };
};

export const signAndExecuteTestTransaction = async (transaction: Transaction) => {
  const keypair = getTestWallet();
  const client = getTestClient();

  if (!keypair || !client) {
    throw new Error("Test wallet not available");
  }

  // Build the transaction
  const builtTx = await (transaction as any).build({ client });

  // Sign the transaction - returns SignatureWithBytes
  const signature = await keypair.signTransaction(builtTx);

  // Execute the transaction
  const result = await client.executeTransactionBlock({
    transactionBlock: builtTx,
    signature: signature.signature,
    options: {
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
      showBalanceChanges: true,
    },
  });

  return {
    digest: result.digest,
    effects: result.effects,
    events: result.events,
    objectChanges: result.objectChanges,
    balanceChanges: result.balanceChanges,
  };
};

// Helper to enable/disable test mode
export const enableTestMode = () => {
  localStorage.setItem("testMode", "true");
  window.location.reload();
};

export const disableTestMode = () => {
  localStorage.removeItem("testMode");
  window.location.reload();
};

