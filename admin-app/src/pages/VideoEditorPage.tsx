import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../reactvideoeditor/pro/styles.css';
import '../reactvideoeditor/pro/styles.utilities.css';
import './VideoEditorPage.css';

import { HttpRenderer } from '@qyan/api-client/http-renderer';
import { ReactVideoEditor } from '../reactvideoeditor/pro/components/react-video-editor';
import { createPexelsVideoAdaptor } from '../reactvideoeditor/pro/adaptors/pexels-video-adaptor';
import { createPexelsImageAdaptor } from '../reactvideoeditor/pro/adaptors/pexels-image-adaptor';
import { SHOW_MOBILE_WARNING } from '@qyan/platform-constants';
import { MobileWarningModal } from '../reactvideoeditor/pro/components/shared/mobile-warning-modal';
import { ProjectLoadConfirmModal } from '../reactvideoeditor/pro/components/shared/project-load-confirm-modal';
import { useProjectStateFromUrl } from '../reactvideoeditor/pro/hooks/use-project-state-from-url';
import { VideoEditorFolderMenu, useVideoEditorFilename, type FolderTarget } from './VideoEditorFolderMenu';
import { loadEditorState, saveEditorState } from '../reactvideoeditor/pro/utils/general/indexdb-helper';
import { saveVideoDoc, loadVideoDoc, subscribeToProjectVideoDocs, type VideoDocSummary } from '../lib/studioService';
import type { FolderMenuFile } from '../components/FolderMenu';
import { auth } from '../lib/firebase';

const BASE_PROJECT_ID = 'vid-editor-v1';
const LAST_VIDEO_DOC_KEY = 'rve:last-open-video-doc';

type RememberedVideoSelection = {
  doc: VideoDocSummary;
  target: FolderTarget;
};

function loadRememberedVideoSelection(): RememberedVideoSelection | null {
  try {
    const raw = localStorage.getItem(LAST_VIDEO_DOC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RememberedVideoSelection;
  } catch {
    return null;
  }
}

function saveRememberedVideoSelection(doc: VideoDocSummary, target: FolderTarget) {
  try {
    localStorage.setItem(LAST_VIDEO_DOC_KEY, JSON.stringify({ doc, target } satisfies RememberedVideoSelection));
  } catch {
    // Ignore storage failures and keep the editor usable.
  }
}

export default function VideoEditorPage() {
  const [folderTarget, setFolderTarget] = useState<FolderTarget | null>(null);
  const [filename, setFilename] = useVideoEditorFilename();
  // docId tracks the currently open Firestore document; null = unsaved new file
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  // Changing editorKey forces the editor to remount and pick up new IndexedDB state
  const [editorKey, setEditorKey] = useState(0);
  const [savedDocs, setSavedDocs] = useState<VideoDocSummary[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [isFolderMenuOpen, setIsFolderMenuOpen] = useState(false);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveLocationPromptedRef = useRef(false);
  const pendingSaveRequestRef = useRef(false);
  const startupSelectionRef = useRef<RememberedVideoSelection | null>(loadRememberedVideoSelection());
  const folderTargetRef = useRef(folderTarget);
  const filenameRef = useRef(filename);
  const activeDocIdRef = useRef(activeDocId);

  useEffect(() => { folderTargetRef.current = folderTarget }, [folderTarget]);
  useEffect(() => { filenameRef.current = filename }, [filename]);
  useEffect(() => { activeDocIdRef.current = activeDocId }, [activeDocId]);
  useEffect(() => {
    if (folderTarget) {
      saveLocationPromptedRef.current = false;
      setIsFolderMenuOpen(false);
    }
  }, [folderTarget]);

  const handleFolderMenuOpenChange = useCallback((nextOpen: boolean) => {
    setIsFolderMenuOpen(nextOpen);
    if (!nextOpen && !folderTargetRef.current?.projectId) {
      saveLocationPromptedRef.current = false;
      pendingSaveRequestRef.current = false;
    }
  }, []);

  // Subscribe to ALL saved docs for the selected project (all folders)
  useEffect(() => {
    if (!folderTarget?.projectId) {
      setSavedDocs([]);
      return;
    }
    return subscribeToProjectVideoDocs(folderTarget.projectId, setSavedDocs);
  }, [folderTarget?.projectId]);

  // Group docs by folderId for FolderMenu display
  const filesByFolder = React.useMemo((): Record<string, FolderMenuFile[]> => {
    const map: Record<string, FolderMenuFile[]> = {};
    for (const doc of savedDocs) {
      const key = doc.folderId ?? '__root__';
      if (!map[key]) map[key] = [];
      map[key].push({ id: doc.docId, name: doc.name, updatedAt: doc.updatedAt });
    }
    return map;
  }, [savedDocs]);

  const persistCurrentEditorState = useCallback(async (target: FolderTarget) => {
    setSaveStatus('saving');
    if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    try {
      const uid = auth.currentUser?.uid ?? '';
      const editorState = await loadEditorState(BASE_PROJECT_ID);
      if (!editorState) { setSaveStatus(null); return; }
      const docId = await saveVideoDoc({
        projectId: target.projectId,
        docId: activeDocIdRef.current,
        name: filenameRef.current,
        folderId: target.folderId ?? null,
        updatedBy: uid,
        editorState,
      });
      setActiveDocId(docId);
      saveRememberedVideoSelection(
        {
          docId,
          name: filenameRef.current,
          projectId: target.projectId,
          folderId: target.folderId ?? null,
          updatedBy: uid,
          updatedAt: Date.now(),
        },
        target,
      );
      pendingSaveRequestRef.current = false;
      setSaveStatus('saved');
    } catch (err) {
      console.error('[VideoEditor] Firestore save failed:', err);
      setSaveStatus('error');
    } finally {
      saveStatusTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
    }
  }, []);

  // Called after each editor save — persist to Firestore if a folder is selected
  const handleSaved = useCallback(async (_timestamp: number) => {
    const target = folderTargetRef.current;
    if (!target?.projectId) {
      pendingSaveRequestRef.current = true;
      if (!saveLocationPromptedRef.current) {
        saveLocationPromptedRef.current = true;
        setIsFolderMenuOpen(true);
      }
      return;
    }
    await persistCurrentEditorState(target);
  }, [persistCurrentEditorState]);

  // Open a previously saved doc by VideoDocSummary
  async function handleOpenDoc(doc: VideoDocSummary, target?: FolderTarget) {
    const state = await loadVideoDoc(doc.projectId, doc.docId);
    if (!state) return;
    await saveEditorState(BASE_PROJECT_ID, state);
    setFilename(doc.name);
    setActiveDocId(doc.docId);
    if (target) {
      setFolderTarget(target);
      saveRememberedVideoSelection(doc, target);
    }
    setEditorKey((k) => k + 1);
  }

  useEffect(() => {
    const startupSelection = startupSelectionRef.current;
    if (!startupSelection) return;
    startupSelectionRef.current = null;
    setFolderTarget(startupSelection.target);
    setFilename(startupSelection.doc.name);
    void handleOpenDoc(startupSelection.doc, startupSelection.target);
  }, [setFilename]);

  useEffect(() => {
    if (!pendingSaveRequestRef.current) return;
    if (!folderTarget?.projectId) return;
    void persistCurrentEditorState(folderTarget);
  }, [folderTarget?.projectId, persistCurrentEditorState]);

  // Called when user clicks a file inside FolderMenu
  const handleSelectFile = useCallback(async (
    file: FolderMenuFile,
    folderId: string | null,
    projectId: string,
    projectName: string,
    folderName: string | null,
  ) => {
    pendingSaveRequestRef.current = false;
    saveLocationPromptedRef.current = false;
    const doc: VideoDocSummary = {
      docId: file.id, name: file.name, projectId,
      folderId, updatedBy: '', updatedAt: file.updatedAt,
    };
    await handleOpenDoc(doc, { projectId, projectName, folderId, folderName });
  }, [handleOpenDoc]);

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
    useProjectStateFromUrl('projectId', BASE_PROJECT_ID);

  const renderEndpoint = (import.meta.env.VITE_RVE_RENDER_ENDPOINT as string | undefined) || '/api/latest/ssr';

  const renderer = React.useMemo(
    () => new HttpRenderer(renderEndpoint, { type: 'ssr', entryPoint: renderEndpoint }),
    [renderEndpoint]
  );

  const folderMenu = (
    <VideoEditorFolderMenu
      value={folderTarget}
      onChange={(t) => { setFolderTarget(t); }}
      filename={filename}
      onFilenameChange={setFilename}
      filesByFolder={filesByFolder}
      onSelectFile={handleSelectFile}
      saveStatus={saveStatus}
      open={isFolderMenuOpen}
      onOpenChange={handleFolderMenuOpenChange}
    />
  );

  return (
    <div className="rve-host w-full h-full fixed inset-0">
      <MobileWarningModal show={SHOW_MOBILE_WARNING} />
      <ProjectLoadConfirmModal 
        isVisible={showModal}
        onConfirm={onConfirmLoad}
        onCancel={onCancelLoad}
      />
      <ReactVideoEditor
        key={editorKey}
        projectId={BASE_PROJECT_ID}
        defaultOverlays={overlays as any}
        defaultAspectRatio={aspectRatio || undefined}
        defaultBackgroundColor={backgroundColor || undefined}
        isLoadingProject={isLoading}
        fps={30}
        renderer={renderer}
        disabledPanels={[]}
        defaultTheme="dark"
        headerAddon={folderMenu}
        onSaved={handleSaved}
        adaptors={{
          video: [createPexelsVideoAdaptor('CEOcPegZJRoNztih7auwNoFZmIFTmlYoZTI0NgTRCUxkFhXORBhERORM')],
          images: [createPexelsImageAdaptor('CEOcPegZJRoNztih7auwNoFZmIFTmlYoZTI0NgTRCUxkFhXORBhERORM')],
        }}
        showDefaultThemes={true}
        sidebarWidth="clamp(350px, 25vw, 500px)"        
        sidebarIconWidth="57.6px"
        showIconTitles={false}
        sidebarLogo={<span className="rve-sidebar-logo">Q<span className="rve-sidebar-logo-accent">Yan</span></span>}
      />
    </div>
  );
}
