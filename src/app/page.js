'use client';

import React, { useState, useEffect } from 'react';
import { ThirdwebProvider, ConnectWallet, useAddress, useDisconnect } from "@thirdweb-dev/react";
import { QueryClient, QueryClientProvider } from 'react-query';
import { ethers } from 'ethers';
import { appConfig } from '../config';
import DialogComponent from '../DialogComponent';

const queryClient = new QueryClient();

export default function HomePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider 
        activeChain={appConfig.network} 
        supportedChains={[appConfig.network]} 
        clientId={appConfig.thirdWebClientId}>
        
        <WalletApp />
        <DialogComponent /> 

      </ThirdwebProvider>
    </QueryClientProvider>
  ); 
}

async function switchToNetwork(provider) {
  try {
    if (provider) {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: appConfig.chainIdHexCode }
      ]);
      console.log("Switched to " + appConfig.network.chainName);
    } else {
      throw new Error("Ethereum provider not found");
    }
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await provider.send('wallet_addEthereumChain', [appConfig.network]);
        console.log(appConfig.network.chainName + " added and switched");
      } catch (addError) {
        console.error("Failed to add the network", addError);
      }
    } else {
      console.error("Failed to switch the network", switchError);
    }
  }
}

function WalletApp() {
  const [gasBalance, setGasBalance] = useState(null);
  const [uoaBalance, setUoaBalance] = useState(null);
  const [userNetwork, setUserNetwork] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amountToSend, setAmountToSend] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const address = useAddress();
  const disconnect = useDisconnect();

  useEffect(() => {
    const handleNetworkSwitchAndFetch = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
      try {
        if (address && provider) {
          setLoading(true);
          await switchToNetwork(provider); // Ensure network is correct
          await fetchBalances(provider); // Fetch balances
        } else {
          setError("Ethereum provider not found. Please connect your wallet.");
        }
      } catch (err) {
        console.error("Error during network switch or balance fetching:", err);
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
        alert(appConfig.envCheck);
      }
    };

    if (window.ethereum) {
      handleNetworkSwitchAndFetch();
    } else {
      // Handle missing provider on mobile, e.g., Safari
      setError("Ethereum provider is not available. Please open MetaMask or another wallet.");
    }
  }, [address]);

  const fetchBalances = async (provider) => {
    try {
      const signer = provider.getSigner();
      const network = await provider.getNetwork();

      setUserNetwork(network);

      if (network.chainId !== appConfig.network.chainId) {
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
      const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
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
            <>
              <button className="button is-danger" onClick={disconnect}>
                Disconnect
              </button>

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
