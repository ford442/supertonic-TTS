# Supertonic Web Example

This example demonstrates how to use Supertonic in a web browser using ONNX Runtime Web.

## 📰 Update News

**2025.12.31** - Added comprehensive voice effects and singing emulation with 8 singing presets (Opera, Pop, Jazz, Rock, Gospel, Country, Rap, EDM) and 12 persona presets (Robot, Chipmunk, Monster, Alien, etc.) using advanced DSP techniques including pitch shifting, vibrato, tremolo, echo, reverb, formant shifting, and more.

**2025.11.23** - Enhanced text preprocessing with comprehensive normalization, emoji removal, symbol replacement, and punctuation handling for improved synthesis quality.

**2025.11.19** - Added speed control slider to adjust speech synthesis speed (default: 1.05, recommended range: 0.9-1.5).

**2025.11.19** - Added automatic text chunking for long-form inference. Long texts are split into chunks and synthesized with natural pauses.

## Features

- 🌐 Runs entirely in the browser (no server required for inference)
- 🚀 WebGPU support with automatic fallback to WebAssembly
- ⚡ Pre-extracted voice styles for instant generation
- 🎨 Modern, responsive UI
- 🎭 Multiple voice style presets (2 Male, 2 Female)
- 🎵 **NEW: 8 Singing Style Presets** - Emulate various singing styles including Opera, Pop, Jazz, Rock, Gospel, Country, Hip-Hop/Rap, and EDM
- 🎭 **NEW: 12 Voice Persona Presets** - Transform voice into characters like Robot, Chipmunk, Monster, Alien, Cave, Telephone, Ethereal, Underwater, Giant, Cartoon, Old Radio, and Whisper
- 🎛️ **NEW: Advanced DSP Effects** - Pitch shifting, vibrato, tremolo, echo, reverb, formant shifting, chorus, distortion, quantization, and more
- 💾 Download generated audio as WAV files
- 📊 Detailed generation statistics (audio length, generation time, applied effects)
- ⏱️ Real-time progress tracking

## Requirements

- Node.js (for development server)
- Modern web browser (Chrome, Edge, Firefox, Safari)

## Installation

1. Install dependencies:

```bash
npm install
```

## Running the Demo

Start the development server:

```bash
npm run dev
```

This will start a local development server (usually at http://localhost:3000) and open the demo in your browser.

## Usage

1. **Wait for Models to Load**: The app will automatically load models and the default voice style (M1)
2. **Select Voice Style**: Choose from available voice presets
   - **Male 1 (M1)**: Default male voice
   - **Male 2 (M2)**: Alternative male voice
   - **Female 1 (F1)**: Default female voice
   - **Female 2 (F2)**: Alternative female voice
3. **Enter Text**: Type or paste the text you want to convert to speech
4. **Adjust Settings** (optional):
   - **Total Steps**: More steps = better quality but slower (default: 5)
   - **Speed**: Speech speed from 0.5 to 2.0 (default: 1.05)
   - **🎵 Singing Style**: Choose a singing preset or leave as "None" for normal speech
     - **Opera**: Rich vibrato with reverb for operatic style
     - **Pop**: Light vibrato with chorus and echo for modern pop
     - **Jazz**: Smooth with light reverb for jazz vocals
     - **Rock**: Aggressive with distortion for rock singing
     - **Gospel/Soul**: Powerful with strong vibrato and reverb
     - **Country**: Twangy with light effects
     - **Hip-Hop/Rap**: Clean with subtle doubling
     - **Electronic/EDM**: Heavily processed with chorus and effects
   - **🎭 Voice Persona**: Transform the voice into a character (can combine with singing styles!)
     - **Chipmunk**: High-pitched cartoon voice
     - **Monster**: Deep, menacing voice with distortion
     - **Robot**: Quantized, mechanical voice
     - **Alien**: Otherworldly voice with jitter and effects
     - **Cave/Echo**: Voice with strong reverb and echo
     - **Telephone**: Band-limited, compressed voice
     - **Ethereal**: Angelic voice with chorus and reverb
     - **Underwater**: Muffled voice with watery effects
     - **Giant**: Deep, powerful voice with reverb
     - **Cartoon**: Playful, animated voice
     - **Old Radio**: Vintage, lo-fi radio effect
     - **Whisper**: Breathy, whispered voice
5. **Generate Speech**: Click the "Generate Speech" button
6. **View Results**: 
   - See the full input text
   - View audio length and generation time statistics
   - See which effects were applied
   - Play the generated audio in the browser
   - Download as WAV file

## Voice Effects Technical Details

The voice effects system uses advanced DSP (Digital Signal Processing) techniques implemented in the `mixer.js` module:

### Core DSP Effects

- **Pitch Shifting**: Changes the pitch without affecting duration using phase vocoder and resampling
- **Formant Shifting**: Changes voice character (higher = childlike, lower = deeper) without changing pitch
- **Vibrato**: Adds natural-sounding pitch oscillation for singing
- **Tremolo**: Adds amplitude modulation for rhythmic effects
- **Echo/Delay**: Creates repeating echoes with adjustable decay
- **Reverb**: Simulates room acoustics using multiple delays
- **Chorus**: Thickens the sound by layering slightly detuned copies
- **Distortion**: Adds harmonic saturation for aggressive sounds
- **Quantization**: Creates robotic/digital artifacts by reducing bit depth
- **Sharpening**: Enhances high frequencies for clarity
- **Jitter**: Adds random pitch variations for character

### Combining Effects

You can combine singing presets with persona presets for unique results! For example:
- **Opera + Ethereal** = Angelic opera performance
- **Rock + Monster** = Demonic rock vocals
- **Pop + Chipmunk** = High-pitched pop singing
- **Jazz + Old Radio** = Vintage jazz recording

## Technical Details

### Browser Compatibility

This demo uses:
- **ONNX Runtime Web**: For running models in the browser
- **fft.js**: For frequency-domain audio processing
- **Web Audio API**: For playing generated audio
- **Vite**: For development and bundling

## Notes

- The ONNX models must be accessible at `assets/onnx/` relative to the web root
- Voice style JSON files must be accessible at `assets/voice_styles/` relative to the web root
- Pre-extracted voice styles enable instant generation without audio processing
- Four voice style presets are provided (M1, M2, F1, F2)

## Troubleshooting

### Models not loading
- Check browser console for errors
- Ensure `assets/onnx/` path is correct and models are accessible
- Check CORS settings if serving from a different domain

### WebGPU not available
- WebGPU is only available in recent Chrome/Edge browsers (version 113+)
- The app will automatically fall back to WebAssembly if WebGPU is not available
- Check the backend badge to see which execution provider is being used

### Out of memory errors
- Try shorter text inputs
- Reduce denoising steps
- Use a browser with more available memory
- Close other tabs to free up memory

### Audio quality issues
- Try different voice style presets
- Increase denoising steps for better quality
- Some voice effects may introduce artifacts - try different combinations
- Extreme pitch shifting (>8 semitones) may affect quality

### Effects not audible
- Some effects are subtle - try combining multiple presets
- Ensure audio is playing at normal volume
- Effects processing happens after TTS generation completes
- Check browser console for any warnings or errors

### Distorted or clipping audio
- Some effect combinations can cause clipping
- The mixer automatically normalizes audio, but extreme effects may still distort
- Try using less aggressive effect combinations
- Reduce distortion amounts if using multiple heavy effects

### Slow generation
- If using WebAssembly, try a browser that supports WebGPU
- Ensure no other heavy processes are running
- Consider using fewer denoising steps for faster (but lower quality) results
- Voice effects add minimal processing time (<1 second typically)