import type { Transaction } from '@/types'

interface CategoryConfig {
  category: string
  merchants: string[]
  amountRange: [number, number]
  monthlyFrequency: [number, number]
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    category: '餐饮',
    merchants: ['星巴克', '麦当劳', '肯德基', '海底捞', '喜茶', '瑞幸咖啡', '外婆家', '西贝莜面村', '必胜客', '汉堡王', '和府捞面', '真功夫', '吉野家', 'DQ', '哈根达斯'],
    amountRange: [15, 350],
    monthlyFrequency: [12, 25],
  },
  {
    category: '交通',
    merchants: ['滴滴出行', '高德打车', '地铁', '公交', '12306', '共享单车', '神州租车', '首汽约车', '曹操出行', 'T3出行', '高铁', '飞机票', '停车费', '加油站', '高速费'],
    amountRange: [3, 800],
    monthlyFrequency: [8, 20],
  },
  {
    category: '购物',
    merchants: ['淘宝', '京东', '拼多多', '天猫', '唯品会', '苏宁易购', '山姆会员店', '盒马鲜生', '永辉超市', '沃尔玛', '大润发', '屈臣氏', '名创优品', '优衣库', 'ZARA'],
    amountRange: [20, 3000],
    monthlyFrequency: [5, 15],
  },
  {
    category: '娱乐',
    merchants: ['猫眼电影', '淘票票', '爱奇艺', '腾讯视频', '优酷', '哔哩哔哩', '网易云音乐', 'QQ音乐', '抖音', '快手', 'KTV', '健身卡', '游乐园', '演唱会', '剧本杀'],
    amountRange: [15, 500],
    monthlyFrequency: [3, 10],
  },
  {
    category: '居住',
    merchants: ['房租', '物业费', '电费', '水费', '燃气费', '宽带费', '宜家家居', '居然之家', '红星美凯龙', '链家', '贝壳找房', '自如', '蛋壳公寓', '美团买菜', '叮咚买菜'],
    amountRange: [50, 8000],
    monthlyFrequency: [4, 8],
  },
  {
    category: '医疗',
    merchants: ['三甲医院', '社区医院', '同仁堂', '康爱多', '1药网', '京东健康', '阿里健康', '平安好医生', '好大夫在线', '微医', '益丰药房', '大参林', '老百姓药房', '体检中心', '牙科诊所'],
    amountRange: [30, 2000],
    monthlyFrequency: [1, 4],
  },
  {
    category: '教育',
    merchants: ['学而思', '新东方', 'VIPKID', '51Talk', '网易有道', '腾讯课堂', '慕课网', '极客时间', '得到', '樊登读书', '知乎', 'Coursera', 'Udemy', '考虫', '粉笔教育'],
    amountRange: [50, 5000],
    monthlyFrequency: [1, 5],
  },
  {
    category: '通讯',
    merchants: ['中国移动', '中国联通', '中国电信', '腾讯QQ', '微信支付', '支付宝', '话费充值', '流量充值', '腾讯会员', '阿里云', '腾讯云', '华为云', '百度云', '美团外卖', '饿了么'],
    amountRange: [20, 500],
    monthlyFrequency: [2, 6],
  },
  {
    category: '其他',
    merchants: ['快递费', '婚庆服务', '摄影摄像', '鲜花礼品', '宠物医院', '宠物商店', '彩票', '慈善捐赠', '罚款', '维修费', '搬家公司', '家政服务', '美甲美发', '按摩SPA', '干洗店'],
    amountRange: [10, 1000],
    monthlyFrequency: [1, 5],
  },
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

interface SpecialTransactionTemplate {
  month: number
  day: number
  category: string
  merchant: string
  amount: number
}

export function generateSampleData(): Transaction[] {
  const transactions: Transaction[] = []
  const now = new Date()
  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth() + 1
  const todayDay = now.getDate()

  const endYear = todayYear
  const endMonth = todayMonth
  const startYear = endMonth >= 12 ? endYear : endYear - 1
  const startMonth = endMonth >= 12 ? 1 : endMonth + 1

  let idCounter = 0

  const monthWeights = [
    1.0, 0.85, 0.95, 0.9, 0.88, 1.1,
    1.05, 1.15, 0.92, 0.98, 1.4, 1.6,
  ]

  function getYearForMonth(month: number): number {
    return month >= startMonth ? startYear : endYear
  }

  function isDateInRange(year: number, month: number, day: number): boolean {
    if (year < startYear || year > endYear) return false
    if (year === startYear && month < startMonth) return false
    if (year === endYear && month > endMonth) return false
    if (year === endYear && month === endMonth && day > todayDay) return false
    return true
  }

  function isFutureDate(month: number, day: number): boolean {
    return month === todayMonth && day > todayDay
  }

  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    let currentYear = startYear
    let currentMonth = startMonth + monthOffset
    if (currentMonth > 12) {
      currentMonth -= 12
      currentYear += 1
    }

    const monthWeight = monthWeights[currentMonth - 1]
    const isCurrentMonth = currentYear === todayYear && currentMonth === todayMonth
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const maxDay = isCurrentMonth ? todayDay : daysInMonth

    for (const config of CATEGORY_CONFIGS) {
      const baseFrequency = randomInt(config.monthlyFrequency[0], config.monthlyFrequency[1])
      const frequency = Math.max(1, Math.round(baseFrequency * monthWeight))

      for (let i = 0; i < frequency; i++) {
        const day = randomInt(1, maxDay)
        const date = formatDate(currentYear, currentMonth, day)
        const seed = idCounter + currentYear * 10000 + currentMonth * 100 + day
        const amountVariation = 0.7 + seededRandom(seed) * 0.6
        const baseAmount = randomFloat(config.amountRange[0], config.amountRange[1])
        const amount = Math.round(baseAmount * amountVariation * monthWeight * 100) / 100

        transactions.push({
          id: `sample_${Date.now()}_${idCounter++}`,
          date,
          category: config.category,
          merchant: randomPick(config.merchants),
          amount,
        })
      }
    }
  }

  const specialTransactions: SpecialTransactionTemplate[] = [
    { month: 1, day: 1, category: '餐饮', merchant: '海底捞', amount: 458.00 },
    { month: 2, day: 14, category: '购物', merchant: '京东', amount: 1314.00 },
    { month: 4, day: 5, category: '交通', merchant: '12306', amount: 680.00 },
    { month: 5, day: 1, category: '娱乐', merchant: '演唱会', amount: 880.00 },
    { month: 6, day: 18, category: '购物', merchant: '淘宝', amount: 2599.00 },
    { month: 9, day: 10, category: '教育', merchant: '学而思', amount: 3280.00 },
    { month: 10, day: 1, category: '交通', merchant: '飞机票', amount: 2180.00 },
    { month: 11, day: 11, category: '购物', merchant: '天猫', amount: 3999.00 },
    { month: 12, day: 12, category: '购物', merchant: '拼多多', amount: 1899.00 },
    { month: 12, day: 25, category: '餐饮', merchant: '必胜客', amount: 268.00 },
  ]

  for (const tx of specialTransactions) {
    const year = getYearForMonth(tx.month)
    if (!isDateInRange(year, tx.month, tx.day)) continue
    if (isFutureDate(tx.month, tx.day)) continue

    transactions.push({
      id: `sample_${Date.now()}_${idCounter++}`,
      date: formatDate(year, tx.month, tx.day),
      category: tx.category,
      merchant: tx.merchant,
      amount: tx.amount,
    })
  }

  for (let m = 1; m <= 12; m++) {
    const y = getYearForMonth(m)

    if (isDateInRange(y, m, 5) && !isFutureDate(m, 5)) {
      transactions.push({
        id: `sample_${Date.now()}_${idCounter++}`,
        date: formatDate(y, m, 5),
        category: '居住',
        merchant: '房租',
        amount: 4500.00,
      })
    }
    if (isDateInRange(y, m, 10) && !isFutureDate(m, 10)) {
      transactions.push({
        id: `sample_${Date.now()}_${idCounter++}`,
        date: formatDate(y, m, 10),
        category: '通讯',
        merchant: '中国移动',
        amount: 128.00,
      })
    }
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date))

  return transactions
}
