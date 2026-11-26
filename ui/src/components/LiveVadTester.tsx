"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, Volume2, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LiveVadTesterProps {
    vadMinVolume: number;
    vadConfidence: number;
    sampleRate?: 8000 | 16000;
}

export const LiveVadTester: React.FC<LiveVadTesterProps> = ({
    vadMinVolume,
    vadConfidence,
    sampleRate = 8000,
}) => {
    const [isTesting, setIsTesting] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [rawVolume, setRawVolume] = useState(0);
    const [smoothedVolume, setSmoothedVolume] = useState(0);
    const [speechProb, setSpeechProb] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);

    // Sync active threshold configs over WebSocket whenever slider props change
    useEffect(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
                JSON.stringify({
                    type: "config",
                    sample_rate: sampleRate,
                    vad_min_volume: vadMinVolume,
                    vad_confidence: vadConfidence,
                })
            );
        }
    }, [vadMinVolume, vadConfidence, sampleRate]);

    const stopTesting = useCallback(() => {
        if (processorRef.current) {
            try {
                processorRef.current.disconnect();
            } catch (_) {}
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            try {
                audioContextRef.current.close();
            } catch (_) {}
            audioContextRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaStreamRef.current = null;
        }
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch (_) {}
            wsRef.current = null;
        }
        setIsTesting(false);
        setIsSpeaking(false);
        setSpeechProb(0);
        setRawVolume(0);
        setSmoothedVolume(0);
    }, []);

    const startTesting = async () => {
        setErrorMsg(null);
        try {
            // 1. Establish WebSocket connection to backend Silero VAD tester
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${protocol}//${window.location.host}/api/vad-test/stream`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send(
                    JSON.stringify({
                        type: "config",
                        sample_rate: sampleRate,
                        vad_min_volume: vadMinVolume,
                        vad_confidence: vadConfidence,
                    })
                );
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "vad_result") {
                        setSpeechProb(data.speech_prob ?? 0);
                        setRawVolume(data.raw_volume ?? 0);
                        setSmoothedVolume(data.smoothed_volume ?? 0);
                        setIsSpeaking(data.is_speaking ?? false);
                    }
                } catch (e) {
                    console.error("VAD ws message parse error", e);
                }
            };

            ws.onerror = () => {
                setErrorMsg("Could not connect to VAD streaming server.");
                stopTesting();
            };

            // 2. Request microphone input
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            mediaStreamRef.current = stream;

            // 3. Setup AudioContext and downsample to 8kHz / 16kHz
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);

            // Using ScriptProcessorNode for chunk capture
            const bufferSize = 2048;
            const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);
            processorRef.current = processor;

            const inputSampleRate = audioCtx.sampleRate;
            const targetSampleRate = sampleRate; // 8000 or 16000
            const requiredSamples = targetSampleRate === 8000 ? 256 : 512;

            let downsampleBuffer: number[] = [];

            processor.onaudioprocess = (e) => {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Simple linear resampling to targetSampleRate
                const ratio = inputSampleRate / targetSampleRate;
                const newLength = Math.round(inputData.length / ratio);

                for (let i = 0; i < newLength; i++) {
                    const originalIndex = Math.min(Math.round(i * ratio), inputData.length - 1);
                    downsampleBuffer.push(inputData[originalIndex]);
                }

                // Whenever we have enough samples (256 for 8k, 512 for 16k), emit PCM 16-bit
                while (downsampleBuffer.length >= requiredSamples) {
                    const chunk = downsampleBuffer.slice(0, requiredSamples);
                    downsampleBuffer = downsampleBuffer.slice(requiredSamples);

                    // Convert float [-1.0, 1.0] to int16 PCM bytes
                    const pcmData = new Int16Array(chunk.length);
                    for (let j = 0; j < chunk.length; j++) {
                        const s = Math.max(-1, Math.min(1, chunk[j]));
                        pcmData[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
                    }

                    wsRef.current.send(pcmData.buffer);
                }
            };

            source.connect(processor);
            processor.connect(audioCtx.destination);
            setIsTesting(true);
        } catch (err: any) {
            console.error("Failed to start mic test:", err);
            setErrorMsg(err.message || "Failed to access microphone.");
            stopTesting();
        }
    };

    useEffect(() => {
        return () => {
            stopTesting();
        };
    }, [stopTesting]);

    return (
        <div className="rounded-lg border bg-card/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Live Silero VAD Test ({sampleRate === 8000 ? "8 kHz Telephony" : "16 kHz Audio"})
                    </span>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant={isTesting ? "destructive" : "outline"}
                    className="h-7 text-xs font-medium px-2.5"
                    onClick={isTesting ? stopTesting : startTesting}
                >
                    {isTesting ? (
                        <>
                            <MicOff className="h-3.5 w-3.5 mr-1" /> Stop Test
                        </>
                    ) : (
                        <>
                            <Mic className="h-3.5 w-3.5 mr-1 text-primary" /> Test Microphone
                        </>
                    )}
                </Button>
            </div>

            {errorMsg && (
                <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 p-2 rounded">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Visual feedback banner */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/60 border text-xs">
                <span className="text-muted-foreground font-medium">Detection State:</span>
                {isTesting ? (
                    isSpeaking ? (
                        <span className="font-bold text-green-500 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-ping inline-block" />
                            🗣️ USER SPEAKING (BARGE-IN TRIGGERED)
                        </span>
                    ) : (
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground inline-block" />
                            🤫 Silence / Filtered Noise
                        </span>
                    )
                ) : (
                    <span className="text-muted-foreground italic">Click &quot;Test Microphone&quot; to test live voice</span>
                )}
            </div>

            {/* Dual Meters: Volume & Silero Probability */}
            <div className="space-y-2 pt-1">
                {/* 1. Loudness / Volume Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Volume2 className="h-3 w-3" /> RMS Volume:
                        </span>
                        <span className="font-mono text-foreground font-medium">
                            {smoothedVolume.toFixed(3)}{" "}
                            <span className="text-muted-foreground font-normal">
                                (Threshold: {vadMinVolume.toFixed(2)})
                            </span>
                        </span>
                    </div>
                    <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                        {/* Dynamic cutoff marker based on slider */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-foreground z-10"
                            style={{ left: `${Math.min(100, (vadMinVolume / 0.8) * 100)}%` }}
                            title={`Volume Cutoff: ${vadMinVolume}`}
                        />
                        {/* Live volume level */}
                        <div
                            className={`h-full transition-all duration-75 ${
                                smoothedVolume >= vadMinVolume ? "bg-green-500" : "bg-primary/50"
                            }`}
                            style={{ width: `${Math.min(100, (smoothedVolume / 0.8) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* 2. Silero Neural Probability Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Activity className="h-3 w-3" /> Silero Probability:
                        </span>
                        <span className="font-mono text-foreground font-medium">
                            {(speechProb * 100).toFixed(0)}%{" "}
                            <span className="text-muted-foreground font-normal">
                                (Cutoff: {(vadConfidence * 100).toFixed(0)}%)
                            </span>
                        </span>
                    </div>
                    <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                        {/* Dynamic cutoff marker based on slider */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-foreground z-10"
                            style={{ left: `${vadConfidence * 100}%` }}
                            title={`Confidence Cutoff: ${vadConfidence}`}
                        />
                        {/* Live probability level */}
                        <div
                            className={`h-full transition-all duration-75 ${
                                speechProb >= vadConfidence ? "bg-green-500" : "bg-primary/50"
                            }`}
                            style={{ width: `${speechProb * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
