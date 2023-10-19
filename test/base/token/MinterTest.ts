import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
import chai from "chai";
import {Deploy} from "../../../scripts/deploy/Deploy";
import {TimeUtils} from "../../TimeUtils";
import {BigNumber, utils} from "ethers";
import {CoreAddresses} from "../../../scripts/deploy/CoreAddresses";
import {XenoPair, Controller, Token} from "../../../typechain";
import {TestHelper} from "../../TestHelper";
import {parseUnits} from "ethers/lib/utils";
import {Misc} from "../../../scripts/Misc";

const {expect} = chai;

describe("minter tests", function () {

  let snapshotBefore: string;
  let snapshot: string;

  let owner: SignerWithAddress;
  let owner2: SignerWithAddress;
  let core: CoreAddresses;
  let weth: Token;
  let ust: Token;
  let mim: Token;
  let dai: Token;
  let pair: XenoPair;
  // let gauge: Gauge;


  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [owner, owner2] = await ethers.getSigners();
    weth = await Deploy.deployContract(owner, 'Token', 'WETH', 'WETH', 18, owner.address) as Token;
    [ust, mim, dai] = await TestHelper.createMockTokensAndMint(owner);
    core = await Deploy.deployCore(
      owner,
      weth.address,
      [weth.address, ust.address, mim.address, dai.address],
      [owner.address, owner2.address],
      [utils.parseUnits('100'), utils.parseUnits('100')],
      utils.parseUnits('200'),
      2
    );

    // ------------- setup gauges and bribes --------------

    pair = await TestHelper.addLiquidity(
      core.factory,
      core.router,
      owner,
      mim.address,
      ust.address,
      parseUnits('1'),
      parseUnits('1', 6),
      true
    );
    await core.voter.createGauge(pair.address);
    // const gaugeMimUstAddress = await core.voter.gauges(pair.address);
    // gauge = Gauge__factory.connect(gaugeMimUstAddress, owner);
    // await TestHelper.depositToGauge(owner, gauge, pair, parseUnits('0.0001'), 0);
    await core.voter.vote(1, [pair.address], [100]);
  });

  after(async function () {
    await TimeUtils.rollback(snapshotBefore);
  });


  beforeEach(async function () {
    snapshot = await TimeUtils.snapshot();
  });

  afterEach(async function () {
    await TimeUtils.rollback(snapshot);
  });

  it("circulating_supply test", async function () {
    expect(await core.minter.circulatingSupply()).is.not.eq(BigNumber.from('0'));
  });

  it("calculate_emission test", async function () {
    expect(await core.minter.calculateEmission()).is.eq(BigNumber.from('1904761904761904761904761'));
  });

  it("weekly_emission test", async function () {
    expect(await core.minter.weeklyEmission()).is.eq(BigNumber.from('1904761904761904761904761'));
  });

  it("circulating_emission test", async function () {
    expect(await core.minter.circulatingEmission()).is.not.eq(BigNumber.from('0'));
  });

  it("double init reject", async function () {
    await expect(core.minter.initialize([], [], 0, 1)).revertedWith("Not initializer")
  });

  it("wrong total amount test", async function () {
    const controller = await Deploy.deployContract(owner, 'Controller') as Controller;
    const gaugesFactory = await Deploy.deployGaugeFactory(owner);
    const bribesFactory = await Deploy.deployBribeFactory(owner);
    const baseFactory = await Deploy.deployXenoFactory(owner, owner.address);
    const token = await Deploy.deployContract(owner, 'Token', 'VE', 'VE', 18, owner.address) as Token;
    const ve = await Deploy.deployVe(owner, token.address, controller.address);
    const veDist = await Deploy.deployVeDist(owner, ve.address);
    const voter = await Deploy.deployXenoVoter(owner, ve.address, baseFactory.address, gaugesFactory.address, bribesFactory.address);
    await controller.setVeDist(veDist.address)
    await controller.setVoter(voter.address)
    const minter = await Deploy.deployXenoMinter(owner, ve.address, controller.address);
    console.log((await minter.activePeriod()).toString());
    await expect(minter.initialize([owner.address], [1], 2, 1)).revertedWith('Wrong totalAmount')
  });


  it("reach weekly threshold", async function () {
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 7 * 2)
    while (true) {
      await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 7)
      await core.minter.updatePeriod();
      const c = await core.minter.initialStubCirculation();
      const circulatingEmission = await core.minter.circulatingEmission();
      console.log(c.toString(), circulatingEmission.toString());
      if (c.lte(circulatingEmission)) {
        break;
      }
    }
  });

  it("don't mint token if enough", async function () {
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 7 * 2)
    const minter = await Misc.impersonate(core.minter.address);
    await core.token.connect(minter).mint(core.minter.address, parseUnits('9999999999'));
    const supply = await core.token.totalSupply()
    await core.minter.updatePeriod();
    expect(await core.token.totalSupply()).eq(supply);
  });

});
