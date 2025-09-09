const fs = require('fs');
const https = require('https');

class OKXDataFetcher {
    constructor() {
        this.baseUrl = 'https://www.okx.com/api/v5';
        this.allPairs = [];
    }

    // Функция для выполнения HTTP запросов
    async makeRequest(endpoint) {
        return new Promise((resolve, reject) => {
            const url = `${this.baseUrl}${endpoint}`;
            
            https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON: ${error.message}`));
                    }
                });
            }).on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });
        });
    }

    // Загрузка всех инструментов
    async fetchAllInstruments() {
        console.log('Загружаю все инструменты...');
        
        const instrumentTypes = ['SPOT', 'SWAP', 'FUTURES', 'OPTION'];
        const allInstruments = [];
        
        for (const instType of instrumentTypes) {
            try {
                console.log(`Загружаю ${instType}...`);
                const response = await this.makeRequest(`/public/instruments?instType=${instType}`);
                
                if (response.code === '0' && response.data) {
                    allInstruments.push(...response.data);
                    console.log(`Загружено ${response.data.length} ${instType} инструментов`);
                } else {
                    console.warn(`Ошибка загрузки ${instType}:`, response.msg);
                }
                
                // Небольшая задержка между запросами
                await this.delay(100);
                
            } catch (error) {
                console.error(`Ошибка при загрузке ${instType}:`, error.message);
            }
        }
        
        return allInstruments;
    }

    // Загрузка минимальных размеров ордеров
    async fetchMinOrderSizes() {
        console.log('Загружаю минимальные размеры ордеров...');
        
        try {
            const response = await this.makeRequest('/public/trading-rules');
            
            if (response.code === '0' && response.data) {
                return response.data;
            } else {
                console.warn('Ошибка загрузки правил торговли:', response.msg);
                return [];
            }
        } catch (error) {
            console.error('Ошибка при загрузке правил торговли:', error.message);
            return [];
        }
    }

    // Загрузка тикеров для получения дополнительной информации
    async fetchTickers() {
        console.log('Загружаю данные тикеров...');
        
        const allTickers = [];
        const instrumentTypes = ['SPOT', 'SWAP', 'FUTURES'];
        
        for (const instType of instrumentTypes) {
            try {
                console.log(`Загружаю тикеры ${instType}...`);
                const response = await this.makeRequest(`/market/tickers?instType=${instType}`);
                
                if (response.code === '0' && response.data) {
                    allTickers.push(...response.data);
                    console.log(`Загружено ${response.data.length} тикеров ${instType}`);
                }
                
                await this.delay(100);
                
            } catch (error) {
                console.error(`Ошибка при загрузке тикеров ${instType}:`, error.message);
            }
        }
        
        return allTickers;
    }

    // Объединение данных
    mergeData(instruments, tradingRules, tickers) {
        console.log('Объединяю данные...');
        
        // Создаем Map для быстрого поиска
        const tickersMap = new Map();
        tickers.forEach(ticker => {
            tickersMap.set(ticker.instId, ticker);
        });
        
        const tradingRulesMap = new Map();
        tradingRules.forEach(rule => {
            tradingRulesMap.set(rule.instId, rule);
        });
        
        // Объединяем данные
        const mergedData = instruments.map(instrument => {
            const ticker = tickersMap.get(instrument.instId);
            const rule = tradingRulesMap.get(instrument.instId);
            
            return {
                instId: instrument.instId,
                instType: instrument.instType,
                baseCcy: instrument.baseCcy || '',
                quoteCcy: instrument.quoteCcy || '',
                settleCcy: instrument.settleCcy || '',
                ctVal: instrument.ctVal || '',
                ctMult: instrument.ctMult || '',
                ctValCcy: instrument.ctValCcy || '',
                optType: instrument.optType || '',
                stk: instrument.stk || '',
                listTime: instrument.listTime || '',
                expTime: instrument.expTime || '',
                tickSz: instrument.tickSz || '',
                lotSz: instrument.lotSz || '',
                minSz: instrument.minSz || '',
                maxSz: instrument.maxSz || '',
                maxLmtSz: instrument.maxLmtSz || '',
                maxMktSz: instrument.maxMktSz || '',
                maxTwapSz: instrument.maxTwapSz || '',
                maxIcebergSz: instrument.maxIcebergSz || '',
                maxTriggerSz: instrument.maxTriggerSz || '',
                maxStopSz: instrument.maxStopSz || '',
                last: ticker ? ticker.last : '',
                lastSz: ticker ? ticker.lastSz : '',
                askPx: ticker ? ticker.askPx : '',
                askSz: ticker ? ticker.askSz : '',
                bidPx: ticker ? ticker.bidPx : '',
                bidSz: ticker ? ticker.bidSz : '',
                open24h: ticker ? ticker.open24h : '',
                high24h: ticker ? ticker.high24h : '',
                low24h: ticker ? ticker.low24h : '',
                volCcy24h: ticker ? ticker.volCcy24h : '',
                vol24h: ticker ? ticker.vol24h : '',
                sodUtc0: ticker ? ticker.sodUtc0 : '',
                sodUtc8: ticker ? ticker.sodUtc8 : '',
                ts: ticker ? ticker.ts : '',
                minOrderSize: rule ? rule.minOrderSize : '',
                maxOrderSize: rule ? rule.maxOrderSize : '',
                minOrderValue: rule ? rule.minOrderValue : '',
                maxOrderValue: rule ? rule.maxOrderValue : ''
            };
        });
        
        return mergedData;
    }

    // Сохранение в CSV
    saveToCSV(data, filename) {
        console.log(`Сохраняю данные в ${filename}...`);
        
        if (data.length === 0) {
            console.log('Нет данных для сохранения');
            return;
        }
        
        // Получаем заголовки из первого объекта
        const headers = Object.keys(data[0]);
        
        // Создаем CSV строку
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // Экранируем запятые и кавычки
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        
        // Сохраняем файл
        fs.writeFileSync(filename, csvContent, 'utf8');
        console.log(`Данные сохранены в ${filename}`);
        console.log(`Всего записей: ${data.length}`);
    }

    // Задержка
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Основная функция
    async run() {
        try {
            console.log('🚀 Начинаю загрузку данных OKX...\n');
            
            // Загружаем все данные параллельно
            const [instruments, tradingRules, tickers] = await Promise.all([
                this.fetchAllInstruments(),
                this.fetchMinOrderSizes(),
                this.fetchTickers()
            ]);
            
            console.log('\n📊 Статистика загрузки:');
            console.log(`- Инструменты: ${instruments.length}`);
            console.log(`- Правила торговли: ${tradingRules.length}`);
            console.log(`- Тикеры: ${tickers.length}`);
            
            // Объединяем данные
            const mergedData = this.mergeData(instruments, tradingRules, tickers);
            
            // Сохраняем полный файл
            this.saveToCSV(mergedData, 'okx_all_pairs.csv');
            
            // Сохраняем только активные инструменты (с данными тикеров)
            const activePairs = mergedData.filter(item => item.last && item.last !== '');
            this.saveToCSV(activePairs, 'okx_active_pairs.csv');
            
            // Сохраняем только SWAP инструменты
            const swapPairs = mergedData.filter(item => item.instType === 'SWAP');
            this.saveToCSV(swapPairs, 'okx_swap_pairs.csv');
            
            console.log('\n✅ Загрузка завершена!');
            console.log('📁 Созданные файлы:');
            console.log('- okx_all_pairs.csv (все инструменты)');
            console.log('- okx_active_pairs.csv (активные инструменты)');
            console.log('- okx_swap_pairs.csv (только SWAP)');
            
        } catch (error) {
            console.error('❌ Ошибка:', error.message);
        }
    }
}

// Запускаем скрипт
const fetcher = new OKXDataFetcher();
fetcher.run();

