# Equações no Tinyfold

O editor renderiza fórmulas LaTeX com KaTeX. A fórmula é salva no documento e pode ser editada depois, inclusive quando estiver incompleta.

## Inserir e editar

Digite `/equacao` no editor e escolha:

- **Equação:** fórmula em um bloco separado. Escreva o LaTeX e confirme em **OK**.
- **Equação em linha:** fórmula dentro de um parágrafo. O diálogo mostra o campo **Código LaTeX** e a prévia. Confirme em **Salvar equação** ou use Ctrl/Cmd+Enter; **Cancelar** descarta somente a edição do diálogo.

Clique na fórmula para editar novamente. Nos campos de edição, escreva apenas a fonte, sem os delimitadores `$`.

Você também pode digitar `$x^2$` no parágrafo para criar uma fórmula em linha pelo teclado.

Exemplos:

```latex
E = mc^2
\frac{a}{b} + \sqrt{x}
\int_0^1 x^2\,dx = \frac{1}{3}
\begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}
```

Uma fórmula inválida mostra uma indicação para editar. Seu texto não é apagado: pode ser salvo, reaberto e exportado para continuar depois.

## Markdown

Arquivos `.md` aceitam fórmulas em linha entre `$...$` e blocos entre linhas `$$`:

```markdown
A energia é $E = mc^2$.

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$
```

A importação cria outro documento. A exportação inclui a fonte LaTeX, mesmo que esteja incompleta. Fórmulas em código, rótulos de links e HTML não são convertidas pelo importador de matemática.

Quando a fonte contém sinais de dólar, o exportador escolhe delimitadores maiores para evitar truncamento. Fórmulas em linha adjacentes podem receber um comentário HTML vazio entre elas para manter a separação. Conforme a sintaxe Markdown, quebras de linha dentro de uma fórmula em linha são normalizadas para espaços; uma fórmula em linha vazia usa um espaço como conteúdo. O JSON salvo no SQLite mantém a fonte original.

KaTeX aceita um subconjunto de LaTeX; este editor não compila documentos TeX completos. A renderização usa o modo padrão sem comandos HTML confiáveis. Projetos, tarefas e metadados internos continuam fora do arquivo Markdown.
