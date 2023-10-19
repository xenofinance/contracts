import { Deploy } from "../Deploy";
import { ethers } from "hardhat";
import { Verify } from "../../Verify";
import { Misc } from "../../Misc";
import { writeFileSync } from "fs";
import { SepoliaAddresses } from "../../addresses/SepoliaAddresses";

async function main() {
  const signer = (await ethers.getSigners())[0];

  const core = await Deploy.deployDex(signer, SepoliaAddresses.WETH_TOKEN);

  const data =
    "" +
    "factory: " +
    core[0].address +
    "\n" +
    "router: " +
    core[1].address +
    "\n";

  console.log(data);
  writeFileSync("dex.txt", data);

  await Misc.wait(5);

  await Verify.verifyWithArgs(core[0].address, [signer.address]);
  await Verify.verifyWithArgs(core[1].address, [
    core[0].address,
    SepoliaAddresses.WETH_TOKEN,
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
