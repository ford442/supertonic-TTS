import {
    loadTextToSpeech,
    loadVoiceStyle,
    writeWavFile,
    createStyleFromJSON,
    Style
} from './helper.js';

import { VoiceMixer } from './mixer.js';
import * as ort from 'onnxruntime-web';

// Configuration
const DEFAULT_VOICE_STYLE_PATH = 'assets/voice_styles/M1.json';

// Global state
let textToSpeech = null;
let cfgs = null;
let currentStyle = null;
let currentStylePath = DEFAULT_VOICE_STYLE_PATH;
const mixer = new VoiceMixer();

// UI Elements (Declare variables but don't assign yet)
let textInput, voiceStyleSelect, voiceStyleInfo, totalStepInput, speedInput;
let generateBtn, statusBox, statusText, backendBadge, resultsContainer, errorBox;
let toggleMixerBtn, mixerPanel, mixerCanvas;
let btnReset, btnMirrorX, btnMirrorY, btnInvert, btnRandShift, btnSharpen;
let btnQuantize, btnEcho, btnTremolo, btnJitter, btnAdd, btnMul;
let valAdd, valMul, btnSinging;
let voiceStyleUpload, customStyleContainer;

function getFilenameFromPath(path) {
    return path.split('/').pop();
}

// ... [Keep existing helper functions like showStatus, showError, etc.] ...

// Initialize UI Elements and Event Listeners
function initializeUI() {
    // 1. Grab all elements
    textInput = document.getElementById('text');
    voiceStyleSelect = document.getElementById('voiceStyleSelect');
    voiceStyleInfo = document.getElementById('voiceStyleInfo');
    totalStepInput = document.getElementById('totalStep');
    speedInput = document.getElementById('speed');
    generateBtn = document.getElementById('generateBtn');
    statusBox = document.getElementById('statusBox');
    statusText = document.getElementById('statusText');
    backendBadge = document.getElementById('backendBadge');
    resultsContainer = document.getElementById('results');
    errorBox = document.getElementById('error');
    
    // Mixer UI
    toggleMixerBtn = document.getElementById('toggleMixerBtn');
    mixerPanel = document.getElementById('mixerPanel');
    mixerCanvas = document.getElementById('mixerCanvas');
    
    // Mixer Buttons
    btnReset = document.getElementById('resetMixerBtn');
    btnMirrorX = document.getElementById('btnMirrorX');
    btnMirrorY = document.getElementById('btnMirrorY');
    btnInvert = document.getElementById('btnInvert');
    btnRandShift = document.getElementById('btnRandShift');
    btnSharpen = document.getElementById('btnSharpen');
    btnQuantize = document.getElementById('btnQuantize');
    btnEcho = document.getElementById('btnEcho');
    btnTremolo = document.getElementById('btnTremolo');
    btnJitter = document.getElementById('btnJitter');
    btnAdd = document.getElementById('btnAdd');
    btnMul = document.getElementById('btnMul');
    valAdd = document.getElementById('valAdd');
    valMul = document.getElementById('valMul');
    btnSinging = document.getElementById('btnSinging');
    
    voiceStyleUpload = document.getElementById('voiceStyleUpload');
    customStyleContainer = document.getElementById('customStyleContainer');

    // 2. Attach Event Listeners
    voiceStyleSelect.addEventListener('change', async (e) => {
        // ... [Paste existing logic] ...
        const selectedValue = e.target.value;
        if (selectedValue === 'custom') {
            customStyleContainer.classList.remove('hidden');
            voiceStyleInfo.textContent = "Waiting for file...";
            return;
        }
        customStyleContainer.classList.add('hidden');
        try {
            generateBtn.disabled = true;
            showStatus(`ℹ️ <strong>Loading voice style...</strong>`, 'info');
            currentStylePath = selectedValue;
            currentStyle = await loadStyleFromJSON(currentStylePath);
            mixer.loadStyle(currentStyle);
            voiceStyleInfo.textContent = getFilenameFromPath(currentStylePath);
            showStatus(`✅ <strong>Voice style loaded:</strong> ${getFilenameFromPath(currentStylePath)}`, 'success');
            generateBtn.disabled = false;
        } catch (error) {
            showError(`Error loading voice style: ${error.message}`);
            generateBtn.disabled = false;
        }
    });

    voiceStyleUpload.addEventListener('change', (event) => {
        // ... [Paste existing logic] ...
         const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                showStatus(`ℹ️ <strong>Parsing custom style...</strong>`, 'info');
                const jsonContent = JSON.parse(e.target.result);
                if (!jsonContent.style_ttl || !jsonContent.style_dp) {
                    throw new Error("Invalid style JSON format. Missing style_ttl or style_dp.");
                }
                currentStyle = createStyleFromJSON(jsonContent);
                mixer.loadStyle(currentStyle);
                voiceStyleInfo.textContent = `Custom: ${file.name}`;
                showStatus(`✅ <strong>Custom style loaded:</strong> ${file.name}`, 'success');
                generateBtn.disabled = false;
            } catch (error) {
                console.error(error);
                showError(`Failed to load custom style: ${error.message}`);
                voiceStyleInfo.textContent = "Error loading file";
            }
        };
        reader.readAsText(file);
    });

    // Mixer Listeners
    toggleMixerBtn.addEventListener('click', () => {
        if (mixerPanel.classList.contains('hidden')) {
            mixerPanel.classList.remove('hidden');
            toggleMixerBtn.textContent = "Hide Mixer & Editor";
            mixer.renderHeatmap();
        } else {
            mixerPanel.classList.add('hidden');
            toggleMixerBtn.textContent = "Show Mixer & Editor";
        }
    });

    btnReset.addEventListener('click', () => applyMixerOp('reset'));
    btnMirrorX.addEventListener('click', () => applyMixerOp('mirrorX'));
    btnMirrorY.addEventListener('click', () => applyMixerOp('mirrorY'));
    btnInvert.addEventListener('click', () => applyMixerOp('invertSign'));
    btnRandShift.addEventListener('click', () => applyMixerOp('randomShift'));
    btnSharpen.addEventListener('click', () => applyMixerOp('dspSharpen'));
    btnQuantize.addEventListener('click', () => applyMixerOp('dspQuantize'));
    btnEcho.addEventListener('click', () => applyMixerOp('dspEcho'));
    btnTremolo.addEventListener('click', () => applyMixerOp('dspTremolo'));
    btnJitter.addEventListener('click', () => applyMixerOp('dspJitter'));
    
    btnAdd.addEventListener('click', () => {
        const val = parseFloat(valAdd.value);
        applyMixerOp('addScalar', val);
    });
    btnMul.addEventListener('click', () => {
        const val = parseFloat(valMul.value);
        applyMixerOp('multiplyScalar', val);
    });
    
    btnSinging.addEventListener('click', async () => {
        mixer.applySingingPreset();
        updateStyleFromMixer();
        showStatus('✅ <strong>Applied Singing Preset!</strong> Try generating speech.', 'success');
    });

    generateBtn.addEventListener('click', generateSpeech);
}

// ... [Rest of functions: loadStyleFromJSON, getStyleFromMixer, updateStyleFromMixer] ...

// Main Initialization
window.addEventListener('load', async () => {
    // Initialize UI first so variables are populated
    initializeUI();
    
    generateBtn.disabled = true;
    await initializeModels();
});
