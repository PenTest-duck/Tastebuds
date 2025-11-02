export enum LLMModel {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GEMINI = "gemini",
  GLM = "glm",
  DEEPSEEK = "deepseek",
}

export interface LLMModelInfo {
  id: LLMModel;
  displayName: string;
  logoPath: string | null;
}

export const LLM_MODELS: Record<LLMModel, LLMModelInfo> = {
  [LLMModel.OPENAI]: {
    id: LLMModel.OPENAI,
    displayName: "OpenAI",
    logoPath: "/openai.svg",
  },
  [LLMModel.ANTHROPIC]: {
    id: LLMModel.ANTHROPIC,
    displayName: "Anthropic",
    logoPath: "/claude.svg",
  },
  [LLMModel.GEMINI]: {
    id: LLMModel.GEMINI,
    displayName: "Gemini",
    logoPath: "/gemini.svg",
  },
  [LLMModel.GLM]: {
    id: LLMModel.GLM,
    displayName: "GLM",
    logoPath: "/z.ai.svg",
  },
  [LLMModel.DEEPSEEK]: {
    id: LLMModel.DEEPSEEK,
    displayName: "DeepSeek",
    logoPath: "/deepseek.svg",
  },
};

export const ALL_MODELS = Object.values(LLMModel);
export const DEFAULT_MODELS = [
  LLMModel.OPENAI,
  LLMModel.ANTHROPIC,
  LLMModel.GEMINI,
];

export function getModelInfo(model: LLMModel): LLMModelInfo {
  return LLM_MODELS[model];
}
