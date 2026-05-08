import type { Industry } from "./merchant";

export type IndustryTemplate = {
  industry: Industry;
  displayName: string;
  openingLine: string;
  requiredQuestions: string[];
  sensitiveRules: string[];
};

export const industryTemplates: Record<Industry, IndustryTemplate> = {
  photography: {
    industry: "photography",
    displayName: "摄影写真",
    openingLine: "你好，我是店里的 AI 接待助手。可以先告诉我你想拍什么类型的照片吗？",
    requiredQuestions: ["拍摄类型", "人数", "期望时间", "预算范围", "联系方式"],
    sensitiveRules: ["未确认档期前不得承诺具体拍摄时间", "未配置套餐外不得承诺赠品", "价格只按商家配置的区间说明"],
  },
  home_design: {
    industry: "home_design",
    displayName: "家装设计",
    openingLine: "你好，我是设计工作室的 AI 接待助手。可以先说一下房屋面积和装修需求吗？",
    requiredQuestions: ["房屋城市和区域", "面积", "装修类型", "预算范围", "计划开工时间", "联系方式"],
    sensitiveRules: ["未量房前不得承诺最终报价", "不承诺施工周期", "不评价未合作施工方"],
  },
  dental_clinic: {
    industry: "dental_clinic",
    displayName: "牙科诊所",
    openingLine: "你好，我是诊所的 AI 接待助手。可以先说一下牙齿问题和方便就诊的时间吗？",
    requiredQuestions: ["症状或需求", "期望就诊时间", "是否急痛", "联系方式"],
    sensitiveRules: ["不得承诺治疗效果", "不得替医生做诊断", "未确认医生排班前不得承诺具体就诊时间"],
  },
  restaurant: {
    industry: "restaurant",
    displayName: "餐厅订位",
    openingLine: "你好，我是餐厅的 AI 接待助手。可以先告诉我人数、日期和大概到店时间吗？",
    requiredQuestions: ["用餐人数", "日期和时间", "是否需要包间", "联系方式"],
    sensitiveRules: ["未查桌态前不得承诺有位", "不得编造低消或套餐价格", "特殊需求需转人工确认"],
  },
  real_estate: {
    industry: "real_estate",
    displayName: "房产经纪",
    openingLine: "你好，我是房产经纪的 AI 接待助手。可以先说一下预算、区域和买房还是租房吗？",
    requiredQuestions: ["预算", "目标区域", "户型", "买房或租房", "联系方式"],
    sensitiveRules: ["不得承诺投资收益", "不得编造房源状态", "不得替客户做金融或法律判断"],
  },
  insurance: {
    industry: "insurance",
    displayName: "保险和监管服务",
    openingLine: "你好，我是保险服务 AI 接待助手。可以先说明你要查询保单、理赔还是保障范围吗？",
    requiredQuestions: ["服务类型", "身份核验状态", "保单或理赔编号", "联系方式", "是否需要持牌顾问跟进"],
    sensitiveRules: ["未完成身份核验前不得透露保单或理赔细节", "不得承诺赔付、保障资格或核保结果", "保障范围和资格问题必须转持牌顾问或人工确认"],
  },
};
