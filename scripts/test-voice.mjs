import pkg from '@hocgin/edge-tts';
import fs from 'fs';

async function test() {
  try {
    const result = await pkg.speak({
      text: "Olá Charles, tudo bem? Vamos realizar o seu sonho.",
      voice: "pt-BR-AntonioNeural"
    });
    const blob = await result.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync('test.mp3', buffer);
    console.log("✅ Sucesso no teste de voz!");
  } catch (e) {
    console.error("❌ Falha no teste:", e.message);
  }
}

test();
