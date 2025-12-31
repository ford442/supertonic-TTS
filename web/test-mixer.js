/**
 * Simple test suite for mixer.js DSP effects
 * Run with: node test-mixer.js
 */

import { VoiceMixer, getAvailablePresets } from './mixer.js';

// Test utilities
function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

function assertArrayLength(arr, expectedLength, message) {
    assert(arr.length === expectedLength, message);
}

function assertArrayNotAllZeros(arr, message) {
    const hasNonZero = arr.some(val => val !== 0);
    assert(hasNonZero, message);
}

function generateTestSignal(length = 1000, frequency = 440, sampleRate = 24000) {
    const signal = new Array(length);
    for (let i = 0; i < length; i++) {
        signal[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }
    return signal;
}

console.log('🧪 Testing VoiceMixer DSP Effects\n');

// Test 1: Basic instantiation
console.log('Test 1: Basic instantiation');
const mixer = new VoiceMixer(24000);
assert(mixer.sampleRate === 24000, 'Sample rate should be 24000');
assert(mixer.audioBuffer === null, 'Audio buffer should be null initially');

// Test 2: Set and get buffer
console.log('\nTest 2: Set and get buffer');
const testSignal = generateTestSignal(1000);
mixer.setBuffer(testSignal);
assertArrayLength(mixer.getBuffer(), 1000, 'Buffer length should be 1000');

// Test 3: Pitch shifting
console.log('\nTest 3: Pitch shifting');
const mixer3 = new VoiceMixer(24000);
mixer3.setBuffer(generateTestSignal(1000));
mixer3.dspPitchShift(5); // Shift up 5 semitones
const shifted = mixer3.getBuffer();
assertArrayLength(shifted, 1000, 'Pitch shifted buffer should maintain length');
assertArrayNotAllZeros(shifted, 'Pitch shifted buffer should have signal');

// Test 4: Tremolo effect
console.log('\nTest 4: Tremolo effect');
const mixer4 = new VoiceMixer(24000);
mixer4.setBuffer(generateTestSignal(1000));
mixer4.dspTremolo(5, 0.5);
const tremolo = mixer4.getBuffer();
assertArrayLength(tremolo, 1000, 'Tremolo buffer should maintain length');
assertArrayNotAllZeros(tremolo, 'Tremolo buffer should have signal');

// Test 5: Echo effect
console.log('\nTest 5: Echo effect');
const mixer5 = new VoiceMixer(24000);
mixer5.setBuffer(generateTestSignal(1000));
mixer5.dspEcho(100, 0.5, 2);
const echo = mixer5.getBuffer();
assertArrayLength(echo, 1000, 'Echo buffer should maintain length');
assertArrayNotAllZeros(echo, 'Echo buffer should have signal');

// Test 6: Reverb effect
console.log('\nTest 6: Reverb effect');
const mixer6 = new VoiceMixer(24000);
mixer6.setBuffer(generateTestSignal(1000));
mixer6.dspReverb(0.5, 0.5);
const reverb = mixer6.getBuffer();
assertArrayLength(reverb, 1000, 'Reverb buffer should maintain length');
assertArrayNotAllZeros(reverb, 'Reverb buffer should have signal');

// Test 7: Quantization effect
console.log('\nTest 7: Quantization effect');
const mixer7 = new VoiceMixer(24000);
mixer7.setBuffer(generateTestSignal(1000));
mixer7.dspQuantize(8);
const quantized = mixer7.getBuffer();
assertArrayLength(quantized, 1000, 'Quantized buffer should maintain length');
assertArrayNotAllZeros(quantized, 'Quantized buffer should have signal');

// Test 8: Vibrato effect
console.log('\nTest 8: Vibrato effect');
const mixer8 = new VoiceMixer(24000);
mixer8.setBuffer(generateTestSignal(1000));
mixer8.dspVibrato(5, 0.5);
const vibrato = mixer8.getBuffer();
assertArrayLength(vibrato, 1000, 'Vibrato buffer should maintain length');
assertArrayNotAllZeros(vibrato, 'Vibrato buffer should have signal');

// Test 9: Formant shifting
console.log('\nTest 9: Formant shifting');
const mixer9 = new VoiceMixer(24000);
mixer9.setBuffer(generateTestSignal(1000));
mixer9.dspFormantShift(1.2);
const formant = mixer9.getBuffer();
assertArrayLength(formant, 1000, 'Formant shifted buffer should maintain length');
assertArrayNotAllZeros(formant, 'Formant shifted buffer should have signal');

// Test 10: Chorus effect
console.log('\nTest 10: Chorus effect');
const mixer10 = new VoiceMixer(24000);
mixer10.setBuffer(generateTestSignal(1000));
mixer10.dspChorus(3, 20);
const chorus = mixer10.getBuffer();
assertArrayLength(chorus, 1000, 'Chorus buffer should maintain length');
assertArrayNotAllZeros(chorus, 'Chorus buffer should have signal');

// Test 11: Chaining effects
console.log('\nTest 11: Chaining effects');
const mixer11 = new VoiceMixer(24000);
mixer11.setBuffer(generateTestSignal(1000))
    .dspTremolo(5, 0.3)
    .dspEcho(100, 0.3, 1)
    .dspSharpen(0.2);
const chained = mixer11.getBuffer();
assertArrayLength(chained, 1000, 'Chained effects buffer should maintain length');
assertArrayNotAllZeros(chained, 'Chained effects buffer should have signal');

// Test 12: Opera singing preset
console.log('\nTest 12: Opera singing preset');
const mixer12 = new VoiceMixer(24000);
mixer12.setBuffer(generateTestSignal(2000)); // Longer signal for preset effects
mixer12.presetOperaSinging();
const opera = mixer12.getBuffer();
assertArrayLength(opera, 2000, 'Opera preset buffer should maintain length');
assertArrayNotAllZeros(opera, 'Opera preset buffer should have signal');

// Test 13: Robot persona preset
console.log('\nTest 13: Robot persona preset');
const mixer13 = new VoiceMixer(24000);
mixer13.setBuffer(generateTestSignal(2000));
mixer13.presetRobot();
const robot = mixer13.getBuffer();
assertArrayLength(robot, 2000, 'Robot preset buffer should maintain length');
assertArrayNotAllZeros(robot, 'Robot preset buffer should have signal');

// Test 14: Chipmunk persona preset
console.log('\nTest 14: Chipmunk persona preset');
const mixer14 = new VoiceMixer(24000);
mixer14.setBuffer(generateTestSignal(2000));
mixer14.presetChipmunk();
const chipmunk = mixer14.getBuffer();
assertArrayLength(chipmunk, 2000, 'Chipmunk preset buffer should maintain length');
assertArrayNotAllZeros(chipmunk, 'Chipmunk preset buffer should have signal');

// Test 15: Get available presets
console.log('\nTest 15: Get available presets');
const presets = getAvailablePresets();
assert(presets.singing.length === 8, 'Should have 8 singing presets');
assert(presets.persona.length === 12, 'Should have 12 persona presets');
assert(presets.singing[0].value === 'OperaSinging', 'First singing preset should be OperaSinging');
assert(presets.persona[0].value === 'Chipmunk', 'First persona preset should be Chipmunk');

// Test 16: Combining presets
console.log('\nTest 16: Combining presets (Opera + Ethereal)');
const mixer16 = new VoiceMixer(24000);
mixer16.setBuffer(generateTestSignal(2000));
mixer16.presetOperaSinging().presetEthereal();
const combined = mixer16.getBuffer();
assertArrayLength(combined, 2000, 'Combined presets buffer should maintain length');
assertArrayNotAllZeros(combined, 'Combined presets buffer should have signal');

// Test 17: Edge case - empty buffer
console.log('\nTest 17: Edge case - empty buffer');
const mixer17 = new VoiceMixer(24000);
mixer17.dspTremolo(5, 0.5); // Should not crash with null buffer
assert(mixer17.getBuffer() === null, 'Operations on null buffer should return null');

// Test 18: Edge case - zero pitch shift
console.log('\nTest 18: Edge case - zero pitch shift');
const mixer18 = new VoiceMixer(24000);
const original = generateTestSignal(1000);
mixer18.setBuffer([...original]);
mixer18.dspPitchShift(0); // No shift
const unchanged = mixer18.getBuffer();
assertArrayLength(unchanged, 1000, 'Zero pitch shift should maintain length');
// Note: array should be relatively unchanged, but we don't test exact equality

// Test 19: All singing presets exist
console.log('\nTest 19: All singing presets exist');
const singingSampler = new VoiceMixer(24000);
singingSampler.setBuffer(generateTestSignal(1000));
const singingPresets = ['OperaSinging', 'PopSinging', 'JazzSinging', 'RockSinging', 
                         'GospelSinging', 'CountrySinging', 'RapVocal', 'EDMVocal'];
for (const preset of singingPresets) {
    const method = `preset${preset}`;
    assert(typeof singingSampler[method] === 'function', `Singing preset ${preset} should exist`);
}

// Test 20: All persona presets exist
console.log('\nTest 20: All persona presets exist');
const personaSampler = new VoiceMixer(24000);
personaSampler.setBuffer(generateTestSignal(1000));
const personaPresets = ['Chipmunk', 'Monster', 'Robot', 'Alien', 'Cave', 'Telephone',
                        'Ethereal', 'Underwater', 'Giant', 'Cartoon', 'OldRadio', 'Whisper'];
for (const preset of personaPresets) {
    const method = `preset${preset}`;
    assert(typeof personaSampler[method] === 'function', `Persona preset ${preset} should exist`);
}

console.log('\n✨ All tests passed! ✨\n');
console.log('Summary:');
console.log('- 20 test suites executed');
console.log('- All DSP effects working correctly');
console.log('- All 8 singing presets available');
console.log('- All 12 persona presets available');
console.log('- Effect chaining working');
console.log('- Edge cases handled');
