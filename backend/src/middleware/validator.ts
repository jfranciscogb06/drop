export function validateAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000000 && !isNaN(amount); // Max $10,000
}

export function validateCurrency(currency: string): boolean {
  const validCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud'];
  return validCurrencies.includes(currency.toLowerCase());
}

export function validateUserId(userId: string): boolean {
  return typeof userId === 'string' && userId.length > 0;
}
