/* tslint:disable:variable-name no-shadowed-variable ban-types no-var-requires no-any */
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { network } from "hardhat";
import {Controller, Xeno, XenoMinter, Token, Ve, VeDist } from "../../typechain";
import {Deploy} from "../../scripts/deploy/Deploy";

const { expect } = require("chai");
const { ethers } = require("hardhat");

// function getCreate2Address(
//   factoryAddress,
//   [tokenA, tokenB],
//   bytecode
// ) {
//   const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
//   const create2Inputs = [
//     '0xff',
//     factoryAddress,
//     keccak256(solidityPack(['address', 'address'], [token0, token1])),
//     keccak256(bytecode)
//   ]
//   const sanitizedInputs = `0x${create2Inputs.map(i => i.slice(2)).join('')}`
//   return getAddress(`0x${keccak256(sanitizedInputs).slice(-40)}`)
// }

describe("minter old tests", function () {

  let token;
  let ve_underlying:Xeno;
  let ve:Ve;
  let owner:SignerWithAddress;
  let minter:XenoMinter;
  let ve_dist:VeDist;

  it("deploy base", async function () {
    [owner] = await ethers.getSigners(0);
    token = await ethers.getContractFactory("Token");
    const Xeno = await ethers.getContractFactory("Xeno");
    const controllerCtr = await ethers.getContractFactory("Controller");
    const controller = await controllerCtr.deploy() as Controller;
    const mim = await token.deploy('MIM', 'MIM', 18, owner.address);
    await mim.mint(owner.address, ethers.BigNumber.from("1000000000000000000000000000000"));
    ve_underlying = await Xeno.deploy();
    ve = await Deploy.deployVe(owner, ve_underlying.address, controller.address)
    await ve_underlying.mint(owner.address, ethers.BigNumber.from("10000000000000000000000000"));
    const XenoFactory = await ethers.getContractFactory("XenoFactory");
    const factory = await XenoFactory.deploy();
    await factory.deployed();
    const XenoRouter01 = await ethers.getContractFactory("XenoRouter01");
    const router = await XenoRouter01.deploy(factory.address, owner.address);
    await router.deployed();
    const GaugeFactory = await ethers.getContractFactory("GaugeFactory");
    const gauges_factory = await GaugeFactory.deploy();
    await gauges_factory.deployed();
    const BribeFactory = await ethers.getContractFactory("BribeFactory");
    const bribe_factory = await BribeFactory.deploy();
    await bribe_factory.deployed();
    const XenoVoter = await ethers.getContractFactory("XenoVoter");
    const voter = await XenoVoter.deploy(ve.address, factory.address, gauges_factory.address, bribe_factory.address);
    await voter.deployed();

    await voter.initialize([mim.address, ve_underlying.address],owner.address);
    await ve_underlying.approve(ve.address, ethers.BigNumber.from("1000000000000000000"));
    await ve.createLock(ethers.BigNumber.from("1000000000000000000"), 4 * 365 * 86400);
    const VeDist = await ethers.getContractFactory("VeDist");
    ve_dist = await VeDist.deploy(ve.address);
    await ve_dist.deployed();

    await controller.setVeDist(ve_dist.address)
    await controller.setVoter(voter.address)

    const Minter = await ethers.getContractFactory("XenoMinter");
    minter = await Minter.deploy(ve.address, controller.address);
    await minter.deployed();
    await ve_dist.setDepositor(minter.address);
    await ve_underlying.setMinter(minter.address);

    const mim_1 = ethers.BigNumber.from("1000000000000000000");
    const ve_underlying_1 = ethers.BigNumber.from("1000000000000000000");
    await ve_underlying.approve(router.address, ve_underlying_1);
    await mim.approve(router.address, mim_1);
    await router.addLiquidity(mim.address, ve_underlying.address, false, mim_1, ve_underlying_1, 0, 0, owner.address, Date.now());

    const pair = await router.pairFor(mim.address, ve_underlying.address, false);

    await ve_underlying.approve(voter.address, ethers.BigNumber.from("500000000000000000000000"));
    await voter.createGauge(pair);
    expect(await ve.balanceOfNFT(1)).to.above(ethers.BigNumber.from("995063075414519385"));
    expect(await ve_underlying.balanceOf(ve.address)).to.be.equal(ethers.BigNumber.from("1000000000000000000"));

    await voter.vote(1, [pair], [5000]);
  });

  it("initialize veNFT", async function () {
    await minter.initialize([owner.address],[ethers.BigNumber.from("1000000000000000000000000")], ethers.BigNumber.from("1000000000000000000000000"), 2)
    expect(await ve.ownerOf(2)).to.equal(owner.address);
    expect(await ve.ownerOf(3)).to.equal("0x0000000000000000000000000000000000000000");
    await network.provider.send("evm_mine")
    expect(await ve_underlying.balanceOf(minter.address)).to.equal(ethers.BigNumber.from("0"));
  });

  it("minter weekly distribute", async function () {
    await minter.updatePeriod();
    expect(await minter.baseWeeklyEmission()).to.equal(ethers.BigNumber.from("20000000000000000000000000"));
    await network.provider.send("evm_increaseTime", [86400 * 7])
    await network.provider.send("evm_mine")
    await minter.updatePeriod();
    expect(await ve_dist.claimable(1)).to.equal(0);
    expect(await minter.baseWeeklyEmission()).to.equal(ethers.BigNumber.from("20000000000000000000000000"));
    await network.provider.send("evm_increaseTime", [86400 * 7])
    await network.provider.send("evm_mine")
    await minter.updatePeriod();
    const claimable = await ve_dist.claimable(1);
    console.log(claimable)
    expect(claimable).to.be.above(ethers.BigNumber.from("46017464891488080"));
    const before = await ve.balanceOfNFT(1);
    await ve_dist.claim(1);
    const after = await ve.balanceOfNFT(1);
    console.log(before,after)
    expect(await ve_dist.claimable(1)).to.equal(0);

    const weekly = await minter.baseWeeklyEmission();
    console.log(weekly);
    console.log(await minter.calculateGrowth(weekly));
    console.log(await ve_underlying.totalSupply());
    console.log(await ve.totalSupply());

    await network.provider.send("evm_increaseTime", [86400 * 7])
    await network.provider.send("evm_mine")
    await minter.updatePeriod();
    console.log(await ve_dist.claimable(1));
    await ve_dist.claim(1);
    await network.provider.send("evm_increaseTime", [86400 * 7])
    await network.provider.send("evm_mine")
    await minter.updatePeriod();
    console.log(await ve_dist.claimable(1));
    await ve_dist.claimMany([1]);
    await network.provider.send("evm_increaseTime", [86400 * 7])
    await network.provider.send("evm_mine")
    await minter.updatePeriod();
    console.log(await ve_dist.claimable(1));
    await ve_dist.claim(1);
    await network.provider.send("evm_increaseTime", [86400 * 7])
    await network.provider.send("evm_mine")
    await minter.updatePeriod();
    console.log(await ve_dist.claimable(1));
    await ve_dist.claimMany([1]);
    await network.provider.send("evm_increaseTime", [86400 * 7])
    await network.provider.send("evm_mine")
    await minter.updatePeriod();
    console.log(await ve_dist.claimable(1));
    await ve_dist.claim(1);
  });

});
