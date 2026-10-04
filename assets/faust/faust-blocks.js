// Blocchi di codice Faust dei post come editor eseguibili.
// Ogni blocco ```faust (markdown) viene sostituito da un <faust-editor>: editor con
// play/stop, controlli, block diagram, scope e spettro (compilatore Faust in WebAssembly, GRAME).
// Finche' il compilatore (~10 MB, poi in cache nel browser) non e' caricato resta visibile
// il blocco normale, che viene poi scambiato con l'editor.
// Per lasciare un blocco ```faust come testo: scrivi {: .no-run} nella riga subito dopo il ``` di chiusura.
(function () {
  "use strict";

  var me = document.currentScript;
  var base = me.src.substring(0, me.src.lastIndexOf("/") + 1);
  var loading = null;

  function loadCompiler() {
    if (!loading) {
      loading = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = base + "faust-web-component.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      }).then(function () {
        return customElements.whenDefined("faust-editor");
      });
    }
    return loading;
  }

  // Stile del sito dentro lo shadow DOM del componente (adoptedStyleSheets: non serve
  // 'unsafe-inline' per questa parte e vince sugli stili originali del componente).
  var theme = null;
  function themeSheet() {
    if (!theme) {
      theme = new CSSStyleSheet();
      theme.replaceSync([
        "#root { border: 1px dashed rgba(0,0,0,0.35); border-radius: 0; background: #fff; }",
        "#controls { background: #222; border-bottom: 1px dashed rgba(0,0,0,0.35); }",
        ".button { background: #222; color: #fafafa; }",
        ".button:hover { background: #fafafa; color: #222; }",
        ".button:active { background: #555; }",
        ".dropdown { font-family: 'Source Code Pro', monospace; font-size: 11px; background: #fafafa; color: #222; }",
        "#sidebar-buttons, #sidebar-buttons .button, .gutter { background-color: #f5f5f5; }",
        "#sidebar-buttons .tab.active { background-color: #222; color: #fafafa; }",
        "#sidebar-content { border-left: 1px dashed rgba(0,0,0,0.2); }",
        // il componente dopo [run] riduce l'editor all'altezza dei controlli: lo lasciamo intero
        "#editor { height: auto !important; max-height: 480px; }",
        ".cm-editor { background: #f5f5f5; }",
        ".cm-scroller { font-family: 'Source Code Pro', monospace !important; font-size: 12px; line-height: 1.5; }",
        ".cm-gutters { background: #f5f5f5 !important; border-right: 1px dashed rgba(0,0,0,0.15) !important; color: #aaa; }",
        ".cm-activeLine, .cm-activeLineGutter { background: rgba(0,0,0,0.035) !important; }"
      ].join("\n"));
    }
    return theme;
  }

  function isFaust(code) {
    return /\blanguage-faust\b/.test(code.className) && !code.closest(".no-run");
  }

  // Il codice resta quello del post, con due aggiunte perche' si possa eseguire:
  // "//process = ..." commentato (come nei tutorial) viene riattivato, e l'import delle
  // librerie viene aggiunto se il blocco usa os., fi., ... senza importarle.
  function prepare(code) {
    var src = code.textContent.replace(/\s+$/, "");
    if (!/^\s*process\s*=/m.test(src)) {
      src = src.replace(/^(\s*)\/\/\s*(process\s*=)/m, "$1$2");
    }
    // frammenti che usano le librerie senza importarle
    if (!/import\s*\(/.test(src) && /\b[a-z]{2}\.[a-zA-Z_]/.test(src)) {
      src = 'import("stdfaust.lib");\n\n' + src;
    }
    return src;
  }

  function toEditor(code) {
    var pre = code.closest("pre");
    var block = pre.closest(".highlighter-rouge") || pre;
    var editor = document.createElement("faust-editor");
    editor.className = "faust-editor";
    // se il DSP ha ingressi parte con rumore bianco (il microfono resta selezionabile)
    editor.setAttribute("input", "white noise");
    editor.innerHTML = "<!--\n" + prepare(code) + "\n-->";
    block.parentNode.replaceChild(editor, block);
    var root = editor.shadowRoot;
    root.adoptedStyleSheets = root.adoptedStyleSheets.concat(themeSheet());
    // in esecuzione l'editor si allarga oltre la colonna di testo per fare posto ai controlli
    root.querySelector("#run").addEventListener("click", function () {
      editor.classList.add("running");
    });
  }

  function init() {
    var codes = [].filter.call(document.querySelectorAll("main pre > code"), isFaust);
    if (!codes.length) return;
    loadCompiler().then(function () {
      codes.forEach(toEditor);
    }, function () {
      console.warn("faust-web-component non caricato: restano i blocchi di codice normali");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
