import { WalrusClient } from "@mysten/walrus";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { getTestWallet } from "./testWallet";

// Initialize Sui Client for Testnet
const suiClient = new SuiClient({ url: getFullnodeUrl("testnet") });

// Initialize Walrus Client
// Note: In a real app, we shouldn't expose the private key like this.
// For this hackathon/demo, we'll use a hardcoded publisher or rely on the client's default configuration if possible.
// However, the SDK requires a signer for `writeBlob`.
// Since we are in the browser and want to use the user's wallet, we might need a different approach if the SDK doesn't support wallet adapters directly for signing.
// BUT, the user's example used a private key.
// Let's try to use the public publisher endpoint via the SDK if possible, or fallback to a hardcoded test key for the "publisher" role if the user is just uploading public data.
// Actually, for `writeBlob`, the SDK needs a signer to pay for the storage on Sui.
// If we want the USER to pay, we should use their wallet.
// But `WalrusClient` expects a `Keypair` or similar signer interface.
// Let's see if we can use a "dev" publisher that pays for us, or if we must sign.

// The user's example uses a private key.
// const secret = process.env.SUI_PRIVATE_KEY! as string;
// const { secretKey } = decodeSuiPrivateKey(secret);
// export const signer = Ed25519Keypair.fromSecretKey(secretKey);

// Since we are on the frontend, we can't easily use `process.env.SUI_PRIVATE_KEY` securely.
// However, for the purpose of this demo and the user's request, we can try to use the `testWallet`'s keypair if available, or ask the user to sign.
// The `testWallet.ts` exports `getTestWallet()` which returns a Keypair!

const walrusClient = new WalrusClient({
    suiClient: suiClient,
    network: "testnet",
});

export const base64ToBlob = (base64: string, mimeType: string = "image/jpeg"): Uint8Array => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Uint8Array(byteNumbers);
};

export const uploadToWalrus = async (file: Uint8Array): Promise<{ blobId: string; blobUrl: string }> => {
    const signer = getTestWallet();

    if (!signer) {
        throw new Error("Test wallet not available for signing Walrus upload transaction.");
    }

    console.log("Uploading to Walrus with signer:", signer.toSuiAddress());

    // The SDK's writeBlob handles the storage purchase and upload
    const { blobId } = await walrusClient.writeBlob({
        blob: file,
        deletable: false,
        epochs: 1, // Keep it short for testing
        signer: signer,
    });

    if (!blobId) {
        throw new Error("Failed to upload to Walrus: No blobId returned.");
    }

    return {
        blobId,
        blobUrl: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`,
    };
};

/**
 * Converts a base64url string (Walrus Blob ID) to a BigInt (u256).
 * Walrus Blob IDs are 32 bytes encoded as base64url.
 */
export const base64UrlToBigInt = (base64Url: string): bigint => {
    // 1. Convert base64url to base64
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    // Pad with '=' if necessary
    while (base64.length % 4) {
        base64 += "=";
    }

    // 2. Decode base64 to bytes
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // 3. Convert bytes to BigInt (Big Endian)
    let result = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
        result = (result << BigInt(8)) + BigInt(bytes[i]);
    }

    return result;
};
