import { Currency, CurrencyAmount, Price, Token } from "@uniswap/sdk-core";
import { useMemo } from "react";
import { USDC } from "../constants/tokens";
import { USDC_MATIC } from "../constants/tokens.matic";
import { USDC_FANTOM } from "../constants/tokens.fantom";
import { useWeb3 } from "../web3";
import { useTradeExactOut } from "./useTrade";
import { USDC_BSC } from "../constants/tokens.bsc";
import { USDC_AVAX } from "../constants/tokens.avax";
import { USDC_CRONOS } from "../constants/tokens.cronos";

// USDC amount used when calculating spot price for a given currency.
// The amount is large enough to filter low liquidity pairs.
const usdcCurrencyAmount = CurrencyAmount.fromRawAmount(USDC, 100_000e6);
const usdcCurrencyAmountMATIC = CurrencyAmount.fromRawAmount(
  USDC_MATIC,
  100_000e6
);
const usdcCurrencyAmountFANTOM = CurrencyAmount.fromRawAmount(
  USDC_FANTOM,
  100_000e6
);
const usdcCurrencyAmountBSC = CurrencyAmount.fromRawAmount(
  USDC_BSC,
  100_000e18
);

const usdcCurrencyAmountCRO = CurrencyAmount.fromRawAmount(
  USDC_CRONOS,
  100_000e6
);

const usdcCurrencyAmountAVAX = CurrencyAmount.fromRawAmount(
  USDC_AVAX,
  100_000e6
);

/**
 * Returns the price in USDC of the input currency
 * @param currency currency to compute the USDC price of
 */
export default function useUSDCPrice(
  currency?: Currency
): Price<Currency, Token> | undefined {
  const { chainId, handler } = useWeb3();
  const v2USDCTrade = useTradeExactOut(
    currency,
    chainId === 25
      ? usdcCurrencyAmountCRO
      : chainId === 56
      ? usdcCurrencyAmountBSC
      : chainId === 137
      ? usdcCurrencyAmountMATIC
      : chainId === 250
      ? usdcCurrencyAmountFANTOM
      : chainId === 43114
      ? usdcCurrencyAmountAVAX
      : chainId === 1
      ? usdcCurrencyAmount
      : undefined,
    handler,
    {
      maxHops: 2,
    }
  );

  return useMemo(() => {
    if (!currency || !chainId) {
      return undefined;
    }

    // return some fake price data for non-mainnet
    if (
      chainId !== 1 &&
      chainId !== 25 &&
      chainId !== 56 &&
      chainId !== 137 &&
      chainId !== 250 &&
      chainId !== 43114
    ) {
      const fakeUSDC = new Token(
        chainId,
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        6,
        "fUSDC",
        "Fake USDC"
      );
      return new Price(
        currency,
        fakeUSDC,
        10 ** Math.max(0, currency.decimals - 6),
        15 * 10 ** Math.max(6 - currency.decimals, 0)
      );
    }

    // use v2 price if available, v3 as fallback
    if (v2USDCTrade) {
      const { numerator, denominator } = v2USDCTrade.route.midPrice;
      return new Price(
        currency,
        chainId === 1
          ? USDC
          : chainId === 25
          ? USDC_CRONOS
          : chainId === 56
          ? USDC_BSC
          : chainId === 137
          ? USDC_MATIC
          : chainId === 250
          ? USDC_FANTOM
          : chainId === 43114
          ? USDC_AVAX
          : USDC,
        denominator,
        numerator
      );
    }
    // } else if (v3USDCTrade.state === V3TradeState.VALID && v3USDCTrade.trade) {
    //   const { numerator, denominator } = v3USDCTrade.trade.route.midPrice
    //   return new Price(currency, USDC, denominator, numerator)
    // }

    return undefined;
  }, [chainId, currency, v2USDCTrade]);
}

export function useUSDCValue(
  currencyAmount: CurrencyAmount<Currency> | undefined | null
): CurrencyAmount<Token> | null {
  const price = useUSDCPrice(currencyAmount?.currency);

  return useMemo(() => {
    if (!price && currencyAmount?.currency.symbol === "USDC")
      return currencyAmount as CurrencyAmount<Token>;
    if (!price || !currencyAmount) return null;
    try {
      return price.quote(currencyAmount);
    } catch (error) {
      return null;
    }
  }, [currencyAmount, price]);
}
