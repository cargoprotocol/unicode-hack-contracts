import "dotenv/config";
import {ethers} from "ethers";
import hre from "hardhat";

import {IAggregatorVault} from "../typechain//IAggregatorVault";
import {IAggregatorVaultFactory} from "../typechain/IAggregatorVaultFactory";
import {IERC20} from "../typechain/IERC20";
import {RebalancerName, VisorVaults, Tokens} from "../utils";

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getProvider = (): ethers.providers.Provider => {
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

const getContracts = async (signer: ethers.Signer): Promise<[ethers.Contract, ethers.Contract]> => {
  let aggregatorVaultAddress: string;
  let hhAggregatorVaultFactory;

  if (process.env.NODE_ENV == "development") {
    const AggregatorVaultFactory = await hre.ethers.getContractFactory("AggregatorVaultFactory", signer);
    hhAggregatorVaultFactory = await AggregatorVaultFactory.deploy();
    let tx = await hhAggregatorVaultFactory.createAggregatorVault(
      RebalancerName.VISOR,
      VisorVaults.ETH_USDT,
      Tokens.WETH,
      Tokens.USDT
    );
    tx = await tx.wait();

    aggregatorVaultAddress = tx.events[0].args.rebalancer;
  } else {
    if (process.env.AGGREGATOR_VAULT_ADDRESS === undefined) throw "You must set contract address";
    aggregatorVaultAddress = process.env.AGGREGATOR_VAULT_ADDRESS;
  }

  const aggregatorVault = await hre.ethers.getContractAt("AggregatorVault", aggregatorVaultAddress);
  hhAggregatorVaultFactory = await hre.ethers.getContractAt("AggregatorVaultFactory", await aggregatorVault.factory());
};

const getBestRebalancer = async (): Promise<Object> => {
  const defaultRebalancer = RebalancerName.VISOR;
  const quotes = [] as Object[];
  // visor
  const url: string = "https://api.flipsidecrypto.com/api/v2/queries/c780d56e-9a24-42d2-a87b-54d46a58b762/data/latest";
  try {
    const response = await fetch(url);
    const data = await response.json();
    const quote = {rebalancer: RebalancerName.VISOR, quote: data[0]["VIRTUAL_LIQUIDITY_ADJUSTED"]};
    quotes.push(quote);
  } catch (e) {
    process.stderr.write(`ERROR received from ${url}: ${e}\n`);
  }

  // charm
  // TODO: add charm request

  const bestQuote: Promise<Object> = new Promise(() => {
    quotes.reduce((op, item) => (op = op > item.quote ? op : item), defaultRebalancer);
  });
  return bestQuote;
};

const main = async () => {
  const provider = getProvider();
  const accounts = await hre.ethers.getSigners();
  const [aggregatorVault] = (await getContracts(accounts[0])) as [IAggregatorVault, IAggregatorVaultFactory];
  console.log("All contracts have been initialized!\n");
  const weth = (await hre.ethers.getContractAt("IERC20", Tokens.WETH)) as IERC20;
  const usdt = (await hre.ethers.getContractAt("IERC20", Tokens.USDT)) as IERC20;
  console.log("ETH and USDT are created\n");
  const depositAmounts = [
    [ethers.BigNumber.from("1"), ethers.BigNumber.from("4000")], // 1 WETH, 4000 USDT
    [ethers.BigNumber.from("10"), ethers.BigNumber.from("40000")], // 10 WETH, 40000 USDT
  ];
  console.log("Getting quote from best rebalancer...");
  const quote = await getBestRebalancer();
  console.log(`Best quote of ${quote.quote} is from ${quote.rebalancer}`);
  console.log(`Depositing user funds to ${quote.rebalancer}...\n`);
  const users = accounts.slice(1, 3);
  const users_liquidity = [] as BigUint64Array[];
  for (let i = 0; i < users.length; i++) {
    console.log(`User ${users[i].address}`);
    await users[i].sendTransaction({to: Tokens.WETH, value: depositAmounts[i]});
    console.log(`Current ETH: ${depositAmounts[i][0]}`);
    await users[i].sendTransaction({to: Tokens.USDT, value: depositAmounts[i][1]});
    console.log(`Current USDT: ${depositAmounts[i][1]}\n`);
    await weth.connect(users[i]).approve(aggregatorVault.address, depositAmounts[i][0]);
    await usdt.connect(users[i]).approve(aggregatorVault.address, depositAmounts[i][1]);
    var liquidity = await aggregatorVault
      .connect(users[i])
      .deposit(ethers.BigNumber.from(0), depositAmounts[i][0], depositAmounts[i][1]);
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
    const amounts = await aggregatorVault.connect(users[i]).withdraw(users_liquidity[i], users[i]);

    console.log(`Current ETH: ${amounts[0]}`);
    console.log(`Current USDT: ${amounts[1]}`);
  }
};

main().then(() => {});
