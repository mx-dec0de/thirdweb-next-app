'use client';

import React, { useState, useEffect } from 'react';
import { ThirdwebProvider, ConnectWallet, useAddress, useDisconnect } from "@thirdweb-dev/react";
import { QueryClient, QueryClientProvider } from 'react-query';
import { ethers } from 'ethers';
import WalletConnectProvider from "@walletconnect/web3-provider"; // Import WalletConnect directly
import { appConfig } from '../config';

const queryClient = new QueryClient();

export default function HomePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider 
        activeChain={appConfig.network} 
        supportedChains={[appConfig.network]} 
        clientId={appConfig.thirdWebClientId}>
        
        <WalletApp />
        
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}

async function switchToNetwork(provider) {
  try {
    const network = await provider.getNetwork();
    console.log("Current network:", network.chainId);

    if (typeof window.ethereum !== 'undefined') {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: appConfig.chainIdHexCode }],
      });

      const updatedNetwork = await provider.getNetwork();
      console.log("Switched to network:", updatedNetwork.chainId);
    } else {
      throw new Error("Ethereum provider not found");
    }
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [appConfig.network],
        });

        const updatedNetwork = await provider.getNetwork();
        console.log("Network added and switched:", updatedNetwork.chainId);
      } catch (addError) {
        console.error("Failed to add the network:", addError);
      }
    } else {
      console.error("Failed to switch the network:", switchError);
    }
  }
}

function WalletApp() {
  const [provider, setProvider] = useState(null); // Track the provider
  const [gasBalance, setGasBalance] = useState(null);
  const [uoaBalance, setUoaBalance] = useState(null);
  const [userNetwork, setUserNetwork] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amountToSend, setAmountToSend] = useState('');
  const [error, setError] = useState(null);
  const address = useAddress();
  const disconnect = useDisconnect();
  const [loading, setLoading] = useState(true);

  // Initialize provider (WalletConnect or MetaMask)
  const initializeProvider = async () => {
    if (typeof window.ethereum !== 'undefined') {
      setProvider(new ethers.providers.Web3Provider(window.ethereum));
    } else {
      try {
        const wcProvider = new WalletConnectProvider({
          rpc: { [appConfig.chainId]: appConfig.network.rpcUrls[0] },
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
        });
        await wcProvider.enable(); // Initiate WalletConnect session
        setProvider(new ethers.providers.Web3Provider(wcProvider));
      } catch (error) {
        console.error("WalletConnect initialization failed:", error);
        setError("Failed to initialize WalletConnect. Please try again.");
      }
    }
  };

  useEffect(() => {
    initializeProvider(); // Initialize the provider when the component mounts

    const handleNetworkSwitchAndFetch = async () => {
      try {
        if (provider && address) {
          setLoading(true);

          // Switch to the correct network before fetching balances
          await switchToNetwork(provider);

          // Fetch balances after successful network switch
          await fetchBalances();
        }
      } catch (err) {
        console.error("Error during network switch or balance fetching:", err);
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    handleNetworkSwitchAndFetch();

    // Reload the app if the chain changes unexpectedly
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

  }, [address, provider]);

  const fetchBalances = async () => {
    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();

      setUserNetwork(network);

      // Ensure we're on the correct network
      if (network.chainId !== parseInt(appConfig.chainIdHexCode, 16)) {
        throw new Error(`Connected to wrong network: ${network.chainId}. Please connect to the ${appConfig.network.name} network.`);
      }

      const balance = await signer.getBalance();
      setGasBalance(ethers.utils.formatEther(balance));

      const uoaContract = new ethers.Contract(appConfig.unitOfAccount.contract, appConfig.unitOfAccount.ABI, signer);
      const uoaBalanceRaw = await uoaContract.balanceOf(address);
      setUoaBalance(ethers.utils.formatUnits(uoaBalanceRaw, appConfig.unitOfAccount.decimals));
    } catch (err) {
      console.error("Error fetching balances:", err);
      setError(`Error fetching balances: ${err.message}`);
    }
  };

  const handleSendTransaction = async () => {
    try {
      setError(null);
      const signer = provider.getSigner();

      const uoaContract = new ethers.Contract(appConfig.unitOfAccount.contract, appConfig.unitOfAccount.ABI, signer);
      const tx = await uoaContract.transfer(recipientAddress, ethers.utils.parseUnits(amountToSend, appConfig.unitOfAccount.decimals));
      await tx.wait();
      await fetchBalances();
      alert("Transaction successful!");
    } catch (err) {
      console.error("Transaction failed:", err);
      setError(`Transaction failed: ${err.message}`);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="content">
          <h1 className="title">Connect Your Wallet</h1>

          <ConnectWallet
            theme="dark"
            btnTitle="Connect Your Wallet"
            modalTitle="Select a Wallet"
          />
          {address && (
            <button className="button is-danger" onClick={disconnect}>
              Disconnect
            </button>
          )}
          {address && (
            <>
              {!loading ? (
                <>
                  <p>Your {userNetwork ? userNetwork.name : 'Network'} Address: {address}</p>
                  <p>{appConfig.network.nativeCurrency.name} Balance: {gasBalance !== null ? `${gasBalance} ${appConfig.network.nativeCurrency.name}` : "Loading..."}</p>
                  <p>{appConfig.unitOfAccount.name} Balance: {uoaBalance !== null ? `${uoaBalance} ${appConfig.unitOfAccount.name}` : "Loading..."}</p>
                </>
              ) : (
                <p>Loading balances...</p>
              )}

              <div>
                <h2>Send {appConfig.unitOfAccount.name}</h2>
                <div className="field">
                  <label className="label">Recipient Address</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      placeholder="Recipient Address"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="label">{`Amount ${appConfig.unitOfAccount.name}`}</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      placeholder={`Amount ${appConfig.unitOfAccount.name}`}
                      value={amountToSend}
                      onChange={(e) => setAmountToSend(e.target.value)}
                    />
                  </div>
                </div>
                <button className="button is-primary" onClick={handleSendTransaction}>
                  Send {appConfig.unitOfAccount.name}
                </button>
              </div>
            </>
          )}

          {error && <p className="has-text-danger">{error}</p>}
        </div>
      </div>
    </section>
  );
}
