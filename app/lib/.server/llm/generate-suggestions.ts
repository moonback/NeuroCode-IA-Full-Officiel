import { generateText, type CoreTool, type GenerateTextResult, type Message } from 'ai';
import type { IProviderSetting } from '~/types/model';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROVIDER_LIST } from '~/utils/constants';
import { extractPropertiesFromMessage } from './utils';
import { createScopedLogger } from '~/utils/logger';
import { LLMManager } from '~/lib/modules/llm/manager';

// Common patterns to ignore, similar to .gitignore
const logger = createScopedLogger('generate-suggestions');

/**
 * Interface for generating task suggestions
 */
interface GenerateResponsesProps {
  messages: Message[];
  assistantResponse: string;
  env?: Env;
  apiKeys?: Record<string, string>;
  providerSettings?: Record<string, IProviderSetting>;
  promptId?: string;
  contextOptimization?: boolean;
  summary: string;
  onFinish?: (resp: GenerateTextResult<Record<string, CoreTool<any, any>>, never>) => void;
}

const TASK_SUGGESTIONS_REGEX = /<taskSuggestions>([\s\S]*?)<\/taskSuggestions>/;
const TASK_REGEX = /<task>(.*?)<\/task>/gm;

/**
 * Generates task suggestions based on project summary and assistant response
 * @param props - Configuration properties for generating suggestions
 * @returns Array of suggested tasks
 * @throws Error if no models found or invalid response format
 */
export async function generateResponses(props: GenerateResponsesProps): Promise<string[]> {
  const { messages, env: serverEnv, apiKeys, providerSettings, summary, onFinish, assistantResponse } = props;
  
  // Extract model and provider with better error handling
  const { currentModel, currentProvider } = messages.reduce((acc, message) => {
    if (message.role === 'user') {
      try {
        const { model, provider } = extractPropertiesFromMessage(message);
        return { currentModel: model, currentProvider: provider };
      } catch (error) {
        logger.error('Failed to extract properties from message', error);
      }
    }
    return acc;
  }, { currentModel: DEFAULT_MODEL, currentProvider: DEFAULT_PROVIDER.name });

  // Get provider details with fallback
  const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;
  
  // Get model list with better error handling
  let modelDetails;
  try {
    const staticModels = LLMManager.getInstance().getStaticModelListFromProvider(provider);
    modelDetails = staticModels.find((m) => m.name === currentModel);

    if (!modelDetails) {
      const modelsList = [
        ...(provider.staticModels || []),
        ...(await LLMManager.getInstance().getModelListFromProvider(provider, {
          apiKeys,
          providerSettings,
          serverEnv: serverEnv as any,
        })),
      ];

      if (!modelsList.length) {
        throw new Error(`No models found for provider ${provider.name}`);
      }

      modelDetails = modelsList.find((m) => m.name === currentModel) || modelsList[0];
      if (!modelDetails) {
        logger.warn(
          `MODEL [${currentModel}] not found in provider [${provider.name}]. Falling back to first model. ${modelsList[0].name}`,
        );
      }
    }
  } catch (error) {
    logger.error('Failed to get model details', error);
    throw new Error('Failed to initialize model');
  }

  // Generate text with structured prompt
  let resp;
  try {
    resp = await generateText({
      system: `
Now, you are given a task. give the user options for next pending task.
Below is the project details in a summary:
<projectSummary>
${summary}
</projectSummary>
RESPONSE FORMAT:
your response should be in following example format:
---
<taskSuggestions>
    <task>{task_1}</task>
    <task>{task_2}</task>
</taskSuggestions>
---
* Your should start with <taskSuggestions> and end with </taskSuggestions>.
* You can include multiple <task> tags in the response.
* You should not include any other text in the response.
* If no changes are needed, you can leave the response empty taskSuggestions tag.
* Only suggest relevant and immediate task that should be addressed and in the plan
      `,
      prompt: `
Your last response: 
---
${assistantResponse}
---
Suggest what are the immediate tasks that user can ask you to do
      `,
      model: provider.getModelInstance({
        model: currentModel,
        serverEnv,
        apiKeys,
        providerSettings,
      }),
    });
  } catch (error) {
    logger.error('Failed to generate text', error);
    throw new Error('Failed to generate suggestions');
  }

  // Parse and validate response with better error handling
  try {
    const response = resp.text;
    const suggestions = response.match(TASK_SUGGESTIONS_REGEX);
    if (!suggestions) {
      throw new Error('Invalid response format. Missing taskSuggestions tag');
    }

    const tasks = (suggestions[1].match(TASK_REGEX) || [])
      .map((task) => task.replace('<task>', '').replace('</task>', ''))
      .filter(Boolean);

    if (onFinish) {
      onFinish(resp);
    }

    return tasks;
  } catch (error) {
    logger.error('Failed to parse response', error);
    throw new Error('Failed to parse suggestions');
  }
}