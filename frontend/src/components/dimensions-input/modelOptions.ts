export type ModelOptionKey =
  | "openai"
  | "anthropic"
  | "gemini"
  | "glm"
  | "deepseek";

export type ModelOption = {
  key: ModelOptionKey;
  label: string;
  logoSrc: string;
  exactModel: string;
};

export const MODEL_OPTIONS: Record<ModelOptionKey, ModelOption> = {
  openai: {
    key: "openai",
    label: "OpenAI",
    logoSrc: "/openai.svg",
    exactModel: "GPT-5",
  },
  anthropic: {
    key: "anthropic",
    label: "Anthropic",
    logoSrc: "/claude.svg",
    exactModel: "Claude Sonnet 4.5",
  },
  gemini: {
    key: "gemini",
    label: "Gemini",
    logoSrc: "/gemini.svg",
    exactModel: "Gemini 2.5 Pro",
  },
  glm: {
    key: "glm",
    label: "GLM",
    logoSrc: "/z.ai.svg",
    exactModel: "GLM 4.6",
  },
  deepseek: {
    key: "deepseek",
    label: "DeepSeek",
    logoSrc: "/deepseek.svg",
    exactModel: "DeepSeek R1",
  },
};

export const DEFAULT_MODEL_KEYS: ModelOptionKey[] = [
  "openai",
  "anthropic",
  "gemini",
];

export const DEFAULT_FLAVORS: string[] = [
  "Clean and minimalistic",
  "Warm and welcoming, bright colour schemes",
  "Bold and expressive, dark colour schemes",
  "Futuristic and experimental",
];

