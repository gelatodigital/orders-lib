import { Currency, TradeType, Price, CurrencyAmount } from "@uniswap/sdk-core";
import { Trade } from "@uniswap/v2-sdk";
import React, {
  Dispatch,
  useState,
  SetStateAction,
  useEffect,
  useMemo,
} from "react";
import { ArrowDown, AlertTriangle } from "react-feather";
import { Text } from "rebass";
import styled from "styled-components";
import { useUSDCValue } from "../../hooks/useUSDCPrice";
import { TYPE } from "../../theme";
import { ButtonPrimary } from "../Button";
import { isAddress, shortenAddress } from "../../utils";
import { computeFiatValuePriceImpact } from "../../utils/computeFiatValuePriceImpact";
import { AutoColumn } from "../Column";
import { FiatValue } from "../CurrencyInputPanel/FiatValue";
import CurrencyLogo from "../CurrencyLogo";
import { RowBetween, RowFixed } from "../Row";
import {
  TruncatedText,
  SwapShowAcceptChanges,
  DisclaimerText,
} from "./styleds";
import { AdvancedSwapDetails } from "./AdvancedSwapDetails";
import { LightCard } from "../Card";
import { DarkGreyCard } from "../Card";
import TradePrice from "../order/TradePrice";
import useTheme from "../../hooks/useTheme";
import {
  useGelatoStopLimitOrders,
  useGelatoStopLimitOrdersLib,
} from "../../hooks/gelato";
import Toggle from "react-styled-toggle";

export const AnimatedCard = styled(LightCard)<{ expand: boolean }>`
  padding: 0.75rem;
  margin-top: 0.5rem;
`;

export const ArrowWrapper = styled.div`
  padding: 4px;
  border-radius: 12px;
  height: 32px;
  width: 32px;
  position: relative;
  margin-top: -18px;
  margin-bottom: -18px;
  left: calc(50% - 16px);
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.bg1};
  z-index: 2;
`;

export default function SwapModalHeader({
  trade,
  recipient,
  showAcceptChanges,
  onAcceptChanges,
  onDisclaimerChange,
}: {
  trade?: Trade<Currency, Currency, TradeType>;
  recipient: string | null;
  showAcceptChanges: boolean;
  onAcceptChanges: () => void;
  onDisclaimerChange: Dispatch<SetStateAction<boolean>>;
}) {
  const theme = useTheme();

  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(true);
  const [disclaimer, setDisclaimer] = useState<boolean>(false);
  const [showInverted, setShowInverted] = useState<boolean>(true);

  const {
    derivedOrderInfo: { price, parsedAmounts, rawAmounts },
  } = useGelatoStopLimitOrders();

  const library = useGelatoStopLimitOrdersLib();

  useEffect(() => {
    onDisclaimerChange(disclaimer);
  }, []);

  const inputAmount = parsedAmounts.input;
  const outputAmount = parsedAmounts.output;

  const fiatValueInput = useUSDCValue(inputAmount);
  const fiatValueOutput = useUSDCValue(outputAmount);

  const rawOutputAmount = rawAmounts.output ?? "0";

  const handleDisclaimer = (value: boolean) => {
    onDisclaimerChange(value);
    setDisclaimer(value);
  };

  const { minReturn } = useMemo(() => {
    if (!outputAmount || !library)
      return {
        minReturn: undefined,
      };

    const { minReturn } = library.getFeeAndSlippageAdjustedMinReturn(
      rawOutputAmount
    );

    const minReturnParsed = CurrencyAmount.fromRawAmount(
      outputAmount.currency,
      minReturn
    );

    return {
      minReturn: minReturnParsed,
    };
  }, [outputAmount, library, rawOutputAmount]);

  const limitPrice = useMemo(
    () =>
      minReturn && minReturn.greaterThan(0) && inputAmount
        ? new Price({
            quoteAmount: minReturn,
            baseAmount: inputAmount,
          })
        : undefined,
    [inputAmount, minReturn]
  );

  if (!inputAmount || !outputAmount || !outputAmount || !library) return null;

  return (
    <AutoColumn gap={"4px"} style={{ marginTop: "1rem" }}>
      <DarkGreyCard padding="0.75rem 1rem">
        <AutoColumn gap={"8px"}>
          <RowBetween>
            <TYPE.body color={theme.text3} fontWeight={500} fontSize={14}>
              From
            </TYPE.body>
            <FiatValue fiatValue={fiatValueInput} />
          </RowBetween>
          <RowBetween align="center">
            <RowFixed gap={"0px"}>
              <CurrencyLogo
                currency={inputAmount.currency}
                size={"20px"}
                style={{ marginRight: "12px" }}
              />
              <Text fontSize={20} fontWeight={500}>
                {inputAmount.currency.symbol}
              </Text>
            </RowFixed>
            <RowFixed gap={"0px"}>
              <TruncatedText
                fontSize={24}
                fontWeight={500}
                color={
                  showAcceptChanges &&
                  trade?.tradeType === TradeType.EXACT_OUTPUT
                    ? theme.primary1
                    : ""
                }
              >
                {inputAmount.toSignificant(6)}
              </TruncatedText>
            </RowFixed>
          </RowBetween>
        </AutoColumn>
      </DarkGreyCard>
      <ArrowWrapper>
        <ArrowDown size="16" color={theme.text2} />
      </ArrowWrapper>
      <DarkGreyCard padding="0.75rem 1rem" style={{ marginBottom: "0.25rem" }}>
        <AutoColumn gap={"8px"}>
          <RowBetween>
            <TYPE.body color={theme.text3} fontWeight={500} fontSize={14}>
              To
            </TYPE.body>
            <TYPE.body fontSize={14} color={theme.text3}>
              <FiatValue
                fiatValue={fiatValueOutput}
                priceImpact={computeFiatValuePriceImpact(
                  fiatValueInput,
                  fiatValueOutput
                )}
              />
            </TYPE.body>
          </RowBetween>
          <RowBetween align="flex-end">
            <RowFixed gap={"0px"}>
              <CurrencyLogo
                currency={outputAmount.currency}
                size={"20px"}
                style={{ marginRight: "12px" }}
              />
              <Text fontSize={20} fontWeight={500}>
                {outputAmount.currency.symbol}
              </Text>
            </RowFixed>
            <RowFixed gap={"0px"}>
              <TruncatedText fontSize={24} fontWeight={500}>
                {outputAmount.toSignificant(6)}
              </TruncatedText>
            </RowFixed>
          </RowBetween>
        </AutoColumn>
      </DarkGreyCard>
      <RowBetween style={{ marginTop: "0.25rem", padding: "0 1rem" }}>
        <TYPE.body color={theme.text2} fontWeight={500} fontSize={14}>
          {"Stop Price:"}
        </TYPE.body>
        <TradePrice
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          price={price!}
          showInverted={showInverted}
          setShowInverted={setShowInverted}
        />
      </RowBetween>
      <RowBetween style={{ marginTop: "0.15rem", padding: "0 1rem" }}>
        <TYPE.body color={theme.text2} fontWeight={500} fontSize={14}>
          {"Limit Price:"}
        </TYPE.body>
        <TradePrice
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          price={limitPrice!}
          showInverted={showInverted}
          setShowInverted={setShowInverted}
        />
      </RowBetween>
      <LightCard style={{ padding: ".75rem", marginTop: "0.5rem" }}>
        <AdvancedSwapDetails />
      </LightCard>

      {showDisclaimer && (
        <AnimatedCard
          style={{ padding: ".75rem", marginTop: "0.5rem" }}
          expand={showDisclaimer}
        >
          <DisclaimerText />
        </AnimatedCard>
      )}

      <RowBetween style={{ marginTop: "0.25rem", padding: "0 1rem" }}>
        <TYPE.link
          color={theme.blue1}
          fontWeight={500}
          fontSize={14}
          style={{ cursor: "pointer" }}
          onClick={() => setShowDisclaimer(!showDisclaimer)}
        >
          {!showDisclaimer ? "Show Disclaimer" : "Hide Disclaimer"}
        </TYPE.link>
        <Toggle
          name={"disclaimer"}
          disabled={false}
          checked={disclaimer}
          value={""}
          onChange={() => handleDisclaimer(!disclaimer)}
          labelLeft={"Accept Disclaimer"}
          labelRight={""}
          height={24}
          sliderHeight={16}
          width={44}
          sliderWidth={16}
          translate={22}
        />
      </RowBetween>

      {showAcceptChanges ? (
        <SwapShowAcceptChanges justify="flex-start" gap={"0px"}>
          <RowBetween>
            <RowFixed>
              <AlertTriangle
                size={20}
                style={{ marginRight: "8px", minWidth: 24 }}
              />
              <TYPE.main color={theme.primary1}> Price Updated</TYPE.main>
            </RowFixed>
            <ButtonPrimary
              style={{
                padding: ".5rem",
                width: "fit-content",
                fontSize: "0.825rem",
                borderRadius: "12px",
              }}
              onClick={onAcceptChanges}
            >
              Accept
            </ButtonPrimary>
          </RowBetween>
        </SwapShowAcceptChanges>
      ) : null}
      {recipient !== null ? (
        <AutoColumn
          justify="center"
          gap="sm"
          style={{ padding: "12px 0 0 0px" }}
        >
          <TYPE.main>
            Output will be sent to{" "}
            <b title={recipient}>
              {isAddress(recipient) ? shortenAddress(recipient) : recipient}
            </b>
          </TYPE.main>
        </AutoColumn>
      ) : null}
    </AutoColumn>
  );
}
