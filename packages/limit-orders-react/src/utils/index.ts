/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { getAddress } from "@ethersproject/address";
import { Percent, Currency, TradeType, Token } from "@uniswap/sdk-core";
import { Trade as V2Trade } from "@uniswap/v2-sdk";
import { AddressZero } from "@ethersproject/constants";
import { Contract } from "@ethersproject/contracts";
import { Web3Provider, JsonRpcSigner } from "@ethersproject/providers";
import { TokenAddressMap } from "../state/glists/hooks";

const ZERO_PERCENT = new Percent("0");
const ONE_HUNDRED_PERCENT = new Percent("1");

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function isTokenOnList(
  tokenAddressMap: TokenAddressMap,
  token?: Token
): boolean {
  return Boolean(
    token?.isToken && tokenAddressMap[token.chainId]?.[token.address]
  );
}

// shorten the checksummed version of the input address to have 0x + 4 characters at start and end
export function shortenAddress(address: string, chars = 4): string {
  const parsed = isAddress(address);
  if (!parsed) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }
  return `${parsed.substring(0, chars + 2)}...${parsed.substring(42 - chars)}`;
}

// returns the checksummed address if the address is valid, otherwise returns false
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isAddress(value: any): string | false {
  try {
    return getAddress(value);
  } catch {
    return false;
  }
}

export function isTradeBetter(
  tradeA: V2Trade<Currency, Currency, TradeType> | undefined | null,
  tradeB: V2Trade<Currency, Currency, TradeType> | undefined | null,
  minimumDelta: Percent = ZERO_PERCENT
): boolean | undefined {
  if (tradeA && !tradeB) return false;
  if (tradeB && !tradeA) return true;
  if (!tradeA || !tradeB) return undefined;

  if (
    tradeA.tradeType !== tradeB.tradeType ||
    !tradeA.inputAmount.currency.equals(tradeB.inputAmount.currency) ||
    !tradeB.outputAmount.currency.equals(tradeB.outputAmount.currency)
  ) {
    throw new Error("Comparing incomparable trades");
  }

  if (minimumDelta.equalTo(ZERO_PERCENT)) {
    return tradeA.executionPrice.lessThan(tradeB.executionPrice);
  } else {
    return tradeA.executionPrice.asFraction
      .multiply(minimumDelta.add(ONE_HUNDRED_PERCENT))
      .lessThan(tradeB.executionPrice);
  }
}

// account is not optional
export function getSigner(
  library: Web3Provider,
  account: string
): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked();
}

// account is optional
export function getProviderOrSigner(
  library: Web3Provider,
  account?: string
): Web3Provider | JsonRpcSigner {
  return account ? getSigner(library, account) : library;
}
// account is optional
// account is optional
export function getContract(
  address: string,
  ABI: any,
  library: Web3Provider,
  account?: string
): Contract {
  if (!isAddress(address) || address === AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }

  return new Contract(
    address,
    ABI,
    getProviderOrSigner(library, account) as any
  );
}

// get the ether balance of an address
export async function getEtherBalance(address: string, library: Web3Provider) {
  if (!isAddress(address)) {
    throw Error(`Invalid 'address' parameter '${address}'`);
  }
  return library.getBalance(address);
}

export const buildBasesToCheckTradesAgainst = (
  bases: {
    chainId: number;
    address: string;
    decimals: number;
    name: string;
    symbol: string;
  }[]
): Token[] => {
  return bases.map(
    ({ chainId, address, decimals, name, symbol }) =>
      new Token(chainId, address, decimals, symbol, name)
  );
};
