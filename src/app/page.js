'use client';

import React, { useState, useEffect } from 'react';
import { ThirdwebProvider, ConnectWallet, useAddress, useDisconnect } from "@thirdweb-dev/react";
import { QueryClient, QueryClientProvider } from 'react-query';
import { ethers } from 'ethers';
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

async function switchToNetwork(provider, setNetworkData) {
  try {
    const network = await provider.getNetwork();
    console.log("Current network:", network.chainId);

    if (typeof window.ethereum !== 'undefined') {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: appConfig.chainIdHexCode }],
      });

      const updatedNetwork = await provider.getNetwork();
      setNetworkData(updatedNetwork); // Store the full network data in state
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
        setNetworkData(updatedNetwork); // Store the full network data in state
      } catch (addError) {
        console.error("Failed to add the network:", addError);
      }
    } else {
      console.error("Failed to switch the network:", switchError);
    }
  }
}

function WalletApp() {
  const [gasBalance, setGasBalance] = useState(null);
  const [uoaBalance, setUoaBalance] = useState(null);
  const [userNetwork, setUserNetwork] = useState(null);
  const [networkData, setNetworkData] = useState(null); // State to store network data
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amountToSend, setAmountToSend] = useState('');
  const [error, setError] = useState(null);
  const address = useAddress();
  const disconnect = useDisconnect();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleNetworkSwitchAndFetch = async () => {
      let provider;

      if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      } else {
        try {
          provider = await getWalletConnectProvider();
          if (!provider) {
            setError("No provider found. Please connect your wallet.");
            return;
          }
        } catch (err) {
          setError("Failed to initialize WalletConnect. Please try again.");
          return;
        }
      }

      if (provider) {
        try {
          if (address) {
            setLoading(true);
            await switchToNetwork(provider, setNetworkData); // Pass setNetworkData to update networkData state
            await fetchBalances(provider);   // Fetch balances using the provider
          }
        } catch (err) {
          console.error("Error during network switch or balance fetching:", err);
          setError(`Error: ${err.message}`);
        } finally {
          setLoading(false);
        }
      }
    };

    handleNetworkSwitchAndFetch();

    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

  }, [address]);

  const fetchBalances = async (provider) => {
    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();

      setUserNetwork(network);

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

  const getWalletConnectProvider = async () => {
    try {
      const WalletConnectProvider = (await import('@walletconnect/web3-provider')).default;
      const provider = new WalletConnectProvider({
        rpc: { [appConfig.chainId]: appConfig.network.rpcUrls[0] },
      });
      await provider.enable();  // Trigger WalletConnect
      return new ethers.providers.Web3Provider(provider);
    } catch (error) {
      console.error("WalletConnect initialization failed:", error);
      return null;
    }
  };

  const handleSendTransaction = async () => {
    try {
      setError(null);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const uoaContract = new ethers.Contract(appConfig.unitOfAccount.contract, appConfig.unitOfAccount.ABI, signer);
      const tx = await uoaContract.transfer(recipientAddress, ethers.utils.parseUnits(amountToSend, appConfig.unitOfAccount.decimals));
      await tx.wait();
      await fetchBalances(provider);
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
                  <div>
                    <h3>Network Data:</h3>
                    {networkData ? (
                      <ul>
                        <li>Chain ID: {networkData.chainId}</li>
                        <li>Network Name: {networkData.name}</li>
                        <li>Block Height: {networkData._defaultProvider ? networkData._defaultProvider.blockHeight : 'N/A'}</li>
                      </ul>
                    ) : (
                      <p>No network data available.</p>
                    )}
                  </div>
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
