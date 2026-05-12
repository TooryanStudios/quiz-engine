import { memo } from 'react'

type WorkhubStylesProps = {
  phoneMaxWidth?: number
}

const WorkhubStyles = memo(function WorkhubStyles({ phoneMaxWidth = 767 }: WorkhubStylesProps) {
  return (
    <style>{`
      html.workhub-font-compact {
        font-size: 15px;
      }
      html.workhub-page-active,
      html.workhub-page-active body {
        overflow: hidden;
        overscroll-behavior: none;
        width: 100%;
          min-height: 100%;
        height: 100%;
      }
      .workhub-shell {
          width: 100%;
          max-width: 100vw;
          max-width: 100dvw;
          height: 100vh;
          height: 100dvh;
        padding: 6px 8px 8px;
        background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
        color: #14213d;
        box-sizing: border-box;
        overflow: hidden;
      }
      .workhub-shell *::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }
      .workhub-shell *::-webkit-scrollbar-track {
        background: transparent;
      }
      .workhub-shell *::-webkit-scrollbar-thumb {
        background: #c4d0e8;
        border-radius: 999px;
      }
      .workhub-shell *::-webkit-scrollbar-thumb:hover {
        background: #96aacb;
      }
      .workhub-shell * {
        scrollbar-width: thin;
        scrollbar-color: #c4d0e8 transparent;
      }
      /* Explicit overrides for key scrollable containers */
      .workhub-detail-rail-body.is-details::-webkit-scrollbar,
      .workhub-tree-panel::-webkit-scrollbar,
      .workhub-comment-list::-webkit-scrollbar,
      .workhub-task-list::-webkit-scrollbar,
      .workhub-project-list::-webkit-scrollbar {
        width: 4px;
      }
      .workhub-detail-rail-body.is-details::-webkit-scrollbar-thumb,
      .workhub-tree-panel::-webkit-scrollbar-thumb,
      .workhub-comment-list::-webkit-scrollbar-thumb,
      .workhub-task-list::-webkit-scrollbar-thumb,
      .workhub-project-list::-webkit-scrollbar-thumb {
        background: #c4d0e8;
        border-radius: 999px;
      }
      .workhub-app {
        max-width: none;
        width: 100%;
        margin: 0 auto;
        font-size: 14px;
        line-height: 1.35;
        height: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      .workhub-topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 0 4px;
        height: auto;
        min-height: 44px;
        flex-shrink: 0;
        margin-bottom: 2px;
      }
      .workhub-topbar-main {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
      }
      .workhub-brand-wrap {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
        flex-shrink: 0;
      }
      .workhub-brand {
        font-size: 1.9rem;
        font-weight: 400;
        color: #3b4a6b;
        letter-spacing: 0.03em;
        white-space: nowrap;
        flex-shrink: 0;
        line-height: 1;
      }
      .workhub-brand-initial {
        color: #0f1f3d;
        font-weight: 800;
      }
      .workhub-brand-subtitle {
        margin-top: 2px;
        font-size: 0.76rem;
        font-weight: 600;
        color: #5f6f90;
        white-space: nowrap;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-moodboard-inline-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-left: 14px;
        min-width: 0;
        flex-wrap: wrap;
      }
      .workhub-topbar-divider {
        width: 1px;
        height: 34px;
        background: #d6e2f4;
        flex: 0 0 auto;
      }
      .workhub-workspace-tabs-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
        overflow: hidden;
      }
      .workhub-workspace-tabs {
        display: flex;
        align-items: flex-end;
        gap: 0;
        min-width: 0;
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 2px 1px 0;
        scrollbar-width: thin;
      }
      .workhub-workspace-tabs::-webkit-scrollbar {
        height: 5px;
      }
      .workhub-workspace-tabs::-webkit-scrollbar-thumb {
        background: #cad8f2;
        border-radius: 999px;
      }
      .workhub-workspace-tab {
        padding: 5px 12px;
        white-space: nowrap;
        flex: 0 0 auto;
      }
      .workhub-workspace-tab:not(.is-active) {
        color: #8fa0bd;
        font-weight: 400;
        filter: grayscale(1) saturate(0);
      }
      .workhub-workspace-tab:not(.is-active):hover {
        color: #7f92b1;
        background: rgba(127, 146, 177, 0.08);
      }
      .workhub-workspace-tab:not(:first-child)::before {
        content: '';
        position: absolute;
        left: 0;
        top: 7px;
        bottom: 7px;
        width: 1px;
        background: #d9e4f6;
        pointer-events: none;
      }
      .workhub-workspace-tab.is-active {
        box-shadow: none;
      }
      .workhub-topbar-context-chip {
        display: inline-flex;
        align-items: center;
        max-width: min(280px, 100%);
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid #d8e6fb;
        background: rgba(255, 255, 255, 0.84);
        color: #294778;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-view-mode-switch {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px;
        border: 1px solid #d8e6fb;
        border-radius: 11px;
        background: rgba(255, 255, 255, 0.86);
      }
      .workhub-view-mode-btn {
        min-width: 88px;
        min-height: 32px;
        padding: 0 10px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: #5d7195;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        cursor: pointer;
      }
      .workhub-view-mode-btn-icon {
        font-size: 0.92rem;
        line-height: 1;
        opacity: 0.9;
      }
      .workhub-view-mode-btn-label {
        line-height: 1;
      }
      .workhub-view-mode-btn.is-active {
        background: linear-gradient(180deg, #edf4ff 0%, #dfeaff 100%);
        color: #1d4ca6;
        box-shadow: inset 0 0 0 1px #c8dafd;
      }
      .workhub-primary-tabs-strip {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        padding: 0 4px 8px;
        margin-bottom: 6px;
        border-bottom: 1px solid #e3ecfb;
      }
      .workhub-primary-tabs-scroll {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0 1px 2px;
        scrollbar-width: thin;
      }
      .workhub-primary-tabs-scroll::-webkit-scrollbar {
        height: 5px;
      }
      .workhub-primary-tabs-scroll::-webkit-scrollbar-thumb {
        background: #cad8f2;
        border-radius: 999px;
      }
      .workhub-primary-nav-tab {
        flex: 0 0 auto;
        padding: 8px 14px;
      }
      .workhub-workspace-tab-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }
      .workhub-mobile-gear-wrap {
        position: relative;
      }
      .workhub-workspace-tab-actions .workhub-plus-btn,
      .workhub-workspace-tab-actions .workhub-gear-btn {
        width: 28px;
        height: 28px;
      }
      .workhub-mobile-workspace-picker-actions .workhub-gear-menu.is-up {
        top: auto;
        bottom: calc(100% + 4px);
      }
      .workhub-mobile-workspace-entry {
        display: none;
        flex: 1;
        min-width: 0;
      }
      .workhub-mobile-workspace-toggle {
        border: 1px solid #d8e6fb;
        background: #ffffff;
        color: #355487;
        border-radius: 10px;
        min-height: 34px;
        padding: 0 10px;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
      .workhub-mobile-workspace-toggle.is-active {
        border-color: #87a9ff;
        background: #edf4ff;
        color: #295fe6;
      }
      .workhub-mobile-dashboard-actions {
        display: none;
      }
      .workhub-shell.is-mobile .workhub-mobile-dashboard-actions {
        display: flex;
        position: sticky;
        bottom: calc(64px + env(safe-area-inset-bottom));
        z-index: 4;
        padding: 6px;
        border-radius: 10px;
        border: 1px solid #d7e4fb;
        background: rgba(248, 251, 255, 0.96);
        backdrop-filter: blur(4px);
        width: 100%;
        box-sizing: border-box;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-shell.is-mobile .workhub-mobile-dashboard-actions > button {
        flex: 1 1 calc(50% - 6px);
        min-width: 0;
      }
      .workhub-mobile-workspace-panel-backdrop {
        position: fixed;
        left: 0;
        right: 0;
        top: 0;
        bottom: calc(60px + env(safe-area-inset-bottom));
        z-index: 55;
        background: rgba(20, 32, 56, 0.34);
        display: flex;
        align-items: flex-end;
        justify-content: stretch;
        padding: max(12px, env(safe-area-inset-top)) 0 0;
      }
      .workhub-mobile-workspace-panel {
        width: 100%;
        height: min(calc(100vh - 60px - env(safe-area-inset-top) - env(safe-area-inset-bottom)), 78vh);
        min-height: 320px;
        max-height: min(calc(100vh - 60px - env(safe-area-inset-top) - env(safe-area-inset-bottom)), 78vh);
        background: linear-gradient(180deg, #f9fbff 0%, #f3f6fb 100%);
        border: 1px solid #dde6f2;
        border-bottom: 0;
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -10px 24px rgba(20, 40, 77, 0.16);
        padding: 0;
        touch-action: pan-y;
        animation: workhubMobileDrawerIn 0.3s cubic-bezier(0.22, 0.8, 0.24, 1);
      }
      .workhub-doc-ai-tools-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-doc-ai-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .workhub-doc-ai-language-option {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex: 1 1 260px;
        min-height: 32px;
        padding: 0 10px;
      }
      .workhub-mobile-workspace-panel-head {
        border-bottom: 1px solid #e4ebf5;
        background: linear-gradient(180deg, #fbfdff 0%, #f4f7fc 100%);
      }
      .workhub-mobile-workspace-panel-title-copy {
        margin: 0;
        display: flex;
        flex-direction: column;
      }
      .workhub-mobile-workspace-panel-title-copy span {
        font-size: 0.72rem;
        font-weight: 700;
        min-width: 0;
        color: #5f7292;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-mobile-workspace-panel-body {
        min-height: 0;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px 10px 8px;
      }
      .workhub-mobile-workspace-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-mobile-workspace-picker-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-mobile-workspace-toolbar {
        width: 100%;
      }
      .workhub-mobile-workspace-picker-select {
        width: 100%;
        min-width: 0;
        flex: 1;
        border: 1px solid #d8e6fb;
        border-radius: 9px;
        background: #ffffff;
        color: #28406d;
        font: inherit;
        font-size: 0.76rem;
        font-weight: 600;
        padding: 7px 9px;
      }
      .workhub-mobile-workspace-picker-select:focus {
        outline: none;
        border-color: #87a9ff;
        box-shadow: 0 0 0 2px rgba(89, 132, 230, 0.14);
      }
      .workhub-mobile-workspace-picker-actions {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex: 0 0 auto;
      }
      .workhub-mobile-workspace-picker-actions .workhub-plus-btn,
      .workhub-mobile-workspace-picker-actions .workhub-gear-btn,
      .workhub-mobile-workspace-picker-actions .workhub-ghost-mini {
        width: 28px;
        min-width: 28px;
        height: 28px;
        border-radius: 8px;
        font-size: 0.78rem;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-mobile-workspace-overview-btn.is-active {
        border-color: #87a9ff;
        background: #edf4ff;
        color: #295fe6;
      }
      .workhub-mobile-workspace-panel-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-mobile-tree-panel {
        min-height: 0;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        border: 1px solid #e2e8f2;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.72);
        padding: 8px;
      }
      .workhub-mobile-tree-panel-body {
        min-height: 0;
        overflow-y: auto;
        padding-right: 2px;
        padding-bottom: 2px;
        overscroll-behavior: contain;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }
      .workhub-mobile-footer {
        display: none;
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 48;
        background: #ffffff;
        border-top: 1px solid #dbe7ff;
        box-shadow: 0 -8px 22px rgba(20, 40, 77, 0.1);
        padding: 10px 8px calc(10px + env(safe-area-inset-bottom));
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
        align-items: center;
      }
      .workhub-mobile-footer-btn {
        border: 1px solid transparent;
        background: transparent;
        color: #667997;
        border-radius: 14px;
        min-height: 60px;
        padding: 6px 4px;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        cursor: pointer;
        font: inherit;
        width: 100%;
      }
      .workhub-mobile-footer-btn > span {
        font-size: 1.45rem;
        line-height: 1;
      }
      .workhub-mobile-footer-btn > small {
        font-size: 0.68rem;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
      }
      .workhub-mobile-footer-btn-quick {
        min-height: 62px;
        border-radius: 18px;
        border-color: #bfd4ff;
        background: linear-gradient(180deg, #f5f9ff 0%, #e8f1ff 100%);
        color: #18489e;
        box-shadow: 0 4px 12px rgba(32, 73, 148, 0.18);
      }
      .workhub-mobile-footer-btn-quick > span {
        font-size: 1.7rem;
        font-weight: 700;
        line-height: 0.9;
      }
      .workhub-mobile-footer-btn-quick > small {
        font-size: 0.65rem;
      }
      .workhub-mobile-footer-btn-quick:disabled {
        opacity: 0.5;
        box-shadow: none;
      }
      .workhub-mobile-footer-btn.is-active {
        color: #1f4fae;
        border-color: #cfe0ff;
        background: #f1f6ff;
      }
      .workhub-modal.workhub-status-editor-modal {
        width: min(620px, calc(100vw - 24px));
      }
      .workhub-status-editor-layout {
        display: grid;
        grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
        gap: 10px;
      }
      .workhub-status-editor-sidebar,
      .workhub-status-editor-detail {
        border: 1px solid #dbe7ff;
        background: #f9fbff;
        border-radius: 10px;
        padding: 10px;
      }
      .workhub-status-editor-sidebar {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .workhub-status-editor-sidebar-head,
      .workhub-panel-head p,
      .workhub-workspace-summary span {
        margin: 3px 0 0;
        color: #60708f;
        line-height: 1.3;
        font-size: 0.88rem;
      }
      .workhub-status-editor-list {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .workhub-status-editor-list.compact-list {
        max-height: 240px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .workhub-status-list-item {
        width: 100%;
        border: none;
        border-bottom: 1px solid #edf2fb;
        border-radius: 0;
        padding: 6px 7px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        text-align: left;
        cursor: pointer;
        background: transparent;
      }
      .workhub-status-list-item:last-child {
        border-bottom: none;
      }
      .workhub-status-list-item:hover {
        background: #f0f4ff;
      }
      .workhub-status-list-item.is-active {
        background: #e6eeff;
      }
      .workhub-status-list-item-main {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .workhub-status-list-text {
        display: flex;
        align-items: baseline;
        gap: 5px;
        min-width: 0;
      }
      .workhub-status-list-text strong {
        font-size: 0.8rem;
        color: #17305c;
        line-height: 1.2;
      }
      .workhub-status-list-text small {
        font-size: 0.68rem;
        color: #9aaac2;
        line-height: 1.2;
      }
      .workhub-status-list-swatch {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        flex: 0 0 auto;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
      }
      .workhub-status-list-swatch.large {
        width: 14px;
        height: 14px;
      }
      .workhub-status-editor-add {
        border-top: 1px solid #e3ecfb;
        padding-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-status-editor-add.compact-add {
        margin-top: auto;
      }
      .workhub-status-add-btn {
        width: 100%;
        margin-top: 6px;
        padding: 6px 10px;
        border: 1px dashed #bed1f7;
        border-radius: 8px;
        background: transparent;
        color: #4a6fa5;
        font-size: 0.8rem;
        cursor: pointer;
        text-align: center;
      }
      .workhub-status-add-btn:hover {
        background: #edf4ff;
        border-color: #87a9ff;
      }
      .workhub-status-editor-detail {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .workhub-status-editor-detail-head h3 {
        margin: 0;
        font-size: 0.96rem;
        color: #17305c;
      }
      .workhub-status-editor-detail-actions {
        display: flex;
        justify-content: flex-end;
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-status-editor-layout {
          grid-template-columns: 1fr;
          min-height: 0;
        }
        .workhub-status-editor-list.compact-list {
          max-height: 180px;
        }
      }
      .workhub-shell.is-mobile .workhub-topbar {
        flex-direction: row;
        gap: 8px;
        flex-wrap: nowrap;
        align-items: center;
      }
      .workhub-shell.is-mobile .workhub-shell-layout,
      .workhub-shell.is-mobile .workhub-shell-layout.sidebar-collapsed {
        grid-template-columns: minmax(0, 1fr);
        gap: 0;
      }
      .workhub-shell.is-mobile .workhub-main-stage {
        padding-bottom: calc(76px + env(safe-area-inset-bottom));
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }
      .workhub-shell.is-mobile .workhub-section-stack {
        min-height: max-content;
      }
      .workhub-shell.is-mobile .workhub-topbar-main {
        width: auto;
        flex: 1 1 auto;
        gap: 8px;
        min-width: 0;
      }
      .workhub-shell.is-mobile .workhub-brand-wrap {
        min-width: 0;
        flex: 1 1 auto;
      }
      .workhub-shell.is-mobile .workhub-brand-subtitle {
        max-width: 100%;
      }
      .workhub-workspace-browser-dialog {
        width: min(560px, 94vw);
        max-width: 560px;
      }
      .workhub-workspace-browser-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .workhub-shell.is-mobile .workhub-topbar-divider {
        display: none;
      }
      .workhub-shell.is-mobile .workhub-workspace-tabs-wrap {
        display: none;
      }
      .workhub-shell.is-mobile .workhub-primary-tabs-strip {
        padding: 0 0 6px;
        margin-bottom: 4px;
      }
      .workhub-shell.is-mobile .workhub-mobile-workspace-entry {
        display: flex;
        flex: 0 0 auto;
        margin-left: auto;
      }
      .workhub-shell.is-mobile .workhub-mobile-footer {
        display: grid;
      }
      .workhub-shell.is-mobile .workhub-floating-add-wrap {
        bottom: calc(88px + env(safe-area-inset-bottom));
      }
      .workhub-shell.is-mobile .workhub-mobile-workspace-toggle {
        min-height: 32px;
        padding: 0 8px;
        border-radius: 8px;
        max-width: 180px;
        display: flex;
        align-items: center;
        gap: 4px;
        overflow: hidden;
      }
      .workhub-mobile-context-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 140px;
        display: block;
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-shell.is-mobile .workhub-mobile-workspace-toggle span:last-child {
          display: none;
        }
        .workhub-task-detail-dialog-backdrop {
          padding: 10px;
          align-items: stretch;
        }
        .workhub-modal.workhub-task-detail-dialog {
          width: 100%;
          max-height: 100%;
          border-radius: 16px;
        }
        .workhub-task-detail-dialog-body {
          overflow: auto;
          padding: 10px;
        }
        .workhub-task-dialog-layout {
          grid-template-columns: 1fr;
          height: auto;
        }
        .workhub-task-dialog-discussion-pane,
        .workhub-task-dialog-details-pane {
          overflow: visible;
        }
        .workhub-task-dialog-details-pane .workhub-detail-icon-row,
        .workhub-detail-meta-grid {
          grid-template-columns: 1fr;
        }
      }
      .workhub-shell.is-mobile .workhub-header-actions {
        width: auto;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: nowrap;
        overflow: visible;
        border-top: none;
        padding-top: 0;
        margin-top: 0;
        margin-left: 6px;
        padding-left: 0;
        border-left: none;
        scrollbar-width: none;
      }
      .workhub-shell.is-mobile .workhub-top-nav-icon-btn {
        min-width: 34px;
        width: 34px;
        height: 34px;
        border-radius: 8px;
        font-size: 1rem;
      }
      .workhub-shell.is-mobile .workhub-find-command-btn {
        display: none;
      }
      .workhub-header-actions,
      .workhub-home-actions,
      .workhub-panel-tools,
      .workhub-center-actions,
      .workhub-member-actions,
      .workhub-inline-row,
      .workhub-detail-meta,
      .workhub-meta-row,
      .workhub-task-controls,
      .workhub-project-card-actions,
      .workhub-status-editor-add-head {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .workhub-header-actions {
        justify-content: flex-end;
        flex-wrap: nowrap;
        flex-shrink: 0;
        overflow: visible;
        margin-left: 10px;
        padding-left: 10px;
        border-left: 1px solid #d6e2f4;
      }
      .workhub-top-nav-icon-btn {
        min-width: 38px;
        width: 38px;
        height: 38px;
        padding: 0;
        border-radius: 9px;
        font-size: 1.08rem;
        line-height: 1;
        border: 1px solid #d8e6fb;
        background: #ffffff;
        color: #355487;
      }
      .workhub-top-nav-icon-btn:hover {
        border-color: #b9cff5;
        background: #f8fbff;
        transition: none;
      }
      .workhub-top-nav-icon-btn.is-active {
        border-color: #87a9ff;
        background: #edf4ff;
        color: #295fe6;
      }
      .workhub-top-nav-icon-btn span[aria-hidden='true'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-notify-wrap {
        position: relative;
        overflow: visible;
      }
      .workhub-account-wrap {
        position: relative;
        overflow: visible;
      }
      .workhub-notify-btn {
        position: relative;
        border: 1px solid #d8e6fb;
        background: #ffffff;
        color: #355487;
        border-radius: 10px;
        width: 32px;
        min-width: 32px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        overflow: visible;
        transition: background 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease, color 0.08s ease;
      }
      .workhub-notify-btn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.06rem;
        line-height: 1;
        transition: transform 0.18s ease, color 0.18s ease;
      }
      .workhub-notify-btn.has-unread {
        border-color: #efbf5f;
        background: linear-gradient(180deg, #fff8e4 0%, #fff1c5 100%);
        color: #8a5b04;
        box-shadow: 0 0 0 1px rgba(239, 191, 95, 0.25);
      }
      .workhub-notify-btn-icon.has-unread {
        transform: rotate(-10deg);
        color: #a36b00;
      }
      .workhub-account-btn {
        position: relative;
        border: 1px solid #d8e6fb;
        background: #ffffff;
        color: #355487;
        border-radius: 10px;
        min-width: 38px;
        height: 34px;
        padding: 0 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
      }
      .workhub-notify-btn.is-open,
      .workhub-notify-btn:hover {
        border-color: #7fa3ef;
        background: #edf4ff;
      }
      .workhub-account-btn.is-open,
      .workhub-account-btn:hover {
        border-color: #7fa3ef;
        background: #edf4ff;
      }
      .workhub-account-avatar {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 1px solid #c8d8f4;
        object-fit: cover;
        background: #e6efff;
        color: #214a9f;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.64rem;
        font-weight: 800;
        line-height: 1;
        text-transform: uppercase;
      }
      .workhub-account-caret {
        font-size: 0.62rem;
        color: #6f84a8;
      }
      .workhub-notify-badge {
        position: absolute;
        top: -1px;
        right: -1px;
        transform: none;
        background: #295fe6;
        color: #ffffff;
        border-radius: 999px;
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
        border: 2px solid #f8fbff;
        white-space: nowrap;
        z-index: 2;
      }
      .workhub-account-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        width: min(280px, calc(100vw - 30px));
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        box-shadow: 0 14px 30px rgba(20, 40, 77, 0.16);
        z-index: 40;
        overflow: hidden;
      }
      .workhub-account-menu-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px;
        border-bottom: 1px solid #e5eefc;
        background: #f8fbff;
      }
      .workhub-account-menu-identity {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .workhub-account-menu-identity strong {
        font-size: 0.8rem;
        color: #1b2f5b;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-account-menu-identity span {
        font-size: 0.7rem;
        color: #4f6694;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-account-menu-action {
        width: 100%;
        border: 0;
        border-top: 1px solid #edf3ff;
        background: #ffffff;
        color: #244374;
        text-align: left;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 400;
        padding: 9px 10px;
        cursor: pointer;
      }
      .workhub-account-menu-action:hover {
        background: #f5f9ff;
      }
      .workhub-notify-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        width: min(360px, calc(100vw - 30px));
        max-height: min(78vh, calc(100vh - 82px));
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        box-shadow: 0 14px 30px rgba(20, 40, 77, 0.16);
        z-index: 40;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .workhub-notify-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 10px;
        border-bottom: 1px solid #e5eefc;
        background: #f8fbff;
      }
      .workhub-notify-head strong {
        font-size: 0.8rem;
        color: #1b2f5b;
      }
      .workhub-notify-head span {
        font-size: 0.7rem;
        color: #4f6694;
      }
      .workhub-notify-list {
        max-height: 62vh;
        min-height: 0;
        flex: 1 1 auto;
        overflow-y: auto;
        overscroll-behavior: contain;
        display: grid;
        align-content: start;
        gap: 7px;
        padding: 8px;
      }
      .workhub-notify-item {
        width: 100%;
        text-align: left;
        border: 1px solid #dfe8f6;
        border-radius: 8px;
        background: #ffffff;
        padding: 7px 8px;
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        align-items: start;
        gap: 8px;
        font: inherit;
        font-weight: 400;
        cursor: pointer;
        transition: background 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease;
      }
      .workhub-notify-load-more {
        border: 1px solid #c8d8f2;
        background: #f7fbff;
        color: #1f447a;
        border-radius: 9px;
        padding: 8px 10px;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 600;
        cursor: pointer;
      }
      .workhub-notify-load-more:hover {
        background: #edf5ff;
        border-color: #b4c9eb;
      }
      .workhub-notify-avatar,
      .workhub-notify-avatar img,
      .workhub-notify-avatar span {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .workhub-notify-avatar {
        position: relative;
        flex: 0 0 28px;
      }
      .workhub-notify-avatar img {
        object-fit: cover;
      }
      .workhub-notify-avatar span {
        background: #eaf1fb;
        color: #29466e;
        font-size: 0.64rem;
        font-weight: 700;
      }
      .workhub-notify-item.is-unread .workhub-notify-avatar::after {
        content: '';
        position: absolute;
        right: 0;
        bottom: 0;
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #d99124;
        border: 1px solid #ffffff;
      }
      .workhub-notify-item-body {
        min-width: 0;
        display: grid;
        gap: 2px;
      }
      .workhub-notify-meta {
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: #6b7fa4;
        font-size: 0.66rem;
        line-height: 1;
      }
      .workhub-notify-sender {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #253b61;
        font-weight: 600;
      }
      .workhub-notify-item:hover {
        background: #f4f8ff;
        border-color: #c9d9ef;
        transition: none;
      }
      .workhub-notify-item.is-unread {
        background: #fffaf0;
        border-color: #efd9aa;
        box-shadow: inset 3px 0 0 #d99124;
      }
      .workhub-notify-message {
        min-width: 0;
        font-size: 0.73rem;
        color: #1f2937;
        line-height: 1.28;
        font-weight: 400;
      }
      .workhub-notify-empty {
        padding: 12px;
        font-size: 0.76rem;
        color: #5f749c;
      }
      .workhub-notify-preferences {
        border-top: 1px solid #d7e4ff;
        background: #f8fbff;
        padding: 10px 11px 12px;
        display: grid;
        gap: 9px;
      }
      .workhub-notify-pref-headline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-notify-pref-headline strong {
        font-size: 0.77rem;
        color: #1c315d;
      }
      .workhub-notify-pref-headline span {
        font-size: 0.68rem;
        color: #60759d;
      }
      .workhub-notify-pref-toggle {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        border: 1px solid #d9e5f8;
        border-radius: 10px;
        background: #ffffff;
        padding: 8px 9px;
        cursor: pointer;
      }
      .workhub-notify-pref-toggle.is-busy {
        opacity: 0.72;
      }
      .workhub-notify-pref-toggle input {
        margin: 2px 0 0;
      }
      .workhub-notify-pref-copy {
        display: grid;
        gap: 2px;
      }
      .workhub-notify-pref-copy strong {
        font-size: 0.75rem;
        color: #20375f;
      }
      .workhub-notify-pref-copy small {
        font-size: 0.68rem;
        line-height: 1.35;
        color: #61779f;
      }
      .workhub-notify-pref-note {
        font-size: 0.68rem;
        line-height: 1.4;
        color: #60759d;
      }
      .workhub-toolbar-select {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 126px;
        align-items: flex-start;
      }
      .workhub-toolbar-select span,
      label span {
        display: block;
        font-size: 0.7rem;
        color: #60708f;
        font-weight: 700;
        margin-bottom: 3px;
      }
      .workhub-user-pill {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 8px;
        border-radius: 11px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        box-shadow: 0 8px 18px rgba(49, 87, 163, 0.06);
      }
      .workhub-user-pill img,
      .workhub-member-main img {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        object-fit: cover;
      }
      .workhub-user-pill span,
      .workhub-member-avatar-fallback {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        font-weight: 800;
        font-size: 0.68rem;
        background: linear-gradient(135deg, #4f8cff, #7b61ff);
        color: #fff;
      }
      .workhub-user-pill strong {
        font-size: 0.8rem;
        line-height: 1.1;
      }
      .workhub-user-pill small {
        display: block;
        color: #5f6f91;
        text-transform: capitalize;
        font-size: 0.68rem;
        line-height: 1.1;
      }
      .workhub-panel,
      .workhub-center-card,
      .workhub-detail-card {
        background: #ffffff;
        border: 1px solid #dbe7ff;
        box-shadow: 0 10px 22px rgba(58, 92, 168, 0.05);
        border-radius: 10px;
      }
      .workhub-panel {
        padding: 10px;
        margin-bottom: 20px;
      }
      .workhub-panel-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        min-width: 0;
      }
      .workhub-panel-head.compact {
        margin-bottom: 6px;
      }
      .workhub-panel-head h2 {
        margin: 0;
        color: #17284d;
        font-size: 1.14rem;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }
      .workhub-panel-head-title {
        min-width: 0;
        overflow: hidden;
        flex: 1 1 0;
      }
      .workhub-panel-head-controls {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-collapse-toggle {
        width: 22px;
        height: 22px;
        border-radius: 7px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #29446f;
        font-size: 0.74rem;
        line-height: 1;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: box-shadow 0.08s ease, filter 0.08s ease;
      }
      .workhub-collapse-toggle:hover {
        box-shadow: 0 4px 10px rgba(35, 65, 120, 0.12);
        filter: brightness(0.98);
        transition: none;
      }
      .workhub-detail-card h3 {
        margin: 0 0 16px 0;
        color: #17305c;
        font-size: 0.74rem;
        font-weight: 500;
      }
      .workhub-task-group-head h3 {
        margin: 0;
        color: #17284d;
        font-size: 0.74rem;
        font-weight: 500;
      }
      .workhub-badge,
      .workhub-role-chip,
      .workhub-status-chip,
      .workhub-priority-pill {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px 5px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        white-space: nowrap;
      }
      .workhub-badge {
        background: #edf4ff;
        color: #2757c9;
      }
      .workhub-badge.is-danger,
      .status-suspended {
        background: #fff0f0;
        color: #d14343;
      }
      .status-approved {
        background: #ecfdf3;
        color: #1f9254;
      }
      .status-pending {
        background: #fff7e6;
        color: #b7791f;
      }
      .workhub-role-chip {
        background: #f2edff;
        color: #6650c8;
        text-transform: capitalize;
      }
      .priority-low {
        background: #ecfdf3;
        color: #1f9254;
      }
      .priority-medium {
        background: #edf4ff;
        color: #265bc7;
      }
      .priority-high {
        background: #fff7e8;
        color: #b7791f;
      }
      .priority-urgent {
        background: #fff0f0;
        color: #d14343;
      }
      .workhub-primary-btn,
      .workhub-ghost-btn,
      .workhub-tab {
        border: none;
        background: transparent;
        color: #647392;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 0.76rem;
        line-height: 1.1;
        font-weight: 600;
        cursor: pointer;
        min-height: 32px;
        transition: color 0.08s ease, background 0.08s ease, box-shadow 0.08s ease;
        position: relative;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      }
      .workhub-tab::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #295fe6 0%, #7b61ff 100%);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 1px;
      }
      .workhub-tab:hover {
        color: #295fe6;
        background: rgba(41, 95, 230, 0.04);
        transition: none;
      }
      .workhub-tab:hover::after {
        width: 80%;
      }
      .workhub-tab.is-active {
        color: #295fe6;
        background: linear-gradient(180deg, rgba(41, 95, 230, 0.08) 0%, rgba(41, 95, 230, 0.02) 100%);
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(41, 95, 230, 0.15);
      }
      .workhub-tab.is-active::after {
        width: 100%;
        height: 3px;
        box-shadow: 0 2px 8px rgba(41, 95, 230, 0.4);
      }
      .workhub-tab.workhub-top-nav-icon-btn {
        border: 1px solid #d8e6fb;
        background: #ffffff;
        color: #355487;
      }
      .workhub-tab.workhub-top-nav-icon-btn:hover {
        border-color: #b9cff5;
        background: #f8fbff;
      }
      .workhub-tab.workhub-top-nav-icon-btn.is-active {
        border-color: #87a9ff;
        background: #edf4ff;
        color: #295fe6;
      }
      .workhub-find-command-btn {
        border: 1px solid #dbe7ff;
        width: 32px;
        min-width: 32px;
        height: 30px;
        min-height: 30px;
        padding: 0;
      }
      .workhub-find-command-btn span[aria-hidden='true'] {
        font-size: 1.06rem;
        line-height: 1;
      }
      .workhub-find-command-shortcut {
        border: 1px solid #d8e4fa;
        border-radius: 6px;
        padding: 1px 5px;
        font-size: 0.66rem;
        font-weight: 700;
        color: #5d7298;
        background: #ffffff;
        line-height: 1.2;
      }
      .workhub-primary-mini,
      .workhub-ghost-mini,
      .workhub-secondary-link,
      .workhub-switcher-btn,
      .workhub-member-chip {
        font: inherit;
      }
      .workhub-primary-btn,
      .workhub-ghost-btn,
      .workhub-primary-mini,
      .workhub-ghost-mini,
      .workhub-secondary-link {
        border-radius: 9px;
        padding: 6px 9px;
        font-size: 0.82rem;
        line-height: 1.1;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        box-sizing: border-box;
        min-height: 28px;
        transition: transform 0.15s ease, opacity 0.2s ease, background 0.2s ease;
      }
      .workhub-primary-btn,
      .workhub-primary-mini {
        border: 0;
        background: linear-gradient(135deg, #4f8cff, #7b61ff);
        color: #fff;
      }
      .workhub-ghost-btn,
      .workhub-ghost-mini,
      .workhub-secondary-link {
        background: #ffffff;
        color: #29446f;
        border: 1px solid #d8e4fa;
      }
      .workhub-primary-mini,
      .workhub-ghost-mini {
        padding: 4px 7px;
        min-height: 24px;
        font-size: 0.74rem;
      }
      .workhub-primary-btn:hover,
      .workhub-ghost-btn:hover,
      .workhub-primary-mini:hover,
      .workhub-ghost-mini:hover,
      .workhub-secondary-link:hover {
        box-shadow: 0 4px 10px rgba(35, 65, 120, 0.12);
        filter: brightness(0.98);
      }
      .workhub-primary-btn:disabled,
      .workhub-ghost-btn:disabled,
      .workhub-primary-mini:disabled,
      .workhub-ghost-mini:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .workhub-shell-layout {
        display: grid;
        grid-template-columns: minmax(260px, 296px) 4px minmax(0, 1fr);
        gap: 0;
        align-items: stretch;
        margin-bottom: 0;
        flex: 1;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
      .workhub-shell-layout > .workhub-panel {
        margin-bottom: 0;
      }
      .workhub-shell-layout.sidebar-collapsed {
        grid-template-columns: 44px minmax(0, 1fr);
        column-gap: 10px;
      }
      .workhub-tree-sidebar {
        height: 100%;
        max-height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: visible;
        border: 1px solid #dde6f2;
        background: linear-gradient(180deg, #f9fbff 0%, #f4f7fb 100%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82), 0 1px 2px rgba(19, 38, 68, 0.04);
        padding-right: 0;
      }
      .workhub-panel.workhub-tree-sidebar {
        padding-right: 0;
      }
      .workhub-tree-sidebar > .workhub-panel-head,
      .workhub-tree-sidebar > .workhub-tree-actions {
        padding-right: 8px;
      }
      .workhub-tree-resize-handle {
        width: 4px;
        cursor: col-resize;
        background: transparent;
        flex-shrink: 0;
        margin: 0 -4px;
        padding: 0 4px;
        box-sizing: content-box;
        z-index: 10;
        position: relative;
        transition: background 0.15s;
      }
      .workhub-tree-resize-handle:hover,
      .workhub-tree-resize-handle:active {
        background: rgba(79, 116, 189, 0.25);
        border-radius: 2px;
      }
      .workhub-tree-sidebar.is-collapsed {
        padding: 6px 4px;
        overflow: hidden;
        border-radius: 10px;
      }
      .workhub-panel-head.is-collapsed-head {
        justify-content: center;
        align-items: center;
        margin-bottom: 0;
      }
      .workhub-sidebar-toggle {
        width: 20px;
        height: 20px;
        border-radius: 5px;
        border: 1px solid #dee4ec;
        background: #ffffff;
        color: #3d4a5e;
        font: inherit;
        font-size: 0.68rem;
        line-height: 1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-tree-actions + .workhub-tree-actions {
        margin-top: 8px;
      }
      .workhub-tree-actions .workhub-inline-row {
        width: 100%;
        padding: 6px;
        border: 1px solid #e2e8f2;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: none;
      }
      .workhub-sidebar-template-actions {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-sidebar-action-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
      }
      .workhub-sidebar-action-grid.is-single {
        grid-template-columns: 1fr;
      }
      .workhub-sidebar-action-btn {
        width: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        gap: 6px;
        border: 1px solid #d9e1ec;
        background: #ffffff;
        color: #22344e;
        border-radius: 8px;
        padding: 7px 8px;
        text-align: left;
        font: inherit;
        font-size: 0.76rem;
        font-weight: 600;
        letter-spacing: 0.004em;
        cursor: pointer;
        transition: border-color 0.08s ease, box-shadow 0.08s ease, background 0.08s ease;
      }
      .workhub-sidebar-action-btn-icon {
        flex: 0 0 auto;
        font-size: 0.86rem;
        line-height: 1;
      }
      .workhub-sidebar-action-btn:hover {
        border-color: #c5d0de;
        box-shadow: 0 2px 8px rgba(35, 50, 77, 0.08);
        background: #fafcff;
        transition: none;
      }
      .workhub-sidebar-action-btn.is-primary {
        background: linear-gradient(180deg, #f5f8ff 0%, #e9f0ff 100%);
        border-color: #c3d4f2;
        color: #1e3f75;
      }
      .workhub-sidebar-action-btn.is-primary:hover {
        border-color: #a8bee4;
        background: linear-gradient(180deg, #eef4ff 0%, #e0ebff 100%);
        transition: none;
      }
      .workhub-sidebar-action-btn.is-full {
        grid-column: 1 / -1;
      }
      .workhub-sidebar-action-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        box-shadow: none;
      }
      .workhub-tree-overview {
        width: 100%;
        min-width: 0;
        border: 0;
        background: linear-gradient(135deg, #4f8cff, #7b61ff);
        color: #ffffff;
        border-radius: 9px;
        padding: 7px 10px;
        text-align: left;
        font: inherit;
        font-size: 0.79rem;
        font-weight: 600;
        letter-spacing: 0.005em;
        cursor: pointer;
        transition: border-color 0.08s ease, box-shadow 0.08s ease, background 0.08s ease;
        box-shadow: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-overview:hover {
        box-shadow: 0 4px 10px rgba(35, 65, 120, 0.12);
        filter: brightness(0.98);
        transition: none;
      }
      .workhub-tree-overview.is-active {
        background: linear-gradient(135deg, #3f79f0, #6a4ff0);
        color: #ffffff;
        border-color: #2e63d1;
        box-shadow: 0 7px 16px rgba(35, 65, 120, 0.26), inset 0 0 0 1px rgba(255, 255, 255, 0.22);
      }
      .workhub-tree-overview-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .workhub-tree-overview-row .workhub-tree-overview {
        flex: 1;
      }
      .workhub-tree-overview-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }
      .workhub-tree-scroll {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        gap: 5px;
        overflow-y: auto;
        padding-right: 0;
        margin-top: 8px;
      }
      .workhub-tree-footer {
        margin-top: 8px;
        padding: 8px 0 0;
        border-top: 1px solid #e3ebf7;
        background: linear-gradient(180deg, rgba(246, 250, 255, 0) 0%, rgba(246, 250, 255, 0.96) 18%);
        flex: 0 0 auto;
      }
      .workhub-tree-chat-btn {
        width: 100%;
        border: 1px solid #c4d6f2;
        background: linear-gradient(180deg, #f5f9ff 0%, #e8f0ff 100%);
        color: #1d3e72;
        border-radius: 9px;
        min-height: 34px;
        padding: 0 10px;
        font: inherit;
        font-size: 0.76rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
      }
      .workhub-tree-chat-btn:hover {
        border-color: #aac3e7;
        background: linear-gradient(180deg, #edf4ff 0%, #e1ebff 100%);
      }
      .workhub-tree-chat-btn-icon {
        font-size: 0.84rem;
        line-height: 1;
      }
      .workhub-tree-group,
      .workhub-tree-group-body {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-tree-workspace-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .workhub-tree-workspace-group {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 4px 6px;
        border: 1px solid #e1e9f7;
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.78);
        transition: border-color 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
      }
      .workhub-tree-workspace-group:hover {
        background: #f3f7fc;
        border-color: #c8d8ef;
        box-shadow: inset 3px 0 0 #b8c8de;
      }
      .workhub-tree-workspace-group:hover .workhub-tree-workspace-caret {
        color: #55657b;
      }
      .workhub-tree-workspace-group:hover .workhub-tree-workspace-btn {
        color: #55657b;
      }
      .workhub-tree-workspace-group.is-active {
        border-color: #bfd4ff;
        box-shadow: inset 0 0 0 1px rgba(134, 170, 255, 0.22);
      }
      .workhub-tree-workspace-head {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .workhub-tree-workspace-btn {
        flex: 1;
        min-width: 0;
        width: 100%;
        border: none;
        background: transparent;
        color: #6d7a8f;
        padding: 6px 0;
        min-height: 32px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        text-align: left;
        font: inherit;
        font-size: 0.78rem;
        line-height: 1.1;
        cursor: pointer;
        border-radius: 8px;
        transition: background-color 0.12s ease, box-shadow 0.12s ease, color 0.12s ease;
      }
      .workhub-tree-workspace-btn:hover {
        color: #55657b;
      }
      .workhub-tree-workspace-group.is-active .workhub-tree-workspace-btn {
        color: #24426f;
      }
      .workhub-tree-workspace-label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        overflow: hidden;
        font-weight: 500;
        font-size: 0.78rem;
        color: inherit;
      }
      .workhub-tree-workspace-label > span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-tree-workspace-caret {
        color: #73839b;
        flex: 0 0 auto;
        font-size: 0.92rem;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transform: rotate(0deg);
        transition: transform 0.18s ease, color 0.12s ease;
      }
      .workhub-tree-workspace-caret.is-expanded {
        transform: rotate(90deg);
      }
      .workhub-tree-workspace-btn:hover .workhub-tree-workspace-caret {
        color: #55657b;
      }
      .workhub-tree-workspace-group.is-active .workhub-tree-workspace-caret {
        color: #476897;
      }
      .workhub-tree-workspace-summary {
        font-size: 0.58rem;
        font-weight: 600;
        color: #7184a6;
        flex: 0 0 auto;
      }
      .workhub-tree-workspace-expand-wrap {
        display: grid;
        grid-template-rows: 0fr;
      }
      .workhub-tree-workspace-expand-wrap.is-open {
        grid-template-rows: 1fr;
      }
      .workhub-tree-workspace-expand-inner {
        overflow: hidden;
        min-height: 0;
      }
      .workhub-tree-workspace-body {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding-top: 1px;
      }
      .workhub-tree-workspace-overview-btn {
        flex: 0 0 auto;
        width: 28px;
        height: 28px;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #f3f6fa;
        color: #6d7d96;
        cursor: pointer;
        box-shadow: none;
        transition: border-color 0.08s ease, box-shadow 0.08s ease, background 0.08s ease, color 0.08s ease;
      }
      .workhub-tree-workspace-overview-btn:hover {
        border-color: #ccd6e3;
        background: #edf2f7;
        color: #55657d;
        box-shadow: 0 2px 6px rgba(35, 65, 120, 0.08);
        transition: none;
      }
      .workhub-tree-workspace-overview-btn.is-active {
        border-color: #c4cfdd;
        background: #e7edf4;
        color: #44546c;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
      }
      .workhub-tree-workspace-overview-btn span {
        font-size: 0.9rem;
        line-height: 1;
      }
      .workhub-tree-docs-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-tree-doc-item {
        width: 100%;
        border: 1px solid #e2e8f2;
        background: #fcfdff;
        color: #22324a;
        border-radius: 9px;
        padding: 8px 11px;
        min-height: 40px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 3px;
        text-align: left;
        font: inherit;
        cursor: pointer;
        box-shadow: none;
        transition: background-color 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease;
      }
      .workhub-tree-doc-item:hover {
        background: #f0f5fc;
        border-color: #cad5e3;
        box-shadow: inset 3px 0 0 #8aacd8;
        transition: none;
      }
      .workhub-tree-doc-item.is-active {
        background: linear-gradient(90deg, #e4efff 0%, #f3f8ff 100%);
        border-color: #7ea2da;
        box-shadow: inset 4px 0 0 #2f63c8, 0 0 0 1px rgba(47, 99, 200, 0.2);
      }
      .workhub-tree-doc-item-title {
        width: 100%;
        font-size: 0.73rem;
        line-height: 1.2;
        font-weight: 600;
        color: inherit;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-doc-item-meta {
        width: 100%;
        font-size: 0.65rem;
        line-height: 1.2;
        color: #6a7b92;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-doc-item.is-public-source {
        border-color: #ffd2a2;
        background: #fff7ec;
      }
      .workhub-tree-doc-item.is-public-source .workhub-tree-doc-item-title {
        color: #9a4a00;
        font-weight: 700;
      }
      .workhub-tree-doc-item.is-public-source .workhub-tree-doc-item-meta {
        color: #b0692b;
      }
      .workhub-tree-doc-sublist {
        display: flex;
        flex-direction: column;
        gap: 2px;
        border-left: 2px solid #dce8f7;
        padding-left: 8px;
        margin-top: 2px;
        margin-bottom: 2px;
      }
      .workhub-tree-subitem-drag-handle {
        border: 1px solid transparent;
        background: transparent;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        flex: 0 0 auto;
        margin-right: 4px;
        color: #7890b1;
        font-size: 0.58rem;
        letter-spacing: -0.08em;
        opacity: 0.78;
        vertical-align: middle;
        border-radius: 4px;
        cursor: grab;
        padding: 0;
      }
      .workhub-tree-subitem-drag-handle:hover {
        border-color: #ccd9ec;
        background: #f0f5fd;
        opacity: 1;
      }
      .workhub-tree-subitem-drag-handle:active {
        cursor: grabbing;
      }
      .workhub-tree-doc-subitem {
        width: 100%;
        border: 1px solid transparent;
        background: transparent;
        color: #2a3d5c;
        border-radius: 6px;
        padding: 3px 6px;
        text-align: left;
        font: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        min-height: 24px;
        transition: background-color 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease;
        box-shadow: none;
      }
      .workhub-tree-doc-subitem:hover {
        background: #edf3fb;
        border-color: transparent;
        box-shadow: inset 3px 0 0 #8aacd8;
        transition: none;
      }
      .workhub-tree-doc-subitem.is-active {
        background: #eef3fb;
        border-color: transparent;
        box-shadow: inset 2px 0 0 #4f74bd;
      }
      .workhub-tree-doc-subitem.is-linked-highlight {
        background: #e9f2ff;
        border-color: #8fb2e6;
        box-shadow: inset 3px 0 0 #2f65c8;
      }
      .workhub-tree-doc-subitem.is-drop-target {
        background: #e8f2ff;
        border-color: #7da7df;
        box-shadow: inset 3px 0 0 #2f65c8;
      }
      .workhub-tree-doc-subitem-title {
        display: inline-flex;
        align-items: center;
        flex: 1 1 0;
        min-width: 0;
        font-size: 0.69rem;
        line-height: 1.2;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-subitem-access-lock {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 12px;
        height: 12px;
        margin-right: 2px;
        color: #4b5563;
        flex: 0 0 auto;
      }
      .workhub-tree-subitem-access-lock svg {
        width: 11px;
        height: 11px;
        display: block;
        fill: currentColor;
      }
      .workhub-tree-subitem-actions {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex: 0 0 auto;
      }
      .workhub-tree-subitem-gear {
        border: 1px solid #d9e4f5;
        background: #ffffff;
        color: #2b456f;
        border-radius: 4px;
        width: 18px;
        height: 18px;
        font: inherit;
        font-size: 0.62rem;
        line-height: 1;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .workhub-tree-subitem-gear:hover {
        background: #f6faff;
        border-color: #c4d5ef;
      }
      .workhub-tree-inline-rename-input {
        width: min(280px, 100%);
        max-width: 100%;
        border: 1px solid #8aaee0;
        border-radius: 5px;
        background: #ffffff;
        color: #1f3150;
        font: inherit;
        font-size: 0.69rem;
        line-height: 1.2;
        padding: 2px 6px;
        outline: none;
      }
      .workhub-tree-inline-rename-input:focus {
        border-color: #4f78be;
        box-shadow: 0 0 0 2px rgba(78, 121, 191, 0.15);
      }
      .workhub-tree-moodboard-variant-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: 6px;
        border-radius: 999px;
        border: 1px solid #c9d7ea;
        background: #eef4fd;
        color: #38567c;
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1;
        padding: 2px 6px;
        vertical-align: middle;
      }
      .workhub-tree-moodboard-variant-badge.is-flow {
        border-color: #b8d7f2;
        background: #e8f5ff;
        color: #0c547d;
      }
      .workhub-tree-moodboard-variant-badge.is-proscons {
        border-color: #d8cdb1;
        background: #f8f3e8;
        color: #6b5322;
      }
      .workhub-tree-doc-subitem.is-public-source {
        border-color: #ffd2a2;
        background: #fff7ec;
      }
      .workhub-tree-doc-subitem.is-public-source .workhub-tree-doc-subitem-title {
        color: #9a4a00;
        font-weight: 700;
      }
      .workhub-tree-doc-lock-badge {
        flex: 0 0 auto;
        font-size: 0.6rem;
        line-height: 1;
        opacity: 0.75;
      }
      .workhub-tree-group-toggle {
        width: 100%;
        border: 1px solid #e1e8f2;
        background: #fcfdff;
        color: #2b3a50;
        border-radius: 9px;
        padding: 8px 11px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
        font: inherit;
        text-align: left;
        box-shadow: none;
      }
      .workhub-tree-group-toggle:hover {
        background: #f7fafd;
        border-color: #cad5e3;
      }
      .workhub-tree-group-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .workhub-tree-group-caret {
        font-size: 0.92rem;
        color: #496183;
      }
      .workhub-tree-group-toggle strong {
        font-size: 0.82rem;
        color: #24344b;
      }
      .workhub-tree-group-toggle small {
        font-size: 0.68rem;
        color: #6f7f96;
      }
      .workhub-tree-node-wrap,
      .workhub-tree-children {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .workhub-tree-node-wrap.is-root {
        padding: 0;
      }
      .workhub-tree-node-wrap.is-root + .workhub-tree-node-wrap.is-root {
        border-top: 0;
        margin-top: 0;
        padding-top: 0;
      }
      .workhub-tree-children {
        gap: 0;
      }
      .workhub-tree-expand-wrap {
        display: grid;
        grid-template-rows: 0fr;
      }
      .workhub-tree-expand-wrap.is-open {
        grid-template-rows: 1fr;
      }
      .workhub-tree-expand-inner {
        overflow: hidden;
        min-height: 0;
      }
      .workhub-tree-node-wrap.is-nested {
        gap: 0;
      }
      .workhub-tree-node-list {
        position: relative;
        min-height: 26px;
      }
      .workhub-tree-node {
        display: grid;
        grid-template-columns: auto 18px minmax(0, 1fr) auto;
        align-items: center;
        gap: 6px;
        padding: 5px 7px;
        min-height: 34px;
        border-radius: 7px;
        border: 1px solid transparent;
        background: transparent;
        box-shadow: none;
        transition: background-color 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease;
        cursor: pointer;
      }
      .workhub-tree-node-wrap.is-root > .workhub-tree-node {
        padding: 4px 7px;
        min-height: 32px;
      }
      .workhub-tree-node.is-linked-highlight {
        background: #e9f2ff;
        border-color: #8fb2e6;
        box-shadow: inset 3px 0 0 #2f65c8;
      }
      .workhub-tree-drag-handle {
        border: 1px solid transparent;
        background: transparent;
        color: #7d8fab;
        border-radius: 6px;
        font-size: 0.74rem;
        line-height: 1;
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        padding: 0;
      }
      .workhub-tree-drag-handle:hover {
        border-color: #ccd9ec;
        background: #f0f5fd;
        color: #5b7192;
      }
      .workhub-tree-drag-handle:active {
        cursor: grabbing;
      }
      .workhub-tree-leading-icons {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .workhub-tree-restricted-lock {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        line-height: 1;
        color: #4b5563;
        flex-shrink: 0;
      }
      .workhub-tree-restricted-lock svg {
        width: 12px;
        height: 12px;
        display: block;
        fill: currentColor;
      }
      .workhub-tree-root-dropzone {
        border: 1px dashed #c5d8f1;
        border-radius: 8px;
        background: #f8fbff;
        color: #63799c;
        font-size: 0.68rem;
        padding: 5px 8px;
        margin-bottom: 6px;
      }
      .workhub-tree-root-dropzone.is-drop-target {
        border-color: #3f71bf;
        background: #e9f2ff;
        color: #1d4b90;
      }
      .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node,
      .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node,
      .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node,
      .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node {
        background: transparent;
      }
      .workhub-tree-node:hover {
        background: #edf3fb;
        border-color: transparent;
        box-shadow: inset 3px 0 0 #8aacd8;
        transition: none;
      }
      .workhub-tree-node:hover .workhub-tree-node-title {
        color: #1f3451;
      }
      .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node.is-active {
        background: #eef3fb;
        border-color: transparent;
        box-shadow: inset 3px 0 0 #4f74bd;
      }
      .workhub-tree-node.is-drop-target {
        background: #e8f2ff;
        border-color: #7da7df;
        box-shadow: inset 3px 0 0 #2f65c8;
      }
      .workhub-tree-item-context-menu {
        position: fixed;
        z-index: 2200;
        min-width: 180px;
        border: 1px solid #cad7ea;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 12px 28px rgba(25, 46, 82, 0.22);
        padding: 4px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .workhub-tree-item-context-menu-title {
        padding: 4px 8px 6px;
        font-size: 0.67rem;
        font-weight: 700;
        color: #516a90;
        border-bottom: 1px solid #e3ebf6;
        margin-bottom: 2px;
      }
      .workhub-tree-item-context-menu-separator {
        height: 1px;
        background: #e3ebf6;
        margin: 2px 4px;
      }
      .workhub-tree-item-context-menu-btn {
        width: 100%;
        border: none;
        background: transparent;
        color: #253a59;
        font: inherit;
        font-size: 0.74rem;
        text-align: left;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;
      }
      .workhub-tree-item-context-menu-btn:hover {
        background: #edf4ff;
        color: #183d74;
      }
      .workhub-tree-item-context-menu-btn.is-danger {
        color: #8a1f21;
      }
      .workhub-tree-item-context-menu-btn.is-danger:hover {
        background: #fdeeee;
        color: #7b1618;
      }
      .workhub-project-action-context-menu {
        min-width: 244px;
      }
      .workhub-tree-item-context-submenu-wrap {
        position: relative;
      }
      .workhub-tree-item-context-submenu-wrap::after {
        content: '';
        position: absolute;
        top: 0;
        left: 100%;
        width: 10px;
        height: 100%;
      }
      .workhub-tree-item-context-submenu-wrap.opens-left::after {
        left: auto;
        right: 100%;
      }
      .workhub-tree-item-context-submenu {
        position: absolute;
        left: calc(100% + 6px);
        top: 0;
        min-width: 230px;
        border: 1px solid #cad7ea;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 12px 28px rgba(25, 46, 82, 0.2);
        padding: 4px;
        display: none;
        flex-direction: column;
        gap: 2px;
        z-index: 2201;
      }
      .workhub-tree-item-context-submenu-wrap:hover .workhub-tree-item-context-submenu,
      .workhub-tree-item-context-submenu-wrap:focus-within .workhub-tree-item-context-submenu {
        display: flex;
      }
      .workhub-tree-item-context-submenu-wrap.opens-left .workhub-tree-item-context-submenu {
        left: auto;
        right: calc(100% + 6px);
      }
      .workhub-tree-toggle {
        width: 17px;
        height: 17px;
        border: 1px solid #e1e8f2;
        border-radius: 5px;
        background: #ffffff;
        color: #566a88;
        font: inherit;
        font-size: 0.82rem;
        cursor: pointer;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: none;
        transition: border-color 0.08s ease, background 0.08s ease, box-shadow 0.08s ease;
      }
      .workhub-tree-toggle:hover {
        border-color: #cad5e3;
        background: #f8fbff;
        box-shadow: 0 1px 4px rgba(33, 47, 75, 0.05);
        transition: none;
      }
      .workhub-tree-toggle-icon {
        width: 9px;
        height: 9px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transform: rotate(0deg);
        transition: transform 0.18s ease;
      }
      .workhub-tree-toggle-icon.is-expanded {
        transform: rotate(90deg);
      }
      .workhub-tree-leaf-spacer {
        display: inline-block;
        width: 17px;
        height: 17px;
        flex-shrink: 0;
      }
      .workhub-tree-toggle-icon svg {
        width: 100%;
        height: 100%;
      }
      .workhub-tree-toggle-icon path {
        fill: none;
        stroke: #5f728f;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .workhub-tree-leaf-indicator {
        width: auto;
        height: auto;
        border-radius: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.62rem;
        border: 0;
        background: transparent;
        color: #6e829f;
        padding: 0;
        box-shadow: none;
      }
      .workhub-tree-leaf-indicator.is-root-leaf {
        padding: 0;
        font-size: 0.82rem;
        color: #6e829f;
      }
      .workhub-tree-node-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        overflow: hidden;
        border: 0;
        cursor: pointer;
        text-align: left;
        flex: 1 1 auto;
      }
      .workhub-tree-node-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1 1 auto;
        overflow: hidden;
      }
      .workhub-tree-node-title {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        flex: 1 1 auto;
        min-width: 0;
        font-size: 0.74rem;
        line-height: 1.2;
        color: #22324a;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-node-intent-icon {
        flex: 0 0 auto;
        font-size: 0.78rem;
        line-height: 1;
        opacity: 0.95;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 1px solid #d7e4fa;
        background: #f7fbff;
      }
      .workhub-tree-node-intent-icon.is-project-kind {
        border-color: #b8cdf7;
        background: #eaf2ff;
      }
      .workhub-tree-node-intent-icon.is-folder-kind {
        border-color: #ead4b4;
        background: #fff6e8;
      }
      .workhub-tree-node-title-text {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .workhub-tree-node-comment-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 1px 6px;
        border-radius: 999px;
        border: 1px solid #f0bcc4;
        background: #fff3f6;
        color: #b1384f;
        font-size: 0.58rem;
        font-weight: 700;
        line-height: 1;
        flex: 0 0 auto;
      }
      .workhub-tree-node-meta {
        display: inline-flex;
        align-items: center;
        gap: 0;
        flex: 1 1 auto;
        min-width: 0;
        max-width: 100%;
        color: #6a7b92;
        font-size: 0.56rem;
        line-height: 1.1;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-node-meta-bracket {
        flex: 0 0 auto;
      }
      .workhub-tree-node-meta-primary {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-node-meta-separator {
        flex: 0 0 auto;
        margin: 0 4px;
        opacity: 0.82;
      }
      .workhub-tree-node-meta-time {
        flex: 0 0 auto;
        font-weight: 700;
      }
      .workhub-tree-node-progress {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.56rem;
        line-height: 1;
        color: #5d6f8f;
      }
      .workhub-tree-node-progress-track {
        width: 38px;
        height: 5px;
        border-radius: 999px;
        background: #e4ecfb;
        overflow: hidden;
        display: inline-flex;
      }
      .workhub-tree-node-progress-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #2d6ee8 0%, #53b77c 100%);
      }
      .workhub-tree-node-progress-label {
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .workhub-tree-node-meta.is-near-submission {
        color: #b4232f;
        font-weight: 800;
      }
      .workhub-tree-node-meta.is-overdue {
        color: #a01822;
      }
      .workhub-tree-node-meta.is-submitted-status {
        color: #5a8fa8;
      }
      .workhub-tree-node.is-active .workhub-tree-node-title {
        color: #0f2f60;
        font-weight: 700;
      }
      .workhub-tree-node.is-active .workhub-tree-node-meta {
        color: #33598f;
      }
      .workhub-tree-node.is-active .workhub-tree-node-meta.is-near-submission {
        color: #b4232f;
      }
      .workhub-tree-node.is-active .workhub-tree-node-meta.is-overdue {
        color: #a01822;
      }
      .workhub-tree-node.is-active .workhub-tree-node-progress {
        color: #3c5a8a;
      }
      .workhub-tree-node.is-active .workhub-tree-node-progress-track {
        background: #d6e2f8;
      }
      .workhub-tree-node-actions {
        display: flex;
        gap: 5px;
        align-items: center;
        flex-shrink: 0;
        overflow: hidden;
        max-width: 60px;
        opacity: 1;
        visibility: visible;
        transition: max-width 0.15s ease, opacity 0.14s ease, visibility 0s linear 0s;
      }
      @media (hover: hover) and (pointer: fine) {
        .workhub-tree-node .workhub-tree-node-actions {
          max-width: 0;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          gap: 0;
          transition: max-width 0.15s ease, opacity 0.14s ease, gap 0.15s ease, visibility 0s linear 0.14s;
        }
        .workhub-tree-node:hover .workhub-tree-node-actions,
        .workhub-tree-node:focus-within .workhub-tree-node-actions {
          max-width: 60px;
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          gap: 5px;
          transition: max-width 0.15s ease, opacity 0.14s ease, gap 0.15s ease, visibility 0s linear 0s;
        }
      }
      .workhub-tree-node-wrap.is-nested > .workhub-tree-node {
        border-radius: 0;
        padding: 4px 7px;
        min-height: 28px;
        border: 0;
        border-top: 1px solid #e8eef6;
        box-shadow: none;
      }
      .workhub-tree-node-wrap.is-nested:first-child > .workhub-tree-node {
        border-top: 0;
      }
      .workhub-tree-node-wrap.is-nested > .workhub-tree-node:hover {
        background: #edf3fb;
        box-shadow: inset 3px 0 0 #8aacd8;
        transition: none;
      }
      .workhub-tree-node-wrap.is-nested > .workhub-tree-node.is-active {
        border: 0;
        box-shadow: inset 2px 0 0 #4f74bd;
        background: #e4ebf8;
      }
      .workhub-tree-node-wrap.is-nested .workhub-plus-btn,
      .workhub-tree-node-wrap.is-nested .workhub-gear-btn {
        border: 0;
        border-radius: 0;
      }
      .workhub-tree-node .workhub-plus-btn,
      .workhub-tree-node .workhub-gear-btn,
      .workhub-tree-actions .workhub-plus-btn,
      .workhub-tree-actions .workhub-gear-btn {
        border-radius: 4px;
        border-color: #dfe5ee;
        color: #2f3e54;
        background: #ffffff;
      }
      .workhub-tree-node .workhub-plus-btn,
      .workhub-tree-node .workhub-gear-btn {
        width: 20px;
        height: 22px;
        font-size: 0.78rem;
      }
      .workhub-tree-node .workhub-plus-btn:hover,
      .workhub-tree-node .workhub-gear-btn:hover,
      .workhub-tree-actions .workhub-plus-btn:hover,
      .workhub-tree-actions .workhub-gear-btn:hover {
        background: #f6f9fd;
        border-color: #c3cedd;
        transition: none;
      }
      .workhub-plus-btn {
        width: 24px;
        height: 28px;
        border-radius: 4px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #111827;
        font: inherit;
        font-size: 0.96rem;
        font-weight: 800;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.08s ease, border-color 0.08s ease;
      }
      .workhub-plus-btn:hover {
        background: #f7faff;
        border-color: #c8dbff;
        transition: none;
      }
      .workhub-gear-btn {
        border-radius: 4px;
        font: inherit;
        font-size: 0.74rem;
        line-height: 1;
        cursor: pointer;
        width: 24px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }
      .workhub-gear-btn {
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #29446f;
        padding: 0;
        text-align: center;
      }
      .workhub-gear-menu {
        position: absolute;
        left: 0;
        top: calc(100% + 4px);
        min-width: 170px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 8px;
        box-shadow: 0 6px 16px rgba(20, 40, 77, 0.12);
        z-index: 200;
        overflow: hidden;
        contain: layout paint;
        will-change: transform;
        transform: translateZ(0);
        animation: workhubMenuIn 0.07s ease;
      }
      .workhub-mobile-workspace-picker-actions .workhub-gear-menu {
        left: auto;
        right: 0;
        max-width: min(220px, calc(100vw - 32px));
      }
      .workhub-gear-menu-item {
        display: block;
        width: 100%;
        border: 0;
        border-top: 1px solid #edf3ff;
        background: #ffffff;
        color: #244374;
        text-align: left;
        font: inherit;
        font-size: 0.78rem;
        padding: 9px 12px;
        cursor: pointer;
        white-space: nowrap;
      }
      .workhub-gear-menu-item:first-child { border-top: 0; }
      .workhub-gear-menu-item:hover { background: #f5f9ff; }
      .workhub-danger-btn {
        border: 1px solid #f3c5c5;
        background: #fff5f5;
        color: #c23d3d;
        border-radius: 8px;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1.1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: auto;
        height: auto;
        min-height: 32px;
        padding: 7px 12px;
        box-sizing: border-box;
        transition: transform 0.14s ease, box-shadow 0.08s ease, background 0.08s ease, border-color 0.08s ease;
      }
      .workhub-danger-btn:hover:not(:disabled) {
        background: #ffeef0;
        border-color: #e7a7ac;
        box-shadow: 0 6px 14px rgba(165, 41, 58, 0.16);
        transform: translateY(-1px);
        transition: transform 0.14s ease;
      }
      .workhub-danger-btn:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 2px 6px rgba(165, 41, 58, 0.18);
      }
      .workhub-danger-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .workhub-project-settings-footer,
      .workhub-project-settings-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .workhub-project-settings-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .workhub-project-settings-color-row {
        align-items: flex-start;
      }
      .workhub-modal.workhub-project-settings-modal {
        width: min(780px, calc(100vw - 24px));
        max-height: min(780px, calc(100dvh - 16px));
        overflow: hidden;
        padding: 0;
        display: flex;
        flex-direction: column;
        background: #ffffff;
      }
      .workhub-project-settings-head {
        position: sticky;
        top: 0;
        z-index: 2;
        margin-bottom: 0;
        padding: 26px 28px 10px;
        border-bottom: 1px solid #eef3fb;
        background: #ffffff;
        flex-shrink: 0;
      }
      .workhub-modal.workhub-project-settings-modal .workhub-project-settings-head h2 {
        margin: 0;
        font-size: 1.38rem;
        line-height: 1.1;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .workhub-psettings-version {
        display: block;
        font-size: 0.72rem;
        color: #9aa8bb;
        margin-top: 2px;
        letter-spacing: 0.01em;
      }
      .workhub-project-settings-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        min-height: 0;
        flex: 1;
        padding: 0 28px 12px;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
      .workhub-project-settings-body button {
        margin-top: 0;
      }
      .workhub-project-settings-main {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-project-settings-section-title {
        margin: 0;
        font-size: 1.02rem;
        font-weight: 700;
        color: #111827;
      }
      .workhub-project-settings-grid-preview {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 10px 12px;
      }
      .workhub-project-settings-grid-preview > label,
      .workhub-project-settings-grid-preview > .workhub-project-settings-client-field,
      .workhub-project-settings-access-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-project-settings-client-field {
        position: relative;
        z-index: 2;
      }
      .workhub-project-settings-client-field > label {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-project-settings-client-field .workhub-client-quick-add {
        position: relative;
        z-index: 3;
        margin-top: 2px;
        flex-wrap: nowrap;
      }
      .workhub-project-settings-client-field .workhub-client-quick-add input {
        min-width: 0;
        flex: 1;
      }
      .workhub-project-settings-client-field .workhub-client-quick-add button {
        flex: 0 0 auto;
      }
      .workhub-col-span-3 {
        grid-column: span 3;
      }
      .workhub-col-span-4 {
        grid-column: span 4;
      }
      .workhub-col-span-5 {
        grid-column: span 5;
      }
      .workhub-col-span-6 {
        grid-column: span 6;
      }
      .workhub-project-settings-access-options {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 34px;
        padding-top: 2px;
      }
      .workhub-project-settings-hidden-toggle-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-top: 2px;
      }
      .workhub-project-settings-hidden-toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      .workhub-project-settings-hidden-toggle input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: #2f5db6;
        cursor: pointer;
      }
      .workhub-project-settings-hidden-toggle input[type="checkbox"]:disabled {
        cursor: not-allowed;
      }
      .workhub-project-settings-hidden-toggle-help {
        font-size: 0.7rem;
        color: #5d7397;
        line-height: 1.35;
      }
      .workhub-project-settings-hidden-toggle-note {
        font-size: 0.68rem;
        color: #9a6d1b;
        line-height: 1.3;
        font-weight: 600;
      }
      .workhub-project-settings-member-picker {
        margin-top: 2px;
      }
      .workhub-project-settings-member-picker-note {
        font-size: 0.7rem;
        color: #6f809b;
      }
      .workhub-project-settings-divider {
        border-top: 1px solid #e6eaef;
        margin: 3px 0 0;
      }
      .workhub-project-settings-bottom-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 300px;
        gap: 22px;
        align-items: start;
      }
      .workhub-project-settings-description-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-project-settings-description-field textarea {
        min-height: 98px;
      }
      .workhub-auto-grow-textarea {
        resize: vertical;
        overflow-y: auto;
      }
      .workhub-detected-links {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 2px;
      }
      .workhub-detected-link {
        max-width: 100%;
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        border: 1px solid #d5e4ff;
        border-radius: 999px;
        background: #f5f9ff;
        color: #2f5ca3;
        font-size: 0.67rem;
        text-decoration: none;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .workhub-detected-link:hover {
        border-color: #aac3ef;
        background: #eaf2ff;
      }
      .workhub-project-settings-color-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-status-options {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 6px;
      }
      .workhub-status-option {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        padding: 0 12px;
        border: 1px solid #d9e4f7;
        border-radius: 999px;
        background: #ffffff;
        color: #28456f;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 700;
        cursor: pointer;
        transition: border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
      }
      .workhub-status-option:hover {
        border-color: #aac1ea;
        background: #f8fbff;
      }
      .workhub-status-option.active {
        border-color: #2b5ea7;
        background: #eef4ff;
        box-shadow: 0 0 0 1px rgba(43, 94, 167, 0.12);
      }
      .workhub-status-option-dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        flex: 0 0 auto;
        box-shadow: inset 0 0 0 1px rgba(31, 50, 94, 0.14);
      }
      .workhub-status-option-label {
        line-height: 1.1;
      }
      .workhub-project-settings-suggestion {
        margin-top: 6px;
        border: 1px solid #dce7fa;
        border-radius: 10px;
        background: #f8fbff;
        padding: 10px 12px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .workhub-project-settings-suggestion.is-applied {
        background: #f4fbf6;
        border-color: #d6eadb;
      }
      .workhub-project-settings-suggestion-copy {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }
      .workhub-project-settings-suggestion-copy strong {
        font-size: 0.74rem;
        color: #1f3f70;
      }
      .workhub-project-settings-suggestion-copy span {
        font-size: 0.69rem;
        color: #5f749a;
        line-height: 1.35;
      }
      .workhub-project-settings-suggestion-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }
      .workhub-project-settings-advanced {
        border: 1px solid #e6ebf5;
        border-radius: 8px;
        background: #fbfdff;
      }
      .workhub-project-settings-advanced > summary {
        list-style: none;
        cursor: pointer;
        padding: 7px 10px;
        font-size: 0.76rem;
        font-weight: 700;
        color: #516382;
      }
      .workhub-field-grid.two.compact.workhub-project-settings-money-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .workhub-field-grid.two.compact.workhub-project-settings-money-grid > label {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-project-settings-link-field {
        min-width: 0;
      }
      .workhub-project-settings-link-row,
      .workhub-project-settings-link-editor-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .workhub-project-settings-link-editor-row input {
        flex: 1;
        min-width: 0;
      }
      .workhub-project-settings-link-value {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #24508d;
        text-decoration: none;
        border: 1px solid #dce7fa;
        border-radius: 8px;
        background: #ffffff;
        padding: 8px 10px;
        font-size: 0.74rem;
        line-height: 1.2;
      }
      .workhub-project-settings-link-value:hover {
        text-decoration: underline;
        background: #f8fbff;
      }
      .workhub-project-settings-link-edit-btn {
        flex: 0 0 auto;
        min-width: 28px;
        padding-left: 7px;
        padding-right: 7px;
      }
      .workhub-project-settings-delete-action {
        flex: 1;
        min-width: 0;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .workhub-project-settings-delete-btn {
        width: 32px;
        min-width: 32px;
        height: 32px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 9px;
      }
      .workhub-project-settings-delete-note {
        font-size: 0.75rem;
        line-height: 1.2;
        color: #6d7d97;
      }
      .workhub-psettings-left {
        flex: 0 0 64%;
        min-width: 0;
        padding: 8px 8px 8px 12px;
        border-right: 1px solid #e4ecfb;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-psettings-right {
        flex: 1 1 0;
        min-width: 0;
        padding: 8px 12px 8px 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-settings-panel {
        border: 1px solid #e1ebfb;
        border-radius: 8px;
        background: #ffffff;
        overflow: hidden;
      }
      .workhub-settings-panel-head {
        padding: 6px 9px;
        font-size: 0.78rem;
        font-weight: 700;
        color: #35527f;
        border-bottom: 1px solid #e7eefc;
        background: #ffffff;
      }
      .workhub-project-settings-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .workhub-settings-group {
        border: 1px solid #e1ebfb;
        border-radius: 10px;
        background: #fbfdff;
        overflow: hidden;
      }
      .workhub-settings-group > summary {
        list-style: none;
        cursor: pointer;
        padding: 8px 10px;
        font-size: 0.78rem;
        font-weight: 700;
        color: #35527f;
        border-bottom: 1px solid #e7eefc;
        background: #f4f8ff;
      }
      .workhub-settings-group-body {
        padding: 6px 9px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-project-settings-sticky-actions {
        position: sticky;
        bottom: 0;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 28px 20px;
        border-top: 1px solid #e6eaef;
        background: #ffffff;
        box-shadow: 0 -6px 16px rgba(20, 40, 77, 0.06);
        flex-shrink: 0;
      }
      .workhub-psettings-footer-btns {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
        margin-left: auto;
        padding-top: 2px;
      }
      .workhub-ws-access-level-toggle {
        margin-left: 4px;
      }
      .workhub-project-settings-footer {
        justify-content: space-between;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #e7eefb;
      }
      .workhub-modal-backdrop.transparent {
        background: rgba(10, 18, 36, 0.3);
      }
      .workhub-action-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) translateZ(0);
        z-index: 3005;
        width: 440px;
        max-width: 96vw;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 16px;
        padding: 18px;
        box-shadow: 0 8px 28px rgba(22, 36, 68, 0.16);
        contain: layout paint;
        will-change: transform;
        animation: workhubDialogIn 0.08s ease;
      }
      .workhub-action-dialog-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        font-size: 0.82rem;
        font-weight: 600;
        color: #1c365f;
      }
      .workhub-action-dialog-context {
        display: inline-block;
        margin-left: 7px;
        padding: 2px 8px;
        background: #eef4ff;
        border: 1px solid #c5d8f9;
        border-radius: 20px;
        font-size: 0.72rem;
        font-weight: 600;
        color: #2a5aac;
        vertical-align: middle;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-action-dialog-close {
        border: 0;
        background: transparent;
        cursor: pointer;
        color: #7a8faa;
        font-size: 1rem;
        line-height: 1;
        padding: 2px 6px;
        border-radius: 6px;
      }
      .workhub-action-dialog-close:hover {
        background: #f0f4fa;
        color: #1c365f;
      }
      .workhub-action-dialog-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .workhub-action-dialog-divider {
        grid-column: 1 / -1;
        height: 1px;
        background: #e4ecf8;
        margin: 2px 0;
      }
      .workhub-action-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 14px 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        border: 1px solid #e1e8f2;
        border-radius: 12px;
        background: #f8fbff;
        cursor: pointer;
        border: 1px solid #d7e4ff;
        border-top: 1px solid #d7e4ff;
        border-radius: 10px;
      }
      .workhub-action-card:hover {
        background: #edf4ff;
        border-color: #b8cdf7;
      }
      .workhub-action-card:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        line-height: 1;
        color: #2a4568;
      }
      .workhub-action-card.is-record-action .workhub-action-card-icon {
        color: #2f6db2;
      }
      .workhub-action-card.is-proscons-action .workhub-action-card-icon {
        color: #365f8e;
      }
      .workhub-action-card.is-settings-action .workhub-action-card-icon {
        color: #53648a;
      }
      .workhub-action-card-label {
        font-size: 0.7rem;
        font-weight: 500;
        text-align: center;
        color: #22324a;
      }
      .workhub-action-card-toggle {
        grid-column: 1 / -1;
        border: 1px dashed #c8d8ee;
        border-radius: 10px;
        background: #f7fbff;
        color: #335d8a;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 600;
        padding: 8px 10px;
        cursor: pointer;
        text-align: center;
      }
      .workhub-action-card-toggle:hover {
        background: #eef6ff;
        border-color: #abc7eb;
      }
      .workhub-action-card.is-project-action {
        background: #f0f6ff;
        border-color: #c8dcff;
      }
      .workhub-action-card.is-project-action:hover {
        background: #e4efff;
        border-color: #a0c0fa;
      }
      .workhub-action-card.is-folder-action {
        background: #f7f3ea;
        border-color: #e0d4b6;
      }
      .workhub-action-card.is-folder-action:hover {
        background: #f0e9d5;
        border-color: #c8b080;
      }
      .workhub-action-card.is-moodboard-action {
        background: #fff8f0;
        border-color: #fad8b0;
      }
      .workhub-action-card.is-moodboard-action:hover {
        background: #fff0de;
        border-color: #f0b870;
      }
      .workhub-action-card.is-settings-action {
        background: #f4f4f8;
        border-color: #d5d8e4;
      }
      .workhub-action-card.is-settings-action:hover {
        background: #eaeaf4;
        border-color: #b8bcd8;
      }
      .workhub-moodboard-dialog {
        position: fixed;
        inset: 0;
        z-index: 4000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .workhub-moodboard-panel {
        position: relative;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 18px;
        box-shadow: 0 28px 72px rgba(22, 36, 68, 0.24);
        width: 800px;
        max-width: 98vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .workhub-moodboard-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 18px;
        border-bottom: 1px solid #e8eef8;
        flex-shrink: 0;
      }
      .workhub-moodboard-title-input {
        flex: 1;
        border: 0;
        font: inherit;
        font-size: 0.95rem;
        font-weight: 600;
        color: #1c365f;
        background: transparent;
        outline: none;
        min-width: 0;
      }
      .workhub-moodboard-title-input::placeholder {
        color: #b0bdd8;
        font-weight: 400;
      }
      .workhub-moodboard-body {
        flex: 1;
        overflow-y: auto;
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .workhub-moodboard-body.is-middle-mouse-panning,
      .workhub-moodboard-body.is-middle-mouse-panning * {
        cursor: grabbing !important;
      }
      .workhub-moodboard-body.is-canvas-mode {
        overflow: auto;
      }
      .workhub-moodboard-empty {
        text-align: center;
        padding: 40px 0;
        color: #9aaac0;
        font-size: 0.82rem;
      }
      .workhub-moodboard-images {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
      }
      .workhub-moodboard-image-card {
        position: relative;
        border: 1px solid #e1e8f2;
        border-radius: 12px;
        overflow: hidden;
        background: #f4f8ff;
        aspect-ratio: 4/3;
      }
      .workhub-moodboard-image-card:hover {
        box-shadow: inset 0 0 0 1px #111111;
      }
      .workhub-moodboard-image-card.is-selected {
        box-shadow: inset 0 0 0 1px #000000, 0 0 0 1px rgba(17, 17, 17, 0.2);
      }
      .workhub-moodboard-image-card.is-transparent-bg {
        background: transparent;
      }
      .workhub-moodboard-image-card img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .workhub-moodboard-image-remove {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        border: 1px solid #d7deea;
        background: rgba(255, 255, 255, 0.95);
        color: #1f2a3b;
        border-radius: 999px;
        padding: 0;
        font-size: 0.82rem;
        line-height: 1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 120ms ease, background 120ms ease, border-color 120ms ease;
      }
      .workhub-moodboard-image-card:hover .workhub-moodboard-image-remove,
      .workhub-moodboard-image-card.is-selected .workhub-moodboard-image-remove,
      .workhub-moodboard-canvas-item:hover .workhub-moodboard-image-remove,
      .workhub-moodboard-canvas-item.is-selected .workhub-moodboard-image-remove,
      .workhub-moodboard-canvas-item.is-detail-selected .workhub-moodboard-image-remove {
        opacity: 1;
      }
      .workhub-moodboard-image-remove:hover {
        background: #fff2f2;
        border-color: #ea9c9c;
      }
      .workhub-moodboard-upload-zone {
        border: 2px dashed #c8d8f0;
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        cursor: pointer;
        color: #8fa8cc;
        font-size: 0.82rem;
        transition: background 120ms, border-color 120ms;
      }
      .workhub-moodboard-upload-zone:hover {
        background: #f0f6ff;
        border-color: #8ab0e8;
      }
      .workhub-moodboard-hidden-file-input {
        display: none;
      }
      .workhub-moodboard-head-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        padding: 0 10px;
        font-size: 0.74rem;
        white-space: nowrap;
      }
      .workhub-moodboard-upload-zone input[type='file'] {
        display: none;
      }
      .workhub-moodboard-url-dialog-backdrop {
        position: absolute;
        inset: 0;
        z-index: 10;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 72px 18px 18px;
        background: rgba(20, 31, 50, 0.14);
      }
      .workhub-moodboard-url-dialog {
        width: min(520px, calc(100vw - 48px));
        border: 1px solid #d9e4f6;
        border-radius: 14px;
        background: #ffffff;
        box-shadow: 0 20px 50px rgba(31, 51, 88, 0.18);
        overflow: hidden;
      }
      .workhub-moodboard-url-dialog-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border-bottom: 1px solid #e6eef9;
      }
      .workhub-moodboard-url-dialog-head strong {
        font-size: 0.8rem;
        color: #1b3157;
        letter-spacing: 0.01em;
      }
      .workhub-moodboard-url-dialog-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
      }
      .workhub-moodboard-url-dialog-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 0 14px 14px;
      }
      .workhub-moodboard-add-panel {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-moodboard-url-add-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .workhub-moodboard-url-add-row .workhub-input {
        flex: 1 1 auto;
        min-width: 0;
      }
      .workhub-moodboard-url-add-row .workhub-primary-btn {
        flex: 0 0 auto;
        white-space: nowrap;
      }
      .workhub-moodboard-url-hint {
        font-size: 0.72rem;
        color: #7c91b5;
        padding: 0 2px;
      }
      .workhub-moodboard-view {
        overflow-y: auto;
        overflow-x: hidden;
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-moodboard-head-action {
          padding: 0 8px;
          font-size: 0.71rem;
        }
      }
      .workhub-moodboard-error {
        background: #fff0f0;
        border: 1px solid #f0b0b0;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.78rem;
        color: #b33030;
        margin: 0 18px;
      }
      .workhub-moodboard-share-bar {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 18px;
        background: #f4f8ff;
        border-bottom: 1px solid #e4edf8;
        font-size: 0.78rem;
      }
      .workhub-moodboard-tabs {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        padding: 8px 18px;
        border-bottom: 1px solid #e8eef8;
        background: #fbfdff;
      }
      .workhub-moodboard-tab {
        border: 1px solid #d6e2f5;
        background: #ffffff;
        color: #425f8f;
        border-radius: 8px;
        min-height: 28px;
        padding: 0 10px;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-moodboard-tab:hover {
        border-color: #bdd1f2;
        background: #f3f8ff;
      }
      .workhub-moodboard-tab.is-active {
        border-color: #8fb1eb;
        background: #edf4ff;
        color: #234c89;
      }
      .workhub-moodboard-tab.is-add {
        color: #5d76a0;
      }
      .workhub-moodboard-view-options {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        padding: 8px 18px;
        border-bottom: 1px solid #e8eef8;
        background: #fbfdff;
      }
      .workhub-moodboard-view-group {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        min-width: 0;
      }
      .workhub-moodboard-view-chip {
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #355487;
        border-radius: 999px;
        padding: 4px 10px;
        min-height: 24px;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
      }
      .workhub-moodboard-view-chip:hover {
        border-color: #b9cff5;
        background: #f8fbff;
      }
      .workhub-moodboard-view-chip.is-active {
        border-color: #87a9ff;
        background: #edf4ff;
        color: #295fe6;
      }
      .workhub-moodboard-view-chip.is-icon-only {
        width: 28px;
        min-width: 28px;
        padding: 0;
        justify-content: center;
        font-size: 0.9rem;
      }
      .workhub-moodboard-grid-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        font-size: 0.74rem;
        color: #47608a;
        white-space: nowrap;
        flex-wrap: nowrap;
        flex: 0 0 auto;
        min-width: 0;
        padding-left: 10px;
      }
      .workhub-moodboard-grid-toggle input {
        margin: 0;
        flex: 0 0 auto;
      }
      .workhub-moodboard-grid-toggle-label {
        display: inline-flex;
        align-items: center;
        line-height: 1;
      }
      .workhub-moodboard-body.has-grid-background {
        background-color: #fbfdff;
        background-image:
          linear-gradient(to right, rgba(114, 145, 199, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(114, 145, 199, 0.15) 1px, transparent 1px);
        background-size: 24px 24px;
      }
      .workhub-moodboard-body.is-drop-target {
        box-shadow: inset 0 0 0 2px rgba(33, 86, 196, 0.34);
        background-color: rgba(238, 246, 255, 0.92);
      }
      .workhub-moodboard-canvas-help {
        font-size: 0.72rem;
        color: #5e759e;
        padding: 2px 2px 8px;
      }
      .workhub-moodboard-canvas {
        position: relative;
        min-height: 640px;
        overflow: visible;
        touch-action: none;
        user-select: none;
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-moodboard-tabs {
          padding: 7px 12px;
          gap: 5px;
        }
        .workhub-moodboard-tab {
          min-height: 26px;
          padding: 0 8px;
          font-size: 0.7rem;
        }
      }
      .workhub-moodboard-canvas.is-dragging {
        cursor: grabbing;
      }
      .workhub-moodboard-canvas-item {
        position: absolute;
        border: 1px solid transparent;
        border-radius: 10px;
        background: transparent;
        box-shadow: none;
        overflow: hidden;
        cursor: grab;
      }
      .workhub-moodboard-canvas-item:hover {
        box-shadow: inset 0 0 0 1px #111111;
      }
      .workhub-moodboard-canvas-item.is-selected:not(.is-transparent-bg) {
        border-color: #3f78ec;
        box-shadow:
          0 0 0 2px rgba(63, 120, 236, 0.18),
          0 10px 22px rgba(44, 76, 130, 0.24);
      }
      .workhub-moodboard-canvas-item.is-detail-selected:not(.is-transparent-bg) {
        box-shadow: inset 0 0 0 1px #111111, 0 10px 22px rgba(44, 76, 130, 0.24);
      }
      .workhub-moodboard-canvas-item.is-transparent-bg {
        background: transparent;
        border-color: transparent;
        box-shadow: none;
      }
      .workhub-moodboard-canvas-item.is-transparent-bg:hover {
        box-shadow: inset 0 0 0 1px #111111;
      }
      .workhub-moodboard-canvas-item.is-transparent-bg.is-selected {
        border-color: #3f78ec;
        box-shadow:
          0 0 0 2px rgba(63, 120, 236, 0.18),
          0 10px 22px rgba(44, 76, 130, 0.24);
      }
      .workhub-moodboard-canvas-item.is-transparent-bg.is-detail-selected {
        box-shadow: inset 0 0 0 1px #111111, 0 10px 22px rgba(44, 76, 130, 0.24);
      }
      .workhub-moodboard-canvas-item img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: transparent;
        display: block;
        user-select: none;
        -webkit-user-drag: none;
      }
      .workhub-moodboard-resize-handle {
        position: absolute;
        right: 3px;
        bottom: 3px;
        width: 14px;
        height: 14px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.92);
        background:
          linear-gradient(135deg, transparent 0 40%, rgba(255, 255, 255, 0.95) 40% 53%, transparent 53%),
          linear-gradient(135deg, transparent 0 62%, rgba(63, 120, 236, 0.95) 62% 75%, transparent 75%),
          #1f57cf;
        cursor: nwse-resize;
        padding: 0;
        opacity: 0;
        pointer-events: none;
        transition: opacity 120ms ease;
      }
      .workhub-moodboard-canvas-item:hover .workhub-moodboard-resize-handle,
      .workhub-moodboard-canvas-item.is-selected .workhub-moodboard-resize-handle,
      .workhub-moodboard-canvas-item.is-detail-selected .workhub-moodboard-resize-handle {
        opacity: 1;
        pointer-events: auto;
      }
      .workhub-moodboard-marquee {
        position: absolute;
        border: 1px dashed #2f6de4;
        background: rgba(77, 128, 235, 0.18);
        pointer-events: none;
      }
      .workhub-moodboard-selected-image-detail {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-moodboard-caption-editor {
        display: flex;
        align-items: stretch;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-moodboard-caption-editor .workhub-input {
        min-width: 0;
      }
      .workhub-moodboard-inline-status {
        font-size: 0.71rem;
        color: #6c85ad;
      }
      .workhub-moodboard-url-token {
        display: block;
        word-break: break-all;
      }
      .workhub-moodboard-image-preview-wrap {
        border: 1px solid #dbe6f7;
        border-radius: 10px;
        background: #f7faff;
        overflow: hidden;
      }
      .workhub-moodboard-image-preview-wrap.is-transparent-bg {
        background-image:
          linear-gradient(45deg, #c8c8c8 25%, transparent 25%),
          linear-gradient(-45deg, #c8c8c8 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #c8c8c8 75%),
          linear-gradient(-45deg, transparent 75%, #c8c8c8 75%);
        background-size: 12px 12px;
        background-position: 0 0, 0 6px, 6px -6px, -6px 0;
        background-color: #ffffff;
      }
      .workhub-moodboard-selected-image-detail img {
        width: 100%;
        max-height: 180px;
        object-fit: contain;
        display: block;
      }
      .workhub-moodboard-bg-toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.72rem;
        font-weight: 500;
        color: #1e3e74;
        background: #eef3fc;
        border: 1px solid #c8d8f0;
        border-radius: 6px;
        padding: 3px 8px;
        cursor: pointer;
        line-height: 1.6;
        transition: background 0.12s;
      }
      .workhub-moodboard-bg-toggle-btn:hover {
        background: #dce9fb;
      }
      .workhub-toggle-label > span {
        font-weight: 500;
        display: block;
        margin-bottom: 6px;
        font-size: 0.82rem;
        color: #1c365f;
      }
      .workhub-toggle-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .workhub-toggle-btn {
        border: 1px solid #d0d8e8;
        background: #f4f4f8;
        color: #7a8faa;
        border-radius: 20px;
        padding: 4px 14px;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 120ms, border-color 120ms, color 120ms;
        font: inherit;
      }
      .workhub-toggle-btn.is-on {
        background: #2a6ae8;
        border-color: #1a4fc0;
        color: #fff;
      }
      .workhub-toggle-btn:hover:not(.is-on) {
        background: #eaecf4;
        border-color: #b8c4d8;
      }
      .workhub-assignee-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      .workhub-assignee-card {
        border: 1px solid #dbe7ff;
        border-radius: 11px;
        background: #fbfdff;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-assignee-card strong {
        font-size: 0.82rem;
        color: #1c365f;
      }
      .workhub-assignee-metrics {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 0.72rem;
        color: #5c6c8d;
      }
      .workhub-main-stage {
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        padding-right: 2px;
      }
      .workhub-section-stack {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .workhub-section-stack.is-dashboard {
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
      .workhub-dashboard-stack {
        display: contents;
      }
      .workhub-section-stack.is-dashboard.workhub-dashboard-with-details {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
        gap: 10px;
        align-items: stretch;
        overflow: hidden;
      }
      .workhub-section-stack.is-dashboard.workhub-dashboard-with-details > .workhub-dashboard-stack {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        overflow-y: auto;
        overflow-x: auto;
        padding-right: 2px;
      }
      .workhub-section-stack.is-dashboard.workhub-dashboard-with-details > .workhub-dashboard-stack > .workhub-panel {
        min-width: 760px;
      }
      .workhub-section-stack.is-dashboard.workhub-dashboard-with-details .workhub-proposal-focus-grid {
        grid-template-columns: repeat(2, minmax(340px, 1fr));
        min-width: 700px;
      }
      .workhub-section-stack.is-dashboard.workhub-dashboard-with-details > .workhub-task-detail-rail {
        min-width: 0;
      }
      .workhub-section-stack.is-dashboard.workhub-dashboard-with-details > .workhub-dashboard-stack .workhub-panel:last-child {
        margin-bottom: 0;
      }
      .workhub-floating-add-wrap {
        position: fixed;
        right: 14px;
        bottom: 16px;
        z-index: 2500;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .workhub-floating-add-menu {
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        padding: 8px;
        box-shadow: 0 10px 24px rgba(20, 35, 70, 0.18);
      }
      .workhub-floating-add-option {
        border: 1px solid #dbe7ff;
        background: #f8fbff;
        color: #1f365f;
        border-radius: 8px;
        padding: 6px 10px;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-floating-add-option:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .workhub-floating-add-btn {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        border: 1px solid #cfe0ff;
        background: linear-gradient(145deg, #4f8cff, #7b61ff);
        color: #ffffff;
        font: inherit;
        font-size: 1.1rem;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 24px rgba(44, 84, 176, 0.35);
      }
      .workhub-batch-progress {
        position: fixed;
        right: 14px;
        bottom: 64px;
        z-index: 2501;
        width: 240px;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: 0 12px 28px rgba(12, 32, 66, 0.2);
        padding: 9px 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-batch-progress-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: #1f365f;
        font-size: 0.74rem;
      }
      .workhub-batch-progress-head strong {
        font-size: 0.76rem;
      }
      .workhub-batch-progress-bar {
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: #eaf1ff;
        overflow: hidden;
      }
      .workhub-batch-progress-bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #4f8cff 0%, #7b61ff 100%);
        transition: width 0.18s ease;
      }
      .workhub-bulk-status-wrap {
        position: relative;
        margin-left: 6px;
      }
      .workhub-bulk-assignee-wrap {
        position: relative;
        margin-left: 6px;
      }
      .workhub-bulk-status-btn {
        width: auto;
        min-width: 56px;
        padding: 0 8px;
        font-size: 0.72rem;
        font-weight: 700;
        gap: 4px;
      }
      .workhub-bulk-assignee-btn {
        width: auto;
        min-width: 56px;
        padding: 0 8px;
        font-size: 0.72rem;
        font-weight: 700;
        gap: 4px;
      }
      .workhub-bulk-status-menu {
        position: absolute;
        top: 38px;
        right: 0;
        z-index: 35;
        min-width: 170px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 10px 28px rgba(12, 32, 66, 0.16);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-bulk-status-menu button {
        border: none;
        background: transparent;
        border-radius: 7px;
        padding: 6px 8px;
        text-align: left;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #29466f;
        font-size: 0.73rem;
        cursor: pointer;
      }
      .workhub-bulk-status-menu button:hover {
        background: #eff5ff;
      }
      .workhub-bulk-status-menu .workhub-bulk-clear-btn {
        margin-top: 4px;
        border-top: 1px solid #e3ebff;
        border-radius: 0;
        padding-top: 8px;
        color: #4a5f84;
      }
      .workhub-bulk-assignee-menu {
        position: absolute;
        top: 38px;
        right: 0;
        z-index: 35;
        min-width: 190px;
        max-height: min(300px, 42vh);
        overflow-y: auto;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 10px 28px rgba(12, 32, 66, 0.16);
        padding: 6px 0;
        display: flex;
        flex-direction: column;
      }
      .workhub-bulk-assignee-legend {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 2px 12px 6px;
        font-size: 0.66rem;
        line-height: 1.25;
        color: #607395;
      }
      .workhub-bulk-assignee-legend strong {
        color: #2e466e;
        font-weight: 700;
      }
      .workhub-bulk-assignee-menu .workhub-composer-notify-check {
        align-items: center;
      }
      .workhub-bulk-assignee-option-text {
        flex: 1 1 auto;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-bulk-assignee-coverage-badge {
        flex: 0 0 auto;
        font-size: 0.64rem;
        font-weight: 700;
        line-height: 1;
        border-radius: 999px;
        padding: 3px 6px;
        border: 1px solid #d8e4fa;
        color: #355487;
        background: #eef4ff;
      }
      .workhub-bulk-assignee-coverage-badge.is-common {
        color: #1e7b4f;
        border-color: #bde5d1;
        background: #edf9f2;
      }
      .workhub-bulk-assignee-coverage-badge.is-partial {
        color: #9a5e11;
        border-color: #f0d8a8;
        background: #fff5e5;
      }
      .workhub-bulk-clear-inline-btn {
        margin-left: 6px;
        width: auto;
        min-width: 64px;
        padding: 0 10px;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .workhub-bulk-delete-btn {
        margin-left: 6px;
        color: #8b2e35;
        border-color: #f0ccd2;
        background: #fff4f5;
        box-shadow: inset 0 0 0 0 rgba(180, 54, 68, 0.24);
      }
      .workhub-bulk-delete-btn:hover {
        background: #ffe8ec;
        border-color: #e7b2bc;
        box-shadow: 0 0 0 2px rgba(180, 54, 68, 0.16);
      }
      .workhub-bulk-delete-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .workhub-milestone-strip {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px 0 10px;
        border-bottom: 1px solid #e3ecfb;
        margin-bottom: 2px;
      }
      .workhub-milestone-strip-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #374151;
        min-height: 24px;
      }
      .workhub-milestone-strip-dot {
        flex-shrink: 0;
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .workhub-milestone-strip-name {
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
      }
      .workhub-milestone-strip-status {
        color: #6b7280;
        font-size: 11px;
        white-space: nowrap;
      }
      .workhub-milestone-strip-progress-wrap {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }
      .workhub-milestone-strip-progress-track {
        width: 60px;
        height: 4px;
        background: #e5e7eb;
        border-radius: 2px;
        overflow: hidden;
      }
      .workhub-milestone-strip-progress-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
      }
      .workhub-milestone-strip-pct {
        font-size: 11px;
        color: #6b7280;
        white-space: nowrap;
      }
      .workhub-milestone-strip-due {
        font-size: 11px;
        color: #6b7280;
        white-space: nowrap;
        margin-left: auto;
      }
      .workhub-milestone-strip-due.is-overdue {
        color: #dc2626;
        font-weight: 600;
      }
      .workhub-milestone-strip-btn {
        flex-shrink: 0;
        background: none;
        border: 1px solid currentColor;
        border-radius: 3px;
        padding: 1px 6px;
        font-size: 11px;
        line-height: 1.5;
        cursor: pointer;
        white-space: nowrap;
      }
      .workhub-milestone-strip-btn.is-activate {
        color: #0ea5e9;
      }
      .workhub-milestone-strip-btn.is-activate:hover {
        background: #e0f2fe;
      }
      .workhub-milestone-strip-btn.is-complete {
        color: #10b981;
      }
      .workhub-milestone-strip-btn.is-complete:hover {
        background: #d1fae5;
      }
      .workhub-milestone-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px 14px;
        margin-bottom: 10px;
        transition: border-color 0.15s;
      }
      .workhub-milestone-card.is-at-risk {
        border-color: #f59e0b;
        background: #fffbeb;
      }
      .workhub-milestone-card.is-completed {
        opacity: 0.65;
      }
      .workhub-milestone-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      .workhub-milestone-dot {
        flex-shrink: 0;
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .workhub-milestone-name {
        font-weight: 600;
        font-size: 13px;
        color: #111827;
        flex: 1;
      }
      .workhub-milestone-status-badge {
        font-size: 11px;
        font-weight: 500;
        border: 1px solid;
        border-radius: 3px;
        padding: 1px 5px;
        white-space: nowrap;
      }
      .workhub-milestone-actions {
        display: flex;
        gap: 2px;
        margin-left: 4px;
      }
      .workhub-milestone-description {
        font-size: 12px;
        color: #4b5563;
        margin: 4px 0 8px;
      }
      .workhub-milestone-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .workhub-milestone-due {
        font-size: 12px;
        color: #6b7280;
      }
      .workhub-milestone-due.is-overdue {
        color: #dc2626;
        font-weight: 600;
      }
      .workhub-milestone-at-risk-badge {
        font-size: 11px;
        color: #92400e;
        background: #fef3c7;
        border: 1px solid #fbbf24;
        border-radius: 3px;
        padding: 1px 5px;
      }
      .workhub-milestone-progress {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .workhub-milestone-progress-bar-track {
        flex: 1;
        height: 5px;
        background: #e5e7eb;
        border-radius: 3px;
        overflow: hidden;
      }
      .workhub-milestone-progress-bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .workhub-milestone-progress-label {
        font-size: 11px;
        color: #6b7280;
        white-space: nowrap;
      }
      .workhub-milestone-status-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-milestone-action-btn {
        background: none;
        border: 1px solid currentColor;
        border-radius: 4px;
        padding: 3px 10px;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s;
      }
      .workhub-milestone-action-btn.is-activate { color: #0ea5e9; }
      .workhub-milestone-action-btn.is-activate:hover { background: #e0f2fe; }
      .workhub-milestone-action-btn.is-complete { color: #10b981; }
      .workhub-milestone-action-btn.is-complete:hover { background: #d1fae5; }
      .workhub-milestone-action-btn.is-risk { color: #f59e0b; }
      .workhub-milestone-action-btn.is-risk:hover { background: #fef3c7; }
      .workhub-milestone-action-btn.is-resume { color: #6366f1; }
      .workhub-milestone-action-btn.is-resume:hover { background: #ede9fe; }
      .workhub-milestone-action-btn.is-reopen { color: #6b7280; }
      .workhub-milestone-action-btn.is-reopen:hover { background: #f3f4f6; }
      .workhub-milestones-panel {
        margin-top: 24px;
      }
      .workhub-milestones-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 12px;
      }
      .workhub-milestones-panel-title {
        font-size: 14px;
        font-weight: 600;
        color: #111827;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-milestones-panel-actions {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .workhub-milestones-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #e5e7eb;
        color: #374151;
        font-size: 11px;
        font-weight: 600;
        border-radius: 10px;
        padding: 0 6px;
        min-width: 18px;
        height: 18px;
      }
      .workhub-milestones-list {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      @media print {
        .workhub-milestones-panel .workhub-milestone-action-btn,
        .workhub-milestones-panel .workhub-milestone-actions,
        .workhub-milestones-panel .workhub-milestones-panel-actions {
          display: none !important;
        }
      }
      .workhub-status-tabs {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 0;
        border-bottom: 1px solid #e3ecfb;
        margin-bottom: 16px;
        flex-wrap: wrap;
        position: relative;
      }
      .workhub-status-tabs::before {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #295fe6 0%, #7b61ff 100%);
        opacity: 0.1;
      }
      .workhub-status-tab {
        border: none;
        background: transparent;
        color: #647392;
        border-radius: 8px 8px 0 0;
        padding: 8px 16px;
        font-size: 0.74rem;
        line-height: 1;
        font-weight: 500;
        cursor: pointer;
        min-height: 32px;
        transition: color 0.08s ease, background 0.08s ease;
        position: relative;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-status-tab::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        background: var(--status-color, #295fe6);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 1px;
      }
      .workhub-status-tab:hover {
        color: #295fe6;
        background: rgba(41, 95, 230, 0.04);
        transition: none;
      }
      .workhub-status-tab:hover::after {
        width: 100%;
      }
      .workhub-status-tab.is-active {
        color: var(--status-color, #295fe6);
        background: linear-gradient(180deg, rgba(41, 95, 230, 0.08) 0%, rgba(41, 95, 230, 0.02) 100%);
        font-weight: 700;
      }
      .workhub-status-tab.is-active::after {
        width: 100%;
        height: 3px;
        box-shadow: 0 2px 8px rgba(41, 95, 230, 0.4);
      }
      .workhub-status-manage-btn {
        margin-left: auto;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid #d8e4fa;
        background: #f8fbff;
        color: #47608f;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: color 0.08s ease, background 0.08s ease, border-color 0.08s ease;
      }
      .workhub-completed-highlight {
        margin-left: auto;
        height: 28px;
        border-radius: 999px;
        border: 1px solid #d5d9b5;
        background: linear-gradient(135deg, #fffdf4 0%, #f5f8e8 100%);
        color: #5a5a1f;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 0 10px;
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;
        transition: border-color 0.08s ease, background 0.08s ease, color 0.08s ease;
      }
      .workhub-completed-highlight:hover {
        border-color: #c2c88f;
        background: linear-gradient(135deg, #fffbe9 0%, #eef3d9 100%);
        transition: none;
      }
      .workhub-completed-highlight.is-active {
        border-color: #aab164;
        background: linear-gradient(135deg, #f8f2d8 0%, #e6ecc8 100%);
      }
      .workhub-completed-highlight-icon {
        width: 16px;
        height: 16px;
        border-radius: 999px;
        background: linear-gradient(160deg, #76802d 0%, #5b6320 100%);
        color: #f7f8e6;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.62rem;
        line-height: 1;
      }
      .workhub-completed-highlight-cta {
        color: #6a7229;
        opacity: 0.95;
        border-left: 1px solid #d6dbb0;
        padding-left: 6px;
      }
      .workhub-completed-highlight + .workhub-task-filter-wrap {
        margin-left: 8px;
      }
      .workhub-task-view-switch {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: 8px;
        border: 1px solid #d8e4fa;
        border-radius: 8px;
        padding: 2px;
        background: #f8fbff;
      }
      .workhub-task-view-btn {
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #5f7399;
        font-size: 0.67rem;
        font-weight: 600;
        line-height: 1;
        min-height: 24px;
        padding: 0 8px;
        cursor: pointer;
        transition: color 0.08s ease, background 0.08s ease;
      }
      .workhub-task-view-btn:hover:not(:disabled) {
        color: #264f93;
        background: #edf4ff;
      }
      .workhub-task-view-btn.is-active {
        color: #1f4a90;
        background: linear-gradient(180deg, #e9f1ff 0%, #dfeaff 100%);
      }
      .workhub-task-view-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .workhub-task-view-switch + .workhub-task-filter-wrap {
        margin-left: auto;
      }
      .workhub-task-filter-wrap {
        position: relative;
        margin-left: 8px;
      }
      .workhub-task-filter-wrap + .workhub-status-manage-btn {
        margin-left: 6px;
      }
      .workhub-task-filter-btn {
        margin-left: 0;
        position: relative;
        min-width: 24px;
        height: 24px;
        min-height: 24px;
        padding: 0;
      }
      .workhub-task-filter-icon {
        width: 11px;
        height: 11px;
        display: block;
        flex: 0 0 auto;
        background: currentColor;
        clip-path: polygon(0 8%, 100% 8%, 66% 46%, 66% 100%, 34% 100%, 34% 46%);
      }
      .workhub-task-filter-btn.is-active {
        color: #295fe6;
        border-color: #87a9ff;
        background: #edf4ff;
      }
      .workhub-task-filter-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 14px;
        height: 14px;
        padding: 0 3px;
        border-radius: 999px;
        background: #4d84ff;
        color: #ffffff;
        font-size: 0.62rem;
        font-weight: 800;
        line-height: 14px;
        text-align: center;
      }
      .workhub-task-filter-menu {
        position: absolute;
        top: 38px;
        right: 0;
        z-index: 35;
        width: 220px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 10px 28px rgba(12, 32, 66, 0.16);
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-task-filter-menu-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-task-filter-menu-head strong {
        font-size: 0.77rem;
        color: #18345f;
      }
      .workhub-task-filter-clear {
        border: none;
        background: transparent;
        color: #4d84ff;
        font: inherit;
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;
        padding: 0;
        margin: 0;
      }
      .workhub-task-filter-check {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 0.74rem;
        color: #35507d;
      }
      .workhub-task-filter-check input {
        margin: 0;
      }
      .workhub-task-filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-task-filter-group > span {
        font-size: 0.69rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #7388aa;
      }
      .workhub-task-filter-priority-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-task-filter-pill {
        border: 1px solid #d9e5fb;
        background: #f8fbff;
        color: #3e5987;
        border-radius: 999px;
        padding: 4px 8px;
        font: inherit;
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-task-filter-pill.is-active {
        background: #edf4ff;
        border-color: #87a9ff;
        color: #295fe6;
      }
      .workhub-status-manage-btn:hover {
        color: #295fe6;
        border-color: #87a9ff;
        background: #edf4ff;
      }
      .workhub-status-tab.is-active[data-status-color="backlog"] {
        --status-color: #6b7280;
      }
      .workhub-status-tab.is-active[data-status-color="open"] {
        --status-color: #3b82f6;
      }
      .workhub-status-tab.is-active[data-status-color="in_progress"] {
        --status-color: #f59e0b;
      }
      .workhub-status-tab.is-active[data-status-color="review"] {
        --status-color: #8b5cf6;
      }
      .workhub-status-tab.is-active[data-status-color="completed"] {
        --status-color: #10b981;
      }
      .workhub-status-tab.is-active[data-status-color="canceled"] {
        --status-color: #ef4444;
      }
      .workhub-status-add {
        border: 1px solid #e3ecfb;
        background: transparent;
        color: #94a3b8;
        min-width: 32px;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: color 0.08s ease, background 0.08s ease, border-color 0.08s ease, transform 0.15s ease;
        font-size: 1.1rem;
        font-weight: 300;
      }
      .workhub-status-add:hover {
        border-color: #295fe6;
        color: #295fe6;
        background: rgba(41, 95, 230, 0.04);
        transition: transform 0.15s ease;
        transform: scale(1.05);
      }
      .workhub-status-editor-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-status-editor-row {
        border: 1px solid #dbe7ff;
        background: #f9fbff;
        border-radius: 12px;
        padding: 10px;
        display: flex;
        gap: 12px;
        justify-content: space-between;
        align-items: flex-end;
      }
      .workhub-status-editor-fields {
        flex: 1;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
        gap: 10px;
      }
      .workhub-status-editor-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        min-width: 96px;
      }
      .workhub-status-editor-add {
        border-top: 1px solid #e3ecfb;
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-status-editor-add-head h3 {
        margin: 0;
        font-size: 0.92rem;
        color: #17305c;
      }
      .workhub-status-editor-add-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .workhub-compact-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
      }
      .workhub-content-area {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 10px;
        align-items: stretch;
        height: 100%;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .workhub-content-area.workhub-detail-rail-compact {
        grid-template-columns: minmax(0, 1fr) 248px;
      }
      .workhub-content-area.workhub-detail-rail-hidden {
        grid-template-columns: minmax(0, 1fr) 0;
        gap: 6px;
      }
      .workhub-content-area > * {
        min-height: 0;
      }
      .workhub-task-sections {
        --workhub-task-list-min-width: 760px;
        min-width: 0;
        height: 100%;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 2px;
        overscroll-behavior: contain;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }
      .workhub-task-main-column {
        min-width: 0;
        min-height: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .workhub-detail-rail-restore-wrap {
        display: flex;
        justify-content: flex-end;
        padding: 2px 0 6px;
      }
      .workhub-detail-rail-restore-btn {
        border: 1px solid #cddbf3;
        border-radius: 999px;
        background: #f4f8ff;
        color: #2f4f7f;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 5px 10px;
      }
      .workhub-detail-rail-restore-btn:hover {
        background: #e9f1ff;
      }
      .workhub-task-main-column .workhub-task-sections {
        flex: 1 1 auto;
        min-height: 0;
      }
      .workhub-task-related-bar {
        margin: 0;
        flex: 0 0 auto;
        border: 1px solid #dbe6fb;
        border-radius: 10px;
        background: #f8fbff;
      }
      .workhub-task-related-bar > summary {
        list-style: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        color: #2c4570;
      }
      .workhub-task-related-bar > summary::-webkit-details-marker {
        display: none;
      }
      .workhub-task-related-bar > summary span {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .workhub-task-related-bar > summary small {
        font-size: 0.66rem;
        color: #6f84a9;
      }
      .workhub-task-related-bar > summary::after {
        content: '▾';
        margin-left: 8px;
        font-size: 0.72rem;
        color: #6d81a5;
      }
      .workhub-task-related-bar[open] > summary {
        border-bottom: 1px solid #dbe6fb;
      }
      .workhub-task-related-bar[open] > summary::after {
        content: '▴';
      }
      .workhub-task-related-groups {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        padding: 10px;
      }
      .workhub-task-related-group h4 {
        margin: 0 0 6px;
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #60769c;
      }
      .workhub-task-related-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-task-related-chip {
        border: 1px solid #d4e1f8;
        background: #ffffff;
        color: #26436f;
        border-radius: 999px;
        padding: 4px 9px;
        font-size: 0.67rem;
        line-height: 1.2;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        cursor: pointer;
      }
      .workhub-task-related-chip:hover {
        background: #f0f6ff;
        border-color: #bfd2f3;
      }
      .workhub-task-related-chip.is-active {
        background: #eaf2ff;
        border-color: #a9c1ec;
        color: #1d3964;
      }
      .workhub-task-context-strip {
        display: none;
        gap: 8px;
        margin: 0 0 6px;
        padding: 6px;
        border: 0;
        border-radius: 12px;
        background: #f8fbff;
      }
      .workhub-task-context-path {
        display: flex;
        align-items: stretch;
        gap: 6px;
        min-width: 0;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
      }
      .workhub-task-context-node-wrap {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }
      .workhub-task-context-node {
        border: 1px solid #cbd9f4;
        background: #f0f4ff;
        color: #274066;
        border-radius: 12px;
        padding: 6px 8px;
        min-height: 56px;
        font-size: 0.71rem;
        font-weight: 500;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        width: 134px;
        text-align: center;
      }
      .workhub-task-context-node-icon {
        flex: 0 0 auto;
        margin-top: 0;
      }
      .workhub-task-context-node-text {
        display: grid;
        gap: 2px;
        min-width: 0;
        justify-items: center;
      }
      .workhub-task-context-node-title {
        font-size: 0.72rem;
        font-weight: 600;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .workhub-task-context-node-meta {
        font-size: 0.64rem;
        color: #6880aa;
        letter-spacing: 0.01em;
      }
      .workhub-task-context-node:not(:disabled) {
        cursor: pointer;
      }
      .workhub-task-context-node.is-current {
        border-color: #94b0e4;
        background: #dde9ff;
        color: #0f2c58;
      }
      .workhub-task-context-sep {
        color: #7184a8;
        font-size: 0.8rem;
      }
      .workhub-task-context-current {
        display: grid;
        justify-items: center;
        gap: 4px;
        padding: 2px 8px 4px;
        text-align: center;
      }
      .workhub-task-context-current-title {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 1rem;
        line-height: 1.15;
        font-weight: 700;
        color: #14325f;
      }
      .workhub-task-context-current-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 1px solid #d7e4fa;
        background: #f3f7ff;
        font-size: 0.86rem;
      }
      .workhub-task-context-current-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 6px 12px;
        color: #3d5279;
        font-size: 0.69rem;
        line-height: 1.2;
      }
      .workhub-task-context-current-meta strong,
      .workhub-task-context-period strong {
        font-size: 0.67rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #5f749b;
      }
      .workhub-task-context-period {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #3d5279;
        font-size: 0.69rem;
        white-space: nowrap;
      }
      .workhub-task-table-wrap {
        --workhub-task-timeline-name-width: 200px;
        --workhub-task-timeline-day-count: 14;
        --workhub-task-timeline-day-width: 26px;
        --workhub-task-timeline-head-height: 34px;
        --workhub-task-timeline-row-height: 44px;
        min-width: 0;
        width: 100%;
        padding-bottom: 4px;
        overflow-x: auto;
        overflow-y: visible;
        -webkit-overflow-scrolling: touch;
      }
      .workhub-task-table-wrap.task-view-timeline {
        overflow-x: hidden;
      }
      .workhub-task-sections.task-view-timeline .workhub-task-group,
      .workhub-task-sections.task-view-timeline .workhub-task-table-head {
        display: none;
      }
      .workhub-task-timeline-wrap {
        border: 1px solid #dbe6f7;
        border-radius: 10px;
        background: #f8fbff;
        width: 100%;
        max-width: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 300px);
        min-height: 220px;
      }
      .workhub-task-timeline-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-bottom: 1px solid #dce8f7;
        background: #f3f8ff;
      }
      .workhub-task-timeline-toolbar-copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .workhub-task-timeline-toolbar-copy strong {
        font-size: 0.74rem;
        color: #223c66;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .workhub-task-timeline-toolbar-copy span {
        font-size: 0.68rem;
        color: #6980a6;
      }
      .workhub-task-timeline-zoom-controls {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }
      .workhub-task-timeline-zoom-controls button {
        width: 26px;
        height: 26px;
        border: 1px solid #cfdcf1;
        border-radius: 7px;
        background: #ffffff;
        color: #2e4e7d;
        font-size: 0.86rem;
        line-height: 1;
        cursor: pointer;
      }
      .workhub-task-timeline-zoom-controls button.is-reset {
        width: auto;
        min-width: 48px;
        padding: 0 8px;
        font-size: 0.66rem;
        font-weight: 700;
      }
      .workhub-task-timeline-zoom-controls button.is-arrange {
        width: auto;
        min-width: 58px;
        padding: 0 9px;
        font-size: 0.66rem;
        font-weight: 700;
      }
      .workhub-task-timeline-zoom-controls button.is-add {
        width: auto;
        min-width: 68px;
        padding: 0 10px;
        font-size: 0.66rem;
        font-weight: 700;
      }
      .workhub-task-timeline-zoom-controls button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .workhub-task-timeline-zoom-controls span {
        min-width: 42px;
        text-align: center;
        font-size: 0.68rem;
        font-weight: 700;
        color: #5c7399;
      }
      .workhub-task-timeline-quick-add {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-bottom: 1px solid #dce8f7;
        background: #f8fbff;
      }
      .workhub-task-timeline-quick-add input {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 30px;
        border: 1px solid #c5d6f1;
        border-radius: 8px;
        padding: 0 10px;
        font-size: 0.72rem;
        color: #28456f;
        background: #ffffff;
      }
      .workhub-task-timeline-quick-add button {
        border: 1px solid #cfdcf1;
        border-radius: 7px;
        background: #ffffff;
        color: #2e4e7d;
        font-size: 0.68rem;
        font-weight: 700;
        min-height: 30px;
        padding: 0 10px;
        cursor: pointer;
      }
      .workhub-task-timeline-quick-add button.is-cancel {
        color: #6d81a3;
      }
      .workhub-task-timeline-quick-add button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .workhub-task-timeline-layout {
        display: grid;
        grid-template-columns: var(--workhub-task-timeline-name-width) 10px minmax(0, 1fr);
        align-items: stretch;
        min-height: 0;
        flex: 1 1 auto;
      }
      .workhub-task-timeline-left-pane,
      .workhub-task-timeline-right-pane {
        min-height: 0;
      }
      .workhub-task-timeline-left-pane {
        display: flex;
        flex-direction: column;
        background: #f8fbff;
        min-width: 0;
      }
      .workhub-task-timeline-resize-handle {
        border: 0;
        border-left: 1px solid #dce8f7;
        border-right: 1px solid #dce8f7;
        background: linear-gradient(180deg, #f7fbff 0%, #eef4ff 100%);
        cursor: col-resize;
        padding: 0;
        position: relative;
      }
      .workhub-task-timeline-resize-handle::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 4px;
        height: 72px;
        border-radius: 999px;
        background: #b9cae8;
      }
      .workhub-task-timeline-resize-handle:hover::before {
        background: #7ea1dd;
      }
      .workhub-task-timeline-right-pane {
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: #fbfdff;
      }
      .workhub-task-timeline-name-head {
        display: flex;
        align-items: center;
        height: var(--workhub-task-timeline-head-height);
        box-sizing: border-box;
        padding: 0 10px;
        font-size: 0.68rem;
        font-weight: 700;
        color: #2d4268;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border-bottom: 1px solid #dce8f7;
        background: #edf4ff;
      }
      .workhub-task-timeline-names-pane {
        min-height: 0;
        overflow: hidden;
        flex: 1 1 auto;
      }
      .workhub-task-timeline-days-head-pane {
        overflow: hidden;
        min-height: var(--workhub-task-timeline-head-height);
        height: var(--workhub-task-timeline-head-height);
        border-bottom: 1px solid #dce8f7;
        background: #edf4ff;
        flex: 0 0 auto;
      }
      .workhub-task-timeline-days-head {
        display: grid;
        min-width: max-content;
        grid-template-columns: repeat(var(--workhub-task-timeline-day-count), var(--workhub-task-timeline-day-width));
      }
      .workhub-task-timeline-day-head {
        min-width: var(--workhub-task-timeline-day-width);
        height: var(--workhub-task-timeline-head-height);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        font-size: 0.54rem;
        color: #89a0c3;
        line-height: 1;
        padding-bottom: 1px;
        user-select: none;
      }
      .workhub-task-timeline-day-head.is-weekend {
        color: #a69bc7;
      }
      .workhub-task-timeline-day-head.is-today {
        color: #1f4f95;
        background: linear-gradient(180deg, rgba(92, 146, 235, 0.16) 0%, rgba(92, 146, 235, 0.06) 100%);
        box-shadow: inset 0 -2px 0 rgba(44, 98, 181, 0.34);
      }
      .workhub-task-timeline-day-head.is-today > span:last-child {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 18px;
        padding: 0 6px;
        border-radius: 999px;
        background: linear-gradient(180deg, #4f8cff 0%, #316ecf 100%);
        color: #ffffff;
        font-weight: 700;
        box-shadow: 0 3px 8px rgba(44, 98, 181, 0.22);
      }
      .workhub-task-timeline-day-head.is-today .workhub-task-timeline-month {
        color: #28589d;
        opacity: 1;
      }
      .workhub-task-timeline-day-head.is-month-start,
      .workhub-task-timeline-day-cell.is-month-start {
        box-shadow: inset 1px 0 0 #8eaedc, inset 2px 0 0 rgba(255, 255, 255, 0.9);
      }
      .workhub-task-timeline-month {
        display: block;
        min-height: 0.64rem;
        font-size: 0.48rem;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #667ea8;
        margin-bottom: 2px;
        opacity: 0;
      }
      .workhub-task-timeline-month.is-visible {
        opacity: 1;
      }
      .workhub-task-timeline-name {
        border: none;
        border-bottom: 1px solid #e5edf9;
        background: #f8fbff;
        text-align: left;
        padding: 6px 10px;
        display: flex;
        align-items: center;
        justify-content: stretch;
        width: 100%;
        min-height: var(--workhub-task-timeline-row-height);
        height: var(--workhub-task-timeline-row-height);
        box-sizing: border-box;
        border-radius: 10px 0 0 10px;
        cursor: pointer;
        transition: background-color 0.12s ease, box-shadow 0.12s ease;
      }
      .workhub-task-timeline-name:hover {
        background: #edf4ff;
      }
      .workhub-task-timeline-name.is-active {
        background: rgba(79, 116, 189, 0.09);
        box-shadow: inset 3px 0 0 #4f74bd;
      }
      .workhub-task-timeline-name.is-active .workhub-task-timeline-name-title {
        color: #173c75;
      }
      .workhub-task-timeline-name.is-warning {
        background: linear-gradient(90deg, rgba(255, 232, 232, 0.94) 0%, #f8fbff 72%);
      }
      .workhub-task-timeline-name-title {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 0.72rem;
        color: #20375c;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-timeline-name-copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .workhub-task-timeline-name-warning {
        display: inline-flex;
        align-items: center;
        max-width: 100%;
        width: fit-content;
        min-width: 0;
        padding: 1px 6px;
        border-radius: 999px;
        background: rgba(210, 54, 54, 0.14);
        color: #b32626;
        font-size: 0.53rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-task-timeline-name-main {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 6px;
        width: 100%;
        min-width: 0;
      }
      .workhub-task-timeline-image-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        border-radius: 999px;
        border: 1px solid #d8e6fa;
        background: #edf4ff;
        color: #2f548c;
        font-size: 0.56rem;
        font-weight: 700;
        line-height: 1;
        padding: 2px 6px;
        white-space: nowrap;
        flex: 0 0 auto;
      }
      .workhub-task-timeline-image-chip.is-on-bar {
        border-color: rgba(255, 255, 255, 0.44);
        background: rgba(33, 44, 62, 0.3);
        color: #ffffff;
        font-size: 0.54rem;
        margin-left: 5px;
      }
      .workhub-task-timeline-image-chip.is-warning {
        margin-left: 8px;
      }
      .workhub-task-timeline-assignee {
        flex: 0 0 auto;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 1px solid #d2deef;
        background: #f1f6ff;
        color: #4f6691;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .workhub-task-timeline-assignee img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 999px;
      }
      .workhub-task-timeline-assignee-fallback {
        font-size: 0.58rem;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .workhub-task-timeline-grid-pane {
        position: relative;
        min-height: 0;
        overflow: auto;
        flex: 1 1 auto;
      }
      .workhub-task-timeline-grid-content {
        position: relative;
        min-height: 100%;
        width: calc(var(--workhub-task-timeline-day-count) * var(--workhub-task-timeline-day-width));
      }
      .workhub-task-timeline-grid-rows {
        position: relative;
        z-index: 1;
      }
      .workhub-task-timeline-grid-overlay {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        display: grid;
        grid-template-columns: repeat(var(--workhub-task-timeline-day-count), var(--workhub-task-timeline-day-width));
        pointer-events: none;
        z-index: 0;
      }
      .workhub-task-timeline-grid-col {
        min-width: var(--workhub-task-timeline-day-width);
        border-right: 1px solid rgba(177, 198, 230, 0.28);
        background: #fbfdff;
      }
      .workhub-task-timeline-grid-col.is-weekend {
        background: #f5f2fb;
      }
      .workhub-task-timeline-grid-col.is-month-start {
        box-shadow: inset 1px 0 0 rgba(120, 156, 213, 0.8), inset 2px 0 0 rgba(255, 255, 255, 0.9);
      }
      .workhub-task-timeline-grid-col.is-today {
        box-shadow: inset 1px 0 0 rgba(35, 91, 173, 0.36), inset -1px 0 0 rgba(35, 91, 173, 0.2), inset 0 0 0 1px rgba(35, 91, 173, 0.2);
        background: linear-gradient(180deg, rgba(79, 140, 255, 0.1) 0%, rgba(79, 140, 255, 0.05) 100%);
      }
      .workhub-task-timeline-grid-row {
        position: relative;
        z-index: 1;
        border-bottom: 1px solid #e5edf9;
        min-height: var(--workhub-task-timeline-row-height);
        height: var(--workhub-task-timeline-row-height);
        transition: background-color 0.12s ease, box-shadow 0.12s ease;
      }
      .workhub-task-timeline-grid-row.is-active {
        background: rgba(79, 116, 189, 0.05);
        box-shadow: inset 0 0 0 1px rgba(79, 116, 189, 0.08);
      }
      .workhub-task-timeline-bar-track {
        position: relative;
        min-height: var(--workhub-task-timeline-row-height);
        height: var(--workhub-task-timeline-row-height);
        min-width: 0;
      }
      .workhub-task-timeline-bar-track.is-active {
        background: rgba(79, 116, 189, 0.035);
      }
      .workhub-task-timeline-bar-track.is-warning {
        display: flex;
        align-items: center;
        padding: 0 8px;
        box-sizing: border-box;
      }
      .workhub-task-timeline-bar-wrap {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: calc(var(--timeline-start-index, 0) * var(--workhub-task-timeline-day-width));
        width: calc(var(--timeline-span-days, 1) * var(--workhub-task-timeline-day-width));
        height: 24px;
        min-width: 12px;
        z-index: 2;
      }
      .workhub-task-timeline-bar {
        width: 100%;
        height: 100%;
        border: 1px solid color-mix(in srgb, var(--task-status-color, #5d84d6) 72%, #ffffff 28%);
        background:
          linear-gradient(135deg,
            color-mix(in srgb, var(--task-status-color, #5d84d6) 46%, #ffffff 54%) 0%,
            color-mix(in srgb, var(--task-status-color, #5d84d6) 68%, #ffffff 32%) 100%);
        border-radius: 4px;
        cursor: grab;
        z-index: 2;
        padding: 0 11px;
        color: #ffffff;
        font-size: 0.58rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        gap: 5px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
        transition: background 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease;
      }
      .workhub-task-timeline-bar.is-active {
        border-color: color-mix(in srgb, var(--task-status-color, #5d84d6) 76%, #eef4ff 24%);
        background:
          linear-gradient(135deg,
            color-mix(in srgb, var(--task-status-color, #5d84d6) 52%, #ffffff 48%) 0%,
            color-mix(in srgb, var(--task-status-color, #5d84d6) 72%, #eef4ff 28%) 100%);
        box-shadow: 0 0 0 1px rgba(79, 116, 189, 0.12), 0 4px 10px rgba(25, 57, 101, 0.1);
      }
      .workhub-task-timeline-bar.is-dragging,
      .workhub-task-timeline-bar:active {
        cursor: grabbing;
      }
      .workhub-task-timeline-bar:hover {
        background:
          linear-gradient(135deg,
            color-mix(in srgb, var(--task-status-color, #5d84d6) 50%, #ffffff 50%) 0%,
            color-mix(in srgb, var(--task-status-color, #5d84d6) 70%, #f4f8ff 30%) 100%);
        border-color: color-mix(in srgb, var(--task-status-color, #5d84d6) 74%, #f1f6ff 26%);
        box-shadow: 0 4px 10px rgba(27, 56, 102, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.24);
      }
      .workhub-task-timeline-bar-label {
        pointer-events: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 1px 5px;
        border-radius: 999px;
        background: rgba(56, 62, 74, 0.42);
        color: #ffffff;
        text-shadow: 0 1px 1px rgba(15, 26, 43, 0.2);
      }
      .workhub-task-timeline-warning-callout {
        max-width: min(340px, 100%);
        border: 1px dashed rgba(197, 63, 63, 0.5);
        border-radius: 8px;
        background: rgba(255, 238, 238, 0.94);
        color: #9f2222;
        padding: 6px 10px;
        font-size: 0.63rem;
        font-weight: 700;
        line-height: 1.25;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: inline-flex;
        align-items: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
      }
      .workhub-task-timeline-warning-callout.is-active {
        border-color: rgba(176, 42, 42, 0.66);
        background: rgba(255, 228, 228, 0.98);
      }
      .workhub-task-timeline-bar-handle {
        position: absolute;
        top: 50%;
        right: 1px;
        transform: translateY(-50%);
        width: 7px;
        height: calc(100% - 4px);
        border: 1px solid rgba(255, 255, 255, 0.7);
        border-radius: 3px;
        background: color-mix(in srgb, var(--task-status-color, #5d84d6) 82%, #ffffff 18%);
        cursor: ew-resize;
        padding: 0;
        opacity: 0.24;
        box-shadow: 0 1px 2px rgba(17, 37, 66, 0.08);
        transition: opacity 0.14s ease, transform 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
      }
      .workhub-task-timeline-bar-handle::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 1px;
        height: 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
      }
      .workhub-task-timeline-bar-handle.is-start {
        left: 1px;
        right: auto;
      }
      .workhub-task-timeline-bar-wrap:hover .workhub-task-timeline-bar-handle,
      .workhub-task-timeline-grid-row.is-active .workhub-task-timeline-bar-handle {
        opacity: 0.9;
        box-shadow: 0 2px 5px rgba(18, 41, 73, 0.18);
      }
      .workhub-task-timeline-bar-handle:hover {
        background: color-mix(in srgb, var(--task-status-color, #5d84d6) 88%, #ffffff 12%);
        transform: translateY(-50%) scaleX(1.04);
      }
      .workhub-task-sections.task-view-list .workhub-task-group {
        width: max(100%, var(--workhub-task-list-min-width));
      }
      .workhub-task-sections.task-view-list .workhub-task-table-head,
      .workhub-task-sections.task-view-list .workhub-task-row-main {
        min-width: var(--workhub-task-list-min-width);
      }
      .workhub-task-detail-rail {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        min-width: 0;
        overflow: hidden;
        border-left: 1px solid #e3ecfb;
        padding-left: 10px;
        position: relative;
      }
      .workhub-task-detail-rail-scroll {
        min-height: 0;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
      .workhub-task-detail-rail-scroll > * {
        flex: 0 0 auto;
      }
      .workhub-task-detail-rail-resize-handle {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 14px;
        border: none;
        background: transparent;
        cursor: col-resize;
        padding: 0;
        z-index: 4;
      }
      .workhub-task-detail-rail-resize-handle::before {
        content: '';
        position: absolute;
        left: 2px;
        top: 8px;
        bottom: 8px;
        width: 2px;
        border-radius: 99px;
        background: #bacde9;
        opacity: 1;
        transition: background-color 0.12s ease, opacity 0.12s ease;
      }
      .workhub-task-detail-rail-resize-handle::after {
        content: '⇆';
        position: absolute;
        left: 0;
        top: 10px;
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 1px solid #c9d8ee;
        background: #f5f9ff;
        color: #6e85ad;
        font-size: 9px;
        line-height: 13px;
        text-align: center;
        pointer-events: none;
      }
      .workhub-task-detail-rail-resize-handle:hover::before,
      .workhub-task-detail-rail-resize-handle.is-active::before {
        background: #9bb5de;
        opacity: 1;
      }
      .workhub-task-detail-rail-resize-handle:hover::after,
      .workhub-task-detail-rail-resize-handle.is-active::after {
        border-color: #9fb6de;
        color: #3f5f93;
        background: #eaf2ff;
      }
      .workhub-task-detail-rail.is-compact {
        padding-left: 8px;
      }
      .workhub-task-detail-rail.is-hidden {
        border-left: none;
        padding-left: 0;
        opacity: 0;
        pointer-events: none;
        overflow: hidden;
      }
      .workhub-task-detail-dialog-backdrop {
        z-index: 180;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .workhub-modal.workhub-task-detail-dialog {
        width: min(1240px, calc(100vw - 40px));
        max-width: 1240px;
        height: min(760px, calc(100vh - 80px));
        max-height: calc(100vh - 80px);
        border-radius: 10px;
        padding: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .workhub-task-detail-dialog-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 12px;
        border-bottom: 1px solid #e4ebf8;
        background: linear-gradient(180deg, #fcfdff 0%, #f5f8fe 100%);
        flex: 0 0 auto;
      }
      .workhub-task-detail-dialog-head-main {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        flex: 1;
      }
      .workhub-task-detail-dialog-head strong {
        font-size: 0.82rem;
        color: #19315b;
        flex-shrink: 0;
      }
      .workhub-task-detail-dialog-breadcrumbs {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        overflow-x: auto;
      }
      .workhub-task-detail-dialog-breadcrumb-node-wrap {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }
      .workhub-task-detail-dialog-breadcrumb-node {
        border: 1px solid #d8e5f8;
        background: #f9fbfe;
        color: #596a84;
        border-radius: 7px;
        min-height: 24px;
        padding: 0 8px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font: inherit;
        font-size: 0.69rem;
        font-weight: 400;
        cursor: pointer;
        max-width: 260px;
      }
      .workhub-task-detail-dialog-breadcrumb-node:hover {
        border-color: #bcd2f5;
        background: #f2f6fd;
      }
      .workhub-task-detail-dialog-breadcrumb-node.is-current {
        border-color: #c5d5ef;
        background: #f3f6fb;
        color: #4d5f79;
      }
      .workhub-task-detail-dialog-breadcrumb-icon {
        flex-shrink: 0;
        color: #7788a1;
        font-size: 0.67rem;
      }
      .workhub-task-detail-dialog-breadcrumb-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-detail-dialog-breadcrumb-sep {
        color: #8aa0c2;
        font-size: 0.8rem;
      }
      .workhub-task-detail-dialog-head-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-task-detail-dialog-head-icon-btn {
        width: 26px;
        min-width: 26px;
        height: 26px;
        min-height: 26px;
        padding: 0;
        border-radius: 8px;
        font-size: 0.78rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
      .workhub-task-detail-dialog-head-icon-btn .workhub-detail-danger-icon {
        font-size: 0.9rem;
      }
      .workhub-task-detail-dialog-head-actions .workhub-detail-delete-task-btn {
        width: 26px;
        min-width: 26px;
        height: 26px;
        min-height: 26px;
      }
      .workhub-task-detail-dialog-body {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        padding: 12px 10px 12px 12px;
        background: #f7faff;
        display: flex;
        flex-direction: column;
      }
      .workhub-task-detail-dialog-body > .workhub-detail-card:first-child {
        margin-top: 0;
      }
      .workhub-task-dialog-layout {
        display: grid;
        grid-template-columns: minmax(0, var(--workhub-task-dialog-details-width, 56%)) 14px minmax(0, calc(100% - var(--workhub-task-dialog-details-width, 56%) - 14px));
        gap: 0;
        flex: 1 1 auto;
        min-height: 0;
        align-items: stretch;
      }
      .workhub-task-dialog-layout.is-resizing {
        cursor: col-resize;
      }
      .workhub-task-dialog-splitter {
        position: relative;
        width: 14px;
        align-self: stretch;
        cursor: col-resize;
        touch-action: none;
        outline: none;
      }
      .workhub-task-dialog-splitter::before {
        content: '';
        position: absolute;
        top: 10px;
        bottom: 10px;
        left: 50%;
        width: 1px;
        transform: translateX(-50%);
        background: #d6e1f2;
        border-radius: 999px;
      }
      .workhub-task-dialog-splitter::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 6px;
        height: 42px;
        transform: translate(-50%, -50%);
        border-radius: 999px;
        background: linear-gradient(180deg, #dbe6f6 0%, #c7d5ea 100%);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);
      }
      .workhub-task-dialog-layout.is-resizing .workhub-task-dialog-splitter::before,
      .workhub-task-dialog-splitter:hover::before,
      .workhub-task-dialog-splitter:focus-visible::before {
        background: #a9bddc;
      }
      .workhub-task-dialog-layout.is-resizing .workhub-task-dialog-splitter::after,
      .workhub-task-dialog-splitter:hover::after,
      .workhub-task-dialog-splitter:focus-visible::after {
        background: linear-gradient(180deg, #cddcf1 0%, #afc3e2 100%);
      }
      .workhub-task-dialog-splitter:focus-visible {
        box-shadow: inset 0 0 0 2px rgba(126, 164, 238, 0.26);
      }
      .workhub-task-dialog-discussion-pane,
      .workhub-task-dialog-details-pane {
        min-height: 0;
        overscroll-behavior: contain;
        min-width: 0;
      }
      .workhub-task-dialog-discussion-pane {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding-left: 12px;
      }
      .workhub-task-dialog-details-pane {
        display: flex;
        flex-direction: column;
        gap: 6px;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0 8px 8px 0;
        scrollbar-gutter: stable;
      }
      .workhub-task-dialog-details-pane::-webkit-scrollbar,
      .workhub-task-dialog-discussion-pane .workhub-comment-list-chat::-webkit-scrollbar {
        width: 10px;
      }
      .workhub-task-dialog-details-pane::-webkit-scrollbar-thumb,
      .workhub-task-dialog-discussion-pane .workhub-comment-list-chat::-webkit-scrollbar-thumb {
        background: #c5d4ea;
        border-radius: 999px;
        border: 2px solid #f7faff;
      }
      .workhub-task-dialog-details-pane::-webkit-scrollbar-track,
      .workhub-task-dialog-discussion-pane .workhub-comment-list-chat::-webkit-scrollbar-track {
        background: transparent;
      }
      .workhub-task-dialog-details-pane .workhub-detail-icon-row {
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
        margin-bottom: 6px;
      }
      .workhub-task-dialog-details-pane .workhub-task-detail-name-field {
        margin-bottom: 8px;
      }
      .workhub-task-dialog-details-pane .workhub-task-details-input {
        min-height: 96px;
      }
      .workhub-task-dialog-details-pane > .workhub-detail-card,
      .workhub-task-dialog-details-pane > .workhub-task-resource-card,
      .workhub-task-dialog-details-pane > .workhub-task-checklist-card,
      .workhub-task-dialog-details-pane > .workhub-discussion-card {
        margin-top: 0;
        border-radius: 8px;
        box-shadow: none;
      }
      .workhub-task-dialog-discussion-pane > .workhub-discussion-card {
        margin-top: 0;
        flex: 1 1 auto;
        min-height: 0;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
      }
      .workhub-task-dialog-discussion-pane .workhub-comment-list-chat {
        flex: 1 1 auto;
        min-height: 0;
        max-height: none !important;
        overflow-y: auto !important;
        padding-right: 6px;
        padding-bottom: 12px;
      }
      .workhub-task-dialog-discussion-pane .workhub-comment-composer {
        margin-top: 0;
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-task-detail-dialog-backdrop {
          padding: 10px;
          align-items: stretch;
        }
        .workhub-modal.workhub-task-detail-dialog {
          width: 100%;
          max-height: 100%;
          border-radius: 12px;
        }
        .workhub-task-detail-dialog-body {
          overflow: auto;
          padding: 10px;
        }
        .workhub-task-dialog-layout {
          grid-template-columns: 1fr;
          height: auto;
        }
        .workhub-task-dialog-splitter {
          display: none;
        }
        .workhub-task-dialog-discussion-pane,
        .workhub-task-dialog-details-pane {
          overflow: visible;
          padding: 0;
        }
        .workhub-task-dialog-details-pane .workhub-detail-icon-row,
        .workhub-detail-meta-grid {
          grid-template-columns: 1fr;
        }
      }
      .workhub-detail-rail-toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        margin-bottom: 2px;
      }
      .workhub-detail-rail-toolbar .workhub-ghost-mini.is-active {
        border-color: #9eb7e1;
        background: #eef4ff;
      }
      .workhub-mobile-detail-drawer-head {
        display: none;
      }
      .workhub-mobile-detail-drawer-handle {
        display: none;
      }
      .workhub-mobile-detail-drawer-title-row {
        display: none;
      }
      .workhub-task-detail-drawer-backdrop {
        display: none;
      }
      .workhub-detail-rail-head {
        position: sticky;
        top: 0;
        z-index: 2;
        border: 1px solid #dbe7ff;
        background: #fbfdff;
        border-radius: 10px;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .workhub-detail-rail-head h3 {
        margin: 0;
        font-size: 0.74rem;
        color: #22324a;
        font-weight: 500;
      }
      .workhub-detail-rail-head span {
        color: #22324a;
        font-size: 0.74rem;
        font-weight: 500;
      }
      .workhub-span-2 {
        grid-column: 1 / -1;
      }
      .workhub-modal-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .workhub-modal-form button {
        margin-top: 16px;
      }
      .workhub-modal-form input:not([type='checkbox']):not([type='radio']),
      .workhub-modal-form textarea,
      .workhub-modal-form select {
        padding: 9px 12px;
      }
      .workhub-status-editor-list button,
      .workhub-status-add-btn {
        margin-top: 0;
      }
      .workhub-summary-strip {
        display: flex;
        flex-wrap: nowrap;
        gap: 12px;
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x;
        overscroll-behavior-x: contain;
        padding-bottom: 4px;
      }
      .workhub-summary-strip + .workhub-summary-strip {
        margin-top: 10px;
      }
      .workhub-summary-tile {
        background: #f9fbff;
        border: 1px solid #e3ecfb;
        border-radius: 10px;
        padding: 12px;
        text-align: center;
        flex: 0 0 160px;
        position: relative;
        transition: transform 0.16s ease, box-shadow 0.08s ease, border-color 0.08s ease, background 0.08s ease;
      }
      .workhub-summary-tile:hover {
        transform: translateY(-1px);
        border-color: #cfdbf5;
        box-shadow: 0 8px 18px rgba(35, 62, 120, 0.08);
        background: #fcfdff;
        transition: transform 0.16s ease;
      }
      .workhub-summary-tile strong {
        display: block;
        margin-bottom: 4px;
        font-size: 1.08rem;
        line-height: 1.1;
        color: #17305b;
        letter-spacing: 0.01em;
      }
      .workhub-summary-strip .workhub-summary-tile:first-child {
        border-color: #c7d7fb;
        background: linear-gradient(180deg, #f4f8ff 0%, #edf4ff 100%);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
      }
      .workhub-summary-strip .workhub-summary-tile:first-child strong {
        font-size: 1.3rem;
        font-weight: 800;
        color: #123a7b;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85);
      }
      .workhub-summary-strip .workhub-summary-tile:first-child::after {
        content: '';
        position: absolute;
        left: 10px;
        right: 10px;
        bottom: 6px;
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(47, 109, 235, 0.15), rgba(47, 109, 235, 0.45), rgba(47, 109, 235, 0.15));
      }
      .workhub-summary-tile span {
        color: #627291;
        font-size: 0.82rem;
      }
      .workhub-panel > .workhub-home-actions {
        margin-top: 12px;
        margin-bottom: 2px;
      }
      .workhub-summary-list {
        display: grid;
        gap: 6px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 10px;
      }
      .workhub-home-template-grid {
        margin-top: 12px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .workhub-home-widget {
        min-height: 120px;
      }
      .workhub-home-widget-note {
        margin: 0;
        color: #53688f;
        font-size: 0.8rem;
        line-height: 1.35;
      }
      .workhub-home-widget.is-good {
        border-color: #c7efd7;
        background: #f4fcf7;
      }
      .workhub-home-widget.is-warn {
        border-color: #ffe3b3;
        background: #fff9ef;
      }
      .workhub-home-widget.is-danger {
        border-color: #ffd0d0;
        background: #fff5f5;
      }
      .workhub-overview-dashboard {
        margin-top: 12px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .workhub-proposal-focus-grid {
        margin-top: 12px;
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 10px;
      }
      .workhub-proposal-focus-card {
        min-height: 220px;
      }
      .workhub-employee-profile-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-employee-profile-head {
        margin-bottom: 2px;
      }
      .workhub-employee-profile-identity {
        display: flex;
        gap: 10px;
        align-items: center;
        border: 1px solid #dbe6fa;
        border-radius: 10px;
        padding: 10px;
        background: #f8fbff;
      }
      .workhub-employee-photo-frame {
        width: 52px;
        height: 52px;
        border-radius: 10px;
        border: 1px solid #d0def6;
        background: #eaf2ff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #224271;
        font-weight: 700;
        overflow: hidden;
        flex: 0 0 auto;
      }
      .workhub-employee-photo-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .workhub-employee-identity-copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .workhub-employee-identity-copy strong {
        color: #173563;
        font-size: 0.9rem;
      }
      .workhub-employee-identity-copy span {
        color: #4f678f;
        font-size: 0.76rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-employee-leave-strip {
        margin-top: 0;
      }
      .workhub-employee-leave-tile {
        border-color: #d6e3f8;
        background: #ffffff;
      }
      .workhub-employee-link-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-proposal-focus-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-proposal-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid #d9e8ff;
        background: #f4f8ff;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 0.7rem;
      }
      .workhub-proposal-chip strong {
        color: #4d648f;
        font-weight: 700;
      }
      .workhub-proposal-chip em {
        color: #1f3763;
        font-style: normal;
        font-weight: 600;
      }
      .workhub-proposal-deadline-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .workhub-proposal-deadline-col {
        border: 1px solid #dfe9fb;
        background: #ffffff;
        border-radius: 8px;
        padding: 7px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-proposal-deadline-col span {
        font-size: 0.68rem;
        color: #5e7397;
      }
      .workhub-proposal-deadline-col strong {
        font-size: 0.79rem;
        color: #21395f;
      }
      .workhub-proposal-deadline-col.is-countdown {
        background: #eff6ff;
      }
      .workhub-proposal-deadline-col.is-countdown.is-over {
        background: #fff0f0;
        border-color: #ffd1d1;
      }
      .workhub-proposal-countdown-track {
        margin-top: -2px;
      }
      .workhub-proposal-countdown-track span {
        background: linear-gradient(90deg, #16a34a, #f59e0b, #ef4444);
      }
      .workhub-proposal-brief {
        margin: 0;
        font-size: 0.78rem;
        line-height: 1.45;
        color: #2e456c;
        background: #f4f8ff;
        border: 1px dashed #d5e5ff;
        border-radius: 8px;
        padding: 8px;
      }
      .workhub-proposal-doc-counters {
        margin: 0;
        gap: 6px;
      }
      .workhub-proposal-doc-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        margin-top: 2px;
      }
      .workhub-proposal-doc-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 8px;
        padding: 6px 8px;
        color: #21406a;
        cursor: pointer;
        text-align: left;
      }
      .workhub-proposal-doc-item:hover {
        background: #f3f8ff;
        border-color: #c9dbff;
      }
      .workhub-proposal-doc-item.is-public-source {
        border-color: #ffd2a2;
        background: #fff7ec;
      }
      .workhub-proposal-doc-item.is-public-source:hover {
        background: #ffefd9;
        border-color: #ffc27e;
      }
      .workhub-proposal-doc-icon {
        font-size: 0.9rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .workhub-proposal-doc-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .workhub-proposal-doc-copy strong {
        font-size: 0.71rem;
        color: #1f3763;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-proposal-doc-copy small {
        font-size: 0.63rem;
        color: #6a7fa0;
      }
      .workhub-proposal-doc-item.is-public-source .workhub-proposal-doc-copy strong {
        color: #9a4a00;
      }
      .workhub-proposal-doc-item.is-public-source .workhub-proposal-doc-copy small {
        color: #b0692b;
      }
      .workhub-proposal-thumb-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 7px;
      }
      .workhub-proposal-thumb {
        margin: 0;
        border: 1px solid #dce8ff;
        background: #fff;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .workhub-proposal-thumb img {
        width: 100%;
        aspect-ratio: 4 / 3;
        object-fit: cover;
        background: #edf3ff;
      }
      .workhub-proposal-thumb figcaption {
        padding: 5px 6px 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .workhub-proposal-thumb figcaption strong {
        font-size: 0.67rem;
        color: #1f3763;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-proposal-thumb figcaption span {
        font-size: 0.62rem;
        color: #6a7fa0;
      }
      .workhub-overview-card {
        border: 1px solid #dde9ff;
        background: #f9fbff;
        border-radius: 10px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 150px;
      }
      .workhub-overview-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-overview-head h3 {
        margin: 0;
        font-size: 0.92rem;
      }
      .workhub-overview-head span {
        color: #5d7095;
        font-size: 0.76rem;
        font-weight: 700;
      }
      .workhub-pipeline-report-note {
        margin: 0;
        color: #5d7095;
        font-size: 0.76rem;
      }
      .workhub-pipeline-report-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-pipeline-report-filter-chip {
        border: 1px solid #d4e3ff;
        border-radius: 999px;
        background: #f3f8ff;
        color: #2a436f;
        min-height: 28px;
        padding: 0 10px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        font-weight: 600;
      }
      .workhub-pipeline-report-filter-chip input {
        margin: 0;
      }
      .workhub-pipeline-report-filter-chip strong {
        font-size: 0.7rem;
        color: #1f3763;
        background: #e2ecff;
        border-radius: 999px;
        min-width: 20px;
        text-align: center;
        padding: 1px 6px;
      }
      .workhub-pipeline-report-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 0.74rem;
        color: #557099;
      }
      .workhub-pipeline-report-summary strong {
        color: #1c3e79;
      }
      .workhub-pipeline-report-total-emphasis {
        border: 2px solid #9dbcf3;
        border-radius: 10px;
        background: #eef5ff;
        padding: 8px 10px;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .workhub-pipeline-report-total-emphasis span {
        color: #325889;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 700;
      }
      .workhub-pipeline-report-total-emphasis strong {
        color: #113267;
        font-size: 1rem;
      }
      .workhub-pipeline-report-table-wrap {
        border: 1px solid #deebff;
        border-radius: 9px;
        background: #fff;
        overflow: auto;
        max-height: 320px;
      }
      .workhub-pipeline-report-table {
        width: 100%;
        min-width: 720px;
        border-collapse: collapse;
      }
      .workhub-pipeline-report-table th,
      .workhub-pipeline-report-table td {
        border-bottom: 1px solid #edf3ff;
        padding: 6px 8px;
        text-align: left;
        font-size: 0.72rem;
        vertical-align: top;
      }
      .workhub-pipeline-report-table th {
        position: sticky;
        top: 0;
        z-index: 1;
        background: #f5f9ff;
        color: #27467c;
        font-weight: 700;
      }
      .workhub-pipeline-report-group-row td {
        background: #eef5ff;
        color: #294678;
        font-weight: 700;
      }
      .workhub-pipeline-report-total-row td {
        background: #f8fbff;
      }
      .workhub-overview-status-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .workhub-overview-status-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-overview-status-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.77rem;
      }
      .workhub-overview-status-label strong {
        margin-left: auto;
        color: #1f3763;
      }
      .workhub-overview-status-bar {
        width: 100%;
        height: 6px;
        border-radius: 99px;
        background: #e9f0ff;
        overflow: hidden;
      }
      .workhub-overview-status-bar span {
        height: 100%;
        display: block;
        border-radius: 99px;
      }
      .workhub-overview-priority-stack {
        display: flex;
        align-items: stretch;
        gap: 0;
        height: 30px;
        overflow: hidden;
        border-radius: 0;
      }
      .workhub-overview-priority-segment {
        border-radius: 0;
        min-width: 12px;
      }
      .workhub-overview-priority-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .workhub-overview-priority-legend span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.74rem;
        color: #51668d;
      }
      .workhub-overview-priority-legend i {
        width: 8px;
        height: 8px;
        border-radius: 99px;
        display: inline-block;
      }
      .workhub-overview-progress-track {
        width: 100%;
        height: 10px;
        border-radius: 99px;
        background: #e5edff;
        overflow: hidden;
      }
      .workhub-overview-progress-track span {
        display: block;
        height: 100%;
        border-radius: 99px;
        background: linear-gradient(90deg, #2563eb 0%, #10b981 100%);
      }
      .workhub-overview-progress-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #5a6f94;
      }
      .workhub-overview-timeline {
        display: flex;
        flex-direction: column;
        gap: 7px;
        max-height: 190px;
        overflow: auto;
        padding-right: 2px;
      }
      .workhub-overview-timeline-item {
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr);
        gap: 7px;
      }
      .workhub-overview-timeline-item .timeline-dot {
        width: 8px;
        height: 8px;
        border-radius: 99px;
        background: #4f7cff;
        margin-top: 4px;
      }
      .workhub-overview-timeline-item strong {
        font-size: 0.77rem;
      }
      .workhub-overview-timeline-item p {
        margin: 2px 0;
        font-size: 0.75rem;
        color: #5b6f95;
      }
      .workhub-overview-timeline-item small {
        color: #7488ad;
        font-size: 0.7rem;
      }
      .workhub-overview-card-full {
        grid-column: 1 / -1;
        min-height: auto;
      }
      .workhub-team-activity-wrap {
        max-height: 280px;
        overflow-y: auto;
        overflow-x: auto;
        border: 1px solid #e8eff5;
        border-radius: 8px;
        padding: 6px 8px 6px 0;
        background: #f5f9fd;
        scrollbar-gutter: stable;
      }
      .workhub-team-activity-grid {
        display: grid;
        gap: 3px;
        width: max-content;
        min-width: max-content;
        align-items: center;
        padding-right: 6px;
      }
      .workhub-tah-label-cell {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-right: 6px;
        padding-left: 6px;
        overflow: hidden;
        min-height: 18px;
        position: sticky;
        left: 0;
        z-index: 2;
        background: #f5f9fd;
      }
      .workhub-tah-avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #c6d8f4;
        color: #1a3f6f;
        font-size: 0.58rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        text-transform: uppercase;
      }
      .workhub-tah-name {
        font-size: 0.74rem;
        color: #2c4270;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
      }
      .workhub-tah-total {
        font-size: 0.66rem;
        color: #8aa8cc;
        flex-shrink: 0;
      }
      .workhub-tah-day-head {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        font-size: 0.58rem;
        color: #9ab0cc;
        text-align: center;
        line-height: 1;
        padding-bottom: 2px;
        user-select: none;
        min-width: 32px;
        min-height: 24px;
        position: relative;
      }
      .workhub-tah-day-head.is-weekend {
        color: #b0a0cc;
      }
      .workhub-tah-day-head.is-month-start,
      .workhub-tah-cell.is-month-start {
        box-shadow: inset 1px 0 0 #8eaedc, inset 2px 0 0 rgba(255, 255, 255, 0.9);
      }
      .workhub-tah-month-label {
        display: block;
        min-height: 0.68rem;
        font-size: 0.5rem;
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #6c83ad;
        margin-bottom: 2px;
        opacity: 0;
      }
      .workhub-tah-month-label.is-visible {
        opacity: 1;
      }
      .workhub-tah-cell {
        width: 32px;
        height: 14px;
        border-radius: 3px;
        background: #eef3fc;
        cursor: default;
        transition: opacity 0.1s;
      }
      .workhub-tah-cell.is-weekend {
        background: #e6e2f0;
      }
      .workhub-tah-cell.lv1 { background: #c5d8f5; }
      .workhub-tah-cell.lv2 { background: #7faee6; }
      .workhub-tah-cell.lv3 { background: #3a7bd4; }
      .workhub-tah-cell.lv4 { background: #1355ae; }
      .workhub-tah-cell.lv1.is-weekend { background: #b8cce8; }
      .workhub-tah-cell.lv2.is-weekend { background: #6f98cc; }
      .workhub-tah-cell.lv3.is-weekend { background: #2e66b8; }
      .workhub-tah-cell.lv4.is-weekend { background: #0f438a; }
      .workhub-project-risk-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
        max-height: none;
        overflow: visible;
      }
      .workhub-project-risk-item {
        width: 100%;
        border: 1px solid #dce7fb;
        border-radius: 9px;
        background: #fbfdff;
        padding: 8px;
        text-align: left;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-project-risk-item:hover {
        background: #f4f8ff;
      }
      .workhub-project-risk-item.is-near-deadline {
        border-color: #f3b66a;
        background: #fff8ef;
      }
      .workhub-project-risk-item-main {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-project-risk-title-wrap {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .workhub-project-risk-item-main strong {
        font-size: 0.78rem;
        color: #1c345f;
        line-height: 1.3;
      }
      .workhub-project-risk-client {
        font-size: 0.68rem;
        color: #64769c;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-project-risk-priority-chip {
        font-size: 0.66rem;
        font-weight: 700;
        border-radius: 999px;
        padding: 3px 7px;
        border: 1px solid #cfdcf5;
        background: #eef4ff;
        color: #34598e;
        white-space: nowrap;
      }
      .workhub-project-risk-priority-chip.priority-critical {
        border-color: #efb2b2;
        background: #ffeaea;
        color: #9b1c1c;
      }
      .workhub-project-risk-priority-chip.priority-high {
        border-color: #f8d1a1;
        background: #fff3e3;
        color: #9a4a05;
      }
      .workhub-project-risk-meta-row {
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr) 52px;
        gap: 8px;
        align-items: center;
      }
      .workhub-project-risk-calendar {
        border: 1px solid #d8e5fb;
        background: #ffffff;
        border-radius: 8px;
        padding: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }
      .workhub-project-risk-calendar-head {
        width: 100%;
        border-radius: 5px;
        background: #e9f1ff;
        color: #2f5695;
        font-size: 0.55rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-align: center;
        padding: 1px 0;
      }
      .workhub-project-risk-calendar-date {
        font-size: 0.64rem;
        color: #24467b;
        font-weight: 700;
      }
      .workhub-project-risk-date-wrap {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .workhub-project-risk-date-wrap > span {
        font-size: 0.65rem;
        color: #66799f;
      }
      .workhub-project-risk-date-values {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-project-risk-date-values span {
        font-size: 0.73rem;
        color: #24467b;
        font-weight: 700;
      }
      .workhub-project-risk-clock {
        --wh-risk-progress: 30%;
        width: 50px;
        height: 50px;
        border-radius: 999px;
        background: conic-gradient(#f59e0b var(--wh-risk-progress), #e7eefc 0);
        position: relative;
        display: grid;
        place-items: center;
      }
      .workhub-project-risk-clock::before {
        content: '';
        position: absolute;
        inset: 5px;
        border-radius: 999px;
        background: #ffffff;
      }
      .workhub-project-risk-clock span {
        position: relative;
        z-index: 1;
        font-size: 0.66rem;
        color: #27477d;
        font-weight: 800;
      }
      .workhub-project-risk-clock.is-overdue {
        background: conic-gradient(#dc2626 var(--wh-risk-progress), #f5d4d4 0);
      }
      .workhub-project-risk-progress-track {
        width: 100%;
        height: 5px;
        border-radius: 999px;
        background: #e6eefc;
        overflow: hidden;
      }
      .workhub-project-risk-progress-track span {
        height: 100%;
        display: block;
        border-radius: 999px;
        background: linear-gradient(90deg, #3b82f6 0%, #f59e0b 100%);
      }
      .workhub-project-risk-countdown {
        font-size: 0.7rem;
        color: #63779c;
      }
      .workhub-ltr-token {
        direction: ltr;
        unicode-bidi: isolate;
        display: inline-block;
      }
      .workhub-user-management-tools {
        display: flex;
        align-items: flex-end;
        gap: 8px;
      }
      .workhub-user-management-tools label {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-user-management-tools label span {
        font-size: 0.7rem;
        color: #6b7ea3;
        font-weight: 700;
      }
      .workhub-user-management-tools select {
        min-width: 200px;
      }
      .workhub-client-layout {
        display: grid;
        grid-template-columns: minmax(240px, 0.9fr) minmax(0, 1.5fr);
        gap: 10px;
        margin-top: 8px;
      }
      .workhub-client-list {
        border: 1px solid #e0eafb;
        border-radius: 10px;
        background: #fafcff;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 520px;
        overflow: auto;
      }
      .workhub-client-list-item {
        width: 100%;
        border: 1px solid #dce7fb;
        border-radius: 8px;
        background: #ffffff;
        padding: 8px;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 3px;
        cursor: pointer;
      }
      .workhub-client-list-item.is-active {
        border-color: #6d95ea;
        background: #eef4ff;
      }
      .workhub-client-list-item strong {
        font-size: 0.78rem;
        color: #1f3766;
      }
      .workhub-client-list-item span {
        font-size: 0.72rem;
        color: #60739a;
      }
      .workhub-client-list-item small {
        font-size: 0.67rem;
        color: #7f90ae;
      }
      .workhub-client-workspace-label {
        font-size: 0.66rem;
        font-weight: 700;
        color: #4d6390;
      }
      .workhub-client-form {
        gap: 10px;
        margin-top: 0;
      }
      .workhub-client-logo-preview {
        border: 1px dashed #d6e4fc;
        background: #f7fbff;
        border-radius: 8px;
        padding: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-client-logo-preview img {
        max-height: 44px;
        max-width: 190px;
        object-fit: contain;
      }
      .workhub-client-logo-upload-row {
        align-items: center;
        gap: 8px;
      }
      .workhub-client-logo-upload-btn {
        margin-top: 0;
      }
      .workhub-client-quick-add {
        align-items: stretch;
        flex-wrap: nowrap;
      }
      .workhub-client-quick-add input {
        min-width: 200px;
        flex: 1 1 auto;
      }
      .workhub-client-quick-add button {
        margin-top: 0;
        white-space: nowrap;
        flex: 0 0 auto;
      }
      .workhub-project-card-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
      }
      .workhub-project-card.compact-card {
        height: 96px;
        padding: 10px 12px;
        border: 1px solid #d7e4fb;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(25, 49, 90, 0.05);
      }
      .workhub-project-card.compact-card.is-clickable {
        cursor: pointer;
        transition: border-color 0.08s ease, box-shadow 0.08s ease, background 0.08s ease;
      }
      .workhub-project-card.compact-card.is-clickable:hover {
        border-color: #b2c8ef;
        background: #f7f9ff;
        box-shadow: 0 4px 12px rgba(42, 73, 128, 0.1);
        transition: none;
      }
      .workhub-project-card.compact-card.is-clickable:focus-visible {
        outline: 2px solid #8aaef1;
        outline-offset: 1px;
      }
      .workhub-project-card.compact-card.is-category-card {
        border: 1px solid color-mix(in srgb, var(--workhub-category-accent, #8aaef1) 40%, #dce7fb 60%);
        border-left: 3px solid var(--workhub-category-accent, #8aaef1);
        background: #ffffff;
        min-height: 96px;
        display: flex;
        align-items: stretch;
        border-radius: 10px;
      }
      .workhub-project-card.compact-card.is-category-card.is-proposal-card {
        min-height: 118px;
      }
      .workhub-project-card.compact-card.is-category-card:hover {
        border-color: color-mix(in srgb, var(--workhub-category-accent, #8aaef1) 65%, #c9d8f4 35%);
        background: #f7f9ff;
      }
      .workhub-inline-children-block {
        margin-top: 10px;
        border: 1px solid #dbe6f6;
        border-radius: 12px;
        background: #fbfdff;
        padding: 8px;
      }
      .workhub-inline-children-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .workhub-inline-children-head h3 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 800;
        color: #1d3969;
      }
      .workhub-category-card-title-row {
        width: 100%;
        align-items: flex-start;
        gap: 10px;
        flex-wrap: nowrap;
      }
      .workhub-project-category-icon {
        width: 20px;
        height: 20px;
        border-radius: 5px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--workhub-category-accent, #8aaef1) 12%, #ffffff 88%);
        color: #24467b;
        font-size: 0.75rem;
        flex-shrink: 0;
      }
      .workhub-category-card-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1 1 auto;
      }
      .workhub-category-card-copy strong {
        font-size: 0.84rem;
        line-height: 1.15;
        color: #1f3766;
      }
      .workhub-category-card-headline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-project-card-minimal-layout {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 0;
      }
      .workhub-project-card-minimal-layout .workhub-project-title-row {
        width: 100%;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 6px;
        flex-wrap: nowrap;
        overflow: hidden;
        flex: 1 1 auto;
      }
      .workhub-project-card-minimal-layout .workhub-project-title-row strong {
        font-size: 0.78rem;
        font-weight: 600;
        line-height: 1.25;
        color: #1c3462;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        white-space: normal;
        min-width: 0;
        flex: 1 1 0;
      }
      .workhub-project-card.compact-card.is-category-card.is-proposal-card .workhub-project-title-row {
        flex: 0 0 auto;
      }
      .workhub-project-card.compact-card.is-category-card.is-proposal-card .workhub-project-title-row strong {
        line-height: 1.3;
      }
      .workhub-project-card-days-left {
        display: block;
        margin-top: 5px;
        font-size: 0.68rem;
        font-weight: 800;
        color: #254f88;
        white-space: nowrap;
      }
      .workhub-project-card-days-left.is-near {
        color: #b4232f;
      }
      .workhub-project-card-days-left.is-overdue {
        color: #a01822;
      }
      .workhub-project-card-date {
        display: block;
        margin-top: 1px;
        font-size: 0.59rem;
        color: #6f85a6;
        white-space: nowrap;
      }
      .workhub-project-card-progress-row {
        display: flex;
        align-items: center;
        gap: 7px;
        flex-shrink: 0;
        padding-top: 8px;
      }
      .workhub-project-card.compact-card.is-category-card.is-proposal-card .workhub-project-card-progress-row {
        margin-top: auto;
        padding-top: 10px;
      }
      .workhub-project-card-value-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
        margin-top: auto;
        padding-top: 10px;
      }
      .workhub-project-card-value-label {
        font-size: 0.58rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #7a8fad;
      }
      .workhub-project-card-value-text {
        font-size: 0.72rem;
        font-weight: 800;
        color: #1f3f70;
        white-space: nowrap;
      }
      .workhub-project-card-progress-track {
        flex: 1 1 auto;
        height: 3px;
        border-radius: 2px;
        background: #e4edfb;
        overflow: hidden;
      }
      .workhub-project-card-progress-fill {
        height: 100%;
        border-radius: 2px;
        background: #7b9dcc;
        transition: width 0.3s ease;
      }
      .workhub-project-card-progress-fill.is-complete {
        background: #6baa86;
      }
      .workhub-project-card-progress-pct {
        font-size: 0.6rem;
        font-weight: 600;
        color: #7a8fad;
        white-space: nowrap;
        flex-shrink: 0;
        min-width: 22px;
        text-align: right;
        letter-spacing: 0.01em;
      }
      .workhub-project-card-progress-pct.is-complete {
        color: #4f8e63;
      }
      .workhub-project-card-nested {
        margin-top: 7px;
        padding-left: 8px;
        border-left: 2px solid #e2ebfb;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-project-card-nested .workhub-project-card.compact-card {
        margin: 0;
        background: #fbfdff;
        border-color: #e3ebf9;
      }
      .workhub-project-title-row,
      .workhub-task-row-title {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-project-title-row.spaced {
        justify-content: space-between;
        margin-bottom: 5px;
      }
      .workhub-inline-attachment-indicator,
      .workhub-tree-node-attachment-indicator,
      .workhub-tree-doc-attachment-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 999px;
        background: #eef4ff;
        color: #2b4f86;
        font-size: 0.58rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .workhub-task-row-title.detail-title {
        flex-wrap: nowrap;
        align-items: center;
        gap: 7px;
      }
      .workhub-task-row-title.detail-title .workhub-project-dot {
        align-self: center;
      }
      .workhub-task-row-title.detail-title h3 {
        margin: 0;
      }
      .workhub-project-properties-title {
        font-size: 0.74rem;
        font-weight: 500;
        letter-spacing: 0.01em;
        color: #1d3a67;
      }
      .workhub-project-dot {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        flex-shrink: 0;
        margin-top: 3px;
      }
      .workhub-project-dot.is-root {
        width: 11px;
        height: 11px;
        box-shadow:
          0 0 0 2px #ffffff,
          0 0 0 3px rgba(122, 141, 169, 0.3),
          0 2px 6px rgba(32, 45, 70, 0.2);
      }
      .workhub-tree-node.is-active .workhub-project-dot.is-root {
        box-shadow:
          0 0 0 2px #ffffff,
          0 0 0 3px rgba(94, 122, 169, 0.45),
          0 3px 8px rgba(30, 51, 86, 0.24);
      }
      .workhub-detail-card p {
        margin: 12px 0;
        line-height: 1.4;
        color: #22324a;
        font-size: 0.74rem;
        font-weight: 500;
      }
      .workhub-danger-zone {
        margin-top: 10px;
        border: 1px solid #f3cccc;
        background: #fff7f7;
        border-radius: 11px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-danger-zone h3 {
        margin: 0;
        font-size: 0.88rem;
        color: #a33636;
      }
      .workhub-danger-zone p {
        margin: 0;
        font-size: 0.74rem;
        color: #8c4a4a;
      }
      .workhub-checkline {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .workhub-checkline input {
        width: 15px;
        height: 15px;
      }
      .workhub-project-card strong,
      .workhub-project-focus-card strong,
      .workhub-member-main strong,
      .workhub-comment-item strong,
      .workhub-activity-item strong,
      .workhub-task-row-title strong,
      .workhub-task-row-title h3 {
        color: #17305c;
        font-size: 0.8rem;
        line-height: 1.15;
      }
      .workhub-task-row-title strong,
      .workhub-task-row-title h3 {
        font-size: 0.74rem;
        line-height: 1.2;
        font-weight: 400;
      }
      .workhub-member-main span,
      .workhub-comment-item span,
      .workhub-activity-item span,
      .workhub-detail-meta span,
      .workhub-task-row-meta span,
      .workhub-meta-line {
        color: #647392;
        font-size: 0.8rem;
        line-height: 1.25;
      }
      .workhub-member-row {
        justify-content: space-between;
      }
      .workhub-member-row.compact-row {
        align-items: flex-start;
      }
      .workhub-member-main {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .workhub-task-row-quick-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .workhub-task-row-quick-actions select {
        font-size: 0.65rem;
        padding: 2px 4px;
        border-radius: 3px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        min-width: 60px;
        max-width: 80px;
      }
      .workhub-task-row-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        justify-content: space-between;
      }
      .workhub-task-row-inline input[type="checkbox"] {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .workhub-task-row-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }
      .workhub-checklist-toggle {
        border: 1px solid #d8e4fa;
        background: #f8fbff;
        color: #2f4f84;
        border-radius: 6px;
        padding: 2px 6px;
        font: inherit;
        font-size: 0.66rem;
        line-height: 1.1;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
      .workhub-checklist-meta {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: 6px;
        font-size: 0.68rem;
        color: #5772a3;
      }
      .workhub-checklist-meta span {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 1px 4px;
        border-radius: 8px;
        background: #edf3ff;
      }
      .workhub-task-checklist {
        border-top: 1px dashed #d8e4fa;
        margin-top: 6px;
        padding-top: 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-checklist-empty {
        font-size: 0.72rem;
        color: #657493;
      }
      .workhub-checklist-items {
        display: flex;
        flex-direction: column;
        gap: 0;
        margin-left: 0;
        padding-left: 0;
        border-left: none;
      }
      .workhub-checklist-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 8px;
        border-bottom: 1px solid #f0f4ff;
      }
      .workhub-checklist-item-wrap {
        display: flex;
        flex-direction: column;
      }
      .workhub-checklist-item:last-child {
        border-bottom: none;
      }
      .workhub-checklist-item.even {
        background: #ffffff;
      }
      .workhub-checklist-item.odd {
        background: #f9fbff;
      }
      .workhub-checklist-left {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
      }
      .workhub-checklist-item-main {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex: 1;
        width: 100%;
        justify-content: flex-start;
        text-align: left;
      }
      .workhub-checklist-item-value {
        margin-left: auto;
        font-size: 0.64rem;
        font-weight: 700;
        color: #2f5b9a;
        background: #eef4ff;
        border: 1px solid #d5e2f8;
        border-radius: 999px;
        padding: 1px 7px;
        white-space: nowrap;
      }
      .workhub-checklist-left input[type="checkbox"] {
        margin: 0;
        flex: 0 0 14px;
      }
      .workhub-checklist-item-text {
        margin: 0;
        font-size: 0.74rem;
        color: #2c3f63;
        font-weight: 500;
        text-align: left;
        flex: 1;
      }
      .workhub-checklist-item-text.is-checked {
        text-decoration: line-through;
        color: #7c8ba6;
      }
      .workhub-checklist-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.15s;
        flex-shrink: 0;
      }
      .workhub-checklist-item:hover .workhub-checklist-actions {
        opacity: 1;
      }
      .workhub-task-detail-rail .workhub-checklist-actions {
        opacity: 1;
      }
      .workhub-checklist-edit,
      .workhub-checklist-expand,
      .workhub-checklist-remove {
        border: none;
        background: transparent;
        padding: 2px;
        border-radius: 3px;
        cursor: pointer;
        line-height: 1;
        font-size: 0.8rem;
        transition: background-color 0.15s;
      }
      .workhub-checklist-edit:hover {
        background: #e3ecfb;
      }
      .workhub-checklist-expand:hover {
        background: #eef4ff;
      }
      .workhub-checklist-remove:hover {
        background: #ffebee;
      }
      .workhub-checklist-add {
        display: flex;
        gap: 6px;
      }
      .workhub-checklist-add input {
        min-width: 0;
      }
      .workhub-checklist-add button {
        width: auto;
        border: 1px solid #d8e4fa;
        background: #f3f7ff;
        color: #3b5ba9;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.72rem;
        font-weight: 500;
        cursor: pointer;
      }
      .workhub-checklist-edit-input {
        min-width: 0;
        flex: 1;
        background: #ffffff;
        border: 1px solid #d8e4fa;
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 0.74rem;
        color: #2c3f63;
        font-weight: 500;
      }
      .workhub-checklist-edit-input:focus {
        outline: 1px solid #2f4f84;
        outline-offset: 0;
        box-shadow: none;
      }

      /* Checklist item value input (finance mode) */
      .workhub-checklist-value-input {
        width: 76px;
        height: 22px;
        padding: 0 6px;
        border: 1px solid #c8d9f0;
        border-radius: 5px;
        background: #f4f8ff;
        font-size: 0.7rem;
        color: #2c3f63;
        text-align: right;
        flex-shrink: 0;
        appearance: textfield;
      }
      .workhub-checklist-value-input::-webkit-inner-spin-button,
      .workhub-checklist-value-input::-webkit-outer-spin-button { -webkit-appearance: none; }
      .workhub-checklist-value-input:focus {
        outline: 1px solid #2f4f84;
        outline-offset: 0;
        background: #fff;
      }
      .workhub-checklist-value-input-wrap {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 1px solid #c8d9f0;
        border-radius: 5px;
        background: #f4f8ff;
        padding: 0 5px;
        height: 22px;
      }
      .workhub-checklist-value-prefix {
        font-size: 0.63rem;
        font-weight: 700;
        color: #5f789f;
        line-height: 1;
        white-space: nowrap;
      }
      .workhub-checklist-value-input-wrap .workhub-checklist-value-input {
        width: 64px;
        border: 0;
        background: transparent;
        height: 20px;
        padding: 0;
      }
      .workhub-checklist-value-input-wrap .workhub-checklist-value-input:focus {
        outline: none;
        background: transparent;
      }

      /* Finance block in task detail panel */
      .workhub-task-finance-block {
        background: #f0f5ff;
        border: 1px solid #d0dff5;
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 2px;
      }
      .workhub-task-finance-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .workhub-task-finance-label {
        font-size: 0.72rem;
        font-weight: 700;
        color: #1d3d6a;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .workhub-task-finance-currency {
        font-size: 0.7rem;
        font-weight: 600;
        color: #5a7090;
        background: #dde9fc;
        padding: 2px 8px;
        border-radius: 4px;
      }
      .workhub-task-finance-inputs {
        display: grid;
        grid-template-columns: 1fr 80px;
        gap: 8px;
      }
      .workhub-task-finance-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-task-finance-field > span {
        font-size: 0.67rem;
        color: #8fa0bc;
        font-weight: 500;
      }
      .workhub-task-finance-field input {
        border: 1px solid #c8d9f0;
        border-radius: 6px;
        background: #fff;
        padding: 5px 8px;
        font-size: 0.8rem;
        color: #17305c;
        width: 100%;
      }
      .workhub-task-finance-field input:focus {
        outline: 1px solid #2f4f84;
        outline-offset: 0;
      }
      .workhub-task-finance-summary {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-task-finance-track {
        width: 100%;
        height: 6px;
        appearance: none;
        -webkit-appearance: none;
        background: #dde9fc;
        border-radius: 3px;
        overflow: hidden;
        border: none;
      }
      .workhub-task-finance-track::-webkit-progress-bar {
        background: #dde9fc;
        border-radius: 3px;
      }
      .workhub-task-finance-track::-webkit-progress-value {
        height: 100%;
        background: #3b82f6;
        border-radius: 3px;
      }
      .workhub-task-finance-track::-moz-progress-bar {
        background: #3b82f6;
        border-radius: 3px;
      }
      .workhub-task-finance-track.is-over::-webkit-progress-value {
        background: #ef4444;
      }
      .workhub-task-finance-track.is-over::-moz-progress-bar {
        background: #ef4444;
      }
      .workhub-task-finance-pills {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-finance-pill {
        font-size: 0.68rem;
        padding: 2px 9px;
        border-radius: 999px;
        font-weight: 500;
      }
      .workhub-finance-pill.used { background: #ddeeff; color: #2563eb; }
      .workhub-finance-pill.remaining { background: #dcfce7; color: #16a34a; }
      .workhub-finance-pill.remaining.over { background: #fee2e2; color: #dc2626; }
      .workhub-task-finance-hint {
        font-size: 0.66rem;
        color: #9fb0c8;
        margin: 0;
      }

      /* Finance chip on task row cards */
      .workhub-task-finance-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 7px;
        border-radius: 6px;
        background: #e8f0fe;
        font-size: 0.65rem;
        color: #2c5fcc;
        cursor: default;
        flex-shrink: 0;
      }
      .workhub-task-finance-chip.is-over { background: #fee2e2; color: #c0392b; }
      .workhub-finance-chip-total { font-weight: 600; }
      .workhub-finance-chip-bar {
        width: 34px;
        height: 4px;
        background: #c2d4f7;
        border-radius: 2px;
        overflow: hidden;
      }
      .workhub-finance-chip-fill {
        height: 100%;
        background: #3b82f6;
        border-radius: 2px;
      }

      .workhub-project-folder-notify-card {
        margin-top: 12px;
        padding: 10px;
        border-radius: 9px;
        border: 1px solid #d9e5f6;
        background: #f8fbff;
        display: grid;
        gap: 8px;
      }
      .workhub-project-folder-notify-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-project-folder-notify-head > span {
        font-size: 0.8rem;
        font-weight: 700;
        color: #1c3860;
      }
      .workhub-project-folder-notify-head > small {
        font-size: 0.67rem;
        color: #62789f;
      }
      .workhub-project-folder-notify-toggle,
      .workhub-project-folder-notify-grid > label {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .workhub-project-folder-notify-toggle span,
      .workhub-project-folder-notify-grid > label span {
        font-size: 0.74rem;
        color: #2e4468;
      }
      .workhub-project-folder-notify-grid {
        display: grid;
        gap: 6px;
      }
      .workhub-project-folder-notify-delivery {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .workhub-project-folder-notify-delivery > span {
        font-size: 0.72rem;
        color: #4f668b;
        min-width: 56px;
      }
      .workhub-project-folder-notify-delivery > select {
        flex: 1;
      }

      /* Per-folder status editor in project settings */
      .workhub-project-statuses-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-project-statuses-header {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .workhub-project-statuses-title {
        font-size: 0.78rem;
        font-weight: 600;
        color: #2c3f63;
      }
      .workhub-project-statuses-inherit-badge {
        font-size: 0.68rem;
        background: #e8f0fe;
        color: #4472c4;
        padding: 2px 8px;
        border-radius: 5px;
      }
      .workhub-project-statuses-custom-badge {
        font-size: 0.68rem;
        background: #dcfce7;
        color: #166534;
        padding: 2px 8px;
        border-radius: 5px;
      }
      .workhub-project-statuses-inherit-preview {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
      }
      .workhub-project-statuses-inherit-chip {
        font-size: 0.67rem;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid;
        font-weight: 500;
      }
      .workhub-project-statuses-override-btn {
        font-size: 0.68rem;
        padding: 3px 10px;
        border: 1px solid #b0c8f0;
        border-radius: 5px;
        background: #fff;
        color: #2c5fcc;
        cursor: pointer;
        margin-left: 4px;
      }
      .workhub-project-statuses-override-btn:hover { background: #e8f0fe; }
      .workhub-project-statuses-custom-editor {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-project-status-row {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .workhub-project-status-color-input {
        width: 32px;
        height: 26px;
        padding: 1px 2px;
        border: 1px solid #c8d9f0;
        border-radius: 4px;
        cursor: pointer;
        flex-shrink: 0;
      }
      .workhub-project-status-label-input {
        flex: 1;
        min-width: 0;
        border: 1px solid #c8d9f0;
        border-radius: 5px;
        padding: 4px 8px;
        font-size: 0.78rem;
        color: #17305c;
      }
      .workhub-project-status-label-input:focus { outline: 1px solid #2f4f84; outline-offset: 0; }
      .workhub-project-status-remove-btn {
        padding: 2px 8px;
        font-size: 0.8rem;
        line-height: 1;
        min-width: 0;
      }
      .workhub-project-statuses-actions {
        display: flex;
        gap: 8px;
        margin-top: 4px;
        flex-wrap: wrap;
      }
      .workhub-project-status-add-btn {
        font-size: 0.72rem;
        padding: 3px 10px;
      }
      .workhub-task-title-edit-input {
        width: 100%;
        min-width: 0;
        border: 1px solid #d8e4fa;
        border-radius: 9px;
        background: #ffffff;
        color: #17305c;
        font-size: 0.82rem;
        font-weight: 400;
        line-height: 1.3;
        padding: 7px 9px;
      }
      .workhub-task-title-edit-input:focus {
        outline: 1px solid #2f4f84;
        outline-offset: 0;
        box-shadow: none;
      }
      .workhub-checklist-item-details {
        border-left: 2px solid #dfe9ff;
        margin: 4px 0 8px 20px;
        padding: 8px 10px;
        background: #f8fbff;
        border-radius: 6px;
      }
      .workhub-checklist-detail-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 8px;
      }
      .workhub-checklist-detail-field span {
        font-size: 0.72rem;
        color: #5f6f90;
        font-weight: 600;
      }
      .workhub-checklist-detail-field textarea {
        min-height: 54px;
        resize: vertical;
      }
      .workhub-checklist-url-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 6px;
      }
      .workhub-checklist-url-row input {
        min-width: 0;
        flex: 1;
      }
      .workhub-task-attachment-title-input {
        flex: 0 0 34%;
      }
      .workhub-checklist-url-row button {
        width: auto;
      }
      .workhub-checklist-url-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 6px;
        min-width: 0;
      }
      .workhub-checklist-url-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding: 3px 5px;
        border: 1px solid #e2ebff;
        border-radius: 4px;
        background: #ffffff;
        min-width: 0;
      }
      .workhub-checklist-url-item a {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-image-item {
        align-items: center;
      }
      .workhub-task-image-link {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
      }
      .workhub-inline-video-player {
        display: grid;
        gap: 8px;
        width: 100%;
        min-width: 0;
        flex: 1;
      }
      .workhub-inline-video-element {
        width: 100%;
        max-height: 240px;
        border: 1px solid #d8e4f7;
        border-radius: 8px;
        background: #0f172a;
      }
      .workhub-attachment-preview-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
        width: 100%;
        padding: 0;
        border: none;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }
      .workhub-task-image-link span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-attachment-copy {
        display: flex;
        flex-direction: column;
        min-width: 0;
        flex: 1;
      }
      .workhub-attachment-copy strong {
        font-size: 0.78rem;
        color: #1f3f73;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-attachment-copy small {
        font-size: 0.68rem;
        color: #6f7f9f;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-attachment-inline-editor {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 5px;
        flex: 1;
        min-width: 0;
      }
      .workhub-attachment-inline-editor input {
        width: 100%;
      }
      .workhub-attachment-item-actions {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.12s ease;
        flex: 0 0 auto;
      }
      .workhub-checklist-url-item:hover .workhub-attachment-item-actions,
      .workhub-checklist-url-item:focus-within .workhub-attachment-item-actions,
      .workhub-attachment-item-actions.is-visible {
        opacity: 1;
        pointer-events: auto;
      }
      .workhub-checklist-url-item.is-editing {
        align-items: flex-start;
      }
      .workhub-checklist-url-item.is-editing .workhub-attachment-item-actions {
        opacity: 1;
        pointer-events: auto;
      }
      .workhub-link-hero {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
      }
      .workhub-link-copy strong {
        font-size: 0.58rem;
      }
      .workhub-link-copy small {
        font-size: 0.5rem;
        color: #7a8ba8;
      }
      .workhub-link-meta {
        display: none;
      }
      .workhub-link-item-actions {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        flex: 0 0 auto;
      }
      .workhub-link-item-actions button {
        width: 20px;
        height: 20px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-task-image-thumb {
        width: 30px;
        height: 30px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        flex-shrink: 0;
      }
      .workhub-task-attachment-editor {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
        overflow: hidden;
      }
      .workhub-attachment-drop-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 14px 10px;
        border: 1.5px dashed #c0d0ee;
        border-radius: 9px;
        background: #f7faff;
        cursor: pointer;
        text-align: center;
        transition: background 0.15s ease, border-color 0.15s ease;
        margin-bottom: 4px;
        outline: none;
        user-select: none;
      }
      .workhub-attachment-drop-zone:hover,
      .workhub-attachment-drop-zone:focus-visible,
      .workhub-attachment-drop-zone.is-drag-over {
        background: #eef4ff;
        border-color: #4f8cff;
        border-style: solid;
      }
      .workhub-attachment-drop-zone.is-drag-over {
        background: #deeaff;
      }
      .workhub-attachment-drop-icon {
        font-size: 1.4rem;
        line-height: 1;
      }
      .workhub-attachment-drop-label {
        font-size: 0.68rem;
        color: #5b73a0;
        font-weight: 500;
        line-height: 1.3;
      }
      .workhub-attachment-drop-queued {
        font-size: 0.65rem;
        color: #2a6fcc;
        font-weight: 600;
        background: #deeaff;
        border-radius: 6px;
        padding: 2px 8px;
        line-height: 1.4;
      }
      .workhub-attachment-drop-zone.has-files {
        cursor: default;
        align-items: stretch;
        padding: 10px;
      }
      .workhub-attachment-drop-preview {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }
      .workhub-attachment-drop-preview-item {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f0f5ff;
        border-radius: 6px;
        padding: 5px 8px;
        min-width: 0;
      }
      .workhub-attachment-drop-thumb {
        width: 44px;
        height: 44px;
        object-fit: cover;
        border-radius: 5px;
        flex-shrink: 0;
        border: 1px solid #c8d8f0;
      }
      .workhub-attachment-drop-file-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }
      .workhub-attachment-drop-filename {
        font-size: 0.7rem;
        color: #334466;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        min-width: 0;
      }
      .workhub-attachment-drop-preview-actions {
        display: flex;
        gap: 6px;
        margin-top: 4px;
      }
      .workhub-attachment-url-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid #e8eef8;
      }
      .workhub-checklist-url-row.compact-row.is-stacked {
        display: flex;
        width: 100%;
        gap: 6px;
      }
      .workhub-checklist-url-row.compact-row.is-stacked input,
      .workhub-checklist-url-row.compact-row.is-stacked button {
        width: 100%;
      }
      .workhub-task-file-path-row input {
        flex: 1;
      }
      .workhub-task-file-path-row .workhub-file-upload-btn {
        min-width: 74px;
        justify-content: center;
      }
      .workhub-checklist-url-item button {
        border: none;
        background: transparent;
        color: #6f7f9f;
        cursor: pointer;
      }
      .workhub-attachment-review-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 20px;
        padding: 0 7px;
        border-radius: 999px;
        border: 1px solid #d6e4ff;
        background: #eef4ff;
        color: #2b4f86;
        font-size: 0.62rem;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .workhub-task-attachments {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin: 8px 0;
        min-width: 0;
      }
      .workhub-task-attachments-head {
        font-size: 0.68rem;
        color: #5f6f90;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .workhub-task-attachments-toggle {
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: inherit;
        font-weight: inherit;
        padding: 0;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
      .workhub-task-attachments-toggle-caret {
        color: #6f7f9f;
        line-height: 1;
      }
      .workhub-view-mode-toggle {
        display: flex;
        gap: 2px;
        background: #eef3fc;
        border-radius: 4px;
        padding: 2px;
        flex-shrink: 0;
      }
      .workhub-view-mode-toggle button {
        border: none;
        background: transparent;
        padding: 2px 7px;
        font-size: 0.6rem;
        color: #6f7f9f;
        border-radius: 3px;
        cursor: pointer;
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      .workhub-view-mode-toggle button.active {
        background: #ffffff;
        color: #2a4f83;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      }

      /* ---- LIST mode: compact rows, no thumbnail ---- */
      .workhub-checklist-url-list.view-list .workhub-task-image-thumb {
        display: none;
      }
      .workhub-checklist-url-list.view-list .workhub-attachment-preview-btn {
        gap: 6px;
      }
      .workhub-checklist-url-list.view-list .workhub-checklist-url-item {
        padding: 3px 6px;
      }
      .workhub-checklist-url-list.view-list .workhub-attachment-preview-btn span,
      .workhub-checklist-url-list.view-list .workhub-task-image-link span:not(.workhub-task-attachment-icon) {
        font-size: 0.68rem;
        color: #2a4f83;
      }
      .workhub-checklist-url-list.view-list .workhub-task-image-link .workhub-task-attachment-icon {
        width: 16px;
        height: 16px;
        font-size: 0.75rem;
      }

      /* ---- THUMBNAIL mode: 44px thumb default ---- */
      .workhub-checklist-url-list.view-thumbnail .workhub-task-image-thumb {
        width: 44px;
        height: 44px;
      }
      .workhub-checklist-url-list.view-thumbnail .workhub-task-link-item,
      .workhub-checklist-url-list.view-card .workhub-task-link-item {
        position: relative;
        align-items: stretch;
      }
      .workhub-checklist-url-list.view-thumbnail .workhub-task-link-item .workhub-task-link-card,
      .workhub-checklist-url-list.view-card .workhub-task-link-item .workhub-task-link-card {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        gap: 0;
        width: 100%;
        min-height: 96px;
        text-decoration: none;
        background: #ffffff;
      }
      .workhub-checklist-url-list.view-thumbnail .workhub-task-link-item .workhub-link-hero,
      .workhub-checklist-url-list.view-card .workhub-task-link-item .workhub-link-hero {
        align-items: flex-start;
        padding: 9px 10px;
        background: #f4f8ff;
        border-bottom: 1px solid #d8e4fa;
      }
      .workhub-checklist-url-list.view-thumbnail .workhub-task-link-item .workhub-link-copy strong,
      .workhub-checklist-url-list.view-card .workhub-task-link-item .workhub-link-copy strong {
        white-space: normal;
        line-height: 1.25;
      }
      .workhub-checklist-url-list.view-thumbnail .workhub-task-link-item .workhub-link-meta,
      .workhub-checklist-url-list.view-card .workhub-task-link-item .workhub-link-meta {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px 9px 8px;
      }
      .workhub-link-meta-avatar,
      .workhub-link-meta-avatar img,
      .workhub-link-meta-avatar span {
        width: 20px;
        height: 20px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        object-fit: cover;
        flex-shrink: 0;
      }
      .workhub-link-meta-avatar span {
        background: linear-gradient(135deg, #4f8cff, #7b61ff);
        color: #ffffff;
        font-size: 0.55rem;
        font-weight: 700;
      }
      .workhub-link-meta-copy {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .workhub-link-meta-copy strong {
        font-size: 0.56rem;
        color: #1f3f73;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-link-meta-copy small {
        font-size: 0.5rem;
        color: #6f7f9f;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-checklist-url-list.view-thumbnail .workhub-task-link-item .workhub-link-item-actions,
      .workhub-checklist-url-list.view-card .workhub-task-link-item .workhub-link-item-actions {
        position: absolute;
        top: 4px;
        right: 4px;
        z-index: 2;
      }
      .workhub-checklist-url-list.view-thumbnail .workhub-task-link-item .workhub-link-item-actions button,
      .workhub-checklist-url-list.view-card .workhub-task-link-item .workhub-link-item-actions button {
        background: rgba(255,255,255,0.92);
        box-shadow: 0 1px 4px rgba(0,0,0,0.18);
      }

      /* ---- CARD mode: grid of tiles ---- */
      .workhub-checklist-url-list.view-card {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 8px;
        padding-top: 4px;
        align-items: start;
      }
      .workhub-checklist-url-list.view-card .workhub-checklist-url-item {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        padding: 0;
        position: relative;
        overflow: hidden;
        border-radius: 8px;
      }
      .workhub-checklist-url-list.view-card .workhub-attachment-preview-btn {
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        gap: 0;
        cursor: pointer;
      }
      .workhub-checklist-url-list.view-card .workhub-task-image-thumb {
        width: 100%;
        height: 110px;
        border-radius: 6px 6px 0 0;
        border: none;
        border-bottom: 1px solid #d8e4fa;
        object-fit: cover;
        flex-shrink: 0;
      }
      .workhub-checklist-url-list.view-card .workhub-attachment-preview-btn span {
        font-size: 0.63rem;
        padding: 5px 7px 5px;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #2a4f83;
      }
      .workhub-checklist-url-list.view-card .workhub-checklist-url-item > button:last-child:not(.workhub-attachment-preview-btn) {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(255,255,255,0.92);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        color: #2a4f83;
        border: none;
        padding: 0;
        cursor: pointer;
        z-index: 2;
      }
      .workhub-checklist-url-list.view-card .workhub-task-image-link {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #f4f8ff;
        border-bottom: 1px solid #d8e4fa;
        height: 110px;
        width: 100%;
        box-sizing: border-box;
        text-decoration: none;
        border-radius: 6px 6px 0 0;
        gap: 6px;
        flex-shrink: 0;
      }
      .workhub-checklist-url-list.view-card .workhub-task-image-link .workhub-task-attachment-icon {
        width: 32px;
        height: 32px;
        font-size: 1.4rem;
        background: transparent;
        border-radius: 0;
      }
      .workhub-checklist-url-list.view-card .workhub-task-image-link span:not(.workhub-task-attachment-icon) {
        font-size: 0.62rem;
        text-align: center;
        color: #2a4f83;
        padding: 0 6px 6px;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-checklist-url-list.view-card .workhub-attachment-review-indicator {
        position: absolute;
        top: 4px;
        left: 4px;
        z-index: 2;
        background: rgba(238, 244, 255, 0.95);
      }
      .workhub-detail-icon-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }
      .workhub-detail-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin: 0 0 8px;
      }
      .workhub-detail-card-head strong {
        font-size: 0.8rem;
        color: #1e3a67;
        letter-spacing: 0.01em;
      }
      .workhub-detail-card-head-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .workhub-detail-card-head span {
        font-size: 0.64rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6981ab;
        font-weight: 700;
      }
      .workhub-detail-delete-task-btn {
        width: 30px;
        height: 30px;
        border: 1px solid #f3c7d4;
        background: #fff4f7;
        color: #a42e53;
        font-size: 1rem;
        cursor: pointer;
        padding: 0;
        border-radius: 8px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-detail-delete-task-btn:hover {
        background: #ffe8ef;
        border-color: #efb4c7;
        color: #842042;
      }
      .workhub-detail-danger-icon {
        font-size: 1.08rem;
        line-height: 1;
      }
      .workhub-detail-icon-wrap {
        position: relative;
        min-width: 0;
      }
      .workhub-detail-icon-btn {
        width: 100%;
        min-height: 38px;
        border-radius: 10px;
        border: 1px solid #d5e3fb;
        background: #f7faff;
        color: #24467a;
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr);
        align-items: start;
        gap: 8px;
        padding: 6px 28px 6px 8px;
        cursor: pointer;
        text-align: left;
        position: relative;
        overflow: hidden;
      }
      .workhub-detail-icon-field {
        cursor: default;
        overflow: visible;
      }
      .workhub-detail-icon-btn:hover {
        border-color: #b9cef5;
        background: #eff5ff;
      }
      .workhub-detail-chip-icon {
        width: 24px;
        height: 24px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #f1f4f9;
        color: #62738e;
        font-size: 0.85rem;
        line-height: 1;
        box-shadow: inset 0 0 0 1px rgba(130, 147, 175, 0.2);
      }
      .workhub-detail-chip-copy {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .workhub-detail-chip-label {
        font-size: 0.58rem;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: #5b73a0;
        line-height: 1.1;
      }
      .workhub-detail-chip-value {
        font-size: 0.71rem;
        color: #1e3a67;
        font-weight: 600;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .workhub-detail-field-select,
      .workhub-detail-field-input {
        width: 100%;
        min-width: 0;
        border: none;
        background: transparent;
        color: #17355f;
        font: inherit;
        font-size: 1.05rem;
        font-weight: 500;
        padding: 0;
        outline: none;
        text-align: center;
      }
      .workhub-detail-field-select {
        appearance: auto;
      }
      .workhub-detail-field-date-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 4px;
        min-width: 0;
      }
      .workhub-detail-assignee-picker {
        position: relative;
        width: 100%;
        z-index: 4;
      }
      .workhub-detail-assignee-trigger {
        width: 100%;
        border: none;
        background: transparent;
        padding: 0;
        margin: 0;
        font: inherit;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        color: #17355f;
        font-size: 0.72rem;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
      }
      .workhub-detail-assignee-pills {
        display: inline-flex;
        align-items: center;
        gap: 0;
        min-width: 0;
        overflow: hidden;
      }
      .workhub-detail-assignee-icon-only {
        font-size: 1rem;
        line-height: 1;
        color: #5f7396;
      }
      .workhub-detail-assignee-pill {
        display: inline-flex;
        align-items: center;
        max-width: 124px;
        border: 1px solid #d2dff4;
        background: #f4f8ff;
        color: #274a7d;
        border-radius: 999px;
        padding: 1px 8px;
        font-size: 0.65rem;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-detail-assignee-pill.is-more {
        border-color: #d9e3f3;
        background: #f8fbff;
        color: #56739e;
        font-weight: 600;
      }
      .workhub-detail-assignee-chevron {
        color: #6f87ad;
        font-size: 0.72rem;
        flex-shrink: 0;
      }
      .workhub-detail-assignee-menu {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        min-width: max(180px, 100%);
        max-width: 260px;
        border: 1px solid #cfdcf3;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: 0 16px 28px rgba(30, 58, 103, 0.16);
        display: grid;
        gap: 2px;
        padding: 6px;
        z-index: 80;
      }
      .workhub-detail-chip-edit {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 0.75rem;
        color: #5f78a5;
        line-height: 1;
        pointer-events: none;
      }
      .workhub-detail-icon-btn-danger {
        grid-template-columns: none;
        align-items: center;
        justify-content: center;
        padding: 0;
        background: #fff4f7;
        border-color: #f3c7d4;
      }
      .workhub-detail-icon-btn-danger .workhub-detail-danger-icon {
        font-size: 1.2rem;
      }
      .workhub-detail-icon-btn-danger:hover {
        background: #ffe8ef;
        border-color: #efb4c7;
      }
      .workhub-detail-icon-menu {
        position: absolute;
        top: 52px;
        right: 0;
        min-width: 220px;
        max-width: 320px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 9px;
        padding: 5px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        z-index: 15;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-detail-icon-menu-fixed {
        position: fixed;
        top: unset;
        right: unset;
        z-index: 200;
        min-width: 200px;
      }
      .workhub-detail-icon-menu button {
        border: none;
        background: transparent;
        border-radius: 6px;
        padding: 5px;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 0.74rem;
        color: #274168;
      }
      .workhub-detail-icon-menu button:hover,
      .workhub-detail-icon-menu button.is-active {
        background: #eef4ff;
      }
      .workhub-detail-icon-menu input[type="date"] {
        width: 100%;
      }
      .workhub-detail-menu-date-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 2px;
      }
      .workhub-detail-menu-date-field > span {
        font-size: 0.66rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: #5f7396;
      }
      .workhub-detail-menu-date-field > input[type="text"],
      .workhub-detail-menu-date-field > input[type="date"] {
        width: 100%;
        border: 1px solid #d6e3f8;
        border-radius: 6px;
        padding: 5px 7px;
        font-size: 0.73rem;
        color: #233f66;
        background: #f8fbff;
      }
      .workhub-detail-menu-date-field > input[readonly] {
        opacity: 0.9;
        cursor: default;
      }
      .workhub-detail-menu-date-actions {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      .workhub-detail-menu-date-actions button {
        flex: 1 1 0;
        justify-content: center;
      }
      .workhub-task-details-input {
        width: 100%;
        min-height: 88px;
        resize: vertical;
        font-size: 0.82rem;
      }
      .workhub-task-heading-block {
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin-bottom: 3px;
      }
      .workhub-task-heading-display {
        width: 100%;
        border: none;
        background: transparent;
        color: #1e3458;
        text-align: left;
        padding: 0;
        margin: 0;
        cursor: text;
      }
      .workhub-task-title-display {
        font-size: 1.35rem;
        font-weight: 400;
        line-height: 1.34;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .workhub-task-description-display {
        font-size: 1.05rem;
        font-weight: 400;
        line-height: 1.4;
        color: #425679;
        min-height: 28px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .workhub-task-heading-edit-icon {
        font-size: 0.85rem;
        color: #7b8da9;
        flex-shrink: 0;
      }
      .workhub-task-title-divider {
        width: 100%;
        height: 1px;
        background: #e0e8f6;
        margin: 2px 0 5px;
      }
      .workhub-task-description-block .workhub-task-details-input {
        min-height: 88px;
      }
      .workhub-task-detail-name-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 10px;
      }
      .workhub-task-detail-name-field > span {
        font-size: 0.7rem;
        color: #60708f;
        font-weight: 700;
      }
      .workhub-detail-meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 10px;
      }
      .workhub-detail-meta-item,
      .workhub-detail-meta-select {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        min-width: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        padding: 4px 2px;
      }
      .workhub-detail-meta-icon {
        width: 24px;
        height: 24px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #edf4ff;
        color: #2d4f86;
        font-size: 0.82rem;
        flex: 0 0 auto;
      }
      .workhub-detail-meta-copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .workhub-detail-meta-label,
      .workhub-detail-meta-select > span {
        font-size: 0.6rem;
        font-weight: 500;
        letter-spacing: 0.01em;
        text-transform: none;
        color: #61779f;
      }
      .workhub-detail-meta-value {
        font-size: 0.68rem;
        font-weight: 400;
        color: #2b436d;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }
      .workhub-detail-meta-select {
        flex-direction: column;
        gap: 6px;
      }
      .workhub-detail-meta-select > select {
        width: 100%;
      }
      .workhub-task-resource-card,
      .workhub-task-checklist-card,
      .workhub-discussion-card {
        margin-top: 4px;
      }
      .workhub-task-resource-combined-card {
        margin-top: 4px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px;
      }
      .workhub-task-resource-card-embedded {
        border: none;
        border-radius: 0;
        box-shadow: none;
        background: transparent;
        padding: 0;
        margin: 0;
      }
      .workhub-task-resource-card-embedded + .workhub-task-resource-card-embedded {
        border-top: 1px solid #e2e9f6;
        padding-top: 8px;
      }
      .workhub-task-detail-rail .workhub-detail-meta {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid #e3ecfb;
      }
      .workhub-task-detail-rail .workhub-detail-meta span {
        font-size: 0.73rem;
        color: #425a82;
        line-height: 1.3;
        background: #ffffff;
        border: 1px solid #dee8fa;
        border-radius: 8px;
        padding: 7px 8px;
      }
      .workhub-detail-collapsible-info {
        margin-top: 14px;
        border: 1px solid #dfe9fb;
        border-radius: 8px;
        background: #fbfdff;
      }
      .workhub-detail-collapsible-info > summary {
        list-style: none;
        cursor: pointer;
        padding: 8px 10px;
        font-size: 0.66rem;
        font-weight: 500;
        letter-spacing: 0.01em;
        text-transform: none;
        color: #5c7399;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .workhub-detail-collapsible-info > summary::-webkit-details-marker {
        display: none;
      }
      .workhub-detail-collapsible-info > summary::after {
        content: '▾';
        font-size: 0.72rem;
        color: #6b81a8;
      }
      .workhub-detail-collapsible-info[open] > summary {
        border-bottom: 1px solid #dfe9fb;
      }
      .workhub-detail-collapsible-info[open] > summary::after {
        content: '▴';
      }
      .workhub-task-detail-rail .workhub-detail-collapsible-info > .workhub-detail-meta {
        margin-top: 0;
        padding: 10px;
        border-top: none;
      }
      .workhub-doc-detail-rail .workhub-detail-collapsible-info > .workhub-detail-meta {
        margin-top: 0;
        padding: 10px;
        border-top: none;
      }
      .workhub-task-resource-card .workhub-task-attachments-head {
        margin-bottom: 8px;
      }
      .workhub-task-resource-card .workhub-task-attachment-editor {
        gap: 8px;
        min-width: 0;
      }
      .workhub-task-resource-card .workhub-checklist-url-row {
        min-width: 0;
      }
      .workhub-task-resource-card .workhub-checklist-url-row input,
      .workhub-task-resource-card .workhub-checklist-url-row .workhub-file-upload-btn,
      .workhub-task-resource-card .workhub-checklist-url-row button {
        min-width: 0;
      }
      .workhub-task-resource-card .workhub-task-file-path-row input {
        min-width: 0;
      }
      .workhub-task-resource-card .workhub-checklist-url-list {
        margin-top: 10px;
        gap: 8px;
        min-width: 0;
      }
      .workhub-task-resource-card .workhub-checklist-url-item {
        padding: 7px 8px;
        border-radius: 8px;
        min-width: 0;
      }
      .workhub-task-resource-card .workhub-task-image-link,
      .workhub-task-resource-card .workhub-attachment-preview-btn,
      .workhub-task-resource-card .workhub-link-hero,
      .workhub-task-resource-card .workhub-attachment-copy {
        min-width: 0;
      }
      .workhub-task-resource-card .workhub-task-image-thumb {
        width: 40px;
        height: 40px;
      }
      .workhub-task-resource-card .workhub-attachment-copy strong {
        font-size: 0.72rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-task-resource-card .workhub-attachment-copy small {
        font-size: 0.62rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-task-resource-card .workhub-checklist-url-item > button,
      .workhub-task-resource-card .workhub-link-item-actions button {
        border: 1px solid #d2def5;
        background: #f6f9ff;
        color: #31517f;
        border-radius: 6px;
        padding: 3px 8px;
        font-size: 0.68rem;
        cursor: pointer;
      }
      .workhub-task-resource-card .workhub-checklist-url-item > button:hover,
      .workhub-task-resource-card .workhub-link-item-actions button:hover {
        background: #ecf3ff;
        border-color: #b8ccf1;
      }
      .workhub-task-checklist-card .workhub-checklist-progress {
        margin: 0 0 8px;
      }
      .workhub-task-checklist-card .workhub-checklist-progress-bar {
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: #e4edfc;
        overflow: hidden;
      }
      .workhub-task-checklist-card .workhub-checklist-progress-fill {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #4b7ae6 0%, #6fa4ff 100%);
        border-radius: inherit;
      }
      .workhub-task-checklist-card .workhub-checklist-item {
        padding: 7px 9px;
      }
      .workhub-task-checklist-card .workhub-checklist-actions {
        opacity: 1;
        gap: 6px;
      }
      .workhub-task-checklist-card .workhub-checklist-edit,
      .workhub-task-checklist-card .workhub-checklist-expand,
      .workhub-task-checklist-card .workhub-checklist-remove {
        border: 1px solid #d8e4fa;
        background: #f7faff;
        color: #33537f;
        border-radius: 6px;
        font-size: 0.76rem;
        width: 24px;
        height: 24px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-task-checklist-card .workhub-checklist-item-details {
        margin-top: 6px;
        margin-left: 0;
        border-left: 0;
        border: 1px solid #dfe9fb;
        border-radius: 8px;
      }
      .workhub-task-checklist-card .workhub-checklist-add {
        margin-top: 10px;
      }
      .workhub-task-checklist-card .workhub-checklist-add.is-finance-add {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 96px auto;
        gap: 6px;
        align-items: center;
      }
      .workhub-task-checklist-card .workhub-checklist-add.is-finance-add .workhub-checklist-value-input-wrap {
        width: 100%;
        height: 30px;
      }
      .workhub-task-checklist-card .workhub-checklist-add.is-finance-add .workhub-checklist-value-input-wrap .workhub-checklist-value-input {
        font-size: 0.72rem;
      }
      .workhub-task-checklist-card .workhub-checklist-add.is-finance-add input[type="text"] {
        min-height: 30px;
      }
      .workhub-task-checklist-card .workhub-checklist-add.is-finance-add button {
        min-height: 30px;
      }
      .workhub-discussion-card .workhub-task-attachments-head {
        font-size: 0.84rem;
        font-weight: 500;
        color: #1f3a67;
        padding: 1px 2px 6px;
        border-bottom: 1px solid #dfe9fb;
        margin-bottom: 6px;
      }
      .workhub-discussion-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-discussion-head-main {
        display: inline-flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
      }
      .workhub-discussion-head-main > span:first-child {
        font-size: 0.82rem;
        font-weight: 500;
        line-height: 1.1;
      }
      .workhub-discussion-head-main > span:last-child {
        font-size: 0.68rem;
        font-weight: 500;
        color: #6780a8;
      }
      .workhub-discussion-head-actions {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .workhub-discussion-head-action {
        width: 24px;
        height: 24px;
        border: 1px solid #d7e4f9;
        border-radius: 7px;
        background: #f5f9ff;
        color: #5c7399;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.72rem;
        line-height: 1;
      }
      .workhub-discussion-card .workhub-comment-list-chat {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: none;
        overflow-y: auto;
        padding: 2px 4px 10px;
      }
      .workhub-show-more-btn {
        align-self: flex-start;
        border: 1px solid #d4e3fb;
        background: #f8fbff;
        color: #476897;
        border-radius: 8px;
        padding: 4px 10px;
        font-size: 0.7rem;
        font-weight: 600;
        cursor: pointer;
      }
      .workhub-show-more-btn:hover {
        background: #edf4ff;
        border-color: #b9cef5;
      }
      .workhub-discussion-card .workhub-comment-item {
        display: flex;
        justify-content: flex-start;
      }
      .workhub-discussion-card .workhub-comment-item.is-own {
        justify-content: flex-start;
      }
      .workhub-discussion-card .workhub-comment-bubble {
        width: min(100%, 96%);
        min-width: 0;
        border: 1px solid #d8e5f8;
        background: #ffffff;
        border-radius: 10px;
        padding: 8px 10px;
        box-shadow: none;
      }
      .workhub-discussion-card .workhub-comment-item.is-own .workhub-comment-bubble {
        background: #fbfdff;
        border-color: #cfdef6;
      }
      .workhub-discussion-card .workhub-comment-bubble-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 0;
        padding-bottom: 6px;
        border-bottom: 1px solid #e7effb;
      }
      .workhub-comment-author {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      .workhub-comment-author-avatar,
      .workhub-comment-author-avatar-fallback {
        width: 16px;
        height: 16px;
        border-radius: 999px;
        flex-shrink: 0;
      }
      .workhub-comment-author-avatar {
        object-fit: cover;
        border: 1px solid #c5d6f3;
      }
      .workhub-comment-author-avatar-fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #c5d6f3;
        background: #eaf1ff;
        color: #2a4c85;
        font-size: 0.56rem;
        font-weight: 700;
      }
      .workhub-comment-head-actions {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        flex-shrink: 0;
      }
      .workhub-comment-head-actions > span {
        color: #afbdd4;
        font-size: 0.64rem;
        font-weight: 400;
      }
      .workhub-comment-edit-btn {
        border: 1px solid #e3eaf7;
        background: #f9fbfe;
        color: #bdc8da;
        border-radius: 6px;
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        line-height: 1;
        cursor: pointer;
      }
      .workhub-comment-edit-btn:hover {
        background: #edf4ff;
        border-color: #b9ccf1;
        color: #365a8f;
      }
      .workhub-comment-edit-btn.is-delete {
        color: #c7b4b8;
        border-color: #ecdde0;
        background: #fff9fa;
      }
      .workhub-comment-edit-btn.is-delete:hover {
        color: #7d1f26;
        border-color: #e6aab2;
        background: #ffecee;
      }
      .workhub-comment-edit-btn.is-delete-confirm {
        color: #3c7a56;
        border-color: #bfdfcb;
        background: #f2fbf5;
      }
      .workhub-comment-edit-btn:focus-visible {
        outline: 2px solid #8eb1f5;
        outline-offset: 1px;
      }
      .workhub-discussion-card .workhub-comment-bubble-head strong {
        font-size: 0.82rem;
        font-weight: 600;
        color: #1e3a67;
      }
      .workhub-discussion-card .workhub-comment-bubble-head span {
        font-size: 0.68rem;
        color: #6f86ab;
        white-space: nowrap;
      }
      .workhub-comment-reply-quote {
        margin: 8px 0 4px;
        padding: 5px 8px;
        background: #f0f4fa;
        border-left: 3px solid #b0c4e0;
        border-radius: 4px;
        font-size: 0.74rem;
        color: #6b83a8;
        font-weight: 400;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .workhub-discussion-card .workhub-comment-bubble p {
        margin: 8px 0 6px;
        font-size: 0.8rem;
        line-height: 1.35;
        color: #2d446c;
        font-weight: 300;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
        max-width: 100%;
      }
      .workhub-comment-actions-bar {
        margin-top: 0;
        padding-top: 6px;
        padding-bottom: 2px;
        border-top: 1px solid #edf3fd;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }
      .workhub-comment-actions-left {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .workhub-comment-actions-right {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-comment-action-chip {
        border: 1px solid #e3edf9;
        background: #fcfdff;
        color: #9aabc4;
        border-radius: 999px;
        width: 24px;
        height: 20px;
        padding: 0;
        font-size: 0.62rem;
        font-weight: 500;
        line-height: 1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      @keyframes wh-heart-pop {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.55); }
        60%  { transform: scale(0.9); }
        80%  { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      @keyframes wh-highlight-fade {
        0%   { box-shadow: 0 0 0 3px #f5c842, 0 2px 8px rgba(245,200,66,0.4); }
        60%  { box-shadow: 0 0 0 3px #f5c842, 0 2px 8px rgba(245,200,66,0.25); }
        100% { box-shadow: none; }
      }
      .workhub-comment-item.is-highlighted .workhub-comment-bubble {
        animation: wh-highlight-fade 2.4s ease-out forwards;
      }
      .workhub-comment-action-chip.is-active-like {
        color: #e0547a;
        border-color: #f4c6d4;
        background: #fff7fa;
      }
      .workhub-comment-action-chip.is-liking {
        animation: wh-heart-pop 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards;
      }
      .workhub-comment-action-chip.is-active-reaction {
        color: #486fa8;
        border-color: #cfe0f7;
        background: #f3f8ff;
      }
      .workhub-comment-action-chip.is-active-reply {
        color: #3f658f;
        border-color: #d2e1f7;
        background: #f5f9ff;
      }
      .workhub-comment-action-chip:hover {
        background: #f7fbff;
        border-color: #d1e1f7;
        color: #7f95b7;
      }
      .workhub-comment-action-count {
        min-width: 12px;
        margin-left: -2px;
        margin-right: 2px;
        font-size: 0.62rem;
        line-height: 1;
        color: #7f93b3;
        font-weight: 500;
        text-align: center;
      }
      .workhub-comment-reply-target {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 0.68rem;
        color: #6e84a8;
        background: #f5f9ff;
        border: 1px solid #d8e5f8;
        border-radius: 8px;
        padding: 5px 8px;
      }
      .workhub-discussion-card .workhub-comment-bubble a {
        overflow-wrap: anywhere;
        word-break: break-word;
        color: #225fbc;
        text-decoration: underline;
      }
      .workhub-comment-edit-form {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 4px;
        padding: 7px;
        border-radius: 8px;
        border: 1px solid #dce8fb;
        background: #f8fbff;
      }
      .workhub-comment-edit-form textarea {
        min-height: 70px;
        border-radius: 8px;
        border: 1px solid #d4e3fb;
        background: #ffffff;
      }
      .workhub-comment-edit-form textarea:focus {
        border-color: #7ea4ee;
        box-shadow: 0 0 0 2px rgba(126, 164, 238, 0.16);
        outline: none;
      }
      .workhub-comment-edit-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
      }
      .workhub-comment-edit-actions .workhub-primary-mini,
      .workhub-comment-edit-actions .workhub-ghost-mini {
        min-width: 72px;
        justify-content: center;
      }
      .workhub-comment-composer {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: #f8fbff;
        border: 1px solid #dfe9fb;
        border-radius: 12px;
        padding: 8px;
      }
      .workhub-comment-composer textarea {
        min-height: 46px;
        border-radius: 8px;
        border: 1px solid #d4e3fb;
        background: #ffffff;
        font-size: 0.8rem;
        color: #2d446c;
      }
      .workhub-comment-composer textarea:focus {
        border-color: #7ea4ee;
        box-shadow: 0 0 0 2px rgba(126, 164, 238, 0.16);
        outline: none;
      }
      .workhub-comment-composer-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 30px;
      }
      .workhub-comment-composer-tools {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-comment-composer-tool {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        border: 1px solid #d6e3f8;
        background: #f3f8ff;
        color: #5c7399;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.66rem;
        line-height: 1;
      }
      .workhub-discussion-card.is-docked-composer {
        flex: 1 1 auto;
        min-height: 0;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        overflow: hidden;
      }
      .workhub-discussion-card.is-docked-composer .workhub-comment-list-chat {
        max-height: none;
        min-height: 0;
        overflow-y: auto;
      }
      .workhub-discussion-card.is-docked-composer .workhub-empty-state {
        min-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-discussion-card.is-docked-composer .workhub-comment-composer {
        margin-top: 0;
        border-top: 1px solid #dfe9fb;
        border-radius: 0;
        border-left: none;
        border-right: none;
        border-bottom: none;
        background: #f8fbff;
        padding: 10px 2px 0;
      }
      .workhub-discussion-card.is-docked-composer .workhub-comment-composer textarea {
        min-height: 46px;
        max-height: 110px;
      }
      .workhub-discussion-card.is-docked-composer .workhub-comment-composer-footer {
        justify-content: flex-end;
        min-height: 0;
      }
      .workhub-discussion-card.is-docked-composer .workhub-composer-notify-row {
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 2px;
      }
      .workhub-discussion-card.is-docked-composer .workhub-composer-notify-summary {
        width: auto;
        flex: 1 1 180px;
      }
      .workhub-comment-send-btn {
        margin-left: auto;
        width: 30px;
        height: 26px;
        border-radius: 8px;
        border: 1px solid #c4d7f7;
        background: linear-gradient(180deg, #f6faff 0%, #e9f1ff 100%);
        color: #335487;
        font-size: 0.78rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease;
      }
      .workhub-comment-send-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(48, 79, 129, 0.16);
        background: linear-gradient(180deg, #ffffff 0%, #e9f1ff 100%);
      }
      .workhub-comment-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
      }
      .workhub-comment-send-btn span {
        transform: translateX(0.5px);
      }
      .workhub-composer-notify-row {
        display: flex;
        align-items: center;
        gap: 6px;
        position: relative;
        flex-wrap: wrap;
        min-width: 0;
      }
      .workhub-composer-notify-label {
        font-size: 0.72rem;
        font-weight: 600;
        color: #6b7a99;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .workhub-composer-notify-trigger {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
        font-size: 0.78rem;
        font-weight: 500;
        color: #2a4a7a;
        background: #eef3fc;
        border: 1px solid #c8d8f5;
        border-radius: 5px;
        padding: 2px 8px;
        cursor: pointer;
        user-select: none;
        transition: background 0.12s;
      }
      .workhub-composer-notify-trigger-text {
        white-space: nowrap;
      }
      .workhub-composer-notify-trigger:hover {
        background: #dde8f9;
      }
      .workhub-composer-notify-chevron {
        font-size: 0.65rem;
        opacity: 0.7;
      }
      .workhub-composer-notify-summary {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex: 1 1 180px;
        flex-wrap: wrap;
      }
      .workhub-composer-notify-pill {
        display: inline-flex;
        align-items: center;
        max-width: 180px;
        min-height: 22px;
        padding: 0 8px;
        border-radius: 999px;
        background: #eef4ff;
        border: 1px solid #d5e3fb;
        color: #2e4f82;
        font-size: 0.67rem;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-composer-notify-pill.is-none {
        background: #f7f8fb;
        border-color: #dfe5f1;
        color: #6d7a91;
      }
      .workhub-composer-notify-pill.is-more {
        background: #ffffff;
      }
      .workhub-composer-notify-menu {
        position: absolute;
        bottom: calc(100% + 6px);
        left: 0;
        z-index: 200;
        background: #ffffff;
        border: 1px solid #d0dff5;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(30,58,95,0.12);
        min-width: 220px;
        max-width: 320px;
        max-height: min(260px, 42vh);
        overflow-y: auto;
        padding: 4px 0;
      }
      .workhub-composer-notify-option {
        display: block;
        width: 100%;
        text-align: left;
        padding: 7px 14px;
        font-size: 0.8rem;
        font-weight: 500;
        color: #374151;
        background: none;
        border: none;
        cursor: pointer;
        transition: background 0.1s;
      }
      .workhub-composer-notify-option:hover {
        background: #f0f5ff;
      }
      .workhub-composer-notify-option.is-active {
        color: #1e3a5f;
        font-weight: 700;
        background: #eef3fc;
      }
      .workhub-composer-notify-divider {
        height: 1px;
        background: #e5eaf5;
        margin: 4px 0;
      }
      .workhub-composer-notify-check {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        font-size: 0.78rem;
        color: #374151;
        cursor: pointer;
        transition: background 0.1s;
      }
      .workhub-composer-notify-check:hover {
        background: #f0f5ff;
      }
      .workhub-composer-notify-check input[type="checkbox"] {
        accent-color: #1e3a5f;
        width: 14px;
        height: 14px;
        cursor: pointer;
        flex-shrink: 0;
      }
      .workhub-task-name-input {
        min-height: 56px;
        resize: vertical;
        line-height: 1.3;
      }
      .workhub-file-upload-btn {
        border: 1px solid #d6e3fb;
        border-radius: 7px;
        background: #f6f9ff;
        color: #335487;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 0 8px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        white-space: nowrap;
      }
      .workhub-file-upload-btn input {
        display: none;
      }
      .workhub-attachment-preview-btn {
        border: none;
        background: transparent;
        padding: 0;
        text-align: left;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #2a4f83;
        min-width: 0;
        cursor: pointer;
      }
      .workhub-attachment-preview-btn span {
        display: inline-block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-attachment-preview-btn .workhub-attachment-copy {
        min-width: 0;
        flex: 1;
      }
      .workhub-image-review-backdrop {
        z-index: 2500;
        padding: 8px;
      }
      .workhub-modal.workhub-image-review-modal {
        width: min(calc(var(--img-aspect, 1.778) * (100vh - 210px) + 42px), calc(100vw - 20px));
        max-width: calc(100vw - 20px);
        height: auto;
        max-height: calc(100vh - 20px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        color: #173056;
        padding: 10px;
      }
      .workhub-image-review-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
        flex-shrink: 0;
        background: #f8fbff;
        border: 1px solid #dbe7ff;
        border-radius: 8px;
        padding: 6px 8px;
      }
      .workhub-image-review-topbar-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1 1 190px;
        min-width: 0;
      }
      .workhub-image-review-topbar-label {
        font-size: 0.88rem;
        font-weight: 800;
        color: #173056;
        line-height: 1.2;
      }
      .workhub-image-review-topbar-hint {
        font-size: 0.7rem;
        color: #6b7da0;
        line-height: 1.2;
      }
      .workhub-image-review-close-btn {
        flex-shrink: 0;
        border: 1px solid #c9d8f7 !important;
        background: #ffffff !important;
        color: #24497f !important;
        border-radius: 8px;
        padding: 5px 10px;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .workhub-image-review-layout {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 0;
      }
      .workhub-image-review-stage-wrap {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 0;
      }
      .workhub-image-review-layout.has-discussion {
        flex-direction: row;
        align-items: stretch;
      }
      .workhub-image-review-layout.has-discussion .workhub-image-review-stage-wrap {
        flex: 1 1 auto;
      }
      .workhub-image-review-discussion {
        flex: 0 0 min(340px, 32vw);
        min-width: 280px;
        max-width: 360px;
        min-height: 0;
        overflow: auto;
      }
      .workhub-image-review-discussion .workhub-discussion-card {
        height: 100%;
        min-height: 0;
      }
      .workhub-image-review-toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        flex-wrap: wrap;
        flex-shrink: 0;
        flex: 999 1 420px;
      }
      .workhub-image-tool-group,
      .workhub-image-review-fit-group {
        display: inline-flex;
        gap: 5px;
        flex-wrap: wrap;
      }
      .workhub-image-review-toolbar button,
      .workhub-image-inline-btn {
        border: 1px solid #cddcf8;
        background: #ffffff;
        color: #2a4f83;
        border-radius: 7px;
        padding: 4px 8px;
        font-size: 0.68rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-image-review-toolbar button.is-active,
      .workhub-image-inline-btn.is-primary {
        border-color: #2f64d8;
        background: #2f64d8;
        color: #ffffff;
      }
      .workhub-image-review-toolbar .workhub-image-review-clear-btn {
        border-color: #e8c8cf;
        background: #fff6f6;
        color: #9b2e3a;
      }
      .workhub-image-review-toolbar .workhub-image-review-clear-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .workhub-image-compare-wrap {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
        flex: 1;
        min-height: 0;
      }
      .workhub-image-compare-inputs {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .workhub-image-compare-input-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 200px;
        font-size: 0.78rem;
        color: #304b74;
        font-weight: 600;
      }
      .workhub-image-compare-input-row input {
        flex: 1;
        background: #f4f8ff;
        border: 1px solid #d7e3fb;
        border-radius: 6px;
        padding: 5px 8px;
        font-size: 0.78rem;
        color: #173056;
        outline: none;
      }
      .workhub-image-compare-input-row input:focus {
        border-color: #2f64d8;
        box-shadow: 0 0 0 2px rgba(47, 100, 216, 0.12);
      }
      .workhub-image-compare-stage {
        flex: 1;
        min-height: 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid #d7e3fb;
        background: #edf4ff;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-image-compare-stage img-comparison-slider {
        max-height: calc(100vh - 280px);
      }
      .workhub-image-compare-placeholder {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        font-size: 0.82rem;
        color: #6b7da0;
        text-align: center;
        border-radius: 10px;
        border: 1px dashed #c5d5f0;
        background: #f4f8ff;
      }
      .workhub-image-review-tip {
        font-size: 0.74rem;
        color: #6b7da0;
      }
      .workhub-image-review-stage {
        position: relative;
        border-radius: 10px;
        border: 1px solid #d7e3fb;
        overflow: hidden;
        background: linear-gradient(180deg, #edf4ff 0%, #e3eefc 100%);
        cursor: crosshair;
        width: min(100%, calc(var(--img-aspect, 1.778) * (100vh - 210px)));
        max-width: calc(var(--img-aspect, 1.778) * (100vh - 210px));
        aspect-ratio: var(--img-aspect, 1.778);
        max-height: calc(100vh - 210px);
        align-self: center;
        touch-action: none;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
      }
      .workhub-image-review-image {
        width: 100%;
        height: 100%;
        display: block;
      }
      .workhub-image-review-lines {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .workhub-image-review-lines line,
      .workhub-image-review-lines polyline {
        cursor: pointer;
        stroke: #ff5f56;
      }
      .workhub-image-review-draft-shape {
        pointer-events: none;
        stroke-dasharray: 1.5 1.2;
        opacity: 0.9;
      }
      .workhub-image-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 28px;
        height: 28px;
        border: 2px solid #ffffff;
        border-radius: 999px;
        background: #2f64d8;
        color: #ffffff;
        font-weight: 800;
        font-size: 0.72rem;
        padding: 0;
        cursor: pointer;
        box-shadow: 0 10px 20px rgba(47, 100, 216, 0.28);
      }
      .workhub-image-marker.point {
        background: #d94f84;
        box-shadow: 0 10px 20px rgba(217, 79, 132, 0.24);
      }
      .workhub-image-marker.is-resolved {
        background: #1a9e5e;
        box-shadow: 0 10px 20px rgba(26, 158, 94, 0.28);
      }
      .workhub-image-marker-resolve-row {
        display: inline-flex;
        align-items: center;
        align-self: flex-start;
        gap: 6px;
        font-size: 0.72rem;
        color: #304b74;
        white-space: nowrap;
        cursor: pointer;
      }
      .workhub-image-marker-resolve-row input[type='checkbox'] {
        margin: 0;
        flex-shrink: 0;
      }
      .workhub-image-marker-resolve-row span {
        white-space: nowrap;
        line-height: 1;
      }
      .workhub-image-marker-dot {
        display: none;
      }
      .workhub-image-review-panels {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
        min-height: 0;
      }
      .workhub-image-review-section {
        border: 1px solid #dbe7ff;
        border-radius: 12px;
        background: #ffffff;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 0;
        box-shadow: 0 10px 24px rgba(42, 79, 131, 0.06);
      }
      .workhub-image-review-notes-section {
        min-height: 170px;
      }
      .workhub-image-review-notes-textarea,
      .workhub-image-marker-inline-editor textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 110px;
        resize: vertical;
        background: #f8fbff;
        border: 1px solid #d7e3fb;
        color: #173056;
        border-radius: 10px;
      }
      .workhub-image-review-section h4 {
        margin: 0;
        font-size: 0.8rem;
        color: #173056;
      }
      .workhub-image-review-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-image-review-toggle-btn {
        border: 1px solid #cddcf8;
        background: #f4f8ff;
        color: #2a4f83;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 0.68rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-image-review-mini-row {
        display: flex;
        gap: 8px;
      }
      .workhub-image-review-mini-row button {
        width: auto;
        white-space: nowrap;
      }
      .workhub-image-review-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 0;
      }
      .workhub-image-review-comment-item,
      .workhub-image-review-check-item {
        border: 1px solid #e1ebff;
        background: #f9fbff;
        border-radius: 10px;
        padding: 9px 10px;
      }
      .workhub-image-review-comment-item strong {
        font-size: 0.74rem;
        color: #173056;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-image-review-comment-item p {
        margin: 5px 0;
        font-size: 0.77rem;
        color: #304b74;
      }
      .workhub-image-review-comment-item span {
        font-size: 0.69rem;
        color: #7a8db1;
      }
      .workhub-pin-badge {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #2f64d8;
        color: #ffffff;
        font-size: 0.64rem;
        display: inline-grid;
        place-items: center;
      }
      .workhub-image-review-check-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-image-review-check-item-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
      }
      .workhub-image-review-check-item-row > label {
        flex: 1;
        min-width: 0;
      }
      .workhub-image-review-check-item label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .workhub-image-review-check-item span {
        font-size: 0.74rem;
        color: #304b74;
      }
      .workhub-round-check {
        cursor: pointer;
      }
      .workhub-round-check input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .workhub-round-check-indicator {
        width: 15px;
        height: 15px;
        border: 2px solid #89a4d6;
        border-radius: 999px;
        background: #ffffff;
        flex-shrink: 0;
      }
      .workhub-round-check input:checked + .workhub-round-check-indicator {
        border-color: #2f64d8;
        background: #2f64d8;
      }
      .workhub-image-review-check-item button,
      .workhub-image-review-marker-actions button {
        border: 1px solid #cddcf8;
        background: #ffffff;
        color: #2a4f83;
        border-radius: 8px;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 0.7rem;
        font-weight: 700;
      }
      .workhub-image-review-check-item.is-done {
        opacity: 0.72;
      }
      .workhub-image-review-check-item.is-done .workhub-round-check {
        text-decoration: line-through;
      }
      .workhub-image-review-marker-item {
        gap: 4px;
      }
      .workhub-image-review-marker-actions {
        display: inline-flex;
        gap: 8px;
        margin-top: 6px;
      }
      .workhub-image-marker-inline-editor {
        position: absolute;
        transform: translate(8px, -50%);
        width: min(280px, calc(100vw - 48px));
        border: 1px solid #d7e3fb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 16px 40px rgba(42, 79, 131, 0.18);
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 5;
      }
      .workhub-image-marker-inline-editor textarea {
        min-height: 68px;
      }
      .workhub-image-review-pin-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .workhub-image-review-pin-layer .workhub-image-marker {
        pointer-events: auto;
        cursor: grab;
      }
      .workhub-image-review-pin-layer .workhub-image-marker:active {
        cursor: grabbing;
      }
      .workhub-image-marker-editor-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .workhub-delete-prompt-backdrop {
        z-index: 3000;
      }
      .workhub-modal.workhub-delete-prompt-modal {
        width: min(400px, calc(100vw - 24px));
      }
      .workhub-delete-prompt-filename {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f4f8ff;
        border: 1px solid #d8e5fb;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.76rem;
        color: #2a4f83;
        margin-bottom: 16px;
        overflow: hidden;
      }
      .workhub-delete-prompt-filename span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: monospace;
        font-size: 0.72rem;
      }
      .workhub-delete-prompt-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-checklist-url-row.compact-row {
        gap: 5px;
      }
      .workhub-checklist-url-row.compact-row input {
        min-height: 28px;
        padding: 5px 7px;
        font-size: 0.74rem;
      }
      .workhub-checklist-url-row.compact-row .workhub-task-attachment-title-input {
        flex: 1;
      }
      .workhub-checklist-url-row.compact-row button {
        min-height: 28px;
        padding: 0 8px;
        font-size: 0.72rem;
      }
      .workhub-task-attachment-icon {
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 5px;
        background: #eef4ff;
        flex-shrink: 0;
      }
      .workhub-priority-icon {
        font-size: 0.9rem;
        margin-right: 4px;
      }
      .workhub-field-grid.two,
      .workhub-detail-card {
        border-radius: 11px;
        padding: 16px;
        background: #f9fbff;
        border: 1px solid #e3ecfb;
        margin: 12px 0;
        min-width: 0;
      }
      .workhub-detail-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 16px 0;
      }
      .workhub-detail-grid label {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-detail-grid label span {
        font-size: 0.74rem;
        color: #22324a;
        font-weight: 500;
        line-height: 1.2;
      }
      .workhub-task-detail-rail input,
      .workhub-task-detail-rail select,
      .workhub-task-detail-rail textarea,
      .workhub-task-detail-dialog-body input,
      .workhub-task-detail-dialog-body select,
      .workhub-task-detail-dialog-body textarea {
        font-size: 0.74rem;
        color: #22324a;
        font-weight: 500;
      }
      .workhub-project-detail-grid {
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
        margin: 10px 0 12px;
      }
      .workhub-project-detail-grid.workhub-employee-profile-detail-grid {
        gap: 7px;
        margin: 8px 0 10px;
      }
      .workhub-project-detail-grid.workhub-employee-profile-detail-grid label {
        gap: 6px;
      }
      .workhub-project-detail-grid.workhub-employee-profile-detail-grid h4 {
        margin: 3px 0 0;
      }
      .workhub-project-detail-grid.workhub-employee-profile-detail-grid .workhub-field-grid.two.compact {
        margin: 6px 0;
        padding: 12px;
        gap: 6px;
      }
      .workhub-proposal-services-stack {
        display: grid;
        gap: 8px;
      }
      .workhub-proposal-services-collapsible {
        border: 1px solid #d8e4fa;
        border-radius: 10px;
        background: #fbfdff;
      }
      .workhub-proposal-services-toggle {
        width: 100%;
        border: none;
        background: transparent;
        color: #173764;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
      }
      .workhub-proposal-services-toggle-meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #446189;
      }
      .workhub-proposal-services-checklist {
        display: grid;
        gap: 0;
        max-height: 220px;
        overflow: auto;
        padding: 0;
        border-top: 1px solid #d8e4fa;
        background: #f8fbff;
      }
      .workhub-proposal-service-option {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 7px;
        width: 100%;
        min-height: 32px;
        padding: 6px 10px;
        color: #1c365f;
        font-size: 0.73rem;
        font-weight: 600;
        border-bottom: 1px solid #e4ecfa;
      }
      .workhub-proposal-service-option:last-child {
        border-bottom: none;
      }
      .workhub-proposal-service-option:hover {
        background: #f1f7ff;
      }
      .workhub-proposal-service-option input[type='checkbox'] {
        width: 14px;
        height: 14px;
        margin: 0;
      }
      .workhub-proposal-services-picker {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
      }
      .workhub-proposal-service-chip-list {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-proposal-selected-services-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 4px;
      }
      .workhub-proposal-selected-service-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 28px;
        padding: 2px 8px;
        border-radius: 7px;
        border: 1px solid #dce7fb;
        background: #ffffff;
        color: #16345d;
        font-size: 0.73rem;
        font-weight: 600;
      }
      .workhub-proposal-service-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 24px;
        padding: 0 9px;
        border-radius: 999px;
        border: 1px solid #cfddf4;
        background: #ffffff;
        color: #1f3f70;
        font-size: 0.7rem;
        line-height: 1;
      }
      .workhub-proposal-service-chip-remove {
        border: none;
        background: transparent;
        color: #5f749c;
        padding: 0;
        width: 14px;
        height: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.82rem;
      }
      .workhub-proposal-service-chip-remove:hover {
        color: #284d84;
      }
      .workhub-project-color-select {
        position: relative;
      }
      .workhub-project-color-select-btn {
        width: 100%;
        min-height: 34px;
        border-radius: 9px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #19315d;
        padding: 6px 9px;
        font: inherit;
        font-size: 0.82rem;
        line-height: 1.2;
        font-weight: 400;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
      }
      .workhub-project-color-select-copy {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1px;
        min-width: 0;
      }
      .workhub-project-color-select-copy strong {
        font-size: 0.76rem;
        line-height: 1.15;
        color: #1d3d6c;
        font-weight: 600;
      }
      .workhub-project-color-select-copy small {
        font-size: 0.67rem;
        line-height: 1.2;
        color: #6980a6;
        white-space: normal;
      }
      .workhub-project-color-select-btn.is-open,
      .workhub-project-color-select-btn:hover {
        border-color: #a5bde8;
        background: #f8fbff;
      }
      .workhub-project-color-select-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
      .workhub-project-color-swatch {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 1px solid rgba(31, 50, 94, 0.35);
        flex: 0 0 auto;
      }
      .workhub-project-color-caret {
        margin-left: auto;
        color: #62789f;
        font-size: 0.7rem;
      }
      .workhub-project-color-select-menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: 0 12px 26px rgba(25, 45, 80, 0.16);
        z-index: 45;
        overflow: hidden;
      }
      .workhub-project-color-option {
        width: 100%;
        border: 0;
        border-bottom: 1px solid #edf2fb;
        background: #ffffff;
        color: #244374;
        text-align: left;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 400;
        padding: 8px 10px;
        display: inline-flex;
        align-items: flex-start;
        gap: 8px;
        cursor: pointer;
      }
      .workhub-project-color-option-copy {
        display: inline-flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .workhub-project-color-option-copy strong {
        font-size: 0.75rem;
        color: #244374;
        line-height: 1.15;
      }
      .workhub-project-color-option-copy small {
        font-size: 0.67rem;
        color: #6a81a7;
        line-height: 1.2;
      }
      .workhub-project-color-option:last-child {
        border-bottom: 0;
      }
      .workhub-project-color-option:hover,
      .workhub-project-color-option.is-active {
        background: #f3f8ff;
      }
      .workhub-project-detail-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 10px;
        flex-wrap: wrap;
        position: sticky;
        bottom: 0;
        z-index: 3;
        padding: 8px 0 2px;
        background: linear-gradient(180deg, rgba(246, 250, 255, 0) 0%, rgba(246, 250, 255, 0.92) 35%, rgba(246, 250, 255, 1) 100%);
      }
      .workhub-project-detail-actions .workhub-primary-btn,
      .workhub-project-detail-actions .workhub-ghost-btn {
        font-weight: 400;
      }
      .workhub-project-detail-readonly-note {
        margin-top: 10px;
        font-size: 0.74rem;
        color: #647392;
      }
      .workhub-detail-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #e3ecfb;
      }
      .workhub-detail-meta span {
        font-size: 0.8rem;
        color: #647392;
        line-height: 1.25;
      }
      .workhub-field-grid.two.compact {
        gap: 6px;
      }
      .workhub-workspace-summary {
        border-radius: 11px;
        padding: 8px;
        background: #f7faff;
        border: 1px solid #e1ebfb;
      }
      .workhub-workspace-summary.bright {
        margin-top: 8px;
      }
      .workhub-color-pills {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .workhub-color-meaning-note {
        margin-top: 6px;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .workhub-color-meaning-note strong {
        font-size: 0.72rem;
        color: #1f3f70;
      }
      .workhub-color-meaning-note span {
        font-size: 0.67rem;
        color: #6b81a6;
        line-height: 1.25;
      }
      .workhub-focus-metrics,
      .workhub-member-picker {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-switcher {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin: 12px 0;
      }
      .workhub-switcher.compact-switcher {
        margin: 10px 0;
      }
      .workhub-modal-form.compact-create {
        gap: 10px;
      }
      .workhub-modal-form.compact-create.workhub-employee-create-compact {
        gap: 7px;
      }
      .workhub-modal-form.compact-create.workhub-employee-create-compact .workhub-icon-field {
        gap: 4px;
      }
      .workhub-modal-form.compact-create.workhub-employee-create-compact .workhub-field-grid.two.compact {
        margin: 6px 0;
        padding: 12px;
        gap: 6px;
      }
      .workhub-modal-form.compact-create .workhub-create-actions {
        position: sticky;
        bottom: -24px;
        z-index: 3;
        margin: 6px -24px 0;
        padding: 10px 24px max(10px, env(safe-area-inset-bottom));
        background: #ffffff;
      }
      .workhub-template-create-title.is-proposal {
        font-size: 0.92rem;
        font-weight: 800;
        color: #1c3560;
      }
      .workhub-modal-form.compact-create .workhub-field-grid.two.compact {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .workhub-modal.workhub-workspace-create-modal {
        width: min(780px, calc(100vw - 20px));
      }
      .workhub-workspace-create-form {
        gap: 10px;
      }
      .workhub-workspace-create-layout {
        display: grid;
        grid-template-columns: minmax(210px, 0.76fr) minmax(0, 1.44fr);
        gap: 9px;
        align-items: start;
      }
      .workhub-workspace-create-fields {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-template-picker-wrap {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-template-picker-label {
        font-size: 0.76rem;
        font-weight: 700;
        color: #2a446f;
      }
      .workhub-template-card-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        max-height: none;
        overflow-x: hidden;
        overflow-y: visible;
        padding-right: 0;
      }
      .workhub-template-card {
        border: 1px solid #d9e5fb;
        border-radius: 10px;
        background: #fbfdff;
        color: inherit;
        text-align: left;
        padding: 7px;
        display: grid;
        grid-template-columns: 46px minmax(0, 1fr);
        align-items: start;
        gap: 7px;
        cursor: pointer;
        transition: border-color 0.08s ease, box-shadow 0.08s ease, transform 0.15s ease;
      }
      .workhub-template-card:hover {
        border-color: #9eb8ee;
        transform: translateY(-1px);
        transition: transform 0.15s ease;
      }
      .workhub-template-card.is-active {
        border-color: #2f5cc2;
        box-shadow: 0 0 0 2px rgba(47, 92, 194, 0.14);
        background: #f3f8ff;
      }
      .workhub-template-card-content {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .workhub-template-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-template-mode {
        font-size: 0.68rem;
        color: #5a6f95;
        line-height: 1.2;
      }
      .workhub-template-chip {
        border: 1px solid #d7e5fb;
        background: #ffffff;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 0.66rem;
        line-height: 1.15;
        color: #496b9b;
        white-space: nowrap;
      }
      .workhub-template-graphic {
        width: 46px;
        height: 46px;
        border-radius: 9px;
        border: 1px solid #d2e0f7;
        background: #eef4ff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }
      .workhub-template-graphic::before,
      .workhub-template-graphic::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .workhub-template-graphic-code {
        position: relative;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        padding: 2px 6px;
        border: 1px solid rgba(43, 76, 128, 0.25);
        background: rgba(255, 255, 255, 0.92);
        font-size: 0.61rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: #305288;
      }
      .workhub-template-title {
        font-size: 0.78rem;
        line-height: 1.18;
        color: #1d3866;
        min-width: 0;
      }
      .workhub-template-description {
        display: none;
      }
      .workhub-template-highlights {
        display: none;
      }
      .workhub-template-highlight {
        border: 1px solid #dce8fb;
        background: #ffffff;
        color: #31578f;
        border-radius: 999px;
        padding: 2px 7px;
        font-size: 0.66rem;
        line-height: 1.15;
      }
      .workhub-template-empty .workhub-template-graphic {
        background: linear-gradient(180deg, #ffffff 0%, #f4f8ff 100%);
        border-style: dashed;
      }
      .workhub-template-empty .workhub-template-graphic::before {
        background-image: repeating-linear-gradient(0deg, rgba(139, 161, 197, 0.2) 0 1px, transparent 1px 11px);
      }
      .workhub-template-projects .workhub-template-graphic {
        background: linear-gradient(160deg, #eef4ff 0%, #d9e6ff 100%);
      }
      .workhub-template-projects .workhub-template-graphic::before {
        background-image: repeating-linear-gradient(90deg, rgba(63, 103, 175, 0.28) 0 7px, transparent 7px 13px);
        inset: auto 6px 8px 6px;
        height: 18px;
      }
      .workhub-template-projects .workhub-template-graphic::after {
        background: linear-gradient(180deg, rgba(43, 83, 151, 0.34) 0%, rgba(43, 83, 151, 0) 100%);
        inset: 7px auto 16px 8px;
        width: 9px;
      }
      .workhub-template-finance .workhub-template-graphic {
        background: linear-gradient(165deg, #ebfff3 0%, #d5f7e6 100%);
      }
      .workhub-template-finance .workhub-template-graphic::before {
        background-image: repeating-linear-gradient(0deg, rgba(27, 123, 84, 0.22) 0 2px, transparent 2px 10px);
        inset: 10px 10px 10px 10px;
      }
      .workhub-template-finance .workhub-template-graphic::after {
        background: linear-gradient(90deg, rgba(19, 109, 73, 0.5) 0%, rgba(19, 109, 73, 0.08) 100%);
        inset: 7px 8px auto 8px;
        height: 6px;
      }
      .workhub-template-hr .workhub-template-graphic {
        background: linear-gradient(165deg, #effbf9 0%, #d7f2ee 100%);
      }
      .workhub-template-hr .workhub-template-graphic::before {
        background-image: repeating-linear-gradient(90deg, rgba(39, 128, 110, 0.22) 0 4px, transparent 4px 11px);
        inset: auto 8px 8px 8px;
        height: 11px;
      }
      .workhub-template-hr .workhub-template-graphic::after {
        background: radial-gradient(circle at 28% 28%, rgba(27, 118, 102, 0.46) 0 6px, transparent 7px);
      }
      .workhub-template-marketing .workhub-template-graphic {
        background: linear-gradient(165deg, #fff9ef 0%, #ffe8cc 100%);
      }
      .workhub-template-marketing .workhub-template-graphic::before {
        background-image: repeating-linear-gradient(135deg, rgba(191, 120, 18, 0.28) 0 3px, transparent 3px 10px);
        inset: 0;
      }
      .workhub-template-marketing .workhub-template-graphic::after {
        background: radial-gradient(circle at 72% 28%, rgba(209, 126, 7, 0.46) 0 6px, transparent 7px);
      }
      .workhub-template-proposals_leads .workhub-template-graphic {
        background: linear-gradient(165deg, #f9f2ff 0%, #e9dbff 100%);
      }
      .workhub-template-proposals_leads .workhub-template-graphic::before {
        background-image: linear-gradient(135deg, rgba(109, 74, 173, 0.25) 0 38%, transparent 38% 100%);
      }
      .workhub-template-proposals_leads .workhub-template-graphic::after {
        background-image: repeating-linear-gradient(90deg, rgba(109, 74, 173, 0.22) 0 2px, transparent 2px 9px);
        inset: auto 8px 8px 8px;
        height: 10px;
      }
      .workhub-template-selection-note {
        border: 1px solid #dce8fb;
        background: #f6faff;
        border-radius: 10px;
        padding: 8px 9px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-template-selection-note strong {
        color: #1f3f73;
        font-size: 0.78rem;
      }
      .workhub-template-selection-note span {
        color: #5b7097;
        font-size: 0.72rem;
        line-height: 1.3;
      }
      .workhub-template-selection-highlights {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .workhub-workspace-template-id {
        border: 1px solid #dce8fb;
        background: #f8fbff;
        border-radius: 10px;
        padding: 10px;
        display: grid;
        grid-template-columns: 74px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
      }
      .workhub-workspace-template-id-content {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .workhub-workspace-template-id-content strong {
        color: #1f3f73;
        font-size: 0.8rem;
      }
      .workhub-workspace-template-id-content span {
        color: #5b7097;
        font-size: 0.74rem;
        line-height: 1.3;
      }
      .workhub-template-warning-note {
        margin-top: 8px;
        border: 1px dashed #e3c78f;
        background: #fff7e8;
        border-radius: 10px;
        padding: 8px 9px;
        color: #8a5a00;
        font-size: 0.72rem;
        line-height: 1.35;
      }
      .workhub-create-date-grid {
        gap: 8px;
      }
      .workhub-create-actions {
        margin-top: 4px;
        padding-top: 10px;
        border-top: 1px solid #e2ebfb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .workhub-create-actions button {
        margin-top: 0;
      }
      .workhub-create-actions-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-left: auto;
      }
      .workhub-create-option-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.74rem;
        color: #445f8c;
        font-weight: 600;
      }
      .workhub-create-option-toggle input {
        margin: 0;
      }
      .workhub-create-option-toggle span {
        white-space: nowrap;
      }
      .workhub-create-hint-text {
        margin: 2px 0 0;
        color: var(--wh-text-secondary);
      }
      .workhub-icon-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-icon-field span {
        font-size: 0.76rem;
        font-weight: 700;
        color: #2a446f;
      }
      .workhub-collapse-toggle {
        border: 1px solid #d8e4fa;
        background: #f7faff;
        color: #37598f;
        border-radius: 8px;
        padding: 6px 10px;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
        text-align: left;
      }
      .workhub-collapsible-panel {
        border: 1px solid #e1ebfb;
        background: #fbfdff;
        border-radius: 10px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-field-grid.compact-core-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .workhub-color-pill {
        width: 20px;
        height: 20px;
        border-radius: 999px;
        border: 2px solid transparent;
        cursor: pointer;
      }
      .workhub-color-pill.active {
        border-color: #1f325e;
      }
      .workhub-task-layout {
        display: grid;
        gap: 8px;
        grid-template-columns: minmax(0, 1.1fr) minmax(290px, 0.9fr);
      }
      .workhub-task-group {
        border-radius: 11px;
        border: 1px solid #e3ecfb;
        background: #f9fbff;
        width: 100%;
        overflow: visible;
      }
      .workhub-task-context-menu {
        min-width: 196px;
        display: grid;
        gap: 4px;
        padding: 7px;
        border-radius: 10px;
        border: 1px solid #cddbf2;
        background: #ffffff;
        box-shadow: 0 14px 28px rgba(22, 43, 77, 0.18);
      }
      .workhub-task-context-menu button {
        border: 1px solid #d9e5f8;
        background: #f8fbff;
        color: #2f4f82;
        border-radius: 8px;
        min-height: 30px;
        text-align: left;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 600;
        padding: 0 10px;
        cursor: pointer;
      }
      .workhub-task-context-menu button:hover {
        background: #edf4ff;
        border-color: #bdd2f4;
      }
      .workhub-task-context-menu button.is-danger {
        color: #9a2434;
        border-color: #f0c7cf;
        background: #fff6f7;
      }
      .workhub-task-context-menu button.is-danger:hover {
        background: #ffecee;
        border-color: #e79aa8;
      }
      .workhub-task-context-menu-separator {
        height: 1px;
        background: #e3ecfb;
        margin: 2px 0;
      }
      .workhub-task-group-head {
        padding: 7px 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f1f6ff;
        border-bottom: 1px solid #e0eafb;
      }
      .workhub-task-group-head-left {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .workhub-task-group-head span {
        color: #5870a4;
        font-size: 0.7rem;
        font-weight: 700;
      }
      .workhub-task-group-toggle {
        border: 0;
        background: transparent;
        color: #5870a4;
        font-size: 0.7rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        flex-shrink: 0;
      }
      .workhub-task-group-toggle-caret {
        color: #7a8fb8;
        font-size: 0.72rem;
      }
      /* collapsed collapsible (completed/done) group ─────────────────── */
      .workhub-task-group.is-collapsible.is-collapsed {
        border-color: #d0e8d8;
        background: #f4fbf6;
        margin-top: 10px;
      }
      .workhub-task-group.is-collapsible.is-collapsed .workhub-task-group-head {
        background: linear-gradient(90deg, #eaf7ee 0%, #f4fbf6 100%);
        border-bottom: none;
        border-radius: 10px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .workhub-task-group.is-collapsible.is-collapsed .workhub-task-group-head:hover {
        background: linear-gradient(90deg, #dbf2e3 0%, #ecf7ef 100%);
      }
      .workhub-task-group.is-collapsible.is-collapsed .workhub-task-group-head h3 {
        color: #2a7a47;
      }
      .workhub-task-group-done-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 17px;
        height: 17px;
        border-radius: 50%;
        background: #2a7a47;
        color: #ffffff;
        font-size: 0.58rem;
        font-weight: 900;
        line-height: 1;
        flex-shrink: 0;
      }
      .workhub-task-group-done-hint {
        font-size: 0.69rem;
        color: #4e9165;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-task-group.is-collapsible.is-collapsed .workhub-task-group-toggle {
        color: #2a7a47;
        background: rgba(42, 122, 71, 0.1);
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 0.72rem;
      }
      .workhub-task-group-body {
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .workhub-task-row.workhub-task-row-draft {
        cursor: default;
        background: #fcfdff;
      }
      .workhub-task-row.workhub-task-row-draft:hover {
        background: #f7faff;
        border-color: #e3ecfb;
      }
      .workhub-task-row-draft .workhub-task-row-main {
        padding: 3px 7px;
      }
      .workhub-task-row-draft .workhub-task-col.details input[type="checkbox"] {
        opacity: 0.55;
        pointer-events: none;
      }
      .workhub-quick-add-finance-value-wrap {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 1px solid #d2dff3;
        border-radius: 6px;
        background: #f5f9ff;
        padding: 0 6px;
        height: 26px;
        width: 100%;
        max-width: 112px;
      }
      .workhub-quick-add-value-input {
        width: 100%;
        min-width: 0;
        border: 0;
        background: transparent;
        color: #17305c;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 600;
        text-align: right;
        appearance: textfield;
      }
      .workhub-quick-add-value-input::-webkit-outer-spin-button,
      .workhub-quick-add-value-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .workhub-quick-add-value-input:focus {
        outline: none;
      }
      .workhub-quick-add-title-input {
        background: transparent;
        border-color: transparent;
        padding-left: 0;
      }
      .workhub-quick-add-title-input::placeholder {
        color: #aabbd8;
      }
      .workhub-quick-add-title-input:focus {
        border-color: #d8e4fa;
        background: #ffffff;
        padding-left: 6px;
      }
      .workhub-task-status-btn.workhub-task-status-btn-static {
        pointer-events: none;
        cursor: default;
      }
      .workhub-quick-add-menu-wrap {
        position: relative;
      }
      .workhub-quick-add-trigger {
        margin-top: 0;
      }
      .workhub-quick-add-assignee-trigger {
        border: none;
        background: transparent;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .workhub-quick-add-select,
      .workhub-quick-add-date {
        width: 100%;
        min-width: 0;
        border: 1px solid #d8e4fa;
        border-radius: 6px;
        background: #ffffff;
        color: #17305c;
        font: inherit;
        font-size: 0.71rem;
        line-height: 1.2;
        padding: 4px 6px;
        outline: none;
      }
      .workhub-quick-add-select:focus,
      .workhub-quick-add-date:focus {
        border-color: #7aa2ff;
      }
      .workhub-quick-add-select {
        cursor: pointer;
      }
      .workhub-quick-add-project-select {
        min-width: 92px;
      }
      .workhub-quick-add-menu {
        z-index: 40;
        max-height: min(280px, 42vh);
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .workhub-quick-add-menu .workhub-assignee-badge,
      .workhub-quick-add-menu .workhub-assignee-fallback {
        width: 20px;
        height: 20px;
      }
      .workhub-quick-add-confirm {
        border: 1px solid #5f88ee;
        background: #4d84ff;
        color: #fff;
        border-radius: 6px;
        padding: 4px 10px;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        margin-top: 0;
      }
      .workhub-quick-add-confirm:hover {
        background: #3a6fe0;
      }
      .workhub-quick-add-placeholder {
        display: block;
        min-height: 26px;
      }
      .workhub-quick-add-inline-note {
        color: #9aaac2;
        font-size: 0.69rem;
        white-space: nowrap;
      }
      .workhub-task-table-head,
      .workhub-task-row-grid {
        display: grid;
        grid-template-columns: minmax(0, 2.8fr) 72px minmax(108px, 1fr) 44px 44px;
        gap: 6px;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
      }
      /* ── Finance layout: 6-column grid with value column ── */
      .workhub-task-table-wrap.is-finance .workhub-task-table-head,
      .workhub-task-table-wrap.is-finance .workhub-task-row-grid {
        grid-template-columns: minmax(0, 2.8fr) 108px 72px minmax(108px, 1fr) 44px 44px;
      }
      /* Table-like vertical column separators in finance layout */
      .workhub-task-table-wrap.is-finance .workhub-task-col.finance-value,
      .workhub-task-table-wrap.is-finance .workhub-task-col.assignee,
      .workhub-task-table-wrap.is-finance .workhub-task-col.due,
      .workhub-task-table-wrap.is-finance .workhub-task-col.priority,
      .workhub-task-table-wrap.is-finance .workhub-task-col.checklist-inline {
        border-left: 1px solid #dde5f0;
        padding-left: 6px;
      }
      /* Stronger row borders for table look */
      .workhub-task-table-wrap.is-finance .workhub-task-row {
        border-top: 1px solid #d6e0ef;
      }
      .workhub-task-table-wrap.is-finance .workhub-task-row:first-child {
        border-top: 1px solid #d6e0ef;
      }
      /* Finance value column cell */
      .workhub-task-col.finance-value {
        display: flex;
        align-items: center;
        gap: 3px;
        min-width: 0;
        padding-right: 4px;
      }
      .workhub-finance-value-currency {
        color: #7a8da8;
        font-size: 0.67rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        flex-shrink: 0;
        white-space: nowrap;
      }
      .workhub-finance-value-input {
        flex: 1;
        min-width: 0;
        width: 100%;
        border: 1px solid transparent;
        border-radius: 4px;
        background: transparent;
        color: #1e3a5c;
        font-size: 0.8rem;
        font-weight: 600;
        text-align: right;
        padding: 2px 4px;
        outline: none;
        transition: border-color 0.15s, background 0.15s;
        -moz-appearance: textfield;
      }
      .workhub-finance-value-input::-webkit-outer-spin-button,
      .workhub-finance-value-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .workhub-finance-value-input:hover {
        border-color: #b8ccdf;
        background: #f0f5fb;
      }
      .workhub-finance-value-input:focus {
        border-color: #4a7cbc;
        background: #ffffff;
        box-shadow: 0 0 0 2px rgba(74,124,188,0.18);
      }
      .workhub-finance-value-input::placeholder {
        color: #b8c8d8;
        font-weight: 400;
      }
      /* Group total badge */
      .workhub-task-group-total {
        color: #5a7aaa;
        font-size: 0.75rem;
        font-weight: 600;
        margin-left: 8px;
        white-space: nowrap;
      }
      .workhub-col-more,
      .workhub-task-col.more {
        display: none;
      }
      .workhub-task-table-head {
        padding: 7px 8px;
        background: #f4f8ff;
        border-top: 1px solid #e0eafb;
        border-bottom: 1px solid #e0eafb;
      }
      .workhub-task-table-head.shared {
        position: sticky;
        top: 0;
        z-index: 3;
      }
      .workhub-task-table-head span {
        color: #5d7095;
        font-size: 0.68rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .workhub-select-all-head {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      .workhub-select-all-head input {
        margin: 0;
      }
      @keyframes workhub-linked-task-pulse {
        0% {
          box-shadow: inset 3px 0 0 #c28411, 0 0 0 0 rgba(213, 140, 24, 0.34);
        }
        65% {
          box-shadow: inset 3px 0 0 #c28411, 0 0 0 7px rgba(213, 140, 24, 0);
        }
        100% {
          box-shadow: inset 3px 0 0 #c28411, 0 0 0 0 rgba(213, 140, 24, 0);
        }
      }
      .workhub-task-row {
        cursor: pointer;
        transition: background-color 0.08s ease, border-color 0.08s ease;
        border-top: 1px solid #e2e8f0;
        border-radius: 0;
        background: #ffffff;
        position: relative;
      }
      .workhub-task-row.has-open-menu {
        z-index: 30;
      }
      .workhub-task-row:first-child {
        border-top: 0;
      }
      .workhub-task-row.is-alt {
        background: #f1f3f5;
      }
      .workhub-task-row:hover {
        background: #f8fbff;
        border-color: #c8d2df;
        transition: none;
      }
      .workhub-task-row.is-selected {
        background: #dfe8f8;
        border-color: #8ea4c8;
        box-shadow: inset 3px 0 0 #4f74bd;
        transition: none;
      }
      .workhub-task-row.is-linked-highlight {
        background: #fff5de;
        border-color: #e3c06f;
        box-shadow: inset 3px 0 0 #c28411;
        animation: workhub-linked-task-pulse 1.15s ease-out 2;
      }
      .workhub-task-row.is-selected.is-linked-highlight {
        background: #ffecc6;
        border-color: #d8aa47;
        box-shadow: inset 3px 0 0 #ac730d;
      }
      .workhub-task-row.is-linked-highlight .workhub-task-row-title strong {
        color: #5f3e08;
      }
      .workhub-task-row.is-checked {
        background: #e7eef9;
        border-color: #a8bad8;
      }
      .workhub-task-row.is-drop-target {
        box-shadow: inset 0 2px 0 #4d84ff;
      }
      .workhub-task-row.is-dragging {
        opacity: 0.5;
      }
      .workhub-task-row:hover .workhub-task-row-title strong {
        color: #1f3451;
      }
      .workhub-task-row.is-selected .workhub-task-row-title strong {
        color: #15386a;
      }
      /* ── completed / done status group — muted task rows ─────────────── */
      .workhub-task-group.is-collapsible .workhub-task-row {
        background: #f8f9fa;
        border-top-color: #e8ecf0;
      }
      .workhub-task-group.is-collapsible .workhub-task-row.is-alt {
        background: #f3f4f6;
      }
      .workhub-task-group.is-collapsible .workhub-task-row:hover {
        background: #f0f4f8;
      }
      .workhub-task-group.is-collapsible .workhub-task-row-title strong {
        color: #8a9ab8;
        font-weight: 400;
        text-decoration: line-through;
        text-decoration-color: #b8c4d4;
      }
      .workhub-task-group.is-collapsible .workhub-task-row:hover .workhub-task-row-title strong {
        color: #6a7e9e;
      }
      .workhub-task-group.is-collapsible .workhub-task-row.is-selected .workhub-task-row-title strong {
        color: #4a6080;
        text-decoration: none;
      }
      .workhub-task-group.is-collapsible .workhub-task-due-label,
      .workhub-task-group.is-collapsible .workhub-task-due-btn,
      .workhub-task-group.is-collapsible .workhub-tah-name {
        opacity: 0.55;
      }
      .workhub-task-group.is-collapsible .workhub-assignee-badge img,
      .workhub-task-group.is-collapsible .workhub-assignee-fallback,
      .workhub-task-group.is-collapsible .workhub-assignee-initials {
        opacity: 0.5;
        filter: grayscale(0.6);
      }
      .workhub-task-row-main {
        display: flex;
        flex-direction: column;
        gap: 0;
        min-width: 0;
        padding: 6px 8px;
      }
      .workhub-task-row-grid {
        min-width: 0;
        min-height: 30px;
        align-items: center;
      }
      .workhub-task-sections.task-view-cards .workhub-task-group-body,
      .workhub-task-sections.task-view-grid .workhub-task-group-body {
        display: grid;
        gap: 10px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-group-body {
        grid-template-columns: minmax(0, 1fr);
      }
      .workhub-task-sections.task-view-grid .workhub-task-group-body {
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      }
      .workhub-task-sections.task-view-cards .workhub-task-table-head,
      .workhub-task-sections.task-view-grid .workhub-task-table-head {
        display: none;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row,
      .workhub-task-sections.task-view-grid .workhub-task-row {
        border: 1px solid #d9e3f6;
        border-radius: 12px;
        overflow: hidden;
        background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
        box-shadow: 0 4px 12px rgba(32, 63, 115, 0.08);
      }
      .workhub-task-sections.task-view-grid .workhub-task-row:hover {
        background: #f8fbff;
        border-color: #b7c7df;
        box-shadow: inset 2px 0 0 #8aacd8;
      }
      .workhub-task-sections.task-view-grid .workhub-task-row.is-selected {
        background: #eef3fb;
        border-color: #b7c7df;
        box-shadow: inset 2px 0 0 #4f74bd;
        transition: none;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row.is-linked-highlight,
      .workhub-task-sections.task-view-grid .workhub-task-row.is-linked-highlight {
        background: linear-gradient(180deg, #fff7e7 0%, #fff0d1 100%);
        border-color: #e0b969;
        box-shadow: inset 2px 0 0 #bc7f10, 0 4px 12px rgba(145, 94, 14, 0.18);
        animation: workhub-linked-task-pulse 1.15s ease-out 2;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row.is-selected.is-linked-highlight,
      .workhub-task-sections.task-view-grid .workhub-task-row.is-selected.is-linked-highlight {
        background: linear-gradient(180deg, #ffefce 0%, #ffe5b9 100%);
        border-color: #d3a149;
        box-shadow: inset 2px 0 0 #a46b0b, 0 4px 12px rgba(138, 86, 10, 0.2);
      }
      .workhub-task-sections.task-view-grid .workhub-task-row:hover .workhub-task-row-title strong {
        color: #1f3451;
      }
      .workhub-task-sections.task-view-grid .workhub-task-row.is-selected .workhub-task-row-title strong {
        color: #15386a;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row.has-open-menu,
      .workhub-task-sections.task-view-grid .workhub-task-row.has-open-menu {
        overflow: visible;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row:first-child,
      .workhub-task-sections.task-view-grid .workhub-task-row:first-child {
        border-top: 1px solid #d9e3f6;
      }
      @media (prefers-reduced-motion: reduce) {
        .workhub-task-row.is-linked-highlight,
        .workhub-task-sections.task-view-cards .workhub-task-row.is-linked-highlight,
        .workhub-task-sections.task-view-grid .workhub-task-row.is-linked-highlight {
          animation: none;
        }
      }
      .workhub-task-sections.task-view-cards .workhub-task-row-grid,
      .workhub-task-sections.task-view-grid .workhub-task-row-grid {
        grid-template-columns: minmax(0, 1fr) auto auto auto auto;
        gap: 8px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row-main,
      .workhub-task-sections.task-view-grid .workhub-task-row-main {
        padding: 10px 10px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.details,
      .workhub-task-sections.task-view-grid .workhub-task-col.details {
        grid-template-columns: 14px 14px minmax(0, 1fr);
      }
        .workhub-task-sections.task-view-cards .workhub-task-col.details {
          grid-template-columns: 18px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
        }
      .workhub-task-sections.task-view-cards .workhub-task-row-title strong,
      .workhub-task-sections.task-view-grid .workhub-task-row-title strong {
        font-size: 0.8rem;
        line-height: 1.3;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.checklist-inline,
      .workhub-task-sections.task-view-grid .workhub-task-col.checklist-inline {
        display: none;
      }
      /* ── Grid card layout (task-view-grid) ── */
      .workhub-task-grid-card {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-width: 0;
        padding: 10px 12px;
        box-sizing: border-box;
      }
      .workhub-task-grid-card-body {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-task-grid-line1 {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .workhub-task-grid-title {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .workhub-task-grid-title strong {
        font-size: 0.82rem;
        font-weight: 700;
        color: #1e3a5c;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        line-height: 1.3;
      }
      .workhub-task-grid-title .workhub-task-title-edit-input {
        width: 100%;
      }
      .workhub-task-grid-line2 {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        min-width: 0;
      }
      .workhub-task-grid-meta-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: none;
        border: none;
        padding: 2px 6px;
        border-radius: 4px;
        cursor: pointer;
        color: #4a6a90;
        font-size: 0.71rem;
        white-space: nowrap;
        transition: background 0.12s;
        position: relative;
      }
      .workhub-task-grid-meta-btn:hover {
        background: #e8f0f9;
      }
      .workhub-task-grid-meta-btn .workhub-task-due-input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
        width: 0;
        height: 0;
      }
      .workhub-task-grid-meta-avatar {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }
      .workhub-task-grid-meta-fallback {
        font-size: 0.7rem;
        line-height: 1;
      }
      .workhub-task-grid-meta-label {
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-grid-meta-btn.is-due.is-set {
        color: #2a6aa0;
        font-weight: 600;
      }
      /* Simplified time ring for grid view */
      .workhub-task-grid-time-ring {
        flex-shrink: 0;
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-task-grid-time-ring svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }
      .workhub-task-grid-time-ring .workhub-task-time-ring-track {
        fill: none;
        stroke: #d8e8f5;
        stroke-width: 3;
      }
      .workhub-task-grid-time-ring .workhub-task-time-ring-progress {
        fill: none;
        stroke: #4a7cbc;
        stroke-width: 3;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.4s ease;
      }
      .workhub-task-grid-time-ring.is-overdue .workhub-task-time-ring-progress {
        stroke: #e05050;
      }
      .workhub-task-grid-time-ring.is-empty .workhub-task-time-ring-track {
        stroke: #e8eef6;
      }
      .workhub-task-grid-time-center {
        position: relative;
        z-index: 1;
        text-align: center;
        line-height: 1;
      }
      .workhub-task-grid-time-center strong {
        display: block;
        font-size: 0.62rem;
        font-weight: 700;
        color: #2a5585;
        white-space: nowrap;
      }
      .workhub-task-grid-time-ring.is-overdue .workhub-task-grid-time-center strong {
        color: #c03030;
      }
      .workhub-task-grid-time-ring.is-empty .workhub-task-grid-time-center strong {
        color: #9ab0cc;
      }
      /* Remove padding from task-row-main in grid view since grid-card handles its own padding */
      .workhub-task-sections.task-view-grid .workhub-task-row-main {
        padding: 0;
      }

      .workhub-task-sections.task-view-cards .workhub-task-group-body {
        gap: 6px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-group {
        border: 0;
        background: transparent;
        border-radius: 0;
      }
      .workhub-task-sections.task-view-cards .workhub-task-group-head {
        background: transparent;
        border-bottom: 0;
        padding-left: 0;
        padding-right: 0;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row {
        border: 1px solid #d8e3f6;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: none;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row.is-alt,
      .workhub-task-sections.task-view-cards .workhub-task-row:hover {
        background: #f8fbff;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row.is-selected {
        border-color: #8aa8da;
        box-shadow: inset 3px 0 0 #4f74bd;
        transition: none;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row-main {
        padding: 16px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 104px;
        column-gap: 14px;
        align-items: start;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-main-col {
        display: grid;
        grid-template-rows: auto auto auto;
        row-gap: 12px;
        min-width: 0;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-details {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        width: 100%;
        min-width: 0;
      }
      .workhub-task-sections.task-view-cards .workhub-task-drag-handle {
        display: none;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-details input[type='checkbox'] {
        margin-top: 2px;
        accent-color: #4f74bd;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-title {
        min-width: 0;
        flex-wrap: nowrap;
        overflow: hidden;
        width: 100%;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-title strong {
        font-size: 0.86rem;
        line-height: 1.35;
        font-weight: 400;
        color: #1d3357;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        min-width: 0;
        width: 100%;
        max-width: 100%;
        flex: 1 1 auto;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-meta-item {
        position: relative;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        border-radius: 10px;
        border: 1px solid #d8e4f7;
        background: #f8fbff;
        color: #506989;
        padding: 6px 10px;
        font-size: 0.72rem;
        line-height: 1.25;
      }
      .workhub-task-sections.task-view-cards button.workhub-task-card-meta-item {
        cursor: pointer;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-meta-icon {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-meta-copy {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-meta-avatar {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        object-fit: cover;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-meta-avatar-fallback {
        font-size: 0.85rem;
        line-height: 1;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-supporting {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .workhub-task-sections.task-view-cards .workhub-task-card-time-col {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100%;
      }
      .workhub-task-sections.task-view-cards .workhub-task-time-ring {
        position: relative;
        width: 88px;
        height: 88px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-time-ring svg {
        width: 88px;
        height: 88px;
        transform: rotate(-90deg);
      }
      .workhub-task-sections.task-view-cards .workhub-task-time-ring-track {
        fill: none;
        stroke: #e6eefb;
        stroke-width: 7;
      }
      .workhub-task-sections.task-view-cards .workhub-task-time-ring-progress {
        fill: none;
        stroke: #4f74bd;
        stroke-width: 7;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.2s ease;
      }
      .workhub-task-sections.task-view-cards .workhub-task-time-ring.is-overdue .workhub-task-time-ring-progress {
        stroke: #d45555;
      }
      .workhub-task-sections.task-view-cards .workhub-task-time-ring.is-empty .workhub-task-time-ring-progress {
        stroke: #cbd8ec;
      }
      .workhub-task-sections.task-view-cards .workhub-task-time-ring-center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        pointer-events: none;
      }
      .workhub-task-sections.task-view-cards .workhub-task-time-ring-center strong {
        font-size: 0.95rem;
        line-height: 1;
        color: #1e355b;
      }
      .workhub-task-sections.task-view-cards .workhub-task-time-ring-center span {
        margin-top: 3px;
        font-size: 0.62rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #7f93b2;
      }
      .workhub-task-col {
        min-width: 0;
      }
      .workhub-task-col.details {
        display: grid;
        grid-template-columns: 16px 14px minmax(0, 1fr);
        gap: 6px;
        align-items: center;
      }
      .workhub-task-col.details input[type="checkbox"] {
        width: 13px;
        height: 13px;
        margin: 0;
      }
      .workhub-task-drag-handle {
        border: 0;
        background: transparent;
        color: #8ea1c2;
        font: inherit;
        font-size: 0.78rem;
        line-height: 1;
        padding: 0;
        width: 16px;
        height: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        user-select: none;
        opacity: 0;
        transition: opacity 0.1s;
      }
      .workhub-task-row:hover .workhub-task-drag-handle,
      .workhub-task-row:focus-within .workhub-task-drag-handle {
        opacity: 1;
      }
      .workhub-task-drag-handle:hover {
        color: #4d84ff;
      }
      .workhub-task-drag-handle:active {
        cursor: grabbing;
      }
      .workhub-task-drag-handle-placeholder {
        color: transparent;
        cursor: default;
      }
      .workhub-task-col.details .workhub-task-row-title {
        min-width: 0;
      }
      .workhub-task-col.details .workhub-task-row-title strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.details .workhub-task-row-title strong {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
      .workhub-task-col.status,
      .workhub-task-col.assignee {
        display: flex;
      }
      .workhub-task-col.checklist-inline,
      .workhub-task-col.actions-inline {
        display: flex;
        justify-content: flex-end;
      }
      .workhub-task-col.checklist-inline {
        justify-content: center;
        align-items: center;
        gap: 4px;
      }
      .workhub-task-table-wrap.is-finance .workhub-task-row-draft .workhub-task-col.checklist-inline {
        justify-content: flex-end;
        gap: 6px;
      }
      .workhub-task-checklist-progress {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .workhub-task-title-checklist-progress {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        margin-left: 4px;
      }
      .workhub-task-title-checklist-progress .workhub-task-checklist-progress-track {
        width: 36px;
        height: 4px;
      }
      .workhub-task-title-checklist-progress .workhub-task-checklist-progress-label {
        font-size: 0.6rem;
        color: #7a8fb5;
        font-weight: 600;
      }
      .workhub-task-checklist-progress-track {
        width: 34px;
        height: 5px;
        border-radius: 999px;
        background: #e4ecfb;
        overflow: hidden;
        display: inline-flex;
      }
      .workhub-task-checklist-progress-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #3d7af1 0%, #61b47e 100%);
      }
      .workhub-task-checklist-progress-label {
        font-size: 0.58rem;
        font-weight: 700;
        color: #526b95;
        letter-spacing: 0.01em;
        white-space: nowrap;
      }
      .workhub-task-attachment-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #eef4ff;
        color: #2b4f86;
        font-size: 0.62rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .workhub-task-col.actions-inline {
        align-items: center;
        gap: 6px;
      }
      .workhub-task-col.status,
      .workhub-task-col.priority {
        justify-content: center;
        position: relative;
      }
      .workhub-task-status-btn {
        border: 1px solid color-mix(in srgb, var(--status-color, #8aa0c7) 45%, #dbe6ff);
        background: #f9fbff;
        min-height: 20px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        padding: 0 8px;
        color: #274168;
        font-size: 0.66rem;
        font-weight: 600;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      .workhub-task-status-label {
        color: #274168;
        font-size: 0.66rem;
        font-weight: 700;
        line-height: 1.1;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
      .workhub-task-status-menu {
        position: absolute;
        top: 30px;
        left: 0;
        z-index: 90;
        min-width: 150px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        padding: 4px;
      }
      .workhub-task-status-menu button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        text-align: left;
        padding: 6px 8px;
        color: #274168;
        font-size: 0.73rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-task-status-menu button:hover,
      .workhub-task-status-menu button.is-active {
        background: #eff5ff;
      }
      .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--status-color, #8aa0c7);
        flex-shrink: 0;
      }
      .workhub-task-status-btn .status-dot {
        width: 5px;
        height: 5px;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95);
      }
      .status-icon {
        line-height: 1;
        font-size: 0.72rem;
      }
      .workhub-assignee-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
      }
      button.workhub-task-assignee-btn {
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
        border-radius: 999px;
      }
      button.workhub-task-assignee-btn:hover .workhub-assignee-fallback,
      button.workhub-task-assignee-btn:hover img {
        transform: translateY(-1px);
      }
      .workhub-task-col.assignee {
        position: relative;
      }
      .workhub-task-assignee-menu {
        position: fixed;
        min-width: 140px;
        max-height: min(300px, 42vh);
        overflow-y: auto;
        overscroll-behavior: contain;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 9px;
        padding: 5px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .workhub-task-assignee-menu .workhub-composer-notify-check {
        padding: 6px 10px;
        font-size: 0.73rem;
      }
      .workhub-task-assignee-menu .workhub-composer-notify-option {
        font-size: 0.73rem;
      }
      .workhub-task-assignee-menu button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        text-align: left;
        padding: 5px 8px;
        color: #274168;
        font-size: 0.73rem;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-task-assignee-menu button:hover,
      .workhub-task-assignee-menu button.is-active {
        background: #eff5ff;
      }
      .workhub-assignee-badge img,
      .workhub-assignee-fallback {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        flex-shrink: 0;
        border: 1px solid #b9caec;
        box-shadow: 0 0 0 2px #eef4ff;
      }
      .workhub-assignee-badge img {
        object-fit: cover;
        background: #ffffff;
      }
      .workhub-assignee-fallback {
        display: grid;
        place-items: center;
        background: #edf4ff;
        color: #35548a;
      }
      .workhub-assignee-initials {
        display: grid;
        place-items: center;
        background: #d4e3ff;
        color: #274168;
        font-size: 0.56rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        flex-shrink: 0;
        border: 1px solid #b9caec;
        box-shadow: 0 0 0 2px #eef4ff;
      }
      .workhub-task-people {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .workhub-task-card-meta-item.is-assignee,
      .workhub-task-grid-meta-btn.is-assignee,
      .workhub-task-assignee-btn {
        position: relative;
      }
      .workhub-task-assignee-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 16px;
        height: 16px;
        padding: 0 5px;
        border-radius: 999px;
        border: 1px solid #c5d7f2;
        background: #f3f8ff;
        color: #2d4e7f;
        font-size: 0.62rem;
        font-weight: 600;
        line-height: 1;
        margin-left: 4px;
      }
      .workhub-task-creator-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: default;
      }
      .workhub-task-creator-badge img,
      .workhub-task-creator-badge .workhub-assignee-initials {
        border-color: #2f66cc;
        box-shadow: 0 0 0 2px #cddfff;
      }
      .workhub-task-assignee-btn img,
      .workhub-task-assignee-btn .workhub-assignee-fallback {
        border-color: transparent;
        box-shadow: none;
      }
      .workhub-task-assignee-btn.is-creator img,
      .workhub-task-assignee-btn.is-creator .workhub-assignee-fallback {
        border-color: #2f66cc;
        box-shadow: 0 0 0 2px #cddfff;
      }
      .workhub-task-due-btn {
        border: 0;
        background: transparent;
        padding: 0;
        cursor: pointer;
        display: block;
        text-align: left;
        font-size: 0.74rem;
        color: #4f648c;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-task-due-btn:hover {
        text-decoration: underline;
      }
      .workhub-task-due-btn.is-set {
        color: #cf4e67;
      }
      .workhub-task-due-inline {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .workhub-task-due-picker-trigger {
        border: 0;
        background: transparent;
        padding: 0;
        cursor: pointer;
        line-height: 1;
        color: #4f648c;
      }
      .workhub-task-due-label {
        border: 0;
        background: transparent;
        color: #4f648c;
        font-size: 0.74rem;
        min-width: 72px;
        padding: 0;
        text-align: left;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-task-due-label.is-set {
        color: #2d4670;
      }
      .workhub-task-start-inline {
        color: #667fae;
        font-size: 0.66rem;
        line-height: 1;
        white-space: nowrap;
      }
      .workhub-task-due-input {
        position: absolute;
        left: 0;
        top: 0;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
        border: 0;
        padding: 0;
      }
      .workhub-task-due-input::-webkit-calendar-picker-indicator {
        opacity: 0;
        width: 0;
        margin: 0;
        padding: 0;
      }
      .workhub-task-due-input:focus {
        outline: none;
      }
      .workhub-task-col.checklist-inline .workhub-checklist-toggle {
        min-width: 28px;
        padding: 2px 6px;
        justify-content: center;
      }
      .workhub-task-comment-unread-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid #f1b5bf;
        background: #fff1f4;
        color: #b1374d;
        font-size: 0.62rem;
        font-weight: 700;
        line-height: 1;
        padding: 2px 7px;
        white-space: nowrap;
      }
      .workhub-task-sections.task-view-cards .workhub-task-checklist-progress-track,
      .workhub-task-sections.task-view-grid .workhub-task-checklist-progress-track {
        width: 44px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-checklist-progress-label,
      .workhub-task-sections.task-view-grid .workhub-task-checklist-progress-label {
        font-size: 0.61rem;
      }
      .workhub-task-attachment-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        color: #e05567;
        font-size: 0.82rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .workhub-priority-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.76rem;
        font-weight: 700;
      }
      .workhub-priority-pill .priority-flag {
        font-size: 0.9rem;
        line-height: 1;
      }
      .workhub-priority-pill.priority-urgent,
      .workhub-priority-pill.priority-high {
        color: #d09200;
      }
      .workhub-priority-pill.priority-medium {
        color: #315fd6;
      }
      .workhub-priority-pill.priority-low {
        color: #6f7d96;
      }
      .workhub-priority-indicator {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        display: inline-grid;
        place-items: center;
        font-size: 0.66rem;
        border: 1px solid transparent;
        background: #f4f7fd;
        cursor: pointer;
      }
      .workhub-priority-indicator.priority-urgent,
      .workhub-priority-indicator.priority-high {
        color: #d09200;
        border-color: #f0d9a8;
        background: #fff8ea;
      }
      .workhub-priority-indicator.priority-medium {
        color: #315fd6;
        border-color: #c8d9ff;
        background: #edf3ff;
      }
      .workhub-priority-indicator.priority-low {
        color: #6f7d96;
        border-color: #d7deea;
        background: #f5f7fb;
      }
      .workhub-task-priority-menu {
        position: absolute;
        top: 32px;
        right: 0;
        z-index: 90;
        min-width: 142px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        padding: 4px;
      }
      .workhub-task-priority-menu button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        text-align: left;
        padding: 4px 6px;
        color: #274168;
        font-size: 0.73rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-task-priority-menu button:hover,
      .workhub-task-priority-menu button.is-active {
        background: #eff5ff;
      }
      .workhub-detail-icon-menu.workhub-quick-add-menu,
      .workhub-task-priority-menu.workhub-quick-add-menu {
        top: auto;
        bottom: calc(100% + 6px);
      }
      .workhub-task-col.more {
        justify-content: flex-end;
        position: relative;
      }
      .workhub-task-more-btn {
        border: 1px solid #d9e5fa;
        background: #f8fbff;
        color: #4e6490;
        width: 20px;
        height: 20px;
        border-radius: 6px;
        line-height: 1;
        cursor: pointer;
      }
      .workhub-task-col.actions-inline .workhub-gear-btn {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        font-size: 0.66rem;
      }
      .workhub-task-more-menu {
        position: absolute;
        top: 30px;
        right: 0;
        z-index: 90;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 138px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        padding: 4px;
      }
      .workhub-task-more-menu button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        text-align: left;
        padding: 6px 8px;
        color: #274168;
        font-size: 0.73rem;
        cursor: pointer;
      }
      .workhub-task-more-menu button:hover {
        background: #eff5ff;
      }
      .workhub-task-row-meta {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-notes-textarea {
        min-height: 200px;
      }
      .workhub-notes-content-area {
        height: 100%;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        padding: 0;
      }
      .workhub-notes-layout {
        display: flex;
        flex-direction: row;
        height: 100%;
        min-height: 0;
      }
      .workhub-notes-card {
        margin-top: 8px;
      }
      .workhub-documents-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .workhub-documents-title-icon {
        flex: 0 0 auto;
        font-size: 1.15rem;
        line-height: 1;
      }
      .workhub-rail-resize-handle {
        flex: 0 0 14px;
        width: 14px;
        min-width: 14px;
          background: transparent;
        cursor: col-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
          transition: background 0.15s;
        user-select: none;
        touch-action: none;
          z-index: 8;
          overflow: visible;
        }
        .workhub-rail-resize-handle::before {
          content: '';
          width: 4px;
          height: 112px;
          border-radius: 999px;
          background: #c8d8f3;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.7);
          transition: background 0.15s, box-shadow 0.15s;
      }
      .workhub-rail-resize-handle:hover {
          background: rgba(79, 116, 189, 0.08);
      }
        .workhub-rail-resize-handle:hover::before,
        .workhub-rail-resize-handle:active::before {
          background: #7ea6ea;
          box-shadow: 0 0 0 1px rgba(126, 166, 234, 0.16);
        }
      .workhub-rail-resize-handle.is-collapsed {
        cursor: default;
        width: 20px;
        flex: 0 0 20px;
        min-width: 20px;
      }
      .workhub-rail-resize-handle.is-collapsed:hover {
        background: #f0f5ff;
      }
        .workhub-rail-resize-handle.is-collapsed::before {
          height: 110px;
        }
      .workhub-rail-toggle-btn {
        position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        width: 18px;
        height: 26px;
        background: #fff;
        border: 1px solid #d0ddf5;
        border-radius: 3px;
        color: #6a7fa8;
        font-size: 13px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        padding: 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transition: color 0.15s, border-color 0.15s, background 0.15s;
      }
      .workhub-rail-toggle-btn:hover {
        color: #1a56db;
        border-color: #93b8f8;
        background: #f0f5ff;
      }
      .workhub-doc-detail-rail {
        flex: 0 0 248px;
        width: 248px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: hidden;
        border-left: 1px solid #e3eafb;
        background: #f8fbff;
        padding: 12px 12px 16px;
      }
      .workhub-doc-detail-rail.is-hidden {
        display: none;
      }
      .workhub-doc-detail-rail .workhub-detail-rail-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e3eafb;
      }
      .workhub-detail-rail-tabs {
        flex: 1 1 auto;
        display: flex;
        gap: 6px;
      }
      .workhub-detail-rail-tab {
        flex: 1 1 auto;
        min-height: 30px;
        border: 1px solid #d6e2f2;
        border-radius: 8px;
        background: #ffffff;
        color: #4a6286;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
      }
      .workhub-detail-rail-tab:hover {
        background: #f4f8ff;
        border-color: #c2d4ef;
      }
      .workhub-detail-rail-tab.is-active {
        background: #edf4ff;
        border-color: #8fb1eb;
        color: #234c89;
      }
      .workhub-detail-rail-body {
        flex: 1 1 auto;
        min-height: 0;
      }
      .workhub-detail-rail-body.is-details {
        display: flex;
        flex-direction: column;
        gap: 6px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .workhub-detail-rail-body.is-ai {
        display: flex;
        overflow: hidden;
      }
      .workhub-detail-rail-ai-view {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
      }
      .workhub-detail-rail-ai-view.is-hidden {
        display: none;
      }
      .workhub-detail-rail-ai-view.is-active {
        display: flex;
      }
      .workhub-detail-rail-head-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }
      .workhub-task-detail-rail .workhub-detail-card,
      .workhub-doc-detail-rail .workhub-detail-card {
        padding: 9px;
        border: 1px solid #e0e9f6;
        border-radius: 14px;
        background: #ffffff;
      }
      .workhub-task-detail-rail .workhub-detail-card > :last-child,
      .workhub-doc-detail-rail .workhub-detail-card > :last-child {
        margin-bottom: 0;
      }
      .workhub-document-settings-modal {
        max-width: 560px;
      }
      .workhub-doc-settings-icon-row {
        display: flex;
        align-items: center;
      }
      .workhub-doc-settings-icon-popover-wrap {
        position: relative;
      }
      .workhub-doc-settings-icon-trigger {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 38px;
        border: 1px solid #c9d7ef;
        border-radius: 10px;
        background: #fff;
        color: #304b74;
        padding: 8px 12px;
        cursor: pointer;
      }
      .workhub-doc-settings-icon-preview {
        font-size: 1.15rem;
        line-height: 1;
      }
      .workhub-doc-settings-note {
        font-size: 0.8rem;
        color: #60779e;
        line-height: 1.5;
      }
      .workhub-doc-detail-rail .workhub-detail-card h3 {
        font-size: 0.67rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #7a8fb2;
        margin: 0 0 10px;
      }
      .workhub-doc-detail-rail .workhub-detail-collapsible-info {
        margin: 0;
        overflow: hidden;
      }
      .workhub-detail-meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-doc-detail-rail .workhub-detail-meta span {
        font-size: 0.7rem;
        color: #3a527a;
        word-break: break-word;
        padding: 9px 10px;
        border: 1px solid #e2eaf6;
        border-radius: 10px;
        background: #ffffff;
      }
      .workhub-source-document-card {
        border-color: #d3e2ff !important;
        background: #f7fbff !important;
      }
      .workhub-source-document-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 10px;
      }
      .workhub-source-document-meta span {
        font-size: 0.68rem;
        color: #3c5782;
        border: 1px solid #dce8fb;
        border-radius: 8px;
        background: #ffffff;
        padding: 7px 8px;
        word-break: break-all;
      }
      .workhub-doc-edit-history {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .workhub-doc-edit-entry {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        padding: 8px 0;
      }
      .workhub-doc-edit-entry + .workhub-doc-edit-entry {
        border-top: 1px solid #edf2f8;
      }
      .workhub-doc-edit-name {
        font-size: 0.68rem;
        color: #3a527a;
      }
      .workhub-doc-edit-time {
        font-size: 0.63rem;
        color: #8da0bf;
        white-space: nowrap;
      }
      .workhub-doc-checklist-progress {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
      }
      .workhub-doc-checklist-bar {
        flex: 1;
        height: 5px;
        background: #dce8f7;
        border-radius: 3px;
        overflow: hidden;
      }
      .workhub-doc-checklist-bar-fill {
        height: 100%;
        background: #3b7ee6;
        border-radius: 3px;
        transition: width 0.25s;
      }
      .workhub-doc-checklist-progress span {
        font-size: 0.65rem;
        color: #617392;
        white-space: nowrap;
      }
      .workhub-doc-detail-rail .workhub-checklist-items {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 10px;
      }
      .workhub-doc-detail-rail .workhub-checklist-item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid #e2eaf6;
        background: #fbfdff;
      }
      .workhub-doc-detail-rail .workhub-checklist-item-text {
        font-size: 0.72rem;
      }
      .workhub-doc-detail-rail .workhub-checklist-url-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        margin-top: 6px;
        align-items: stretch;
      }
      .workhub-doc-detail-rail .workhub-checklist-url-row input {
        flex: 1 1 0;
        min-width: 0;
        font-size: 0.7rem;
        min-height: 34px;
        padding: 8px 10px;
        border: 1px solid #b8cef0;
        border-radius: 8px;
        background: #fff;
      }
      .workhub-doc-detail-rail .workhub-checklist-url-row button,
      .workhub-doc-detail-rail .workhub-checklist-url-row .workhub-file-upload-btn {
        min-height: 34px;
        font-size: 0.68rem;
        padding: 0 12px;
      }
      .workhub-doc-detail-rail .workhub-checklist-url-list {
        margin-top: 10px;
        gap: 8px;
      }
      .workhub-doc-detail-rail .workhub-checklist-url-item {
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid #e2eaf6;
        background: #fbfdff;
      }
      .workhub-doc-detail-rail .workhub-task-attachments-head {
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid #edf2f8;
      }
      .workhub-doc-detail-rail .workhub-comment-list-chat {
        max-height: 340px;
        padding: 2px 0;
      }
      .workhub-doc-detail-rail .workhub-comment-composer {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #edf2f8;
      }
      .workhub-doc-detail-rail .workhub-comment-composer textarea {
        min-height: 96px;
        padding: 10px 12px;
      }
      .workhub-doc-detail-rail .workhub-empty-state {
        min-height: 76px;
        padding: 12px;
        border: 1px dashed #d9e5f7;
        border-radius: 12px;
        background: #fbfdff;
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-notes-layout { flex-direction: column; }
        .workhub-rail-resize-handle {
          display: none;
        }
        .workhub-documents-title-row {
          flex-wrap: wrap;
          gap: 8px;
        }
        .workhub-documents-tab-select-wrap {
          margin-left: 0;
          min-width: 0;
          max-width: 100%;
          width: 100%;
        }
        .workhub-doc-detail-rail {
          flex: none;
          width: 100%;
          border-left: none;
          border-top: 1px solid #e3eafb;
          max-height: 45vh;
        }
        .workhub-doc-detail-rail.is-mobile-drawer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: calc(60px + env(safe-area-inset-bottom));
          width: 100%;
          max-height: calc(68vh - env(safe-area-inset-bottom));
          border-top: 1px solid #d9e6fb;
          border-left: none;
          border-radius: 14px 14px 0 0;
          background: #f8fbff;
          z-index: 47;
          transform: translateY(108%);
          transition: transform 0.26s ease;
          box-shadow: 0 -10px 24px rgba(16, 35, 68, 0.18);
          padding: 10px 12px 14px;
        }
        .workhub-doc-detail-rail.is-mobile-drawer.is-open {
          transform: translateY(0);
        }
        .workhub-detail-rail-body.is-details {
          padding-right: 0;
        }
        .workhub-doc-detail-rail .workhub-checklist-url-row {
          grid-template-columns: minmax(0, 1fr);
        }
      }
      .workhub-documents-panel {
        --workhub-doc-title-size: 0.69rem;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        height: 100%;
        min-height: 0;
        min-width: 0;
        margin-bottom: 0;
      }
      .workhub-documents-panel .workhub-panel-head {
        align-items: center;
        padding-bottom: 8px;
        margin-bottom: 0;
        border-bottom: 1px solid #d8e6f5;
      }
      .workhub-documents-head-main {
        min-width: 0;
        flex: 1;
        display: flex;
        align-items: center;
      }
      .workhub-documents-title-input {
        width: min(580px, 100%);
        border: none;
        border-bottom: 2px solid transparent;
        border-radius: 0;
        padding: 3px 2px;
        font: inherit;
        font-size: 1.05rem;
        line-height: 1.25;
        font-weight: 700;
        color: #1a2d4e;
        background: transparent;
        transition: border-color 0.15s;
      }
      .workhub-documents-title-input:focus {
        outline: none;
        border-bottom-color: #3b7ee6;
      }
      .workhub-documents-title-input:not(:disabled):hover {
        border-bottom-color: #cdd9ef;
      }
      .workhub-documents-title-input:disabled {
        color: #617392;
        cursor: not-allowed;
      }
      .workhub-public-source-chip {
        display: inline-flex;
        align-items: center;
        margin-left: 8px;
        padding: 2px 8px;
        border: 1px solid #ffc78b;
        border-radius: 999px;
        background: #fff3e5;
        color: #9a4a00;
        font-size: 0.67rem;
        font-weight: 700;
        line-height: 1.3;
        white-space: nowrap;
      }
      .workhub-documents-tab-select-wrap {
        margin-left: auto;
        min-width: 180px;
        max-width: 280px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .workhub-documents-tab-select-wrap > span {
        font-size: 0.68rem;
        font-weight: 700;
        color: #60779e;
        white-space: nowrap;
      }
      .workhub-documents-tab-select {
        width: 100%;
        min-width: 0;
        min-height: 30px;
        border: 1px solid #cbd8eb;
        border-radius: 8px;
        background: #fff;
        color: #223a5f;
        font: inherit;
        font-size: 0.72rem;
        padding: 4px 8px;
      }
      .workhub-documents-tab-select:focus {
        outline: none;
        border-color: #8fb1eb;
        box-shadow: 0 0 0 2px rgba(79, 116, 189, 0.18);
      }
      .workhub-documents-panel .workhub-panel-tools .workhub-ghost-btn,
      .workhub-documents-panel .workhub-panel-tools .workhub-danger-btn,
      .workhub-documents-panel .workhub-panel-tools .workhub-primary-btn {
        font-size: var(--workhub-doc-title-size);
        line-height: 1.2;
        font-weight: 500;
      }
      .workhub-documents-panel .workhub-panel-tools {
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-documents-panel .workhub-panel-tools .workhub-doc-tool-btn {
        min-width: 34px;
        width: 34px;
        height: 32px;
        padding: 0;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
      }
      .workhub-documents-panel .workhub-panel-tools .workhub-doc-tool-btn.is-active {
        border-color: #7aa4eb;
        background: #edf4ff;
        color: #2256a2;
      }
      .workhub-note-autosave-status {
        font-size: 0.72rem;
        color: #5d8a5e;
        font-weight: 500;
        white-space: nowrap;
        min-width: 52px;
        text-align: right;
        opacity: 0.85;
      }
      .workhub-preview-mode-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 8px;
        border: 1px solid #bfd2ef;
        border-radius: 999px;
        background: #eef5ff;
        color: #2f4f83;
        white-space: nowrap;
      }
      .workhub-preview-mode-badge strong {
        font-size: 0.69rem;
        font-weight: 700;
      }
      .workhub-preview-mode-badge span {
        font-size: 0.67rem;
        color: #5c75a0;
        font-weight: 600;
      }
      .workhub-doc-print-settings-section {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .workhub-doc-print-settings-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 12px;
        background: #f4f7fb;
        border: 1px solid #d8e6f5;
        border-radius: 8px;
        cursor: pointer;
        font: inherit;
        font-size: 0.82rem;
        font-weight: 600;
        color: #2a3f64;
        user-select: none;
        transition: background 0.12s;
      }
      .workhub-doc-print-settings-toggle:hover {
        background: #e9f0fb;
      }
      .workhub-doc-print-settings-toggle .toggle-label {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-doc-print-settings-toggle .toggle-status {
        font-size: 0.72rem;
        font-weight: 400;
        color: #617392;
        margin-left: 4px;
      }
      .workhub-doc-print-settings-toggle .toggle-chevron {
        font-size: 0.7rem;
        color: #617392;
        transition: transform 0.15s;
        display: inline-block;
      }
      .workhub-doc-print-settings-toggle.is-open .toggle-chevron {
        transform: rotate(90deg);
      }
      .workhub-doc-print-settings-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-top: 8px;
      }
      .workhub-note-autosave-status.is-transient {
        animation: workhub-note-autosave-fade 1.4s ease forwards;
      }
      .workhub-note-autosave-status.is-error {
        color: #c0392b;
      }
      .workhub-reference-publish-warning {
        margin-top: 8px;
        margin-bottom: 10px;
        border: 1px solid #ffc78b;
        border-radius: 10px;
        background: #fff4e6;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .workhub-reference-publish-warning strong {
        font-size: 0.72rem;
        color: #8a3f00;
        letter-spacing: 0.01em;
      }
      .workhub-reference-publish-warning span {
        font-size: 0.7rem;
        color: #9c5a20;
        flex: 1 1 220px;
        min-width: 180px;
      }
      .workhub-collaboration-conflict-banner {
        margin-top: 8px;
        margin-bottom: 10px;
        border: 1px solid #f0b4ad;
        border-radius: 10px;
        background: #fff1ef;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .workhub-collaboration-conflict-banner strong {
        font-size: 0.72rem;
        color: #8a2e2a;
        letter-spacing: 0.01em;
      }
      .workhub-collaboration-conflict-banner span {
        font-size: 0.7rem;
        color: #9a463f;
        flex: 1 1 220px;
        min-width: 180px;
      }
      .workhub-draft-restore-banner {
        margin-top: 8px;
        margin-bottom: 10px;
        border: 1px solid #9bc2ff;
        border-radius: 10px;
        background: #eef5ff;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .workhub-draft-restore-banner strong {
        font-size: 0.72rem;
        color: #1f4f9e;
      }
      .workhub-draft-restore-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      @keyframes workhub-note-autosave-fade {
        0% {
          opacity: 0.85;
        }
        65% {
          opacity: 0.85;
        }
        100% {
          opacity: 0;
        }
      }
      .workhub-doc-delete-confirm {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.8rem;
        color: #c0392b;
      }
      .workhub-documents-title-input::placeholder {
        color: #7a8ca8;
      }
      .workhub-documents-layout {
        margin-top: 8px;
        display: grid;
        grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
        gap: 10px;
      }
      .workhub-documents-list {
        border: 1px solid #dce8fb;
        border-radius: 10px;
        background: #f8fbff;
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 460px;
        overflow-y: auto;
      }
      .workhub-documents-list-item {
        border: 1px solid transparent;
        border-radius: 8px;
        background: #ffffff;
        text-align: left;
        padding: 7px 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        cursor: pointer;
      }
      .workhub-documents-list-item strong {
        font-size: 0.74rem;
        line-height: 1.25;
        color: #1c345f;
      }
      .workhub-documents-list-item span {
        font-size: 0.69rem;
        line-height: 1.2;
        color: #6279a3;
      }
      .workhub-documents-list-item:hover,
      .workhub-documents-list-item.is-active {
        border-color: #b7cdf2;
        background: #edf4ff;
      }
      .workhub-document-body-head {
        margin-top: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-document-body-head > span {
        font-size: 0.69rem;
        line-height: 1.2;
        font-weight: 500;
        color: #2a3d5c;
      }
      .workhub-document-format-toolbar {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
      }
      .workhub-document-format-btn {
        border: 1px solid #d7e2f1;
        background: #ffffff;
        color: #2a3d5c;
        border-radius: 6px;
        padding: 3px 7px;
        font: inherit;
        font-size: 0.67rem;
        line-height: 1.1;
        cursor: pointer;
      }
      .workhub-document-format-btn:hover {
        background: #f3f7ff;
        border-color: #b9cbe8;
      }
      .workhub-document-format-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        background: #f5f8fd;
        border-color: #d7e2f1;
      }

      /* ---- Document tabs detail card ---- */
      .workhub-doc-tabs-card {}
      .workhub-doc-tabs-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .workhub-doc-tabs-card-head h3 {
        margin: 0;
      }
      .workhub-doc-tabs-empty {
        font-size: 0.78rem;
        color: #9aaac0;
        margin: 0;
        line-height: 1.4;
      }
      .workhub-doc-master-page-status {
        font-size: 0.68rem;
        font-weight: 600;
        color: #7387aa;
      }
      .workhub-doc-tabs-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        border: 1px solid #e2eaf6;
        border-radius: 12px;
        background: #fbfdff;
        overflow: hidden;
      }
      .workhub-doc-tab-row {
        position: relative;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 10px;
        border-radius: 0;
        border: 0;
        background: transparent;
        transition: background 0.1s;
        cursor: default;
      }
      .workhub-doc-tab-row + .workhub-doc-tab-row {
        border-top: 1px solid #e8eef8;
      }
      .workhub-doc-tab-row:hover {
        background: #f3f6fb;
      }
      .workhub-doc-tab-row.is-active {
        background: #eef3fb;
      }
      .workhub-doc-tab-row[draggable="true"] {
        cursor: default;
      }
      .workhub-doc-tab-row-drag {
        font-size: 0.75rem;
        color: #b0bdd0;
        cursor: grab;
        flex-shrink: 0;
        line-height: 1;
        padding: 0 1px;
      }
      .workhub-doc-tab-row-icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        flex-shrink: 0;
        border: 1px solid transparent;
        border-radius: 4px;
        background: transparent;
        cursor: pointer;
        font-size: 0.85rem;
        padding: 0;
        transition: background 0.1s, border-color 0.1s;
      }
      .workhub-doc-tab-row-icon-btn:hover:not(:disabled) {
        background: #e0eaf8;
        border-color: #b7c7df;
      }
      .workhub-doc-tab-row-icon-btn:disabled {
        cursor: default;
      }
      .workhub-doc-tab-row-title {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.8rem;
        color: #3a4a6b;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        text-align: left;
        font-weight: 400;
      }
      .workhub-doc-tab-row-title.is-public {
        color: #9a4a00;
        font-weight: 600;
      }
      .workhub-doc-tab-row.is-active .workhub-doc-tab-row-title {
        font-weight: 600;
        color: #1e2d4a;
      }
      .workhub-doc-tab-row-title:hover {
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .workhub-doc-tab-rename-input {
        flex: 1;
        font-size: 0.8rem;
        border: 1px solid #b7c7df;
        border-radius: 3px;
        padding: 2px 5px;
        height: 24px;
        outline: none;
        background: #fff;
        color: #1e2d4a;
        min-width: 0;
      }
      .workhub-doc-tab-row-actions {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 0.1s;
      }
      .workhub-doc-tab-row:hover .workhub-doc-tab-row-actions,
      .workhub-doc-tab-row.is-active .workhub-doc-tab-row-actions {
        opacity: 1;
      }
      .workhub-tab-delete-confirm {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
      }
      .workhub-tab-delete-confirm-label {
        font-size: 0.7rem;
        color: #c0392b;
        font-weight: 600;
        white-space: nowrap;
      }
      .workhub-doc-master-page-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 8px;
      }
      .workhub-doc-master-page-variant-tabs {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin: 2px 0 10px;
      }
      .workhub-doc-master-page-variant-tab {
        border: 1px solid #d7e1f0;
        border-radius: 999px;
        background: #f9fbff;
        color: #42597e;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 6px 10px;
        cursor: pointer;
      }
      .workhub-doc-master-page-variant-tab.is-active {
        border-color: #86aaf0;
        background: #edf4ff;
        color: #244c8f;
      }
      .workhub-doc-master-page-section {
        border: 1px solid #e1e9f6;
        border-radius: 12px;
        background: #fbfdff;
        padding: 10px;
        margin-bottom: 10px;
      }
      .workhub-doc-master-page-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
      }
      .workhub-doc-master-page-section-head strong {
        font-size: 0.73rem;
        letter-spacing: 0.02em;
        color: #304a73;
      }
      .workhub-doc-master-page-grid.is-margins {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .workhub-doc-master-page-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      .workhub-doc-master-page-field.is-block {
        margin-bottom: 8px;
      }
      .workhub-doc-master-page-asset-field {
        grid-column: 1 / -1;
      }
      .workhub-doc-master-page-field span {
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        color: #60748f;
      }
      .workhub-doc-master-page-field select,
      .workhub-doc-master-page-field input,
      .workhub-doc-master-page-field textarea {
        width: 100%;
        min-width: 0;
        border: 1px solid #cbd8eb;
        border-radius: 8px;
        background: #fff;
        color: #223a5f;
        font: inherit;
        font-size: 0.76rem;
        padding: 8px 10px;
      }
      .workhub-doc-master-page-field textarea {
        resize: vertical;
        min-height: 84px;
        line-height: 1.45;
      }
      .workhub-doc-master-page-field select:disabled,
      .workhub-doc-master-page-field input:disabled,
      .workhub-doc-master-page-field textarea:disabled {
        background: #f5f7fb;
        color: #8a9bb7;
      }
      .workhub-doc-master-page-field--toggle {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
      }
      .workhub-doc-master-page-field--toggle input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: #3d63c0;
      }
      .workhub-doc-master-page-toggles {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin: 2px 0 10px;
      }
      .workhub-doc-master-page-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        padding: 0 8px;
        border: 1px solid #d7e1f0;
        border-radius: 999px;
        background: #f9fbff;
        font-size: 0.72rem;
        font-weight: 600;
        color: #42597e;
      }
      .workhub-doc-master-page-toggle-inline {
        justify-self: start;
        align-self: end;
      }
      .workhub-doc-master-page-toggle input {
        margin: 0;
      }
      .workhub-doc-master-page-asset-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .workhub-doc-master-page-branding-note,
      .workhub-doc-asset-library-note {
        margin: 0 0 8px;
        font-size: 0.71rem;
        line-height: 1.45;
        color: #6d819f;
      }
      .workhub-doc-master-page-logo-preview,
      .workhub-doc-master-page-logo-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 72px;
        border: 1px dashed #cbd8eb;
        border-radius: 10px;
        background: #f8fbff;
        margin-bottom: 8px;
      }
      .workhub-doc-master-page-logo-preview img {
        display: block;
        max-width: 100%;
        max-height: 56px;
        object-fit: contain;
      }
      .workhub-doc-master-page-logo-empty {
        padding: 8px 10px;
        font-size: 0.72rem;
        color: #7a8ea9;
        text-align: center;
      }
      .workhub-doc-master-page-asset-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(54px, 1fr));
        gap: 6px;
        margin-bottom: 8px;
      }
      .workhub-doc-master-page-asset-option {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 54px;
        padding: 6px;
        border: 1px solid #d7e1f0;
        border-radius: 10px;
        background: #fff;
        cursor: pointer;
      }
      .workhub-doc-master-page-asset-option.is-active {
        border-color: #86aaf0;
        background: #edf4ff;
        box-shadow: 0 0 0 1px rgba(73, 112, 195, 0.12) inset;
      }
      .workhub-doc-master-page-asset-option img {
        display: block;
        max-width: 100%;
        max-height: 40px;
        object-fit: contain;
      }
      .workhub-doc-asset-library-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
        gap: 8px;
      }
      .workhub-doc-asset-library-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-doc-asset-library-preview {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 74px;
        padding: 6px;
        border: 1px solid #d7e1f0;
        border-radius: 10px;
        background: #fff;
        cursor: pointer;
      }
      .workhub-doc-asset-library-preview img {
        display: block;
        max-width: 100%;
        max-height: 58px;
        object-fit: contain;
      }
      .workhub-doc-asset-library-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 4px;
      }
      .workhub-doc-master-page-note {
        margin: 0;
        font-size: 0.7rem;
        line-height: 1.45;
        color: #7d8ea8;
      }
      .workhub-print-preview-wrap {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        border: 1px solid #d6e2f4;
        border-radius: 10px;
        overflow: hidden;
        background: #f3f7ff;
      }
      .workhub-print-preview-frame {
        width: 100%;
        flex: 1 1 auto;
        min-height: 0;
        border: 0;
        background: #edf3fb;
      }
      .workhub-editor-page-preview-wrap {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        padding: 10px 34px 6px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background:
          #edf3fb
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23b0c4de' stroke-width='1'/%3E%3C/svg%3E")
          fixed
          repeat;
      }
      .workhub-editor-page-toolbar {
        position: sticky;
        top: 0;
        z-index: 5;
        min-height: 34px;
        border: 1px solid #d6e2f4;
        border-radius: 8px;
        background: linear-gradient(180deg, #fafdff 0%, #f3f7ff 100%);
        box-shadow: 0 4px 14px rgba(30, 58, 110, 0.1);
      }
      .workhub-editor-page-toolbar:empty {
        display: none;
      }
      .workhub-editor-page-toolbar .tox-toolbar-overlord,
      .workhub-editor-page-toolbar .tox-toolbar,
      .workhub-editor-page-toolbar .tox-toolbar__primary,
      .workhub-editor-page-toolbar .tox-toolbar__overflow {
        background: transparent;
        border: 0;
        min-height: 30px;
        padding: 0 2px;
      }
      .workhub-editor-page-toolbar .tox-toolbar__group {
        padding: 0 1px;
      }
      .workhub-editor-page-toolbar .tox .tox-tbtn {
        min-width: 18px;
        min-height: 18px !important;
        width: 20px;
        height: 20px;
        padding: 0;
      }
      .workhub-editor-page-toolbar .tox .tox-mbtn,
      .workhub-editor-page-toolbar .tox .tox-listboxfield .tox-listbox--select {
        min-height: 22px !important;
        padding: 0 5px;
      }
      .workhub-editor-page-toolbar .tox .tox-mbtn__select-label,
      .workhub-editor-page-toolbar .tox .tox-tbtn__select-label,
      .workhub-editor-page-toolbar .tox .tox-collection__item-label {
        font-size: 0.7rem;
      }
      .workhub-editor-page-toolbar .tox .tox-icon svg {
        width: 13px;
        height: 13px;
      }
      .workhub-editor-page-paper {
        width: min(calc(100vw - 360px), 900px);
        max-width: 100%;
        min-height: max(640px, calc(100vh - 206px));
        margin: 0 auto;
        border: 1px solid #d5e2f5;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(30, 58, 110, 0.12);
        overflow: hidden;
        display: flex;
        flex: 1 1 auto;
      }
      .workhub-document-body-editor-page {
        flex: 1 1 auto;
        min-height: 0;
      }
      .workhub-document-body-editor-page .tox .tox-editor-header {
        border-bottom: 1px solid #e3ecfb;
        background: #f8fbff;
      }
      .workhub-editor-page-toolbar:not(:empty) + .workhub-editor-page-paper .workhub-document-body-editor-page .tox .tox-editor-header {
        display: none;
      }
      .workhub-ghost-mini.is-danger {
        color: #b93030;
      }
      .workhub-ghost-mini.is-danger:hover {
        background: #fde8e8;
        color: #c0392b;
      }
      /* ---- Generic emoji picker popover ---- */
      .wh-emoji-picker {
        background: #fff;
        border: 1px solid #c8d6eb;
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 4px 20px rgba(50, 80, 140, 0.14);
        min-width: 190px;
        max-width: 220px;
      }
      /* When rendered inline (not portal), position absolutely below trigger */
      .wh-emoji-picker:not([style*="fixed"]) {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        z-index: 200;
      }
      .wh-emoji-picker-search {
        display: block;
        width: 100%;
        margin-bottom: 7px;
        padding: 4px 7px;
        font-size: 0.78rem;
        border: 1px solid #c8d6eb;
        border-radius: 5px;
        outline: none;
        background: #f5f8fd;
        color: #1e2d4a;
        box-sizing: border-box;
      }
      .wh-emoji-picker-search:focus {
        border-color: #7baee0;
        background: #fff;
      }
      .wh-emoji-picker-grid {
        display: grid;
        grid-template-columns: repeat(var(--wh-emoji-cols, 5), 1fr);
        gap: 3px;
      }
      .wh-emoji-picker-opt {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        font-size: 1rem;
        border: 1.5px solid transparent;
        border-radius: 5px;
        cursor: pointer;
        background: #f5f8fd;
        transition: background 0.1s, border-color 0.1s;
        padding: 0;
      }
      .wh-emoji-picker-opt:hover {
        background: #e0eaf8;
        border-color: #b7c7df;
      }
      .wh-emoji-picker-opt.is-active {
        border-color: #4f74bd;
        background: #eef3fb;
      }
      .wh-emoji-picker-empty {
        font-size: 0.76rem;
        color: #9aaac0;
        text-align: center;
        padding: 6px 0;
        margin: 0;
        grid-column: 1 / -1;
      }
      .wh-emoji-picker-clear {
        display: block;
        width: 100%;
        margin-top: 7px;
        padding: 4px 0;
        font-size: 0.75rem;
        color: #8096b0;
        background: none;
        border: none;
        border-top: 1px solid #e8eef8;
        cursor: pointer;
        text-align: center;
      }
      .wh-emoji-picker-clear:hover {
        color: #c0392b;
      }

      .workhub-document-body-editor {
        margin-top: 0;
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
      }
      .workhub-document-static-viewer {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
        contain: content;
        padding: 16px 18px;
        background: #ffffff;
        color: #111827;
        font-size: 0.9rem;
        line-height: 1.65;
        unicode-bidi: plaintext;
      }
      .workhub-document-static-viewer > :first-child {
        margin-top: 0;
      }
      .workhub-document-static-viewer > :last-child {
        margin-bottom: 0;
      }
      .workhub-document-static-viewer p {
        margin: 0 0 0.75em;
      }
      .workhub-document-static-viewer table {
        width: 100%;
        border-collapse: collapse;
      }
      .workhub-document-static-viewer td,
      .workhub-document-static-viewer th {
        border: 1px solid #d5dce8;
        padding: 6px 8px;
        vertical-align: top;
      }
      .workhub-document-static-viewer img {
        max-width: 100%;
        height: auto;
      }
      .workhub-quick-note-static-viewer {
        margin-top: 4px;
        border: 1px solid #e1e8f5;
        border-radius: 14px;
        background: #ffffff;
      }
      .workhub-modal.workhub-quick-note-modal {
        width: min(780px, calc(100vw - 20px));
        height: min(72vh, 680px);
        max-height: min(72vh, 680px);
        display: flex;
        flex-direction: column;
        gap: 6px;
        overflow: hidden;
        padding: 14px 16px 12px;
        border-radius: 14px;
      }
      .workhub-quick-note-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-shrink: 0;
        padding-bottom: 8px;
        border-bottom: 1px solid #e8eef8;
      }
      .workhub-quick-note-head-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1 1 auto;
        min-width: 0;
      }
      .workhub-quick-note-head h2 {
        margin: 0;
        font-size: 0.88rem;
        font-weight: 700;
        color: #1d2d44;
        white-space: nowrap;
        letter-spacing: 0.01em;
        text-transform: uppercase;
        opacity: 0.55;
      }
      .workhub-quick-note-location {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        background: #edf2fb;
        color: #3a5a8c;
        font-size: 0.68rem;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }
      .workhub-quick-note-close {
        min-width: 28px;
        height: 28px;
        width: 28px;
        padding: 0;
        flex-shrink: 0;
        font-size: 0.75rem;
        border-radius: 6px;
        opacity: 0.5;
      }
      .workhub-quick-note-close:hover {
        opacity: 1;
      }
      .workhub-quick-note-editor {
        flex: 1 1 auto;
        min-height: 0;
        margin-top: 4px;
      }
      .workhub-quick-note-editor .tox .tox-editor-header,
      .workhub-quick-note-editor .tox .tox-statusbar {
        display: none;
      }
      .workhub-quick-note-editor .tox,
      .workhub-quick-note-editor .tox .tox-editor-container,
      .workhub-quick-note-editor .tox .tox-edit-area {
        height: 100% !important;
      }
      .workhub-quick-note-editor .tox {
        min-height: 0;
        border-radius: 14px;
      }
      .workhub-quick-note-editor .tox .tox-editor-container {
        border: 1px solid #e1e8f5;
        border-radius: 14px;
        overflow: hidden;
        background: #ffffff;
      }
      .workhub-quick-note-editor .tox .tox-edit-area,
      .workhub-quick-note-editor .tox .tox-edit-area__iframe {
        min-height: 0;
      }
      .workhub-quick-note-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-shrink: 0;
        padding-top: 7px;
        border-top: 1px solid #e4ebf7;
      }
      .workhub-quick-note-foot-left {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-quick-note-esc-hint {
        font-size: 0.62rem;
        color: #9aabc4;
        white-space: nowrap;
      }
      .workhub-quick-note-esc-hint kbd {
        display: inline-block;
        padding: 1px 4px;
        border: 1px solid #c8d8ef;
        border-radius: 3px;
        font-size: 0.6rem;
        font-family: inherit;
        color: #7a92b5;
        background: #f3f7fc;
      }
      .workhub-quick-note-share-btn {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        min-width: 30px;
        padding: 0;
        border-radius: 7px;
        color: #4a6a9c;
      }
      .workhub-quick-note-share-btn:hover {
        background: #edf2fb;
        color: #1e3a6e;
      }
      .workhub-quick-note-share-count {
        position: absolute;
        top: 2px;
        right: 2px;
        min-width: 14px;
        height: 14px;
        padding: 0 3px;
        border-radius: 999px;
        background: #3b5fc0;
        color: #ffffff;
        font-size: 0.55rem;
        font-weight: 700;
        line-height: 14px;
        text-align: center;
        pointer-events: none;
      }
      .workhub-quick-note-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
      }
      .workhub-quick-note-actions .workhub-primary-btn,
      .workhub-quick-note-actions .workhub-danger-btn {
        min-width: 72px;
        height: 30px;
        font-size: 0.75rem;
        padding: 0 12px;
      }
      .workhub-document-body-editor .tox {
        flex: 1 1 auto;
        min-height: 0;
        height: 100% !important;
        border: none;
        border-radius: 0;
        background: transparent;
        box-shadow: none;
        overflow: hidden;
      }
      .workhub-document-body-editor .tox.tox-tinymce--focused {
        border-color: #dce8fb;
        box-shadow: none;
        outline: none;
      }
      .workhub-document-body-editor .tox.tox-edit-focus .tox-edit-area::before {
        opacity: 0 !important;
        border-color: transparent !important;
      }
      .workhub-document-body-editor .tox .tox-editor-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      .workhub-document-body-editor .tox .tox-edit-area {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        touch-action: auto;
        pointer-events: auto;
      }
      .workhub-document-body-editor .tox .tox-edit-area__iframe {
        height: 100% !important;
        display: block;
        background: #ffffff;
        touch-action: auto;
        pointer-events: auto;
      }
      .workhub-document-body-editor .tox .tox-toolbar__primary {
        background: #f8fbff;
        border-bottom: 1px solid #e3ecfb;
      }
      .workhub-document-body-editor .tox .tox-toolbar,
      .workhub-document-body-editor .tox .tox-toolbar__overflow,
      .workhub-document-body-editor .tox .tox-toolbar__primary {
        padding: 0 2px;
      }
      .workhub-document-body-editor .tox .tox-toolbar__primary,
      .workhub-document-body-editor .tox .tox-toolbar__overflow {
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-x;
      }
      .workhub-document-body-editor .tox .tox-toolbar__group {
        padding: 0 1px;
      }
      .workhub-document-body-editor .tox .tox-tbtn {
        min-width: 20px;
        min-height: 20px !important;
        padding: 0 1px;
      }
      .workhub-document-body-editor .tox .tox-mbtn,
      .workhub-document-body-editor .tox .tox-listboxfield .tox-listbox--select {
        min-height: 26px !important;
        padding: 0 6px;
      }
      .workhub-document-body-editor .tox .tox-mbtn__select-label,
      .workhub-document-body-editor .tox .tox-tbtn__select-label,
      .workhub-document-body-editor .tox .tox-collection__item-label {
        font-size: 0.74rem;
      }
      .workhub-document-body-editor .tox .tox-collection__item {
        min-height: 28px;
      }
      .workhub-document-body-editor.is-locked .tox {
        border-color: #d3dff1;
        background: #f7f9fc;
      }
      .workhub-document-body-editor.is-locked .tox .tox-editor-header,
      .workhub-quick-note-editor.is-locked .tox .tox-editor-header {
        display: none !important;
      }
      .workhub-document-body-editor.is-locked .tox .tox-edit-area__iframe {
        background: #f7f9fc;
      }
      .workhub-documents-empty-state {
        margin-top: 8px;
        flex: 1;
        min-height: 0;
        display: grid;
        place-items: center;
      }
      .workhub-doc-ai-panel {
        margin-top: 8px;
        border: 1px solid #d7e2f3;
        border-radius: 16px;
        background: linear-gradient(180deg, #fbfdff 0%, #f6f9fe 100%);
        overflow: hidden;
      }
      .workhub-doc-ai-panel.is-sidebar {
        margin-top: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
      }
      .workhub-doc-ai-sidebar-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 0 0 10px;
        border-bottom: 1px solid #e3eafb;
      }
      .workhub-doc-ai-sidebar-head-copy {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }
      .workhub-doc-ai-sidebar-head-copy strong {
        font-size: 0.82rem;
        font-weight: 800;
        color: #23446d;
      }
      .workhub-doc-ai-sidebar-head-copy span {
        font-size: 0.71rem;
        color: #6e84a7;
      }
      .workhub-doc-ai-sidebar-head-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }
      .workhub-doc-ai-toggle-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
      }
      .workhub-doc-ai-toggle {
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-width: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: #244165;
        cursor: pointer;
        text-align: left;
      }
      .workhub-doc-ai-toggle-copy {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        min-width: 0;
      }
      .workhub-doc-ai-toggle-copy strong {
        font-size: 0.82rem;
        font-weight: 800;
        color: #23446d;
      }
      .workhub-doc-ai-toggle-copy span {
        font-size: 0.72rem;
        color: #6e84a7;
      }
      .workhub-doc-ai-toggle-state {
        flex: 0 0 auto;
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #edf3ff;
        color: #2c5b9f;
        font-size: 1rem;
        font-weight: 700;
      }
      .workhub-doc-ai-resize-handle {
        height: 6px;
        cursor: ns-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border-bottom: 1px solid #e2e9f6;
        user-select: none;
        touch-action: none;
        transition: background 0.15s;
      }
      .workhub-doc-ai-resize-handle::before {
        content: '';
        width: 28px;
        height: 2px;
        border-radius: 999px;
        background: #d3deef;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.7);
        transition: background 0.15s;
      }
      .workhub-doc-ai-resize-handle:hover {
        background: rgba(79, 116, 189, 0.06);
      }
      .workhub-doc-ai-resize-handle:hover::before,
      .workhub-doc-ai-resize-handle:active::before {
        background: #7ea6ea;
      }
      @keyframes workhub-doc-ai-pulse {
        0% {
          transform: scale(0.75);
          opacity: 0.9;
        }
        70% {
          transform: scale(1.45);
          opacity: 0;
        }
        100% {
          transform: scale(1.45);
          opacity: 0;
        }
      }
      .workhub-doc-ai-body {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        gap: 6px;
        padding: 0 8px 8px;
        min-height: 0;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-body {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        gap: 6px;
        padding: 8px 0 0;
      }
      .workhub-doc-ai-column {
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding-top: 6px;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-column-response {
        order: 1;
        flex: 1 1 auto;
        min-height: 0;
        padding-top: 0;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-column-input {
        order: 2;
        flex: 0 0 auto;
        padding-top: 8px;
        border-top: 1px solid #e6edf8;
        gap: 6px;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-prompt-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 40px;
        align-items: stretch;
        gap: 8px;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-actions {
        order: 3;
        flex: 0 0 auto;
        flex-direction: row;
        justify-content: flex-end;
        padding-top: 4px;
        padding-bottom: 2px;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-actions-inline {
        order: initial;
        padding-top: 0;
        padding-bottom: 0;
        align-self: stretch;
        justify-content: flex-end;
        align-items: center;
        flex-direction: column;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-options {
        margin: 2px 0 0;
        border: 1px solid #dbe5f4;
        border-radius: 10px;
        background: #f9fbff;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-options > summary {
        list-style: none;
        cursor: pointer;
        min-height: 28px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 0 10px;
        font-size: 0.72rem;
        font-weight: 800;
        color: #35517e;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-options > summary::-webkit-details-marker {
        display: none;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-options > summary::after {
        content: '+';
        flex: 0 0 auto;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #edf3ff;
        color: #2b5a9c;
        font-size: 0.9rem;
        line-height: 1;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-options[open] > summary::after {
        content: '−';
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-options-body {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 0 8px 8px;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-column-head {
        margin-bottom: 2px;
      }
      .workhub-doc-ai-column-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .workhub-doc-ai-column-head h3 {
        margin: 0;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #486281;
      }
      .workhub-doc-ai-column-head span {
        font-size: 0.7rem;
        color: #7b8faa;
      }
      .workhub-doc-ai-column-head-main {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .workhub-doc-ai-head-action {
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #cbd9ec;
        border-radius: 999px;
        background: #f7faff;
        color: #35517e;
        font: inherit;
        font-size: 0.75rem;
        font-weight: 800;
        line-height: 1;
        cursor: pointer;
      }
      .workhub-doc-ai-head-action svg {
        display: block;
      }
      .workhub-doc-ai-head-action:hover {
        background: #f5f8ff;
        color: #34527e;
      }
      .workhub-doc-ai-mode-switch {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px;
        border: 1px solid #dbe5f4;
        border-radius: 999px;
        background: #f7faff;
        align-self: flex-start;
      }
      .workhub-doc-ai-mode-btn {
        min-height: 24px;
        padding: 0 10px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #5f7698;
        font: inherit;
        font-size: 0.7rem;
        font-weight: 800;
        cursor: pointer;
      }
      .workhub-doc-ai-mode-btn.is-active {
        background: #fff;
        color: #234c89;
        box-shadow: 0 1px 3px rgba(56, 88, 138, 0.12);
      }
      .workhub-doc-ai-mode-note {
        margin: 0;
        font-size: 0.69rem;
        line-height: 1.45;
        color: #6c82a3;
      }
      .workhub-doc-ai-tools-panel {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-doc-ai-tools-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 28px;
        padding: 0 10px;
        border: 1px solid #dbe5f4;
        border-radius: 8px;
        background: #f9fbff;
        color: #37547f;
        font: inherit;
        font-size: 0.7rem;
        font-weight: 800;
        cursor: pointer;
        text-align: left;
      }
      .workhub-doc-ai-tools-toggle:hover {
        background: #f3f7ff;
        border-color: #c8d7ee;
      }
      .workhub-doc-ai-tools-toggle-state {
        flex: 0 0 auto;
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #edf3ff;
        color: #2b5a9c;
        font-size: 0.9rem;
        line-height: 1;
      }
      .workhub-doc-ai-quick-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-doc-ai-quick-action {
        min-height: 24px;
        padding: 0 8px;
        border: 1px solid #d5e0f1;
        border-radius: 999px;
        background: #fff;
        color: #31517f;
        font: inherit;
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, opacity 0.16s ease;
      }
      .workhub-doc-ai-quick-action:hover:not(:disabled) {
        background: #f4f8ff;
        border-color: #b8cbeb;
      }
      .workhub-doc-ai-quick-action:disabled {
        opacity: 0.56;
        cursor: not-allowed;
      }
      .workhub-doc-ai-scope-note {
        font-size: 0.68rem;
        font-weight: 600;
        line-height: 1.35;
        color: #6780a2;
      }
      .workhub-doc-ai-destination-control {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        padding: 4px 8px;
        border: 1px solid #e0e8f6;
        border-radius: 8px;
        background: #fbfdff;
        font-size: 0.69rem;
        color: #5b7395;
      }
      .workhub-doc-ai-destination-options {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .workhub-doc-ai-destination-option {
        min-height: 22px;
        padding: 0 8px;
        border: 1px solid #d6e1f1;
        border-radius: 999px;
        background: #fff;
        color: #35517e;
        font: inherit;
        font-size: 0.68rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-doc-ai-destination-option.is-active {
        background: #edf4ff;
        border-color: #92b1e9;
        color: #234c89;
      }
      .workhub-doc-ai-textarea {
        width: 100%;
        min-height: 64px;
        flex: 1 1 auto;
        resize: vertical;
        border: 1px solid #cfdbee;
        border-radius: 10px;
        background: #fff;
        color: #213b60;
        font: inherit;
        font-size: 0.78rem;
        line-height: 1.45;
        padding: 7px 9px;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-textarea {
        min-height: 120px;
        max-height: 420px;
        resize: none;
      }
      .workhub-doc-ai-textarea:disabled {
        background: #f4f7fb;
        color: #8a9ab2;
      }
      .workhub-doc-ai-live-transcript {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 7px 9px;
        border: 1px solid #dbe5f4;
        border-radius: 10px;
        background: #f8fbff;
        color: #35517e;
      }
      .workhub-doc-ai-live-transcript strong {
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #5e7394;
      }
      .workhub-doc-ai-live-transcript span {
        font-size: 0.75rem;
        line-height: 1.45;
        color: #223b60;
        white-space: pre-wrap;
      }
      .workhub-doc-ai-language-option {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: flex-start;
        gap: 8px;
        padding: 6px 8px;
        border: 1px solid #dbe5f4;
        border-radius: 10px;
        background: #fbfdff;
        color: #4e678a;
        cursor: pointer;
      }
      .workhub-doc-ai-language-option input {
        margin: 2px 0 0;
      }
      .workhub-doc-ai-language-option > span {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .workhub-doc-ai-language-option strong {
        font-size: 0.72rem;
        color: #244165;
      }
      .workhub-doc-ai-language-option span span {
        font-size: 0.68rem;
        line-height: 1.4;
        color: #7387a4;
      }
      .workhub-doc-ai-attachments {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-doc-ai-attach-btn {
        align-self: flex-start;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 32px;
        padding: 0 12px;
        border: 1px dashed #99b3df;
        border-radius: 999px;
        background: #f7faff;
        color: #31598f;
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-doc-ai-attach-btn.is-disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .workhub-doc-ai-attachment-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-doc-ai-attachment-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        background: #eef4ff;
        color: #39597f;
        font-size: 0.72rem;
      }
      .workhub-doc-ai-attachment-chip button {
        border: 0;
        background: transparent;
        color: #7c91af;
        cursor: pointer;
        font: inherit;
        font-size: 0.9rem;
        padding: 0;
        line-height: 1;
      }
      .workhub-doc-ai-note {
        margin: 0;
        font-size: 0.69rem;
        line-height: 1.45;
        color: #7185a2;
      }
      .workhub-doc-ai-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        padding-top: 6px;
      }
      .workhub-doc-ai-send-btn {
        width: 40px;
        min-width: 40px;
        height: 40px;
        min-height: 40px;
        padding: 0;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-doc-ai-send-btn svg,
      .workhub-doc-ai-voice-btn svg {
        display: block;
      }
      .workhub-doc-ai-voice-btn {
        position: relative;
        width: 40px;
        min-width: 40px;
        height: 40px;
        min-height: 40px;
        padding: 0;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-doc-ai-voice-btn-top {
        width: 30px;
        min-width: 30px;
        height: 30px;
        min-height: 30px;
      }
      .workhub-doc-ai-voice-btn.is-listening {
        background: #dc2626;
        border-color: #dc2626;
        color: #fff;
      }
      .workhub-doc-ai-voice-pulse {
        position: absolute;
        top: 7px;
        right: 7px;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #ef4444;
        opacity: 0;
        pointer-events: none;
      }
      .workhub-doc-ai-voice-btn-top .workhub-doc-ai-voice-pulse {
        top: 5px;
        right: 5px;
        width: 7px;
        height: 7px;
      }
      .workhub-doc-ai-voice-btn.is-listening .workhub-doc-ai-voice-pulse {
        opacity: 1;
        animation: workhub-doc-ai-pulse 1.35s ease-out infinite;
      }
      .workhub-doc-ai-response-pane {
        min-height: 64px;
        flex: 1 1 auto;
        overflow: auto;
        border: 1px solid #d8e2f1;
        border-radius: 10px;
        background: #fff;
        padding: 7px 9px;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-response-pane {
        min-height: 0;
        border-radius: 12px;
        padding: 10px 12px;
      }
      .workhub-doc-ai-empty-state {
        min-height: 108px;
        display: grid;
        place-items: center;
        text-align: center;
        color: #788ba4;
        font-size: 0.78rem;
        line-height: 1.55;
      }
      .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-empty-state {
        min-height: 180px;
      }
      .workhub-doc-ai-entry + .workhub-doc-ai-entry {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid #ebf0f7;
      }
      .workhub-doc-ai-entry-label {
        font-size: 0.66rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #627992;
      }
      .workhub-doc-ai-entry-label.is-response {
        margin-top: 8px;
      }
      .workhub-doc-ai-entry-prompt {
        margin: 4px 0 0;
        font-size: 0.76rem;
        line-height: 1.5;
        color: #203b60;
        white-space: pre-wrap;
      }
      .workhub-doc-ai-selection-preview {
        margin-top: 8px;
        padding: 9px 10px;
        border-radius: 10px;
        background: #f6f9fd;
        border: 1px solid #e6edf7;
      }
      .workhub-doc-ai-selection-preview strong {
        display: block;
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #6e819a;
      }
      .workhub-doc-ai-selection-preview p {
        margin: 6px 0 0;
        font-size: 0.75rem;
        line-height: 1.5;
        color: #425a7b;
        white-space: pre-wrap;
      }
      .workhub-doc-ai-entry-response {
        margin: 4px 0 0;
        white-space: pre-wrap;
        word-break: break-word;
        font: inherit;
        font-size: 0.76rem;
        line-height: 1.52;
        color: #213a5e;
      }
      .workhub-doc-ai-entry-response-preview {
        margin: 4px 0 0;
        font-size: 0.76rem;
        line-height: 1.52;
        color: #213a5e;
      }
      .workhub-doc-ai-entry-response-preview p {
        margin: 0 0 0.7em;
        color: inherit;
      }
      .workhub-doc-ai-entry-response-preview ul,
      .workhub-doc-ai-entry-response-preview ol {
        margin: 0;
        padding-inline-start: 1.4em;
      }
      .workhub-doc-ai-entry-response-preview li + li {
        margin-top: 0.38em;
      }
      .workhub-doc-ai-entry-response-preview ul.tox-checklist {
        padding-inline-start: 0;
      }
      .workhub-doc-ai-entry-response-preview ul.tox-checklist > li {
        list-style: none;
        position: relative;
        padding-inline-start: 1.55em;
      }
      .workhub-doc-ai-entry-response-preview ul.tox-checklist > li::before {
        content: '☐';
        position: absolute;
        inset-inline-start: 0;
        top: 0;
        color: #5c74a0;
      }
      .workhub-doc-ai-entry-response-preview ul.tox-checklist > li.tox-checklist--checked::before {
        content: '☑';
      }
      .workhub-doc-ai-entry-response-preview table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 2px;
      }
      .workhub-doc-ai-entry-response-preview th,
      .workhub-doc-ai-entry-response-preview td {
        border: 1px solid #d9e3f2;
        padding: 8px 10px;
        text-align: start;
        vertical-align: top;
      }
      .workhub-doc-ai-entry-response-preview th {
        background: #f4f8ff;
        font-weight: 800;
      }
      .workhub-doc-ai-entry-status {
        margin-top: 8px;
        font-size: 0.72rem;
        font-weight: 700;
        color: #6f839f;
      }
      .workhub-doc-ai-entry-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        margin-top: 8px;
      }
      .workhub-doc-ai-footer {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-doc-ai-error {
        padding: 9px 10px;
        border-radius: 10px;
        background: #fff4f3;
        border: 1px solid #f2c8c3;
        color: #9b4037;
        font-size: 0.75rem;
        line-height: 1.45;
      }
      .workhub-doc-ai-footer-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }
      @media (max-width: 900px) {
        .workhub-doc-ai-body {
          grid-template-columns: minmax(0, 1fr);
        }
        .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-body {
          display: flex;
        }
        .workhub-doc-ai-actions {
          padding-top: 0;
          justify-content: flex-start;
        }
        .workhub-doc-ai-panel.is-sidebar .workhub-doc-ai-actions {
          justify-content: flex-end;
        }
        .workhub-doc-ai-send-btn {
          width: 40px;
          min-width: 40px;
          height: 40px;
          min-height: 40px;
          padding: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .workhub-doc-ai-send-btn svg,
        .workhub-doc-ai-voice-btn svg {
          display: block;
        }
        .workhub-doc-ai-voice-btn {
          width: 40px;
          min-width: 40px;
          height: 40px;
          min-height: 40px;
          padding: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .workhub-doc-ai-voice-btn.is-listening {
          background: #dc2626;
          border-color: #dc2626;
          color: #fff;
        }
        .workhub-doc-ai-response-pane {
          min-height: 64px;
          max-height: none;
        }
      }
      .workhub-documents-editor-actions {
        display: flex;
        justify-content: flex-end;
      }
      .workhub-shell.is-mobile .workhub-doc-detail-rail {
        width: min(94vw, 420px);
        flex-basis: auto;
      }
      .workhub-shell.is-mobile .workhub-document-body-editor,
      .workhub-shell.is-mobile .workhub-print-preview-wrap,
      .workhub-shell.is-mobile .workhub-editor-page-preview-wrap {
        min-height: 340px;
        flex: 0 0 auto;
      }
      .workhub-shell.is-mobile .workhub-editor-page-paper {
        width: 100%;
        min-height: 560px;
      }
      .workhub-shell.is-mobile .workhub-editor-page-preview-wrap {
        padding: 10px 10px 6px;
      }
      .workhub-shell.is-mobile .workhub-print-preview-frame {
        min-height: 520px;
        flex: 0 0 auto;
      }
      .workhub-shell.is-mobile .workhub-task-time-ring,
      .workhub-shell.is-mobile .workhub-task-time-ring svg {
        width: 76px;
        height: 76px;
      }
      .workhub-shell.is-mobile .workhub-task-time-ring-center strong {
        font-size: 0.9rem;
      }
      .workhub-shell.is-mobile .workhub-task-time-ring-center span {
        font-size: 0.58rem;
      }
      .workhub-shell.is-mobile .workhub-project-action-menu {
        min-width: 180px;
        right: 0;
        left: auto;
      }
      .workhub-shell.is-mobile .workhub-comment-list {
        max-height: none;
      }
      .workhub-shell.is-mobile .workhub-comment-head-actions {
        gap: 4px;
      }
      .workhub-shell.is-mobile .workhub-comment-head-actions > span {
        font-size: 0.6rem;
      }
      .workhub-shell.is-mobile .workhub-comment-edit-btn {
        width: 18px;
        height: 18px;
        border-radius: 5px;
      }
      .workhub-shell.is-mobile .workhub-comment-edit-form {
        gap: 5px;
        margin-top: 3px;
        padding: 6px;
      }
      .workhub-shell.is-mobile .workhub-comment-edit-form textarea {
        min-height: 62px;
      }
      .workhub-shell.is-mobile .workhub-comment-edit-actions .workhub-primary-mini,
      .workhub-shell.is-mobile .workhub-comment-edit-actions .workhub-ghost-mini {
        min-width: 64px;
        min-height: 26px;
        padding: 3px 8px;
        font-size: 0.68rem;
      }
      .workhub-shell.is-mobile .workhub-comment-composer {
        margin-top: 8px;
        gap: 6px;
      }
      .workhub-shell.is-mobile .workhub-comment-composer textarea {
        min-height: 72px;
      }
      .workhub-shell.is-mobile .workhub-comment-composer-footer {
        align-items: center;
      }
      .workhub-shell.is-mobile .workhub-comment-send-btn {
        width: 34px;
        height: 34px;
      }
      .workhub-shell.is-mobile .workhub-quick-add-placeholder {
        min-height: 0;
      }
      .workhub-shell.is-mobile .workhub-modal.workhub-image-review-modal {
        width: calc(100vw - 12px);
        max-width: none;
        height: auto;
        max-height: calc(100vh - 12px);
      }
      .workhub-shell.is-mobile .workhub-image-review-layout {
        grid-template-rows: auto auto;
      }
      .workhub-shell.is-mobile .workhub-image-review-layout.has-discussion {
        flex-direction: column;
      }
      .workhub-shell.is-mobile .workhub-image-review-discussion {
        min-width: 0;
        max-width: none;
        flex-basis: auto;
      }
      .workhub-shell.is-mobile .workhub-image-review-stage {
        max-width: calc(var(--img-aspect, 1.778) * 45vh);
        max-height: 45vh;
      }
      .workhub-shell.is-mobile .workhub-image-review-topbar {
        align-items: flex-start;
      }
      .workhub-shell.is-mobile .workhub-image-review-topbar-title {
        gap: 4px;
      }
      .workhub-shell.is-mobile .workhub-image-review-panels {
        grid-template-columns: 1fr;
      }
      .workhub-shell.is-mobile .workhub-main-stage {
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }
      .workhub-shell.is-mobile .workhub-section-stack {
        flex: 0 0 auto;
        min-height: max-content;
        overflow: visible;
      }

      /* ── Share document dialog ─────────────────────────────────────────── */
      .workhub-share-doc-overlay {
        position: fixed;
        inset: 0;
        background: rgba(20, 35, 65, 0.45);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-share-doc-dialog {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 40px rgba(20,40,90,0.18);
        padding: 22px 24px 20px;
        width: min(980px, 94vw);
        max-height: min(82vh, 760px);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .workhub-share-doc-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.78rem;
        font-weight: 700;
        color: #1e3060;
      }
      .workhub-share-doc-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.85rem;
        color: #7a8fb2;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .workhub-share-doc-close:hover { background: #f0f4fb; }
      .workhub-share-doc-title {
        font-size: 0.74rem;
        color: #3a527a;
        margin: 0;
        font-style: italic;
        word-break: break-word;
      }
      .workhub-share-doc-desc {
        font-size: 0.72rem;
        color: #5a6f90;
        margin: 0;
        line-height: 1.45;
      }
      .workhub-share-doc-link-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .workhub-share-doc-link-input {
        flex: 1 1 0;
        min-width: 0;
        font-size: 0.69rem;
        padding: 6px 9px;
        border: 1px solid #b8cef0;
        border-radius: 7px;
        background: #f5f9ff;
        color: #2a3d5c;
        outline: none;
        cursor: text;
      }
      .workhub-share-doc-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      .workhub-share-doc-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .workhub-share-doc-form-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .workhub-share-doc-form-row.is-full-width {
        grid-column: 1 / -1;
      }
      .workhub-share-doc-reference-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 10px;
      }
      .workhub-share-doc-reference-pane {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      .workhub-share-doc-reference-pane + .workhub-share-doc-reference-pane {
        border-left: 1px solid #d7e4f6;
        padding-left: 12px;
      }
      .workhub-share-doc-inline-hint {
        margin: 0;
        font-size: 0.7rem;
        color: #61799b;
      }
      .workhub-copy-tab-mode-group {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0;
        margin-top: 0;
        margin-bottom: 0;
        border: 1px solid #c8d8f0;
        border-radius: 6px;
        overflow: hidden;
        align-self: flex-start;
      }
      .workhub-copy-tab-mode-btn {
        flex: 1;
        padding: 5px 14px;
        font-size: 0.83rem;
        font-weight: 500;
        color: #4a6080;
        background: #f7faff;
        border: none;
        border-right: 1px solid #c8d8f0;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.12s, color 0.12s;
        line-height: 1.4;
      }
      .workhub-copy-tab-mode-btn:last-child {
        border-right: none;
      }
      .workhub-copy-tab-mode-btn:hover {
        background: #eaf1fb;
        color: #183154;
      }
      .workhub-copy-tab-mode-btn.is-active {
        background: #3a5bd9;
        color: #fff;
        font-weight: 600;
      }
      .workhub-copy-tab-checklist {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: 0;
        background: #f7faff;
        border: 1px solid #c8d8f0;
        border-radius: 8px;
        max-height: 220px;
        overflow-x: hidden;
        overflow-y: auto;
        margin-top: 4px;
      }
      .workhub-share-doc-dialog .workhub-copy-tab-check-item {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        align-items: start;
        column-gap: 10px;
        font-size: 0.85rem;
        color: #183154;
        cursor: pointer;
        padding: 9px 12px;
        border-bottom: 1px solid #dbe6f7;
        min-width: 0;
        width: 100%;
      }
      .workhub-share-doc-dialog .workhub-copy-tab-check-item.has-reference {
        background: #eef5ff;
      }
      .workhub-share-doc-dialog .workhub-copy-tab-check-main {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 2px;
      }
      .workhub-share-doc-dialog .workhub-copy-tab-check-text {
        display: block;
        visibility: visible;
        opacity: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: start;
        direction: inherit;
        unicode-bidi: plaintext;
        color: inherit;
      }
      .workhub-copy-tab-reference-indicator {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #375f94;
        font-size: 0.66rem;
        font-weight: 700;
        line-height: 1.25;
      }
      [dir='rtl'] .workhub-copy-tab-check-text {
        text-align: right;
      }
      .workhub-share-doc-dialog .workhub-copy-tab-check-item:last-child {
        border-bottom: none;
      }
      .workhub-share-doc-dialog .workhub-copy-tab-check-item input {
        margin: 0;
        justify-self: start;
        flex-shrink: 0;
      }
      .workhub-share-doc-form-row > span {
        font-size: 0.7rem;
        font-weight: 700;
        color: #476286;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .workhub-share-doc-select {
        width: 100%;
        min-width: 0;
        padding: 9px 10px;
        border: 1px solid #c8d8f0;
        border-radius: 8px;
        background: #f7faff;
        color: #183154;
        font-size: 0.78rem;
        outline: none;
      }
      .workhub-share-doc-select:focus {
        border-color: #8aa9da;
        box-shadow: 0 0 0 3px rgba(74, 118, 194, 0.12);
      }
      .workhub-share-doc-selected {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid #dbe6f7;
        border-radius: 10px;
        background: #f8fbff;
      }
      .workhub-share-doc-selected-copy {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }
      .workhub-share-doc-selected-copy strong {
        font-size: 0.78rem;
        color: #1b3157;
        line-height: 1.2;
      }
      .workhub-share-doc-selected-copy small {
        font-size: 0.68rem;
        color: #6a7f9f;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-share-doc-members {
        border: 1px solid #dbe6f7;
        border-radius: 8px;
        background: #f8fbff;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 360px;
        overflow-y: auto;
      }
      .workhub-share-doc-member-row {
        border: 1px solid #dbe6f7;
        border-radius: 8px;
        background: #ffffff;
        padding: 7px 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-share-doc-member-row.is-ref-item {
        cursor: pointer;
        transition: background 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease;
      }
      .workhub-share-doc-member-row.is-ref-item:hover {
        background: #f0f6ff;
        border-color: #b8d0f0;
        box-shadow: 0 1px 4px rgba(40, 90, 180, 0.08);
        transition: none;
      }
      .workhub-share-doc-member-row.is-ref-item.is-highlighted {
        background: #e6f0ff;
        border-color: #7aaae0;
        box-shadow: inset 3px 0 0 #2f63c8, 0 1px 4px rgba(40, 90, 180, 0.1);
      }
      .workhub-share-doc-member-main {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
        cursor: pointer;
      }
      .workhub-share-doc-member-copy {
        display: inline-flex;
        flex-direction: column;
        min-width: 0;
        gap: 2px;
      }
      .workhub-share-doc-member-copy strong,
      .workhub-share-doc-member-copy .workhub-ref-location {
        font-size: 0.74rem;
        color: #1b3157;
        line-height: 1.2;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-share-doc-member-copy small,
      .workhub-share-doc-member-copy .workhub-ref-docname {
        font-size: 0.67rem;
        color: #8a9bb5;
        line-height: 1.2;
        font-weight: 400;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-share-doc-member-access {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .workhub-share-doc-member-access .workhub-ghost-btn {
        margin-top: 0;
        padding: 5px 10px;
        min-height: 28px;
      }
      .workhub-share-doc-member-access .workhub-ghost-btn.is-active {
        border-color: #8aa6d8;
        background: #e8f0ff;
        color: #1f4f9e;
      }
      @media (max-width: 720px) {
        .workhub-share-doc-form-grid {
          grid-template-columns: minmax(0, 1fr);
        }
        .workhub-share-doc-reference-layout {
          grid-template-columns: minmax(0, 1fr);
        }
        .workhub-share-doc-reference-pane + .workhub-share-doc-reference-pane {
          border-left: none;
          border-top: 1px solid #d7e4f6;
          padding-left: 0;
          padding-top: 10px;
        }
      }
      .workhub-empty-state,
      .workhub-empty-column,
      .workhub-admin-note {
        padding: 9px;
        border-radius: 11px;
        font-size: 0.8rem;
        color: #627291;
        text-align: center;
        background: #f8fbff;
        border: 1px dashed #cdddf8;
      }
      .workhub-empty-projects-cta {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .workhub-empty-projects-cta .workhub-primary-mini {
        margin-top: 0;
      }
      .workhub-empty-state.tall {
        min-height: 100px;
        display: grid;
        place-items: center;
      }
      .workhub-admin-note {
        color: #946200;
      }
      .workhub-no-access-shell {
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(150deg, #eef4ff 0%, #f4f0ff 50%, #eef4ff 100%);
      }
      .workhub-no-access-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        background: #ffffff;
        border: 1px solid #dce8ff;
        border-radius: 20px;
        padding: 44px 48px 36px;
        max-width: 420px;
        width: calc(100vw - 32px);
        box-shadow: 0 20px 60px rgba(58, 92, 168, 0.10), 0 2px 8px rgba(58, 92, 168, 0.06);
        text-align: center;
      }
      .workhub-no-access-icon {
        font-size: 2.6rem;
        line-height: 1;
        filter: grayscale(0.2);
      }
      .workhub-no-access-brand {
        font-size: 1.05rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #3a5bd9;
        text-transform: uppercase;
      }
      .workhub-no-access-title {
        margin: 0;
        font-size: 1.45rem;
        font-weight: 700;
        color: #0f1f3d;
        line-height: 1.2;
      }
      .workhub-no-access-body {
        margin: 0;
        font-size: 0.88rem;
        color: #6278a0;
        line-height: 1.6;
        max-width: 320px;
      }
      .workhub-no-access-user {
        display: flex;
        align-items: center;
        gap: 9px;
        background: #f4f7ff;
        border: 1px solid #dce7ff;
        border-radius: 999px;
        padding: 6px 14px 6px 6px;
        font-size: 0.8rem;
        color: #4a6098;
        font-weight: 500;
        margin-top: 4px;
      }
      .workhub-no-access-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #5a7ee8 0%, #3a5bd9 100%);
        color: #fff;
        font-size: 0.75rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .workhub-center-card {
        max-width: 520px;
        margin: 9vh auto 0;
        border-radius: 18px;
        padding: 18px;
        text-align: center;
      }
      .workhub-spinner {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        border: 4px solid rgba(148, 163, 184, 0.22);
        border-top-color: #4f8cff;
        margin: 0 auto 12px;
        animation: workhubSpin 0.9s linear infinite;
      }
      input,
      textarea,
      select {
        width: 100%;
        border-radius: 9px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #19315d;
        padding: 7px 9px;
        font: inherit;
        font-size: 0.82rem;
        line-height: 1.2;
        box-sizing: border-box;
      }
      textarea {
        resize: vertical;
      }
      input::placeholder,
      textarea::placeholder {
        color: #91a0bb;
      }
      .workhub-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 18, 36, 0.80);
        overflow-y: auto;
        padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
      }
      .workhub-modal {
        width: min(520px, calc(100vw - 24px));
        max-height: calc(100dvh - 24px);
        overflow-y: auto;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(18, 33, 63, 0.16);
        padding: 24px;
        display: flex;
        flex-direction: column;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
      .workhub-modal.large {
        width: min(720px, calc(100vw - 24px));
      }
      .workhub-modal.workhub-workspace-settings-modal {
        width: min(980px, calc(100vw - 24px));
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .workhub-workspace-settings-head {
        position: sticky;
        top: 0;
        z-index: 2;
        background: #ffffff;
        padding-bottom: 8px;
        margin-bottom: 10px;
        border-bottom: 1px solid #e6eefc;
      }
      .workhub-workspace-settings-head h2 {
        margin: 0;
        font-size: 1.28rem;
        line-height: 1.1;
        color: #1a2f56;
      }
      .workhub-modal.workhub-global-finder-modal {
        width: min(720px, calc(100vw - 24px));
      }
      .workhub-add-item-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-add-item-option {
        width: 100%;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        background: #f8fbff;
        padding: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: background 0.12s;
      }
      .workhub-add-item-option:hover {
        background: #eaf2ff;
        border-color: #87a9ff;
      }
      .workhub-add-item-option-icon {
        font-size: 1.2rem;
        flex-shrink: 0;
      }
      .workhub-add-item-option-content {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .workhub-add-item-option-content strong {
        color: #1b315f;
        font-size: 0.88rem;
        line-height: 1.2;
      }
      .workhub-add-item-option-content span {
        color: #5f7398;
        font-size: 0.76rem;
        line-height: 1.25;
      }
      .workhub-global-finder-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .workhub-global-finder-input-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-global-finder-input-wrap input {
        width: 100%;
        border-radius: 10px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #1c2f56;
        padding: 10px 11px;
        font: inherit;
        font-size: 0.84rem;
        line-height: 1.25;
        box-sizing: border-box;
      }
      .workhub-global-finder-results {
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        background: #f8fbff;
        max-height: min(56vh, 420px);
        overflow-y: auto;
      }
      .workhub-global-finder-result {
        width: 100%;
        border: 0;
        border-bottom: 1px solid #e7eefc;
        background: transparent;
        text-align: left;
        padding: 9px 10px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
      }
      .workhub-global-finder-result:last-child {
        border-bottom: 0;
      }
      .workhub-global-finder-result:hover,
      .workhub-global-finder-result.is-active {
        background: #eaf2ff;
      }
      .workhub-global-finder-result-main {
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
      }
      .workhub-global-finder-result-main strong {
        color: #1b315f;
        font-size: 0.82rem;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-global-finder-result-type {
        color: #45639b;
        font-size: 0.72rem;
        font-weight: 700;
        white-space: nowrap;
      }
      .workhub-global-finder-result-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        font-size: 0.72rem;
        color: #5f7398;
        min-width: 0;
      }
      .workhub-global-finder-result-meta span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 240px;
      }
      .workhub-global-finder-empty {
        padding: 16px 12px;
        font-size: 0.78rem;
        color: #5f7398;
      }
      .workhub-settings-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      .workhub-settings-tab {
        border: 1px solid #d8e4fa;
        background: #f8fbff;
        color: #5f6f91;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-settings-tab.is-active {
        background: #ecf3ff;
        border-color: #87a9ff;
        color: #224ba6;
      }
      .workhub-settings-tab-panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
        flex: 1 1 auto;
        min-height: 0;
        max-height: none;
        overflow-y: auto;
        padding-right: 4px;
        padding-bottom: 12px;
      }
      .workhub-workspace-color-meaning-editor {
        border: 1px solid #dce8fb;
        border-radius: 10px;
        background: #f8fbff;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-workspace-color-meaning-summary {
        list-style: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-workspace-color-meaning-summary::-webkit-details-marker {
        display: none;
      }
      .workhub-workspace-color-meaning-summary::after {
        content: '▸';
        color: #5d7399;
        font-size: 0.86rem;
      }
      .workhub-workspace-color-meaning-editor[open] .workhub-workspace-color-meaning-summary::after {
        content: '▾';
      }
      .workhub-workspace-color-meaning-summary strong {
        display: block;
        color: #1f3f73;
        font-size: 0.76rem;
        line-height: 1.2;
      }
      .workhub-workspace-color-meaning-summary span {
        display: block;
        color: #61779f;
        font-size: 0.7rem;
        line-height: 1.25;
        margin-top: 2px;
      }
      .workhub-workspace-color-meaning-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-workspace-color-meaning-head strong {
        display: block;
        color: #1f3f73;
        font-size: 0.76rem;
        line-height: 1.2;
      }
      .workhub-workspace-color-meaning-head span {
        display: block;
        color: #61779f;
        font-size: 0.7rem;
        line-height: 1.25;
        margin-top: 2px;
      }
      .workhub-workspace-color-meaning-head .workhub-ghost-btn {
        margin-top: 0;
      }
      .workhub-workspace-color-meaning-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-workspace-color-meaning-row {
        display: grid;
        grid-template-columns: 140px minmax(140px, 0.72fr) minmax(0, 1.2fr) auto;
        gap: 6px;
        align-items: end;
        border: 1px solid #e2ebfb;
        border-radius: 8px;
        background: #ffffff;
        padding: 6px;
      }
      .workhub-workspace-color-row-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      .workhub-workspace-color-row-actions .workhub-danger-btn {
        min-height: 28px;
        padding: 5px 8px;
        font-size: 0.72rem;
      }
      .workhub-workspace-color-cell {
        min-width: 0;
      }
      .workhub-workspace-color-input-row {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .workhub-workspace-color-input-row input[type='color'] {
        width: 34px;
        height: 26px;
        border: 1px solid #d8e4fa;
        border-radius: 6px;
        padding: 0;
        background: #ffffff;
      }
      .workhub-workspace-color-input-row small {
        font-size: 0.68rem;
        color: #4f668d;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .workhub-collapsible-danger {
        border: 1px solid #f3cccc;
        border-radius: 10px;
        background: #fffafa;
        padding: 0;
        overflow: hidden;
        margin-bottom: 8px;
      }
      .workhub-collapsible-danger > summary {
        list-style: none;
        cursor: pointer;
        padding: 10px 12px;
        font-size: 0.82rem;
        font-weight: 800;
        color: #a33636;
        border-bottom: 1px solid #f2d6d6;
      }
      .workhub-collapsible-danger[open] > summary {
        background: #fff2f2;
      }
      .workhub-workspace-settings-footer {
        position: sticky;
        bottom: 0;
        z-index: 2;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #e6eefc;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .workhub-workspace-delete-hint {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 0.72rem;
        line-height: 1.25;
        color: #7a5d5d;
      }
      .workhub-user-list-head,
      .workhub-user-list-row {
        display: grid;
        grid-template-columns: minmax(140px, 1fr) minmax(180px, 1fr) minmax(150px, 1fr) 84px;
        gap: 8px;
        align-items: center;
      }
      .workhub-user-list-head {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #6e82a8;
        border-bottom: 1px solid #e3ecfb;
        padding-bottom: 6px;
      }
      .workhub-user-list-body {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-user-list-row {
        border: 1px solid #e3ecfb;
        border-radius: 8px;
        padding: 7px 8px;
        font-size: 0.77rem;
        color: #35517f;
      }
      /* ── invite section ── */
      .workhub-invite-section {
        border: 1px solid #dce8ff;
        border-radius: 10px;
        padding: 14px 16px;
        background: #f9fbff;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-invite-section-disabled {
        opacity: 0.5;
        pointer-events: none;
        user-select: none;
        filter: grayscale(0.4);
      }
      .workhub-invite-coming-soon {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #8a9bbf;
        background: #edf1fb;
        border: 1px solid #d0daef;
        border-radius: 999px;
        padding: 2px 9px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .workhub-invite-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-invite-header strong {
        font-size: 0.88rem;
        font-weight: 700;
        color: #1a3060;
        margin-right: 6px;
      }
      .workhub-invite-header span {
        font-size: 0.78rem;
        color: #7b90b8;
      }
      .workhub-invite-input-row {
        display: flex;
        gap: 8px;
      }
      .workhub-invite-input-row input {
        flex: 1;
        min-width: 0;
        padding: 7px 10px;
        border: 1px solid #c8d9f5;
        border-radius: 7px;
        font-size: 0.84rem;
        color: #1a3060;
        background: #fff;
        outline: none;
      }
      .workhub-invite-input-row input:focus {
        border-color: #5a7ee8;
        box-shadow: 0 0 0 3px rgba(90,126,232,0.13);
      }
      .workhub-invite-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-invite-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #e8eeff;
        border: 1px solid #c2d1f7;
        border-radius: 999px;
        padding: 3px 6px 3px 10px;
        font-size: 0.78rem;
        color: #2a4a8c;
        font-weight: 500;
      }
      .workhub-invite-chip-actions {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .workhub-invite-chip-send {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        font-size: 0.78rem;
        color: #4a6fa5;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.12s;
      }
      .workhub-invite-chip-send:hover {
        background: #ccdafc;
        color: #1a3487;
      }
      .workhub-invite-chip-remove {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: #8a9bbf;
        font-size: 1rem;
        line-height: 1;
        cursor: pointer;
        transition: background 0.12s, color 0.12s;
        padding: 0;
      }
      .workhub-invite-chip-remove:hover {
        background: #fcd4d4;
        color: #b03030;
      }
      /* ── invite tracking table ── */
      .workhub-invite-table {
        display: flex;
        flex-direction: column;
        border: 1px solid #dce8ff;
        border-radius: 9px;
        overflow: hidden;
      }
      .workhub-invite-table-head {
        display: grid;
        grid-template-columns: 1fr 160px 160px;
        gap: 8px;
        padding: 7px 12px;
        background: #f2f6ff;
        border-bottom: 1px solid #dce8ff;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6878a8;
      }
      .workhub-invite-table-row {
        display: grid;
        grid-template-columns: 1fr 160px 160px;
        gap: 8px;
        align-items: center;
        padding: 9px 12px;
        border-bottom: 1px solid #eef2fb;
        background: #fff;
        transition: background 0.1s;
      }
      .workhub-invite-table-row:last-child {
        border-bottom: none;
      }
      .workhub-invite-table-row:hover {
        background: #fafcff;
      }
      .workhub-invite-email {
        font-size: 0.82rem;
        color: #2a4070;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-invite-status {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .workhub-invite-status-dot {
        font-size: 0.72rem;
        line-height: 1;
      }
      .invite-status-waiting {
        color: #8a9bbf;
      }
      .invite-status-pending {
        color: #8a6200;
      }
      .invite-status-active {
        color: #1e6e45;
      }
      .invite-status-suspended {
        color: #922;
      }
      .workhub-invite-row-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: flex-end;
      }
      .workhub-invite-resend {
        font-size: 0.73rem;
        color: #4a6fa5;
        text-decoration: none;
        padding: 3px 8px;
        border: 1px solid #c2d4f5;
        border-radius: 5px;
        background: #f0f5ff;
        white-space: nowrap;
        cursor: pointer;
        transition: background 0.1s, border-color 0.1s;
      }
      .workhub-invite-resend:hover {
        background: #deeaff;
        border-color: #87a9ff;
      }
      .workhub-invite-revoke {
        font-size: 0.73rem;
        color: #9a3030;
        background: transparent;
        border: 1px solid #f0c4c4;
        border-radius: 5px;
        padding: 3px 8px;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.1s, border-color 0.1s;
      }
      .workhub-invite-revoke:hover {
        background: #fde8e8;
        border-color: #e08080;
      }
      /* ── members section ── */
      .workhub-members-section {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        gap: 10px;
      }
      .workhub-members-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .workhub-members-section-head strong {
        font-size: 0.88rem;
        font-weight: 700;
        color: #1a3060;
      }
      .workhub-members-count {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.78rem;
        color: #7b90b8;
      }
      .workhub-pending-badge {
        display: inline-flex;
        align-items: center;
        background: #fff3cd;
        color: #7a5400;
        border: 1px solid #f5d87c;
        border-radius: 999px;
        padding: 1px 8px;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .workhub-member-list {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        gap: 3px;
        max-height: none;
        overflow-y: auto;
      }
      .workhub-user-management-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        margin-bottom: 0;
      }
      .workhub-member-row-wrap {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      /* access level toggle (Full / Custom) */
      .workhub-access-level-toggle {
        display: inline-flex;
        border: 1px solid #d8e6fb;
        border-radius: 6px;
        overflow: hidden;
        flex-shrink: 0;
      }
      .workhub-access-level-btn {
        border: none;
        background: transparent;
        padding: 3px 9px;
        font-size: 0.73rem;
        font-weight: 600;
        color: #6b84b8;
        cursor: pointer;
        transition: background 0.1s, color 0.1s;
        white-space: nowrap;
      }
      .workhub-access-level-btn + .workhub-access-level-btn {
        border-left: 1px solid #d8e6fb;
      }
      .workhub-access-level-btn.is-active {
        background: #1a3d8f;
        color: #ffffff;
      }
      .workhub-access-level-btn:not(.is-active):hover {
        background: #eef4ff;
        color: #1a3060;
      }
      /* workspace count button */
      .workhub-ws-count-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: none;
        border: 1px solid #d8e6fb;
        border-radius: 6px;
        padding: 3px 7px;
        font-size: 0.75rem;
        color: #3a5a9a;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.1s, border-color 0.1s;
      }
      .workhub-ws-count-btn:hover,
      .workhub-ws-count-btn.is-open {
        background: #e8f0ff;
        border-color: #87a9ff;
      }
      .workhub-ws-count-label {
        font-size: 0.75rem;
        color: #6080b0;
      }
      .workhub-ws-count-chevron {
        font-size: 0.55rem;
        color: #8aa0c8;
      }
      /* workspace picker panel */
      .workhub-ws-picker {
        border: 1px solid #d5e4ff;
        border-top: none;
        border-radius: 0 0 9px 9px;
        background: #f5f9ff;
        padding: 8px 10px 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-ws-picker-title {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #7390c0;
      }
      .workhub-ws-picker-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .workhub-ws-picker-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 7px;
        border-radius: 7px;
        cursor: pointer;
        transition: background 0.1s;
      }
      .workhub-ws-picker-row:hover {
        background: #eaf1ff;
      }
      .workhub-ws-picker-row.is-open {
        opacity: 0.7;
        cursor: default;
      }
      .workhub-ws-picker-row.is-current {
        background: #eef3ff;
      }
      .workhub-ws-picker-row input[type="checkbox"] {
        width: 15px;
        height: 15px;
        accent-color: #3a5bd9;
        flex-shrink: 0;
        cursor: pointer;
      }
      .workhub-ws-picker-row.is-open input[type="checkbox"] {
        cursor: not-allowed;
      }
      .workhub-ws-picker-name {
        flex: 1;
        font-size: 0.78rem;
        color: #1c3566;
        font-weight: 500;
      }
      .workhub-ws-picker-badge {
        font-size: 0.66rem;
        font-weight: 700;
        padding: 1px 7px;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .workhub-ws-picker-badge.current {
        background: #e0eaff;
        color: #2a4fa8;
        border: 1px solid #a8c0f5;
      }
      .workhub-ws-picker-badge.open {
        background: #e8f5e9;
        color: #2e6e3a;
        border: 1px solid #a5d6a7;
      }
      .workhub-ws-picker-badge.saving {
        background: #fff3e0;
        color: #7a4800;
        border: 1px solid #ffcc80;
      }
      .workhub-member-row.settings-row {
        display: grid;
        grid-template-columns: 36px 1fr minmax(90px,110px) auto;
        gap: 8px;
        align-items: center;
        border: 1px solid #e8eef9;
        border-radius: 9px;
        padding: 7px 9px;
        background: #fff;
        transition: border-color 0.12s, background 0.12s;
      }
      .workhub-member-row.settings-row:hover {
        border-color: #c2d1f7;
        background: #fafcff;
      }
      .workhub-member-row.settings-row.is-pending {
        border-color: #f5d87c;
        background: #fffdf2;
      }
      .workhub-member-row.settings-row.is-suspended {
        opacity: 0.6;
      }
      .workhub-member-avatar.settings-avatar {
        width: 31px;
        height: 31px;
        border-radius: 50%;
        background: linear-gradient(135deg, #5a7ee8 0%, #3a5bd9 100%);
        color: #fff;
        font-size: 0.64rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        letter-spacing: 0.05em;
        user-select: none;
      }
      .workhub-member-identity {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .workhub-member-name {
        font-size: 0.84rem;
        font-weight: 600;
        color: #17305c;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-member-email {
        font-size: 0.73rem;
        color: #8a9bbf;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-member-workspaces {
        font-size: 0.75rem;
        color: #6e82a8;
        text-align: center;
      }
      .workhub-member-workspaces .workhub-muted {
        color: #c0cee8;
      }
      .workhub-member-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: flex-end;
      }
      .workhub-user-mode-toggle {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d8e6fb;
        border-radius: 6px;
        overflow: hidden;
      }
      .workhub-user-mode-btn {
        border: none;
        background: #ffffff;
        color: #6b84b8;
        padding: 3px 8px;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        line-height: 1.1;
      }
      .workhub-user-mode-btn + .workhub-user-mode-btn {
        border-left: 1px solid #d8e6fb;
      }
      .workhub-user-mode-btn.is-active {
        background: #1a3d8f;
        color: #ffffff;
      }
      .workhub-user-mode-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .workhub-user-mode-pill {
        display: inline-flex;
        align-items: center;
        border: 1px solid #b9cdf7;
        background: #edf4ff;
        color: #2a4fa8;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 0.68rem;
        font-weight: 700;
      }
      .workhub-status-pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 2px 9px;
        font-size: 0.71rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
      .workhub-status-pill.pending {
        background: #fff3cd;
        color: #7a5400;
        border: 1px solid #f5d87c;
      }
      .workhub-status-pill.suspended {
        background: #fde8e8;
        color: #8b2222;
        border: 1px solid #f5b8b8;
      }
      .workhub-approve-btn {
        padding: 4px 10px;
        border: 1px solid #4caf82;
        border-radius: 6px;
        background: #e8f7f0;
        color: #236645;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.12s, border-color 0.12s;
      }
      .workhub-approve-btn:hover:not(:disabled) {
        background: #cdf0df;
        border-color: #2e9962;
      }
      .workhub-approve-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .workhub-decline-btn {
        padding: 4px 8px;
        border: 1px solid #e0b4b4;
        border-radius: 6px;
        background: #fdf2f2;
        color: #b03030;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        line-height: 1;
        transition: background 0.12s, border-color 0.12s;
      }
      .workhub-decline-btn:hover:not(:disabled) {
        background: #fde0e0;
        border-color: #c04040;
      }
      .workhub-decline-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .workhub-access-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
      .workhub-access-toggle input[type="checkbox"] {
        width: 15px;
        height: 15px;
        accent-color: #3a5bd9;
        cursor: pointer;
      }
      .workhub-access-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #9aabce;
        white-space: nowrap;
      }
      .workhub-access-label.is-active {
        color: #2a6f4f;
      }
      .workhub-modal.workhub-image-review-modal {
        width: min(calc(var(--img-aspect, 1.778) * (100vh - 210px) + 42px), calc(100vw - 20px));
        max-width: calc(100vw - 20px);
        max-height: calc(100vh - 20px);
        border-radius: 10px;
        padding: 10px;
      }
      .workhub-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 24px;
      }
      .workhub-modal-head p {
        margin: 3px 0 0;
        color: #627291;
        font-size: 0.84rem;
        line-height: 1.25;
      }
      .workhub-switcher {
        margin-bottom: 6px;
      }
      .workhub-switcher.compact-switcher {
        margin-bottom: 0;
      }
      .workhub-switcher-btn {
        border: 1px solid #d8e4fa;
        background: #f8fbff;
        color: #5f6f91;
        border-radius: 8px;
        padding: 5px 8px;
        font-size: 0.76rem;
        line-height: 1.1;
        font-weight: 700;
        cursor: pointer;
        min-height: 24px;
      }
      .workhub-switcher-btn.is-active {
        background: #ecf3ff;
        border-color: #87a9ff;
        color: #224ba6;
      }
      .workhub-modal {
        font-size: 0.74rem;
        line-height: 1.25;
      }
      .workhub-modal h2,
      .workhub-modal h3,
      .workhub-modal h4 {
        font-size: 0.74rem;
        line-height: 1.25;
        font-weight: 500;
      }
      .workhub-modal-head p,
      .workhub-psettings-version,
      .workhub-modal label > span,
      .workhub-modal input:not([type='checkbox']):not([type='radio']),
      .workhub-modal textarea,
      .workhub-modal select,
      .workhub-modal button {
        font-size: 0.74rem;
        line-height: 1.25;
      }
      .workhub-project-settings-section-title,
      .workhub-settings-panel-head,
      .workhub-settings-group > summary,
      .workhub-project-settings-advanced > summary,
      .workhub-template-picker-label,
      .workhub-switcher-btn,
      .workhub-settings-tab {
        font-size: 0.74rem;
        font-weight: 500;
      }
      .workhub-member-chip {
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #35517f;
        border-radius: 999px;
        padding: 4px 7px;
        font-size: 0.74rem;
        line-height: 1.1;
        cursor: pointer;
      }
      .workhub-member-chip.is-selected {
        background: #edf4ff;
        border-color: #87a9ff;
        color: #224ba6;
      }
      .workhub-member-chip:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .dashboard-strip {
        margin-top: 4px;
      }
      @keyframes workhubMenuIn {
        from { opacity: 0; transform: translateZ(0) scaleY(0.92); transform-origin: top center; }
        to   { opacity: 1; transform: translateZ(0) scaleY(1);    transform-origin: top center; }
      }
      @keyframes workhubDialogIn {
        from { opacity: 0; transform: translate(-50%, -50%) translateZ(0) scale(0.96); }
        to   { opacity: 1; transform: translate(-50%, -50%) translateZ(0) scale(1); }
      }
      @keyframes workhubSpin {
        to { transform: rotate(360deg); }
      }
      @keyframes workhubMobileDrawerIn {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
      @keyframes workhubMobileDrawerOut {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(100%);
        }
      }
      @keyframes workhubMobileBackdropOut {
        from { background: rgba(20, 32, 56, 0.34); }
        to   { background: rgba(20, 32, 56, 0); }
      }
      .workhub-mobile-workspace-panel-backdrop.is-closing {
        animation: workhubMobileBackdropOut 0.3s ease forwards;
        pointer-events: none;
      }
      .workhub-mobile-workspace-panel-backdrop.is-closing .workhub-mobile-workspace-panel {
        animation: workhubMobileDrawerOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-shell-layout,
        .workhub-compact-grid,
        .workhub-detail-grid {
          grid-template-columns: 1fr;
        }
        .workhub-workspace-create-layout {
          grid-template-columns: 1fr;
        }
        .workhub-template-card-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-height: none;
        }
        .workhub-home-template-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .workhub-overview-dashboard {
          grid-template-columns: 1fr;
        }
        .workhub-summary-strip {
          flex-wrap: wrap;
          overflow-x: visible;
          touch-action: auto;
        }
        .workhub-summary-tile {
          flex: 1 1 calc(50% - 6px);
          min-width: 0;
        }
        .workhub-proposal-focus-grid {
          grid-template-columns: 1fr;
        }
        .workhub-proposal-deadline-row {
          grid-template-columns: 1fr;
        }
        .workhub-proposal-thumb-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .workhub-proposal-doc-list {
          grid-template-columns: 1fr;
        }
        .workhub-content-area {
          grid-template-columns: 1fr;
        }
        .workhub-content-area.workhub-detail-rail-compact,
        .workhub-content-area.workhub-detail-rail-hidden {
          grid-template-columns: 1fr;
        }
        .workhub-task-detail-rail {
          border-left: 0;
          padding-left: 0;
          max-height: none;
        }
        .workhub-task-detail-rail.is-mobile-drawer {
          position: fixed;
          left: 0;
          right: 0;
          bottom: calc(60px + env(safe-area-inset-bottom));
          z-index: 47;
          background: #f8fbff;
          border-top: 1px solid #d7e5ff;
          border-radius: 14px 14px 0 0;
          box-shadow: 0 -14px 28px rgba(20, 40, 77, 0.22);
          max-height: min(72vh, 640px);
          overflow-y: auto;
          padding: 0 0 10px;
          transform: translateY(calc(100% + 16px));
          transition: transform 0.22s ease;
          pointer-events: none;
        }
        .workhub-task-detail-rail.is-mobile-drawer.is-open {
          transform: translateY(0);
          pointer-events: auto;
        }
        .workhub-mobile-detail-drawer-head {
          position: sticky;
          top: 0;
          z-index: 2;
          background: #f8fbff;
          border-bottom: 1px solid #e0e9f8;
          padding: 6px 12px 8px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
        }
        .workhub-mobile-detail-drawer-handle {
          display: block;
          width: 42px;
          height: 5px;
          border: 0;
          border-radius: 999px;
          background: #c5d5ef;
          cursor: pointer;
          padding: 0;
          align-self: center;
          margin: 0 auto 6px;
        }
        .workhub-mobile-detail-drawer-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .workhub-mobile-detail-drawer-head strong {
          font-size: 0.82rem;
          color: #1d345f;
        }
        .workhub-shell.task-detail-open .workhub-task-sections,
        .workhub-shell.task-detail-open .workhub-section-stack,
        .workhub-shell.task-detail-open .workhub-main-stage,
        .workhub-shell.task-detail-open .workhub-app,
        .workhub-shell.workspace-drawer-open .workhub-section-stack,
        .workhub-shell.workspace-drawer-open .workhub-main-stage,
        .workhub-shell.workspace-drawer-open .workhub-app {
          overflow: hidden;
          touch-action: none;
        }
        .workhub-task-detail-rail.is-mobile-drawer.is-open {
          overscroll-behavior: contain;
          touch-action: pan-y;
        }
        .workhub-task-detail-drawer-backdrop {
          display: block;
          position: fixed;
          left: 0;
          right: 0;
          top: 0;
          bottom: calc(60px + env(safe-area-inset-bottom));
          z-index: 46;
          background: rgba(20, 32, 56, 0.28);
          border: 0;
          padding: 0;
          margin: 0;
          cursor: pointer;
        }
        .workhub-task-table-head,
        .workhub-task-row-grid {
          grid-template-columns: minmax(0, 2.2fr) 52px 40px minmax(78px, 0.95fr) 48px 40px;
          gap: 6px;
        }
        .workhub-col-checklist,
        .workhub-col-actions,
        .workhub-task-col.checklist-inline,
        .workhub-task-col.actions-inline {
          display: none;
        }
        .workhub-col-more,
        .workhub-task-col.more {
          display: flex;
        }
        .workhub-image-review-panels {
          grid-template-columns: 1fr;
        }
        .workhub-client-layout {
          grid-template-columns: 1fr;
        }
      }
      .workhub-tree-sidebar {
        position: static;
        max-height: 100%;
      }
      .workhub-summary-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-topbar,
        .workhub-header-actions,
        .workhub-project-title-row.spaced {
          flex-direction: column;
          align-items: stretch;
        }
        .workhub-field-grid.two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .workhub-detail-grid,
        .workhub-summary-list,
        .workhub-home-template-grid {
          grid-template-columns: 1fr;
        }
        .workhub-workspace-template-id {
          grid-template-columns: 1fr;
        }
        .workhub-template-card {
          grid-template-columns: 46px minmax(0, 1fr);
        }
        .workhub-template-graphic {
          width: 46px;
          height: 46px;
        }
        .workhub-template-card-grid {
          grid-template-columns: 1fr;
        }
        .workhub-sidebar-action-grid {
          grid-template-columns: 1fr;
        }
        .workhub-summary-strip {
          flex-wrap: wrap;
          overflow-x: visible;
          overflow-y: visible;
          touch-action: auto;
          overscroll-behavior-x: auto;
          gap: 8px;
          padding-bottom: 2px;
        }
        .workhub-summary-strip .workhub-summary-tile {
          flex: 1 1 calc(50% - 4px);
          min-width: 0;
        }
        .workhub-overview-card {
          min-height: 0;
        }
        .workhub-header-actions {
          justify-content: flex-start;
          margin-left: 0;
          padding-left: 0;
          border-left: 0;
        }
        .workhub-mobile-workspace-panel {
          width: 100%;
          height: min(calc(100vh - 60px - env(safe-area-inset-top) - env(safe-area-inset-bottom)), 82vh);
          max-height: min(calc(100vh - 60px - env(safe-area-inset-top) - env(safe-area-inset-bottom)), 82vh);
          border-right: none;
          border-radius: 14px 14px 0 0;
          box-shadow: 0 -14px 28px rgba(20, 40, 77, 0.22);
        }
        .workhub-find-command-shortcut {
          display: none;
        }
        .workhub-notes-content-area {
          height: auto;
          overflow: visible;
        }
        .workhub-documents-panel {
          height: auto;
          --workhub-doc-title-size: 0.72rem;
        }
        .workhub-quick-note-modal {
          width: min(100%, calc(100vw - 12px));
          height: calc(100dvh - 96px - env(safe-area-inset-bottom));
          max-height: calc(100dvh - 96px - env(safe-area-inset-bottom));
          padding: 12px;
          border-radius: 18px;
        }
        .workhub-quick-note-foot {
          align-items: stretch;
        }
        .workhub-quick-note-foot-left,
        .workhub-quick-note-actions {
          width: 100%;
        }
        .workhub-quick-note-actions {
          justify-content: space-between;
          margin-left: 0;
        }
        .workhub-documents-title-input {
          width: 100%;
        }
        .workhub-document-body-head {
          flex-direction: column;
          align-items: stretch;
        }
        .workhub-document-format-toolbar {
          justify-content: flex-start;
        }
        .workhub-task-context-strip {
          display: grid;
          gap: 6px;
          padding: 6px 8px;
          border-radius: 10px;
          margin-bottom: 8px;
        }
        .workhub-task-context-path {
          gap: 4px;
        }
        .workhub-task-context-current {
          padding: 2px 0 4px;
          gap: 4px;
        }
        .workhub-task-context-current-title {
          gap: 6px;
          font-size: 0.95rem;
          line-height: 1.18;
        }
        .workhub-task-context-current-icon {
          width: 20px;
          height: 20px;
          font-size: 0.8rem;
        }
        .workhub-task-context-current-meta {
          gap: 4px 8px;
          font-size: 0.66rem;
          line-height: 1.15;
        }
        .workhub-task-context-node {
          min-height: 30px;
          padding: 4px 8px;
          border-radius: 9px;
        }
        .workhub-task-context-node-icon {
          font-size: 0.72rem;
        }
        .workhub-task-context-node-title {
          font-size: 0.72rem;
          line-height: 1.15;
        }
        .workhub-task-context-sep {
          font-size: 0.72rem;
          margin: 0 1px;
        }
        .workhub-task-context-period {
          gap: 5px;
          font-size: 0.68rem;
          line-height: 1.15;
        }
        .workhub-document-body-editor {
          min-height: 320px;
          height: 320px;
        }
        .workhub-tree-overview {
          min-height: 34px;
          padding: 6px 9px;
          font-size: 0.75rem;
          border-radius: 9px;
          border: 0;
          background: linear-gradient(135deg, #4f8cff, #7b61ff);
          color: #ffffff;
          box-shadow: none;
        }
        .workhub-tree-overview.is-active {
          background: linear-gradient(135deg, #3f79f0, #6a4ff0);
          color: #ffffff;
          border-color: #2e63d1;
          box-shadow: 0 7px 16px rgba(35, 65, 120, 0.26), inset 0 0 0 1px rgba(255, 255, 255, 0.22);
        }
        .workhub-tree-group-toggle {
          min-height: 34px;
          padding: 7px 10px;
          border-radius: 9px;
          border-color: #e1e8f2;
          background: #fcfdff;
          box-shadow: none;
        }
        .workhub-tree-group-toggle strong {
          font-size: 0.78rem;
        }
        .workhub-tree-group-toggle small {
          font-size: 0.64rem;
        }
        .workhub-tree-doc-item {
          min-height: 34px;
          padding: 6px 9px;
          gap: 2px;
          border-radius: 9px;
          border-color: #e2e8f2;
          background: #fcfdff;
          box-shadow: none;
        }
        .workhub-tree-doc-item.is-active {
          background: linear-gradient(90deg, #e4efff 0%, #f3f8ff 100%);
          border-color: #7ea2da;
          box-shadow: inset 4px 0 0 #2f63c8, 0 0 0 1px rgba(47, 99, 200, 0.2);
        }
        .workhub-tree-doc-item-title {
          font-size: 0.7rem;
        }
        .workhub-tree-doc-item-meta {
          font-size: 0.62rem;
        }
        .workhub-tree-doc-subitem {
          min-height: 24px;
          padding: 4px 7px;
          border-radius: 8px;
          border-color: #e4eaf3;
          background: #fcfdff;
          box-shadow: none;
        }
        .workhub-tree-doc-subitem.is-linked-highlight {
          background: #e3efff;
          border-color: #7ea2da;
          box-shadow: inset 3px 0 0 #2f63c8;
        }
        .workhub-tree-node {
          min-height: 40px;
          padding: 8px 10px;
          border-radius: 9px;
          gap: 7px;
          border-color: #e1e8f2;
          background: #fcfdff;
          box-shadow: none;
        }
        .workhub-tree-node-wrap.is-root > .workhub-tree-node {
          min-height: 41px;
          padding: 8px 10px;
        }
        .workhub-tree-node-wrap.is-root + .workhub-tree-node-wrap.is-root {
          margin-top: 3px;
          padding-top: 0;
        }
        .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node,
        .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node,
        .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node,
        .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node {
          background: #fcfdff;
        }
        .workhub-tree-node-wrap.is-nested > .workhub-tree-node {
          min-height: 34px;
          padding-top: 6px;
          padding-bottom: 6px;
        }
        .workhub-tree-node.is-linked-highlight,
        .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node.is-linked-highlight,
        .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node.is-linked-highlight,
        .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node.is-linked-highlight,
        .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node.is-linked-highlight {
          background: linear-gradient(90deg, #e3efff 0%, #f3f8ff 100%);
          border-color: #7ea2da;
          box-shadow: inset 4px 0 0 #2f63c8, 0 0 0 1px rgba(47, 99, 200, 0.2);
        }
        .workhub-tree-node.is-active,
        .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node.is-active,
        .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node.is-active,
        .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node.is-active,
        .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node.is-active {
          background: linear-gradient(90deg, #e3efff 0%, #f3f8ff 100%);
          border-color: #7ea2da;
          box-shadow: inset 4px 0 0 #2f63c8, 0 0 0 1px rgba(47, 99, 200, 0.2);
        }
        .workhub-tree-node-title {
          font-size: 0.82rem;
          line-height: 1.2;
          font-weight: 400;
        }
        .workhub-tree-node-meta {
          font-size: 0.66rem;
          line-height: 1.15;
          font-weight: 400;
          color: #566f95;
        }
        .workhub-tree-node.is-active .workhub-tree-node-meta.is-near-submission {
          color: #b4232f;
        }
        .workhub-tree-node.is-active .workhub-tree-node-meta.is-overdue {
          color: #a01822;
        }
        .workhub-tree-node-progress {
          font-size: 0.64rem;
          gap: 6px;
        }
        .workhub-tree-node-progress-track {
          width: 44px;
          height: 6px;
        }
        .workhub-tree-node-intent-icon {
          font-size: 0.88rem;
          opacity: 1;
        }
        .workhub-tree-node-intent-icon.is-project-kind {
          border-color: #cfdcf4;
          background: #f3f7ff;
        }
        .workhub-tree-node-intent-icon.is-folder-kind {
          border-color: #e9dfce;
          background: #fbf8f2;
        }
        .workhub-tree-node .workhub-plus-btn,
        .workhub-tree-node .workhub-gear-btn {
          width: 28px;
          height: 28px;
          font-size: 0.9rem;
        }
        .workhub-task-context-node-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 1px solid #d7e4fa;
          background: #f7fbff;
        }
        .workhub-task-context-node-icon.is-project-kind {
          border-color: #cfdcf4;
          background: #f3f7ff;
        }
        .workhub-task-context-node-icon.is-folder-kind {
          border-color: #e9dfce;
          background: #fbf8f2;
        }
        .workhub-documents-layout {
          grid-template-columns: 1fr;
        }
        .workhub-modal-backdrop {
          align-items: flex-start;
          padding: max(6px, env(safe-area-inset-top)) 6px max(6px, env(safe-area-inset-bottom));
        }
        .workhub-modal,
        .workhub-modal.large {
          width: min(100%, calc(100vw - 12px));
          max-height: calc(100dvh - 12px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
        }
        .workhub-modal.workhub-global-finder-modal {
          width: min(100%, calc(100vw - 12px));
        }
        .workhub-modal.workhub-workspace-settings-modal {
          width: min(100%, calc(100vw - 12px));
          max-height: calc(100dvh - 12px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
        }
        .workhub-modal.workhub-project-settings-modal {
          width: min(100%, calc(100vw - 12px));
          max-height: calc(100dvh - 12px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
        }
        .workhub-project-settings-body,
        .workhub-settings-tab-panel,
        .workhub-modal-form {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        .workhub-project-settings-body {
          padding: 0 10px 10px;
        }
        .workhub-project-settings-head {
          padding: 18px 12px 8px;
        }
        .workhub-project-settings-main {
          padding: 10px;
        }
        .workhub-project-settings-grid-preview {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .workhub-col-span-3,
        .workhub-col-span-4 {
          grid-column: span 1;
        }
        .workhub-col-span-5,
        .workhub-col-span-6 {
          grid-column: span 2;
        }
        .workhub-project-settings-access-options {
          flex-wrap: wrap;
          gap: 8px 14px;
          min-height: 0;
          padding-top: 0;
        }
        .workhub-project-settings-bottom-grid {
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .workhub-project-settings-suggestion {
          flex-direction: column;
        }
        .workhub-project-settings-suggestion-actions {
          width: 100%;
          justify-content: flex-start;
        }
        .workhub-project-settings-sticky-actions {
          justify-content: stretch;
          padding: 10px;
        }
        .workhub-project-settings-sticky-actions .workhub-ghost-btn,
        .workhub-project-settings-sticky-actions .workhub-primary-btn {
          flex: 1;
        }
        .workhub-user-list-head {
          display: none;
        }
        .workhub-user-list-row {
          grid-template-columns: 1fr;
          gap: 4px;
        }
        .workhub-member-row.settings-row {
          grid-template-columns: 32px 1fr;
          grid-template-rows: auto auto;
        }
        .workhub-member-workspaces {
          display: none;
        }
        .workhub-workspace-color-meaning-head {
          flex-direction: column;
          align-items: stretch;
        }
        .workhub-workspace-color-meaning-row {
          grid-template-columns: 1fr;
        }
        .workhub-workspace-color-row-actions {
          justify-content: flex-start;
        }
        .workhub-member-actions {
          grid-column: 1 / -1;
          justify-content: flex-start;
          flex-wrap: wrap;
        }
        .workhub-invite-input-row {
          flex-direction: column;
        }
        .workhub-invite-table-head {
          display: none;
        }
        .workhub-invite-table-row {
          grid-template-columns: 1fr;
          gap: 5px;
        }
        .workhub-invite-row-actions {
          justify-content: flex-start;
        }
        .workhub-project-risk-meta-row {
          grid-template-columns: minmax(0, 1fr) 52px;
        }
        .workhub-project-risk-calendar {
          display: none;
        }
        .workhub-client-quick-add {
          flex-direction: column;
        }
        .workhub-modal.workhub-image-review-modal {
          width: calc(100vw - 12px);
          max-width: none;
          max-height: calc(100vh - 12px);
          padding: 14px;
        }
        .workhub-task-table-head {
          display: none;
        }
        .workhub-task-row-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto auto auto auto;
          align-items: center;
          gap: 6px;
        }
        .workhub-task-group {
          width: 100%;
        }
        .workhub-task-sections {
          overflow-x: hidden;
        }
        .workhub-task-sections.task-view-list {
          --workhub-task-list-min-width: 620px;
        }
        .workhub-task-related-groups {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .workhub-task-context-strip {
          display: block;
          padding: 6px;
        }
        .workhub-task-context-path {
          width: 100%;
          margin-bottom: 4px;
        }
        .workhub-task-context-current {
          padding: 4px 2px 2px;
        }
        .workhub-task-context-current-title {
          font-size: 0.98rem;
        }
        .workhub-task-context-current-meta {
          width: 100%;
          justify-content: center;
          gap: 4px 8px;
        }
        .workhub-task-context-node {
          width: 124px;
          min-height: 52px;
          font-size: 0.68rem;
          padding: 6px 7px;
        }
        .workhub-task-context-period {
          width: 100%;
          justify-content: flex-start;
          gap: 6px;
          overflow-x: auto;
        }
        .workhub-task-table-wrap {
          min-width: 100%;
          width: 100%;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
        }
        .workhub-task-table-wrap.task-view-timeline {
          overflow-x: hidden;
        }
        .workhub-task-table-wrap {
          --workhub-task-timeline-name-width: 160px;
          --workhub-task-timeline-day-width: 22px;
          --workhub-task-timeline-head-height: 32px;
          --workhub-task-timeline-row-height: 38px;
        }
        .workhub-task-timeline-wrap {
          max-height: calc(100vh - 340px);
          min-height: 180px;
        }
        .workhub-task-timeline-toolbar {
          padding: 8px 10px;
        }
        .workhub-task-timeline-zoom-controls button.is-add {
          min-width: 60px;
          padding: 0 8px;
        }
        .workhub-task-timeline-quick-add {
          padding: 8px 10px;
          gap: 6px;
        }
        .workhub-task-timeline-quick-add input {
          min-height: 28px;
        }
        .workhub-task-timeline-quick-add button {
          min-height: 28px;
          padding: 0 8px;
        }
        .workhub-task-timeline-image-chip {
          font-size: 0.52rem;
          padding: 2px 5px;
        }
        .workhub-task-timeline-layout {
          grid-template-columns: var(--workhub-task-timeline-name-width) 8px minmax(0, 1fr);
        }
        .workhub-task-timeline-name,
        .workhub-task-timeline-bar-track {
          min-height: var(--workhub-task-timeline-row-height);
          height: var(--workhub-task-timeline-row-height);
        }
        .workhub-task-timeline-bar-wrap {
          height: 22px;
        }
        .workhub-task-group-body {
          min-width: 0;
        }
        .workhub-task-col.details {
          grid-template-columns: 14px 14px minmax(0, 1fr);
          min-width: 0;
        }
        .workhub-task-row-grid {
          grid-template-columns: minmax(0, 1fr) auto auto auto auto auto;
          width: 100%;
          min-width: 0;
        }
        .workhub-task-col.details .workhub-task-row-title strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .workhub-task-col.status,
        .workhub-task-col.assignee,
        .workhub-task-col.due,
        .workhub-task-col.priority,
        .workhub-task-col.more {
          flex: 0 0 auto;
        }
        .workhub-task-due-btn {
          max-width: 72px;
        }
        .workhub-task-col.more {
          justify-content: flex-end;
        }
        .workhub-task-row.workhub-task-row-draft .workhub-task-row-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 8px;
        }
        .workhub-task-row.workhub-task-row-draft .workhub-task-col.details {
          flex: 1 1 100%;
        }
        .workhub-task-row-main {
          padding: 6px 8px;
        }
        .workhub-detail-icon-row {
          grid-template-columns: 1fr;
        }
        .workhub-detail-icon-menu {
          min-width: min(280px, calc(100vw - 48px));
        }
        .workhub-task-detail-rail .workhub-detail-meta {
          grid-template-columns: 1fr;
        }
        .workhub-discussion-card .workhub-comment-list-chat {
          max-height: 220px;
          gap: 6px;
          padding: 2px 0;
        }
        .workhub-discussion-card .workhub-comment-bubble {
          margin: 12px 0 4px;
          padding: 7px 8px;
          border-radius: 9px;
        }
        .workhub-discussion-card .workhub-comment-bubble-head {
          margin-bottom: 3px;
        }
        .workhub-comment-author {
          gap: 5px;
        }
        .workhub-comment-author-avatar,
        .workhub-comment-author-avatar-fallback {
          width: 16px;
          height: 16px;
        }
        .workhub-comment-head-actions {
          gap: 4px;
        }
        .workhub-comment-head-actions > span {
          font-size: 0.6rem;
        }
        .workhub-comment-edit-btn {
          width: 18px;
          height: 18px;
          border-radius: 5px;
        }
        .workhub-comment-edit-form {
          gap: 5px;
          margin-top: 3px;
          padding: 6px;
        }
        .workhub-comment-edit-form textarea {
          min-height: 62px;
        }
        .workhub-comment-edit-actions .workhub-primary-mini,
        .workhub-comment-edit-actions .workhub-ghost-mini {
          min-width: 64px;
          min-height: 26px;
          padding: 3px 8px;
          font-size: 0.68rem;
        }
        .workhub-comment-composer {
          margin-top: 8px;
          gap: 6px;
        }
        .workhub-comment-composer textarea {
          min-height: 72px;
        }
        .workhub-comment-composer-footer {
          align-items: center;
        }
        .workhub-comment-send-btn {
          width: 34px;
          height: 34px;
        }
        .workhub-quick-add-placeholder {
          min-height: 0;
        }
        .workhub-modal.workhub-image-review-modal {
          width: calc(100vw - 12px);
          max-width: none;
          height: auto;
          max-height: calc(100vh - 12px);
        }
        .workhub-image-review-layout {
          grid-template-rows: auto auto;
        }
        .workhub-image-review-stage {
          max-width: calc(var(--img-aspect, 1.778) * 45vh);
          max-height: 45vh;
        }
        .workhub-image-review-topbar {
          align-items: flex-start;
        }
        .workhub-image-review-topbar-title {
          gap: 4px;
        }
        .workhub-image-review-panels {
          grid-template-columns: 1fr;
        }
        .workhub-shell.is-mobile .workhub-main-stage {
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
        }
        .workhub-shell.is-mobile .workhub-section-stack {
          flex: 0 0 auto;
          min-height: max-content;
          overflow: visible;
        }
      }
    `}</style>
  )
})

export { WorkhubStyles }
