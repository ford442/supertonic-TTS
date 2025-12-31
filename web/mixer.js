import FFT from 'fft.js';

/**
 * VoiceMixer - DSP effects for voice manipulation and singing emulation
 * Provides various audio effects including pitch shifting, tremolo, echo, and persona presets
 */
export class VoiceMixer {
    constructor(sampleRate = 24000) {
        this.sampleRate = sampleRate;
        this.audioBuffer = null;
    }

    /**
     * Set the audio buffer to process
     * @param {Float32Array|Array} buffer - Audio samples
     */
    setBuffer(buffer) {
        this.audioBuffer = Array.isArray(buffer) ? buffer : Array.from(buffer);
        return this;
    }

    /**
     * Get the processed buffer
     * @returns {Array} Processed audio samples
     */
    getBuffer() {
        return this.audioBuffer;
    }

    /**
     * Apply pitch shifting using phase vocoder technique
     * @param {number} semitones - Number of semitones to shift (positive = higher, negative = lower)
     * @returns {VoiceMixer} this for chaining
     */
    dspPitchShift(semitones = 0) {
        if (semitones === 0 || !this.audioBuffer) return this;
        
        const ratio = Math.pow(2, semitones / 12);
        const shifted = this.pitchShiftSimple(this.audioBuffer, ratio, this.sampleRate);
        this.audioBuffer = shifted;
        return this;
    }

    /**
     * Simple pitch shifting using resampling and time-stretching
     * @private
     */
    pitchShiftSimple(input, ratio, sampleRate) {
        // For very short signals, use simple resampling
        if (input.length < 4096) {
            const newLength = Math.floor(input.length / ratio);
            const resampled = this.resample(input, newLength);
            // Pad or truncate to original length
            const output = new Array(input.length).fill(0);
            for (let i = 0; i < Math.min(resampled.length, output.length); i++) {
                output[i] = resampled[i];
            }
            return output;
        }
        
        // Use overlap-add method for better quality on longer signals
        const windowSize = 2048;
        const hopSize = Math.floor(windowSize / 4);
        const output = new Array(input.length).fill(0);
        
        // Phase accumulator for each frequency bin
        let phase = 0;
        
        for (let i = 0; i < input.length - windowSize; i += hopSize) {
            const window = this.hanningWindow(windowSize);
            const frame = new Array(windowSize);
            
            // Extract windowed frame
            for (let j = 0; j < windowSize; j++) {
                frame[j] = input[i + j] * window[j];
            }
            
            // Resample the frame
            const newSize = Math.floor(windowSize * ratio);
            const resampled = this.resample(frame, newSize);
            
            // Overlap-add
            const outPos = Math.floor(i * ratio);
            for (let j = 0; j < Math.min(resampled.length, output.length - outPos); j++) {
                const windowIdx = Math.min(Math.floor(j / ratio), windowSize - 1);
                output[outPos + j] += resampled[j] * window[windowIdx];
            }
        }
        
        // Normalize
        const maxVal = Math.max(...output.map(Math.abs));
        if (maxVal > 0) {
            for (let i = 0; i < output.length; i++) {
                output[i] /= maxVal;
            }
        }
        
        return output;
    }

    /**
     * Resample audio data
     * @private
     */
    resample(input, newLength) {
        const output = new Array(newLength);
        const ratio = input.length / newLength;
        
        for (let i = 0; i < newLength; i++) {
            const srcIndex = i * ratio;
            const idx = Math.floor(srcIndex);
            const frac = srcIndex - idx;
            
            if (idx + 1 < input.length) {
                // Linear interpolation
                output[i] = input[idx] * (1 - frac) + input[idx + 1] * frac;
            } else {
                output[i] = input[idx];
            }
        }
        
        return output;
    }

    /**
     * Generate Hanning window
     * @private
     */
    hanningWindow(size) {
        const window = new Array(size);
        for (let i = 0; i < size; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
        }
        return window;
    }

    /**
     * Apply tremolo effect (amplitude modulation)
     * @param {number} rate - Modulation frequency in Hz (default: 5)
     * @param {number} depth - Modulation depth 0-1 (default: 0.5)
     * @returns {VoiceMixer} this for chaining
     */
    dspTremolo(rate = 5, depth = 0.5) {
        if (!this.audioBuffer) return this;
        
        for (let i = 0; i < this.audioBuffer.length; i++) {
            const t = i / this.sampleRate;
            const modulation = 1 + depth * (Math.sin(2 * Math.PI * rate * t) - 1) / 2;
            this.audioBuffer[i] *= modulation;
        }
        
        return this;
    }

    /**
     * Apply echo/delay effect
     * @param {number} delayMs - Delay time in milliseconds (default: 200)
     * @param {number} decay - Echo decay factor 0-1 (default: 0.5)
     * @param {number} repeats - Number of echo repeats (default: 3)
     * @returns {VoiceMixer} this for chaining
     */
    dspEcho(delayMs = 200, decay = 0.5, repeats = 3) {
        if (!this.audioBuffer) return this;
        
        const delaySamples = Math.floor(this.sampleRate * delayMs / 1000);
        const output = [...this.audioBuffer];
        
        for (let rep = 1; rep <= repeats; rep++) {
            const gain = Math.pow(decay, rep);
            const offset = delaySamples * rep;
            
            for (let i = 0; i < this.audioBuffer.length; i++) {
                if (i + offset < output.length) {
                    output[i + offset] += this.audioBuffer[i] * gain;
                }
            }
        }
        
        // Normalize to prevent clipping
        const maxVal = Math.max(...output.map(Math.abs));
        if (maxVal > 1.0) {
            for (let i = 0; i < output.length; i++) {
                output[i] /= maxVal;
            }
        }
        
        this.audioBuffer = output;
        return this;
    }

    /**
     * Apply reverb effect (simulated using multiple delays)
     * @param {number} roomSize - Room size factor 0-1 (default: 0.5)
     * @param {number} damping - High frequency damping 0-1 (default: 0.5)
     * @returns {VoiceMixer} this for chaining
     */
    dspReverb(roomSize = 0.5, damping = 0.5) {
        if (!this.audioBuffer) return this;
        
        // Simulate reverb with multiple delays at different intervals
        const delays = [37, 53, 73, 97, 113, 131, 149, 167]; // Prime numbers for natural sound
        const output = [...this.audioBuffer];
        
        for (const delayMs of delays) {
            const delaySamples = Math.floor(this.sampleRate * delayMs / 1000 * roomSize);
            const gain = 0.3 * roomSize / delays.length;
            
            for (let i = 0; i < this.audioBuffer.length; i++) {
                if (i + delaySamples < output.length) {
                    // Apply damping as a simple low-pass
                    const sample = this.audioBuffer[i] * gain;
                    output[i + delaySamples] += sample * (1 - damping);
                }
            }
        }
        
        // Normalize
        const maxVal = Math.max(...output.map(Math.abs));
        if (maxVal > 1.0) {
            for (let i = 0; i < output.length; i++) {
                output[i] /= maxVal;
            }
        }
        
        this.audioBuffer = output;
        return this;
    }

    /**
     * Apply sharpening effect (enhance high frequencies)
     * @param {number} amount - Sharpening amount 0-1 (default: 0.3)
     * @returns {VoiceMixer} this for chaining
     */
    dspSharpen(amount = 0.3) {
        if (!this.audioBuffer) return this;
        
        const output = [...this.audioBuffer];
        
        // Simple high-pass emphasis
        for (let i = 1; i < this.audioBuffer.length - 1; i++) {
            const highFreq = this.audioBuffer[i] - (this.audioBuffer[i - 1] + this.audioBuffer[i + 1]) / 2;
            output[i] = this.audioBuffer[i] + highFreq * amount;
        }
        
        this.audioBuffer = output;
        return this;
    }

    /**
     * Apply quantization effect (bit-crushing/robotization)
     * @param {number} levels - Number of quantization levels (default: 16)
     * @returns {VoiceMixer} this for chaining
     */
    dspQuantize(levels = 16) {
        if (!this.audioBuffer) return this;
        
        for (let i = 0; i < this.audioBuffer.length; i++) {
            const quantized = Math.round(this.audioBuffer[i] * levels) / levels;
            this.audioBuffer[i] = quantized;
        }
        
        return this;
    }

    /**
     * Apply vibrato effect (pitch modulation)
     * @param {number} rate - Vibrato rate in Hz (default: 5)
     * @param {number} depth - Vibrato depth in semitones (default: 0.5)
     * @returns {VoiceMixer} this for chaining
     */
    dspVibrato(rate = 5, depth = 0.5) {
        if (!this.audioBuffer) return this;
        
        const output = new Array(this.audioBuffer.length).fill(0);
        // Convert depth from semitones to sample delay modulation
        const depthSamples = depth * 0.1;
        
        for (let i = 0; i < this.audioBuffer.length; i++) {
            const t = i / this.sampleRate;
            const modulation = depthSamples * Math.sin(2 * Math.PI * rate * t);
            const readPos = i + modulation;
            
            const idx = Math.floor(readPos);
            const frac = readPos - idx;
            
            if (idx >= 0 && idx + 1 < this.audioBuffer.length) {
                output[i] = this.audioBuffer[idx] * (1 - frac) + this.audioBuffer[idx + 1] * frac;
            } else if (idx >= 0 && idx < this.audioBuffer.length) {
                output[i] = this.audioBuffer[idx];
            }
        }
        
        this.audioBuffer = output;
        return this;
    }

    /**
     * Apply pitch jitter (random pitch variations)
     * @param {number} amount - Jitter amount in semitones (default: 0.1)
     * @returns {VoiceMixer} this for chaining
     */
    dspJitter(amount = 0.1) {
        if (!this.audioBuffer) return this;
        
        const windowSize = 512;
        const output = new Array(this.audioBuffer.length).fill(0);
        
        for (let i = 0; i < this.audioBuffer.length; i += windowSize / 2) {
            const jitter = (Math.random() - 0.5) * amount * 2;
            const ratio = Math.pow(2, jitter / 12);
            
            for (let j = 0; j < windowSize && i + j < this.audioBuffer.length; j++) {
                const readPos = i + j * ratio;
                const idx = Math.floor(readPos);
                const frac = readPos - idx;
                
                if (idx >= 0 && idx + 1 < this.audioBuffer.length) {
                    output[i + j] += this.audioBuffer[idx] * (1 - frac) + this.audioBuffer[idx + 1] * frac;
                } else if (idx >= 0 && idx < this.audioBuffer.length) {
                    output[i + j] += this.audioBuffer[idx];
                }
            }
        }
        
        this.audioBuffer = output;
        return this;
    }

    /**
     * Apply formant shifting (change voice character without changing pitch)
     * @param {number} shift - Formant shift factor (1.0 = no change, >1 = higher, <1 = lower)
     * @returns {VoiceMixer} this for chaining
     */
    dspFormantShift(shift = 1.0) {
        if (shift === 1.0 || !this.audioBuffer) return this;
        
        // Simplified formant shifting using resampling
        const stretched = this.resample(this.audioBuffer, Math.floor(this.audioBuffer.length / shift));
        const restored = this.resample(stretched, this.audioBuffer.length);
        this.audioBuffer = restored;
        
        return this;
    }

    /**
     * Apply chorus effect (thickening/doubling)
     * @param {number} voices - Number of chorus voices (default: 3)
     * @param {number} spread - Time spread in ms (default: 20)
     * @returns {VoiceMixer} this for chaining
     */
    dspChorus(voices = 3, spread = 20) {
        if (!this.audioBuffer) return this;
        
        const output = [...this.audioBuffer];
        const maxDelay = Math.floor(this.sampleRate * spread / 1000);
        
        for (let v = 1; v < voices; v++) {
            const delay = Math.floor(maxDelay * v / voices);
            const detune = Math.pow(2, ((v - voices / 2) * 0.1) / 12);
            const gain = 1.0 / voices;
            
            for (let i = 0; i < this.audioBuffer.length; i++) {
                const readPos = (i - delay) * detune;
                const idx = Math.floor(readPos);
                const frac = readPos - idx;
                
                if (idx >= 0 && idx + 1 < this.audioBuffer.length) {
                    output[i] += (this.audioBuffer[idx] * (1 - frac) + this.audioBuffer[idx + 1] * frac) * gain;
                } else if (idx >= 0 && idx < this.audioBuffer.length) {
                    output[i] += this.audioBuffer[idx] * gain;
                }
            }
        }
        
        // Normalize
        const maxVal = Math.max(...output.map(Math.abs));
        if (maxVal > 1.0) {
            for (let i = 0; i < output.length; i++) {
                output[i] /= maxVal;
            }
        }
        
        this.audioBuffer = output;
        return this;
    }

    /**
     * Apply distortion effect
     * @param {number} drive - Distortion amount 0-1 (default: 0.5)
     * @returns {VoiceMixer} this for chaining
     */
    dspDistortion(drive = 0.5) {
        if (!this.audioBuffer) return this;
        
        const amount = drive * 50;
        
        for (let i = 0; i < this.audioBuffer.length; i++) {
            const x = this.audioBuffer[i] * amount;
            // Soft clipping using tanh
            this.audioBuffer[i] = Math.tanh(x);
        }
        
        return this;
    }

    // ============================================================
    // SINGING PRESETS
    // ============================================================

    /**
     * Preset: Opera singing style
     * Rich vibrato with reverb
     */
    presetOperaSinging() {
        return this
            .dspVibrato(5.5, 0.8)
            .dspReverb(0.7, 0.3)
            .dspSharpen(0.2);
    }

    /**
     * Preset: Pop singing style
     * Light vibrato with chorus and echo
     */
    presetPopSinging() {
        return this
            .dspVibrato(4.5, 0.4)
            .dspChorus(3, 15)
            .dspEcho(150, 0.3, 2)
            .dspSharpen(0.25);
    }

    /**
     * Preset: Jazz singing style
     * Smooth with light reverb
     */
    presetJazzSinging() {
        return this
            .dspVibrato(4, 0.3)
            .dspReverb(0.4, 0.4)
            .dspEcho(120, 0.2, 1);
    }

    /**
     * Preset: Rock singing style
     * Aggressive with distortion
     */
    presetRockSinging() {
        return this
            .dspDistortion(0.3)
            .dspVibrato(6, 0.5)
            .dspEcho(180, 0.4, 2)
            .dspSharpen(0.4);
    }

    /**
     * Preset: Gospel/Soul singing style
     * Powerful with strong vibrato and reverb
     */
    presetGospelSinging() {
        return this
            .dspVibrato(6, 0.9)
            .dspReverb(0.6, 0.35)
            .dspTremolo(4, 0.2)
            .dspSharpen(0.3);
    }

    /**
     * Preset: Country singing style
     * Twangy with light effects
     */
    presetCountrySinging() {
        return this
            .dspFormantShift(1.1)
            .dspVibrato(5, 0.4)
            .dspEcho(100, 0.25, 2)
            .dspSharpen(0.35);
    }

    /**
     * Preset: Hip-hop/Rap vocal style
     * Clean with subtle doubling
     */
    presetRapVocal() {
        return this
            .dspChorus(2, 10)
            .dspEcho(80, 0.2, 1)
            .dspSharpen(0.3);
    }

    /**
     * Preset: Electronic/EDM vocal style
     * Heavily processed with chorus and effects
     */
    presetEDMVocal() {
        return this
            .dspChorus(4, 25)
            .dspEcho(100, 0.5, 3)
            .dspVibrato(6, 0.3)
            .dspSharpen(0.4);
    }

    // ============================================================
    // PERSONA/CHARACTER PRESETS
    // ============================================================

    /**
     * Preset: Chipmunk/cartoon high voice
     */
    presetChipmunk() {
        return this
            .dspPitchShift(8)
            .dspFormantShift(1.3)
            .dspTremolo(8, 0.3);
    }

    /**
     * Preset: Monster/demon deep voice
     */
    presetMonster() {
        return this
            .dspPitchShift(-7)
            .dspFormantShift(0.7)
            .dspDistortion(0.2)
            .dspReverb(0.5, 0.6);
    }

    /**
     * Preset: Robot/vocoder voice
     */
    presetRobot() {
        return this
            .dspQuantize(12)
            .dspEcho(50, 0.3, 2)
            .dspFormantShift(0.95);
    }

    /**
     * Preset: Alien voice
     */
    presetAlien() {
        return this
            .dspPitchShift(4)
            .dspFormantShift(1.4)
            .dspJitter(0.3)
            .dspReverb(0.6, 0.4)
            .dspTremolo(12, 0.4);
    }

    /**
     * Preset: Echo/cave voice
     */
    presetCave() {
        return this
            .dspPitchShift(-2)
            .dspReverb(0.8, 0.3)
            .dspEcho(300, 0.6, 4);
    }

    /**
     * Preset: Telephone voice
     */
    presetTelephone() {
        return this
            .dspFormantShift(1.1)
            .dspDistortion(0.15)
            .dspQuantize(20);
    }

    /**
     * Preset: Ethereal/angelic voice
     */
    presetEthereal() {
        return this
            .dspPitchShift(3)
            .dspChorus(5, 30)
            .dspReverb(0.7, 0.2)
            .dspVibrato(3, 0.2);
    }

    /**
     * Preset: Underwater voice
     */
    presetUnderwater() {
        return this
            .dspPitchShift(-1)
            .dspReverb(0.6, 0.8)
            .dspTremolo(2, 0.4)
            .dspFormantShift(0.85);
    }

    /**
     * Preset: Giant voice
     */
    presetGiant() {
        return this
            .dspPitchShift(-5)
            .dspFormantShift(0.75)
            .dspReverb(0.5, 0.4)
            .dspEcho(200, 0.3, 2);
    }

    /**
     * Preset: Cartoon character voice
     */
    presetCartoon() {
        return this
            .dspPitchShift(5)
            .dspFormantShift(1.25)
            .dspJitter(0.2)
            .dspTremolo(10, 0.25);
    }

    /**
     * Preset: Old radio voice
     */
    presetOldRadio() {
        return this
            .dspQuantize(8)
            .dspDistortion(0.25)
            .dspFormantShift(1.05)
            .dspEcho(80, 0.2, 1);
    }

    /**
     * Preset: Whisper
     */
    presetWhisper() {
        return this
            .dspDistortion(0.4)
            .dspTremolo(20, 0.6)
            .dspSharpen(0.6);
    }
}

/**
 * Helper function to apply a preset by name
 * @param {Float32Array|Array} audioBuffer - Input audio buffer
 * @param {string} presetName - Name of the preset to apply
 * @param {number} sampleRate - Sample rate of the audio
 * @returns {Array} Processed audio buffer
 */
export function applyPreset(audioBuffer, presetName, sampleRate = 24000) {
    const mixer = new VoiceMixer(sampleRate);
    mixer.setBuffer(audioBuffer);
    
    const presetMethod = `preset${presetName}`;
    if (typeof mixer[presetMethod] === 'function') {
        mixer[presetMethod]();
    } else {
        console.warn(`Preset "${presetName}" not found`);
    }
    
    return mixer.getBuffer();
}

/**
 * Get list of all available presets
 * @returns {Object} Object with singing and persona preset arrays
 */
export function getAvailablePresets() {
    return {
        singing: [
            { value: 'OperaSinging', label: 'Opera' },
            { value: 'PopSinging', label: 'Pop' },
            { value: 'JazzSinging', label: 'Jazz' },
            { value: 'RockSinging', label: 'Rock' },
            { value: 'GospelSinging', label: 'Gospel/Soul' },
            { value: 'CountrySinging', label: 'Country' },
            { value: 'RapVocal', label: 'Hip-Hop/Rap' },
            { value: 'EDMVocal', label: 'Electronic/EDM' }
        ],
        persona: [
            { value: 'Chipmunk', label: 'Chipmunk' },
            { value: 'Monster', label: 'Monster' },
            { value: 'Robot', label: 'Robot' },
            { value: 'Alien', label: 'Alien' },
            { value: 'Cave', label: 'Cave/Echo' },
            { value: 'Telephone', label: 'Telephone' },
            { value: 'Ethereal', label: 'Ethereal' },
            { value: 'Underwater', label: 'Underwater' },
            { value: 'Giant', label: 'Giant' },
            { value: 'Cartoon', label: 'Cartoon' },
            { value: 'OldRadio', label: 'Old Radio' },
            { value: 'Whisper', label: 'Whisper' }
        ]
    };
}
