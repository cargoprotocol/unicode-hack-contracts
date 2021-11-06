import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "dotenv/config";
import "hardhat-contract-sizer";
import "hardhat-deploy";
import "solidity-coverage";

import {constants} from "ethers";
import {CHAIN_IDS} from "./utils";

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || constants.HashZero.slice(2);
const INFURA_KEY = process.env.INFURA_KEY || "";

module.exports = {
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    hardhat: {
      chainId: CHAIN_IDS.hardhat,
      allowUnlimitedContractSize: true,
    },
    kovan: {
      chainId: CHAIN_IDS.kovan,
      url: `https://kovan.infura.io/v3/${INFURA_KEY}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      saveDeployments: true,
    },
    rinkeby: {
      chainId: CHAIN_IDS.rinkeby,
      url: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
      saveDeployments: true,
    },
  },
  solidity: {
    version: "0.8.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {yul: true},
      },
    },
  },
  paths: {
    deploy: "deployments/migrations",
    deployments: "deployments/artifacts",
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
};
