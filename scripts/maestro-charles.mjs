import fs from 'fs';
import path from 'path';
import pkg from '@hocgin/edge-tts';

// --- CONFIGURAÇÃO MAESTRO (CHARLES NOBRE v1.1) ---
const INPUT_FILE = './charles_manifest_maestro.md';
const OUTPUT_DIR = './audio_output';
const VOICE = 'pt-BR-AntonioNeural'; // Mature, Authoritative Portuguese Voice
const CHUNK_SIZE = 3500; 

async function generateMaestroVoice() {
    console.log('🎙️ Iniciando Maestro Audio Engine para Charles R. Nobre...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Erro: Arquivo de roteiro não encontrado em ${INPUT_FILE}`);
        return;
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let scriptContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    
    // Processamento de Tags Maestro (Synched with Levi's workflow)
    let blocks = splitByTags(scriptContent);
    
    console.log(`📄 Script segmentado em ${blocks.length} blocos de emoção.`);

    for (let i = 0; i < blocks.length; i++) {
        const { tag, text } = blocks[i];
        const partNumber = i + 1;
        const filePath = path.join(OUTPUT_DIR, `part_${partNumber.toString().padStart(2, '0')}.mp3`);
        
        let options = {
            voice: VOICE,
            rate: "0%",
            pitch: "0Hz"
        };

        // Temporarily bypassing prosody to ensure delivery
        options.rate = "0%";
        options.pitch = "0Hz";

        let cleanText = text.replace(/\[Visual:.*?\]/g, '').trim();
        if (!cleanText) continue;

        // Artificial breathing/pacing
        cleanText = cleanText.replace(/\.\n/g, '... ').replace(/,/g, ', ');

        // Building dynamic request to avoid 'no such audio data' error
        let requestParams = {
            text: cleanText,
            voice: options.voice
        };

        // Only add prosody if specified and not 0 to bypass service instability
        if (options.rate && options.rate !== "0%") requestParams.rate = options.rate;
        if (options.pitch && options.pitch !== "0Hz") requestParams.pitch = options.pitch;

        console.log(`🔊 [${tag || 'NORMAL'}] Gerando parte ${partNumber}... (${cleanText.length} chars)`);
        
        try {
            const result = await pkg.speak(requestParams);
            const blob = await result.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            fs.writeFileSync(filePath, buffer);
            console.log(`✅ Parte ${partNumber} salva.`);
        } catch (error) {
            console.error(`⚠️ Erro na parte ${partNumber}:`, error.message);
        }
    }

    console.log('🎉 Maestro terminou! Áudios prontos em audio_output.');
}

function splitByTags(content) {
    const tags = ['[MISTÉRIO]', '[INTENSO]', '[FATO]', '[PAUSA]'];
    const regex = new RegExp(`(${tags.map(t => t.replace('[', '\\[').replace(']', '\\]')).join('|')})`, 'g');
    
    let parts = content.split(regex);
    let result = [];
    let currentTag = '[FATO]';

    for (let i = 0; i < parts.length; i++) {
        let p = parts[i].trim();
        if (!p) continue;

        if (tags.includes(p)) {
            currentTag = p;
        } else {
            let text = p;
            if (currentTag === '[PAUSA]') {
                text = "... ... ... " + text;
                result.push({ tag: '[MISTÉRIO]', text: text });
            } else {
                result.push({ tag: currentTag, text: text });
            }
        }
    }
    return result;
}

generateMaestroVoice().catch(console.error);
