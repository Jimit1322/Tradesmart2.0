from pymongo import MongoClient
from datetime import datetime, timedelta

client = MongoClient("mongodb://localhost:27017")
db = client["tradesmart"]

def summarize_strategy(collection_name, strategy_name):
    collection = db[collection_name]
    today = datetime.today()
    last_monday = today - timedelta(days=today.weekday() + 7)  # start of last week
    last_sunday = last_monday + timedelta(days=6)

    # Get all trades from last week
    trades = list(collection.find({
        "strategy": strategy_name,
        "scan_date": {
            "$gte": last_monday.strftime("%Y-%m-%d"),
            "$lte": last_sunday.strftime("%Y-%m-%d")
        }
    }))

    if not trades:
        print(f"ℹ️ No trades to summarize for {strategy_name}")
        return

    total = len(trades)
    wins = sum(1 for t in trades if t.get("status") == "win")
    losses = sum(1 for t in trades if t.get("status") == "loss")

    win_rate = round((wins / total) * 100, 2) if total else 0.0
    loss_rate = round((losses / total) * 100, 2) if total else 0.0

    # Save to summary collection
    db["weekly_summary"].insert_one({
        "strategy": strategy_name,
        "week_start": last_monday.strftime("%Y-%m-%d"),
        "week_end": last_sunday.strftime("%Y-%m-%d"),
        "total_trades": total,
        "wins": wins,
        "losses": losses,
        "win_rate": win_rate,
        "loss_rate": loss_rate,
        "created_at": datetime.utcnow()
    })

    print(f"✅ Weekly summary saved for {strategy_name} — {win_rate}% win")

    # Delete old trades from last week
    deleted = collection.delete_many({
        "strategy": strategy_name,
        "scan_date": {
            "$gte": last_monday.strftime("%Y-%m-%d"),
            "$lte": last_sunday.strftime("%Y-%m-%d")
        }
    })
    print(f"🗑️ Deleted {deleted.deleted_count} trades from last week ({strategy_name})")


# Run for both strategies
summarize_strategy("scan_1m", "1m_momentum")
summarize_strategy("scan_5m", "5m_momentum")
