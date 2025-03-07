import { derived, get } from "svelte/store";
import { ethers, type ContractRunner } from "ethers6";
import groupABI from "$lib/utils/abi/group";
import { wallet } from "$lib/stores/wallet";
import { avatar } from "$lib/stores/avatar";
import { circles } from "$lib/stores/circles";
import { BrowserProviderContractRunner } from "@circles-sdk/adapter-ethers";
import Safe from "@safe-global/protocol-kit";
import type { MetaTransactionData } from "@safe-global/types-kit";
import { OperationType } from "@safe-global/types-kit";

// const provider = new ethers.BrowserProvider(window.ethereum);
// const signer = await provider.getSigner();

export const groupAvatarContract = derived(
  [avatar, wallet, circles],
  ([$avatar, $wallet, $circles]) =>
    $avatar && $wallet && $circles
      ? new ethers.Contract(
          $avatar.address,
          groupABI,
          $wallet as ContractRunner,
        )
      : null,
);

const sanitizeAddresses = (addrStr: string): string[] => {
  const addresses = addrStr
    .split(",")
    .map((addr) => addr.trim())
    .filter((addr) => ethers.isAddress(addr));
  return addresses;
};

export async function addMembers(addrStr: string) {
  const addresses = sanitizeAddresses(addrStr);
  if (addresses.length === 0) {
    throw new Error("No valid addresses provided");
  }

  const contract = get(groupAvatarContract);
  const currentWallet = get(wallet);
  if (!contract) throw new Error("Contract not initialized");
  if (!currentWallet) throw new Error("Wallet not initialized");

  try {
    if (currentWallet instanceof BrowserProviderContractRunner) {
      // Metamask/EOA flow
      const tx = await contract.trust(addresses, 9999999999);
      await tx.wait();
      return tx;
    }

    // Safe Wallet Flow
    if (currentWallet?.safe) {
      console.log(currentWallet.address, "Safe wallet detected");
      // Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Encode the trust function call
      const encodedData = contract.interface.encodeFunctionData("trust", [
        addresses,
        9999999999n,
      ]);
      console.log(encodedData);

      // Create Safe transaction data
      const safeTransactionData: MetaTransactionData = {
        to: contract.target,
        value: "0",
        data: encodedData,
        operation: OperationType.Call,
      };
      console.log(safeTransactionData);

      // Initialize Safe protocol kit
      const protocolKit = await Safe.init({
        provider: window.ethereum,
        safeAddress: currentWallet.address, // Ensure correct Safe address
        signer: signer,
      });

      console.log(protocolKit);

      // Create Safe transaction
      const safeTransaction = await protocolKit.createTransaction({
        transactions: [safeTransactionData],
      });
      console.log(safeTransaction);

      // Use Circles SDK contract runner to execute the transaction
      if (currentWallet.sendBatchTransaction) {
        const batch = currentWallet.sendBatchTransaction();
        batch.addTransaction({
          to: avatar.address, //
          data: safeTransaction.data,
          value: 0n,
        });

        const receipt = await batch.run();
        return receipt;
      } else {
        throw new Error("Safe batch transaction method not available");
      }
    }

    throw new Error("Unknown wallet type detected");
  } catch (error) {
    console.error("Error adding member:", error);
    throw error;
  }
}

export async function removeMembers(addrStr: string) {
  const addresses = sanitizeAddresses(addrStr);
  if (addresses.length === 0) {
    throw new Error("No valid addresses provided");
  }

  const contract = get(groupAvatarContract);
  const currentWallet = get(wallet);
  if (!contract) throw new Error("Contract not initialized");
  if (!currentWallet) throw new Error("Wallet not initialized");

  try {
    if (currentWallet instanceof BrowserProviderContractRunner) {
      // Metamask/EOA flow
      const tx = await contract.trust(addresses, 0); // 0 to remove trust
      await tx.wait();
      return tx;
    }

    // Safe Wallet Flow
    if (currentWallet?.safe) {
      console.log(currentWallet.address, "Safe wallet detected");

      // Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Encode the trust function call with 0 to remove trust
      const encodedData = contract.interface.encodeFunctionData("trust", [
        addresses,
        0n, // 0 to remove trust
      ]);
      console.log(encodedData);

      // Create Safe transaction data
      const safeTransactionData: MetaTransactionData = {
        to: contract.target,
        value: "0",
        data: encodedData,
        operation: OperationType.Call,
      };
      console.log(safeTransactionData);

      // Initialize Safe protocol kit
      const protocolKit = await Safe.init({
        provider: window.ethereum,
        safeAddress: currentWallet.address,
        signer: signer,
      });

      console.log(protocolKit);

      // Create Safe transaction
      const safeTransaction = await protocolKit.createTransaction({
        transactions: [safeTransactionData],
      });
      console.log(safeTransaction);

      // Use Circles SDK contract runner to execute the transaction
      if (currentWallet.sendBatchTransaction) {
        const batch = currentWallet.sendBatchTransaction();
        batch.addTransaction({
          to: avatar.address,
          data: safeTransaction.data,
          value: 0n,
        });

        const receipt = await batch.run();
        return receipt;
      } else {
        throw new Error("Safe batch transaction method not available");
      }
    }

    throw new Error("Unknown wallet type detected");
  } catch (error) {
    console.error("Error removing member:", error);
    throw error;
  }
}

export async function setService(addrStr: string) {
  const contract = get(groupAvatarContract);
  if (!contract) throw new Error("Contract not initialized");

  try {
    const tx = await contract.setService(addrStr);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("Error setting service:", error);
    throw error;
  }
}

export async function setMintHandler(addrStr: string) {
  const contract = get(groupAvatarContract);
  if (!contract) throw new Error("Contract not initialized");

  try {
    const tx = await contract.setMintHandler(addrStr);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("Error setting minter:", error);
    throw error;
  }
}

export async function setRedemptionHandler(addrStr: string) {
  const contract = get(groupAvatarContract);
  if (!contract) throw new Error("Contract not initialized");

  try {
    const tx = await contract.setRedemptionHandler(addrStr);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("Error setting redemption:", error);
    throw error;
  }
}
