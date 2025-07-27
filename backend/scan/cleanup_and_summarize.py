from pymongo import MongoClient
from datetime import datetime, timedelta

client = MongoClient("mongodb://localhost:27017")
db = client["tradesmart"]

def summarize_strategy(collection_name, strategy_name):
    collection = db[collection_name]
    today = datetime.today()

    # Get this week's Monday and Friday
    this_monday = today - timedelta(days=today.weekday())  # Monday of current week
    this_friday = this_monday + timedelta(days=4)          # Friday of current week

    # Filter only this week's data (Monday to Friday)
    trades = list(collection.find({
        "strategy": strategy_name,
        "scan_date": {
            "$gte": this_monday.strftime("%Y-%m-%d"),
            "$lte": this_friday.strftime("%Y-%m-%d")
        }
    }))

    if not trades:
        print(f"ℹ️ No trades to summarize for {strategy_name}")
        return

    total = len(trades)
    wins = sum(1 for t in trades if t.get("status") == "win")
    losses = sum(1 for t in trades if t.get("status") == "loss")

    win_rate = round((wins / (wins + losses)) * 100, 2) if (wins + losses) else 0.0
    loss_rate = round((losses / (wins + losses)) * 100, 2) if (wins + losses) else 0.0

    # Save to summary collection
    db["weekly_summary"].insert_one({
        "strategy": strategy_name,
        "week_start": this_monday.strftime("%Y-%m-%d"),
        "week_end": this_friday.strftime("%Y-%m-%d"),
        "total_trades": total,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "loss_rate": loss_rate,
        "created_at": datetime.utcnow()
    })

    print(f"✅ Weekly summary saved for {strategy_name} — {win_rate}% win")

    # Delete this week's trades
    deleted = collection.delete_many({
        "strategy": strategy_name,
        "scan_date": {
            "$gte": this_monday.strftime("%Y-%m-%d"),
            "$lte": this_friday.strftime("%Y-%m-%d")
        }
    })
    print(f"🗑️ Deleted {deleted.deleted_count} trades from this week ({strategy_name})")

# Run for both strategies
summarize_strategy("scan_1m", "1m_momentum")
summarize_strategy("scan_5m", "5m_momentum")
