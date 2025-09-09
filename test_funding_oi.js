const https = require('https');

class OKXAPITester {
    constructor() {
        this.baseUrl = 'https://www.okx.com/api/v5';
    }

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

    async testFundingRates() {
        console.log('🔍 Тестирую API фандинга...');
        
        try {
            // Тестируем фандинг для конкретного инструмента
            const response = await this.makeRequest('/public/funding-rate?instId=BTC-USDT-SWAP');
            
            if (response.code === '0' && response.data) {
                console.log(`✅ Фандинг доступен! Найдено ${response.data.length} записей`);
                console.log('📊 Пример данных фандинга:');
                console.log(JSON.stringify(response.data.slice(0, 3), null, 2));
                return true;
            } else {
                console.log('❌ Фандинг недоступен:', response.msg);
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка при тестировании фандинга:', error.message);
            return false;
        }
    }

    async testOpenInterest() {
        console.log('\n🔍 Тестирую API Open Interest...');
        
        try {
            // Тестируем Open Interest для SWAP инструментов
            const response = await this.makeRequest('/public/open-interest?instType=SWAP');
            
            if (response.code === '0' && response.data) {
                console.log(`✅ Open Interest доступен! Найдено ${response.data.length} записей`);
                console.log('📊 Пример данных Open Interest:');
                console.log(JSON.stringify(response.data.slice(0, 3), null, 2));
                return true;
            } else {
                console.log('❌ Open Interest недоступен:', response.msg);
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка при тестировании Open Interest:', error.message);
            return false;
        }
    }

    async testFundingRateHistory() {
        console.log('\n🔍 Тестирую историю фандинга...');
        
        try {
            // Тестируем историю фандинга для BTC-USDT-SWAP
            const response = await this.makeRequest('/public/funding-rate-history?instId=BTC-USDT-SWAP');
            
            if (response.code === '0' && response.data) {
                console.log(`✅ История фандинга доступна! Найдено ${response.data.length} записей`);
                console.log('📊 Пример данных истории фандинга:');
                console.log(JSON.stringify(response.data.slice(0, 3), null, 2));
                return true;
            } else {
                console.log('❌ История фандинга недоступна:', response.msg);
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка при тестировании истории фандинга:', error.message);
            return false;
        }
    }

    async run() {
        console.log('🚀 Тестирую доступность данных по фандингу и Open Interest в OKX API...\n');
        
        const fundingAvailable = await this.testFundingRates();
        const oiAvailable = await this.testOpenInterest();
        const fundingHistoryAvailable = await this.testFundingRateHistory();
        
        console.log('\n📋 Итоговый отчет:');
        console.log(`- Фандинг: ${fundingAvailable ? '✅ Доступен' : '❌ Недоступен'}`);
        console.log(`- Open Interest: ${oiAvailable ? '✅ Доступен' : '❌ Недоступен'}`);
        console.log(`- История фандинга: ${fundingHistoryAvailable ? '✅ Доступна' : '❌ Недоступна'}`);
        
        if (fundingAvailable && oiAvailable) {
            console.log('\n🎉 Все данные доступны! Можно добавить в дашборд.');
        } else {
            console.log('\n⚠️ Некоторые данные недоступны. Проверьте API документацию.');
        }
    }
}

const tester = new OKXAPITester();
tester.run();
