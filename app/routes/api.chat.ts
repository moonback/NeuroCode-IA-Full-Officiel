import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createDataStream, generateId } from 'ai';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS, type FileMap } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/common/prompts/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import type { IProviderSetting } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';
import { getFilePaths, selectContext } from '~/lib/.server/llm/select-context';
import type { ContextAnnotation, ProgressAnnotation } from '~/types/context';
import { WORK_DIR } from '~/utils/constants';
import { createSummary } from '~/lib/.server/llm/create-summary';
import { extractPropertiesFromMessage } from '~/lib/.server/llm/utils';
import { getSystemPrompt } from '~/lib/common/prompts/test-prompt';
const CLAUDE_CACHE_TOKENS_MULTIPLIER = {
  WRITE: 1.25,
  READ: 0.1,
};
export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

const logger = createScopedLogger('api.chat');

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

function isValidHeaderValue(value: string): boolean {
  return /^[a-zA-Z0-9\-._~()'!*:@,;=+$\/?%#\[\]]+$/.test(value);
}

async function chatAction({ context, request }: ActionFunctionArgs) {
    const { messages, files, promptId, contextOptimization, customPrompt, isPromptCachingEnabled } = await request.json<{
    messages: Messages;
    files: any;
    promptId?: string;
    contextOptimization: boolean;
    customPrompt?: string;
    isPromptCachingEnabled?: boolean;
  }>();

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = JSON.parse(parseCookies(cookieHeader || '').apiKeys || '{}');
  const providerSettings: Record<string, IProviderSetting> = JSON.parse(
    parseCookies(cookieHeader || '').providers || '{}',
  );

  const stream = new SwitchableStream();

  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };
  let isCacheHit = false;
  let isCacheMiss = false;
  const encoder: TextEncoder = new TextEncoder();
  let progressCounter: number = 1;

  try {
    const totalMessageContent = messages.reduce((acc, message) => acc + message.content, '');
    logger.debug(`Longueur du message total: ${totalMessageContent.split(' ').length}, mots`);

    let lastChunk: string | undefined = undefined;

    const dataStream = createDataStream({
      async execute(dataStream) {
        const filePaths = getFilePaths(files || {});
        let filteredFiles: FileMap | undefined = undefined;
        let summary: string | undefined = undefined;
        let messageSliceId = 0;

        if (messages.length > 3 && messages.length !== 4) {
          messageSliceId = messages.length - 3;
        }

        if (filePaths.length > 0 && contextOptimization) {
          logger.debug('Génération de la synthèse de la conversation ');
          dataStream.writeData({
            type: 'progress',
            label: 'summary',
            status: 'in-progress',
            order: progressCounter++,
            message: `Analyse des ${messages.length} messages de la conversation `,
          } satisfies ProgressAnnotation);

          // Create a summary of the chat
          console.log('Nombre de messages: ', messages.length);
          console.log(`Nombre de fichiers: ${filePaths.length}`);

          summary = await createSummary({
            messages: [...messages],
            env: context.cloudflare?.env,
            apiKeys,
            providerSettings,
            promptId,
            contextOptimization,
            abortSignal: request.signal,

            onFinish(resp) {
              if (resp.usage) {
                logger.debug('Utilisation des tokens pour la synthèse de la conversation', JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            },
          });
          dataStream.writeData({
            type: 'progress',
            label: 'summary',
            status: 'complete',
            order: progressCounter++,
            message: `Analyse terminée pour ${messages.length} messages `,
          } satisfies ProgressAnnotation);

          dataStream.writeMessageAnnotation({
            type: 'chatSummary',
            summary,
            chatId: messages.slice(-1)?.[0]?.id,
          } as ContextAnnotation);

          // Update context buffer
          logger.debug('Mise à jour du tampon de contexte');
          dataStream.writeData({
            type: 'progress',
            label: 'context',
            status: 'in-progress',
            order: progressCounter++,
            message: 'Détermination des fichiers pertinents ',
          } satisfies ProgressAnnotation);

          // Select context files
          console.log('Nombre de messages: ', messages.length);
          filteredFiles = await selectContext({
            messages: [...messages],
            env: context.cloudflare?.env,
            apiKeys,
            files,
            providerSettings,
            promptId,
            contextOptimization,
            abortSignal: request.signal,

            summary,
            onFinish(resp) {
              const cacheUsage = resp?.experimental_providerMetadata?.anthropic;
              console.debug({ cacheUsage });

              isCacheHit = !!cacheUsage?.cacheReadInputTokens;
              isCacheMiss = !!cacheUsage?.cacheCreationInputTokens && !isCacheHit;
              if (resp.usage) {
                logger.debug('Utilisation des tokens pour la sélection du contexte', JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += Math.round(resp?.usage.completionTokens || 0);
                cumulativeUsage.promptTokens += Math.round(
                  (resp?.usage.promptTokens || 0) +
                    ((cacheUsage?.cacheCreationInputTokens as number) || 0) * CLAUDE_CACHE_TOKENS_MULTIPLIER.WRITE +
                    ((cacheUsage?.cacheReadInputTokens as number) || 0) * CLAUDE_CACHE_TOKENS_MULTIPLIER.READ,
                );
                cumulativeUsage.totalTokens = cumulativeUsage.completionTokens + cumulativeUsage.promptTokens;
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            },
          });

          if (filteredFiles) {
            logger.debug(`Fichiers dans le contexte: ${JSON.stringify(Object.keys(filteredFiles))}`);
          }

          dataStream.writeMessageAnnotation({
            type: 'codeContext',
            files: Object.keys(filteredFiles).map((key) => {
              let path = key;

              if (path.startsWith(WORK_DIR)) {
                path = path.replace(WORK_DIR, '');
              }

              return path;
            }),
          } as ContextAnnotation);

          dataStream.writeData({
            type: 'progress',
            label: 'context',
            status: 'complete',
            order: progressCounter++,
            message: `Fichiers pertinents sélectionnés `,
          } satisfies ProgressAnnotation);

          // logger.debug('Code Files Selected');
        }

        // Stream the text
        const options: StreamingOptions = {
          toolChoice: 'none',
          
          onFinish: async ({ text: content, finishReason, usage, experimental_providerMetadata }) => {            logger.debug('usage', JSON.stringify(usage));
            const cacheUsage = experimental_providerMetadata?.anthropic;
            console.debug({ cacheUsage });

            isCacheHit = !!cacheUsage?.cacheReadInputTokens;
            isCacheMiss = !!cacheUsage?.cacheCreationInputTokens && !isCacheHit;
            if (usage) {
              cumulativeUsage.completionTokens += Math.round(usage.completionTokens || 0);
              cumulativeUsage.promptTokens += Math.round(
                (usage.promptTokens || 0) +
                  ((cacheUsage?.cacheCreationInputTokens as number) || 0) * CLAUDE_CACHE_TOKENS_MULTIPLIER.WRITE +
                  ((cacheUsage?.cacheReadInputTokens as number) || 0) * CLAUDE_CACHE_TOKENS_MULTIPLIER.READ,
              );
              cumulativeUsage.totalTokens = cumulativeUsage.completionTokens + cumulativeUsage.promptTokens;
            }

            if (finishReason !== 'length') {
              dataStream.writeMessageAnnotation({
                type: 'usage',
                value: {
                  completionTokens: cumulativeUsage.completionTokens,
                  promptTokens: cumulativeUsage.promptTokens,
                  totalTokens: cumulativeUsage.totalTokens,
                  isCacheHit,
                  isCacheMiss,
                },
              });
              dataStream.writeData({
                type: 'progress',
                label: 'response',
                status: 'complete',
                order: progressCounter++,
                message: 'Réponse générée avec succès',
              } satisfies ProgressAnnotation);

              /*
               * if (contextOptimization) {
               *   await generateResponses({
               *     messages: [...messages],
               *     assistantResponse: content,
               *     env: context.cloudflare?.env,
               *     apiKeys,
               *     providerSettings,
               *     promptId,
               *     contextOptimization,
               *     summary: summary || "",
               *     onFinish(resp) {
               *       if (resp.usage) {
               *         logger.debug('selectContext token usage', JSON.stringify(resp.usage));
               *         cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
               *         cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
               *         cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
               *       }
               *     },
               *   })
               *   then((tasks)=>{
               *     messages=[...messages,...tasks]
               *   })
               *   .catch((e)=>{
               *     logger.error(e)
               *   })
               * }
               */
              await new Promise((resolve) => setTimeout(resolve, 0));

              // stream.close();
              return;
            }

            if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
              throw Error('Impossible de continuer le message: Maximum de segments atteint');
            }

            const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

            logger.info(`Atteint la limite de tokens (${MAX_TOKENS}): Continuation du message (${switchesLeft} segments restants)`);

            const lastUserMessage = messages.filter((x) => x.role == 'user').slice(-1)[0];
            const { model, provider } = extractPropertiesFromMessage(lastUserMessage);
            messages.push({ id: generateId(), role: 'assistant', content });
            messages.push({
              id: generateId(),
              role: 'user',
              content: `[Modèle: ${model}]\n\n[Fournisseur: ${provider}]\n\n${CONTINUE_PROMPT}`,
            });

            const systemPrompt = getSystemPrompt(WORK_DIR, customPrompt);
            // logger.debug('Final system prompt:', systemPrompt);

            const result = await streamText({
              messages: [
                {
                  role: 'system',
                  content: systemPrompt
                },
                ...messages
              ],
              env: context.cloudflare?.env,
              options,
              apiKeys,
              files,
              providerSettings,
              promptId,
              contextOptimization,
              contextFiles: filteredFiles,
              summary,
              isPromptCachingEnabled,
              messageSliceId,
              abortSignal: request.signal,

            });

            result.mergeIntoDataStream(dataStream);

            (async () => {
              try {
                for await (const part of result.fullStream) {
                  if (part.type === 'error') {
                    const error: any = part.error;
                    logger.error(`${error}`);

                    return;
                  }
                }
              } catch (e: any) {
                if (e.name === 'AbortError') {
                  logger.info('Request aborted.');
                  return;
                }

                throw e;
              }
            })();

            return;
          },
        };

        dataStream.writeData({
          type: 'progress',
          label: 'response',
          status: 'in-progress',
          order: progressCounter++,
          message: 'Génération de la réponse en cours',
        } satisfies ProgressAnnotation);

        const systemPrompt = getSystemPrompt(WORK_DIR, customPrompt);
        const result = await streamText({
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            ...messages
          ],
          env: context.cloudflare?.env,
          options,
          apiKeys,
          files,
          providerSettings,
          promptId,
          contextOptimization,
          contextFiles: filteredFiles,
          summary,
          messageSliceId,
          abortSignal: request.signal,

        });

        (async () => {
          try {
            for await (const part of result.fullStream) {
              if (part.type === 'error') {
                const error: any = part.error;
                logger.error(`${error}`);

                return;
              }
            }
          } catch (e: any) {
            if (e.name === 'AbortError') {
              logger.info('Request aborted.');
              return;
            }

            throw e;
          }
        })();
        result.mergeIntoDataStream(dataStream);

        // logger.debug('Custom prompt received:', customPrompt);
      },
      onError: (error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Data stream error:', err);
        
        
        
        return `Error: ${err.message}`;
      },
    }).pipeThrough(
      new TransformStream({
        transform: (chunk, controller) => {
          if (!lastChunk) {
            lastChunk = ' ';
          }

          if (typeof chunk === 'string') {
            if (chunk.startsWith('g') && !lastChunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "<div class=\\"__boltThought__\\">"\n`));
            }

            if (lastChunk.startsWith('g') && !chunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "</div>\\n"\n`));
            }
          }

          lastChunk = chunk;

          let transformedChunk = chunk;

          if (typeof chunk === 'string' && chunk.startsWith('g')) {
            let content = chunk.split(':').slice(1).join(':');

            if (content.endsWith('\n')) {
              content = content.slice(0, content.length - 1);
            }

            transformedChunk = `0:${content}\n`;
          }

          // Convert the string stream to a byte stream
          const str = typeof transformedChunk === 'string' ? transformedChunk : JSON.stringify(transformedChunk);
          controller.enqueue(encoder.encode(str));
        },
      }),
    );

    const headers = new Headers({
      'Content-Type': 'text/event-stream; charset=utf-8',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      'Text-Encoding': 'chunked',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(self)',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    });

    if (customPrompt && isValidHeaderValue(customPrompt)) {
      headers.append('Custom-Prompt', customPrompt);
    }

    return new Response(dataStream, {
      status: 200,
      headers
    });
  } catch (error: any) {
    logger.error(error);

    if (error.message?.includes('API key')) {
      throw new Response('Clé API invalide ou manquante', {
        status: 401,
        statusText: 'Non autorisé',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Erreur interne du serveur',
    });
  }
}