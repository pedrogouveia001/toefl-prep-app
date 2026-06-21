# Guia de Mineração de Dados Reais - TOEFL iBT Simulator

Este guia detalha **onde achar** e **como incorporar** materiais autênticos do TOEFL iBT (textos acadêmicos, áudios de palestras, e cenários de redação) sem infringir direitos autorais e de forma 100% gratuita.

---

## 📖 1. READING: Mineração de Textos Acadêmicos e Questões

O TOEFL iBT utiliza textos introdutórios de nível universitário americano (~700 palavras) cobrindo ciências (biologia, geologia, astronomia), história, artes e antropologia.

### Fontes Exaustivas
1. **OpenStax (Rice University):** 
   * **O que é:** O maior repositório de livros didáticos universitários open-source do mundo.
   * **Livros Recomendados:** *Biology 2e*, *U.S. History*, *Introduction to Anthropology* e *Concepts of Biology*. Os parágrafos, nível de vocabulário e estilo são idênticos aos da banca ETS.
   * **API CNX:** Acesse o catálogo através do endpoint público `https://archive.cnx.org/contents/[section_id].json`.
2. **Smithsonian Open Access API:**
   * **O que é:** API que dá acesso a milhões de registros científicos, artigos de curadores de museus e textos de pesquisa histórica da instituição.
   * **Link:** [Smithsonian Collection Search API](https://www.si.edu/openaccess)
3. **PDFs de Prática Oficial da ETS:**
   * **O que é:** A ETS disponibiliza o *TOEFL iBT Free Practice Test* e os *TOEFL iBT Reading Practice Sets* em PDF em seu site oficial. Eles contêm dezenas de textos reais com questões e gabaritos autênticos.

### Como Incorporar
Execute o script Python `scripts/extract_toefl_pdf.py` passando o PDF baixado como argumento:
```bash
python scripts/extract_toefl_pdf.py caminhos/para/toefl-practice.pdf -o reading_data.json
```
Isso quebrará o PDF em uma estrutura JSON limpa com as perguntas, opções de múltipla escolha e respostas corretas prontas para serem coladas no objeto `MOCK_TESTS` dentro de `app.js`.

---

## 🎧 2. LISTENING: Extração de Palestras e Diálogos

Você precisa do áudio legítimo + a transcrição textual exata para alimentar o sistema.

### Fontes Exaustivas
1. **Playlists 101 do MIT OpenCourseWare & Yale Courses (YouTube):**
   * **O que buscar:** Aulas introdutórias gravadas. Exemplos: *MIT 7.01SC Fundamentals of Biology* ou *Yale GG 140 The Atmosphere, Ocean, and Environmental Change*.
   * **Vantagem:** O áudio é gravado de forma clara, o sotaque é americano padrão e o vocabulário é puramente acadêmico.
2. **TED-Ed (YouTube via API):**
   * **O que buscar:** Vídeos curtos sobre ciências e história.
   * **Vantagem:** Áudio limpo, narrações profissionais e legendas 100% precisas feitas por humanos.
3. **LibriVox API:**
   * **O que é:** Repositório de audiolivros em domínio público gravados por falantes nativos.
   * **Link:** `https://librivox.org/api/feed/audiobooks`

### Como Incorporar
Você não precisa armazenar os arquivos pesados de áudio `.mp3` no seu computador. A aplicação utiliza a **YouTube Iframe Player API** oculta no simulador.

1. Identifique o `video_id` do vídeo no YouTube (ex: `W276_VEnC4U` para a aula do MIT sobre Placas Tectônicas).
2. Execute o script `scripts/youtube_transcript_miner.py` para extrair a transcrição exata:
   ```bash
   python scripts/youtube_transcript_miner.py W276_VEnC4U -o listening_data.json
   ```
3. Cole a estrutura gerada no banco de dados `MOCK_TESTS` de `app.js`. O simulador carregará o player do YouTube de forma offscreen (invisível) e atualizará a barra de progresso do TOEFL dinamicamente à medida que o áudio toca.

---

## 🗣️ 3. SPEAKING: Captura das Novas Tarefas 2026

O TOEFL agora possui as tarefas de *Listen and Repeat* (Repetir frases curtas) e *Take an Interview* (Responder perguntas espontâneas de entrevista).

### Fontes Exaustivas
1. **The British Council - Listening Section (Níveis A2 a B2):**
   * Contém dezenas de pequenos clipes de áudio e transcrições simulando diálogos em recepções de faculdade, orientações de biblioteca e conversas comuns no campus.
2. **Datasets ESL no Kaggle:**
   * O dataset *Common Voice (Mozilla)* permite filtrar por frases curtas em inglês americano.
3. **ETS TOEFL iBT Practice Sets (Speaking Section):**
   * Contém os scripts exatos das perguntas do entrevistador.

### Como Incorporar
No simulador (`app.js`), armazenamos os textos alvo das frases. A aplicação consome a API nativa do navegador `window.speechSynthesis` para falar os prompts gratuitamente com sotaque americano, e usa a `Web Speech API` (Reconhecimento de Voz) para ouvir e transcrever o usuário.
* **Avaliação de Pronúncia:** Usamos o algoritmo de **Distância de Levenshtein** (nativa em `app.js` no método `getSimilarityScore`) para dar a nota de precisão fonética de 0 a 100% comparando o texto alvo com o falado, sem custo de API externa.

---

## ✍️ 4. WRITING: O Cenário do Fórum de Discussão Acadêmica

Esta seção envolve extrair o prompt de discussão de um professor e os posts de exemplo de dois alunos (geralmente Kelly e Paul) com pontos de vista opostos.

### Fontes Exaustivas
1. **ETS Preparation Portal - Writing Section PDFs:**
   * A própria ETS disponibiliza um PDF com mais de **20 tópicos completos de fóruns reais**, incluindo as perguntas dos professores e as respostas de Kelly e Paul.
2. **Repositórios de prompts do TOEFL no GitHub:**
   * Engenheiros de prompt já catalogaram os cenários e construíram geradores estáticos.

### Como Incorporar
Como são textos curtos (o prompt do professor tem ~80 palavras e as postagens dos alunos ~50 cada), basta estruturá-los no array `WRITING_PROMPTS` do `app.js` no seguinte formato:

```json
{
  "id": "toefl-t2-discussion-x",
  "category": "🤖 Categoria",
  "title": "Título Curto",
  "description": "Texto descritivo geral...",
  "professorName": "Dr. Nome",
  "topic": "Assunto Central",
  "professorPrompt": "Enunciado do professor...",
  "student1Name": "Kelly",
  "student1Post": "Postagem da Kelly...",
  "student2Name": "Paul",
  "student2Post": "Postagem do Paul..."
}
```
A Arena de Escrita detectará essa estrutura e renderizará o fórum virtual exatamente como no dia da prova.
