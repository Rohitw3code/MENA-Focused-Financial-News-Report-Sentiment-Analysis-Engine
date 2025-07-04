// Utility function to detect entity type based on name
export const detectEntityType = (entityName: string): string => {
  const cryptoKeywords = [
    // Major cryptocurrencies
    'bitcoin', 'btc', 'ethereum', 'eth', 'litecoin', 'ltc', 'ripple', 'xrp',
    'cardano', 'ada', 'polkadot', 'dot', 'chainlink', 'link', 'stellar', 'xlm',
    'dogecoin', 'doge', 'polygon', 'matic', 'solana', 'sol', 'avalanche', 'avax',
    'cosmos', 'atom', 'algorand', 'algo', 'tezos', 'xtz', 'monero', 'xmr',
    'dash', 'zcash', 'zec', 'binance coin', 'bnb', 'uniswap', 'uni',
    
    // DeFi tokens
    'aave', 'compound', 'comp', 'maker', 'mkr', 'synthetix', 'snx',
    'yearn.finance', 'yfi', 'sushiswap', 'sushi', 'pancakeswap', 'cake',
    'curve', 'crv', '1inch', 'balancer', 'bal',
    
    // Layer 1 & 2 solutions
    'terra', 'luna', 'fantom', 'ftm', 'near', 'harmony', 'one',
    'elrond', 'egld', 'theta', 'vechain', 'vet', 'iota', 'miota',
    'neo', 'waves', 'qtum', 'icon', 'icx', 'ontology', 'ont',
    'zilliqa', 'zil', 'hedera', 'hbar', 'flow', 'internet computer', 'icp',
    
    // Meme coins & others
    'shiba inu', 'shib', 'safemoon', 'floki', 'baby doge',
    
    // NFT & Gaming tokens
    'enjin', 'enj', 'axie infinity', 'axs', 'the sandbox', 'sand',
    'decentraland', 'mana', 'gala', 'immutable x', 'imx',
    
    // Exchange tokens
    'binance', 'bnb', 'ftx token', 'ftt', 'crypto.com coin', 'cro',
    'huobi token', 'ht', 'kucoin shares', 'kcs',
    
    // Stablecoins
    'tether', 'usdt', 'usd coin', 'usdc', 'dai', 'busd', 'usdd',
    'terrausd', 'ust', 'frax', 'fei', 'tribe',
    
    // Privacy coins
    'monero', 'xmr', 'zcash', 'zec', 'dash', 'verge', 'xvg',
    'beam', 'grin', 'horizen', 'zen',
    
    // Infrastructure tokens
    'filecoin', 'fil', 'storj', 'siacoin', 'sc', 'arweave', 'ar',
    'helium', 'hnt', 'livepeer', 'lpt', 'render token', 'rndr',
    
    // Oracle tokens
    'chainlink', 'link', 'band protocol', 'band', 'api3',
    
    // Cross-chain tokens
    'thorchain', 'rune', 'ren', 'anyswap', 'any', 'multichain',
    
    // Web3 & Metaverse
    'basic attention token', 'bat', 'brave', 'civic', 'cvc',
    'district0x', 'dnt', 'golem', 'gnt', 'status', 'snt',
    'aragon', 'ant', 'numeraire', 'nmr', 'augur', 'rep',
    'gnosis', 'gno', 'bancor', 'bnt', 'kyber network', 'knc',
    'loopring', 'lrc', 'omisego', 'omg', 'republic protocol',
    
    // General crypto terms
    'cryptocurrency', 'crypto', 'coin', 'token', 'defi', 'nft',
    'blockchain', 'altcoin', 'memecoin', 'stablecoin', 'cbdc',
    'digital currency', 'virtual currency', 'digital asset'
  ];
  
  const lowerName = entityName.toLowerCase().trim();
  
  // Check for exact matches or partial matches
  return cryptoKeywords.some(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    return lowerName === lowerKeyword || 
           lowerName.includes(lowerKeyword) || 
           lowerKeyword.includes(lowerName);
  }) ? 'crypto' : 'company';
};

// Common crypto abbreviations mapping
export const cryptoAbbreviations: Record<string, string> = {
  'btc': 'Bitcoin',
  'eth': 'Ethereum',
  'ltc': 'Litecoin',
  'xrp': 'Ripple',
  'ada': 'Cardano',
  'dot': 'Polkadot',
  'link': 'Chainlink',
  'xlm': 'Stellar',
  'doge': 'Dogecoin',
  'matic': 'Polygon',
  'sol': 'Solana',
  'avax': 'Avalanche',
  'atom': 'Cosmos',
  'algo': 'Algorand',
  'xtz': 'Tezos',
  'xmr': 'Monero',
  'zec': 'Zcash',
  'bnb': 'Binance Coin',
  'uni': 'Uniswap',
  'mkr': 'Maker',
  'snx': 'Synthetix',
  'yfi': 'Yearn.finance',
  'cake': 'PancakeSwap',
  'luna': 'Terra',
  'ftm': 'Fantom',
  'one': 'Harmony',
  'egld': 'Elrond',
  'vet': 'VeChain',
  'icx': 'ICON',
  'ont': 'Ontology',
  'zil': 'Zilliqa',
  'enj': 'Enjin',
  'axs': 'Axie Infinity',
  'sand': 'The Sandbox',
  'mana': 'Decentraland',
  'cro': 'Crypto.com Coin',
  'usdt': 'Tether',
  'usdc': 'USD Coin',
  'dai': 'Dai',
  'busd': 'Binance USD',
  'fil': 'Filecoin',
  'hnt': 'Helium',
  'bat': 'Basic Attention Token',
  'rune': 'THORChain'
};

// Function to get full crypto name from abbreviation
export const getFullCryptoName = (abbreviation: string): string => {
  const lowerAbbr = abbreviation.toLowerCase();
  return cryptoAbbreviations[lowerAbbr] || abbreviation;
};