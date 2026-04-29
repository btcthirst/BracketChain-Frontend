import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

export function ConnectButton() {
  const { setVisible } = useWalletModal();
  const { connected, publicKey, disconnect } = useWallet();

  if (connected) {
    return (
      <button
        onClick={disconnect}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
      >
        {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
    >
      Connect Wallet
    </button>
  );
}