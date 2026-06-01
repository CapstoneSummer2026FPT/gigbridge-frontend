import DB from '../database/db';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const userHandlers = {
  async getUserById(userId: string) {
    await delay(200);
    const user = DB.getUserById(userId);
    if (!user) throw new Error('User not found');
    return user;
  },

  async getGigcoinBalance(userId: string) {
    await delay(150);
    const user = DB.getUserById(userId);
    if (!user) throw new Error('User not found');
    return { userId, gigcoin_balance: user.gigcoin_balance };
  },

  async deductGigcoin(userId: string, amount: number) {
    await delay(200);
    const user = DB.getUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.gigcoin_balance < amount) throw new Error('Insufficient gigcoin balance');
    user.gigcoin_balance -= amount;
    return { userId, gigcoin_balance: user.gigcoin_balance };
  },
};
