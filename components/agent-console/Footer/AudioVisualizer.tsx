// components/agent-console/Footer/AudioVisualizer.tsx

import { useRef, useEffect } from 'react';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';
import { WavRenderer } from '@/app/utils/wav_renderer';

interface AudioVisualizerProps {
  clientCanvasRef: React.RefObject<HTMLCanvasElement>;
  serverCanvasRef: React.RefObject<HTMLCanvasElement>;
  wavRecorder: WavRecorder;
  wavStreamPlayer: WavStreamPlayer;
  primaryColor?: string;
  secondaryColor?: string;
}

export function AudioVisualizer({ 
  clientCanvasRef, 
  serverCanvasRef,
  wavRecorder,
  wavStreamPlayer,
  primaryColor = "#3b82f6",
  secondaryColor = "#10b981"
}: AudioVisualizerProps) {
  useEffect(() => {
    let isLoaded = true;

    const render = () => {
      if (!isLoaded) return;

      // Client canvas rendering
      if (clientCanvasRef.current) {
        const canvas = clientCanvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!canvas.width || !canvas.height) {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
        }

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const result = wavRecorder.isRecording
            ? wavRecorder.getFrequencies('voice')
            : { values: new Float32Array([0]) };
          
          WavRenderer.drawBars(
            canvas,
            ctx,
            result.values,
            primaryColor,
            10,
            0,
            8
          );
        }
      }

      // Server canvas rendering
      if (serverCanvasRef.current) {
        const canvas = serverCanvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!canvas.width || !canvas.height) {
          canvas.width = canvas.offsetWidth;
          canvas.height = canvas.offsetHeight;
        }

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const result = wavStreamPlayer.analyser
            ? wavStreamPlayer.getFrequencies('voice')
            : { values: new Float32Array([0]) };
          
          WavRenderer.drawBars(
            canvas,
            ctx,
            result.values,
            secondaryColor,
            10,
            0,
            8
          );
        }
      }

      requestAnimationFrame(render);
    };

    render();
    return () => { isLoaded = false; };
  }, [clientCanvasRef, serverCanvasRef, wavRecorder, wavStreamPlayer, primaryColor, secondaryColor]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="relative rounded-lg p-1">
        <canvas ref={clientCanvasRef} className="w-full h-8" />
      </div>
      <div className="relative rounded-lg p-1">
        <canvas ref={serverCanvasRef} className="w-full h-8" />
      </div>
    </div>
  );
}
