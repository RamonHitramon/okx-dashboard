class OKXDashboard {
    constructor() {
        this.data = [];
        this.filteredData = [];
        this.timeWindow = '4h';
        this.searchTerm = '';
        this.sortColumn = 'volume';
        this.sortDirection = 'desc';
        this.topN = 50;
        this.lastUpdate = null;
        this.updateInterval = null;
        this.fullRefreshInterval = null;
        this.ginareaTickers = new Set();
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadGinareaTickers();
        await this.loadData();
        this.startAutoRefresh();
    }

    bindEvents() {
        // Time window buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                
                this.timeWindow = e.target.dataset.time;
                this.loadData();
            });
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterAndRender();
        });

        // Manual refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });
    }

    async loadGinareaTickers() {
        try {
            const response = await fetch('ginarea-tickers.json');
            if (response.ok) {
                const data = await response.json();
                this.ginareaTickers = new Set(data.ginarea_tickers || []);
                console.log(`Loaded ${this.ginareaTickers.size} Ginarea tickers`);
            }
        } catch (error) {
            console.warn('Could not load Ginarea tickers:', error);
        }
    }

    async loadData() {
        try {
            this.showLoading();
            
            // Load main tickers data
            const tickersData = await this.fetchTickers();
            
            // Filter USDT-SWAP contracts
            const swapData = tickersData.filter(item => 
                item.instId.endsWith('-USDT-SWAP')
            );

            // Get top N by volume for detailed data
            const topByVolume = swapData
                .sort((a, b) => {
                    const volA = parseFloat(a.vol24h || 0) * parseFloat(a.last || 0);
                    const volB = parseFloat(b.vol24h || 0) * parseFloat(b.last || 0);
                    return volB - volA;
                })
                .slice(0, this.topN);

            // Load detailed candle data for top N
            const detailedData = await this.fetchDetailedData(topByVolume);
            
            // Merge and process data
            this.data = this.processData(swapData, detailedData);
            console.log('Processed data:', this.data.length, 'items');
            this.filterAndRender();
            this.updateLastUpdate();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Please try again.');
        }
    }

    async fetchTickers() {
        const response = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP');
        const data = await response.json();
        
        if (data.code !== '0') {
            throw new Error(`API Error: ${data.msg}`);
        }
        
        return data.data || [];
    }

    async fetchDetailedData(topData) {
        const detailedData = {};
        
        // Always fetch 1H candles with limit=169 to cover all time windows (7d = 168 hours + current)
        console.log(`Fetching 1H candles with limit=169 for all time windows`);
        
        // Throttle requests to avoid rate limiting
        for (let i = 0; i < topData.length; i += 3) {
            const batch = topData.slice(i, i + 3);
            const promises = batch.map(async (item) => {
                try {
                    const response = await fetch(
                        `https://www.okx.com/api/v5/market/candles?instId=${item.instId}&bar=1H&limit=169`
                    );
                    const data = await response.json();
                    
                    if (data.code === '0' && data.data) {
                        return {
                            instId: item.instId,
                            candles: data.data
                        };
                    }
                } catch (error) {
                    console.warn(`Failed to fetch candles for ${item.instId}:`, error);
                }
                return null;
            });
            
            const results = await Promise.all(promises);
            results.forEach(result => {
                if (result) {
                    detailedData[result.instId] = result.candles;
                }
            });
            
            // Small delay between batches
            if (i + 3 < topData.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        return detailedData;
    }

    // Utility function to calculate price change for any time window
    calcDelta(candles, last, hoursBack) {
        if (!candles || candles.length <= hoursBack) {
            return null; // Not enough data
        }
        
        const candle = candles[hoursBack];
        if (!candle || !candle[1]) {
            return null; // Invalid candle data
        }
        
        const openPrice = parseFloat(candle[1]);
        if (openPrice <= 0) {
            return null; // Invalid open price
        }
        
        return ((last - openPrice) / openPrice) * 100;
    }

    processData(tickersData, detailedData) {
        return tickersData.map(item => {
            const last = parseFloat(item.last);
            const vol24h = parseFloat(item.vol24h || '0');
            const volume24h = vol24h * last; // Always use vol24h * last
            
            console.log(`Volume calculation for ${item.instId}: vol24h=${vol24h}, last=${last}, volume24h=${volume24h}`);
            
            // Calculate all price changes using 1H candles
            const candles = detailedData[item.instId] || [];
            const priceChange1h = this.calcDelta(candles, last, 1);  // 1 hour ago
            const priceChange4h = this.calcDelta(candles, last, 4);  // 4 hours ago
            const priceChange12h = this.calcDelta(candles, last, 12); // 12 hours ago
            const priceChange24h = this.calcDelta(candles, last, 24); // 24 hours ago
            const priceChange7d = this.calcDelta(candles, last, 168); // 7 days ago (168 hours)
            
            // Log calculations for debugging
            if (candles.length > 0) {
                console.log(`${item.instId} price changes: 1H=${priceChange1h?.toFixed(2)}%, 4H=${priceChange4h?.toFixed(2)}%, 12H=${priceChange12h?.toFixed(2)}%, 24H=${priceChange24h?.toFixed(2)}%, 7D=${priceChange7d?.toFixed(2)}%`);
            }
            
            return {
                ticker: item.instId,
                last: last,
                priceChange1h: priceChange1h,
                priceChange4h: priceChange4h,
                priceChange12h: priceChange12h,
                priceChange24h: priceChange24h,
                priceChange7d: priceChange7d,
                volume: volume24h,
                hasData: true
            };
        });
    }

    filterAndRender() {
        console.log('Starting filterAndRender with', this.data.length, 'items');
        
        // Filter by search term
        this.filteredData = this.data.filter(item =>
            item.ticker.toLowerCase().includes(this.searchTerm)
        );
        
        console.log('Filtered data:', this.filteredData.length, 'items');
        
        // Get the appropriate price change field based on selected time window
        const getPriceChange = (item) => {
            switch (this.timeWindow) {
                case '1h': return item.priceChange1h;
                case '4h': return item.priceChange4h;
                case '12h': return item.priceChange12h;
                case '24h': return item.priceChange24h;
                case '7d': return item.priceChange7d;
                default: return item.priceChange4h;
            }
        };
        
        // Split into gainers and losers
        const gainers = this.filteredData
            .filter(item => getPriceChange(item) !== null && getPriceChange(item) > 0)
            .sort((a, b) => getPriceChange(b) - getPriceChange(a));
            
        const losers = this.filteredData
            .filter(item => getPriceChange(item) !== null && getPriceChange(item) < 0)
            .sort((a, b) => getPriceChange(a) - getPriceChange(b));
            
        // Add neutral items (priceChange = 0 or null) to balance the lists
        const neutral = this.filteredData.filter(item => {
            const change = getPriceChange(item);
            return change === null || change === 0;
        });
        
        console.log('Distribution:', { gainers: gainers.length, losers: losers.length, neutral: neutral.length });
        
        // Distribute neutral items to balance gainers and losers
        const halfNeutral = Math.ceil(neutral.length / 2);
        gainers.push(...neutral.slice(0, halfNeutral));
        losers.push(...neutral.slice(halfNeutral));
        
        // Show exactly 10 results for each category, fill with empty rows if needed
        const topGainers = gainers.slice(0, 10);
        const topLosers = losers.slice(0, 10);
        
        // Fill arrays to exactly 10 items
        while (topGainers.length < 10) {
            topGainers.push({ ticker: '', priceChange: 0, volume: 0, hasData: false, isEmpty: true });
        }
        while (topLosers.length < 10) {
            topLosers.push({ ticker: '', priceChange: 0, volume: 0, hasData: false, isEmpty: true });
        }
        
        console.log('Rendering tables with', topGainers.length, 'gainers and', topLosers.length, 'losers');
        this.renderTables(topGainers, topLosers);
    }

    renderTables(gainers, losers) {
        console.log('renderTables called with', gainers.length, 'gainers and', losers.length, 'losers');
        this.renderTable('gainersBody', gainers);
        this.renderTable('losersBody', losers);
    }

    renderTable(tbodyId, data) {
        console.log('renderTable called for', tbodyId, 'with', data.length, 'items');
        const tbody = document.getElementById(tbodyId);
        
        if (!tbody) {
            console.error('Could not find tbody with id:', tbodyId);
            return;
        }
        
        tbody.innerHTML = data.map(item => {
            // Handle empty rows
            if (item.isEmpty) {
                return `
                    <tr class="empty-row">
                        <td class="ticker">-</td>
                        <td>-</td>
                        <td class="volume">-</td>
                    </tr>
                `;
            }
            
            // Get the appropriate price change based on selected time window
            let priceChange;
            switch (this.timeWindow) {
                case '1h': priceChange = item.priceChange1h; break;
                case '4h': priceChange = item.priceChange4h; break;
                case '12h': priceChange = item.priceChange12h; break;
                case '24h': priceChange = item.priceChange24h; break;
                case '7d': priceChange = item.priceChange7d; break;
                default: priceChange = item.priceChange4h; // fallback to 4h
            }
            
            const volume = item.volume;
            const isGinarea = this.ginareaTickers.has(item.ticker);
            
            // Show "..." if no data available for the selected time window
            const priceChangeDisplay = priceChange !== null ? `${priceChange.toFixed(2)}%` : '…';
            const changeClass = priceChange !== null ? this.getChangeClass(priceChange) : 'neutral';
            
            return `
                <tr>
                    <td class="ticker">
                        ${isGinarea ? '<span class="ginarea-logo" title="Available on Ginarea">🟢</span>' : ''}
                        ${item.ticker}
                    </td>
                    <td class="${changeClass}">${priceChangeDisplay}</td>
                    <td class="volume">${this.formatVolume(volume)}</td>
                </tr>
            `;
        }).join('');
        
        console.log('Rendered', tbodyId, 'successfully');
    }

    getChangeClass(value) {
        if (value > 0) return 'positive';
        if (value < 0) return 'negative';
        return 'neutral';
    }

    formatVolume(volume) {
        if (volume === 0 || isNaN(volume)) {
            return '0';
        }
        
        if (volume >= 1e9) {
            return (volume / 1e9).toFixed(2) + 'B';
        } else if (volume >= 1e6) {
            return (volume / 1e6).toFixed(2) + 'M';
        } else if (volume >= 1e3) {
            return (volume / 1e3).toFixed(2) + 'K';
        }
        return volume.toFixed(2);
    }

    getChangeClass(value) {
        if (value > 0) return 'positive';
        if (value < 0) return 'negative';
        return 'neutral';
    }

    updateLastUpdate() {
        this.lastUpdate = new Date();
        const timeString = this.lastUpdate.toLocaleTimeString();
        document.getElementById('lastUpdate').textContent = `Last update: ${timeString}`;
    }

    startAutoRefresh() {
        // Auto refresh every hour
        this.updateInterval = setInterval(() => {
            this.loadData();
        }, 60 * 60 * 1000); // 1 hour
        
        // Full refresh every hour (same as auto refresh for now)
        this.fullRefreshInterval = setInterval(() => {
            this.loadData();
        }, 60 * 60 * 1000); // 1 hour
    }

    stopAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.fullRefreshInterval) {
            clearInterval(this.fullRefreshInterval);
        }
    }

    showLoading() {
        const gainersBody = document.getElementById('gainersBody');
        const losersBody = document.getElementById('losersBody');
        gainersBody.innerHTML = '<tr><td colspan="3" class="loading">Loading data...</td></tr>';
        losersBody.innerHTML = '<tr><td colspan="3" class="loading">Loading data...</td></tr>';
    }

    showError(message) {
        const gainersBody = document.getElementById('gainersBody');
        const losersBody = document.getElementById('losersBody');
        gainersBody.innerHTML = `<tr><td colspan="3" class="loading">${message}</td></tr>`;
        losersBody.innerHTML = `<tr><td colspan="3" class="loading">${message}</td></tr>`;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing dashboard...');
    new OKXDashboard();
});
