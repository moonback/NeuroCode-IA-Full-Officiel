import { getSystemPrompt } from '~/lib/common/prompts/prompts';
import { getSystemPrompt as optimized } from '~/lib/common/prompts/optimized';
import { getSystemPrompt as testOptimized } from '~/lib/common/prompts/test-prompt';
import smallModel from './prompts/small-model';

import { WORK_DIR, MODIFICATIONS_TAG_NAME } from '~/utils/constants';
import { allowedHTMLElements } from '~/utils/markdown';


export interface PromptOptions {
  cwd: string;
  allowedHtmlElements: string[];
  modificationTagName: string;
  customPrompt?: string;
}

export class PromptLibrary {
  static library: Record<
    string,
    {
      label: string;
      description: string;
      get: (options: PromptOptions) => string;
    }
  > = {
    default: {
      label: 'Officiel',
      description: 'Prompt officiel de NeuroCode',
      get: (options) => getSystemPrompt(options.cwd),
    },
    optimized: {
      label: 'Optimisé',
      description: 'Prompt expérimentalement optimisé pour les réponses',
      get: (options) => optimized(options.cwd),
    },
    test: {
      label: 'NeuroCode UI/UX',
      description: 'Prompt pour la conception d\'interfaces utilisateur',
      get: (options) => testOptimized(options.cwd, options.customPrompt),
    },
    smallModel: {
      label: 'Small Model Prompt',
      description: 'Compact prompt for small LLMs (7B or less) to help with code generation',
      get: (options) => smallModel(options),
    },
    
    
    
  };
  static getList() {
    return Object.entries(this.library).map(([key, value]) => {
      const { label, description } = value;
      return {
        id: key,
        label,
        description,
      };
    });
  }
  static getPropmtFromLibrary(promptId: string, options: PromptOptions) {
    const prompt = this.library[promptId];

    if (!prompt) {
      throw 'Prompt non trouvé';
    }

    if (options.customPrompt) {
      return options.customPrompt;
    }

    return this.library[promptId]?.get(options);
  }
}
