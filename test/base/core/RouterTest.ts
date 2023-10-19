import {
  XenoFactory,
  XenoPair__factory,
  XenoRouter01, SwapLibrary,
  Token,
  TokenWithFee
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
import {address} from "hardhat/internal/core/config/config-validation";

const {expect} = chai;

describe("router tests", function () {

  let snapshotBefore: string;
  let snapshot: string;

  let owner: SignerWithAddress;
  let owner2: SignerWithAddress;
  let factory: XenoFactory;
  let router: XenoRouter01;

  let weth: Token;
  let ust: Token;
  let mim: Token;
  let dai: Token;
  let tokenWithFee: TokenWithFee;
  let swapLib: SwapLibrary;


  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    [owner, owner2] = await ethers.getSigners();
    weth = await Deploy.deployContract(owner, 'Token', 'WETH', 'WETH', 18, owner.address) as Token;
    await weth.mint(owner.address, parseUnits('1000'));
    factory = await Deploy.deployXenoFactory(owner, owner.address);
    router = await Deploy.deployXenoRouter01(owner, factory.address, weth.address);
    swapLib = await Deploy.deployContract(owner, 'SwapLibrary', router.address) as SwapLibrary;

    [ust, mim, dai] = await TestHelper.createMockTokensAndMint(owner);
    await ust.transfer(owner2.address, utils.parseUnits('100', 6));
    await mim.transfer(owner2.address, utils.parseUnits('100'));
    await dai.transfer(owner2.address, utils.parseUnits('100'));

    tokenWithFee = await Deploy.deployContract(owner, 'TokenWithFee', 'TWF', 'TWF', 18, owner.address) as TokenWithFee;
    await tokenWithFee.mint(owner.address, utils.parseUnits('1000000000000'));
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

  it("quoteAddLiquidity on empty pair", async function () {
    await router.quoteAddLiquidity(
      mim.address,
      ust.address,
      true,
      parseUnits('1'),
      parseUnits('1', 6),
    );
  });

  it("quoteAddLiquidity on exist pair", async function () {
    await TestHelper.addLiquidity(
      factory,
      router,
      owner,
      mim.address,
      ust.address,
      utils.parseUnits('1'),
      utils.parseUnits('1', 6),
      true
    );

    await router.quoteAddLiquidity(
      mim.address,
      ust.address,
      true,
      parseUnits('1'),
      parseUnits('10', 6),
    );
  });

  it("quoteAddLiquidity on exist pair2", async function () {
    await TestHelper.addLiquidity(
      factory,
      router,
      owner,
      mim.address,
      ust.address,
      utils.parseUnits('1'),
      utils.parseUnits('1', 6),
      true
    );

    await router.quoteAddLiquidity(
      mim.address,
      ust.address,
      true,
      parseUnits('10'),
      parseUnits('1', 6),
    );
  });

  it("quoteRemoveLiquidity on empty pair", async function () {
    await router.quoteRemoveLiquidity(
      mim.address,
      ust.address,
      true,
      parseUnits('1'),
    );
  });

  it("addLiquidityETH test", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );
  });

  it("removeLiquidityETH test", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    const pairAdr = await factory.getPair(mim.address, weth.address, true);

    await XenoPair__factory.connect(pairAdr, owner).approve(router.address, parseUnits('1111'));
    await router.removeLiquidityETH(
      mim.address,
      true,
      parseUnits('0.1'),
      0,
      0,
      owner.address,
      99999999999,
    );
  });


  it("removeLiquidityWithPermit test", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    const pairAdr = await factory.getPair(mim.address, weth.address, true);
    const pair = XenoPair__factory.connect(pairAdr, owner);

    const {
      v,
      r,
      s
    } = await TestHelper.permitForPair(owner, pair, router.address, parseUnits('0.1'));

    await router.removeLiquidityWithPermit(
      mim.address,
      weth.address,
      true,
      parseUnits('0.1'),
      0,
      0,
      owner.address,
      99999999999,
      false, v, r, s
    );
  });

  it("removeLiquidityETHWithPermit test", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    const pairAdr = await factory.getPair(mim.address, weth.address, true);
    const pair = XenoPair__factory.connect(pairAdr, owner);

    const {
      v,
      r,
      s
    } = await TestHelper.permitForPair(owner, pair, router.address, parseUnits('0.1'));

    await router.removeLiquidityETHWithPermit(
      mim.address,
      true,
      parseUnits('0.1'),
      0,
      0,
      owner.address,
      99999999999,
      false, v, r, s
    );
  });

  it("swapExactTokensForTokensSimple test", async function () {
    await mim.approve(router.address, parseUnits('10'));

    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    await router.swapExactTokensForTokensSimple(
      parseUnits('0.1'),
      0,
      mim.address,
      weth.address,
      true,
      owner.address,
      99999999999
    );
  });

  it("swapExactTokensForETH test", async function () {
    await mim.approve(router.address, parseUnits('10'));

    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    await router.swapExactTokensForETH(
      parseUnits('0.1'),
      0,
      [{
        from: mim.address,
        to: weth.address,
        stable: true,
      }],
      owner.address,
      99999999999
    );
  });

  it("UNSAFE_swapExactTokensForTokens test", async function () {
    await mim.approve(router.address, parseUnits('10'));

    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    await router.UNSAFE_swapExactTokensForTokens(
      [parseUnits('0.1'), parseUnits('0.1')],
      [{
        from: mim.address,
        to: weth.address,
        stable: true,
      }],
      owner.address,
      99999999999
    );
  });

  it("swapExactETHForTokens test", async function () {
    await mim.approve(router.address, parseUnits('10'));

    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    await router.swapExactETHForTokens(
      0,
      [{
        from: weth.address,
        to: mim.address,
        stable: true,
      }],
      owner.address,
      99999999999,
      {value: parseUnits('0.1')}
    );
  });

  it("add/remove liquidity with fee token test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('10'));
    const ethBalance = await owner.getBalance();
    const tokenBalance = await tokenWithFee.balanceOf(owner.address);

    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('1')}
    );

    const pairAdr = await factory.getPair(tokenWithFee.address, weth.address, true);
    const pair = XenoPair__factory.connect(pairAdr, owner);
    const pairBal = await pair.balanceOf(owner.address);

    const {
      v,
      r,
      s
    } = await TestHelper.permitForPair(owner, pair, router.address, pairBal);

    await router.removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
      tokenWithFee.address,
      true,
      pairBal,
      0,
      0,
      owner.address,
      99999999999,
      false, v, r, s
    );

    const ethBalanceAfter = await owner.getBalance();
    const tokenBalanceAfter = await tokenWithFee.balanceOf(owner.address);
    TestHelper.closer(ethBalanceAfter, ethBalance, parseUnits('0.1'));
    TestHelper.closer(tokenBalanceAfter, tokenBalance, parseUnits('0.3'));
  });


  it("swapExactTokensForTokensSupportingFeeOnTransferTokens test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('10'));

    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('1')}
    );

    const ethBalance = await owner.getBalance();
    const tokenBalance = await tokenWithFee.balanceOf(owner.address);

    await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      parseUnits('0.1'),
      0,
      [{from: tokenWithFee.address, to: weth.address, stable: true}],
      owner.address,
      99999999999
    );

    const ethBalanceAfter = await owner.getBalance();
    const tokenBalanceAfter = await tokenWithFee.balanceOf(owner.address);
    TestHelper.closer(ethBalanceAfter, ethBalance, parseUnits('11'));
    TestHelper.closer(tokenBalanceAfter, tokenBalance, parseUnits('0.5'));
  });

  it("swapExactETHForTokensSupportingFeeOnTransferTokens test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('10'));

    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('1')}
    );

    const ethBalance = await owner.getBalance();
    const tokenBalance = await tokenWithFee.balanceOf(owner.address);

    await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      0,
      [{to: tokenWithFee.address, from: weth.address, stable: true}],
      owner.address,
      99999999999,
      {value: parseUnits('0.1')}
    );

    const ethBalanceAfter = await owner.getBalance();
    const tokenBalanceAfter = await tokenWithFee.balanceOf(owner.address);
    TestHelper.closer(ethBalanceAfter, ethBalance, parseUnits('2'));
    TestHelper.closer(tokenBalanceAfter, tokenBalance, parseUnits('0.1'));
  });

  it("swapExactTokensForETHSupportingFeeOnTransferTokens test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('10'));

    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('1')}
    );

    const ethBalance = await owner.getBalance();
    const tokenBalance = await tokenWithFee.balanceOf(owner.address);

    await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      parseUnits('0.1'),
      0,
      [{from: tokenWithFee.address, to: weth.address, stable: true}],
      owner.address,
      99999999999,
    );

    const ethBalanceAfter = await owner.getBalance();
    const tokenBalanceAfter = await tokenWithFee.balanceOf(owner.address);
    TestHelper.closer(ethBalanceAfter, ethBalance, parseUnits('2'));
    TestHelper.closer(tokenBalanceAfter, tokenBalance, parseUnits('0.2'));
  });

  it("getExactAmountOut test", async function () {
    expect(await router.getExactAmountOut(
      parseUnits('0.1'),
      tokenWithFee.address,
      weth.address,
      true,
    )).is.eq(0);

    await tokenWithFee.approve(router.address, parseUnits('10'));

    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('1')}
    );

    expect(await router.getExactAmountOut(
      parseUnits('0.1'),
      tokenWithFee.address,
      weth.address,
      true,
    )).is.not.eq(0);
  });

  it("deadline reject", async function () {
    await expect(router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      1,
      {value: parseUnits('10')}
    )).revertedWith('XenoRouter: EXPIRED');
  });

  it("sort tokens identical address", async function () {
    await expect(router.sortTokens(
      mim.address,
      mim.address,
    )).revertedWith('XenoRouter: IDENTICAL_ADDRESSES');
  });

  it("sort tokens zero address", async function () {
    await expect(router.sortTokens(
      mim.address,
      Misc.ZERO_ADDRESS,
    )).revertedWith('XenoRouter: ZERO_ADDRESS');
  });

  it("getAmountOut for not exist pair", async function () {
    expect((await router.getAmountOut(
      0,
      mim.address,
      dai.address,
    ))[0]).eq(0);
  });

  it("receive eth not from weth reject", async function () {
    await expect(owner.sendTransaction({value: 1, to: router.address})).revertedWith("XenoRouter: NOT_WETH");
  });

  it("getReserves", async function () {
    await TestHelper.addLiquidity(
      factory,
      router,
      owner,
      mim.address,
      ust.address,
      utils.parseUnits('1'),
      utils.parseUnits('1', 6),
      true
    );
    await router.getReserves(mim.address, ust.address, true);
  });

  it("getAmountsOut wrong path", async function () {
    await expect(router.getAmountsOut(0, [])).revertedWith('XenoRouter: INVALID_PATH');
  });

  it("quoteLiquidity zero amount", async function () {
    await expect(router.quoteLiquidity(0, 0, 0)).revertedWith('XenoRouter: INSUFFICIENT_AMOUNT');
  });

  it("quoteLiquidity IL", async function () {
    await expect(router.quoteLiquidity(1, 0, 0)).revertedWith('XenoRouter: INSUFFICIENT_LIQUIDITY');
  });

  it("getAmountsOut with not exist pair", async function () {
    expect((await router.getAmountsOut(0, [{
      from: weth.address,
      to: mim.address,
      stable: false
    }]))[0]).eq(0);
  });

  it("add liquidity amount desired check", async function () {
    await expect(router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      parseUnits('100'),
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    )).revertedWith('XenoRouter: DESIRED_A_AMOUNT');
    await expect(router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1000'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    )).revertedWith('XenoRouter: DESIRED_B_AMOUNT');
  });


  it("add liquidity IA check", async function () {
    await TestHelper.addLiquidity(
      factory,
      router,
      owner,
      mim.address,
      weth.address,
      utils.parseUnits('1'),
      utils.parseUnits('1'),
      true
    );

    await expect(router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('0.037'),
      parseUnits('0.037'),
      parseUnits('0.77'),
      owner.address,
      99999999999,
      {value: parseUnits('0.77')}
    )).revertedWith('XenoRouter: INSUFFICIENT_B_AMOUNT');

    await expect(router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('0.037'),
      parseUnits('0.037'),
      parseUnits('0.01'),
      owner.address,
      99999999999,
      {value: parseUnits('0.01')}
    )).revertedWith('XenoRouter: INSUFFICIENT_A_AMOUNT');
  });


  it("addLiquidityETH send back dust", async function () {
    await TestHelper.addLiquidity(
      factory,
      router,
      owner,
      mim.address,
      weth.address,
      utils.parseUnits('1'),
      utils.parseUnits('1'),
      true
    );

    await mim.approve(router.address, parseUnits('10'));
    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      0,
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );
  });


  it("remove Liquidity IA test", async function () {
    await mim.approve(router.address, parseUnits('1'));
    await router.addLiquidityETH(
      mim.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    const pairAdr = await factory.getPair(mim.address, weth.address, true);

    await XenoPair__factory.connect(pairAdr, owner).approve(router.address, parseUnits('1111'));
    await expect(router.removeLiquidity(
      mim.address,
      weth.address,
      true,
      parseUnits('0.1'),
      parseUnits('0.1'),
      0,
      owner.address,
      99999999999,
    )).revertedWith('XenoRouter: INSUFFICIENT_A_AMOUNT');
    await expect(router.removeLiquidity(
      mim.address,
      weth.address,
      true,
      parseUnits('0.1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
    )).revertedWith('XenoRouter: INSUFFICIENT_B_AMOUNT');
  });

  it("removeLiquidityETHSupportingFeeOnTransferTokens test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('1'));
    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    const pairAdr = await factory.getPair(tokenWithFee.address, weth.address, true);

    await XenoPair__factory.connect(pairAdr, owner).approve(router.address, parseUnits('1111'));
    await router.removeLiquidityETHSupportingFeeOnTransferTokens(
      tokenWithFee.address,
      true,
      parseUnits('0.1'),
      0,
      0,
      owner.address,
      99999999999,
    );
  });

  it("swapExactTokensForTokensSimple IOA test", async function () {
    await expect(router.swapExactTokensForTokensSimple(
      parseUnits('0.1'),
      parseUnits('0.1'),
      mim.address,
      weth.address,
      true,
      owner.address,
      BigNumber.from('999999999999999999'),
    )).revertedWith('XenoRouter: INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it("swapExactTokensForTokens IOA test", async function () {
    await expect(router.swapExactTokensForTokens(
      parseUnits('0.1'),
      parseUnits('0.1'),
      [{
        from: mim.address,
        to: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
    )).revertedWith('XenoRouter: INSUFFICIENT_OUTPUT_AMOUNT');
  });


  it("swapExactETHForTokens IOA test", async function () {
    await expect(router.swapExactETHForTokens(
      parseUnits('0.1'),
      [{
        to: mim.address,
        from: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
    )).revertedWith('XenoRouter: INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it("swapExactETHForTokens IP test", async function () {
    await expect(router.swapExactETHForTokens(
      parseUnits('0.1'),
      [{
        from: mim.address,
        to: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
    )).revertedWith('XenoRouter: INVALID_PATH');
  });

  it("swapExactTokensForETH IOA test", async function () {
    await expect(router.swapExactTokensForETH(
      parseUnits('0.1'),
      parseUnits('0.1'),
      [{
        from: mim.address,
        to: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
    )).revertedWith('XenoRouter: INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it("swapExactTokensForETH IP test", async function () {
    await expect(router.swapExactTokensForETH(
      parseUnits('0.1'),
      parseUnits('0.1'),
      [{
        to: mim.address,
        from: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
    )).revertedWith('XenoRouter: INVALID_PATH');
  });

  it("swapExactTokensForTokensSupportingFeeOnTransferTokens IOA test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('1'));
    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    await weth.approve(router.address, parseUnits('1000'));
    await expect(router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      parseUnits('0.1'),
      parseUnits('0.1'),
      [{
        to: tokenWithFee.address,
        from: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
    )).revertedWith('XenoRouter: INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it("swapExactETHForTokensSupportingFeeOnTransferTokens IP test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('1'));
    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    await weth.approve(router.address, parseUnits('1000'));
    await expect(router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      parseUnits('0.1'),
      [{
        from: tokenWithFee.address,
        to: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
      {value: parseUnits('0.1')}
    )).revertedWith('XenoRouter: INVALID_PATH');
  });

  it("swapExactETHForTokensSupportingFeeOnTransferTokens IOA test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('1'));
    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );

    await weth.approve(router.address, parseUnits('1000'));
    await expect(router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      parseUnits('0.1'),
      [{
        to: tokenWithFee.address,
        from: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
      {value: parseUnits('0.1')}
    )).revertedWith('XenoRouter: INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it("swapExactTokensForETHSupportingFeeOnTransferTokens IOA test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('100'));
    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('1')}
    );

    await weth.approve(router.address, parseUnits('1000'));
    await expect(router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      parseUnits('0.1'),
      parseUnits('0.1'),
      [{
        from: tokenWithFee.address,
        to: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
    )).revertedWith('XenoRouter: INSUFFICIENT_OUTPUT_AMOUNT');
  });

  it("swapExactTokensForETHSupportingFeeOnTransferTokens IP test", async function () {
    await tokenWithFee.approve(router.address, parseUnits('100'));
    await router.addLiquidityETH(
      tokenWithFee.address,
      true,
      parseUnits('1'),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('1')}
    );

    await weth.approve(router.address, parseUnits('1000'));
    await expect(router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      parseUnits('0.1'),
      parseUnits('0.1'),
      [{
        to: tokenWithFee.address,
        from: weth.address,
        stable: true
      }],
      owner.address,
      BigNumber.from('999999999999999999'),
    )).revertedWith('XenoRouter: INVALID_PATH');
  });

  it("router with broken eth should revert", async function () {
    await check(
      owner,
      router,
      mim,
      weth,
      swapLib,
      true
    )
  });

  it("swap library volatile test", async function () {
    await check(
      owner,
      router,
      mim,
      weth,
      swapLib,
      false
    )
  });

  it("swap library normalized reserves test", async function () {
    await ust.approve(router.address, parseUnits('1', 6));
    await router.addLiquidityETH(
      ust.address,
      true,
      parseUnits('1', 6),
      0,
      parseUnits('1'),
      owner.address,
      99999999999,
      {value: parseUnits('10')}
    );
    const r = await swapLib.getNormalizedReserves(
      ust.address,
      weth.address,
      true,);
    expect(r[0]).not.equal(BigNumber.from(0));
    expect(r[1]).not.equal(BigNumber.from(0));
  });

});


async function check(
  owner: SignerWithAddress,
  router: XenoRouter01,
  tokenIn: Token,
  weth: Token,
  swapLib: SwapLibrary,
  stable: boolean
) {
  await tokenIn.approve(router.address, parseUnits('10'));

  await router.addLiquidityETH(
    tokenIn.address,
    stable,
    parseUnits('1'),
    0,
    parseUnits('1'),
    owner.address,
    99999999999,
    {value: parseUnits('10')}
  );

  let data = await swapLib["getTradeDiff(uint256,address,address,bool)"](parseUnits('1'), tokenIn.address, weth.address, stable);
  if (stable) {
    expect(formatUnits(data.a)).eq('3.22020182710050887');
    expect(formatUnits(data.b)).eq('2.204033780209746315');
  } else {
    expect(formatUnits(data.a)).eq('9.0909090909090909');
    expect(formatUnits(data.b)).eq('5.0');
  }

  data = await swapLib.getTradeDiff2(parseUnits('1'), tokenIn.address, weth.address, stable);

  if (stable) {
    expect(formatUnits(data.a)).eq('3.42192');
    expect(formatUnits(data.b)).eq('2.204033780209746315');
  } else {
    expect(formatUnits(data.a)).eq('9.0909090909090909');
    expect(formatUnits(data.b)).eq('5.0');
  }

  data = await swapLib.getTradeDiff3(parseUnits('1'), tokenIn.address, weth.address, stable);

  if (stable) {
    expect(formatUnits(data.a)).eq('3.42192');
    expect(formatUnits(data.b)).eq('2.204033780209746315');
  } else {
    expect(formatUnits(data.a)).eq('10.0');
    expect(formatUnits(data.b)).eq('5.0');
  }

  data = await swapLib.getTradeDiffSimple(parseUnits('1'), tokenIn.address, weth.address, stable, 0);

  if (stable) {
    expect(formatUnits(data.a)).eq('3.42192');
    expect(formatUnits(data.b)).eq('2.204033780209746315');
  } else {
    expect(formatUnits(data.a)).eq('9.99999');
    expect(formatUnits(data.b)).eq('5.0');
  }

  const balWeth0 = await weth.balanceOf(owner.address);
  await router.swapExactTokensForTokens(
    10_000,
    0,
    [{
      from: tokenIn.address,
      to: weth.address,
      stable
    }],
    owner.address,
    99999999999
  );
  const balWethAfter0 = await weth.balanceOf(owner.address);
  const getWeth0 = +formatUnits(balWethAfter0.sub(balWeth0)) * (1e18 / 10_000)
  if (stable) {
    expect(getWeth0).eq(3.4215000000000004);
  } else {
    expect(getWeth0).eq(9.9949);
  }

  const balWeth = await weth.balanceOf(owner.address);
  await router.swapExactTokensForTokens(
    parseUnits('1'),
    0,
    [{
      from: tokenIn.address,
      to: weth.address,
      stable
    }],
    owner.address,
    99999999999
  );
  const balWethAfter = await weth.balanceOf(owner.address);
  const getWeth = formatUnits(balWethAfter.sub(balWeth))
  if (stable) {
    expect(getWeth).eq('2.203881529381578687');
  } else {
    expect(getWeth).eq('4.998749687421780514');
  }
}
