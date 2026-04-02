import { generateText, Output } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

const MODEL_PRIMARY = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash'
const MODEL_FALLBACK = process.env.OPENROUTER_FALLBACK_MODEL ?? 'openai/gpt-4o-mini'

const CheckSchema = z.object({
  categoria: z.string(),
  item: z.string(),
  status: z.enum(['ok', 'aviso', 'erro']),
  detalhe: z.string(),
  sugestao: z.string().optional(),
})

const LaudoSchema = z.object({
  resultado: z.enum(['aprovado', 'ajustes_necessarios', 'reprovado']),
  score: z.number().int().min(0).max(100),
  resumo: z.string(),
  checks: z.array(CheckSchema),
})

export type LaudoResult = z.infer<typeof LaudoSchema>
export type Check = z.infer<typeof CheckSchema>

const SYSTEM_PROMPT = `Você é um auditor técnico sênior da Seazone. Analisa artefatos (planilhas, scripts, flows, queries, dashboards, aplicações web) antes de irem para produção.

Responda SEMPRE em português brasileiro.

## Critérios de avaliação

### Segurança
- Tokens, senhas, CPFs ou credenciais hardcoded no código?
- Dados sensíveis expostos sem necessidade?

### Qualidade de dados
- Referências quebradas (#REF, #N/A em planilhas)?
- Valores hardcoded onde deveriam ser parâmetros ou variáveis de ambiente?
- Dados fictícios/teste em produção?

### Lógica
- A lógica implementada bate com o objetivo declarado?
- Totais, percentuais e fórmulas são consistentes?
- Casos de borda tratados?

### Manutenibilidade
- Código/fórmulas documentados minimamente?
- Nomes descritivos (não: coluna1, var1, tmp)?
- Sem código morto ou comentado em excesso?

### Robustez
- Tratamento de erros presente?
- Dependências externas explicitadas?
- Funciona com dados reais (não apenas o exemplo)?

## Resultado
- **aprovado**: Pronto para produção, no máximo avisos menores (score 70+)
- **ajustes_necessarios**: Problemas que precisam ser corrigidos antes de ir para produção (score 40-69)
- **reprovado**: Problemas críticos de segurança, dados ou lógica (score abaixo de 40)

## Regras obrigatórias
- Gere entre 5 e 15 checks distribuídos pelas categorias acima
- Inclua checks com status "ok" para dar contexto ao que está correto
- No campo "detalhe": SEMPRE inclua o que encontrou, onde (linha/célula/nó/função), e por que é um problema
- Para status "aviso" ou "erro": SEMPRE forneça o campo "sugestao" com correção concreta
- Se não houver informação suficiente para avaliar uma categoria, marque como "ok" com detalhe "Não foi possível verificar com as informações fornecidas"

## Exemplos de calibração

Score 92 — aprovado:
{ resultado: "aprovado", score: 92, resumo: "Script bem estruturado, variáveis de ambiente corretas, tratamento de erros presente. Apenas documentação inline poderia ser melhorada.", checks: [{ categoria: "Segurança", item: "Credenciais", status: "ok", detalhe: "Todas as chaves usam variáveis de ambiente (process.env)" }, { categoria: "Robustez", item: "Error handling", status: "ok", detalhe: "try/catch em todas as chamadas externas" }, { categoria: "Manutenibilidade", item: "Documentação", status: "aviso", detalhe: "Funções sem comentários explicativos (linha 15, 32, 47)", sugestao: "Adicionar JSDoc nas funções principais" }] }

Score 58 — ajustes_necessarios:
{ resultado: "ajustes_necessarios", score: 58, resumo: "Script funcional mas sem tratamento de erros nas chamadas à API e com URL de staging hardcoded que vai causar problema em produção.", checks: [{ categoria: "Segurança", item: "URLs de ambiente", status: "erro", detalhe: "URL 'https://staging.api.seazone.com.br' hardcoded na linha 8", sugestao: "Usar variável de ambiente API_URL e configurar separado por ambiente" }, { categoria: "Robustez", item: "Error handling", status: "erro", detalhe: "Chamada fetch() na linha 23 sem try/catch — vai quebrar silenciosamente se a API falhar", sugestao: "Envolver em try/catch e logar o erro" }] }

Score 35 — reprovado:
{ resultado: "reprovado", score: 35, resumo: "Script com token de API exposto no código-fonte. Qualquer pessoa com acesso ao repo pode usar o token para acessar dados da empresa.", checks: [{ categoria: "Segurança", item: "Token exposto", status: "erro", detalhe: "Token Pipedrive 'api_token=abc123xyz' hardcoded na linha 4", sugestao: "Mover para variável de ambiente PIPEDRIVE_TOKEN e revogar o token atual imediatamente" }] }`

async function runAnalysis(context: string, model: string): Promise<LaudoResult> {
  const { output } = await generateText({
    model: openrouter(model),
    output: Output.object({ schema: LaudoSchema }),
    system: SYSTEM_PROMPT,
    prompt: `Analise o seguinte artefato e gere o laudo completo:\n\n${context}`,
    temperature: 0,
  })
  return output
}

export async function analyzeArtifact(context: string): Promise<LaudoResult & { model_used: string }> {
  const start = Date.now()

  try {
    const output = await runAnalysis(context, MODEL_PRIMARY)
    const elapsed = Date.now() - start
    console.log(`[analyzer] ${MODEL_PRIMARY} — ${elapsed}ms — ${output.resultado}`)
    return { ...output, model_used: MODEL_PRIMARY }
  } catch (primaryError) {
    console.warn(`[analyzer] ${MODEL_PRIMARY} falhou, tentando fallback:`, primaryError)
    try {
      const output = await runAnalysis(context, MODEL_FALLBACK)
      const elapsed = Date.now() - start
      console.log(`[analyzer] fallback ${MODEL_FALLBACK} — ${elapsed}ms — ${output.resultado}`)
      return { ...output, model_used: MODEL_FALLBACK }
    } catch (fallbackError) {
      console.error('[analyzer] fallback também falhou:', fallbackError)
      throw new Error('Serviço de análise indisponível. Tente novamente em alguns instantes.')
    }
  }
}
