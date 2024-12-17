import { FooterProps } from '../utils/types';
import { ConversationControls } from './ConversationControls';
import { AudioVisualizer } from './AudioVisualizer';

export function Footer(props: FooterProps) {
  return (
    <footer className="fixed bottom-0 left-96 right-0 z-50 bg-transparent">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="rounded-t-lg bg-vc-border-gradient p-px shadow-lg shadow-black/20">
          <div className="flex flex-col space-y-4 rounded-t-lg bg-black/95 backdrop-blur-xl p-4 lg:p-5">
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