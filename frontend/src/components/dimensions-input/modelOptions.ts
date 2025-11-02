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
};

export const MODEL_OPTIONS: Record<ModelOptionKey, ModelOption> = {
  openai: {
    key: "openai",
    label: "OpenAI",
    logoSrc: "/openai.svg",
  },
  anthropic: {
    key: "anthropic",
    label: "Anthropic",
    logoSrc: "/claude.svg",
  },
  gemini: {
    key: "gemini",
    label: "Gemini",
    logoSrc: "/gemini.svg",
  },
  glm: {
    key: "glm",
    label: "GLM",
    logoSrc: "/z.ai.svg",
  },
  deepseek: {
    key: "deepseek",
    label: "DeepSeek",
    logoSrc: "/deepseek.svg",
  },
};

export const DEFAULT_MODEL_KEYS: ModelOptionKey[] = [
  "openai",
  "anthropic",
  "gemini",
];

export const DEFAULT_FLAVORS: string[] = [
  "Clean and minimalistic",
  "Warm and welcoming",
  "Bold and expressive",
  "Playful and experimental",
];

