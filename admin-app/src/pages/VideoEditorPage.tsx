import React, { useEffect, useRef } from 'react';
import '../reactvideoeditor/pro/styles.css';
import '../reactvideoeditor/pro/styles.utilities.css';
import './VideoEditorPage.css';

import type { PlayerRef } from '@remotion/player';
import { HttpRenderer } from '../reactvideoeditor/pro/utils/http-renderer';
import { BrowserRenderer } from '../reactvideoeditor/pro/utils/browser-renderer';
import { ReactVideoEditor } from '../reactvideoeditor/pro/components/react-video-editor';
import { createPexelsVideoAdaptor } from '../reactvideoeditor/pro/adaptors/pexels-video-adaptor';
import { createPexelsImageAdaptor } from '../reactvideoeditor/pro/adaptors/pexels-image-adaptor';
import { SHOW_MOBILE_WARNING } from '../constants';
import { MobileWarningModal } from '../reactvideoeditor/pro/components/shared/mobile-warning-modal';
import { ProjectLoadConfirmModal } from '../reactvideoeditor/pro/components/shared/project-load-confirm-modal';
import { useProjectStateFromUrl } from '../reactvideoeditor/pro/hooks/use-project-state-from-url';

export default function VideoEditorPage() {
  const PROJECT_ID = "TestComponent";

  // The app's global index.css sets html { font-size: 90% } which shrinks all
  // rem-based editor sizing. Force 16px while on this page and restore on leave.
  useEffect(() => {
    const prev = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '16px';

    // Ensure this route starts from the neutral dark theme rather than stale custom themes.
    if (localStorage.getItem('rve-extended-theme') === 'rve') {
      localStorage.setItem('rve-extended-theme', 'dark');
    }

    return () => {
      document.documentElement.style.fontSize = prev;
    };
  }, []);

  const { overlays, aspectRatio, backgroundColor, isLoading, showModal, onConfirmLoad, onCancelLoad } = 
    useProjectStateFromUrl('projectId', PROJECT_ID);

  // External playerRef shared with BrowserRenderer so it can seek/capture frames.
  const playerRef = useRef<PlayerRef | null>(null);

  // Use BrowserRenderer by default (free, runs in the user's browser via FFmpeg.wasm).
  // Set VITE_RVE_RENDER_ENDPOINT to override with an SSR render server.
  const renderer = React.useMemo(() => {
    const customEndpoint = import.meta.env.VITE_RVE_RENDER_ENDPOINT as string | undefined;
    if (customEndpoint) {
      return new HttpRenderer(customEndpoint, { type: 'ssr', entryPoint: customEndpoint });
    }
    return new BrowserRenderer(playerRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rve-host w-full h-full fixed inset-0">
      <MobileWarningModal show={SHOW_MOBILE_WARNING} />
      <ProjectLoadConfirmModal 
        isVisible={showModal}
        onConfirm={onConfirmLoad}
        onCancel={onCancelLoad}
      />
      <ReactVideoEditor
        projectId={PROJECT_ID}
        defaultOverlays={overlays as any}
        defaultAspectRatio={aspectRatio || undefined}
        defaultBackgroundColor={backgroundColor || undefined}
        isLoadingProject={isLoading}
        fps={30}
        playerRef={playerRef}
        renderer={renderer}
        disabledPanels={[]}
        defaultTheme="dark"
        adaptors={{
          video: [createPexelsVideoAdaptor('CEOcPegZJRoNztih7auwNoFZmIFTmlYoZTI0NgTRCUxkFhXORBhERORM')],
          images: [createPexelsImageAdaptor('CEOcPegZJRoNztih7auwNoFZmIFTmlYoZTI0NgTRCUxkFhXORBhERORM')],
        }}
        showDefaultThemes={true}
        sidebarWidth="clamp(350px, 25vw, 500px)"        
        sidebarIconWidth="57.6px"
        showIconTitles={false}
        sidebarLogo={<span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: 'inherit' }}>Q<span style={{ opacity: 0.6 }}>Yan</span></span>}
      />
    </div>
  );
}
