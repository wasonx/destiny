export const fiveElements = [
  { key: 'wood', label: '木' },
  { key: 'fire', label: '火' },
  { key: 'earth', label: '土' },
  { key: 'metal', label: '金' },
  { key: 'water', label: '水' },
];

export const heavenlyStems = [
  { key: 'jia', label: '甲', element: '木', yinYang: '阳' },
  { key: 'yi', label: '乙', element: '木', yinYang: '阴' },
  { key: 'bing', label: '丙', element: '火', yinYang: '阳' },
  { key: 'ding', label: '丁', element: '火', yinYang: '阴' },
  { key: 'wu', label: '戊', element: '土', yinYang: '阳' },
  { key: 'ji', label: '己', element: '土', yinYang: '阴' },
  { key: 'geng', label: '庚', element: '金', yinYang: '阳' },
  { key: 'xin', label: '辛', element: '金', yinYang: '阴' },
  { key: 'ren', label: '壬', element: '水', yinYang: '阳' },
  { key: 'gui', label: '癸', element: '水', yinYang: '阴' },
];

export const earthlyBranches = [
  { key: 'zi', label: '子', element: '水', hiddenStems: ['癸'] },
  { key: 'chou', label: '丑', element: '土', hiddenStems: ['己', '癸', '辛'] },
  { key: 'yin', label: '寅', element: '木', hiddenStems: ['甲', '丙', '戊'] },
  { key: 'mao', label: '卯', element: '木', hiddenStems: ['乙'] },
  { key: 'chen', label: '辰', element: '土', hiddenStems: ['戊', '乙', '癸'] },
  { key: 'si', label: '巳', element: '火', hiddenStems: ['丙', '戊', '庚'] },
  { key: 'wu', label: '午', element: '火', hiddenStems: ['丁', '己'] },
  { key: 'wei', label: '未', element: '土', hiddenStems: ['己', '丁', '乙'] },
  { key: 'shen', label: '申', element: '金', hiddenStems: ['庚', '壬', '戊'] },
  { key: 'you', label: '酉', element: '金', hiddenStems: ['辛'] },
  { key: 'xu', label: '戌', element: '土', hiddenStems: ['戊', '辛', '丁'] },
  { key: 'hai', label: '亥', element: '水', hiddenStems: ['壬', '甲'] },
];

export const tenGods = [
  { key: 'bi_jian', label: '比肩' },
  { key: 'jie_cai', label: '劫财' },
  { key: 'shi_shen', label: '食神' },
  { key: 'shang_guan', label: '伤官' },
  { key: 'zheng_cai', label: '正财' },
  { key: 'pian_cai', label: '偏财' },
  { key: 'zheng_guan', label: '正官' },
  { key: 'qi_sha', label: '七杀' },
  { key: 'zheng_yin', label: '正印' },
  { key: 'pian_yin', label: '偏印' },
];

export const branchConflicts = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

export const elementCycles = {
  generates: [
    ['木', '火'],
    ['火', '土'],
    ['土', '金'],
    ['金', '水'],
    ['水', '木'],
  ],
  restrains: [
    ['木', '土'],
    ['土', '水'],
    ['水', '火'],
    ['火', '金'],
    ['金', '木'],
  ],
};
