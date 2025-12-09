require.config({
    paths: {
        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs"
    }
});

require(["vs/editor/editor.main"], function () {
    monaco.languages.register({ id: "pseudodf" });

    monaco.languages.setLanguageConfiguration("pseudodf", {
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')']
        ],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: "'", close: "'" },
            { open: '`', close: '`' }
        ]
    });

    monaco.languages.setMonarchTokensProvider("pseudodf", {
        brackets: [
            { open: '{', close: '}', token: 'delimiter.curly' },
            { open: '[', close: ']', token: 'delimiter.bracket' },
            { open: '(', close: ')', token: 'delimiter.parenthesis' }
        ],
        tokenizer: {
            root: [
                [/\/\*.*?\*\//, "comment"],
                [/\/\/.*$/, "comment"],

                [/"(?:[^"\\]|\\.)*"/, "kwTxt"],
                [/'(?:[^'\\]|\\.)*'/, "kwStr"],

                [/\bStr\b/, "kwStr"],
                [/\bTxt\b/, "kwTxt"],
                [/\bNum\b/, "kwNum"],
                [/\bLoc\b/, "kwLoc"],
                [/\bVec\b/, "kwVec"],
                [/\bSnd\b/, "kwSnd"],
                [/\bPar\b/, "kwPar"],
                [/\bPot\b/, "kwPot"],
                [/\bGVal\b/, "kwGVal"],
                [/\bItem\b/, "kwItem"],
                [/\bParam\b/, "kwParam"],
                [/\bTag\b/, "kwTag"],
                [/\b(save|S)\b/, "kwsave"],
                [/\b(game|G)\b/, "kwgame"],
                [/\b(local|L)\b/, "kwlocal"],
                [/\b(line|I)\b/, "kwline"],
                [/\bFunction\b/, "kwFunction"],
                [/\bPlayerEvent\b/, "kwPlayerEvent"],
                [/\bEntityEvent\b/, "kwEntityEvent"],
                [/\bProcess\b/, "kwProcess"],

                [/\bPlayer\b/, "kwPlayer"],
                [/\bifPlayer\b/, "kwifPlayer"],
                [/\bEntity\b/, "kwEntity"],
                [/\bifEntity\b/, "kwifEntity"],
                [/\bSet\b/, "kwSet"],
                [/\bifVar\b/, "kwifVar"],
                [/\bGame\b/, "kwGame"],
                [/\bifGame\b/, "kwifGame"],
                [/\bRepeat\b/, "kwRepeat"],
                [/\bControl\b/, "kwControl"],
                [/\bStart\b/, "kwStart"],
                [/\bCall\b/, "kwCall"],
                [/\bSelect\b/, "kwSelect"],

                [/\belse\b/, "kwelse"],
                [/\bif\b/, "kwifVar"],
                [/(\.|^|[\s;])(not)\b/, ["delimiter", "kwnot"]],

                [/\b(optional|plural)\b/, "keyword"],

                [/\bLS\-CANCEL\b/, "kwLagSlay"],

                [/(\.)([A-Za-z0-9_·@\-]+)/, ["delimiter", "function"]],
                [/(\.)(`(?:[^`\\]|\\.)*`)/, ["delimiter", "function"]],
                [/\b[A-Za-z0-9_·@\-]+(?=\s*\()/, "function"],

                [/\b([A-Za-z])*(?=:)/, "target"],

                [/-?(?:\d*\.\d+|\d+)/, "kwNum"],

                [/[\{\}\(\)\[\]]/, "@brackets"],

                [/%(default|uuid|selected|damager|killer|shooter|victim|projectile)/, "%code"],
                [/%(random|round|index|entry|var|math)(?=\(.*\))/, "%code"],

                [/[A-Za-z0-9_·@%\-][^%\+\/=;,:<>\)\s]+/, "variable"],
                [/[A-Za-z0-9_·@%]/, "variable"],
                ["`", { token: "variable.delim", next: "@btString" }],

                [/;/, "delimiter"]
            ],

            btString: [
                ["`", { token: "variable.delim", next: "@pop" }],

                [/%(default|uuid|selected|damager|killer|shooter|victim|projectile)/, "%code"],
                [/%(random|round|index|entry|var|math)(?=\(.*\))/, "%code"],
                
                [/./, "variable"]
            ]
        }
    });

    monaco.editor.defineTheme("pseudodf-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
            { token: "kwStr",   foreground: "#52dcdcff" },
            { token: "kwTxt",   foreground: "#7dcb2fff" },
            { token: "kwNum",   foreground: "#D98888" },
            { token: "kwLoc",   foreground: "#4ED54E" },
            { token: "kwVec",   foreground: "#2afca8" },
            { token: "kwSnd",   foreground: "#6969F0" },
            { token: "kwPar",   foreground: "#995BD7" },
            { token: "kwPot",   foreground: "#CA5773" },
            { token: "kwGVal",   foreground: "#D6AB58" },
            { token: "kwItem",   foreground: "#E2B460" },
            { token: "kwParam",   foreground: "#a8fca8" },
            { token: "kwTag",   foreground: "#c586c0" },
            { token: "kwsave",   foreground: "#DCDC35" },
            { token: "kwgame",   foreground: "#CFB9AD" },
            { token: "kwlocal",   foreground: "#8CE38C" },
            { token: "kwline",   foreground: "#54a8fc" },

            { token: "kwFunction",  foreground: "#4185FE" },
            { token: "kwPlayerEvent",  foreground: "#82F9EA" },
            { token: "kwEntityEvent",  foreground: "#E2B306" },
            { token: "kwProcess",  foreground: "#01ED48" },
            { token: "kwPlayer",  foreground: "#c69025ff" },
            { token: "kwifPlayer",  foreground: "#D3AD66" },
            { token: "kwEntity",  foreground: "#80D218" },
            { token: "kwifEntity",  foreground: "#D17B68" },
            { token: "kwSet",  foreground: "#dbe9ff" },
            { token: "kwifVar",  foreground: "#A461FF" },
            { token: "kwGame",  foreground: "#D37272" },
            { token: "kwifGame",  foreground: "#991014" },
            { token: "kwRepeat",  foreground: "#58E2C5" },
            { token: "kwControl",  foreground: "#8086CC" },
            { token: "kwStart",  foreground: "#3AFF75" },
            { token: "kwCall",  foreground: "#4478DE" },
            { token: "kwSelect",  foreground: "#E29CE2" },

            { token: "kwelse",         foreground: "#e4eab9" },
            { token: "kwnot",         foreground: "#b86800ff" },

            { token: "kwLagSlay", foreground: "#df7e00ff" },

            { token: "comment",   foreground: "#AAAAAA" },
            { token: "number",   foreground: "#F1FF70" },
            { token: "keyword",   foreground: "#c586c0" },
            { token: "%code",   foreground: "#ccb666ff" },
            { token: "variable",   foreground: "#9cdcfe" },
            { token: "function",   foreground: "#dcdc9d" },
            { token: "target",   foreground: "#6ea86e" }
        ],
        colors: {
            "editor.foreground": "#ffffff",
            "editor.background": "#1e1e1e",

            "editorBracketHighlight.foreground1": "#c7fffc",
            "editorBracketHighlight.foreground4": "#c7c9ff",
            "editorBracketHighlight.foreground2": "#f9c7ff",
            "editorBracketHighlight.foreground5": "#ffecc7",
            "editorBracketHighlight.foreground3": "#fdffc7",
            "editorBracketHighlight.foreground6": "#c7ffd4",

            "editorBracketHighlight.unexpectedBracket.foreground": "#FF5555"
        }
        });

    window.editor = monaco.editor.create(
        document.getElementById("editorContainer"),
            {
                value: codeMessages.default,
                language: "pseudodf",
                theme: "pseudodf-dark",
                automaticLayout: true,

                bracketPairColorization: { enabled: true },

                guides: { bracketPairs: true, highlightActiveBracketPair: false },

                fontFamily: "Consolas, monospace",
                fontSize: 14,
                lineHeight: 22,
                minimap: { enabled: false }
            }
    );
});