import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import "./Css/ShareCard.css";

interface ShareCardProps {
    netProfit: number;
    totalTrades: number;
    winRate: string;
    winningTrades: number;
    losingTrades: number;
    bestTrade: number;

    userName?: string;
    dateRange?: DateRange;
}

export const ShareCard = ({
    netProfit,
    totalTrades,
    winRate,
    winningTrades,
    losingTrades,
    bestTrade,
    userName = "Trader",
    dateRange,
}: ShareCardProps) => {
    const profitClass = netProfit >= 0 ? "positive" : "negative";
    const formatDate = (date?: Date) => {
        if (!date) return "";
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const dateLabel = dateRange?.from
  ? dateRange.to && dateRange.to !== dateRange.from
    ? `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`
    : formatDate(dateRange.from)
  : "All Time";

    return (
        <div className="px-2 py-2 bg-blue-100">
            <div className="trade-summary-card">


                <div
                    className={`card-header ${!dateRange?.from ? "center-header" : "center-header"}`}
                >
                    <div className="user-info">
                        <div className="user-name name-spacing">{userName}</div>
                        {dateRange?.from && <div className="date-range">{dateLabel}</div>}
                    </div>
                </div>



                <div className="net-profit-section">
                    <p className="label">NET PROFIT</p>
                    <h1 className={`net-profit ${profitClass}`}>
                        {netProfit >= 0 ? "+" : "-"}${Math.abs(netProfit).toFixed(2)}
                    </h1>
                </div>

                <div className="trade-stats">
                    <div className="stat-box">
                        <p className="stat-label">Total Trades</p>
                        <p className="stat-value">{totalTrades}</p>
                    </div>
                    <div className="stat-box">
                        <p className="stat-label">Win Rate</p>
                        <p className="stat-value">{winRate}%</p>
                    </div>
                    <div className="stat-box">
                        <p className="stat-label">Best Trade</p>
                        <p className="stat-value">
                            {bestTrade >= 0 ? "+" : "-"}${Math.abs(bestTrade).toFixed(2)}
                        </p>
                    </div>
                </div>

                <div className="win-loss-breakdown">
                    <div className="breakdown-box">
                        <p className="stat-label">Winning Trades</p>
                        <p className="stat-value green">{winningTrades}</p>
                    </div>
                    <div className="balance-icon">⚖️</div>
                    <div className="breakdown-box">
                        <p className="stat-label">Losing Trades</p>
                        <p className="stat-value red">{losingTrades}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
