import { Deploy } from "../Deploy";
import { ethers } from "hardhat";
import { Verify } from "../../Verify";
import { Misc } from "../../Misc";

const ROUTER = "0x535A7cb953bD8c1A4f896B3F24F0967266233B76";

async function main() {
  const signer = (await ethers.getSigners())[0];
  const contract = await Deploy.deployContract(signer, "SwapLibrary", ROUTER);

  await Misc.wait(5);
  await Verify.verifyWithArgs(contract.address, [ROUTER]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
