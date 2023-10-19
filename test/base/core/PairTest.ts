import {
  ContractTestHelper,
  XenoFactory,
  XenoPair,
  XenoRouter01,
  IERC20__factory,
  Token
} from "../../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ethers} from "hardhat";
import chai from "chai";
import {Deploy} from "../../../scripts/deploy/Deploy";
import {TimeUtils} from "../../TimeUtils";
import {TestHelper} from "../../TestHelper";
import {BigNumber, utils} from "ethers";
import {formatUnits, parseUnits} from "ethers/lib/utils";
import {Misc} from "../../../scripts/Misc";

const {expect} = chai;

describe("pair tests", function () {

  let snapshotBefore: string;
  let snapshot: string;

  let owner: SignerWithAddress;
  let owner2: SignerWithAddress;
  let owner3: SignerWithAddress;
  let factory: XenoFactory;
  let router: XenoRouter01;
  let testHelper: ContractTestHelper;

  let ust: Token;
  let mim: Token;
  let dai: Token;
  let weth: Token;

  let pair: XenoPair;
  let pair2: XenoPair;


  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [owner, owner2, owner3] = await ethers.getSigners();
    weth = await Deploy.deployContract(owner, 'Token', 'WETH', 'WETH', 18, owner.address) as Token;
    await weth.mint(owner.address, parseUnits('10000'))
    factory = await Deploy.deployXenoFactory(owner, owner.address);
    router = await Deploy.deployXenoRouter01(owner, factory.address, weth.address);

    [ust, mim, dai] = await TestHelper.createMockTokensAndMint(owner);
    await ust.transfer(owner2.address, utils.parseUnits('10000000000', 6));
    await mim.transfer(owner2.address, utils.parseUnits('10000000000'));
    await dai.transfer(owner2.address, utils.parseUnits('10000000000'));

    pair = await TestHelper.addLiquidity(
      factory,
      router,
      owner,
      mim.address,
      ust.address,
      utils.parseUnits('1'),
      utils.parseUnits('1', 6),
      true
    );
    pair2 = await TestHelper.addLiquidity(
      factory,
      router,
      owner,
      mim.address,
      weth.address,
      utils.parseUnits('1'),
      utils.parseUnits('1'),
      true
    );
    testHelper = await Deploy.deployContract(owner, 'ContractTestHelper') as ContractTestHelper;
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

  it("observationLength test", async function () {
    expect(await pair.observationLength()).is.eq(1);
  });

  it("currentCumulativePrices test", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await router.swapExactTokensForTokens(parseUnits('0.01'), BigNumber.from(0), [{
      from: mim.address,
      to: ust.address,
      stable: true,
    }], owner.address, 9999999999);
    expect((await pair.currentCumulativePrices())[0]).is.not.eq(0);
    await pair.sync();
    expect((await pair.currentCumulativePrices())[0]).is.not.eq(0);
  });

  it("current twap price test", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await router.swapExactTokensForTokens(parseUnits('0.01'), BigNumber.from(0), [{
      from: mim.address,
      to: ust.address,
      stable: true,
    }], owner.address, 9999999999);
    expect(await pair.current(mim.address, parseUnits('1'))).is.eq(BigNumber.from(753733));
    await pair.sync();
    expect(await pair.current(mim.address, parseUnits('1'))).is.above(BigNumber.from(752800));
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24);
    await testHelper.pairCurrentTwice(pair.address, mim.address, parseUnits('1'));
  });

  it("current twap price test with quote", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await router.swapExactTokensForTokens(parseUnits('0.01'), BigNumber.from(0), [{
      from: mim.address,
      to: ust.address,
      stable: true,
    }], owner.address, 9999999999);
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24);
    await router.swapExactTokensForTokens(parseUnits('0.01'), BigNumber.from(0), [{
      from: mim.address,
      to: ust.address,
      stable: true,
    }], owner.address, 9999999999);
    expect(await pair.quote(mim.address, parseUnits('1'), 1)).is.eq(BigNumber.from(747254));
  });

  it("current twap price test with points", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await router.swapExactTokensForTokens(parseUnits('0.01'), BigNumber.from(0), [{
      from: mim.address,
      to: ust.address,
      stable: true,
    }], owner.address, 9999999999);
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24);
    await router.swapExactTokensForTokens(parseUnits('0.01'), BigNumber.from(0), [{
      from: mim.address,
      to: ust.address,
      stable: true,
    }], owner.address, 9999999999);
    expect((await pair.prices(mim.address, parseUnits('1'), 1))[0]).is.eq(BigNumber.from(747254));
  });

  it("burn test", async function () {
    await pair.approve(router.address, parseUnits('10000'));
    await router.removeLiquidity(
      mim.address,
      ust.address,
      true,
      await pair.balanceOf(owner.address),
      0,
      0,
      owner.address,
      999999999999
    );
    expect(await pair.balanceOf(owner.address)).is.eq(0);
  });

  it("skim test", async function () {
    const balA = await mim.balanceOf(pair.address);
    const balB = await ust.balanceOf(pair.address);
    await mim.transfer(pair.address, parseUnits('0.001'));
    await ust.transfer(pair.address, parseUnits('0.001', 6));
    await pair.skim(owner.address);
    expect(await mim.balanceOf(pair.address)).is.eq(balA);
    expect(await ust.balanceOf(pair.address)).is.eq(balB);
  });

  it("sync test", async function () {
    await mim.transfer(pair.address, parseUnits('0.001'));
    await ust.transfer(pair.address, parseUnits('0.001', 6));
    await pair.sync();
    expect(await pair.reserve0()).is.not.eq(0);
    expect(await pair.reserve1()).is.not.eq(0);
  });

  it("metadata test", async function () {
    const d = await pair.metadata();
    expect(d.dec0).is.not.eq(0);
    expect(d.dec1).is.not.eq(0);
    expect(d.r0).is.not.eq(0);
    expect(d.r1).is.not.eq(0);
    expect(d.st).is.eq(true);
    expect(d.t0).is.not.eq(Misc.ZERO_ADDRESS);
    expect(d.t1).is.not.eq(Misc.ZERO_ADDRESS);
  });

  it("very little swap", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await weth.approve(router.address, parseUnits('1'));
    await router.swapExactTokensForTokens(2, BigNumber.from(0), [{
      from: mim.address,
      to: weth.address,
      stable: true,
    }], owner.address, 9999999999);
    await router.swapExactTokensForTokens(2, BigNumber.from(0), [{
      to: mim.address,
      from: weth.address,
      stable: true,
    }], owner.address, 9999999999);
  });

  it("insufficient liquidity minted revert", async function () {
    await expect(pair2.mint(owner.address)).revertedWith('XenoPair: INSUFFICIENT_LIQUIDITY_MINTED');
  });

  it("insufficient liquidity burned revert", async function () {
    await expect(pair2.burn(owner.address)).revertedWith('XenoPair: INSUFFICIENT_LIQUIDITY_BURNED');
  });

  it("swap on pause test", async function () {
    await factory.setPause(true);
    await expect(pair2.swap(1, 1, owner.address, '0x')).revertedWith('PAUSE');
  });

  it("insufficient output amount", async function () {
    await expect(pair2.swap(0, 0, owner.address, '0x')).revertedWith('XenoPair: INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it("insufficient liquidity", async function () {
    await expect(pair2.swap(Misc.MAX_UINT, Misc.MAX_UINT, owner.address, '0x')).revertedWith('XenoPair: INSUFFICIENT_LIQUIDITY');
  });

  it("invalid to", async function () {
    await expect(pair2.swap(1, 1, weth.address, '0x')).revertedWith('XenoPair: INVALID_TO');
  });

  it("flash swap", async function () {
    const amount = parseUnits('0.1');
    // send fees + a bit more for covering a gap. it will be sent back after the swap
    await mim.transfer(pair2.address, amount.div(1950));
    await weth.transfer(pair2.address, amount.div(1950));
    const r = await pair.getReserves();
    await pair2.swap(
      amount,
      amount,
      testHelper.address,
      ethers.utils.defaultAbiCoder.encode(['address'], [pair2.address])
    );
    const r0 = await pair.getReserves();
    expect(r[0]).eq(r0[0]);
    expect(r[1]).eq(r0[1]);
  });

  it("reentrancy should revert", async function () {
    await expect(pair2.swap(
      10000,
      10000,
      ust.address,
      ethers.utils.defaultAbiCoder.encode(['address'], [pair2.address])
    )).revertedWith('Reentrant call');
  });

  it("insufficient input amount", async function () {
    await expect(pair2.swap(10000000, 1000000, owner.address, '0x')).revertedWith('XenoPair: INSUFFICIENT_INPUT_AMOUNT');
  });

  it("k revert", async function () {
    await mim.transfer(pair2.address, 1);
    await expect(pair2.swap(10000000, 1000000, owner.address, '0x')).revertedWith('XenoPair: K');
  });

  it("approve with zero adr revert", async function () {
    await expect(pair2.approve(Misc.ZERO_ADDRESS, 1)).revertedWith('Approve to the zero address');
  });

  it("permit expire", async function () {
    const {
      v,
      r,
      s
    } = await TestHelper.permitForPair(
      owner,
      pair2,
      pair2.address,
      parseUnits("1"),
      '1'
    );
    await expect(pair2.permit(owner.address, pair2.address, parseUnits("1"), '1', v, r, s)).revertedWith('EXPIRED');
  });

  it("permit invalid signature", async function () {
    const {
      v,
      r,
      s
    } = await TestHelper.permitForPair(
      owner,
      pair2,
      pair2.address,
      parseUnits("1"),
      '999999999999'
    );
    await expect(pair2.permit(pair2.address, pair2.address, parseUnits("1"), '999999999999', v, r, s)).revertedWith('INVALID_SIGNATURE');
  });

  it("transfer to himself without approve", async function () {
    await pair2.transferFrom(owner.address, owner.address, 1);
  });

  it("transfer without allowence revert", async function () {
    await expect(pair2.transferFrom(owner2.address, owner.address, 1)).revertedWith('Insufficient allowance');
  });

  it("transfer to zero address should be reverted", async function () {
    await expect(pair2.transferFrom(owner.address, Misc.ZERO_ADDRESS, 1)).revertedWith('Transfer to the zero address');
  });

  it("transfer exceed balance", async function () {
    await expect(pair2.transfer(owner.address, parseUnits('999999'))).revertedWith('Transfer amount exceeds balance');
  });

  it("getAmountOut loop test", async function () {
    await prices(owner, factory, router, true);
  });

  it("set fees test", async function () {
    await factory.setSwapFee(pair.address, 100_000);
    expect(await pair.swapFee()).eq(100_000)
  });

  it("set fees revert too high", async function () {
    await expect(factory.setSwapFee(pair.address, 999)).revertedWith('max');
  });

  it("set fees revert not factory", async function () {
    await expect(pair.setSwapFee(1000)).revertedWith('!factory');
  });

  it("swap loop test", async function () {
    const loop1 = await swapInLoop(owner, factory, router, 1);
    const loop100 = await swapInLoop(owner, factory, router, 10);
    expect(loop100.sub(loop1)).is.below(10);
  });

  it("swap gas", async function () {
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    await IERC20__factory.connect(token0, owner).transfer(pair.address, 1000000);
    await IERC20__factory.connect(token1, owner).transfer(pair.address, 1000000);
    const tx = await pair.swap(0, 10, owner.address, '0x')
    const receipt = await tx.wait()
    expect(receipt.gasUsed).is.below(BigNumber.from(280000));
  });

  it("price without impact", async function () {
    const p = await TestHelper.addLiquidity(
      factory,
      router,
      owner,
      mim.address,
      dai.address,
      utils.parseUnits('1000000000'),
      utils.parseUnits('2000000000'),
      true
    );

    // console.log('f normal', await p.f(parseUnits('1'), parseUnits('1')));
    // console.log('f very big', await p.f(parseUnits('1', 28), parseUnits('1', 28)));
    // console.log('f 100', await p.f(100, 100));
    // console.log('f 3', await p.f(3, 3));
    // console.log('f 2', await p.f(2, 2));

    // const priceMim = await p.priceWithoutImpact(mim.address)
    // console.log('PRICE MIM', priceMim.toString(), formatUnits(priceMim));
    const priceMimImp = await p.getAmountOut(parseUnits('1'), mim.address);
    console.log('PRICE MIM imp', formatUnits(priceMimImp));
    // const priceDai = await p.priceWithoutImpact(dai.address)
    // console.log('PRICE DAI', priceDai.toString(), formatUnits(priceDai));
    const priceDaiImp = await p.getAmountOut(parseUnits('1'), dai.address);
    console.log('PRICE DAI imp', formatUnits(priceDaiImp));

    const reserves = await p.getReserves();
    console.log('price0', getStablePrice(+formatUnits(reserves[0]), +formatUnits(reserves[1])))
    console.log('price1', getStablePrice(+formatUnits(reserves[1]), +formatUnits(reserves[0])))

    const balance = await dai.balanceOf(owner.address);
    await mim.transfer(p.address, parseUnits('1'));
    const out = await p.getAmountOut(parseUnits('1'), mim.address);
    await p.swap(0, out, owner.address, '0x')
    console.log('TRADE pure:', formatUnits((await dai.balanceOf(owner.address)).sub(balance)), formatUnits(out))
    expect(await dai.balanceOf(owner.address)).eq(balance.add(out))

    await mim.transfer(p.address, parseUnits('1'));
    await expect(p.swap(0, (await p.getAmountOut(parseUnits('1'), mim.address)).add(1), owner.address, '0x')).revertedWith('XenoPair: K')

    // balance = await dai.balanceOf(owner.address);
    // reserves = await p.getReserves();
    // out = parseUnits(getAmountOut(10000, +formatUnits(reserves[0]), +formatUnits(reserves[1])).toFixed(18))
    // console.log('OUT offchain', formatUnits(out))
    // console.log('OUT chain', formatUnits(await p.getAmountOut(parseUnits('10000'), mim.address)))
    // await mim.transfer(p.address, parseUnits('10000'));
    // await p.swap(0, out, owner.address, '0x')
    // console.log('TRADE offchain:', formatUnits((await dai.balanceOf(owner.address)).sub(balance)), formatUnits(out))
    // expect(await dai.balanceOf(owner.address)).eq(balance.add(out))


    // reserves = await p.getReserves();
    // await mim.transfer(p.address, parseUnits('1'));
    // out = parseUnits(getAmountOut(1, +formatUnits(reserves[0]), +formatUnits(reserves[1])).toFixed(18)).sub(1_000_000_000_000);
    // console.log('OUT offchain', formatUnits(out))
    // console.log('OUT chain', formatUnits(await p.getAmountOut(parseUnits('1'), mim.address)))
    // await p.swap(0, out, owner.address, '0x')
    // await expect(p.swap(0, out, owner.address, '0x')).revertedWith('XenoPair: K')

  });

  it("mint gas", async function () {
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    await IERC20__factory.connect(token0, owner).transfer(pair.address, 100000000);
    await IERC20__factory.connect(token1, owner).transfer(pair.address, 100000000);
    const tx = await pair.mint(owner.address);
    const receipt = await tx.wait()
    expect(receipt.gasUsed).below(BigNumber.from(140000));
  });

  it("burn gas", async function () {
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    await IERC20__factory.connect(token0, owner).transfer(pair.address, 100000000);
    await IERC20__factory.connect(token1, owner).transfer(pair.address, 100000000);
    await pair.mint(owner.address);
    await IERC20__factory.connect(pair.address, owner).transfer(pair.address, 100000000)
    const tx = await pair.burn(owner.address);
    const receipt = await tx.wait()
    expect(receipt.gasUsed).below(BigNumber.from(130000));
  });

  it("twap price complex test", async function () {
    await mim.approve(router.address, parseUnits('100'));
    await ust.approve(router.address, parseUnits('100', 6));

    expect(await pair.observationLength()).eq(1);
    const window = 10;
    for (let i = 0; i < window; i++) {
      await TimeUtils.advanceBlocksOnTs(60 * 60)
      await pair.sync();
    }

    expect(await pair.observationLength()).eq(window + 1);
    await checkTwap(pair, mim.address, BigNumber.from(35));

    await router.swapExactTokensForTokens(parseUnits('1'), 0, [{
      from: mim.address,
      to: ust.address,
      stable: true,
    }], owner.address, 9999999999);

    await checkTwap(pair, mim.address, BigNumber.from(581_393));
    await TimeUtils.advanceBlocksOnTs(60 * 60 * window)
    await pair.sync();
    await checkTwap(pair, mim.address, BigNumber.from(523_258));

    await router.swapExactTokensForTokens(parseUnits('1', 6), 0, [{
      to: mim.address,
      from: ust.address,
      stable: true,
    }], owner.address, 9999999999);

    await checkTwap(pair, mim.address, BigNumber.from(195_121));
    await TimeUtils.advanceBlocksOnTs(60 * 60 * window)
    await pair.sync();
    await checkTwap(pair, mim.address, BigNumber.from(181_396));

  });

});

async function checkTwap(pair: XenoPair, tokenIn: string, diff: BigNumber) {
  const amount = parseUnits('1');
  const twapPrice = await pair.quote(tokenIn, amount, 10)
  const curPrice = await pair.getAmountOut(amount, tokenIn);
  console.log('twapPrice', twapPrice.toString());
  console.log('curPrice', curPrice.toString());
  if (twapPrice.gt(curPrice)) {
    TestHelper.closer(twapPrice.sub(curPrice), diff, diff.div(100));
  } else {
    TestHelper.closer(curPrice.sub(twapPrice), diff, diff.div(100));
  }
}

async function swapInLoop(
  owner: SignerWithAddress,
  factory: XenoFactory,
  router: XenoRouter01,
  loops: number,
) {
  const amount = parseUnits('1');
  const tokenA = await Deploy.deployContract(owner, 'Token', 'UST', 'UST', 18, owner.address) as Token;
  await tokenA.mint(owner.address, amount.mul(2));
  const tokenB = await Deploy.deployContract(owner, 'Token', 'MIM', 'MIM', 18, owner.address) as Token;
  await tokenB.mint(owner.address, amount.mul(2));

  await TestHelper.addLiquidity(
    factory,
    router,
    owner,
    tokenA.address,
    tokenB.address,
    amount,
    amount,
    true
  );

  const balB = await tokenB.balanceOf(owner.address);

  await tokenA.approve(router.address, parseUnits('100'));
  for (let i = 0; i < loops; i++) {
    await router.swapExactTokensForTokens(
      amount.div(100).div(loops),
      0,
      [{from: tokenA.address, to: tokenB.address, stable: true}],
      owner.address,
      BigNumber.from('999999999999999999'),
    );
  }
  return (await tokenB.balanceOf(owner.address)).sub(balB);
}

async function prices(
  owner: SignerWithAddress,
  factory: XenoFactory,
  router: XenoRouter01,
  stable = true,
) {
  const tokenA = await Deploy.deployContract(owner, 'Token', 'UST', 'UST', 18, owner.address) as Token;
  await tokenA.mint(owner.address, utils.parseUnits('1'));
  const tokenB = await Deploy.deployContract(owner, 'Token', 'MIM', 'MIM', 18, owner.address) as Token;
  await tokenB.mint(owner.address, utils.parseUnits('1'));

  const amount = parseUnits('1');
  const loops = 100;

  const newPair = await TestHelper.addLiquidity(
    factory,
    router,
    owner,
    tokenA.address,
    tokenB.address,
    amount,
    amount,
    stable
  );

  const price = parseUnits('1');

  for (let i = 0; i < loops; i++) {
    const amountIn = BigNumber.from(i + 1).mul(amount.div(loops));
    const out = await newPair.getAmountOut(amountIn, tokenA.address);
    const p = out.mul(parseUnits('1')).div(amountIn);
    const slippage = price.sub(p).mul(parseUnits('1')).div(price).mul(100);
    expect(+formatUnits(slippage)).is.below(51);
    // console.log(formatUnits(amountIn), formatUnits(out), formatUnits(p), formatUnits(slippage));
  }
}


function getStablePrice(reserveIn: number, reserveOut: number,): number {
  return getAmountOut(1 / 18, reserveIn, reserveOut) * 18;
}

function getAmountOut(amountIn: number, reserveIn: number, reserveOut: number): number {
  const xy = _k(reserveIn, reserveOut);
  return reserveOut - _getY(amountIn + reserveIn, xy, reserveOut);
}

function _k(
  _x: number,
  _y: number,
): number {
  const _a = _x * _y;
  const _b = _x * _x + _y * _y;
  // x3y+y3x >= k
  return _a * _b;
}

function _getY(x0: number, xy: number, y: number): number {
  for (let i = 0; i < 255; i++) {
    const yPrev = y;
    const k = _f(x0, y);
    if (k < xy) {
      const dy = (xy - k) / _d(x0, y);
      y = y + dy;
    } else {
      const dy = (k - xy) / _d(x0, y);
      y = y - dy;
    }
    if (_closeTo(y, yPrev, 1)) {
      break;
    }
  }
  return y;
}

function _f(x0: number, y: number): number {
  return x0 * Math.pow(y, 3) + y * Math.pow(x0, 3);
}

function _d(x0: number, y: number): number {
  return 3 * x0 * y * y + Math.pow(x0, 3);
}

function _closeTo(a: number, b: number, target: number): boolean {
  if (a > b) {
    if (a - b < target) {
      return true;
    }
  } else {
    if (b - a < target) {
      return true;
    }
  }
  return false;
}
