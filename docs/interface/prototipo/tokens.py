# Gera os blocos de tokens (claro e escuro) do visual.md, com os hex exatos.
LIGHT = dict(
  lateral='#F5F7FA', fundo='#FDFDFE', **{'nivel-1': '#FFFFFF', 'nivel-2': '#FFFFFF', 'nivel-3': '#FFFFFF'},
  hover='#F0F2F5', **{'hover-nivel': '#F2F3F7'}, ativo='#E9EBEF', selecao='#E8EEFF',
  fio='#E1E3E6', **{'fio-forte': '#CFD1D4', 'borda-campo': '#8A8C8F'},
  texto='#18191C', **{'texto-2': '#47494C', 'texto-3': '#636568'}, icone='#595B5E',
  acento='#3856C8', **{'acento-solido': '#3856C8', 'acento-solido-hover': '#2F4ABA', 'sobre-acento': '#FFFFFF'},
  atraso='#C22826', **{'atraso-bg': '#FEF0EE'}, ok='#21763C', **{'ok-bg': '#E8F9EB'},
  aviso='#8F5A04', **{'aviso-bg': '#FFF4E2'}, conflito='#982F93', **{'conflito-bg': '#FDEEFB'},
  perigo='#C22826', toast='#202224', **{'sobre-toast': '#F8FAFE'},
  **{'acento-25': 'rgb(56 86 200 / .25)', 'acento-35': 'rgb(56 86 200 / .35)', 'sel-texto': 'rgb(56 86 200 / .22)', 'veu': 'rgb(16 18 27 / .18)',
     'sombra-card': '0 1px 0 rgb(16 18 27 / .04)', 'sombra-card-hover': '0 1px 3px rgb(16 18 27 / .08)',
     'sombra': '0 4px 16px rgb(16 18 27 / .08), 0 1px 3px rgb(16 18 27 / .06)', 'sombra-gaveta': '0 -8px 24px rgb(16 18 27 / .08)',
     'luz': '0 0 #0000', 'w-ui': '400', 'card-hover': '#FFFFFF', 'barra-a-fundo': '#F2F4F9', 'barra-a-hover': '#E9EBEF', 'barra-a-ativo': '#E3E5EA', 'campo-b': '#F0F2F5',
     'lb-mcp': '#1577C8', 'lb-backend': '#6B7587', 'lb-editor': '#835CBE', 'lb-kanban': '#048681', 'lb-operacao': '#A06604', 'lb-fornecedores': '#BA4E25', 'lb-compras': '#4A871B',
     'mk-violeta-bg': '#EEE7FF', 'mk-violeta-fg': '#68449C', 'mk-ocre-bg': '#FBE8D3', 'mk-ocre-fg': '#7E4F04',
     'mk-cinza-bg': '#E5E8ED', 'mk-cinza-fg': '#474D58', 'mk-verde-bg': '#DCF2DF', 'mk-verde-fg': '#046E30'})
DARK = dict(
  lateral='#0E1116', fundo='#13161C', **{'nivel-1': '#191D22', 'nivel-2': '#1F2228', 'nivel-3': '#24272D'},
  hover='#1C1F25', **{'hover-nivel': '#25292E'}, ativo='#23262C', selecao='#202941',
  fio='#2B2E34', **{'fio-forte': '#383C42', 'borda-campo': '#6F737A'},
  texto='#ECF0F8', **{'texto-2': '#BEC3CA', 'texto-3': '#9A9FA6'}, icone='#ADB1B9',
  acento='#86A5FB', **{'acento-solido': '#4B6BD4', 'acento-solido-hover': '#4260C8', 'sobre-acento': '#FAFCFF'},
  atraso='#F98078', **{'atraso-bg': '#3D1D1B'}, ok='#6AD18A', **{'ok-bg': '#152E1C'},
  aviso='#F2B95A', **{'aviso-bg': '#342611'}, conflito='#E38FDB', **{'conflito-bg': '#352033'},
  perigo='#CA3638', toast='#2B2E34', **{'sobre-toast': '#EDF2FA'},
  **{'acento-25': 'rgb(134 165 251 / .25)', 'acento-35': 'rgb(134 165 251 / .35)', 'sel-texto': 'rgb(134 165 251 / .30)', 'veu': 'rgb(4 6 10 / .55)',
     'sombra-card': '0 0 #0000', 'sombra-card-hover': '0 0 #0000',
     'sombra': '0 8px 24px rgb(0 0 0 / .45)', 'sombra-gaveta': '0 -12px 32px rgb(0 0 0 / .40)',
     'luz': 'inset 0 1px 0 rgb(255 255 255 / .05)', 'w-ui': '450', 'card-hover': '#25292E', 'barra-a-fundo': '#0E1116', 'barra-a-hover': '#161A1F', 'barra-a-ativo': '#1D2126', 'campo-b': '#191D22',
     'lb-mcp': '#6FB6FE', 'lb-backend': '#A7B2C5', 'lb-editor': '#BE9DF7', 'lb-kanban': '#0DCBC3', 'lb-operacao': '#E5A14B', 'lb-fornecedores': '#F69370', 'lb-compras': '#8CC36D',
     'mk-violeta-bg': '#382B4D', 'mk-violeta-fg': '#C2A7F4', 'mk-ocre-bg': '#462D0B', 'mk-ocre-fg': '#E5AB66',
     'mk-cinza-bg': '#31363D', 'mk-cinza-fg': '#B7BECB', 'mk-verde-bg': '#193B22', 'mk-verde-fg': '#82CB92'})
def block(d, ind='  '):
    keys=list(d.keys()); out=[]; line=ind
    for k in keys:
        item=f'--{k}: {d[k]}; '
        if len(line)+len(item)>150: out.append(line.rstrip()); line=ind
        line+=item
    out.append(line.rstrip())
    return '\n'.join(out)
light = ':root {\n  color-scheme: light;\n' + block(LIGHT) + "\n  --f-ui: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;\n  --f-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;\n  --ease: cubic-bezier(.2, .8, .2, 1);\n  --sbw: 256px;\n  --toast-b: 16px;\n  --aba-sublinhado: var(--acento); --marcador: var(--acento);\n  --sbw-open: 256px;\n}"
dark_body = '  color-scheme: dark;\n' + block(DARK)
dark = '@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]):not([data-tf-theme="light"]) {\n' + block(dict(), '') + dark_body.replace('\n', '\n  ').replace('  color-scheme', '    color-scheme', 1) + '\n  }\n}\n:root[data-theme="dark"]:not([data-tf-theme="light"]), :root[data-tf-theme="dark"] {\n' + dark_body + '\n}'
print(light + '\n' + dark)
