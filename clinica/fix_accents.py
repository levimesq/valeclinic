import os
import re

files = [
    r'c:\Users\Levi\OneDrive\Desktop\clinica\fisio.html',
    r'c:\Users\Levi\OneDrive\Desktop\clinica\fono.html',
    r'c:\Users\Levi\OneDrive\Desktop\clinica\pilates.html'
]

replacements = {
    "MÃ³dulo": "M&oacute;dulo",
    "ClÃ­nica": "Cl&iacute;nica",
    "GestÃ£o": "Gest&atilde;o",
    "evoluÃ§Ã£o": "evolu&ccedil;&atilde;o",
    "prontuÃ¡rio": "prontu&aacute;rio",
    "EvoluÃ§Ãµes": "Evolu&ccedil;&otilde;es",
    "TerÃ§a": "Ter&ccedil;a",
    "SÃ¡bado": "S&aacute;bado",
    "JoÃ£o": "Jo&atilde;o",
    "RecepÃ§Ã£o": "Recep&ccedil;&atilde;o",
    "PatrÃ­cia": "Patr&iacute;cia",
    "ConcluÃ­do": "Conclu&iacute;do",
    "SessÃ£o": "Sess&atilde;o",
    "SessÃµes": "Sess&otilde;es",
    "VocÃª": "Voc&ecirc;",
    "exercÃ­cios": "exerc&iacute;cios",
    "tÃ©cnicas": "t&eacute;cnicas",
    "NÃ­vel": "N&iacute;vel",
    "prÃ©vias": "pr&eacute;vias",
    "PrÃ³xima": "Pr&oacute;xima",
    "prÃ³ximo": "pr&oacute;ximo",
    "GrÃ¡fico": "Gr&aacute;fico",
    "MÃ©trica": "M&eacute;trica",
    "FlexÃ£o": "Flex&atilde;o",
    "MÃªs": "M&ecirc;s",
    "MÃªses": "M&ecirc;ses",
    "Ãšltimo": "&Uacute;ltimo",
    "Ãšltimos": "&Uacute;ltimos",
    "Ã rea": "&Aacute;rea",
    "DisponÃ­veis": "Dispon&iacute;veis",
    "AvanÃ§ado": "Avan&ccedil;ado",
    "ReposiÃ§Ã£o": "Reposi&ccedil;&atilde;o",
    "ReposiÃ§Ãµes": "Reposi&ccedil;&otilde;es",
    "InsuportÃ¡vel": "Insuport&aacute;vel",
    "FrequÃªncia": "Frequ&ecirc;ncia",
    "SÃ­lvia": "S&iacute;lvia",
    "ManhÃ£": "Manh&atilde;",
    "EvasÃ£o": "Evas&atilde;o",
    "PÃ³s-OperatÃ³ria": "P&oacute;s-Operat&oacute;ria",
    "AÃ§Ãµes": "A&ccedil;&otilde;es",
    "RespiratÃ³ria": "Respirat&oacute;ria",
    "NeurolÃ³gica": "Neurol&oacute;gica",
    "Pedro Ã lvares": "Pedro &Aacute;lvares",
    "RelatÃ³rio": "Relat&oacute;rio",
    "RelatÃ³rios": "Relat&oacute;rios",
    "DicÃ§Ã£o": "Dic&ccedil;&atilde;o",
    "ColÃ©gio": "Col&eacute;gio",
    "1Âº": "1&ordm;",
    "2Âª": "2&ordf;",
    "ReferÃªncia": "Refer&ecirc;ncia",
    "alcanÃ§ados": "alcan&ccedil;ados",
    "recomendAções": "recomenda&ccedil;&otilde;es",
    "adaptAções": "adapta&ccedil;&otilde;es",
    "ReabilitAção": "Reabilita&ccedil;&atilde;o",
    "ConfigurAções": "Configura&ccedil;&otilde;es",
    "NotificAções": "Notifica&ccedil;&otilde;es",
    "reAção": "rea&ccedil;&atilde;o",
    "observAções": "observa&ccedil;&otilde;es",
    "ExportAção": "Exporta&ccedil;&atilde;o",
    "RecuperAção": "Recupera&ccedil;&atilde;o",
    "DomÃ­nio": "Dom&iacute;nio",
    "ForÃ§a": "For&ccedil;a",
    "Gestão": "Gest&atilde;o",
    "histórico": "hist&oacute;rico",
    "Ações": "A&ccedil;&otilde;es",
    "Módulo": "M&oacute;dulo",
    "Evolução": "Evolu&ccedil;&atilde;o",
    "Avaliação": "Avalia&ccedil;&atilde;o",
    
    # Base accented text (to catch any missed)
    "ã": "&atilde;",
    "á": "&aacute;",
    "â": "&acirc;",
    "à": "&agrave;",
    "é": "&eacute;",
    "ê": "&ecirc;",
    "í": "&iacute;",
    "ó": "&oacute;",
    "ô": "&ocirc;",
    "ú": "&uacute;",
    "ü": "&uuml;",
    "ç": "&ccedil;",
    "ñ": "&ntilde;",
    "Ã": "&Atilde;",
    "Á": "&Aacute;",
    "Â": "&Acirc;",
    "À": "&Agrave;",
    "É": "&Eacute;",
    "Ê": "&Ecirc;",
    "Í": "&Iacute;",
    "Ó": "&Oacute;",
    "Ô": "&Ocirc;",
    "Ú": "&Uacute;",
    "Ü": "&Uuml;",
    "Ç": "&Ccedil;",
    "Ñ": "&Ntilde;",
}

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into parts: HTML and Scripts
    # A simple regex to find script tags and keep them untouched
    parts = re.split(r'(<script.*?>.*?</script>)', content, flags=re.DOTALL | re.IGNORECASE)
    
    for i in range(len(parts)):
        if not parts[i].lower().startswith('<script'):
            # Replace mojibake and specific words first
            for k, v in replacements.items():
                parts[i] = parts[i].replace(k, v)
                
    new_content = "".join(parts)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
