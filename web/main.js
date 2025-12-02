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

// Helper function to extract filename from path
function getFilenameFromPath(path) {
    return path.split('/').pop();
}

// Global state
let textToSpeech = null;
let cfgs = null;

// Pre-computed style
let currentStyle = null; // The Style object used for inference
let currentStylePath = DEFAULT_VOICE_STYLE_PATH;

// Mixer Instance
const mixer = new VoiceMixer();

// UI Elements
const textInput = document.getElementById('text');
const voiceStyleSelect = document.getElementById('voiceStyleSelect');
const voiceStyleInfo = document.getElementById('voiceStyleInfo');
const totalStepInput = document.getElementById('totalStep');
const speedInput = document.getElementById('speed');
const generateBtn = document.getElementById('generateBtn');
const statusBox = document.getElementById('statusBox');
const statusText = document.getElementById('statusText');
const backendBadge = document.getElementById('backendBadge');
const resultsContainer = document.getElementById('results');
const errorBox = document.getElementById('error');

// Mixer UI
const toggleMixerBtn = document.getElementById('toggleMixerBtn');
const mixerPanel = document.getElementById('mixerPanel');
const mixerCanvas = document.getElementById('mixerCanvas');

// Mixer Buttons
const btnReset = document.getElementById('resetMixerBtn');
const btnMirrorX = document.getElementById('btnMirrorX');
const btnMirrorY = document.getElementById('btnMirrorY');
const btnInvert = document.getElementById('btnInvert');
const btnRandShift = document.getElementById('btnRandShift');
const btnSharpen = document.getElementById('btnSharpen');
const btnQuantize = document.getElementById('btnQuantize');
const btnEcho = document.getElementById('btnEcho');
const btnTremolo = document.getElementById('btnTremolo');
const btnJitter = document.getElementById('btnJitter');
const btnAdd = document.getElementById('btnAdd');
const btnMul = document.getElementById('btnMul');
const valAdd = document.getElementById('valAdd');
const valMul = document.getElementById('valMul');
const btnSinging = document.getElementById('btnSinging');

function showStatus(message, type = 'info') {
    statusText.innerHTML = message;
    statusBox.className = 'status-box';
    if (type === 'success') {
        statusBox.classList.add('success');
    } else if (type === 'error') {
        statusBox.classList.add('error');
    }
}

function showError(message) {
    errorBox.textContent = message;
    errorBox.classList.add('active');
}

function hideError() {
    errorBox.classList.remove('active');
}

function showBackendBadge() {
    backendBadge.classList.add('visible');
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
    // voiceStyleInfo.textContent = "Modified in Mixer";
}

// Load models on page load
async function initializeModels() {
    try {
        showStatus('ℹ️ <strong>Loading configuration...</strong>');
        
        const basePath = 'assets/onnx';
        
        // Try WebGPU first, fallback to WASM
        let executionProvider = 'wasm';
        try {
            const result = await loadTextToSpeech(basePath, {
                executionProviders: ['webgpu'],
                graphOptimizationLevel: 'all'
            }, (modelName, current, total) => {
                showStatus(`ℹ️ <strong>Loading ONNX models (${current}/${total}):</strong> ${modelName}...`);
            });
            
            textToSpeech = result.textToSpeech;
            cfgs = result.cfgs;
            
            executionProvider = 'webgpu';
            backendBadge.textContent = 'WebGPU';
            backendBadge.style.background = '#4caf50';
        } catch (webgpuError) {
            console.log('WebGPU not available, falling back to WebAssembly');
            
            const result = await loadTextToSpeech(basePath, {
                executionProviders: ['wasm'],
                graphOptimizationLevel: 'all'
            }, (modelName, current, total) => {
                showStatus(`ℹ️ <strong>Loading ONNX models (${current}/${total}):</strong> ${modelName}...`);
            });
            
            textToSpeech = result.textToSpeech;
            cfgs = result.cfgs;
        }
        
        showStatus('ℹ️ <strong>Loading default voice style...</strong>');
        
        // Initialize Mixer Canvas
        mixer.setCanvas(mixerCanvas);

        // Load default voice style
        currentStyle = await loadStyleFromJSON(currentStylePath);
        mixer.loadStyle(currentStyle); // Load into mixer

        voiceStyleInfo.textContent = `${getFilenameFromPath(currentStylePath)} (default)`;
        
        showStatus(`✅ <strong>Models loaded!</strong> Using ${executionProvider.toUpperCase()}. You can now generate speech.`, 'success');
        showBackendBadge();
        
        generateBtn.disabled = false;
        
    } catch (error) {
        console.error('Error loading models:', error);
        showStatus(`❌ <strong>Error loading models:</strong> ${error.message}`, 'error');
    }
}

const voiceStyleUpload = document.getElementById('voiceStyleUpload');
const customStyleContainer = document.getElementById('customStyleContainer');

// Handle Dropdown Selection
voiceStyleSelect.addEventListener('change', async (e) => {
    const selectedValue = e.target.value;

    if (selectedValue === 'custom') {
        // Show file upload input
        customStyleContainer.classList.remove('hidden');
        voiceStyleInfo.textContent = "Waiting for file...";
        return;
    }

    // Hide file upload if a preset is selected
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

// Handle File Upload
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

// --- MIXER CONTROLS ---

// Toggle visibility
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

// Operations
function applyMixerOp(opName, arg = null) {
    if (mixer[opName]) {
        if (arg !== null) mixer[opName](arg);
        else mixer[opName]();

        updateStyleFromMixer();
    }
}

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

// Singing Preset
btnSinging.addEventListener('click', async () => {
    // 1. Ensure we have a base voice. If current is M1/M2/etc, use it.
    // Ideally, load F1 if not already loaded, as it's a good base.
    /*
    if (!currentStylePath.includes('F1.json')) {
        // Optional: Auto-load F1?
        // For now, just apply to current.
    }
    */

    mixer.applySingingPreset();
    updateStyleFromMixer();
    showStatus('✅ <strong>Applied Singing Preset!</strong> Try generating speech.', 'success');
});


// Main synthesis function
async function generateSpeech() {
    const text = textInput.value.trim();
    if (!text) {
        showError('Please enter some text to synthesize.');
        return;
    }
    
    if (!textToSpeech || !cfgs) {
        showError('Models are still loading. Please wait.');
        return;
    }
    
    if (!currentStyle) {
        showError('Voice style is not ready. Please wait.');
        return;
    }
    
    const startTime = Date.now();
    
    try {
        generateBtn.disabled = true;
        hideError();
        
        // Clear results and show placeholder
        resultsContainer.innerHTML = `
            <div class="results-placeholder generating">
                <div class="results-placeholder-icon">⏳</div>
                <p>Generating speech...</p>
            </div>
        `;
        
        const totalStep = parseInt(totalStepInput.value);
        const speed = parseFloat(speedInput.value);
        
        showStatus('ℹ️ <strong>Generating speech from text...</strong>');
        const tic = Date.now();
        
        const { wav, duration } = await textToSpeech.call(
            text, 
            currentStyle, 
            totalStep,
            speed,
            0.3,
            (step, total) => {
                showStatus(`ℹ️ <strong>Denoising (${step}/${total})...</strong>`);
            }
        );
        
        const toc = Date.now();
        console.log(`Text-to-speech synthesis: ${((toc - tic) / 1000).toFixed(2)}s`);
        
        showStatus('ℹ️ <strong>Creating audio file...</strong>');
        const wavLen = Math.floor(textToSpeech.sampleRate * duration[0]);
        const wavOut = wav.slice(0, wavLen);
        
        // Create WAV file
        const wavBuffer = writeWavFile(wavOut, textToSpeech.sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        // Calculate total time and audio duration
        const endTime = Date.now();
        const totalTimeSec = ((endTime - startTime) / 1000).toFixed(2);
        const audioDurationSec = duration[0].toFixed(2);
        
        // Display result with full text
        resultsContainer.innerHTML = `
            <div class="result-item">
                <div class="result-text-container">
                    <div class="result-text-label">Input Text</div>
                    <div class="result-text">${text}</div>
                </div>
                <div class="result-info">
                    <div class="info-item">
                        <span>📊 Audio Length</span>
                        <strong>${audioDurationSec}s</strong>
                    </div>
                    <div class="info-item">
                        <span>⏱️ Generation Time</span>
                        <strong>${totalTimeSec}s</strong>
                    </div>
                </div>
                <div class="result-player">
                    <audio controls>
                        <source src="${url}" type="audio/wav">
                    </audio>
                </div>
                <div class="result-actions">
                    <button onclick="downloadAudio('${url}', 'synthesized_speech.wav')">
                        <span>⬇️</span>
                        <span>Download WAV</span>
                    </button>
                </div>
            </div>
        `;
        
        showStatus('✅ <strong>Speech synthesis completed successfully!</strong>', 'success');
        
    } catch (error) {
        console.error('Error during synthesis:', error);
        showStatus(`❌ <strong>Error during synthesis:</strong> ${error.message}`, 'error');
        showError(`Error during synthesis: ${error.message}`);
        
        // Restore placeholder
        resultsContainer.innerHTML = `
            <div class="results-placeholder">
                <div class="results-placeholder-icon">🎤</div>
                <p>Generated speech will appear here</p>
            </div>
        `;
    } finally {
        generateBtn.disabled = false;
    }
}

// Download handler (make it global so it can be called from onclick)
window.downloadAudio = function(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
};

// Attach generate function to button
generateBtn.addEventListener('click', generateSpeech);

// Initialize on load
window.addEventListener('load', async () => {
    generateBtn.disabled = true;
    await initializeModels();
});
