"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  clearAiGenerationLlmSettingsAction,
  updateAiGenerationLlmSettingsAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Provider = "openai" | "anthropic";

type Props = {
  initialProvider: Provider;
  initialBaseUrl: string;
  initialModel: string;
  configured: boolean;
};

function defaultBaseUrl(provider: Provider): string {
  return provider === "anthropic" ? "https://api.anthropic.com" : "https://api.openai.com/v1";
}

function defaultModel(provider: Provider): string {
  return provider === "anthropic" ? "claude-3-5-sonnet-latest" : "gpt-4o-mini";
}

export function AiGenerationLlmSettingsForm({
  initialProvider,
  initialBaseUrl,
  initialModel,
  configured,
}: Props) {
  const t = useTranslations("settings");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl || defaultBaseUrl(initialProvider));
  const [model, setModel] = useState(initialModel || defaultModel(initialProvider));
  const [apiKey, setApiKey] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isConfigured, setIsConfigured] = useState(configured);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const applyProviderDefaults = (nextProvider: Provider) => {
    setProvider(nextProvider);
    if (!baseUrl) setBaseUrl(defaultBaseUrl(nextProvider));
    if (!model) setModel(defaultModel(nextProvider));
  };

  const mapError = (error: string): string => {
    if (
      error in
      {
        not_authenticated: 1,
        invalid_llm_provider: 1,
        missing_llm_api_key: 1,
        invalid_llm_base_url: 1,
        invalid_llm_model: 1,
        llm_encryption_failed: 1,
        llm_settings_update_failed: 1,
        llm_settings_clear_failed: 1,
      }
    ) {
      return tErrors(
        error as
          | "not_authenticated"
          | "invalid_llm_provider"
          | "missing_llm_api_key"
          | "invalid_llm_base_url"
          | "invalid_llm_model"
          | "llm_encryption_failed"
          | "llm_settings_update_failed"
          | "llm_settings_clear_failed"
      );
    }
    return error;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("provider", provider);
      formData.set("base_url", baseUrl.trim());
      formData.set("model", model.trim());
      formData.set("api_key", apiKey);
      const result = await updateAiGenerationLlmSettingsAction({}, formData);
      if (result?.error) {
        setFeedback({ type: "error", text: mapError(result.error) });
        return;
      }
      setApiKey("");
      setIsConfigured(true);
      setFeedback({ type: "success", text: t("aiLlmSaved") });
    });
  };

  const handleClear = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await clearAiGenerationLlmSettingsAction();
      if (result?.error) {
        setFeedback({ type: "error", text: mapError(result.error) });
        return;
      }
      setApiKey("");
      setIsConfigured(false);
      setFeedback({ type: "success", text: t("aiLlmCleared") });
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label htmlFor="ai_provider" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("aiLlmProvider")}
          </label>
          <select
            id="ai_provider"
            value={provider}
            onChange={(e) => applyProviderDefaults(e.target.value as Provider)}
            disabled={isPending}
            className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Input
            id="ai_model"
            label={t("aiLlmModel")}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={defaultModel(provider)}
            disabled={isPending}
          />
        </div>
      </div>

      <Input
        id="ai_base_url"
        label={t("aiLlmBaseUrl")}
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        placeholder={defaultBaseUrl(provider)}
        disabled={isPending}
      />

      <Input
        id="ai_api_key"
        type="password"
        label={t("aiLlmApiKey")}
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={isConfigured ? t("aiLlmApiKeyPlaceholderConfigured") : t("aiLlmApiKeyPlaceholder")}
        disabled={isPending}
        autoComplete="off"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? tCommon("saving") : t("aiLlmSaveButton")}
        </Button>
        {isConfigured && (
          <Button type="button" variant="outline" onClick={handleClear} disabled={isPending}>
            {t("aiLlmRemoveButton")}
          </Button>
        )}
        <span
          className={`rounded-full px-2.5 py-1 text-xs ${
            isConfigured ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {isConfigured ? t("aiLlmConfigured") : t("aiLlmNotConfigured")}
        </span>
      </div>

      <p className="text-xs text-gray-500">{t("aiLlmHint")}</p>

      {feedback && (
        <p className={`text-sm ${feedback.type === "error" ? "text-red-600" : "text-green-600"}`}>
          {feedback.text}
        </p>
      )}
    </form>
  );
}
