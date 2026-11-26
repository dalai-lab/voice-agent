class AudioCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 256;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channelData = input[0];
            // Post raw Float32Array channel data to main thread
            this.port.postMessage(channelData);
        }
        return true;
    }
}

registerProcessor("audio-capture-processor", AudioCaptureProcessor);
