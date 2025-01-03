export const styles = {
    agent: {
      container: 'p-2 relative',
      window: 'min-w-[400px] aspect-square bg-primary-300 rounded-2xl relative flex items-center justify-center transition-colors duration-2000 overflow-hidden md:min-w-0',
      ready: 'bg-neutral-600',
      talking: 'bg-primary-950',
      footer: 'flex flex-row flex-nowrap justify-between w-full',
      faceBubble: 'absolute w-[220px] h-[220px] rounded-full z-1 bg-primary-700 transition-transform duration-100',
      modelBadge: 'absolute top-3 left-3 right-3 text-center z-[99] uppercase text-xs font-semibold text-primary-500'
    },
    userMic: {
      bubble: 'fixed bottom-12 left-1/2 -translate-x-1/2 z-50',
      inner: 'relative flex items-center justify-center w-16 h-16',
      button: 'relative w-16 h-16 flex items-center justify-center rounded-full bg-primary-300 transition-all duration-300 hover:bg-primary-400',
      icon: 'w-6 h-6 text-primary-500',
      muted: 'bg-primary-200'
    },
    stats: {
      container: 'fixed inset-y-0 right-0 w-full max-w-sm bg-black/80 backdrop-blur shadow-xl',
      header: 'flex items-center justify-between p-4 border-b border-primary-200',
      content: 'p-4 space-y-4',
      item: 'flex flex-col space-y-1',
      label: 'text-xs text-primary-400',
      value: 'text-sm font-medium'
    },
    transcript: {
      overlay: 'fixed bottom-0 left-0 right-0 p-4 pointer-events-none',
      text: 'mx-auto max-w-2xl text-center text-primary-200 transition-opacity duration-300'
    }
  };
  
  // Animations
  export const animations = {
    faceAppear: 'animate-[faceAppear_1s_ease-out_forwards]'
  };