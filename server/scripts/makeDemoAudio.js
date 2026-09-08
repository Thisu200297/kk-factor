/**
 * Generates short, royalty-free demo WAV tones so the music player is
 * immediately playable after seeding, without shipping any licensed audio.
 * Replace these with real uploads through the admin dashboard.
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;

function writeWav(filePath, { seconds = 12, frequency = 220, harmonics = [1, 2, 3] }) {
  const samples = Math.floor(SAMPLE_RATE * seconds);
  const dataBytes = samples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);          // PCM chunk size
  buffer.writeUInt16LE(1, 20);           // format = PCM
  buffer.writeUInt16LE(1, 22);           // channels
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);           // block align
  buffer.writeUInt16LE(16, 34);          // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < samples; i += 1) {
    const t = i / SAMPLE_RATE;
    // Gentle attack/release envelope so the loop does not click.
    const envelope = Math.min(1, t / 0.5) * Math.min(1, (seconds - t) / 0.5);
    let value = 0;
    harmonics.forEach((h, index) => {
      value += Math.sin(2 * Math.PI * frequency * h * t) / (index + 2);
    });
    const sample = Math.max(-1, Math.min(1, value * envelope * 0.5));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
  return { seconds, bytes: buffer.length };
}

function generateDemoTracks(tracksDir) {
  fs.mkdirSync(tracksDir, { recursive: true });
  const specs = [
    { file: 'demo-midnight-drive.wav', frequency: 196.0, seconds: 14, harmonics: [1, 2, 4] },
    { file: 'demo-harbour-lights.wav', frequency: 261.63, seconds: 12, harmonics: [1, 3, 5] },
    { file: 'demo-static-signal.wav', frequency: 174.61, seconds: 16, harmonics: [1, 2, 3] },
    { file: 'demo-open-frequency.wav', frequency: 293.66, seconds: 11, harmonics: [1, 2] },
  ];

  return specs.map((spec) => {
    const target = path.join(tracksDir, spec.file);
    if (!fs.existsSync(target)) writeWav(target, spec);
    return { url: `/uploads/tracks/${spec.file}`, duration: spec.seconds };
  });
}

module.exports = { generateDemoTracks };
