import "dotenv/config";
import {ethers, BigNumber, BigNumberish} from "ethers";
import hre from "hardhat";
import {RebalancerName, VisorVaults, Tokens} from "../utils";

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getProvider = () => {
  let provider: ethers.providers.Provider;
  if (process.env.PROVIDER === undefined) throw "PROVIDER is undefined";

  if (process.env.PROVIDER_TYPE == "ipc") {
    provider = new ethers.providers.IpcProvider(process.env.PROVIDER);
  } else if (process.env.PROVIDER_TYPE == "http") {
    provider = new ethers.providers.JsonRpcProvider(process.env.PROVIDER);
  } else {
    throw `Unrecognized PROVIDER_TYPE == ${process.env.PROVIDER_TYPE}`;
  }

  return provider;
};

const getContracts = async (signer: ethers.Signer) => {
  if (process.env.NODE_ENV == "development") {
    const AggregatorVaultFactory = await hre.ethers.getContractFactory("AggregatorVaultFactory", signer);
    const aggregatorVaultFactory = await AggregatorVaultFactory.deploy();
    await aggregatorVaultFactory.deployed();
    const tx = await aggregatorVaultFactory.createAggregatorVault(
      RebalancerName.VISOR,
      VisorVaults.ETH_USDT,
      Tokens.WETH,
      Tokens.USDT
    );
    const receipt = await tx.wait();
    const aggregatorVaultAddress = receipt.events?.[0]?.args?.[0];
    const aggregatorVault = await hre.ethers.getContractAt("AggregatorVault", aggregatorVaultAddress);
    return {aggregatorVault, aggregatorVaultFactory};
  } else {
    if (process.env.AGGREGATOR_VAULT_FACTORY_ADDRESS === undefined) throw "You must set contract address";
    const hhAggregatorVaultFactory = await hre.ethers.getContractAt(
      "AggregatorVaultFactory",
      process.env.AGGREGATOR_VAULT_FACTORY_ADDRESS
    );
    if (process.env.AGGREGATOR_VAULT_ADDRESS === undefined) throw "You must set contract address";
    const aggregatorVaultAddress = process.env.AGGREGATOR_VAULT_ADDRESS;
    const aggregatorVault = await hre.ethers.getContractAt("AggregatorVault", aggregatorVaultAddress);
    return {aggregatorVault, hhAggregatorVaultFactory};
  }
};

const getBestRebalancer = async () => {
  let bestRebalancer = RebalancerName.VISOR;
  let bestQuote = 0;
  // visor
  const url: string = "https://api.flipsidecrypto.com/api/v2/queries/c780d56e-9a24-42d2-a87b-54d46a58b762/data/latest";
  try {
    const response = await fetch(url);
    const data = await response.json();
    const quote = data[0]["VIRTUAL_LIQUIDITY_ADJUSTED"];
    if (BigNumber.from(quote).gt(BigNumber.from(bestQuote))) {
      bestRebalancer = RebalancerName.VISOR;
    }
  } catch (e) {
    process.stderr.write(`ERROR received from ${url}: ${e}\n`);
  }

  // charm
  // TODO: add charm request

  return {rebalancer: bestRebalancer, quote: bestQuote};
};

const main = async () => {
  const provider = getProvider();
  const accounts = await hre.ethers.getSigners();
  const {aggregatorVault} = await getContracts(accounts[0]);
  console.log("All contracts have been initialized!\n");
  const weth = await hre.ethers.getContractAt("IERC20", Tokens.WETH);
  const usdt = await hre.ethers.getContractAt("IERC20", Tokens.USDT);
  console.log("ETH and USDT are created\n");
  const depositAmounts = [
    [ethers.BigNumber.from("1"), ethers.BigNumber.from("4000")], // 1 WETH, 4000 USDT
    [ethers.BigNumber.from("10"), ethers.BigNumber.from("40000")], // 10 WETH, 40000 USDT
  ];
  console.log("Getting quote from best rebalancer...");
  const {rebalancer, quote} = await getBestRebalancer();
  console.log(`Best quote of ${quote} is from ${rebalancer}`);
  console.log(`Depositing user funds to ${rebalancer}...\n`);
  const users = accounts.slice(1, 3);
  const users_liquidity = [] as BigNumberish[];
  for (let i = 0; i < users.length; i++) {
    console.log(`User ${users[i].address}`);
    await users[i].sendTransaction({to: Tokens.WETH, value: depositAmounts[i][0]});
    console.log(`Current ETH: ${depositAmounts[i][0]}`);
    await users[i].sendTransaction({to: Tokens.USDT, value: depositAmounts[i][1]});
    console.log(`Current USDT: ${depositAmounts[i][1]}\n`);
    await weth.connect(users[i]).approve(aggregatorVault.address, depositAmounts[i][0]);
    await usdt.connect(users[i]).approve(aggregatorVault.address, depositAmounts[i][1]);
    const tx = await aggregatorVault.connect(users[i]).deposit(depositAmounts[i][0], depositAmounts[i][1]);
    const receipt = await tx.wait();
    const liquidity = receipt.events?.[0]?.args?.[0];
    users_liquidity.push(liquidity);
  }
  console.log("Simulate LP staking...\n");
  await delay(10000);
  console.log("Waited 10s\n");
  console.log("Withdraw user funds in Rebalancer...");
  for (let i = 0; i < users.length; i++) {
    console.log(`User ${users[i].address}`);
    await users[i].sendTransaction({to: Tokens.WETH, value: depositAmounts[i][0]});
    await users[i].sendTransaction({to: Tokens.USDT, value: depositAmounts[i][1]});
    await weth.connect(users[i]).approve(aggregatorVault.address, depositAmounts[i][0]);
    await usdt.connect(users[i]).approve(aggregatorVault.address, depositAmounts[i][1]);
    const tx = await aggregatorVault.connect(users[i]).withdraw(users_liquidity[i], users[i].address);
    const receipt = await tx.wait();

    console.log(`Current ETH: ${receipt.events?.[0]?.args?.[0]}`);
    console.log(`Current USDT: ${receipt.events?.[0]?.args?.[1]}`);
  }
};

main().then(() => {});
