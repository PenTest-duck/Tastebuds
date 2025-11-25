export type ProviderKey =
  | "openai"
  | "anthropic"
  | "google"
  | "z-ai"
  | "deepseek";

export type ModelKey =
  | "openai/gpt-5.1"
  | "openai/gpt-5.1-codex"
  | "anthropic/claude-sonnet-4.5"
  | "google/gemini-3-pro-preview"
  | "z-ai/glm-4.6"
  | "deepseek/deepseek-v3.1-terminus";

export type Model = {
  key: ModelKey;
  provider: string;
  providerLogoSrc: string;
  name: string;
  disabled?: boolean;
};

export const MODELS: Record<ModelKey, Model> = {
  "openai/gpt-5.1": {
    key: "openai/gpt-5.1",
    provider: "OpenAI",
    providerLogoSrc: "/icons/openai.svg",
    name: "GPT-5.1",
    disabled: true,
  },
  "openai/gpt-5.1-codex": {
    key: "openai/gpt-5.1-codex",
    provider: "OpenAI",
    providerLogoSrc: "/icons/openai.svg",
    name: "GPT-5.1 Codex",
  },
  "anthropic/claude-sonnet-4.5": {
    key: "anthropic/claude-sonnet-4.5",
    provider: "Anthropic",
    providerLogoSrc: "/icons/claude.svg",
    name: "Claude Sonnet 4.5",
  },
  "google/gemini-3-pro-preview": {
    key: "google/gemini-3-pro-preview",
    provider: "Google",
    providerLogoSrc: "/icons/gemini.svg",
    name: "Gemini 3 Pro",
  },
  "z-ai/glm-4.6": {
    key: "z-ai/glm-4.6",
    provider: "Z.ai",
    providerLogoSrc: "/icons/z.ai.svg",
    name: "GLM 4.6",
  },
  "deepseek/deepseek-v3.1-terminus": {
    key: "deepseek/deepseek-v3.1-terminus",
    provider: "DeepSeek",
    providerLogoSrc: "/icons/deepseek.svg",
    name: "DeepSeek v3.1 Terminus",
  },
} as const;

export const DEFAULT_MODEL_KEYS: ModelKey[] = [
  "openai/gpt-5.1-codex",
  "anthropic/claude-sonnet-4.5",
  "google/gemini-3-pro-preview",
];

export const DEFAULT_FLAVORS: string[] = [
  "Clean and minimalistic",
  "Warm and welcoming, bright colour schemes",
  "Bold and expressive, dark colour schemes",
  "Futuristic and experimental",
];
