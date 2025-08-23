// Internationalization (i18n) support for English and Simplified Chinese
export const translations = {
  en: {
    // Dashboard
    dashboard: "Dashboard",
    performanceOverview: "Performance Overview",
    recentEvaluations: "Recent Evaluations",
    keyMetrics: "Key Metrics",
    
    // Player Reports
    playerReports: "Player Reports",
    skillAnalysis: "Skill Analysis",
    strengthsWeaknesses: "Strengths & Weaknesses",
    developmentPlan: "Development Plan",
    comparisonAnalysis: "Comparison Analysis",
    
    // Game Log
    gameLog: "Game Log",
    matchPerformance: "Match Performance",
    statisticalAnalysis: "Statistical Analysis",
    gameAnalytics: "Game Analytics",
    
    // Drill Plan
    drillPlan: "Drill Plan",
    personalizedTraining: "Personalized Training",
    skillDevelopment: "Skill Development",
    progressTracking: "Progress Tracking",
    
    // Health & Load
    healthLoad: "Health & Load",
    injuryPrevention: "Injury Prevention",
    loadManagement: "Load Management",
    biomechanicsAnalysis: "Biomechanics Analysis",
    
    // Admin
    admin: "Admin",
    systemManagement: "System Management",
    userRoles: "User Roles",
    
    // Performance Metrics
    shootingAccuracy: "Shooting Accuracy",
    passingPrecision: "Passing Precision",
    dribblingControl: "Dribbling Control",
    footSpeed: "Foot Speed",
    verticalJump: "Vertical Jump",
    movement: "Movement",
    bodyAlignment: "Body Alignment",
    
    // Risk Levels
    low: "Low",
    medium: "Medium",
    high: "High",
    
    // Status
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    completed: "Completed",
    
    // Actions
    generate: "Generate",
    export: "Export",
    analyze: "Analyze",
    compare: "Compare",
    
    // Common
    player: "Player",
    date: "Date",
    score: "Score",
    status: "Status",
    actions: "Actions",
    details: "Details"
  },
  zh: {
    // Dashboard - 仪表板
    dashboard: "仪表板",
    performanceOverview: "表现概览",
    recentEvaluations: "最近评估",
    keyMetrics: "关键指标",
    
    // Player Reports - 球员报告
    playerReports: "球员报告",
    skillAnalysis: "技能分析",
    strengthsWeaknesses: "优势与劣势",
    developmentPlan: "发展计划",
    comparisonAnalysis: "对比分析",
    
    // Game Log - 比赛记录
    gameLog: "比赛记录",
    matchPerformance: "比赛表现",
    statisticalAnalysis: "统计分析",
    gameAnalytics: "比赛分析",
    
    // Drill Plan - 训练计划
    drillPlan: "训练计划",
    personalizedTraining: "个性化训练",
    skillDevelopment: "技能发展",
    progressTracking: "进度跟踪",
    
    // Health & Load - 健康与负荷
    healthLoad: "健康与负荷",
    injuryPrevention: "伤病预防",
    loadManagement: "负荷管理",
    biomechanicsAnalysis: "生物力学分析",
    
    // Admin - 管理
    admin: "管理",
    systemManagement: "系统管理",
    userRoles: "用户角色",
    
    // Performance Metrics - 表现指标
    shootingAccuracy: "投篮准确性",
    passingPrecision: "传球精度",
    dribblingControl: "运球控制",
    footSpeed: "脚步速度",
    verticalJump: "垂直跳跃",
    movement: "移动",
    bodyAlignment: "身体对齐",
    
    // Risk Levels - 风险等级
    low: "低",
    medium: "中",
    high: "高",
    
    // Status - 状态
    active: "活跃",
    inactive: "非活跃",
    pending: "待处理",
    completed: "已完成",
    
    // Actions - 操作
    generate: "生成",
    export: "导出",
    analyze: "分析",
    compare: "比较",
    
    // Common - 通用
    player: "球员",
    date: "日期",
    score: "分数",
    status: "状态",
    actions: "操作",
    details: "详情"
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export const useTranslation = (language: Language = 'en') => {
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return { t };
};