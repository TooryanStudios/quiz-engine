import { createContext, useContext } from "react";
import { Overlay } from "../types";

/**
 * Holds interactive editor state that changes frequently (selection, overlay edits).
 * Kept SEPARATE from Remotion's inputProps so that selection changes do NOT
 * trigger a full Remotion composition re-render (which is expensive).
 */
export interface EditorInteractionContextType {
  selectedOverlayId: number | null;
  setSelectedOverlayId: (id: number | null) => void;
  changeOverlay: (id: number, updater: (overlay: Overlay) => Overlay) => void;
}

export const EditorInteractionContext =
  createContext<EditorInteractionContextType | null>(null);

/**
 * Read editor interaction state (selection, change callbacks) from context.
 * Returns null when running outside an interactive editor (e.g. SSR / Lambda).
 */
export const useEditorInteraction = () =>
  useContext(EditorInteractionContext);
