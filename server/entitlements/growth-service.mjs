const levels = [
  [8000, '参玄'],
  [2000, '通达'],
  [500, '明理'],
  [100, '入门'],
  [0, '启蒙'],
];

export function calculateGrowthLevel(lifetimePoints = 0) {
  return levels.find(([threshold]) => Number(lifetimePoints) >= threshold)?.[1] || '启蒙';
}
