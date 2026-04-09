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
        touch-action: none;
        position: fixed;
        width: 100%;
        height: 100%;
      }
      .workhub-shell {
        height: 100vh;
        padding: 14px 8px 8px;
        background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
        color: #14213d;
        box-sizing: border-box;
        overflow: hidden;
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
        min-height: 56px;
        flex-shrink: 0;
        border-bottom: 1px solid #e0e8f7;
        margin-bottom: 6px;
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
        border-bottom: 1px solid #e3ecfb;
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
        padding: 8px 12px;
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
      .workhub-mobile-workspace-panel-backdrop {
        position: fixed;
        left: 0;
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
      }
        right: 0;
        top: 0;
        bottom: calc(60px + env(safe-area-inset-bottom));
        z-index: 55;
        background: rgba(20, 32, 56, 0.28);
        display: flex;
        justify-content: flex-start;
        align-items: stretch;
      }
      .workhub-mobile-workspace-panel {
        width: min(92vw, 460px);
        height: 100%;
        background: #ffffff;
        border-right: 1px solid #dbe7ff;
        box-shadow: 10px 0 28px rgba(20, 40, 77, 0.22);
        padding: 14px 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: hidden;
      }
      .workhub-mobile-workspace-panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-mobile-workspace-panel-head strong {
        font-size: 0.86rem;
        color: #1b2f5b;
      }
      .workhub-mobile-workspace-picker {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-mobile-workspace-picker-row {
        display: flex;
        align-items: center;
        gap: 6px;
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
        padding: 6px 9px;
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
      .workhub-mobile-workspace-picker-actions .workhub-gear-btn {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        font-size: 0.78rem;
      }
      .workhub-mobile-workspace-panel-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-mobile-tree-panel {
        min-height: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        border-top: 1px solid #e5eefc;
        padding-top: 8px;
      }
      .workhub-mobile-tree-panel-head strong {
        font-size: 0.8rem;
        color: #1f345d;
      }
      .workhub-mobile-tree-panel-body {
        min-height: 0;
        overflow-y: auto;
        padding-right: 2px;
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
        padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      .workhub-mobile-footer-btn {
        border: 1px solid transparent;
        background: transparent;
        color: #667997;
        border-radius: 10px;
        min-height: 44px;
        padding: 4px 2px;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        cursor: pointer;
        font: inherit;
      }
      .workhub-mobile-footer-btn > span {
        font-size: 1.1rem;
        line-height: 1;
      }
      .workhub-mobile-footer-btn > small {
        font-size: 0.64rem;
        font-weight: 700;
        line-height: 1.1;
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
      .workhub-shell.is-mobile .workhub-topbar-divider {
        display: none;
      }
      .workhub-shell.is-mobile .workhub-workspace-tabs-wrap {
        display: none;
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
        bottom: calc(72px + env(safe-area-inset-bottom));
      }
      .workhub-shell.is-mobile .workhub-mobile-workspace-toggle {
        min-height: 32px;
        padding: 0 8px;
        border-radius: 8px;
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-shell.is-mobile .workhub-mobile-workspace-toggle span:last-child {
          display: none;
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
        transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
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
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        box-shadow: 0 14px 30px rgba(20, 40, 77, 0.16);
        z-index: 40;
        overflow: hidden;
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
        max-height: 330px;
        overflow-y: auto;
        background: #eaf1ff;
      }
      .workhub-notify-item {
        width: 100%;
        text-align: left;
        border: none;
        border-top: 2px solid #d7e4ff;
        background: #ffffff;
        padding: 10px 11px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        cursor: pointer;
        transition: background 0.18s ease, box-shadow 0.18s ease;
      }
      .workhub-notify-item:first-child {
        border-top: none;
      }
      .workhub-notify-item:nth-child(even) {
        background: #f7faff;
      }
      .workhub-notify-item-main {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .workhub-notify-item-icon {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 18px;
        font-size: 0.68rem;
        line-height: 1;
        background: #fff2c9;
        color: #9c6700;
        box-shadow: 0 0 0 1px rgba(239, 191, 95, 0.4);
        margin-top: 1px;
      }
      .workhub-notify-item-icon.is-hidden {
        visibility: hidden;
      }
      .workhub-notify-item:hover {
        background: #eef5ff;
      }
      .workhub-notify-item.is-unread {
        background: linear-gradient(90deg, #eef4ff 0%, #fff7e5 100%);
        box-shadow: inset 4px 0 0 #efbf5f;
      }
      .workhub-notify-message {
        font-size: 0.76rem;
        color: #213a67;
        line-height: 1.35;
      }
      .workhub-notify-item.is-unread .workhub-notify-message {
        color: #19345f;
        font-weight: 700;
      }
      .workhub-notify-item small {
        font-size: 0.68rem;
        color: #7287ad;
        padding-left: 26px;
      }
      .workhub-notify-empty {
        padding: 12px;
        font-size: 0.76rem;
        color: #5f749c;
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
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
      }
      .workhub-panel-head.compact {
        margin-bottom: 6px;
      }
      .workhub-panel-head h2 {
        margin: 0;
        color: #17284d;
        font-size: 1.14rem;
        line-height: 1.15;
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
        transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
        grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
        gap: 8px;
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
        grid-template-columns: 56px minmax(0, 1fr);
      }
      .workhub-tree-sidebar {
        height: 100%;
        max-height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: visible;
        border: 1px solid #d7dee8;
        background: #f6f8fb;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
      }
      .workhub-tree-sidebar.is-collapsed {
        padding: 8px 6px;
        overflow: hidden;
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
        border: 1px solid #e0e6ef;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(33, 47, 75, 0.04);
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
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
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
      }
      .workhub-sidebar-action-btn.is-primary {
        background: linear-gradient(180deg, #f5f8ff 0%, #e9f0ff 100%);
        border-color: #c3d4f2;
        color: #1e3f75;
      }
      .workhub-sidebar-action-btn.is-primary:hover {
        border-color: #a8bee4;
        background: linear-gradient(180deg, #eef4ff 0%, #e0ebff 100%);
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
        border: 1px solid #dde3ec;
        background: #ffffff;
        color: #253349;
        border-radius: 8px;
        padding: 7px 10px;
        text-align: left;
        font: inherit;
        font-size: 0.79rem;
        font-weight: 600;
        letter-spacing: 0.005em;
        cursor: pointer;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }
      .workhub-tree-overview:hover {
        border-color: #c3cedd;
        box-shadow: 0 2px 8px rgba(35, 50, 77, 0.08);
        background: #fafcff;
      }
      .workhub-tree-overview.is-active {
        background: #eef3fa;
        border-color: #bcc8d7;
        color: #1f3a63;
        box-shadow: 0 3px 9px rgba(37, 55, 85, 0.1);
      }
      .workhub-tree-overview-row {
        display: flex;
        align-items: center;
        gap: 6px;
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
        padding-right: 2px;
        margin-top: 8px;
      }
      .workhub-tree-group,
      .workhub-tree-group-body {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-tree-docs-list {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .workhub-tree-doc-item {
        width: 100%;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        color: #22324a;
        border-radius: 7px;
        padding: 8px 11px;
        min-height: 40px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 3px;
        text-align: left;
        font: inherit;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(33, 47, 75, 0.04);
        transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
      }
      .workhub-tree-doc-item:hover {
        background: #f8fbff;
        border-color: #c8d2df;
        box-shadow: 0 3px 8px rgba(35, 50, 77, 0.08);
      }
      .workhub-tree-doc-item.is-active {
        background: #dfe8f8;
        border-color: #8ea4c8;
        box-shadow: inset 3px 0 0 #4f74bd, 0 5px 12px rgba(34, 52, 82, 0.14);
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
      .workhub-tree-doc-sublist {
        display: flex;
        flex-direction: column;
        gap: 4px;
        border-left: 2px solid #dce8f7;
        padding-left: 8px;
        margin-top: 4px;
        margin-bottom: 4px;
      }
      .workhub-tree-doc-subitem {
        width: 100%;
        border: 1px solid #e3e9f2;
        background: #fbfdff;
        color: #2a3d5c;
        border-radius: 6px;
        padding: 5px 8px;
        text-align: left;
        font: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        min-height: 28px;
        transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
      }
      .workhub-tree-doc-subitem:hover {
        background: #f2f7ff;
        border-color: #c8d6ec;
      }
      .workhub-tree-doc-subitem.is-active {
        background: #e2ecfb;
        border-color: #9db6da;
        box-shadow: inset 2px 0 0 #4f74bd;
      }
      .workhub-tree-doc-subitem-title {
        flex: 1 1 0;
        min-width: 0;
        font-size: 0.69rem;
        line-height: 1.2;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-doc-lock-badge {
        flex: 0 0 auto;
        font-size: 0.6rem;
        line-height: 1;
        opacity: 0.75;
      }
      .workhub-tree-group-toggle {
        width: 100%;
        border: 1px solid #e0e6ef;
        background: #ffffff;
        color: #2b3a50;
        border-radius: 8px;
        padding: 8px 11px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
        font: inherit;
        text-align: left;
      }
      .workhub-tree-group-toggle:hover {
        background: #f6f9fd;
        border-color: #c3cedd;
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
        gap: 4px;
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
      .workhub-tree-node-wrap.is-nested {
        gap: 0;
      }
      .workhub-tree-node {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr) auto;
        align-items: center;
        gap: 6px;
        padding: 7px 9px;
        min-height: 36px;
        border-radius: 7px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(33, 47, 75, 0.04);
        transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        cursor: pointer;
      }
      .workhub-tree-node-wrap.is-root > .workhub-tree-node {
        padding: 8px 10px;
        min-height: 40px;
      }
      .workhub-tree-node.is-root-leaf-node {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node,
      .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node {
        background: #ffffff;
      }
      .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node {
        background: #f1f3f5;
      }
      .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node {
        background: #f4f5f7;
      }
      .workhub-tree-node:hover {
        background: #f8fbff;
        border-color: #c8d2df;
        box-shadow: 0 3px 8px rgba(35, 50, 77, 0.08);
      }
      .workhub-tree-node:hover .workhub-tree-node-title {
        color: #1f3451;
      }
      .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node.is-active {
        background: #dfe8f8;
        border-color: #8ea4c8;
        box-shadow: inset 3px 0 0 #4f74bd, 0 5px 12px rgba(34, 52, 82, 0.14);
      }
      .workhub-tree-toggle {
        width: 17px;
        height: 17px;
        border: 1px solid #e3e8ef;
        border-radius: 4px;
        background: #ffffff;
        color: #566a88;
        font: inherit;
        font-size: 0.82rem;
        cursor: pointer;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 2px rgba(33, 47, 75, 0.06);
        transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
      }
      .workhub-tree-toggle:hover {
        border-color: #c9d4e2;
        background: #f9fbff;
        box-shadow: 0 2px 6px rgba(33, 47, 75, 0.1);
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
      .workhub-tree-leaf-indicator.is-root-leaf {
        padding: 0;
        font-size: 0.82rem;
        color: #6e829f;
      }
      .workhub-tree-node-main {
        gap: 6px;
        min-width: 0;
        border: 0;
        cursor: pointer;
        text-align: left;
      }
        align-items: baseline;
        gap: 5px;
        min-width: 0;
        flex: 1 1 auto;
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
      }
      .workhub-tree-node-title-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-node-meta {
        flex: 0 0 auto;
        color: #6a7b92;
        font-size: 0.56rem;
        line-height: 1.1;
        font-weight: 500;
        white-space: nowrap;
        margin-left: auto;
      }
      .workhub-tree-node-meta.is-near-submission {
        color: #b4232f;
        font-weight: 800;
      }
      .workhub-tree-node-meta.is-overdue {
        color: #a01822;
      }
      .workhub-tree-node.is-active .workhub-tree-node-title {
        color: #15386a;
        font-weight: 700;
      }
      .workhub-tree-node.is-active .workhub-tree-node-meta {
        color: #466392;
      }
      .workhub-tree-node-actions {
        display: flex;
        gap: 5px;
        align-items: center;
        opacity: 1;
        visibility: visible;
        transform: translateX(0);
        transition: opacity 0.14s ease, transform 0.14s ease, visibility 0s linear 0s;
      }
      @media (hover: hover) and (pointer: fine) {
        .workhub-tree-node .workhub-tree-node-actions {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateX(2px);
          transition: opacity 0.14s ease, transform 0.14s ease, visibility 0s linear 0.14s;
        }
        .workhub-tree-node:hover .workhub-tree-node-actions,
        .workhub-tree-node:focus-within .workhub-tree-node-actions {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateX(0);
          transition: opacity 0.14s ease, transform 0.14s ease, visibility 0s linear 0s;
        }
      }
      .workhub-tree-node-wrap.is-nested > .workhub-tree-node {
        border-radius: 0;
        padding: 4px 7px;
        min-height: 28px;
        border: 0;
        box-shadow: none;
      }
      .workhub-tree-node-wrap.is-nested > .workhub-tree-node:hover {
        border: 0;
        box-shadow: none;
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
        transition: background-color 0.2s ease, border-color 0.2s ease;
      }
      .workhub-plus-btn:hover {
        background: #f7faff;
        border-color: #c8dbff;
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
        box-shadow: 0 10px 24px rgba(20, 40, 77, 0.14);
        z-index: 200;
        overflow: hidden;
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
        transition: transform 0.14s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
      }
      .workhub-danger-btn:hover:not(:disabled) {
        background: #ffeef0;
        border-color: #e7a7ac;
        box-shadow: 0 6px 14px rgba(165, 41, 58, 0.16);
        transform: translateY(-1px);
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
        max-height: min(780px, calc(100vh - 16px));
        overflow: hidden;
        padding: 0;
        display: flex;
        flex-direction: column;
        background: #ffffff;
      }
      .workhub-project-settings-head {
        margin-bottom: 0;
        padding: 26px 28px 10px;
        border-bottom: none;
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
      .workhub-project-settings-access-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
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
      .workhub-project-settings-member-picker {
        margin-top: 2px;
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
      .workhub-project-settings-color-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
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
      .workhub-project-settings-danger-inline {
        flex: 1;
        min-width: 0;
        margin: 0;
      }
      .workhub-project-settings-danger-inline > summary {
        list-style: none;
        cursor: pointer;
        font-size: 0.8rem;
        color: #73849f;
        text-decoration: underline;
        text-underline-offset: 2px;
        padding: 0;
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
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 28px 20px;
        border-top: 1px solid #e6eaef;
        background: #ffffff;
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
        background: transparent;
      }
      .workhub-action-menu {
        position: fixed;
        z-index: 3005;
        width: 210px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 12px;
        padding: 6px;
        box-shadow: 0 16px 38px rgba(22, 36, 68, 0.2);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-action-menu-item {
        border: 0;
        background: #f8fbff;
        color: #1f365f;
        border-radius: 8px;
        padding: 7px 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 400;
        cursor: pointer;
      }
      .workhub-action-menu-item:hover {
        background: #edf4ff;
      }
      .workhub-action-icon {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border: 1px solid #d8e4fa;
        color: #365dba;
        font-size: 0.68rem;
        line-height: 1;
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
      .workhub-bulk-status-btn {
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
        transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
        transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
      }
      .workhub-task-filter-wrap {
        position: relative;
        margin-left: auto;
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
        transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        font-size: 1.1rem;
        font-weight: 300;
      }
      .workhub-status-add:hover {
        border-color: #295fe6;
        color: #295fe6;
        background: rgba(41, 95, 230, 0.04);
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
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 10px;
        align-items: stretch;
        height: 100%;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
      }
      .workhub-content-area > * {
        min-height: 0;
      }
      .workhub-task-sections {
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
      .workhub-task-context-strip {
        display: grid;
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
      .workhub-task-context-period {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #3d5279;
        font-size: 0.69rem;
        white-space: nowrap;
      }
      .workhub-task-context-period strong {
        font-size: 0.67rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #5f749b;
      }
      .workhub-task-table-wrap {
        min-width: 0;
        width: 100%;
        padding-bottom: 4px;
      }
      .workhub-task-detail-rail {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 100%;
        min-height: 0;
        overflow-y: auto;
        border-left: 1px solid #e3ecfb;
        padding-left: 10px;
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
        transition: transform 0.16s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
      }
      .workhub-summary-tile:hover {
        transform: translateY(-1px);
        border-color: #cfdbf5;
        box-shadow: 0 8px 18px rgba(35, 62, 120, 0.08);
        background: #fcfdff;
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
        gap: 4px;
        height: 30px;
      }
      .workhub-overview-priority-segment {
        border-radius: 6px;
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
      .workhub-project-risk-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
        max-height: 210px;
        overflow: auto;
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
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .workhub-project-card.compact-card {
        padding: 7px;
      }
      .workhub-project-card.compact-card.is-clickable {
        cursor: pointer;
        transition: border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
      }
      .workhub-project-card.compact-card.is-clickable:hover {
        border-color: #b8ccef;
        background: #f8fbff;
      }
      .workhub-project-card.compact-card.is-clickable:focus-visible {
        outline: 2px solid #8aaef1;
        outline-offset: 1px;
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
      .workhub-task-title-edit-input {
        width: 100%;
        min-width: 0;
        border: 1px solid #d8e4fa;
        border-radius: 4px;
        background: #ffffff;
        color: #17305c;
        font-size: 0.74rem;
        font-weight: 400;
        line-height: 1.2;
        padding: 1px 6px;
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
      }
      .workhub-attachment-copy strong {
        font-size: 0.64rem;
        color: #1f3f73;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-attachment-copy small {
        font-size: 0.56rem;
        color: #6f7f9f;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
      }
      .workhub-detail-icon-wrap {
        position: relative;
      }
      .workhub-detail-icon-btn {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 1px solid #d4e2fb;
        background: #f4f8ff;
        color: #2d4f84;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .workhub-detail-icon-menu {
        position: absolute;
        top: 32px;
        left: 0;
        min-width: 160px;
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
      .workhub-task-details-input {
        width: 100%;
        min-height: 94px;
        resize: vertical;
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
      .workhub-task-name-input {
        min-height: 42px;
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
        padding: 10px;
      }
      .workhub-modal.workhub-image-review-modal {
        width: calc(100vw - 20px);
        max-width: 1760px;
        height: auto;
        max-height: calc(100vh - 20px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
        border: 1px solid #dbe7ff;
        color: #173056;
        padding: 14px;
      }
      .workhub-image-review-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-shrink: 0;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 12px;
        padding: 10px 12px;
        box-shadow: 0 10px 30px rgba(42, 79, 131, 0.08);
      }
      .workhub-image-review-topbar-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .workhub-image-review-topbar-label {
        font-size: 1rem;
        font-weight: 800;
        color: #173056;
      }
      .workhub-image-review-topbar-hint {
        font-size: 0.75rem;
        color: #6b7da0;
      }
      .workhub-image-review-close-btn {
        flex-shrink: 0;
        border: 1px solid #c9d8f7 !important;
        background: #ffffff !important;
        color: #24497f !important;
        border-radius: 10px;
        padding: 6px 14px;
        font-size: 0.76rem;
        font-weight: 700;
      }
      .workhub-image-review-layout {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 0;
      }
      .workhub-image-review-stage-wrap {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 0;
      }
      .workhub-image-review-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        flex-shrink: 0;
        background: #f8fbff;
        border: 1px solid #dbe7ff;
        border-radius: 12px;
        padding: 8px 10px;
      }
      .workhub-image-tool-group,
      .workhub-image-review-fit-group {
        display: inline-flex;
        gap: 6px;
      }
      .workhub-image-review-toolbar button,
      .workhub-image-inline-btn {
        border: 1px solid #cddcf8;
        background: #ffffff;
        color: #2a4f83;
        border-radius: 9px;
        padding: 5px 10px;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-image-review-toolbar button.is-active,
      .workhub-image-inline-btn.is-primary {
        border-color: #2f64d8;
        background: #2f64d8;
        color: #ffffff;
      }
      .workhub-image-review-tip {
        font-size: 0.74rem;
        color: #6b7da0;
      }
      .workhub-image-review-stage {
        position: relative;
        border-radius: 16px;
        border: 1px solid #d7e3fb;
        overflow: hidden;
        background: linear-gradient(180deg, #edf4ff 0%, #e3eefc 100%);
        cursor: crosshair;
        width: 100%;
        max-width: calc(var(--img-aspect, 1.778) * (100vh - 260px));
        aspect-ratio: var(--img-aspect, 1.778);
        max-height: calc(100vh - 260px);
        align-self: center;
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
      .workhub-image-review-lines line {
        cursor: pointer;
        stroke: #ff5f56;
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
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.74rem;
        color: #304b74;
        cursor: pointer;
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
      .workhub-task-detail-rail textarea {
        font-size: 0.74rem;
        color: #22324a;
        font-weight: 500;
      }
      .workhub-project-detail-grid {
        grid-template-columns: 1fr;
        gap: 10px;
        margin: 10px 0 12px;
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
        transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
      }
      .workhub-template-card:hover {
        border-color: #9eb8ee;
        transform: translateY(-1px);
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
      .workhub-task-group-head {
        padding: 7px 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f1f6ff;
        border-bottom: 1px solid #e0eafb;
      }
      .workhub-task-group-head span {
        color: #5870a4;
        font-size: 0.7rem;
        font-weight: 700;
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
      .workhub-task-row {
        cursor: pointer;
        transition: background-color 0.18s ease, border-color 0.18s ease;
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
      }
      .workhub-task-row.is-selected {
        background: #dfe8f8;
        border-color: #8ea4c8;
        box-shadow: inset 3px 0 0 #4f74bd;
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
      .workhub-task-sections.task-view-cards .workhub-task-row:first-child,
      .workhub-task-sections.task-view-grid .workhub-task-row:first-child {
        border-top: 1px solid #d9e3f6;
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
      .workhub-task-sections.task-view-cards .workhub-task-row-title strong,
      .workhub-task-sections.task-view-grid .workhub-task-row-title strong {
        font-size: 0.8rem;
        line-height: 1.3;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.checklist-inline,
      .workhub-task-sections.task-view-grid .workhub-task-col.checklist-inline {
        display: none;
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
      }
      .workhub-task-sections.task-view-cards .workhub-task-row-main {
        padding: 16px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row-grid {
        grid-template-columns: minmax(0, 1fr) auto auto;
        grid-template-areas:
          'details details details'
          'due assignee priority';
        row-gap: 12px;
        column-gap: 8px;
        align-items: start;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.details {
        grid-area: details;
        grid-template-columns: 14px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
      }
      .workhub-task-sections.task-view-cards .workhub-task-drag-handle {
        display: none;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.details input[type='checkbox'] {
        margin-top: 2px;
        accent-color: #4f74bd;
      }
      .workhub-task-sections.task-view-cards .workhub-task-row-title strong {
        font-size: 0.86rem;
        line-height: 1.35;
        font-weight: 400;
        color: #1d3357;
        white-space: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.assignee {
        grid-area: assignee;
        justify-self: end;
        align-self: end;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.due {
        grid-area: due;
        justify-self: start;
        align-self: end;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.priority {
        grid-area: priority;
        justify-self: end;
        align-self: end;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.assignee .workhub-task-people {
        gap: 6px;
      }
      .workhub-task-sections.task-view-cards .workhub-task-due-label,
      .workhub-task-sections.task-view-cards .workhub-task-due-picker-trigger {
        color: #4a638f;
      }
      .workhub-task-sections.task-view-cards .workhub-task-due-label {
        min-width: 82px;
        font-weight: 600;
      }
      .workhub-task-sections.task-view-cards .workhub-priority-indicator {
        border: 0;
        background: transparent;
        box-shadow: none;
      }
      .workhub-task-sections.task-view-cards .workhub-assignee-badge img,
      .workhub-task-sections.task-view-cards .workhub-assignee-fallback,
      .workhub-task-sections.task-view-cards .workhub-assignee-initials {
        box-shadow: 0 0 0 2px #eef4ff;
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
      .workhub-task-col.details .workhub-task-row-title strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-sections.task-view-cards .workhub-task-col.details .workhub-task-row-title strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
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
        position: absolute;
        top: 28px;
        left: 0;
        min-width: 140px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 9px;
        padding: 5px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        z-index: 20;
        display: flex;
        flex-direction: column;
        gap: 3px;
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
      .workhub-doc-detail-rail {
        flex: 0 0 270px;
        width: 270px;
        display: flex;
        flex-direction: column;
        gap: 0;
        overflow-y: auto;
        border-left: 1px solid #e3eafb;
        background: #f8fbff;
        padding: 10px 10px 16px;
      }
      .workhub-doc-detail-rail .workhub-detail-rail-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 6px;
        margin-bottom: 4px;
        border-bottom: 1px solid #e3eafb;
      }
      .workhub-doc-detail-rail .workhub-detail-rail-head h3 {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #617392;
        margin: 0;
      }
      .workhub-doc-detail-rail .workhub-detail-rail-head span {
        font-size: 0.65rem;
        color: #8da0bf;
      }
      .workhub-doc-detail-rail .workhub-detail-card {
        padding: 8px 0;
        border-bottom: 1px solid #e9f0fb;
      }
      .workhub-doc-detail-rail .workhub-detail-card:last-child {
        border-bottom: none;
      }
      .workhub-doc-detail-rail .workhub-detail-card h3 {
        font-size: 0.67rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #7a8fb2;
        margin: 0 0 6px;
      }
      .workhub-detail-meta {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .workhub-detail-meta span {
        font-size: 0.7rem;
        color: #3a527a;
        word-break: break-word;
      }
      .workhub-doc-edit-history {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .workhub-doc-edit-entry {
        display: flex;
        justify-content: space-between;
        gap: 4px;
        flex-wrap: wrap;
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
        margin-bottom: 6px;
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
        gap: 2px;
        margin-bottom: 6px;
      }
      .workhub-doc-detail-rail .workhub-checklist-item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 4px;
        padding: 3px 4px;
        border-radius: 5px;
      }
      .workhub-doc-detail-rail .workhub-checklist-item-text {
        font-size: 0.72rem;
      }
      .workhub-doc-detail-rail .workhub-checklist-url-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
      }
      .workhub-doc-detail-rail .workhub-checklist-url-row input {
        flex: 1 1 0;
        min-width: 0;
        font-size: 0.7rem;
        padding: 3px 6px;
        border: 1px solid #b8cef0;
        border-radius: 5px;
        background: #fff;
      }
      .workhub-doc-detail-rail .workhub-checklist-url-row button,
      .workhub-doc-detail-rail .workhub-checklist-url-row .workhub-file-upload-btn {
        font-size: 0.68rem;
        padding: 3px 7px;
      }
      @media (max-width: ${phoneMaxWidth}px) {
        .workhub-notes-layout { flex-direction: column; }
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
          padding: 8px 10px 14px;
        }
        .workhub-doc-detail-rail.is-mobile-drawer.is-open {
          transform: translateY(0);
        }
        .workhub-doc-detail-rail.is-mobile-drawer .workhub-detail-rail-head {
          position: sticky;
          top: 0;
          background: #f8fbff;
          z-index: 2;
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
      }
      .workhub-documents-head-main {
        min-width: 0;
        flex: 1;
        display: flex;
        align-items: center;
      }
      .workhub-documents-title-input {
        width: min(520px, 100%);
        border: 1px solid #d7e2f1;
        border-radius: 7px;
        padding: 6px 9px;
        font: inherit;
        font-size: var(--workhub-doc-title-size);
        line-height: 1.2;
        font-weight: 500;
        color: #2a3d5c;
        background: #ffffff;
      }
      .workhub-documents-title-input:disabled {
        background: #f5f8fd;
        color: #617392;
        cursor: not-allowed;
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
      .workhub-document-body-editor {
        margin-top: 8px;
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
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
      .workhub-documents-editor-actions {
        display: flex;
        justify-content: flex-end;
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
        width: min(560px, 92vw);
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
        gap: 1px;
      }
      .workhub-share-doc-member-copy strong {
        font-size: 0.72rem;
        color: #1b3157;
        line-height: 1.2;
        font-weight: 600;
      }
      .workhub-share-doc-member-copy small {
        font-size: 0.66rem;
        color: #6a7f9f;
        line-height: 1.2;
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
        background: rgba(12, 20, 36, 0.64);
        overflow-y: auto;
        padding: 24px 12px 12px;
      }
      .workhub-modal {
        width: min(520px, calc(100vw - 24px));
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(18, 33, 63, 0.16);
        padding: 24px;
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
        width: calc(100vw - 20px);
        max-width: 1760px;
        max-height: calc(100vh - 20px);
        padding: 14px;
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
      .dashboard-strip {
        margin-top: 4px;
      }
      @keyframes workhubSpin {
        to { transform: rotate(360deg); }
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
        .workhub-content-area {
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
        .workhub-shell.task-detail-open .workhub-app {
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
        .workhub-field-grid.two,
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
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 8px;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
        }
        .workhub-summary-strip .workhub-summary-tile {
          flex: 0 0 170px;
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
          height: 100%;
          border-right: none;
          border-radius: 0;
          box-shadow: none;
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
          gap: 6px;
          padding: 6px 8px;
          border-radius: 10px;
          margin-bottom: 8px;
        }
        .workhub-task-context-path {
          gap: 4px;
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
        .workhub-documents-layout {
          grid-template-columns: 1fr;
        }
        .workhub-modal,
        .workhub-modal.large {
          width: min(100%, calc(100vw - 20px));
        }
        .workhub-modal.workhub-global-finder-modal {
          width: min(100%, calc(100vw - 20px));
        }
        .workhub-modal.workhub-workspace-settings-modal {
          width: min(100%, calc(100vw - 20px));
        }
        .workhub-modal.workhub-project-settings-modal {
          width: min(100%, calc(100vw - 20px));
          max-height: calc(100vh - 12px);
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
          grid-template-columns: 1fr;
        }
        .workhub-col-span-3,
        .workhub-col-span-4,
        .workhub-col-span-5,
        .workhub-col-span-6 {
          grid-column: span 1;
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
        .workhub-task-context-strip {
          display: block;
          padding: 6px;
        }
        .workhub-task-context-path {
          width: 100%;
          margin-bottom: 4px;
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
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
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
      }
    `}</style>
  )
})

export { WorkhubStyles }
