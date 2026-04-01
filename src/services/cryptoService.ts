import axios from 'axios';

export interface Coin {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  color: string;
}

const COLORS = [
  '#F7931A', '#627EEA', '#14F195', '#23292F', '#0033AD',
  '#E84142', '#C2A633', '#E6007A', '#2A5ADA', '#8247E5',
  '#FFD700', '#FFA500', '#FF4500', '#00FF00', '#00CED1'
];

export const COINS: Coin[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 60000, change24h: 1.5, color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', price: 3000, change24h: 2.0, color: '#627EEA' },
  { symbol: 'SOL', name: 'Solana', price: 150, change24h: 3.5, color: '#14F195' },
  { symbol: 'ADA', name: 'Cardano', price: 0.5, change24h: -1.0, color: '#0033AD' },
  { symbol: 'DOT', name: 'Polkadot', price: 7, change24h: 0.5, color: '#E6007A' },
  { symbol: 'MATIC', name: 'Polygon', price: 0.8, change24h: 1.2, color: '#8247E5' },
  { symbol: 'LINK', name: 'Chainlink', price: 15, change24h: 2.5, color: '#2A5ADA' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.15, change24h: 5.2, color: '#C2A633' },
  { symbol: 'SHIB', name: 'Shiba Inu', price: 0.000025, change24h: 8.1, color: '#FFA500' },
  { symbol: 'PEPE', name: 'Pepe', price: 0.000008, change24h: 12.5, color: '#00FF00' },
  { symbol: 'WIF', name: 'Dogwifhat', price: 3.5, change24h: 15.2, color: '#FFD700' },
  { symbol: 'BONK', name: 'Bonk', price: 0.00002, change24h: 10.8, color: '#FF4500' },
  { symbol: 'AVAX', name: 'Avalanche', price: 45, change24h: 4.2, color: '#E84142' },
  { symbol: 'NEAR', name: 'Near Protocol', price: 6.5, change24h: 6.1, color: '#00CED1' },
  { symbol: 'FLOKI', name: 'Floki', price: 0.0002, change24h: 9.5, color: '#FFD700' },
  { symbol: 'JUP', name: 'Jupiter', price: 1.2, change24h: 7.8, color: '#23292F' },
  { symbol: 'RNDR', name: 'Render', price: 10, change24h: 11.2, color: '#E84142' },
  { symbol: 'FET', name: 'Fetch.ai', price: 2.5, change24h: 13.5, color: '#627EEA' },
  { symbol: 'WLD', name: 'Worldcoin', price: 5, change24h: 14.1, color: '#23292F' },
  { symbol: 'SUI', name: 'Sui', price: 1.5, change24h: 8.5, color: '#00CED1' },
  { symbol: 'SEI', name: 'Sei', price: 0.7, change24h: 9.2, color: '#E84142' },
];

let cachedCoins: Coin[] = [];

export const fetchTopCoins = async (): Promise<Coin[]> => {
  if (cachedCoins.length > 0) return cachedCoins;
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&sparkline=false');
    cachedCoins = response.data.map((coin: any, index: number) => ({
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h,
      color: COLORS[index % COLORS.length]
    }));
    return cachedCoins;
  } catch (error) {
    console.error('Error fetching coins:', error);
    return COINS; // Return static list as fallback
  }
};

export const getRandomCoin = async (): Promise<Coin> => {
  const coins = await fetchTopCoins();
  return coins[Math.floor(Math.random() * coins.length)];
};

export const getRandomCoins = async (count: number): Promise<Coin[]> => {
  const coins = await fetchTopCoins();
  const shuffled = [...coins].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const getMockPriceUpdate = (currentPrice: number) => {
  const volatility = currentPrice * 0.001; // 0.1% volatility
  const change = (Math.random() - 0.5) * volatility;
  return Number((currentPrice + change).toFixed(10)); // Keep precision
};

export const formatPrice = (price: number): string => {
  if (price === 0) return '0.00';
  
  // For very small prices (less than 0.01), show more decimals
  if (price < 0.01) {
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 8 
    });
  }
  
  // For normal prices, stick to 2 decimals
  return price.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};
