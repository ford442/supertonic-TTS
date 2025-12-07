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

// Global state variables
let textToSpeech = null;
let cfgs = null;
let currentStyle = null; // The Style object used for inference
let currentStylePath = DEFAULT_VOICE_STYLE_PATH;
const mixer = new VoiceMixer();

// UI Elements (declared globally, initialized in initializeUI)
let textInput, voiceStyleSelect, voiceStyleInfo, totalStepInput, speedInput;
let generateBtn, statusBox, statusText, backendBadge, resultsContainer, errorBox;
let toggleMixerBtn, mixerPanel, mixerCanvas;
let btnReset, btnMirrorX, btnMirrorY, btnInvert, btnRandShift, btnSharpen;
let btnQuantize, btnEcho, btnTremolo, btnJitter, btnAdd, btnMul;
let valAdd, valMul, btnSinging;
let voiceStyleUpload, customStyleContainer;

// --- Helper Functions ---

function getFilenameFromPath(path) {
    return path.split('/').pop();
}

function showStatus(message, type = 'info') {
    if (!statusText || !statusBox) return;
    statusText.innerHTML = message;
    statusBox.className = 'status-box';
    if (type === 'success') {
        statusBox.classList.add('success');
    } else if (type === 'error') {
        statusBox.classList.add('error');
    }
}

function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.add('active');
}

function hideError() {
    if (errorBox) errorBox.classList.remove('active');
}

function showBackendBadge() {
    if (backendBadge) backendBadge.classList.add('visible');
}

// Helper: Convert raw data from mixer back to ONNX Style object
function getStyleFromMixer() {
    const data = mixer.getStyle();
    if (!data.ttlData) return null;

    // Create ONNX tensors
    // bsz = 1
    const ttlTensor = new ort.Tensor('float32', data.ttlData, data.ttlDims);
    const dpTensor = new ort.Tensor('float32', data.dpData, data.dpDims);

    return new Style(ttlTensor, dpTensor);
}

// Update the global currentStyle from the mixer's state
function updateStyleFromMixer() {
    currentStyle = getStyleFromMixer();
}

// Operations wrapper for Mixer
function applyMixerOp(opName, arg = null) {
    if (mixer[opName]) {
        if (arg !== null) mixer[opName](arg);
        else mixer[opName]();

        updateStyleFromMixer();
    }
}

// Load voice style from JSON
async function loadStyleFromJSON(stylePath) {
    try {
        const style = await loadVoiceStyle([stylePath], true);
        return style;
    } catch (error) {
        console.error('Error loading voice style:', error);
        throw error;
    }
}

// --- Initialization Logic ---

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
    
    // Dropdown Selection
    voiceStyleSelect.addEventListener('change', async (e) => {
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
            mixer.loadStyle(currentStyle); // Sync mixer

            voiceStyleInfo.textContent = getFilenameFromPath(currentStylePath);
            
            showStatus(`✅ <strong>Voice style loaded:</strong> ${getFilenameFromPath(currentStylePath)}`, 'success');
            generateBtn.disabled = false;
        } catch (error) {
            showError(`Error loading voice style: ${error.message}`);
            generateBtn.disabled = false;
        }
    });

    // File Upload
    voiceStyleUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                showStatus(`ℹ️ <strong>Parsing custom style...</strong>`, 'info');
                const jsonContent = JSON.parse(e.target.result);
                
                // Validate JSON structure roughly
                if (!jsonContent.style_ttl || !jsonContent.style_dp) {
                    throw new Error("Invalid style JSON format. Missing style_ttl or style_dp.");
                }

                // Create style from JSON
                currentStyle = createStyleFromJSON(jsonContent);
                mixer.loadStyle(currentStyle); // Sync mixer
                
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

    // Mixer Controls
    toggleMixerBtn.addEventListener('click', () => {
        if (mixerPanel.classList.contains('hidden')) {
            mixerPanel.classList.remove('hidden');
            toggleMixerBtn.textContent = "Hide Mixer & Editor";
            mixer.renderHeatmap(); // Redraw in case resize happened
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
    btnTremolo.addEventListener('click', () => applyMixerOp('dspTrem
