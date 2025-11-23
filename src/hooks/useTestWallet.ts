import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useMemo } from "react";
import { getTestAccount, signAndExecuteTestTransaction } from "../utils/testWallet";
import type { Transaction } from "@mysten/sui/transactions";

/**
 * Check if test mode is enabled
 */
const isTestMode = (): boolean => {
  return (
    process.env.REACT_APP_TEST_MODE === "true" ||
    localStorage.getItem("testMode") === "true"
  );
};

/**
 * Custom hook that returns the current account, using test wallet if in test mode
 */
export const useTestAccount = () => {
  const realAccount = useCurrentAccount();
  const testAccount = useMemo(() => getTestAccount(), []);

  if (isTestMode()) {
    return testAccount;
  }

  return realAccount;
};

/**
 * Custom hook that provides transaction signing, using test wallet if in test mode
 */
export const useTestSignAndExecute = () => {
  const realSignAndExecute = useSignAndExecuteTransaction();

  const signAndExecute = async ({ transaction }: { transaction: Transaction }) => {
    if (isTestMode()) {
      return await signAndExecuteTestTransaction(transaction);
    }

    return await realSignAndExecute.mutateAsync({ transaction });
  };

  return {
    mutateAsync: signAndExecute,
    isPending: isTestMode() ? false : realSignAndExecute.isPending,
    isError: isTestMode() ? false : realSignAndExecute.isError,
    error: isTestMode() ? null : realSignAndExecute.error,
  };
};
