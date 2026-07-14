import assert from "node:assert/strict";
import test from "node:test";
import { classifyMaterial, contextFor, normalize } from "../src/pipeline.mjs";

test("normalizacao remove acentos sem destruir palavras", () => {
  assert.equal(normalize("Avaliação Final"), "avaliacao final");
});

test("classificacao usa categorias conservadoras", () => {
  assert.equal(classifyMaterial("Prova N2"), "Prova Passada");
  assert.equal(classifyMaterial("Lista de exercícios"), "Atividade");
  assert.equal(classifyMaterial("Documento sem rotulo"), "Material em Geral");
});

test("contexto preserva a janela ao redor do anexo", () => {
  const messages = [
    { text: "antes", attachments: [] },
    { text: "ancora", attachments: ["a.txt"] },
    { text: "depois", attachments: [] }
  ];
  const [hit] = contextFor("a.txt", messages, 1, 1);
  assert.equal(hit.window.length, 3);
  assert.equal(hit.window[1].text, "ancora");
});
