# OKX Derivatives Dashboard

A real-time dashboard for OKX perpetual SWAP derivatives with Ginarea integration.

## 🌟 Features

- **Real-time data** from OKX API v5
- **Multiple timeframes**: 1H, 4H, 12H, 24H, 7D
- **Top Gainers & Losers**: Automatic sorting by price change
- **Ginarea integration**: Visual indicators for available pairs
- **Search functionality**: Filter by ticker
- **Auto-refresh**: Updates every hour
- **Responsive design**: Works on desktop and mobile

## 🚀 Live Demo

[View Live Dashboard](https://your-username.github.io/okx-dash/)

## 📊 Data Sources

- **OKX API v5**: Public endpoints for market data
- **Ginarea pairs**: Custom list of available trading pairs

## 🛠️ Technologies

- **HTML5**: Structure
- **CSS3**: Modern styling with dark theme
- **JavaScript**: Vanilla JS with ES6+ features
- **OKX API**: Real-time market data

## 📁 Project Structure

```
okx-dash/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── main.js             # JavaScript logic
├── ginarea-tickers.json # Ginarea pairs list
└── README.md           # This file
```

## 🔧 Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/okx-dash.git
   cd okx-dash
   ```

2. **Open in browser**:
   - Double-click `index.html`
   - Or use Live Server in VS Code

## 🌐 Deploy to GitHub Pages

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to repository Settings
   - Scroll to "Pages" section
   - Select "Deploy from a branch"
   - Choose "main" branch
   - Save

3. **Your site will be available at**:
   `https://your-username.github.io/okx-dash/`

## 📈 API Endpoints Used

- `GET /api/v5/market/tickers?instType=SWAP` - Main ticker data
- `GET /api/v5/market/candles?instId={symbol}&bar={timeframe}&limit={count}` - Detailed candle data

## 🎯 Ginarea Integration

The dashboard highlights pairs available on [Ginarea](https://ginarea.org/faq/markets) with a green indicator (🟢).

## 🔄 Auto-refresh

- **Data refresh**: Every hour
- **Full refresh**: Every hour
- **Manual refresh**: Available via button

## 📱 Responsive Design

- **Desktop**: Two-column layout
- **Mobile**: Single-column layout
- **Tablet**: Adaptive grid

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- [OKX API Documentation](https://www.okx.com/docs-v5/)
- [Ginarea Markets](https://ginarea.org/faq/markets)
- [Live Dashboard](https://your-username.github.io/okx-dash/)

---

Made with ❤️ for the crypto community

