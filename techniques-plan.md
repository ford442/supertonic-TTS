# Transforming Text-to-Speech into Song: A Guide to Post-Processing Techniques

For developers looking to imbue a text-to-speech (TTS) model with the ability to sing, post-processing the output audio offers a flexible and powerful approach. This can be achieved within a web application by leveraging a variety of modern browser technologies. Below are practical avenues to explore for pitch-shifting, time-stretching, and other manipulations to turn spoken word into a melodic performance, all within a TypeScript-based web environment.

---

## Overview

The primary methods for this task can be categorized by the underlying technology: **Pure TypeScript/JavaScript libraries**, **WebAssembly (WASM)** for near-native performance, the experimental frontier of **WebGPU** for parallel processing, and the convenience of **Python libraries via Pyodide**.

---

## 1. Pure TypeScript / JavaScript with the Web Audio API 🔧

For straightforward and easy-to-implement solutions, a number of TypeScript and JavaScript libraries can be used directly in your web application. These libraries often utilize the powerful and widely supported `Web Audio API` for their operations.

**Key Libraries and Concepts:**

- **Tone.js** — comprehensive framework for creating interactive music in the browser; useful for scheduling, effects, and synthesis.
- **VexWarp** — a JavaScript implementation of the Phase Vocoder algorithm (time-stretching and pitch-shifting).
- **meSing.js** — focused on singing synthesis in JavaScript; combines speech synthesis with DSP via Web Audio.
- **SoundTouch.js** — port of the SoundTouch C++ library; uses WSOLA for higher-quality time-stretching and pitch-shifting.
- **Web Audio API native nodes** — e.g., `AudioBufferSourceNode.playbackRate` for simple pitch/speed changes (note: affects both pitch and tempo).

**Implementation:** Take the audio buffer from your TTS, create an `AudioBufferSourceNode`, and route it through processing nodes (either built-in or library-based) before connecting to the destination.

**Pros:** Easy to integrate, well-documented, great for rapid prototyping.

**Cons:** Performance may limit complex or real-time manipulations unless you use `AudioWorklet` for off-main-thread processing.

---

## 2. High-Performance Audio with WebAssembly (WASM) 🚀

When performance is critical, compile existing C/C++ or Rust audio processing libraries to WebAssembly to run at near-native speeds in the browser.

**Key Libraries and Concepts:**

- **Signalsmith Stretch** — C++ library with WASM builds for high-quality pitch/time stretching.
- **Rubber Band Library** — another mature C++ audio stretching/shifting library with WASM builds.
- **Tooling** — `emscripten` (C/C++) and `wasm-pack` (Rust) to produce `.wasm` modules.
- **AudioWorklets** — recommended to run WASM audio code in a dedicated audio-processing thread for low latency.

**Implementation:** Compile a library to `.wasm`, load it in your web app, and run it within an `AudioWorklet` to process the TTS audio buffers.

**Pros:** Much better performance than pure JS; feasible for real-time, high-quality processing.

**Cons:** More complex build and integration steps and additional boilerplate to pass buffers between WASM and TypeScript.

---

## 3. The Experimental Edge: WebGPU for Parallel Audio Processing ⚡

WebGPU enables massively parallel computation on the GPU and can be used for highly parallelizable audio tasks (e.g., FFTs used in pitch-shifting algorithms).

**Key Concepts:**

- **GPGPU** — treat audio samples as data arrays and process them with compute shaders.
- **Compute Shaders (WGSL)** — write GPU programs to perform operations across many samples in parallel.
- **Proof-of-concepts** — emerging demos explore audio synthesis and DSP using WebGPU.

**Implementation:** Upload TTS audio to GPU buffers, run compute shaders to perform transformations, read the results back to play.

**Pros:** Potentially the highest throughput for parallel-friendly algorithms.

**Cons:** Experimental; steep learning curve; fewer established libraries; potential latency due to CPU↔GPU transfers.

---

## 4. The Python Ecosystem in the Browser with Pyodide 🐍

If you prefer Python or want access to mature audio/data-science libraries, run Python in the browser via Pyodide and use packages like `librosa`.

**Key Libraries and Concepts:**

- **Pyodide** — CPython compiled to WASM; supports calling Python from JavaScript.
- **Librosa** — powerful library for audio analysis, feature extraction, time-stretching, and pitch-shifting.
- **Pydub** — higher-level audio manipulation utilities.
- **micropip** — Pyodide's package installer for Python wheels.

**Implementation:** Initialize Pyodide, install packages with `micropip`, call Python functions to process the TTS audio buffer, and pass the processed audio back to TypeScript to play.

**Pros:** Instant access to powerful, familiar Python tooling with no server-side component required.

**Cons:** Runtime download overhead (Pyodide + packages), and performance may be lower than optimized WASM for real-time use.

---

## Choosing the Right Path ✅

- For quick prototypes and simple effects: **start with pure TypeScript/JavaScript** + `Web Audio API`.
- For high-quality, real-time requirements: **WASM** is the most robust option.
- For leveraging existing Python tooling and fast iteration: **Pyodide** can be very productive.
- For experimental, massively parallel problems: **WebGPU** is promising but still bleeding-edge.

By combining your TTS output with these post-processing techniques, you can unlock creative possibilities and turn spoken text into a compelling sung performance.

---

*Notes: This document is intended as a practical starting point for engineers building singing-capable TTS pipelines in web-based environments. Consider adding short example snippets for each approach as the project evolves.*

---

## Implementations & Examples (Recommended Paths)

Below are practical, opinionated approaches with short example snippets and notes to help you get started quickly.

### 1. WASM + Rubber Band Library (Recommended) 🔧✅

The gold standard for high-quality time/pitch manipulation with formant preservation.

**Why it works:**
- Rubber Band is a professional-grade C++ library (MIT license).
- Pre-built WASM ports exist (e.g., `rubberband-wasm`).
- Preserves formants (vocal tract characteristics) when pitch-shifting.
- Supports real-time and offline processing.

**Implementation (TypeScript sketch):**

```ts
// Install: npm install rubberband-wasm
import { RubberBandProcessor, RubberBandOption } from 'rubberband-wasm';

async function singFromTTS(
  audioBuffer: AudioBuffer,
  midiNotes: number[], // MIDI note numbers
  noteDurations: number[] // in seconds
): Promise<AudioBuffer> {
  const processor = await RubberBandProcessor.create(
    audioBuffer.sampleRate,
    1, // channels
    RubberBandOption.ProcessRealTime | RubberBandOption.PreserveFormants
  );

  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  let outputChunks: Float32Array[] = [];
  let currentTime = 0;

  for (let i = 0; i < midiNotes.length; i++) {
    const startSample = Math.floor(currentTime * audioBuffer.sampleRate);
    const endSample = Math.floor((currentTime + noteDurations[i]) * audioBuffer.sampleRate);

    const segment = audioBuffer.getChannelData(0).slice(startSample, endSample);

    const targetFreq = 440 * Math.pow(2, (midiNotes[i] - 69) / 12);
    const baseFreq = 150; // Approximate TTS speech fundamental frequency
    const pitchScale = targetFreq / baseFreq;

    processor.setPitchScale(pitchScale);
    const sungSegment = processor.process(segment);

    outputChunks.push(sungSegment);
    currentTime += noteDurations[i];
  }

  // Concatenate outputChunks into a single AudioBuffer
  const totalLength = outputChunks.reduce((acc, buf) => acc + buf.length, 0);
  const out = offlineContext.createBuffer(
    audioBuffer.numberOfChannels,
    totalLength,
    audioBuffer.sampleRate
  );

  // Fill channel 0 (mono sketch)
  const channel = out.getChannelData(0);
  let pos = 0;
  for (const chunk of outputChunks) {
    channel.set(chunk, pos);
    pos += chunk.length;
  }

  return out;
}
```

**Notes:** You can run RubberBand within an `AudioWorklet` for low-latency streaming. For extreme pitch shifts, consider doing additional formant scaling (if the processor exposes such an API).

---

### 2. Web Audio API Built-ins (Quick & Dirty) ⚠️

Use `OfflineAudioContext` + `AudioWorklet` for basic pitch/time control.

**Pros:** No dependencies, native.  **Cons:** Poor formant preservation, robotic.

```ts
async function basicPitchShift(
  audioBuffer: AudioBuffer,
  semitones: number
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  // Pitch shift via playbackRate (also changes speed!)
  const pitchRatio = Math.pow(2, semitones / 12);
  source.playbackRate.value = pitchRatio;

  // To preserve duration you'd time-stretch separately (e.g., custom AudioWorklet)
  source.connect(offlineCtx.destination);
  source.start(0);

  return offlineCtx.startRendering();
}
```

**Time-stretching:** Implement a Phase Vocoder in an `AudioWorkletProcessor` (complex DSP, ~200 lines) or use an existing JS implementation.

---

### 3. Pyodide + Librosa (Python) 🐍

Use scientific Python libraries for maximum flexibility and experimentation.

**Pros:** Fast to iterate, `librosa` is powerful.  **Cons:** Large runtime (~15MB+) and slower than WASM.

```ts
import { loadPyodide } from 'pyodide';

async function singWithLibrosa(audioBuffer: AudioBuffer) {
  const pyodide = await loadPyodide();
  await pyodide.loadPackage(['numpy', 'scipy']);
  await pyodide.runPythonAsync(`
import numpy as np
import librosa
# `);
  // Pass audio array into Pyodide and call librosa.effects.time_stretch and pitch_shift
}
```

**Notes:** Great for prototyping algorithms and analyzing spectrograms. Beware startup time and memory usage in constrained environments.

---

### 4. WebGPU Custom Shader (Experimental) ⚡

Implement a phase vocoder or PSOLA algorithm on GPU for massive parallelism.

**Approach:** Use compute shaders for FFT/iFFT and implement overlap-add in GPU memory. This requires careful WebAudio ↔ WebGPU buffer management.

```js
const pipeline = device.createComputePipeline({
  layout: 'auto',
  compute: {
    module: shaderModule, // WGSL shader implementing phase vocoder
    entryPoint: 'phase_vocoder'
  }
});
// Dispatch workgroups for each audio frame
```

**Notes:** Very high potential performance but immature tooling and browser support varies.

---

### 5. Hybrid PSOLA in WASM (Advanced)

PSOLA (Pitch Synchronous Overlap and Add) gives natural-sounding pitch changes when you can reliably detect pitch marks.

**How it works:**
- Detect pitch marks (glottal pulses).
- Extract pitch periods and resynthesize with new timing/pitch.

**Implementation:** Implement PSOLA in C++ and compile to WASM with Emscripten; use WebAudio analyzers for pitch detection assistance.

---

## Key Considerations & Add-ons

- **Vibrato & Expression:** Add vibrato via LFO modulation on the pitch control (post-processing or within the WASM processor).

```ts
function addVibrato(pitchParam, rate = 5, depth = 0.1) {
  // Modulate pitchParam with an LFO (oscillator + gain)
}
```

- **Formant Correction:** Even with Rubber Band, extreme pitch shifts may benefit from formant correction (if exposed by the library):

```ts
processor.setFormantScale(Math.pow(pitchScale, 0.5));
```

- **Segmentation Strategy:** Split the TTS output by phonemes/words (use alignment data if available). Apply different processing to vowels vs consonants.

```ts
const phonemeBoundaries = ttsEngine.getPhonemeTimings();
// Consonants: minimal shift; Vowels: full melodic shift
```

**Recommended Path:**
- Start with `rubberband-wasm` — best quality/effort ratio.
- Use Web Audio for segmentation and final mixing.
- Add vibrato with an LFO post-Rubber Band.
- For rhythm, pre-process TTS to insert silences and time-stretch words independently to match musical timing.

**Limitation:** TTS voices often lack breathiness, expressive vibrato, and natural formant dynamics of real singing. For best results, consider fine-tuning your TTS model on singing data or using a dedicated neural vocoder with pitch conditioning (e.g., VITS via ONNX Runtime Web).

---

*Would you like a detailed implementation of any specific approach (playable sample, branch + PR, or runnable demo)?*

