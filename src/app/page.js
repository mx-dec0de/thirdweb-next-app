function WalletApp() {
  const [gasBalance, setGasBalance] = useState(null);
  const [uoaBalance, setUoaBalance] = useState(null);
  const [userNetwork, setUserNetwork] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amountToSend, setAmountToSend] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networkPrompt, setNetworkPrompt] = useState(false);
  const address = useAddress();
  const disconnect = useDisconnect();

  useEffect(() => {
    const handleNetworkSwitchAndFetch = async () => {
      let provider;
      let signer;

      if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
      }

      if (!provider || !signer) {
        setError("Ethereum provider not found. Please connect your wallet.");
        return;
      }

      try {
        if (address) {
          setLoading(true);

          // Check if the user is on the wrong network
          const network = await provider.getNetwork();
          if (network.chainId !== parseInt(appConfig.network.chainIdHexCode, 16)) {
            setNetworkPrompt(true);  // Show network switch prompt to the user
            setLoading(false);        // Stop loading while waiting for user action
            return;
          }

          await fetchBalances(signer); // Fetch balances using signer
        }
      } catch (err) {
        console.error("Error during network switch or balance fetching:", err);
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    handleNetworkSwitchAndFetch();
  }, [address]);

  const fetchBalances = async (signer) => {
    try {
      const provider = signer.provider;
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

          {networkPrompt && (
            <div className="notification is-warning">
              <p>Please switch your network to {appConfig.network.chainName} in your wallet settings.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
