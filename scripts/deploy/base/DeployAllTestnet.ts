import { Deploy } from "../Deploy";
import { ethers } from "hardhat";
import { Verify } from "../../Verify";
import { Misc } from "../../Misc";
import { BigNumber } from "ethers";
import { writeFileSync } from "fs";
import { parseUnits } from "ethers/lib/utils";
import { SepoliaAddresses } from "../../addresses/SepoliaAddresses";

const voterTokens = [
  SepoliaAddresses.WETH_TOKEN,
  SepoliaAddresses.USDC_TOKEN,
  SepoliaAddresses.DAI_TOKEN,
  SepoliaAddresses.USDT_TOKEN,
];

const claimants = [
  "0xaDA73B0a3aD7d385Eed446B59BD3b62af9048C2B",
  "0xaDA73B0a3aD7d385Eed446B59BD3b62af9048C2B",
  "0xaDA73B0a3aD7d385Eed446B59BD3b62af9048C2B",
  "0xaDA73B0a3aD7d385Eed446B59BD3b62af9048C2B",
  "0xaDA73B0a3aD7d385Eed446B59BD3b62af9048C2B",
];

const claimantsAmounts = [
  parseUnits("10887500"),
  parseUnits("500000"),
  parseUnits("500000"),
  parseUnits("500000"),
  parseUnits("500000"),
];
async function main() {
  const signer = (await ethers.getSigners())[0];

  let minterMax = BigNumber.from("0");

  for (const c of claimantsAmounts) {
    minterMax = minterMax.add(c);
  }

  const core = await Deploy.deployCore(
    signer,
    SepoliaAddresses.WETH_TOKEN,
    voterTokens,
    claimants,
    claimantsAmounts,
    minterMax,
    0
  );

  const data =
    "" +
    "token: " +
    core.token.address +
    "\n" +
    "gaugesFactory: " +
    core.gaugesFactory.address +
    "\n" +
    "bribesFactory: " +
    core.bribesFactory.address +
    "\n" +
    "factory: " +
    core.factory.address +
    "\n" +
    "router: " +
    core.router.address +
    "\n" +
    "ve: " +
    core.ve.address +
    "\n" +
    "veDist: " +
    core.veDist.address +
    "\n" +
    "voter: " +
    core.voter.address +
    "\n" +
    "minter: " +
    core.minter.address +
    "\n" +
    "controller: " +
    core.controller.address +
    "\n";

  console.log(data);
  writeFileSync("core_testnet_sepolia_def.txt", data);

  await Misc.wait(5);

  await Verify.verify(core.token.address);
  await Verify.verify(core.gaugesFactory.address);
  await Verify.verify(core.bribesFactory.address);
  await Verify.verifyWithArgs(core.factory.address, [
    "0x49956Eddb58E1Ae7b9aCfAC97d43dec6911AC6e5",
  ]);
  await Verify.verifyWithArgs(core.router.address, [
    core.factory.address,
    SepoliaAddresses.WETH_TOKEN,
  ]);
  await Verify.verifyWithArgs(core.ve.address, [
    core.token.address,
    core.controller.address,
  ]);
  await Verify.verifyWithArgs(core.veDist.address, [core.ve.address]);
  await Verify.verifyWithArgs(core.voter.address, [
    core.ve.address,
    core.factory.address,
    core.gaugesFactory.address,
    core.bribesFactory.address,
  ]);
  await Verify.verifyWithArgs(core.minter.address, [
    core.ve.address,
    core.controller.address,
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
