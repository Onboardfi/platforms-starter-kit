// components/agent-console/Footer/index.tsx

import { FooterProps } from '../utils/types';
import { ConversationControls } from './ConversationControls';
import { AudioVisualizer } from './AudioVisualizer';
import { WavRecorder, WavStreamPlayer } from '@/lib/wavtools';

export function Footer(props: FooterProps) {
  return (
    <footer className="mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-lg bg-vc-border-gradient p-px shadow-lg shadow-black/20">
          <div className="flex flex-col space-y-4 rounded-lg bg-black p-4 lg:p-5">
            <ConversationControls {...props} />
            <AudioVisualizer 
              clientCanvasRef={props.clientCanvasRef}
              serverCanvasRef={props.serverCanvasRef}
              wavRecorder={props.wavRecorder}
              wavStreamPlayer={props.wavStreamPlayer}
              primaryColor={props.primaryColor}
              secondaryColor={props.secondaryColor}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
