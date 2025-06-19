<!-- TradeSmart – Real-Time Momentum Stock Scanner
React | Node.js | Express | Python | yFinance | REST API | Lightweight-Charts

1.Engineered a full-stack momentum scanner that identifies intraday trading opportunities by analyzing 5-minute OHLC data and computing 22-period Exponential Moving Averages (EMA) for NSE stocks using yfinance.
2.Implemented a Python-based data pipeline to fetch and preprocess live stock data, calculate EMA-22, and serialize results into JSON format, forming the data backbone of the application.
3.Built a RESTful API using Node.js and Express that interfaces with Python scripts, handles dynamic symbol-based data retrieval, and returns filtered stocks matching momentum criteria (close price within 0.5% of EMA22).
4.Developed a responsive React frontend with lightweight-charts to visualize candlestick patterns and EMA lines in real-time, integrated stock CSV export, and applied consistent UI styling for trader-friendly interaction. -->

#  TradeSmart – Real-Time Momentum Stock Scanner

A full-stack web application that scans NSE-listed stocks to identify real-time momentum opportunities using technical indicators. The system leverages 5-minute OHLC data and computes 22-period Exponential Moving Averages (EMA) to filter stocks that are trading near momentum zones.

## Tech Stack

- **Frontend**: React, Lightweight-Charts
- **Backend**: Node.js, Express (REST API)
- **Data Processing**: Python, yFinance
- **Other**: Pandas, Blob CSV Export, JSON, Styled Components

##  Key Features

-  **Stock Momentum Detection**  
  Fetches 5-minute interval data for the last X days and filters stocks whose latest price is within Y% of the 22 EMA using `yfinance` and Pandas.

- **Backend REST API Integration**  
  Node.js Express server triggers Python scripts and serves processed stock data via custom REST API endpoints (e.g., `/api/scan`, `/api/ohlc/:symbol`).

-  **Candlestick Chart Visualization**  
  React frontend displays candlestick charts using `lightweight-charts`, with overlay of 22 EMA line for clear momentum insight.

-  **CSV Export**  
  Download filtered stock data in CSV format directly from the frontend for quick analysis or import into trading platforms.

##  Getting Started

1. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ## for backend
   cd backend
   node server.js or nodemon server.js
   ## for frontend(open in another terminal)
   cd frontend
   npm run dev


   
