/**
 * 本地模拟好友。
 *
 * 仅用于排行榜展示，不写入 IndexedDB，也不代表真实用户。
 * 总榜使用这里的静态值；周榜由周 key + id 确定性生成。
 */
export interface MockFriend {
  id: string;
  name: string;
  allStars: number;
  allAccuracy: number;
  allStreak: number;
  allGames: number;
}

export const MOCK_FRIENDS: readonly MockFriend[] = [
  {
    id: 'friend-zhou',
    name: '周周',
    allStars: 76,
    allAccuracy: 0.91,
    allStreak: 12,
    allGames: 88,
  },
  {
    id: 'friend-lin',
    name: '小林',
    allStars: 68,
    allAccuracy: 0.88,
    allStreak: 9,
    allGames: 74,
  },
  {
    id: 'friend-mia',
    name: 'Mia',
    allStars: 61,
    allAccuracy: 0.86,
    allStreak: 16,
    allGames: 102,
  },
  {
    id: 'friend-zhe',
    name: '阿哲',
    allStars: 54,
    allAccuracy: 0.81,
    allStreak: 6,
    allGames: 61,
  },
  {
    id: 'friend-nannan',
    name: '南南',
    allStars: 47,
    allAccuracy: 0.78,
    allStreak: 11,
    allGames: 57,
  },
  {
    id: 'friend-leo',
    name: 'Leo',
    allStars: 39,
    allAccuracy: 0.73,
    allStreak: 4,
    allGames: 48,
  },
  {
    id: 'friend-susu',
    name: '苏苏',
    allStars: 30,
    allAccuracy: 0.7,
    allStreak: 7,
    allGames: 39,
  },
  {
    id: 'friend-kai',
    name: 'Kai',
    allStars: 22,
    allAccuracy: 0.66,
    allStreak: 2,
    allGames: 25,
  },
];
