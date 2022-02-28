import { useCallback, useEffect, useMemo, useState } from "react";
import { StopLimitOrder } from "@gelatonetwork/limit-orders-lib";
import { useWeb3 } from "../../web3";
import {
  getLSOrders,
  saveStopOrder,
  clearOrdersLocalStorage,
} from "../../utils/localStorageStopOrders";
import useInterval from "../useInterval";
import { useSelector } from "react-redux";
import { AppState } from "../../state";
import useGelatoStopLimitOrdersLib from "./useGelatoStopLimitOrdersLib";

export interface GelatoStopLimitOrdersHistory {
  open: { pending: StopLimitOrder[]; confirmed: StopLimitOrder[] };
  cancelled: { pending: StopLimitOrder[]; confirmed: StopLimitOrder[] };
  executed: StopLimitOrder[];
  expired: StopLimitOrder[];
  clearLocalStorageAndRefetchDataFromSubgraph: () => void;
}
function newOrdersFirst(a: StopLimitOrder, b: StopLimitOrder) {
  return Number(b.updatedAt) - Number(a.updatedAt);
}

export default function useGelatoStopLimitOrdersHistory(): GelatoStopLimitOrdersHistory {
  const { account, chainId } = useWeb3();

  const gelatoStopLimitOrders = useGelatoStopLimitOrdersLib();

  const [openOrders, setOpenOrders] = useState<{
    pending: StopLimitOrder[];
    confirmed: StopLimitOrder[];
  }>({ pending: [], confirmed: [] });
  const [cancelledOrders, setCancelledOrders] = useState<{
    pending: StopLimitOrder[];
    confirmed: StopLimitOrder[];
  }>({ pending: [], confirmed: [] });
  const [executedOrders, setExecutedOrders] = useState<StopLimitOrder[]>([]);
  const [expiredOrders, setExpiredOrders] = useState<StopLimitOrder[]>([]);

  const state = useSelector<AppState, AppState["gstoplimittransactions"]>(
    (state) => state.gstoplimittransactions
  ) as any;

  const transactions = useMemo(() => (chainId ? state[chainId] ?? {} : {}), [
    chainId,
    state,
  ]);

  const fetchOpenOrders = useCallback(() => {
    if (gelatoStopLimitOrders && account && chainId)
      gelatoStopLimitOrders
        .getOpenStopLimitOrders(account.toLowerCase())
        .then(async (orders: StopLimitOrder[]) => {
          const ordersLS = getLSOrders(chainId, account);
          orders.forEach((order: StopLimitOrder) => {
            const orderExists = ordersLS.find(
              (confOrder) =>
                confOrder.id.toLowerCase() === order.id.toLowerCase()
            );

            if (
              !orderExists ||
              (orderExists &&
                Number(orderExists.updatedAt) < Number(order.updatedAt)) ||
              orderExists.isExpired !== order.isExpired
            ) {
              saveStopOrder(chainId, account, order);
            }
          });

          const openOrdersLS = getLSOrders(chainId, account).filter(
            (order) => order.status === "open"
          );

          setExpiredOrders(
            orders.filter((order) => order.status === "open" && order.isExpired)
          );

          const pendingOrdersLS = getLSOrders(chainId, account, true);

          setOpenOrders({
            confirmed: openOrdersLS
              .filter((order) => !order.isExpired)
              .filter((order: StopLimitOrder) => {
                const orderCancelled = pendingOrdersLS
                  .filter((pendingOrder) => pendingOrder.status === "cancelled")
                  .find(
                    (pendingOrder) =>
                      pendingOrder.id.toLowerCase() === order.id.toLowerCase()
                  );
                return orderCancelled ? false : true;
              })
              .sort(newOrdersFirst),
            pending: pendingOrdersLS
              .filter((order) => order.status === "open")
              .sort(newOrdersFirst),
          });
        })
        .catch((e: Error) => {
          console.error("Error fetching open orders from subgraph", e);
          const openOrdersLS = getLSOrders(chainId, account).filter(
            (order) => order.status === "open"
          );

          const pendingOrdersLS = getLSOrders(chainId, account, true);

          setExpiredOrders(
            openOrdersLS.filter(
              (order) => order.status === "open" && order.isExpired
            )
          );

          setOpenOrders({
            confirmed: openOrdersLS
              .filter((order) => !order.isExpired)
              .filter((order: StopLimitOrder) => {
                const orderCancelled = pendingOrdersLS
                  .filter((pendingOrder) => pendingOrder.status === "cancelled")
                  .find(
                    (pendingOrder) =>
                      pendingOrder.id.toLowerCase() === order.id.toLowerCase()
                  );
                return orderCancelled ? false : true;
              })
              .sort(newOrdersFirst),
            pending: pendingOrdersLS
              .filter((order) => order.status === "open")
              .sort(newOrdersFirst),
          });
        });
  }, [gelatoStopLimitOrders, account, chainId]);

  const fetchCancelledOrders = useCallback(() => {
    if (gelatoStopLimitOrders && account && chainId)
      gelatoStopLimitOrders
        .getCancelledStopLimitOrders(account.toLowerCase())
        .then(async (orders: StopLimitOrder[]) => {
          const ordersLS = getLSOrders(chainId, account);

          orders.forEach((order: StopLimitOrder) => {
            const orderExists = ordersLS.find(
              (confOrder) =>
                confOrder.id.toLowerCase() === order.id.toLowerCase()
            );
            if (
              !orderExists ||
              (orderExists &&
                Number(orderExists.updatedAt) < Number(order.updatedAt))
            ) {
              saveStopOrder(chainId, account, order);
            }
          });

          const cancelledOrdersLS = getLSOrders(chainId, account).filter(
            (order) => order.status === "cancelled"
          );

          const pendingCancelledOrdersLS = getLSOrders(
            chainId,
            account,
            true
          ).filter((order) => order.status === "cancelled");

          setCancelledOrders({
            confirmed: cancelledOrdersLS.sort(newOrdersFirst),
            pending: pendingCancelledOrdersLS.sort(newOrdersFirst),
          });
        })
        .catch((e: Error) => {
          console.error("Error fetching cancelled orders from subgraph", e);

          const cancelledOrdersLS = getLSOrders(chainId, account).filter(
            (order) => order.status === "cancelled"
          );

          const pendingCancelledOrdersLS = getLSOrders(
            chainId,
            account,
            true
          ).filter((order) => order.status === "cancelled");

          setCancelledOrders({
            confirmed: cancelledOrdersLS.sort(newOrdersFirst),
            pending: pendingCancelledOrdersLS.sort(newOrdersFirst),
          });
        });
  }, [gelatoStopLimitOrders, account, chainId]);

  const fetchExecutedOrders = useCallback(async () => {
    if (gelatoStopLimitOrders && account && chainId)
      gelatoStopLimitOrders
        .getExecutedStopLimitOrders(account)
        .then(async (orders: StopLimitOrder[]) => {
          const ordersLS = getLSOrders(chainId, account);

          orders.forEach((order: StopLimitOrder) => {
            const orderExists = ordersLS.find(
              (confOrder) =>
                confOrder.id.toLowerCase() === order.id.toLowerCase()
            );
            if (
              !orderExists ||
              (orderExists &&
                Number(orderExists.updatedAt) < Number(order.updatedAt))
            ) {
              saveStopOrder(chainId, account, order);
            }
          });

          const executedOrdersLS = getLSOrders(chainId, account).filter(
            (order) => order.status === "executed"
          );

          setExecutedOrders(executedOrdersLS.sort(newOrdersFirst));
        })
        .catch((e: Error) => {
          console.error("Error fetching executed orders from subgraph", e);
          const executedOrdersLS = getLSOrders(chainId, account).filter(
            (order) => order.status === "executed"
          );

          setExecutedOrders(executedOrdersLS.sort(newOrdersFirst));
        });
  }, [gelatoStopLimitOrders, account, chainId]);

  const clearLocalStorageAndRefetchDataFromSubgraph = useCallback(() => {
    clearOrdersLocalStorage();

    setExecutedOrders([]);
    setCancelledOrders({
      confirmed: [],
      pending: [],
    });

    setOpenOrders({
      confirmed: [],
      pending: [],
    });

    fetchOpenOrders();
    fetchCancelledOrders();
    fetchExecutedOrders();
  }, [fetchCancelledOrders, fetchExecutedOrders, fetchOpenOrders]);

  useEffect(() => {
    fetchOpenOrders();
    fetchCancelledOrders();
    fetchExecutedOrders();
  }, [
    fetchCancelledOrders,
    fetchExecutedOrders,
    fetchOpenOrders,
    transactions,
  ]);

  useInterval(fetchOpenOrders, 60000);
  useInterval(fetchCancelledOrders, 60000);
  useInterval(fetchExecutedOrders, 60000);

  return {
    open: openOrders,
    cancelled: cancelledOrders,
    executed: executedOrders,
    expired: expiredOrders,
    clearLocalStorageAndRefetchDataFromSubgraph,
  };
}
