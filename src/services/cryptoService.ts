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
  '#E84142', '#C2A633', '#E6007A', '#2A5ADA', '#8247E5'
];

export const COINS: Coin[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 60000, change24h: 1.5, color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', price: 3000, change24h: 2.0, color: '#627EEA' },
  { symbol: 'SOL', name: 'Solana', price: 150, change24h: 3.5, color: '#14F195' },
  { symbol: 'ADA', name: 'Cardano', price: 0.5, change24h: -1.0, color: '#0033AD' },
  { symbol: 'DOT', name: 'Polkadot', price: 7, change24h: 0.5, color: '#E6007A' },
  { symbol: 'MATIC', name: 'Polygon', price: 0.8, change24h: 1.2, color: '#8247E5' },
  { symbol: 'LINK', name: 'Chainlink', price: 15, change24h: 2.5, color: '#2A5ADA' },
];

let cachedCoins: Coin[] = [];

export const fetchTopCoins = async (): Promise<Coin[]> => {
  if (cachedCoins.length > 0) return cachedCoins;
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false');
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
    return [];
  }
};

export const getRandomCoin = async (): Promise<Coin> => {
  const coins = await fetchTopCoins();
  return coins[Math.floor(Math.random() * coins.length)];
};

export const getMockPriceUpdate = (currentPrice: number) => {
  const volatility = currentPrice * 0.001; // 0.1% volatility
  const change = (Math.random() - 0.5) * volatility;
  return Number((currentPrice + change).toFixed(2));
};
