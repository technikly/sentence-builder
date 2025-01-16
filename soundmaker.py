import numpy as np
from pydub import AudioSegment
import os

# Define the directory where the MP3 files will be saved
OUTPUT_DIR = "public/sounds"

# Ensure the output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_sine_wave(frequency, duration, sample_rate=44100, amplitude=0.5):
    """
    Generates a sine wave at a given frequency and duration.

    :param frequency: Frequency of the sine wave in Hz
    :param duration: Duration of the sound in seconds
    :param sample_rate: Sampling rate in Hz
    :param amplitude: Amplitude of the wave (0.0 to 1.0)
    :return: Numpy array containing the sine wave
    """
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    wave = amplitude * np.sin(2 * np.pi * frequency * t)
    # Normalize to 16-bit range
    audio = np.int16(wave * 32767)
    return audio

def save_wave_as_mp3(wave_data, sample_rate, filename):
    """
    Saves the provided wave data as an MP3 file.

    :param wave_data: Numpy array containing audio data
    :param sample_rate: Sampling rate in Hz
    :param filename: Output filename (including path)
    """
    # Create an AudioSegment instance
    audio_segment = AudioSegment(
        wave_data.tobytes(),
        frame_rate=sample_rate,
        sample_width=wave_data.dtype.itemsize,
        channels=1
    )
    # Export as MP3
    audio_segment.export(filename, format="mp3")
    print(f"Saved: {filename}")

def main():
    # Define beep configurations for each sound effect
    beep_configs = {
        "select.mp3": {"frequency": 600, "duration": 0.2},
        "add.mp3": {"frequency": 700, "duration": 0.3},
        "change.mp3": {"frequency": 500, "duration": 0.25},
        "save.mp3": {"frequency": 800, "duration": 0.35},
    }

    sample_rate = 44100  # CD-quality sampling

    for filename, config in beep_configs.items():
        frequency = config["frequency"]
        duration = config["duration"]
        print(f"Generating {filename}: {frequency}Hz for {duration} seconds")
        wave = generate_sine_wave(frequency, duration, sample_rate)
        filepath = os.path.join(OUTPUT_DIR, filename)
        save_wave_as_mp3(wave, sample_rate, filepath)

if __name__ == "__main__":
    main()

