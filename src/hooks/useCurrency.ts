import { useState, useEffect, useCallback, useMemo } from "react";

export const SUPPORTED_CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "CHF", symbol: "Fr", label: "Swiss Franc" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
];

export function useCurrency() {
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem("dashboard-currency") || "USD";
  });
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(() => {
    const cached = localStorage.getItem("exchange-rates");
    return cached ? JSON.parse(cached) : {};
  });
  const [refreshingRate, setRefreshingRate] = useState(false);

  const setCurrency = useCallback((val: string) => {
    setCurrencyState(val);
    localStorage.setItem("dashboard-currency", val);
  }, []);

  const fetchExchangeRates = useCallback(async (force = false) => {
    const CACHE_KEY = "exchange-rates";
    const CACHE_TS_KEY = "exchange-rates-ts";
    const CACHE_DURATION = 24 * 60 * 60 * 1000;

    if (!force) {
      const cachedTs = localStorage.getItem(CACHE_TS_KEY);
      if (cachedTs && Date.now() - parseInt(cachedTs) < CACHE_DURATION) return;
    }

    setRefreshingRate(true);
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const data = await res.json();
      if (data.rates) {
        setExchangeRates(data.rates);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data.rates));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
      }
    } catch {
      // silently fail, use cached
    } finally {
      setRefreshingRate(false);
    }
  }, []);

  useEffect(() => {
    if (currency !== "USD") {
      fetchExchangeRates();
    }
  }, [currency, fetchExchangeRates]);

  const currentCurrencyInfo = useMemo(
    () => SUPPORTED_CURRENCIES.find(c => c.code === currency) || SUPPORTED_CURRENCIES[0],
    [currency]
  );

  const currentRate = exchangeRates[currency] || 1;

  const fmt = useCallback((usdAmount: number, decimals = 2) => {
    if (currency === "USD") return `$${usdAmount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    const converted = usdAmount * (exchangeRates[currency] || 1);
    const sym = (SUPPORTED_CURRENCIES.find(c => c.code === currency) || SUPPORTED_CURRENCIES[0]).symbol;
    return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }, [currency, exchangeRates]);

  const fmtSigned = useCallback((usdAmount: number, decimals = 2) => {
    const prefix = usdAmount > 0 ? "+" : "";
    return prefix + fmt(usdAmount, decimals);
  }, [fmt]);

  return {
    currency,
    setCurrency,
    exchangeRates,
    refreshingRate,
    fetchExchangeRates,
    currentCurrencyInfo,
    currentRate,
    fmt,
    fmtSigned,
  };
}
