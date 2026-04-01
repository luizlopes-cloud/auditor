-- Seed data para demo do hackathon
-- Inserir 7 laudos pré-carregados com dados realistas

-- Artefatos
INSERT INTO artifacts (id, name, type, source, submitted_by, description, status, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'sync-pipedrive-nekt.py', 'script', 'upload', 'Pedro Maia', 'Script Python que sincroniza deals do Pipedrive com o Nekt via API REST', 'done', NOW() - INTERVAL '6 days'),
  ('a1000000-0000-0000-0000-000000000002', 'relatorio-conversao-mensal.csv', 'planilha', 'upload', 'Ana Lima', 'Planilha de conversão mensal com funil por origem de lead', 'done', NOW() - INTERVAL '5 days'),
  ('a1000000-0000-0000-0000-000000000003', 'workflow-followup-7dias.json', 'flow', 'upload', 'Equipe Revenue', 'Flow n8n de follow-up automático 7 dias após primeira visita', 'done', NOW() - INTERVAL '4 days'),
  ('a1000000-0000-0000-0000-000000000004', 'query-ocupacao-semanal.sql', 'query', 'upload', 'Marketing', 'Query SQL de ocupação semanal por imóvel para relatório executivo', 'done', NOW() - INTERVAL '3 days'),
  ('a1000000-0000-0000-0000-000000000005', 'importar-leads-google-ads.py', 'script', 'upload', 'Pedro Maia', 'Script que importa leads do Google Ads para Pipedrive via webhook', 'done', NOW() - INTERVAL '2 days'),
  ('a1000000-0000-0000-0000-000000000006', 'dashboard-performance.json', 'dashboard', 'upload', 'Equipe Revenue', 'Dashboard Metabase de performance por vendedor — KPIs mensais', 'done', NOW() - INTERVAL '1 day'),
  ('a1000000-0000-0000-0000-000000000007', 'atualizar-status-reservas.py', 'script', 'upload', 'Ana Lima', 'Script que atualiza status de reservas no Pipedrive com base no Sienge', 'done', NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;

-- Laudos
INSERT INTO laudos (id, artifact_id, resultado, score, resumo, checks, model_used, tempo_analise_ms, created_at) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'aprovado',
    92,
    'Script bem estruturado, credenciais via variáveis de ambiente, tratamento de erros em todas as chamadas externas. Apenas documentação inline poderia ser melhorada.',
    '[
      {"categoria":"Segurança","item":"Credenciais","status":"ok","detalhe":"Todas as chaves (PIPEDRIVE_TOKEN, NEKT_API_KEY) usam variáveis de ambiente — nenhuma hardcoded"},
      {"categoria":"Robustez","item":"Error handling","status":"ok","detalhe":"try/catch em todas as chamadas à API REST com log de erro"},
      {"categoria":"Qualidade de dados","item":"Validação de campos","status":"ok","detalhe":"Campos obrigatórios validados antes de enviar para o Nekt"},
      {"categoria":"Lógica","item":"Mapeamento de campos","status":"ok","detalhe":"Mapeamento Pipedrive→Nekt documentado e consistente com o schema"},
      {"categoria":"Manutenibilidade","item":"Documentação","status":"aviso","detalhe":"Funções principais sem docstring (sync_deal, map_fields, handle_conflict)","sugestao":"Adicionar docstring de 1 linha em cada função com o objetivo e os parâmetros esperados"}
    ]',
    'google/gemini-flash-2.0',
    4200,
    NOW() - INTERVAL '6 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000002',
    'aprovado',
    88,
    'Planilha bem organizada, fórmulas consistentes, sem referências quebradas. Dados de exemplo realistas. Poderia ter mais validação de entrada nas células editáveis.',
    '[
      {"categoria":"Qualidade de dados","item":"Referências","status":"ok","detalhe":"Nenhuma referência #REF ou #N/A detectada nas 847 fórmulas verificadas"},
      {"categoria":"Lógica","item":"Consistência dos totais","status":"ok","detalhe":"Totais e subtotais conferem — SOMA das origens bate com total geral"},
      {"categoria":"Segurança","item":"Dados sensíveis","status":"ok","detalhe":"Nenhum CPF, senha ou dado pessoal identificado na planilha"},
      {"categoria":"Robustez","item":"Validação de entrada","status":"aviso","detalhe":"Células de entrada na aba Config sem validação de tipo — aceita texto onde deveria ser número","sugestao":"Aplicar Validação de Dados → Número inteiro nas células C4:C12 da aba Config"},
      {"categoria":"Manutenibilidade","item":"Nomes de abas","status":"ok","detalhe":"Nomes descritivos: Config, Funil, Origem, Relatório — fácil navegar"}
    ]',
    'google/gemini-flash-2.0',
    3800,
    NOW() - INTERVAL '5 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000003',
    'ajustes_necessarios',
    71,
    'Flow funcional mas sem tratamento de erro nos nós HTTP — se a API falhar, o flow trava silenciosamente sem notificar. Credenciais OK.',
    '[
      {"categoria":"Segurança","item":"Credenciais","status":"ok","detalhe":"Credenciais do Pipedrive e SendGrid configuradas via n8n Credentials — não hardcoded"},
      {"categoria":"Robustez","item":"Error handling nos nós HTTP","status":"erro","detalhe":"3 nós HTTP Request (nós 4, 7, 11) sem configuração de error output — falhas silenciosas","sugestao":"Ativar Continue on Fail e adicionar nó de notificação Slack no caminho de erro"},
      {"categoria":"Lógica","item":"Condição de 7 dias","status":"ok","detalhe":"Cálculo de intervalo usa $now.minus(7, days) — correto"},
      {"categoria":"Robustez","item":"Retry em falha de rede","status":"aviso","detalhe":"Sem retry configurado nos nós HTTP — falha de rede transitória aborta o flow","sugestao":"Configurar Retry On Fail = 3 tentativas com intervalo de 30s nos nós críticos"},
      {"categoria":"Manutenibilidade","item":"Nomes dos nós","status":"aviso","detalhe":"Nós 2, 5 e 8 com nomes genéricos (HTTP Request, IF, Set) — dificulta debug","sugestao":"Renomear para descrever a ação: Buscar deals Pipedrive, Verificar 7 dias, Preparar email"}
    ]',
    'google/gemini-flash-2.0',
    5100,
    NOW() - INTERVAL '4 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000004',
    'a1000000-0000-0000-0000-000000000004',
    'ajustes_necessarios',
    65,
    'Query funcionalmente correta mas com data hardcoded e sem índice nas colunas de filtro principais — vai degradar em produção com volume real.',
    '[
      {"categoria":"Qualidade de dados","item":"Data hardcoded","status":"erro","detalhe":"WHERE data_checkin BETWEEN ''2024-01-01'' AND ''2024-12-31'' — ano hardcoded na linha 8","sugestao":"Parametrizar: WHERE data_checkin BETWEEN :data_inicio AND :data_fim — passar via variáveis do relatório"},
      {"categoria":"Robustez","item":"Performance","status":"aviso","detalhe":"Sem índice em property_id e data_checkin — full scan na tabela reservas (~2M rows em produção)","sugestao":"CREATE INDEX CONCURRENTLY idx_reservas_property_date ON reservas(property_id, data_checkin)"},
      {"categoria":"Lógica","item":"Cálculo de ocupação","status":"ok","detalhe":"Taxa = dias_ocupados / dias_periodo está correta, considera check-in e check-out parcial"},
      {"categoria":"Segurança","item":"SQL Injection","status":"ok","detalhe":"Query usa apenas literais e subconsultas — sem concatenação de string com input do usuário"},
      {"categoria":"Manutenibilidade","item":"Comentários","status":"aviso","detalhe":"CTEs sem comentário explicando o propósito (cte_disponibilidade, cte_ocupacao, cte_receita)","sugestao":"Adicionar comentário de 1 linha acima de cada CTE: -- Calcula dias disponíveis por imóvel no período"}
    ]',
    'google/gemini-flash-2.0',
    4600,
    NOW() - INTERVAL '3 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000005',
    'a1000000-0000-0000-0000-000000000005',
    'ajustes_necessarios',
    58,
    'Script funcional mas com URL de staging hardcoded e sem tratamento de erros nas chamadas à API do Google Ads — vai quebrar em produção.',
    '[
      {"categoria":"Qualidade de dados","item":"URL de ambiente","status":"erro","detalhe":"URL https://staging-api.empresa.com.br hardcoded na linha 12 — vai apontar para staging em produção","sugestao":"Usar variável de ambiente API_BASE_URL e configurar separado por ambiente no .env"},
      {"categoria":"Robustez","item":"Error handling","status":"erro","detalhe":"Chamada requests.get() na linha 34 sem try/except — vai crashar silenciosamente se API do Google Ads retornar 4xx/5xx","sugestao":"Envolver em try/except requests.HTTPError e logar com logging.error()"},
      {"categoria":"Segurança","item":"Google Ads Token","status":"ok","detalhe":"Token carregado via os.environ[''GOOGLE_ADS_TOKEN''] — correto"},
      {"categoria":"Lógica","item":"Deduplicação de leads","status":"aviso","detalhe":"Sem verificação se lead já existe no Pipedrive antes de criar — pode gerar duplicatas","sugestao":"Buscar por email no Pipedrive antes de POST /persons — se encontrar, update em vez de create"},
      {"categoria":"Manutenibilidade","item":"Logging","status":"ok","detalhe":"logging configurado com nível INFO e formato com timestamp"}
    ]',
    'google/gemini-flash-2.0',
    4900,
    NOW() - INTERVAL '2 days'
  ),
  (
    'b1000000-0000-0000-0000-000000000006',
    'a1000000-0000-0000-0000-000000000006',
    'reprovado',
    42,
    'Dashboard com dados de teste hardcoded nos filtros padrão e métricas calculadas incorretamente — total geral não bate com soma das linhas.',
    '[
      {"categoria":"Qualidade de dados","item":"Dados de teste em produção","status":"erro","detalhe":"Filtro padrão da pergunta 3 hardcoded com vendedor_id = 999 (usuário de teste) — vai mostrar dados incorretos em produção","sugestao":"Remover o filtro padrão ou usar variável do usuário logado: {{user.id}}"},
      {"categoria":"Lógica","item":"Inconsistência nos totais","status":"erro","detalhe":"Card Total Conversões mostra 847 mas soma das linhas da tabela abaixo é 791 — divergência de 56 registros","sugestao":"Verificar se as queries usam os mesmos filtros de período — card usa mês corrido, tabela usa mês completo"},
      {"categoria":"Robustez","item":"Erro com dados ausentes","status":"aviso","detalhe":"Divisão por zero quando meta_mes = 0 — dashboard quebra para vendedores sem meta configurada","sugestao":"Usar NULLIF(meta_mes, 0) na query ou tratar no frontend com valor padrão"},
      {"categoria":"Segurança","item":"Dados sensíveis","status":"ok","detalhe":"Nenhuma credencial ou dado pessoal exposto no dashboard"},
      {"categoria":"Manutenibilidade","item":"Títulos das perguntas","status":"aviso","detalhe":"3 perguntas com título Untitled — impossível identificar o que mostram sem abrir","sugestao":"Renomear perguntas com o que calculam: Taxa de Conversão %, Tempo Médio de Fechamento, etc."}
    ]',
    'google/gemini-flash-2.0',
    5400,
    NOW() - INTERVAL '1 day'
  ),
  (
    'b1000000-0000-0000-0000-000000000007',
    'a1000000-0000-0000-0000-000000000007',
    'reprovado',
    35,
    'Token da API do Sienge exposto diretamente no código-fonte. Qualquer pessoa com acesso ao repositório pode usar o token para acessar dados do Sienge.',
    '[
      {"categoria":"Segurança","item":"Token hardcoded","status":"erro","detalhe":"SIENGE_TOKEN = ''Bearer eyJhbGc...'' hardcoded na linha 4 do script — token real exposto","sugestao":"Mover para variável de ambiente SIENGE_TOKEN, remover do código e revogar o token atual imediatamente no painel do Sienge"},
      {"categoria":"Segurança","item":"URL com credenciais","status":"erro","detalhe":"URL https://user:senha123@sienge.seazone.com.br hardcoded na linha 7","sugestao":"Separar usuário e senha em variáveis de ambiente SIENGE_USER e SIENGE_PASS"},
      {"categoria":"Robustez","item":"Error handling","status":"aviso","detalhe":"Sem tratamento de erro nas chamadas HTTP — falha silenciosa sem log","sugestao":"Adicionar try/except com logging.error()"},
      {"categoria":"Qualidade de dados","item":"Validação","status":"ok","detalhe":"Campos obrigatórios validados antes de atualizar"},
      {"categoria":"Manutenibilidade","item":"Estrutura","status":"ok","detalhe":"Código bem organizado em funções com nomes descritivos"}
    ]',
    'google/gemini-flash-2.0',
    3600,
    NOW() - INTERVAL '12 hours'
  )
ON CONFLICT (id) DO NOTHING;
