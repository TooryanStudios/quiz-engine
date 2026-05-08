import { useEffect, useMemo, useRef, useState } from 'react'
import type { UseWorkhubDocEditorHandlersOutput } from '../hooks/useWorkhubDocEditorHandlers'
import type {
  WorkhubDocument,
  WorkhubDocumentMasterPage,
  WorkhubDocumentMasterPageVariant,
  WorkhubDocumentPrintBlock,
  WorkhubDocumentTab,
  WorkhubMember,
  WorkhubProject,
  WorkhubTaskComment,
} from '../../../lib/workhubRepo'
import { TinyRichTextEditor } from '../../../components/editor/TinyRichTextEditor'
import { EmojiPickerPopover, EMOJI_SET_DOCUMENTS } from '../../../components/EmojiPickerPopover'
import { WorkhubAttachmentCard } from './WorkhubAttachmentCard'
import { WorkhubChecklistCard } from './WorkhubChecklistCard'
import { WorkhubDiscussionCard } from './WorkhubDiscussionCard'
import { WorkhubDocumentAiPanel } from './WorkhubDocumentAiPanel'
import { WorkspaceBrowserDialog } from './WorkspaceBrowserDialog'
import { toDocumentBodyEditorHtml } from '../docEditorBody'
import type { Editor as TinyMCEEditor } from 'tinymce'

type MasterPageVariantKey = 'firstPage' | 'laterPages'
type MasterPageSectionKey = 'header' | 'footer'
type DetailRailTab = 'details' | 'ai'
type DocumentViewMode = 'default' | 'page' | 'preview'

interface NormalizedPrintBlock {
  mode: 'html' | 'structured'
  html: string
  logoUrl: string
  title: string
  subtitle: string
  address: string
  signatureLabel: string
  showDocumentTitle: boolean
}

interface NormalizedMasterPageVariant {
  showHeader: boolean
  showFooter: boolean
  showPageNumbers: boolean
  header: NormalizedPrintBlock
  footer: NormalizedPrintBlock
}

interface NormalizedMasterPage {
  pageSize: NonNullable<WorkhubDocumentMasterPage['pageSize']>
  orientation: NonNullable<WorkhubDocumentMasterPage['orientation']>
  marginTopMm: number
  marginRightMm: number
  marginBottomMm: number
  marginLeftMm: number
  firstPage: NormalizedMasterPageVariant
  laterPages: NormalizedMasterPageVariant
  showCoverPage: boolean
  coverDateMode: NonNullable<WorkhubDocumentMasterPage['coverDateMode']>
  coverShowDocumentName: boolean
  coverShowTabName: boolean
  coverTheme: CoverThemeId
  coverTagLine: string
  showWatermark: boolean
  watermarkLogoUrl: string
  watermarkScale: number
  watermarkOpacity: number
  watermarkLayout: NonNullable<WorkhubDocumentMasterPage['watermarkLayout']>
  watermarkCornerOpacity: number
  watermarkCornerScale: number
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult: ((event: {
    resultIndex?: number
    results: ArrayLike<{
      isFinal?: boolean
      0?: { transcript?: string }
    }>
  }) => void) | null
  start(): void
  stop(): void
  abort(): void
}

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null

  const win = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor
  }

  return win.SpeechRecognition || win.webkitSpeechRecognition || null
}

const HEADER_VOICE_SILENCE_TIMEOUT_MS = 2 * 60 * 1000

function toPlainTextForLang(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countLangMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0
}

function detectDominantLanguage(value: string) {
  const normalized = toPlainTextForLang(value)
  const arabicCount = countLangMatches(normalized, /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g)
  const latinCount = countLangMatches(normalized, /[A-Za-z]/g)

  if (arabicCount === 0 && latinCount === 0) return null
  if (arabicCount === 0) return 'en' as const
  if (latinCount === 0) return 'ar' as const

  return arabicCount >= latinCount ? ('ar' as const) : ('en' as const)
}

function resolveHeaderSpeechLanguage(params: {
  documentTitle: string
  documentBody: string
  activeTabTitle?: string
}) {
  const contextSource = [params.documentTitle, params.activeTabTitle || '', params.documentBody].filter(Boolean).join('\n\n')
  const contextLanguage = detectDominantLanguage(contextSource)
  if (contextLanguage === 'ar') return 'ar-OM'
  if (contextLanguage === 'en') return 'en-US'

  if (typeof navigator !== 'undefined' && /^ar\b/i.test(navigator.language || '')) {
    return 'ar-OM'
  }

  return 'en-US'
}

function escapeHtmlForEditor(text: string) {
  return '<p>' + escapeHtml(text).replace(/\n/g, '</p><p>') + '</p>'
}

const PAGE_SIZE_MM: Record<NormalizedMasterPage['pageSize'], { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
  A3: { width: 297, height: 420 },
}



function sanitizePrintHtmlFragment(value: string) {
  return value
    .replace(/<\/?(html|head|body)[^>]*>/gi, '')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<link[^>]*>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .trim()
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeHtmlAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

// -- Cover page themes ---------------------------------------------------------
const COVER_THEMES = [
  {
    id: 'warm',
    label: 'Warm � Brand Orange',
    swatch: '#ffe0c8',
    bg: 'linear-gradient(160deg, #fff8f4 0%, #fff0e6 50%, #ffe5d0 100%)',
    circle1: 'rgba(210,70,10,0.08)',
    circle2: 'rgba(210,70,10,0.05)',
    tagColor: '#b83e0c',
    titleColor: '#2c1000',
    tabColor: '#8c3010',
    dateColor: '#b06040',
    dateBorder: '#f0c0a0',
    footerBorder: '#f0bfa0',
    footerCompany: '#2c1000',
    footerSubtitle: '#b83e0c',
    footerAddress: '#8a6050',
  },
  {
    id: 'navy',
    label: 'Classic Blue',
    swatch: '#dce8ff',
    bg: 'linear-gradient(160deg, #f0f5ff 0%, #e6eeff 50%, #dce8ff 100%)',
    circle1: 'rgba(65,105,195,0.07)',
    circle2: 'rgba(65,105,195,0.05)',
    tagColor: '#5876af',
    titleColor: '#1a3260',
    tabColor: '#3a5a9a',
    dateColor: '#6680a8',
    dateBorder: '#c8d8f0',
    footerBorder: '#c4d6f0',
    footerCompany: '#1a3260',
    footerSubtitle: '#5876af',
    footerAddress: '#7a90b0',
  },
  {
    id: 'charcoal',
    label: 'Charcoal � Dark',
    swatch: '#252b3d',
    bg: 'linear-gradient(160deg, #1e2330 0%, #252b3d 50%, #1a2030 100%)',
    circle1: 'rgba(255,255,255,0.05)',
    circle2: 'rgba(255,255,255,0.03)',
    tagColor: '#a0b4d8',
    titleColor: '#e8eeff',
    tabColor: '#b8ccee',
    dateColor: '#7080a8',
    dateBorder: '#3a4560',
    footerBorder: '#3a4560',
    footerCompany: '#e8eeff',
    footerSubtitle: '#a0b4d8',
    footerAddress: '#6878a0',
  },
  {
    id: 'sage',
    label: 'Sage Green',
    swatch: '#d4eadd',
    bg: 'linear-gradient(160deg, #f0f8f4 0%, #e4f2eb 50%, #d4eadd 100%)',
    circle1: 'rgba(30,110,70,0.07)',
    circle2: 'rgba(30,110,70,0.05)',
    tagColor: '#2d7a50',
    titleColor: '#0e2e1a',
    tabColor: '#286040',
    dateColor: '#4a8060',
    dateBorder: '#a8d4bc',
    footerBorder: '#a8d4bc',
    footerCompany: '#0e2e1a',
    footerSubtitle: '#2d7a50',
    footerAddress: '#507060',
  },
  {
    id: 'rose',
    label: 'Rose Burgundy',
    swatch: '#fddde3',
    bg: 'linear-gradient(160deg, #fff4f6 0%, #feeaed 50%, #fddde3 100%)',
    circle1: 'rgba(180,30,60,0.07)',
    circle2: 'rgba(180,30,60,0.04)',
    tagColor: '#a82040',
    titleColor: '#2e0a14',
    tabColor: '#8a1830',
    dateColor: '#a04060',
    dateBorder: '#f0b0c0',
    footerBorder: '#f0b0c0',
    footerCompany: '#2e0a14',
    footerSubtitle: '#a82040',
    footerAddress: '#8a5060',
  },
  {
    id: 'white',
    label: 'Clean White (with watermark)',
    swatch: '#ffffff',
    bg: '#ffffff',
    circle1: 'transparent',
    circle2: 'transparent',
    tagColor: '#7a6050',
    titleColor: '#1a1a1a',
    tabColor: '#4a4a4a',
    dateColor: '#888888',
    dateBorder: '#dddddd',
    footerBorder: '#dddddd',
    footerCompany: '#1a1a1a',
    footerSubtitle: '#666666',
    footerAddress: '#999999',
    allowWatermark: true,
  },
] as const
type CoverThemeId = typeof COVER_THEMES[number]['id']

function clampMarginValue(value: number | undefined, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(40, Math.max(8, Math.round(value)))
}

function normalizePrintBlock(value: WorkhubDocumentPrintBlock | undefined, legacyHtml = ''): NormalizedPrintBlock {
  return {
    mode: value?.mode || ((value?.html || legacyHtml).trim() ? 'html' : 'structured'),
    html: (value?.html || legacyHtml || '').trim(),
    logoUrl: (value?.logoUrl || '').trim(),
    title: value?.title ?? '',
    subtitle: value?.subtitle ?? '',
    address: value?.address ?? '',
    signatureLabel: value?.signatureLabel ?? '',
    showDocumentTitle: Boolean(value?.showDocumentTitle),
  }
}

function normalizeMasterPageVariant(
  value: WorkhubDocumentMasterPageVariant | undefined,
  legacy: Pick<WorkhubDocumentMasterPage, 'showHeader' | 'showFooter' | 'showPageNumbers' | 'headerHtml' | 'footerHtml'>,
): NormalizedMasterPageVariant {
  return {
    showHeader: typeof value?.showHeader === 'boolean' ? value.showHeader : Boolean(legacy.showHeader),
    showFooter: typeof value?.showFooter === 'boolean' ? value.showFooter : Boolean(legacy.showFooter),
    showPageNumbers: typeof value?.showPageNumbers === 'boolean' ? value.showPageNumbers : Boolean(legacy.showPageNumbers),
    header: normalizePrintBlock(value?.header, legacy.headerHtml || ''),
    footer: normalizePrintBlock(value?.footer, legacy.footerHtml || ''),
  }
}

function normalizeMasterPageDraft(value: WorkhubDocumentMasterPage | undefined): NormalizedMasterPage {
  const legacy = {
    showHeader: value?.showHeader,
    showFooter: value?.showFooter,
    showPageNumbers: value?.showPageNumbers,
    headerHtml: value?.headerHtml,
    footerHtml: value?.footerHtml,
  }
  return {
    pageSize: value?.pageSize || 'A4',
    orientation: value?.orientation || 'portrait',
    marginTopMm: clampMarginValue(value?.marginTopMm, 8),
    marginRightMm: clampMarginValue(value?.marginRightMm, 16),
    marginBottomMm: clampMarginValue(value?.marginBottomMm, 8),
    marginLeftMm: clampMarginValue(value?.marginLeftMm, 16),
    firstPage: normalizeMasterPageVariant(value?.firstPage, legacy),
    laterPages: normalizeMasterPageVariant(value?.laterPages, legacy),
    showCoverPage: Boolean(value?.showCoverPage),
    coverDateMode: value?.coverDateMode || 'none',
    coverShowDocumentName: value?.coverShowDocumentName !== false,
    coverShowTabName: value?.coverShowTabName !== false,
    coverTheme: (COVER_THEMES.find(t => t.id === value?.coverTheme) ? value!.coverTheme as CoverThemeId : COVER_THEMES[0].id),
    coverTagLine: value?.coverTagLine ?? '',
    showWatermark: Boolean(value?.showWatermark),
    watermarkLogoUrl: (value?.watermarkLogoUrl || '').trim(),
    watermarkScale: typeof value?.watermarkScale === 'number' ? Math.min(100, Math.max(10, value.watermarkScale)) : 50,
    watermarkOpacity: typeof value?.watermarkOpacity === 'number' ? Math.min(30, Math.max(1, value.watermarkOpacity)) : 8,
    watermarkLayout: value?.watermarkLayout || 'center',
    watermarkCornerOpacity: typeof value?.watermarkCornerOpacity === 'number' ? Math.min(20, Math.max(1, value.watermarkCornerOpacity)) : 5,
    watermarkCornerScale: typeof value?.watermarkCornerScale === 'number' ? Math.min(80, Math.max(10, value.watermarkCornerScale)) : 30,
  }
}

function getPageDimensions(masterPage: NormalizedMasterPage) {
  const base = PAGE_SIZE_MM[masterPage.pageSize]
  if (masterPage.orientation === 'landscape') {
    return { width: base.height, height: base.width }
  }
  return base
}

function buildStructuredPrintBlockHtml(block: NormalizedPrintBlock, documentTitle: string) {
  const copyParts: string[] = []
  const title = block.title.trim()
  const subtitle = block.subtitle.trim()
  const address = block.address.trim()
  const signatureLabelTrimmed = block.signatureLabel.trim()
  if (title) copyParts.push(`<div class="doc-print-structured-title">${escapeHtml(title)}</div>`)
  if (block.showDocumentTitle) copyParts.push(`<div class="doc-print-structured-doc-title">${escapeHtml(documentTitle)}</div>`)
  if (subtitle) copyParts.push(`<div class="doc-print-structured-subtitle">${escapeHtml(subtitle)}</div>`)
  if (address) copyParts.push(`<div class="doc-print-structured-address">${escapeHtml(address).replace(/\n/g, '<br />')}</div>`)
  const copyHtml = copyParts.join('')
  const signatureHtml = signatureLabelTrimmed
    ? `<div class="doc-print-structured-signature"><span>${escapeHtml(signatureLabelTrimmed)}</span></div>`
    : ''
  const logoHtml = block.logoUrl
    ? `<div class="doc-print-structured-logo"><img src="${escapeHtmlAttribute(block.logoUrl)}" alt="" /></div>`
    : ''
  if (!copyHtml && !signatureHtml && !logoHtml) return ''
  return `<div class="doc-print-structured-block${signatureHtml ? ' has-signature' : ''}">${logoHtml}<div class="doc-print-structured-copy">${copyHtml}</div>${signatureHtml}</div>`
}

function renderPrintBlockHtml(block: NormalizedPrintBlock, documentTitle: string) {
  if (block.mode === 'html') {
    return sanitizePrintHtmlFragment(block.html)
  }
  return buildStructuredPrintBlockHtml(block, documentTitle)
}

function buildExportPrintBlock(primary: NormalizedPrintBlock, fallback: NormalizedPrintBlock): NormalizedPrintBlock {
  const primaryHtml = sanitizePrintHtmlFragment(primary.html)
  const fallbackHtml = sanitizePrintHtmlFragment(fallback.html)
  const mode: NormalizedPrintBlock['mode'] = primary.mode === 'html'
    ? (primaryHtml ? 'html' : (fallback.mode === 'html' && fallbackHtml ? 'html' : 'structured'))
    : primary.mode

  return {
    mode,
    html: primaryHtml || fallbackHtml,
    logoUrl: primary.logoUrl || fallback.logoUrl,
    title: primary.title || fallback.title,
    subtitle: primary.subtitle || fallback.subtitle,
    address: primary.address || fallback.address,
    signatureLabel: primary.signatureLabel || fallback.signatureLabel,
    showDocumentTitle: primary.showDocumentTitle,
  }
}

function htmlToSingleLineText(html: string) {
  return sanitizePrintHtmlFragment(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|td|th)>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveFooterSingleLineText(block: NormalizedPrintBlock, documentTitle: string) {
  if (block.mode === 'html') {
    return htmlToSingleLineText(block.html)
  }

  const firstAddressLine = block.address
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean) || ''
  const parts = [
    block.title.trim(),
    block.subtitle.trim(),
    block.showDocumentTitle ? documentTitle : '',
    firstAddressLine,
    block.signatureLabel.trim(),
  ].filter(Boolean)

  return parts.join(' | ')
}

export function buildPreviewPlaceholderHtml(label: string) {
  return `
    <div class="doc-preview-placeholder">
      <div class="doc-preview-placeholder-chip">${escapeHtml(label)}</div>
      <div class="doc-preview-placeholder-line is-wide"></div>
      <div class="doc-preview-placeholder-line"></div>
      <div class="doc-preview-placeholder-line"></div>
      <div class="doc-preview-placeholder-line is-wide"></div>
      <div class="doc-preview-placeholder-line is-short"></div>
    </div>
  `
}

function buildPreviewPageHtml(params: {
  label: string
  pageNumber: number
  variant: NormalizedMasterPageVariant
  documentTitle: string
  bodyHtml: string
  pageWidthMm: number
  pageHeightMm: number
  margins: Pick<NormalizedMasterPage, 'marginTopMm' | 'marginRightMm' | 'marginBottomMm' | 'marginLeftMm'>
  hideLabel?: boolean
}) {
  const headerHtml = renderPrintBlockHtml(params.variant.header, params.documentTitle)
  const footerHtml = renderPrintBlockHtml(params.variant.footer, params.documentTitle)
  const showHeader = params.variant.showHeader && !!headerHtml
  const showFooter = params.variant.showFooter && (!!footerHtml || params.variant.showPageNumbers)
  const headerOffsetMm = showHeader ? 30 : 0
  const footerOffsetMm = showFooter ? 20 : 0
  return `
    <section class="doc-preview-page-shell" style="--preview-page-width:${params.pageWidthMm}mm;--preview-page-height:${params.pageHeightMm}mm;--preview-w:${params.pageWidthMm};--preview-h:${params.pageHeightMm};">
      ${params.hideLabel ? '' : `<div class="doc-preview-page-label">${escapeHtml(params.label)}</div>`}
      <div class="doc-preview-page">
        ${showHeader ? `<div class="doc-preview-page-header"><div class="doc-preview-page-header-inner">${headerHtml}</div></div>` : ''}
        ${showFooter ? `<div class="doc-preview-page-footer"><div class="doc-preview-page-footer-inner"><div>${footerHtml}</div>${params.variant.showPageNumbers ? `<div class="doc-preview-page-number">Page ${params.pageNumber}</div>` : ''}</div></div>` : ''}
        <div class="doc-preview-page-body" style="padding:${params.margins.marginTopMm + headerOffsetMm}mm ${params.margins.marginRightMm}mm ${params.margins.marginBottomMm + footerOffsetMm}mm ${params.margins.marginLeftMm}mm;">
          <div class="doc-preview-page-title">${escapeHtml(params.documentTitle)}</div>
          ${params.bodyHtml}
        </div>
      </div>
    </section>
  `
}

function buildPrintableDocumentHtml(params: {
  documentTitle: string
  bodyContent: string
  masterPage: NormalizedMasterPage
  previewMode?: boolean
  hideVariantLabels?: boolean
}) {
  const { documentTitle, bodyContent, masterPage, previewMode = false, hideVariantLabels = false } = params
  const { width, height } = getPageDimensions(masterPage)
  const firstHeaderHtml = renderPrintBlockHtml(masterPage.firstPage.header, documentTitle)
  const firstFooterHtml = renderPrintBlockHtml(masterPage.firstPage.footer, documentTitle)
  const laterHeaderHtml = renderPrintBlockHtml(masterPage.laterPages.header, documentTitle)
  const laterFooterHtml = renderPrintBlockHtml(masterPage.laterPages.footer, documentTitle)
  const repeatedVariant = (masterPage.laterPages.showHeader || masterPage.laterPages.showFooter || laterHeaderHtml || laterFooterHtml)
    ? masterPage.laterPages
    : masterPage.firstPage
  const repeatedHeaderHtml = repeatedVariant === masterPage.laterPages ? laterHeaderHtml : firstHeaderHtml
  const repeatedFooterHtml = repeatedVariant === masterPage.laterPages ? laterFooterHtml : firstFooterHtml
  const showRepeatedHeader = repeatedVariant.showHeader && !!repeatedHeaderHtml
  const showRepeatedFooter = repeatedVariant.showFooter && (!!repeatedFooterHtml || repeatedVariant.showPageNumbers)
  const repeatedHeaderOffsetMm = showRepeatedHeader ? 30 : 0
  const repeatedFooterOffsetMm = showRepeatedFooter ? 20 : 0
  const showFirstIntroHeader = masterPage.firstPage.showHeader && !!firstHeaderHtml && firstHeaderHtml !== repeatedHeaderHtml
  const showFirstIntroFooter = masterPage.firstPage.showFooter && !!firstFooterHtml && firstFooterHtml !== repeatedFooterHtml
  const previewFirstBody = bodyContent || '<p>No document body content yet.</p>'
  const previewLaterBody = bodyContent || '<p>No document body content yet.</p>'
  const previewPages = previewMode
    ? `
      <main class="doc-preview-stage">
        ${buildPreviewPageHtml({
          label: 'First page preview',
          pageNumber: 1,
          variant: masterPage.firstPage,
          documentTitle,
          bodyHtml: previewFirstBody,
          pageWidthMm: width,
          pageHeightMm: height,
          margins: masterPage,
          hideLabel: hideVariantLabels,
        })}
        ${buildPreviewPageHtml({
          label: 'Later pages preview',
          pageNumber: 2,
          variant: masterPage.laterPages,
          documentTitle,
          bodyHtml: previewLaterBody,
          pageWidthMm: width,
          pageHeightMm: height,
          margins: masterPage,
          hideLabel: hideVariantLabels,
        })}
      </main>
    `
    : ''

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(documentTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    :root { color-scheme: light; }
    @page {
      size: ${masterPage.pageSize} ${masterPage.orientation};
      margin: ${masterPage.marginTopMm}mm ${masterPage.marginRightMm}mm ${masterPage.marginBottomMm}mm ${masterPage.marginLeftMm}mm;
    }
    body {
      margin: 0;
      font-family: 'Tajawal', 'Vazirmatn', 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #1f355f;
      direction: rtl;
      text-align: right;
      background: ${previewMode ? `
        #edf3fb
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23b0c4de' stroke-width='1'/%3E%3C/svg%3E")
        fixed
        repeat
      ` : '#fff'};
    }
    .doc-print-structured-block {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .doc-print-structured-copy {
      min-width: 0;
      flex: 1;
    }
    .doc-print-structured-logo {
      flex: 0 0 auto;
      max-width: 110px;
    }
    .doc-print-structured-logo img {
      display: block;
      max-width: 100%;
      max-height: 42px;
      object-fit: contain;
    }
    .doc-print-structured-title,
    .doc-print-structured-doc-title {
      font-size: 14px;
      font-weight: 700;
      color: #243d66;
      line-height: 1.35;
    }
    .doc-print-structured-subtitle {
      margin-top: 2px;
      font-size: 11px;
      font-weight: 600;
      color: #4e6285;
    }
    .doc-print-structured-address {
      margin-top: 4px;
      font-size: 10.5px;
      color: #617490;
      line-height: 1.45;
    }
    .doc-print-structured-signature {
      min-width: 120px;
      margin-inline-start: auto;
      padding-top: 12px;
      border-top: 1px solid #92a8cb;
      font-size: 10.5px;
      font-weight: 600;
      color: #516b94;
      text-align: center;
      align-self: flex-end;
    }
    .doc-export-shell {
      position: relative;
      min-height: 100%;
      display: ${previewMode ? 'none' : 'block'};
    }
    .doc-export-header,
    .doc-export-footer {
      position: fixed;
      right: 0;
      left: 0;
      color: #4e6285;
      font-size: 11px;
      line-height: 1.45;
      z-index: 1;
    }
    .doc-export-header {
      top: 0;
      min-height: 18mm;
      padding-bottom: 3mm;
      border-bottom: 1px solid #dbe5f3;
    }
    .doc-export-footer {
      bottom: 0;
      min-height: 14mm;
      padding-top: 3mm;
      border-top: 1px solid #dbe5f3;
    }
    .doc-export-header-inner,
    .doc-export-footer-inner,
    .doc-export-body,
    .doc-export-first-page-variant {
      padding-right: ${masterPage.marginRightMm}mm;
      padding-left: ${masterPage.marginLeftMm}mm;
    }
    .doc-export-body {
      padding-top: ${masterPage.marginTopMm + repeatedHeaderOffsetMm}mm;
      padding-bottom: ${masterPage.marginBottomMm + repeatedFooterOffsetMm}mm;
    }
    .doc-export-footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .doc-export-page-number {
      white-space: nowrap;
      font-weight: 600;
      color: #34507f;
    }
    .doc-export-page-number::after { content: counter(page); }
    .doc-export-title,
    .doc-preview-page-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #d0d0d0;
      color: #1f355f;
    }
    .doc-export-first-page-variant {
      margin-bottom: 14px;
      padding-top: 4mm;
      padding-bottom: 4mm;
      border: 1px dashed #c9d8ee;
      border-radius: 12px;
      background: #f9fbff;
    }
    .doc-export-first-page-variant + .doc-export-first-page-variant {
      margin-top: 8px;
    }
    h1 { font-size: 22px; font-weight: 700; margin: 1em 0 0.5em; }
    h2 { font-size: 18px; font-weight: 700; margin: 1em 0 0.5em; }
    h3 { font-size: 16px; font-weight: 600; margin: 0.8em 0 0.4em; }
    h4, h5, h6 { font-size: 14px; font-weight: 600; margin: 0.8em 0 0.4em; }
    p { margin: 0 0 0.7em; }
    img { max-width: 100%; height: auto; display: block; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; }
    th { background: #f5f7fa; font-weight: 600; }
    a { color: #1a56db; }
    ul, ol { padding-right: 1.5em; padding-left: 0; margin: 0 0 0.8em; }
    pre, code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: 'Courier New', monospace; }
    blockquote { border-right: 3px solid #d0d0d0; margin: 0.8em 0; padding: 4px 12px; color: #5a6a80; }
    .doc-preview-stage {
      display: ${previewMode ? 'flex' : 'none'};
      flex-direction: column;
      gap: 22px;
      padding: 28px 20px 20px;
    }
    .doc-preview-page-shell {
      width: min(calc(100vw - 40px), 900px);
      margin: 0 auto;
    }
    .doc-preview-page-label {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #617392;
    }
    .doc-preview-page {
      position: relative;
      aspect-ratio: var(--preview-w) / var(--preview-h);
      background: #fff;
      border: 1px solid #d5e2f5;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(30, 58, 110, 0.12);
      overflow: hidden;
    }
    .doc-preview-page-header,
    .doc-preview-page-footer {
      position: absolute;
      right: 0;
      left: 0;
      color: #4e6285;
      font-size: 11px;
      line-height: 1.45;
    }
    .doc-preview-page-header {
      top: 0;
      min-height: 18mm;
      padding: 4mm ${masterPage.marginRightMm}mm 3mm ${masterPage.marginLeftMm}mm;
      border-bottom: 1px solid #dbe5f3;
    }
    .doc-preview-page-footer {
      bottom: 0;
      min-height: 14mm;
      padding: 3mm ${masterPage.marginRightMm}mm 0 ${masterPage.marginLeftMm}mm;
      border-top: 1px solid #dbe5f3;
    }
    .doc-preview-page-footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .doc-preview-page-number {
      font-size: 11px;
      font-weight: 700;
      color: #34507f;
      white-space: nowrap;
    }
    .doc-preview-page-body {
      min-height: 100%;
    }
    .doc-preview-placeholder {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 12px;
    }
    .doc-preview-placeholder-chip {
      align-self: flex-start;
      padding: 4px 10px;
      border-radius: 999px;
      background: #eef3fb;
      color: #536b90;
      font-size: 11px;
      font-weight: 600;
    }
    .doc-preview-placeholder-line {
      height: 12px;
      border-radius: 999px;
      background: linear-gradient(90deg, #eff4fc 0%, #dce7f5 100%);
      width: 82%;
    }
    .doc-preview-placeholder-line.is-wide { width: 96%; }
    .doc-preview-placeholder-line.is-short { width: 58%; }
    /* Thin scrollbars inside preview iframe */
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #b8c8e0; border-radius: 999px; }
    ::-webkit-scrollbar-thumb:hover { background: #8aaac8; }
    * { scrollbar-width: thin; scrollbar-color: #b8c8e0 transparent; }
    @media print {
      body { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="doc-export-shell">
    ${showRepeatedHeader ? `<div class="doc-export-header"><div class="doc-export-header-inner">${repeatedHeaderHtml}</div></div>` : ''}
    ${showRepeatedFooter ? `<div class="doc-export-footer"><div class="doc-export-footer-inner"><div>${repeatedFooterHtml}</div>${repeatedVariant.showPageNumbers ? '<div class="doc-export-page-number">Page </div>' : ''}</div></div>` : ''}
    <div class="doc-export-body">
      ${showFirstIntroHeader ? `<div class="doc-export-first-page-variant">${firstHeaderHtml}</div>` : ''}
      ${showFirstIntroFooter ? `<div class="doc-export-first-page-variant">${firstFooterHtml}</div>` : ''}
      <div class="doc-export-title">${escapeHtml(documentTitle)}</div>
      ${bodyContent}
    </div>
  </div>
  ${previewPages}
</body>
</html>`
}

function buildPrintExportHtml(params: {
  documentTitle: string
  activeTabTitle?: string
  bodyContent: string
  masterPage: NormalizedMasterPage
  createdAtMs?: number
}) {
  const { documentTitle, activeTabTitle, bodyContent, masterPage, createdAtMs } = params
  const exportHeaderBlock = buildExportPrintBlock(masterPage.laterPages.header, masterPage.firstPage.header)
  const exportFooterBlock = buildExportPrintBlock(masterPage.laterPages.footer, masterPage.firstPage.footer)
  const laterHeaderHtml = renderPrintBlockHtml(exportHeaderBlock, documentTitle)
  const footerLineText = resolveFooterSingleLineText(exportFooterBlock, documentTitle)

  const hasHeader = masterPage.laterPages.showHeader && !!laterHeaderHtml
  const hasPageNumbers = masterPage.laterPages.showPageNumbers || masterPage.firstPage.showPageNumbers
  const hasFooterText = masterPage.laterPages.showFooter && !!footerLineText
  const hasFooter = hasFooterText
  const pageSize = getPageDimensions(masterPage)
  const pageHeightMm = pageSize.height
  const pageWidthMm = pageSize.width
  const headerInnerBottomMm = 2
  const bodyToFooterGapMm = 5
  const footerTopPaddingMm = 4
  const footerBottomPaddingMm = hasFooter ? 4 : 0
  const pageNumMarginMm = hasPageNumbers ? 10 : 0
  const effectivePageHeightMm = pageHeightMm - pageNumMarginMm
  const footerHorizontalPaddingMm = Math.max(10, masterPage.marginRightMm)
  const logoMaxWidthPx = 170
  const logoMaxHeightPx = 66

  // --- Cover page ---
  const coverLogoUrl = masterPage.firstPage.header.logoUrl || masterPage.laterPages.header.logoUrl
  const coverCompanyTitle = masterPage.firstPage.header.title || masterPage.laterPages.header.title
  const coverCompanySubtitle = masterPage.firstPage.header.subtitle || masterPage.laterPages.header.subtitle
  const coverCompanyAddress = masterPage.firstPage.header.address || masterPage.laterPages.header.address
  const coverTheme = COVER_THEMES.find(t => t.id === masterPage.coverTheme) ?? COVER_THEMES[0]
  // For 'creation' mode we embed the pre-formatted date in the HTML; for 'print' mode JS fills it in.
  const coverCreationDateStr = masterPage.coverDateMode === 'creation' && createdAtMs
    ? new Date(createdAtMs).toLocaleDateString('ar-OM', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''
  const hasCoverDate = masterPage.coverDateMode !== 'none'

  // --- Watermark ---
  const watermarkUrl = masterPage.watermarkLogoUrl

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(documentTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Vazirmatn:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Tajawal', 'Vazirmatn', 'Segoe UI', system-ui, sans-serif;
      font-size: 14px;
      line-height: 1.7;
      color: #1f355f;
      direction: rtl;
      text-align: right;
      background: #fff;
    }
    body {
      width: ${pageWidthMm}mm;
      margin: 0 auto;
    }
    @page {
      size: ${masterPage.pageSize} ${masterPage.orientation};
      margin: 0 0 ${pageNumMarginMm}mm 0;${hasPageNumbers ? `
      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-size: 10px;
        font-weight: 600;
      }` : ''}
    }${masterPage.showCoverPage && hasPageNumbers ? `
    @page :first {
      @bottom-right { content: none; }
    }` : ''}
    /*
     * thead repeats natively at the top of every printed page in Chrome/Edge.
     * tfoot repeats at the bottom of each page after content � reliable across browsers.
     * Neither uses position:fixed (which collapses to 1 page in Chrome print).
     */
    .doc-layout-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .doc-layout-table > thead { display: table-header-group; }
    .doc-layout-table > tfoot { display: table-footer-group; }
    .doc-layout-table > tbody { display: table-row-group; }
    .doc-layout-cell { padding: 0; border: none !important; vertical-align: top; }
    .doc-header-cell {
      padding-top: ${masterPage.marginTopMm}mm;
      padding-right: ${masterPage.marginRightMm}mm;
      padding-left: ${masterPage.marginLeftMm}mm;
      padding-bottom: ${headerInnerBottomMm}mm;
      border-bottom: 1px solid #dbe5f3 !important;
      color: #4e6285;
      font-size: 11px;
      line-height: 1.45;
    }
    .doc-header-gap {
      height: 6mm;
    }
    .doc-footer-cell {
      padding-right: ${footerHorizontalPaddingMm}mm;
      padding-bottom: ${footerBottomPaddingMm}mm;
      padding-left: ${footerHorizontalPaddingMm}mm;
      padding-top: ${footerTopPaddingMm}mm;
      border-top: 1px solid #dbe5f3 !important;
      color: #4e6285;
      font-size: 11px;
      line-height: 1.45;
    }
    .doc-footer-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      direction: ltr;
      gap: 12px;
    }
    .doc-footer-left {
      flex: 1 1 auto;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
    }
    .doc-footer-right {
      flex: 0 0 auto;
      white-space: nowrap;
      text-align: right;
      font-weight: 600;
      color: #34507f;
    }
    .doc-footer-page-number { display: none; }
    #doc-footer-page-num {
      flex: 0 0 auto;
      font-size: 10.5px;
      font-weight: 600;
      color: #34507f;
      white-space: nowrap;
      direction: ltr;
    }
    @media print {
      /* If @bottom-right is not rendering, this tfoot element is the fallback */
      #doc-footer-page-num { display: block; }
    }
    .doc-body-cell {
      padding-top: 0;
      padding-right: ${masterPage.marginRightMm}mm;
      padding-bottom: ${bodyToFooterGapMm}mm;
      padding-left: ${masterPage.marginLeftMm}mm;
    }
    .doc-body-cell > :first-child { margin-top: 0 !important; }
    .doc-export-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #d0d0d0;
      color: #1f355f;
    }
    .doc-print-structured-block {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
    }
    .doc-print-structured-copy { min-width: 0; flex: 1; }
    .doc-print-structured-logo { flex: 0 0 auto; max-width: ${logoMaxWidthPx}px; }
    .doc-print-structured-logo img { display: block; max-width: 100%; max-height: ${logoMaxHeightPx}px; object-fit: contain; }
    .doc-print-structured-title,
    .doc-print-structured-doc-title { font-size: 14px; font-weight: 700; color: #243d66; line-height: 1.35; }
    .doc-print-structured-subtitle { margin-top: 2px; font-size: 11px; font-weight: 600; color: #4e6285; }
    .doc-print-structured-address { margin-top: 4px; font-size: 10.5px; color: #617490; line-height: 1.45; }
    .doc-print-structured-signature {
      min-width: 120px;
      margin-inline-start: auto;
      padding-top: 12px;
      border-top: 1px solid #92a8cb;
      font-size: 10.5px;
      font-weight: 600;
      color: #516b94;
      text-align: center;
      align-self: flex-end;
    }
    h1 { font-size: 22px; font-weight: 700; margin: 1em 0 0.5em; }
    h2 { font-size: 18px; font-weight: 700; margin: 1em 0 0.5em; }
    h3 { font-size: 16px; font-weight: 600; margin: 0.8em 0 0.4em; }
    h4, h5, h6 { font-size: 14px; font-weight: 600; margin: 0.8em 0 0.4em; }
    p { margin: 0 0 0.7em; }
    img { max-width: 100%; height: auto; display: block; }
    /* Scope content tables so they don't affect the outer layout table */
    .doc-body-cell table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    .doc-body-cell td, .doc-body-cell th { border: 1px solid #ccc; padding: 6px 10px; }
    .doc-body-cell th { background: #f5f7fa; font-weight: 600; }
    a { color: #1a56db; }
    ul, ol { padding-right: 1.5em; padding-left: 0; margin: 0 0 0.8em; }
    pre, code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 13px; font-family: 'Courier New', monospace; }
    blockquote { border-right: 3px solid #d0d0d0; margin: 0.8em 0; padding: 4px 12px; color: #5a6a80; }
    /* ---- Cover page ---- */
    .doc-cover-page {
      --ct-bg: ${coverTheme.bg};
      --ct-circle1: ${coverTheme.circle1};
      --ct-circle2: ${coverTheme.circle2};
      --ct-tag: ${coverTheme.tagColor};
      --ct-title: ${coverTheme.titleColor};
      --ct-tab: ${coverTheme.tabColor};
      --ct-date: ${coverTheme.dateColor};
      --ct-date-border: ${coverTheme.dateBorder};
      --ct-footer-border: ${coverTheme.footerBorder};
      --ct-company: ${coverTheme.footerCompany};
      --ct-subtitle: ${coverTheme.footerSubtitle};
      --ct-address: ${coverTheme.footerAddress};
      width: 100%;
      height: ${pageHeightMm}mm;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--ct-bg);
      position: relative;
      overflow: hidden;
      padding: 20mm ${masterPage.marginRightMm}mm 18mm ${masterPage.marginLeftMm}mm;
      /* Paint above fixed watermark so cover page is watermark-free (unless theme allows it) */
      z-index: ${'allowWatermark' in coverTheme && coverTheme.allowWatermark ? '1' : '10000'};
      isolation: isolate;
    }
    .doc-cover-page::before {
      content: '';
      position: absolute;
      top: -35mm; left: 50%;
      transform: translateX(-50%);
      width: 110mm; height: 110mm;
      border-radius: 50%;
      background: var(--ct-circle1);
      pointer-events: none;
    }
    .doc-cover-page::after {
      content: '';
      position: absolute;
      bottom: -30mm; right: -15mm;
      width: 90mm; height: 90mm;
      border-radius: 50%;
      background: var(--ct-circle2);
      pointer-events: none;
    }
    .doc-cover-top-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10mm;
      position: relative;
      z-index: 2;
    }
    .doc-cover-top-logo img {
      display: block;
      max-width: 160px;
      max-height: 100px;
      object-fit: contain;
    }
    .doc-cover-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      width: 100%;
      position: relative;
      z-index: 1;
    }
    .doc-cover-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--ct-tag);
      margin-bottom: 8mm;
    }
    .doc-cover-title {
      font-size: 30px;
      font-weight: 800;
      color: var(--ct-title);
      line-height: 1.3;
      margin: 0 0 4mm;
    }
    .doc-cover-tab-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--ct-tab);
      line-height: 1.35;
      margin: 0 0 0;
    }
    .doc-cover-date {
      font-size: 12px;
      color: var(--ct-date);
      font-weight: 500;
      margin-top: 7mm;
      border-top: 1px solid var(--ct-date-border);
      padding-top: 4mm;
      width: 55%;
      text-align: center;
    }
    .doc-cover-footer {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      border-top: 1.5px solid var(--ct-footer-border);
      padding-top: 6mm;
      position: relative;
      z-index: 1;
    }
    .doc-cover-footer-info { text-align: center; }
    .doc-cover-footer-company { font-size: 13px; font-weight: 700; color: var(--ct-company); line-height: 1.3; }
    .doc-cover-footer-subtitle { font-size: 10.5px; color: var(--ct-subtitle); margin-top: 2px; }
    .doc-cover-footer-address { font-size: 10px; color: var(--ct-address); margin-top: 3px; line-height: 1.45; }
    /* ---- Watermark ---- */
    /*
     * position:fixed repeats on every printed page in Chrome.
     * Cover page has z-index:10000 > watermark z-index:9999 so it paints on top,
     * hiding the watermark on the cover page naturally.
     */
    .doc-watermark-center {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: ${masterPage.watermarkScale}%;
      max-height: ${masterPage.watermarkScale}%;
      pointer-events: none;
      z-index: 9999;
    }
    .doc-watermark-center img {
      display: block;
      width: 100%;
      height: auto;
      opacity: ${(masterPage.watermarkOpacity / 100).toFixed(3)};
      object-fit: contain;
      mix-blend-mode: multiply;
    }
    .doc-watermark-corner-tr {
      position: fixed;
      top: 0;
      right: 0;
      transform: translate(33%, -33%);
      width: ${masterPage.watermarkCornerScale}%;
      pointer-events: none;
      z-index: 9999;
    }
    .doc-watermark-corner-bl {
      position: fixed;
      bottom: 0;
      left: 0;
      transform: translate(-33%, 33%);
      width: ${masterPage.watermarkCornerScale}%;
      pointer-events: none;
      z-index: 9999;
    }
    .doc-watermark-corner-tr img,
    .doc-watermark-corner-bl img {
      display: block;
      width: 100%;
      height: auto;
      opacity: ${(masterPage.watermarkCornerOpacity / 100).toFixed(3)};
      object-fit: contain;
      mix-blend-mode: multiply;
    }
  </style>
  <script>
    window.addEventListener('load', function () {
      var CSS_PX_PER_MM = 96 / 25.4;
      var pageHeightPx = ${effectivePageHeightMm} * CSS_PX_PER_MM;

      function removeOldSpacer(bodyCell) {
        var oldSpacer = bodyCell.querySelector('[data-last-page-spacer="1"]');
        if (oldSpacer && oldSpacer.parentNode) oldSpacer.parentNode.removeChild(oldSpacer);
      }

      function addFooterSpacer() {
        var bodyCell = document.querySelector('.doc-body-cell');
        var headerGroup = document.querySelector('.doc-layout-table > thead');
        var footerCell = document.querySelector('.doc-footer-cell');
        if (!bodyCell) return;

        removeOldSpacer(bodyCell);

        var headerH = headerGroup ? headerGroup.getBoundingClientRect().height : 0;
        var footerH = footerCell ? footerCell.getBoundingClientRect().height : 0;
        var usableH = pageHeightPx - headerH - footerH;
        if (usableH <= 1) return;

        var bodyH = bodyCell.getBoundingClientRect().height;
        var remainder = bodyH % usableH;
        if (remainder > 1.5 && usableH - remainder > 1.5) {
          var spacerH = usableH - remainder;
          var spacer = document.createElement('div');
          spacer.setAttribute('data-last-page-spacer', '1');
          spacer.style.height = spacerH + 'px';
          spacer.style.width = '100%';
          spacer.style.pointerEvents = 'none';
          bodyCell.appendChild(spacer);

          // Re-measure once after insertion to reduce rounding drift in Chrome.
          for (var i = 0; i < 2; i += 1) {
            var refinedBodyH = bodyCell.getBoundingClientRect().height;
            var refinedRemainder = refinedBodyH % usableH;
            if (refinedRemainder <= 1.5 || usableH - refinedRemainder <= 1.5) break;
            spacerH += usableH - refinedRemainder;
            spacer.style.height = spacerH + 'px';
          }
        }
      }

      function refreshSpacerAfterLayout() {
        addFooterSpacer();
        // Inject today's date into cover page if coverDateMode === 'print'
        ${masterPage.showCoverPage && masterPage.coverDateMode === 'print' ? `
        var coverDateEl = document.getElementById('doc-cover-date');
        if (coverDateEl) {
          var now = new Date();
          coverDateEl.textContent = now.toLocaleDateString('ar-OM', { year: 'numeric', month: 'long', day: 'numeric' });
        }` : '// no print-date injection'}
        ${hasPageNumbers ? `
        // Inject estimated total-page count into the footer page number slot
        var footerPageEl = document.getElementById('doc-footer-page-num');
        if (footerPageEl) {
          var bodyCell2 = document.querySelector('.doc-body-cell');
          var headerGroup2 = document.querySelector('.doc-layout-table > thead');
          var footerCell2 = document.querySelector('.doc-footer-cell');
          if (bodyCell2) {
            var headerH2 = headerGroup2 ? headerGroup2.getBoundingClientRect().height : 0;
            var footerH2 = footerCell2 ? footerCell2.getBoundingClientRect().height : 0;
            var usableH2 = pageHeightPx - headerH2 - footerH2;
            var totalPages2 = usableH2 > 1 ? Math.max(1, Math.ceil(bodyCell2.getBoundingClientRect().height / usableH2)) : 1;
            ${masterPage.showCoverPage ? 'totalPages2 += 1;' : ''}
            footerPageEl.textContent = totalPages2 + ' \u0635\u0641\u062d\u0629';
          }
        }` : '// page numbers off'}
        requestAnimationFrame(function () {
          addFooterSpacer();
        });
      }

      function printAfterLayout() {
        refreshSpacerAfterLayout();
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            window.print();
          });
        });
      }

      window.addEventListener('beforeprint', refreshSpacerAfterLayout);

      if (window.matchMedia) {
        var printMedia = window.matchMedia('print');
        var handlePrintMediaChange = function (event) {
          if (event.matches) refreshSpacerAfterLayout();
        };
        if (typeof printMedia.addEventListener === 'function') {
          printMedia.addEventListener('change', handlePrintMediaChange);
        } else if (typeof printMedia.addListener === 'function') {
          printMedia.addListener(handlePrintMediaChange);
        }
      }

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(printAfterLayout);
      } else {
        printAfterLayout();
      }
    });
  </script>
</head>
<body>
${masterPage.showWatermark && watermarkUrl ? `
<div class="doc-watermark-center"><img src="${escapeHtmlAttribute(watermarkUrl)}" alt="" /></div>
${masterPage.watermarkLayout === 'triple' ? `
<div class="doc-watermark-corner-tr"><img src="${escapeHtmlAttribute(watermarkUrl)}" alt="" /></div>
<div class="doc-watermark-corner-bl"><img src="${escapeHtmlAttribute(watermarkUrl)}" alt="" /></div>` : ''}` : ''}
${masterPage.showCoverPage ? `<div class="doc-cover-page">
  ${coverLogoUrl ? `<div class="doc-cover-top-logo"><img src="${escapeHtmlAttribute(coverLogoUrl)}" alt="" /></div>` : ''}
  <div class="doc-cover-body">
    ${masterPage.coverTagLine.trim() ? `<div class="doc-cover-tag">${escapeHtml(masterPage.coverTagLine.trim())}</div>` : ''}
    ${masterPage.coverShowDocumentName && documentTitle ? `<div class="doc-cover-title">${escapeHtml(documentTitle)}</div>` : ''}
    ${masterPage.coverShowTabName && activeTabTitle ? `<div class="doc-cover-tab-name">${escapeHtml(activeTabTitle)}</div>` : ''}
    ${hasCoverDate ? `<div class="doc-cover-date" id="doc-cover-date">${escapeHtml(coverCreationDateStr)}</div>` : ''}
  </div>
  <div class="doc-cover-footer">
    <div class="doc-cover-footer-info">
      ${coverCompanyTitle ? `<div class="doc-cover-footer-company">${escapeHtml(coverCompanyTitle)}</div>` : ''}
      ${coverCompanySubtitle ? `<div class="doc-cover-footer-subtitle">${escapeHtml(coverCompanySubtitle)}</div>` : ''}
      ${coverCompanyAddress ? `<div class="doc-cover-footer-address">${escapeHtml(coverCompanyAddress)}</div>` : ''}
    </div>
  </div>
</div>` : ''}
<table class="doc-layout-table">
  ${hasHeader ? `<thead><tr><td class="doc-layout-cell doc-header-cell">${laterHeaderHtml}</td></tr><tr><td class="doc-layout-cell"><div class="doc-header-gap"></div></td></tr></thead>` : ''}
  <tbody>
    <tr>
      <td class="doc-layout-cell doc-body-cell">
        ${bodyContent}
      </td>
    </tr>
  </tbody>
  ${hasFooter || hasPageNumbers ? `<tfoot><tr><td class="doc-layout-cell doc-footer-cell"><div class="doc-footer-inner"><span class="doc-footer-left">${escapeHtml(footerLineText)}</span>${hasPageNumbers ? `<span id="doc-footer-page-num"></span>` : ''}</div></td></tr></tfoot>` : ''}
</table>
</body>
</html>`
}
function updateMasterPageMargin(
  current: WorkhubDocumentMasterPage,
  key: 'marginTopMm' | 'marginRightMm' | 'marginBottomMm' | 'marginLeftMm',
  nextValue: string,
): WorkhubDocumentMasterPage {
  const parsed = Number.parseInt(nextValue, 10)
  return {
    ...current,
    [key]: clampMarginValue(Number.isNaN(parsed) ? undefined : parsed, current[key] || 16),
  }
}

interface WorkhubDocEditorProps extends UseWorkhubDocEditorHandlersOutput {
  selectedDocument: WorkhubDocument | undefined
  scopedWorkspaceDocuments: WorkhubDocument[]
  selectedProjectId: string
  projectBrandingByProjectId: Record<string, { logoUrl?: string; clientName?: string; projectName?: string }>
  taskContextTrail: Array<Pick<WorkhubProject, 'id' | 'name'>>
  taskContextIconByProjectId: Record<string, string>
  selectedProjectPeriodLabel: string
  selectedProjectSubmissionTimeLabel: string
  onSelectProject: (projectId: string) => void
  busyKey: string
  memberByUid: Record<string, WorkhubMember>
  workhubShareCandidates: WorkhubMember[]
  workspaceProjectById: Record<string, WorkhubProject>
  isImageAttachmentUrl: (url: string) => boolean
  openAttachmentLightbox: (url: string) => void
  formatTime: (value: unknown) => string
  openDocumentCreateDialog: (projectId: string) => void
  onOpenDocumentSettings: (documentId: string) => void
  isMobileLayout: boolean
  discussionComments: WorkhubTaskComment[]
  onDiscussionSend: (text: string) => Promise<void>
  discussionBusy: boolean
  discussionNotifyMode?: 'all' | 'selected' | 'none'
  discussionNotifyUids?: string[]
  discussionNotifyCandidates?: Array<{ uid: string; label: string }>
  onDiscussionNotifyModeChange?: (mode: 'all' | 'selected' | 'none') => void
  onDiscussionNotifyUidsChange?: (uids: string[]) => void
  discussionEditingId: string
  discussionEditingText: string
  onDiscussionEditStart: (comment: WorkhubTaskComment) => void
  onDiscussionEditChange: (value: string) => void
  onDiscussionEditCancel: () => void
  onDiscussionEditSave: (comment: WorkhubTaskComment) => Promise<void>
  discussionEditBusyKey: string
  onDiscussionDelete?: (comment: WorkhubTaskComment) => Promise<void>
  discussionDeleteBusyKey?: string
  currentUid: string
  isPrivilegedMember: boolean
  allWorkspaceIds: Array<{ id: string; name: string }>
  allWorkspaceProjects: Array<{ id: string; name: string; workspaceId: string; parentProjectId?: string | null }>
  canUnlockDocument: boolean
  copyToFolderDialogOpen: boolean
  copyToFolderSaving: boolean
  copyToFolderWorkspaceId: string
  copyToFolderProjectId: string
  copyTabMode: 'all' | 'active' | 'select'
  copyTabSelection: string[]
  highlightedRefDocId: string | null
  setHighlightedRefDocId: React.Dispatch<React.SetStateAction<string | null>>
  setCopyToFolderDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  setCopyToFolderWorkspaceId: React.Dispatch<React.SetStateAction<string>>
  setCopyToFolderProjectId: React.Dispatch<React.SetStateAction<string>>
  setCopyTabMode: React.Dispatch<React.SetStateAction<'all' | 'active' | 'select'>>
  setCopyTabSelection: React.Dispatch<React.SetStateAction<string[]>>
  sourceReferenceDocuments: WorkhubDocument[]
  handleResolveAllTabsSharingForNewTab: (existingTabIds: string[]) => Promise<boolean>
  handleCopyDocumentToFolder: () => Promise<void>
  handleUpdateDocumentReference: (referenceDocumentId: string) => Promise<void>
  handleRemoveDocumentReference: (referenceDocumentId: string) => Promise<void>
  onPrintPreviewChange?: (active: boolean) => void
}

export function WorkhubDocEditor({
  selectedDocumentTitleDraft,
  selectedDocumentBodyDraft,
  selectedDocumentChanged,
  selectedDocumentLocked,
  selectedDocumentCanEdit,
  selectedDocumentReadOnly,
  setSelectedDocumentTitleDraft,
  setSelectedDocumentBodyDraft,
  selectedDocumentMasterPageDraft,
  setSelectedDocumentMasterPageDraft,
  documentTabsDraft,
  activeTabId,
  setDocumentTabsDraft,
  setActiveTabId,
  closeSelectedDocument,
  handleSaveSelectedDocument,
  handleToggleSelectedDocumentLock,
  handleDeleteSelectedDocument,
  shareDocDialogOpen,
  shareDocSaving,
  shareDocAccessDraftByUid,
  setShareDocDialogOpen,
  handleToggleShareDocMember,
  handleSelectShareDocMember,
  handleSetShareDocMemberAccess,
  handleSaveDocInternalShare,
  docChecklistDraft,
  editingDocChecklistItemId,
  editingDocChecklistItemText,
  setDocChecklistDraft,
  setEditingDocChecklistItemId,
  setEditingDocChecklistItemText,
  getDocChecklist,
  handleDocChecklistAdd,
  handleDocChecklistBulkAdd,
  handleDocChecklistToggle,
  handleDocChecklistRemove,
  handleDocChecklistEditSave,
  docAttachmentDraft,
  uploadingDocAttachment,
  uploadingDocumentAssetImage,
  workspaceAssetLibraryUrls,
  workspaceAssetLibraryLoading,
  uploadingWorkspaceAssetLibraryImage,
  setDocAttachmentDraft,
  handleDocAttachmentAdd,
  handleDocAttachmentRemove,
  handleDocAttachmentFileUpload,
  handleDocumentAssetImageUpload,
  handleWorkspaceAssetLibraryImageUpload,
  docLinkDraft,
  setDocLinkDraft,
  handleDocLinkAdd,
  handleDocLinkRemove,
  noteAutoSaveStatus,
  collaborationConflictBlocked,
  collaborationConflictUpdatedAtMs,
  collaborationConflictEditorUid,
  selectedDocumentHasOutgoingReferences,
  sourceReferencedTabIds,
  publicReferenceAutoSaveBlocked,
  recoverableDraftAvailable,
  recoverableDraftUpdatedAt,
  handleApplyCollaborationRemoteUpdate,
  handleKeepLocalEditsAfterConflict,
  handleRestoreRecoverableDraft,
  handleDiscardRecoverableDraft,
  selectedDocument,
  scopedWorkspaceDocuments,
  selectedProjectId,
  projectBrandingByProjectId,
  taskContextTrail,
  taskContextIconByProjectId,
  selectedProjectPeriodLabel,
  selectedProjectSubmissionTimeLabel,
  onSelectProject,
  busyKey,
  memberByUid,
  workhubShareCandidates,
  workspaceProjectById,
  isImageAttachmentUrl,
  openAttachmentLightbox,
  formatTime,
  openDocumentCreateDialog,
  onOpenDocumentSettings,
  isMobileLayout,
  discussionComments,
  onDiscussionSend,
  discussionBusy,
  discussionNotifyMode,
  discussionNotifyUids,
  discussionNotifyCandidates,
  onDiscussionNotifyModeChange,
  onDiscussionNotifyUidsChange,
  discussionEditingId,
  discussionEditingText,
  onDiscussionEditStart,
  onDiscussionEditChange,
  onDiscussionEditCancel,
  onDiscussionEditSave,
  discussionEditBusyKey,
  onDiscussionDelete,
  discussionDeleteBusyKey,
  currentUid,
  allWorkspaceIds,
  allWorkspaceProjects,
  canUnlockDocument,
  copyToFolderDialogOpen,
  copyToFolderSaving,
  copyToFolderWorkspaceId,
  copyToFolderProjectId,
  copyTabMode,
  copyTabSelection,
  highlightedRefDocId,
  setHighlightedRefDocId,
  setCopyToFolderDialogOpen,
  setCopyToFolderWorkspaceId,
  setCopyToFolderProjectId,
  setCopyTabMode,
  setCopyTabSelection,
  sourceReferenceDocuments,
  handleResolveAllTabsSharingForNewTab,
  handleCopyDocumentToFolder,
  handleUpdateDocumentReference,
  handleRemoveDocumentReference,
  handleOpenReferenceSourceDocument,
  onPrintPreviewChange,
}: WorkhubDocEditorProps) {
  const [mobileDocDetailsOpen, setMobileDocDetailsOpen] = useState(false)
  const [folderBrowserDialogOpen, setFolderBrowserDialogOpen] = useState(false)
  const [detailRailTab, setDetailRailTab] = useState<DetailRailTab>('details')
  const [isHeaderVoiceListening, setIsHeaderVoiceListening] = useState(false)
  const [printPreviewMode, setPrintPreviewMode] = useState(false)
  const [editorPageMode, setEditorPageMode] = useState(false)
  const [activeMasterVariantKey, setActiveMasterVariantKey] = useState<MasterPageVariantKey>('firstPage')
  const [masterPageSectionExpanded, setMasterPageSectionExpanded] = useState(false)
  const [documentEditor, setDocumentEditor] = useState<TinyMCEEditor | null>(null)
  const logoAssetInputRef = useRef<HTMLInputElement>(null)
  const workspaceAssetInputRef = useRef<HTMLInputElement>(null)
  const pendingLogoUploadTargetRef = useRef<{ variantKey: MasterPageVariantKey; sectionKey: MasterPageSectionKey } | null>(null)
  // Cache image URLs as data URIs so the print preview iframe doesn't re-fetch on every update
  const imageDataUriCacheRef = useRef<Map<string, string>>(new Map())
  const headerVoiceRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const headerVoiceKeepListeningRef = useRef(false)
  const headerVoiceBookmarkRef = useRef<unknown | null>(null)
  const headerVoiceSilenceTimerRef = useRef<number | null>(null)
  const headerVoiceRestartTimerRef = useRef<number | null>(null)
  const tabEditorStateRef = useRef<Record<string, { scrollTop: number }>>({})
  const currentDocIdRef = useRef<string | null>(null)
  const activeTabIdRef = useRef<string | null>(null)

  useEffect(() => {
    currentDocIdRef.current = selectedDocument?.id || null
    activeTabIdRef.current = activeTabId
  }, [selectedDocument?.id, activeTabId])

  useEffect(() => {
    if (selectedDocumentReadOnly) setDocumentEditor(null)
  }, [selectedDocumentReadOnly, selectedDocument?.id])


  // Detail rail resize/collapse
  const [detailRailWidth, setDetailRailWidth] = useState<number>(() => {
    const saved = localStorage.getItem('workhub:docRailWidth')
    const n = saved ? parseInt(saved, 10) : 0
    return n >= 160 && n <= 500 ? n : 248
  })
  const [detailRailCollapsed, setDetailRailCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('workhub:docRailCollapsed') === '1'
  })
  const detailRailResizeDragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const detailRailRef = useRef<HTMLDivElement | null>(null)

  function handleRailResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (detailRailCollapsed) return
    e.preventDefault()
    detailRailResizeDragRef.current = { startX: e.clientX, startWidth: detailRailWidth }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleRailResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!detailRailResizeDragRef.current || !detailRailRef.current) return
    // Rail is on the right; dragging handle left (smaller clientX) widens the rail
    const dx = detailRailResizeDragRef.current.startX - e.clientX
    const next = Math.min(500, Math.max(160, detailRailResizeDragRef.current.startWidth + dx))
    detailRailRef.current.style.flexBasis = `${next}px`
    detailRailRef.current.style.width = `${next}px`
  }

  function handleRailResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!detailRailResizeDragRef.current) return
    const dx = detailRailResizeDragRef.current.startX - e.clientX
    const next = Math.min(500, Math.max(160, detailRailResizeDragRef.current.startWidth + dx))
    setDetailRailWidth(next)
    localStorage.setItem('workhub:docRailWidth', String(next))
    detailRailResizeDragRef.current = null
  }

  function handleToggleRailCollapse() {
    const next = !detailRailCollapsed
    setDetailRailCollapsed(next)
    localStorage.setItem('workhub:docRailCollapsed', next ? '1' : '0')
  }

  // Tab rename state
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renamingTabTitle, setRenamingTabTitle] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  // Tab delete confirmation state
  const [pendingDeleteTabId, setPendingDeleteTabId] = useState<string | null>(null)
  // Icon picker state
  const [iconPickerTabId, setIconPickerTabId] = useState<string | null>(null)
  const [iconPickerAnchorEl, setIconPickerAnchorEl] = useState<HTMLButtonElement | null>(null)
  // Drag-to-reorder state
  const dragTabIdRef = useRef<string | null>(null)
  const shareSelectedCount = Object.keys(shareDocAccessDraftByUid).length
  const isQuickNote = selectedDocument?.type === 'note'
  const selectedShareEntry = Object.entries(shareDocAccessDraftByUid)[0] || null
  const selectedShareUid = selectedShareEntry?.[0] || ''
  const selectedShareAccess = selectedShareEntry?.[1] || 'edit'
  const selectedShareMember = selectedShareUid
    ? workhubShareCandidates.find((item) => item.uid === selectedShareUid)
    : undefined
  const selectedDocumentIcon = selectedDocument?.icon || (selectedDocument?.type === 'note' ? '????️' : '??')
  const activeTab = documentTabsDraft.length > 0 ? documentTabsDraft.find((tab) => tab.id === activeTabId) || null : null
  const showPublicSourceWarning = Boolean(selectedDocument && selectedDocumentHasOutgoingReferences && !selectedDocument.referenceSourceDocumentId)
  const showAutoSaveError = collaborationConflictBlocked || (publicReferenceAutoSaveBlocked && selectedDocumentChanged)
  const autoSaveStatusText = collaborationConflictBlocked
    ? 'Autosave paused. New collaborator updates available.'
    : (publicReferenceAutoSaveBlocked && selectedDocumentChanged
      ? 'Autosave paused for public content. Publish manually.'
      : (noteAutoSaveStatus === 'saving' ? 'Saving�' : noteAutoSaveStatus === 'saved' ? '? Saved' : ''))
  const staticDocumentBodyHtml = useMemo(
    () => sanitizePrintHtmlFragment(toDocumentBodyEditorHtml(selectedDocumentBodyDraft)) || '<p></p>',
    [selectedDocumentBodyDraft],
  )
  const recoverableDraftTimeLabel = recoverableDraftUpdatedAt
    ? new Date(recoverableDraftUpdatedAt).toLocaleString('en-GB')
    : ''
  const collaborationConflictEditorName = collaborationConflictEditorUid
    ? (memberByUid[collaborationConflictEditorUid]?.displayName || memberByUid[collaborationConflictEditorUid]?.email || 'A collaborator')
    : 'A collaborator'
  const collaborationConflictTimeLabel = collaborationConflictUpdatedAtMs
    ? formatTime(collaborationConflictUpdatedAtMs)
    : ''
  const referenceWorkspaceById = useMemo(
    () => Object.fromEntries(allWorkspaceIds.map((workspace) => [workspace.id, workspace])) as Record<string, { id: string; name: string }>,
    [allWorkspaceIds],
  )
  const referenceProjectById = useMemo(
    () => Object.fromEntries(allWorkspaceProjects.map((project) => [project.id, project])) as Record<string, { id: string; name: string; workspaceId: string; parentProjectId?: string | null }>,
    [allWorkspaceProjects],
  )
  const highlightedReferenceDocument = useMemo(
    () => sourceReferenceDocuments.find((doc) => doc.id === highlightedRefDocId) || null,
    [highlightedRefDocId, sourceReferenceDocuments],
  )
  const highlightedReferenceTabIds = useMemo(() => {
    if (!highlightedReferenceDocument) return [] as string[]
    const explicit = Array.isArray(highlightedReferenceDocument.referenceTabIds)
      ? highlightedReferenceDocument.referenceTabIds
      : []
    if (explicit.length > 0) return explicit
    return documentTabsDraft.map((tab) => tab.id)
  }, [documentTabsDraft, highlightedReferenceDocument])
  const highlightedReferenceSelectionDirty = useMemo(() => {
    if (!highlightedReferenceDocument) return false
    const current = Array.from(new Set(copyTabSelection)).sort()
    const baseline = Array.from(new Set(highlightedReferenceTabIds)).sort()
    if (current.length !== baseline.length) return true
    for (let i = 0; i < current.length; i += 1) {
      if (current[i] !== baseline[i]) return true
    }
    return false
  }, [copyTabSelection, highlightedReferenceDocument, highlightedReferenceTabIds])

  useEffect(() => {
    if (!highlightedRefDocId) return
    const stillExists = sourceReferenceDocuments.some((doc) => doc.id === highlightedRefDocId)
    if (!stillExists) setHighlightedRefDocId(null)
  }, [highlightedRefDocId, setHighlightedRefDocId, sourceReferenceDocuments])
  const aiPanelPersistenceKey = selectedDocument ? `workhub:${selectedDocument.id}:${activeTab?.id || 'body'}` : undefined
  const [showPublishWarningBox, setShowPublishWarningBox] = useState(false)
  const [publishWarningShownForVisit, setPublishWarningShownForVisit] = useState(false)
  const shouldTriggerPublishWarningBox = publicReferenceAutoSaveBlocked && selectedDocumentChanged && !publishWarningShownForVisit
  const canReopenPublishWarning = publicReferenceAutoSaveBlocked && selectedDocumentChanged && !showPublishWarningBox
  const headerSpeechRecognitionSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), [])
  const pendingRestoreTimerRef = useRef<number | null>(null)
  const restoringRef = useRef(false)

  useEffect(() => {
    setShowPublishWarningBox(false)
    setPublishWarningShownForVisit(false)
  }, [selectedDocument?.id])

  useEffect(() => {
    if (shouldTriggerPublishWarningBox) {
      setShowPublishWarningBox(true)
      setPublishWarningShownForVisit(true)
    }
  }, [shouldTriggerPublishWarningBox])

  function dismissPublishWarningForVisit() {
    setShowPublishWarningBox(false)
  }

  function getEditorStateKey(docId: string | null | undefined, tabId: string | null | undefined) {
    if (!docId) return null
    return `${docId}:${tabId || 'body'}`
  }

  function getDocumentViewModeStorageKey(docId: string) {
    const uid = currentUid || 'anon'
    return `workhub:docViewMode:${uid}:${docId}`
  }

  function saveDocumentViewMode(docId: string | undefined, mode: DocumentViewMode) {
    if (!docId) return
    try {
      localStorage.setItem(getDocumentViewModeStorageKey(docId), mode)
    } catch {
      // Ignore storage quota and privacy mode errors.
    }
  }

  function readDocumentViewMode(docId: string | undefined): DocumentViewMode {
    if (!docId) return 'default'
    try {
      const raw = localStorage.getItem(getDocumentViewModeStorageKey(docId))
      if (raw === 'page' || raw === 'preview' || raw === 'default') return raw
    } catch {
      // Ignore storage access errors and fall back.
    }
    return 'default'
  }

  function saveEditorViewState(
    editor: TinyMCEEditor | null,
    docId: string | null | undefined = currentDocIdRef.current,
    tabId: string | null | undefined = activeTabIdRef.current,
  ) {
    // Suppress saves while a restore is in progress to avoid overwriting
    // the target tab's saved state with transient scrollTop=0 values.
    if (restoringRef.current) return
    const stateKey = getEditorStateKey(docId, tabId)
    if (!editor || !stateKey) return
    try {
      tabEditorStateRef.current[stateKey] = {
        scrollTop: editor.getWin().scrollY,
      }
    } catch {
      // Ignore transient TinyMCE selection and iframe lifecycle errors.
    }
  }

  function scheduleRestore(editor: TinyMCEEditor, key: string) {
    if (pendingRestoreTimerRef.current != null) {
      window.clearTimeout(pendingRestoreTimerRef.current)
    }
    restoringRef.current = true
    pendingRestoreTimerRef.current = window.setTimeout(() => {
      pendingRestoreTimerRef.current = null
      const savedState = tabEditorStateRef.current[key]
      if (savedState) {
        try {
          editor.getWin().scrollTo(0, savedState.scrollTop)
        } catch {
          // Ignore transient TinyMCE selection and iframe lifecycle errors.
        }
      }
      // Allow saves again after a short settling period
      window.setTimeout(() => { restoringRef.current = false }, 50)
    }, 60)
  }

  function insertTranscriptIntoEditor(transcriptText: string) {
    if (!documentEditor || !transcriptText.trim()) return

    const html = escapeHtmlForEditor(transcriptText.trim())
    try {
      documentEditor.undoManager.transact(() => {
        documentEditor.focus()
        const selection = documentEditor.selection
        if (selection && headerVoiceBookmarkRef.current) {
          selection.moveToBookmark(headerVoiceBookmarkRef.current as never)
        }
        documentEditor.insertContent(html)
        if (selection) {
          headerVoiceBookmarkRef.current = selection.getBookmark(2, true)
        }
      })
    } catch {
      // Ignore transient selection errors to avoid interrupting dictation.
    }
  }

  function clearHeaderVoiceSilenceTimer() {
    if (headerVoiceSilenceTimerRef.current !== null) {
      window.clearTimeout(headerVoiceSilenceTimerRef.current)
      headerVoiceSilenceTimerRef.current = null
    }
  }

  function clearHeaderVoiceRestartTimer() {
    if (headerVoiceRestartTimerRef.current !== null) {
      window.clearTimeout(headerVoiceRestartTimerRef.current)
      headerVoiceRestartTimerRef.current = null
    }
  }

  function scheduleHeaderVoiceSilenceTimeout() {
    clearHeaderVoiceSilenceTimer()
    headerVoiceSilenceTimerRef.current = window.setTimeout(() => {
      headerVoiceSilenceTimerRef.current = null
      stopHeaderVoiceInput()
    }, HEADER_VOICE_SILENCE_TIMEOUT_MS)
  }

  function stopHeaderVoiceInput() {
    headerVoiceKeepListeningRef.current = false
    clearHeaderVoiceSilenceTimer()
    clearHeaderVoiceRestartTimer()
    const recognition = headerVoiceRecognitionRef.current
    if (recognition) {
      recognition.abort()
      headerVoiceRecognitionRef.current = null
    }
    setIsHeaderVoiceListening(false)
  }

  function startHeaderVoiceSession() {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      clearHeaderVoiceSilenceTimer()
      setIsHeaderVoiceListening(false)
      return
    }

    const recognition = new Ctor()
    headerVoiceRecognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = resolveHeaderSpeechLanguage({
      documentTitle: selectedDocumentTitleDraft || selectedDocument?.title || '',
      documentBody: selectedDocumentBodyDraft,
      activeTabTitle: activeTab?.title,
    })

    recognition.onstart = () => {
      scheduleHeaderVoiceSilenceTimeout()
      setIsHeaderVoiceListening(true)
    }

    recognition.onresult = (event) => {
      // Reset silence timeout on any speech activity
      scheduleHeaderVoiceSilenceTimeout()

      const chunks: string[] = []
      const startIndex = event.resultIndex ?? 0
      for (let i = startIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result?.[0]?.transcript?.trim()
        if (!result?.isFinal || !transcript) continue
        chunks.push(transcript)
      }
      if (chunks.length > 0) {
        insertTranscriptIntoEditor(chunks.join(' '))
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        headerVoiceKeepListeningRef.current = false
        clearHeaderVoiceSilenceTimer()
        setIsHeaderVoiceListening(false)
        return
      }
    }

    recognition.onend = () => {
      if (headerVoiceRecognitionRef.current === recognition) {
        headerVoiceRecognitionRef.current = null
      }
      if (!headerVoiceKeepListeningRef.current) {
        setIsHeaderVoiceListening(false)
        clearHeaderVoiceSilenceTimer()
        return
      }
      clearHeaderVoiceRestartTimer()
      headerVoiceRestartTimerRef.current = window.setTimeout(() => {
        headerVoiceRestartTimerRef.current = null
        startHeaderVoiceSession()
      }, 120)
    }

    try {
      recognition.start()
    } catch {
      clearHeaderVoiceSilenceTimer()
      headerVoiceRecognitionRef.current = null
      headerVoiceKeepListeningRef.current = false
      setIsHeaderVoiceListening(false)
    }
  }

  function handleHeaderVoiceInput() {
    if (isHeaderVoiceListening) {
      stopHeaderVoiceInput()
      return
    }
    if (!headerSpeechRecognitionSupported || !documentEditor) return

    const selection = documentEditor.selection
    headerVoiceBookmarkRef.current = selection ? selection.getBookmark(2, true) : null
    headerVoiceKeepListeningRef.current = true
    startHeaderVoiceSession()
  }

  useEffect(() => {
    return () => {
      stopHeaderVoiceInput()
    }
  }, [])
  const normalizedMasterPage = useMemo(
    () => normalizeMasterPageDraft(selectedDocumentMasterPageDraft),
    [selectedDocumentMasterPageDraft],
  )
  const previewTitle = selectedDocument
    ? ((selectedDocumentTitleDraft.trim() || selectedDocument.title) + (activeTab ? ` � ${activeTab.title}` : ''))
    : ''
  const pageLayoutLabel = `${normalizedMasterPage.pageSize} � ${normalizedMasterPage.orientation}`
  const previewDocumentHtml = useMemo(() => {
    if (!selectedDocument) return ''
    return buildPrintableDocumentHtml({
      documentTitle: previewTitle,
      bodyContent: sanitizePrintHtmlFragment(selectedDocumentBodyDraft),
      masterPage: normalizedMasterPage,
      previewMode: true,
      hideVariantLabels: Boolean(selectedDocument.referenceSourceDocumentId),
    })
  }, [normalizedMasterPage, previewTitle, selectedDocument, selectedDocumentBodyDraft])

  // Debounce the preview iframe update so typing in text fields doesn't
  // cause a full HTML rebuild + iframe reload on every keystroke.
  // Also substitute any image URLs with cached data URIs to avoid flickering.
  const [debouncedPreviewHtml, setDebouncedPreviewHtml] = useState<string>('')
  const pageEditorToolbarContainerSelector = '#workhub-editor-page-toolbar'
  useEffect(() => {
    const id = setTimeout(() => {
      const cache = imageDataUriCacheRef.current
      // Find all src="..." URLs in the HTML and replace with data URIs if cached
      const urlPattern = /src="(https?:\/\/[^"]+)"/g
      const urls = new Set<string>()
      let m: RegExpExecArray | null
      while ((m = urlPattern.exec(previewDocumentHtml)) !== null) {
        urls.add(m[1])
      }
      // Fetch uncached URLs
      const uncached = Array.from(urls).filter((u) => !cache.has(u))
      if (uncached.length === 0) {
        // All URLs are cached � substitute and set
        const html = previewDocumentHtml.replace(/src="(https?:\/\/[^"]+)"/g, (_full, url) => {
          const dataUri = cache.get(url)
          return dataUri ? `src="${dataUri}"` : `src="${url}"`
        })
        setDebouncedPreviewHtml(html)
      } else {
        // Fetch uncached, then substitute
        Promise.allSettled(
          uncached.map(async (url) => {
            try {
              const res = await fetch(url)
              const blob = await res.blob()
              await new Promise<void>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => { cache.set(url, reader.result as string); resolve() }
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
            } catch {
              // Keep original URL on failure
            }
          }),
        ).then(() => {
          const html = previewDocumentHtml.replace(/src="(https?:\/\/[^"]+)"/g, (_full, url) => {
            const dataUri = cache.get(url)
            return dataUri ? `src="${dataUri}"` : `src="${url}"`
          })
          setDebouncedPreviewHtml(html)
        })
      }
    }, 400)
    return () => clearTimeout(id)
  }, [previewDocumentHtml])
  const activeMasterVariant = normalizedMasterPage[activeMasterVariantKey]
  const brandingProjectId = selectedDocument?.projectId || (selectedProjectId !== 'all' ? selectedProjectId : '')
  const activeProjectBranding = brandingProjectId ? projectBrandingByProjectId[brandingProjectId] : undefined
  const availableLogoAssets = useMemo(() => {
    const next = new Set<string>()
    const pushUrl = (url: string | undefined | null) => {
      const normalized = (url || '').trim()
      if (!normalized) return
      if (!isImageAttachmentUrl(normalized)) return
      next.add(normalized)
    }

    workspaceAssetLibraryUrls.forEach(pushUrl)
    ;(selectedDocument?.attachments || []).forEach(pushUrl)
    scopedWorkspaceDocuments.forEach((doc) => {
      ;(doc.attachments || []).forEach(pushUrl)
    })
    Object.values(workspaceProjectById).forEach((project) => {
      ;(project.attachments || []).forEach(pushUrl)
    })
    pushUrl(normalizedMasterPage.firstPage.header.logoUrl)
    pushUrl(normalizedMasterPage.firstPage.footer.logoUrl)
    pushUrl(normalizedMasterPage.laterPages.header.logoUrl)
    pushUrl(normalizedMasterPage.laterPages.footer.logoUrl)

    return Array.from(next)
  }, [isImageAttachmentUrl, normalizedMasterPage, scopedWorkspaceDocuments, selectedDocument?.attachments, workspaceAssetLibraryUrls, workspaceProjectById])

  function updateMasterPageDraft(updater: (current: NormalizedMasterPage) => WorkhubDocumentMasterPage) {
    setSelectedDocumentMasterPageDraft((prev) => updater(normalizeMasterPageDraft(prev)))
  }

  function updateMasterPageVariant(
    variantKey: MasterPageVariantKey,
    updater: (variant: NormalizedMasterPageVariant) => WorkhubDocumentMasterPageVariant,
  ) {
    updateMasterPageDraft((current) => ({
      ...current,
      [variantKey]: updater(current[variantKey]),
    }))
  }

  function updateMasterPageBlock(
    variantKey: MasterPageVariantKey,
    sectionKey: MasterPageSectionKey,
    updater: (block: NormalizedPrintBlock) => WorkhubDocumentPrintBlock,
  ) {
    updateMasterPageVariant(variantKey, (variant) => ({
      ...variant,
      [sectionKey]: updater(variant[sectionKey]),
    }))
  }

  function handleCopyVariant(source: MasterPageVariantKey, target: MasterPageVariantKey) {
    updateMasterPageDraft((current) => ({
      ...current,
      [target]: current[source],
    }))
  }

  function openLogoAssetUpload(variantKey: MasterPageVariantKey, sectionKey: MasterPageSectionKey) {
    pendingLogoUploadTargetRef.current = { variantKey, sectionKey }
    logoAssetInputRef.current?.click()
  }

  async function handleLogoAssetInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const target = pendingLogoUploadTargetRef.current
    event.target.value = ''
    pendingLogoUploadTargetRef.current = null
    if (!file || !target) return
    const url = await handleDocumentAssetImageUpload(file)
    if (!url) return
    updateMasterPageBlock(target.variantKey, target.sectionKey, (current) => ({ ...current, logoUrl: url }))
  }

  async function handleWorkspaceAssetInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const url = await handleWorkspaceAssetLibraryImageUpload(file)
    if (!url) return
    updateMasterPageBlock(activeMasterVariantKey, 'header', (current) => ({ ...current, logoUrl: current.logoUrl || url }))
  }

  function applyProjectBranding(sectionKey: MasterPageSectionKey) {
    if (!activeProjectBranding?.logoUrl) return
    updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({
      ...current,
      logoUrl: activeProjectBranding.logoUrl || current.logoUrl,
      title: current.title || activeProjectBranding.clientName || activeProjectBranding.projectName || '',
      subtitle: current.subtitle || (
        activeProjectBranding.clientName && activeProjectBranding.projectName && activeProjectBranding.clientName !== activeProjectBranding.projectName
          ? activeProjectBranding.projectName
          : ''
      ),
    }))
  }

  useEffect(() => {
    setMobileDocDetailsOpen(false)
    setDetailRailTab('details')
    const docId = selectedDocument?.id
    if (!docId) {
      setPrintPreviewMode(false)
      setEditorPageMode(false)
      return
    }
    if (selectedDocument?.referenceSourceDocumentId) {
      setPrintPreviewMode(true)
      setEditorPageMode(false)
      setDetailRailCollapsed(false)
      localStorage.setItem('workhub:docRailCollapsed', '0')
      saveDocumentViewMode(docId, 'preview')
    } else {
      const savedMode = readDocumentViewMode(docId)
      setPrintPreviewMode(savedMode === 'preview')
      setEditorPageMode(savedMode === 'page')
    }
    setActiveMasterVariantKey('firstPage')
  }, [currentUid, selectedDocument?.id])

  function handleDocumentEditorReady(ed: TinyMCEEditor) {
    setDocumentEditor(ed)
    const handleSaveState = () => {
      saveEditorViewState(ed)
    }
    ed.on('NodeChange keyup focusout ScrollContent scroll', handleSaveState)
    try {
      const win = ed.getWin()
      if (win) {
        win.addEventListener('scroll', handleSaveState, { passive: true })
      }
    } catch {
      // Ignore transient iframe lifecycle errors.
    }
  }

  // Restore cursor/scroll after a document switch (editor stays mounted)
  useEffect(() => {
    if (!selectedDocument?.id || !documentEditor) return
    // Save outgoing document state before switching
    saveEditorViewState(documentEditor)
    // Schedule restore for the incoming document
    const key = getEditorStateKey(selectedDocument.id, activeTabIdRef.current)
    if (key) scheduleRestore(documentEditor, key)
    return () => {
      if (pendingRestoreTimerRef.current != null) {
        window.clearTimeout(pendingRestoreTimerRef.current)
        restoringRef.current = false
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocument?.id])

  useEffect(() => {
    if (renamingTabId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingTabId])

  // --- PDF export ---
  function handleExportPdf() {
    if (!selectedDocument) return
    const html = buildPrintExportHtml({
      documentTitle: selectedDocumentTitleDraft.trim() || selectedDocument.title,
      activeTabTitle: activeTab?.title,
      bodyContent: sanitizePrintHtmlFragment(selectedDocumentBodyDraft),
      masterPage: normalizedMasterPage,
      createdAtMs: selectedDocument.createdAt != null
        ? (typeof (selectedDocument.createdAt as { toMillis?: () => number }).toMillis === 'function'
          ? (selectedDocument.createdAt as { toMillis: () => number }).toMillis()
          : typeof selectedDocument.createdAt === 'number'
            ? selectedDocument.createdAt
            : undefined)
        : undefined,
    })
    const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const printWindow = window.open(blobUrl, '_blank', 'width=960,height=750')
    if (printWindow) {
      printWindow.focus()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } else {
      URL.revokeObjectURL(blobUrl)
    }
  }

  // --- Tab management helpers ---
  async function handleAddTab() {
    if (!selectedDocument || selectedDocumentReadOnly) return
    const hasTabs = documentTabsDraft.length > 0
    const hasAllTabsSharing = sourceReferenceDocuments.some((refDoc) => {
      const selectedTabIds = Array.isArray(refDoc.referenceTabIds) ? refDoc.referenceTabIds : []
      return selectedTabIds.length === 0
    })
    const newTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    if (!hasTabs) {
      // First time: convert current body into first tab, then add a second empty tab
      const firstTabId = `tab_${Date.now() - 1}_${Math.random().toString(36).slice(2, 8)}`
      if (hasAllTabsSharing) {
        const includeNewTab = window.confirm('All-tabs sharing is active. Include this new tab in shared references? Click Cancel to keep new tab unshared.')
        if (!includeNewTab) {
          const resolved = await handleResolveAllTabsSharingForNewTab([firstTabId])
          if (!resolved) return
        }
      }
      const firstTab: WorkhubDocumentTab = { id: firstTabId, title: 'Main', body: selectedDocumentBodyDraft }
      const newTab: WorkhubDocumentTab = { id: newTabId, title: 'Tab 2', body: '' }
      setDocumentTabsDraft([firstTab, newTab])
      setActiveTabId(newTabId)
      setSelectedDocumentBodyDraft('')
    } else {
      // Flush current editor content to active tab before appending
      const updatedTabs = documentTabsDraft.map((t) =>
        t.id === activeTabId ? { ...t, body: selectedDocumentBodyDraft } : t,
      )
      if (hasAllTabsSharing) {
        const includeNewTab = window.confirm('All-tabs sharing is active. Include this new tab in shared references? Click Cancel to keep new tab unshared.')
        if (!includeNewTab) {
          const resolved = await handleResolveAllTabsSharingForNewTab(updatedTabs.map((tab) => tab.id))
          if (!resolved) return
        }
      }
      const newTab: WorkhubDocumentTab = { id: newTabId, title: `Tab ${documentTabsDraft.length + 1}`, body: '' }
      setDocumentTabsDraft([...updatedTabs, newTab])
      setActiveTabId(newTabId)
      setSelectedDocumentBodyDraft('')
    }
    if (documentEditor) {
      try { documentEditor.focus() } catch {}
    }
  }

  function handleSwitchTab(tabId: string) {
    if (tabId === activeTabId) return
    saveEditorViewState(documentEditor, selectedDocument?.id, activeTabId)
    // Flush current body to the active tab
    const updatedTabs = documentTabsDraft.map((t) =>
      t.id === activeTabId ? { ...t, body: selectedDocumentBodyDraft } : t,
    )
    const target = updatedTabs.find((t) => t.id === tabId)
    setDocumentTabsDraft(updatedTabs)
    setActiveTabId(tabId)
    setSelectedDocumentBodyDraft(target?.body || '')
    // Schedule restore after TinyMCE processes the new content
    if (documentEditor) {
      const restoreKey = getEditorStateKey(selectedDocument?.id, tabId)
      if (restoreKey) scheduleRestore(documentEditor, restoreKey)
    }
  }

  function handleDeleteTab(tabId: string) {
    if (documentTabsDraft.length <= 1) return
    if (selectedDocumentHasOutgoingReferences) {
      const isPublicTab = sourceReferencedTabIds.includes(tabId)
      const warning = isPublicTab
        ? 'This tab is currently public and referenced in other folders. Deleting it will remove it from those places. Continue?'
        : 'This document is referenced by other folders. Deleting tabs can impact shared copies. Continue?'
      if (!window.confirm(warning)) return
    }
    setPendingDeleteTabId(tabId)
  }

  function handleConfirmDeleteTab() {
    const tabId = pendingDeleteTabId
    setPendingDeleteTabId(null)
    if (!tabId || documentTabsDraft.length <= 1) return
    const nextTabs = documentTabsDraft.filter((t) => t.id !== tabId)
    // If deleting active tab, switch to the first remaining tab
    if (tabId === activeTabId) {
      const next = nextTabs[0]
      setActiveTabId(next.id)
      setSelectedDocumentBodyDraft(next.body || '')
    }
    setDocumentTabsDraft(nextTabs)
  }

  function handleCancelDeleteTab() {
    setPendingDeleteTabId(null)
  }

  function handleStartRename(tab: WorkhubDocumentTab) {
    setRenamingTabId(tab.id)
    setRenamingTabTitle(tab.title)
  }

  function handleCommitRename() {
    if (!renamingTabId) return
    const trimmed = renamingTabTitle.trim()
    if (trimmed) {
      setDocumentTabsDraft((prev) => prev.map((t) => t.id === renamingTabId ? { ...t, title: trimmed } : t))
    }
    setRenamingTabId(null)
    setRenamingTabTitle('')
  }

  function handleTabDragStart(tabId: string) {
    dragTabIdRef.current = tabId
  }

  function handleTabDragOver(e: React.DragEvent, targetTabId: string) {
    e.preventDefault()
    if (!dragTabIdRef.current || dragTabIdRef.current === targetTabId) return
    const from = documentTabsDraft.findIndex((t) => t.id === dragTabIdRef.current)
    const to = documentTabsDraft.findIndex((t) => t.id === targetTabId)
    if (from === -1 || to === -1) return
    const next = [...documentTabsDraft]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    dragTabIdRef.current = moved.id
    setDocumentTabsDraft(next)
  }

  function handleTabDragEnd() {
    dragTabIdRef.current = null
  }

  function handleEditorChange(value: string) {
    setSelectedDocumentBodyDraft(value)
    if (documentTabsDraft.length > 0 && activeTabId) {
      setDocumentTabsDraft((prev) =>
        prev.map((t) => t.id === activeTabId ? { ...t, body: value } : t),
      )
    }
  }

  function renderMasterPageBlockEditor(sectionKey: MasterPageSectionKey, label: string) {
    const block = activeMasterVariant[sectionKey]
    const showToggleChecked = sectionKey === 'header' ? activeMasterVariant.showHeader : activeMasterVariant.showFooter
    return (
      <div className="workhub-doc-master-page-section">
        <div className="workhub-doc-master-page-section-head">
          <strong>{label}</strong>
          <label className="workhub-doc-master-page-toggle">
            <input
              type="checkbox"
              checked={showToggleChecked}
              disabled={selectedDocumentReadOnly}
              onChange={(e) => {
                updateMasterPageVariant(activeMasterVariantKey, (variant) => ({
                  ...variant,
                  [sectionKey === 'header' ? 'showHeader' : 'showFooter']: e.target.checked,
                }))
              }}
            />
            <span>Show {label.toLowerCase()}</span>
          </label>
        </div>

        <div className="workhub-doc-master-page-grid">
          <label className="workhub-doc-master-page-field">
            <span>Content mode</span>
            <select
              value={block.mode}
              disabled={selectedDocumentReadOnly}
              onChange={(e) => {
                updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, mode: e.target.value as WorkhubDocumentPrintBlock['mode'] }))
              }}
            >
              <option value="structured">Structured builder</option>
              <option value="html">Custom HTML</option>
            </select>
          </label>
          {sectionKey === 'footer' ? (
            <label className="workhub-doc-master-page-toggle workhub-doc-master-page-toggle-inline">
              <input
                type="checkbox"
                checked={activeMasterVariant.showPageNumbers}
                disabled={selectedDocumentReadOnly || !activeMasterVariant.showFooter}
                onChange={(e) => {
                  updateMasterPageVariant(activeMasterVariantKey, (variant) => ({ ...variant, showPageNumbers: e.target.checked }))
                }}
              />
              <span>Show page number</span>
            </label>
          ) : (
            <label className="workhub-doc-master-page-toggle workhub-doc-master-page-toggle-inline">
              <input
                type="checkbox"
                checked={block.showDocumentTitle}
                disabled={selectedDocumentReadOnly}
                onChange={(e) => {
                  updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, showDocumentTitle: e.target.checked }))
                }}
              />
              <span>Include document title</span>
            </label>
          )}
        </div>

        {block.mode === 'html' ? (
          <label className="workhub-doc-master-page-field is-block">
            <span>{label} HTML</span>
            <textarea
              rows={5}
              value={block.html}
              disabled={selectedDocumentReadOnly}
              placeholder={sectionKey === 'header' ? '<strong>Company Name</strong><br />Address line' : 'Prepared by team or signature block'}
              onChange={(e) => {
                updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, html: e.target.value }))
              }}
            />
          </label>
        ) : (
          <>
            <div className="workhub-doc-master-page-grid">
              <div className="workhub-doc-master-page-field workhub-doc-master-page-asset-field">
                <span>Logo asset</span>
                <div className="workhub-doc-master-page-asset-actions">
                  <button
                    type="button"
                    className="workhub-ghost-mini"
                    disabled={selectedDocumentReadOnly || uploadingDocumentAssetImage}
                    onClick={() => openLogoAssetUpload(activeMasterVariantKey, sectionKey)}
                  >
                    {uploadingDocumentAssetImage ? 'Uploading�' : 'Upload image'}
                  </button>
                  <button
                    type="button"
                    className="workhub-ghost-mini"
                    disabled={selectedDocumentReadOnly || !activeProjectBranding?.logoUrl}
                    onClick={() => applyProjectBranding(sectionKey)}
                  >
                    Use project logo
                  </button>
                  {block.logoUrl ? (
                    <button
                      type="button"
                      className="workhub-ghost-mini is-danger"
                      disabled={selectedDocumentReadOnly}
                      onClick={() => {
                        updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, logoUrl: '' }))
                      }}
                    >
                      Clear logo
                    </button>
                  ) : null}
                </div>
                {block.logoUrl ? (
                  <div className="workhub-doc-master-page-logo-preview">
                    <img src={block.logoUrl} alt="Selected logo asset" />
                  </div>
                ) : (
                  <div className="workhub-doc-master-page-logo-empty">No logo selected</div>
                )}
                <div className="workhub-doc-master-page-asset-grid">
                  {availableLogoAssets.length > 0 ? availableLogoAssets.map((assetUrl) => (
                    <button
                      key={assetUrl}
                      type="button"
                      className={`workhub-doc-master-page-asset-option${block.logoUrl === assetUrl ? ' is-active' : ''}`}
                      disabled={selectedDocumentReadOnly}
                      onClick={() => {
                        updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, logoUrl: assetUrl }))
                      }}
                      title="Use uploaded asset"
                    >
                      <img src={assetUrl} alt="Uploaded asset" />
                    </button>
                  )) : (
                    <div className="workhub-doc-master-page-logo-empty">No uploaded image assets found in this workspace yet.</div>
                  )}
                </div>
                <p className="workhub-doc-master-page-branding-note">
                  {activeProjectBranding?.logoUrl
                    ? `Project branding available from ${activeProjectBranding.clientName || activeProjectBranding.projectName || 'the linked project'}.`
                    : 'No linked project logo found for this document yet.'}
                </p>
                <label className="workhub-doc-master-page-field is-block">
                  <span>Optional custom logo URL</span>
                  <input
                    type="url"
                    value={block.logoUrl}
                    disabled={selectedDocumentReadOnly}
                    placeholder="https://.../logo.png"
                    onChange={(e) => {
                      updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, logoUrl: e.target.value }))
                    }}
                  />
                </label>
              </div>
              <label className="workhub-doc-master-page-field">
                <span>Title</span>
                <input
                  type="text"
                  value={block.title}
                  disabled={selectedDocumentReadOnly}
                  placeholder={sectionKey === 'header' ? 'Company or department' : 'Prepared by'}
                  onChange={(e) => {
                    updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, title: e.target.value }))
                  }}
                />
              </label>
              <label className="workhub-doc-master-page-field">
                <span>Subtitle</span>
                <input
                  type="text"
                  value={block.subtitle}
                  disabled={selectedDocumentReadOnly}
                  placeholder="Department, branch, or reference"
                  onChange={(e) => {
                    updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, subtitle: e.target.value }))
                  }}
                />
              </label>
              <label className="workhub-doc-master-page-field">
                <span>Signature line</span>
                <input
                  type="text"
                  value={block.signatureLabel}
                  disabled={selectedDocumentReadOnly}
                  placeholder="Authorized signature"
                  onChange={(e) => {
                    updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, signatureLabel: e.target.value }))
                  }}
                />
              </label>
            </div>
            <div className="workhub-doc-master-page-toggles">
              <label className="workhub-doc-master-page-toggle">
                <input
                  type="checkbox"
                  checked={block.showDocumentTitle}
                  disabled={selectedDocumentReadOnly}
                  onChange={(e) => {
                    updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, showDocumentTitle: e.target.checked }))
                  }}
                />
                <span>Include document title</span>
              </label>
            </div>
            <label className="workhub-doc-master-page-field is-block">
              <span>Address or notes</span>
              <textarea
                rows={4}
                value={block.address}
                disabled={selectedDocumentReadOnly}
                placeholder="Street address, company details, or signature notes"
                onChange={(e) => {
                  updateMasterPageBlock(activeMasterVariantKey, sectionKey, (current) => ({ ...current, address: e.target.value }))
                }}
              />
            </label>
          </>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (!isQuickNote) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSelectedDocument()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void handleSaveSelectedDocument()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isQuickNote, closeSelectedDocument, handleSaveSelectedDocument])

  useEffect(() => {
    if (isQuickNote) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void handleSaveSelectedDocument()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isQuickNote, handleSaveSelectedDocument])

  if (isQuickNote && selectedDocument) {
    const projectName = selectedDocument.projectId ? (workspaceProjectById[selectedDocument.projectId]?.name || 'project') : null
    return (
      <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSelectedDocument() }}>
        <div className="workhub-modal workhub-quick-note-modal" onMouseDown={(event) => event.stopPropagation()}>
          <div className="workhub-quick-note-head">
            <div className="workhub-quick-note-head-left">
              <h2>Quick note</h2>
              {projectName && <span className="workhub-quick-note-location">{projectName}</span>}
              <span className={`workhub-note-autosave-status${showAutoSaveError ? ' is-error' : ''}`} aria-live="polite">
                {autoSaveStatusText}
              </span>
              {canReopenPublishWarning && (
                <button
                  type="button"
                  className="workhub-ghost-mini"
                  onClick={() => setShowPublishWarningBox(true)}
                >
                  Show warning
                </button>
              )}
            </div>
            <button
              type="button"
              className="workhub-ghost-btn workhub-quick-note-close"
              onClick={closeSelectedDocument}
              aria-label="Close quick note"
            >
              ?
            </button>
          </div>

          {recoverableDraftAvailable && (
            <div className="workhub-draft-restore-banner" role="status" aria-live="polite">
              <strong>Recovered draft available{recoverableDraftTimeLabel ? ` (${recoverableDraftTimeLabel})` : ''}.</strong>
              <div className="workhub-draft-restore-actions">
                <button type="button" className="workhub-primary-mini" onClick={handleRestoreRecoverableDraft}>Restore draft</button>
                <button type="button" className="workhub-ghost-mini" onClick={handleDiscardRecoverableDraft}>Discard draft</button>
              </div>
            </div>
          )}

          {collaborationConflictBlocked && (
            <div className="workhub-collaboration-conflict-banner" role="status" aria-live="polite">
              <strong>Newer collaborator changes detected.</strong>
              <span>
                {collaborationConflictEditorName}
                {collaborationConflictTimeLabel ? ` updated this document at ${collaborationConflictTimeLabel}.` : ' updated this document while you were editing.'}
                {' '}Load latest to review their updates, or keep yours to continue with your local version.
              </span>
              <div className="workhub-draft-restore-actions">
                <button type="button" className="workhub-primary-mini" onClick={handleApplyCollaborationRemoteUpdate}>Load latest</button>
                <button type="button" className="workhub-ghost-mini" onClick={handleKeepLocalEditsAfterConflict}>Keep my edits</button>
              </div>
            </div>
          )}

          {showPublishWarningBox && publicReferenceAutoSaveBlocked && selectedDocumentChanged && (
            <div className="workhub-reference-publish-warning" role="status" aria-live="polite">
              <strong>Public update pending.</strong>
              <span>This content is referenced by other folders. Autosave is paused until you publish.</span>
              <button
                type="button"
                className="workhub-primary-mini"
                onClick={() => {
                  dismissPublishWarningForVisit()
                  void handleSaveSelectedDocument()
                }}
              >
                Publish update
              </button>
              <button
                type="button"
                className="workhub-ghost-mini"
                onClick={() => {
                  dismissPublishWarningForVisit()
                  setCopyTabMode('select')
                  setCopyTabSelection([])
                  setCopyToFolderDialogOpen(true)
                }}
              >
                Manage references
              </button>
              <button
                type="button"
                className="workhub-ghost-mini"
                onClick={dismissPublishWarningForVisit}
              >
                Dismiss
              </button>
            </div>
          )}

          {selectedDocumentReadOnly ? (
            <div
              className="workhub-document-static-viewer workhub-quick-note-static-viewer"
              dir="auto"
              dangerouslySetInnerHTML={{ __html: staticDocumentBodyHtml }}
            />
          ) : (
            <TinyRichTextEditor
              className="workhub-document-body-editor workhub-quick-note-editor"
              value={selectedDocumentBodyDraft}
              onChange={setSelectedDocumentBodyDraft}
              minHeight={420}
              placeholder="Write a quick idea, reminder, or short note..."
              autoFocus
            />
          )}

          <div className="workhub-quick-note-foot">
            <div className="workhub-quick-note-foot-left">
              {!selectedDocumentReadOnly && (
                <button
                  type="button"
                  className="workhub-ghost-btn workhub-quick-note-share-btn"
                  onClick={() => setShareDocDialogOpen(true)}
                  title="Share with colleague"
                  aria-label="Share note with a colleague"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="12" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="13" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="4" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="10.3" y1="3.9" x2="5.7" y2="7.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="5.7" y1="8.9" x2="10.3" y2="12.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {shareSelectedCount > 0 && <span className="workhub-quick-note-share-count">{shareSelectedCount}</span>}
                </button>
              )}
            </div>
            <span className="workhub-quick-note-esc-hint"><kbd>Esc</kbd> to close � <kbd>Ctrl S</kbd> to save</span>
            <div className="workhub-quick-note-actions">
              {selectedDocumentCanEdit && !selectedDocumentLocked ? (
                <button
                  type="button"
                  className="workhub-danger-btn"
                  disabled={busyKey === `document-delete:${selectedDocument.id}`}
                  onClick={() => {
                    if (!window.confirm('Delete this note?')) return
                    void handleDeleteSelectedDocument()
                  }}
                >
                  {busyKey === `document-delete:${selectedDocument.id}` ? 'Deleting�' : 'Delete'}
                </button>
              ) : null}
              <button type="button" className="workhub-primary-btn" onClick={closeSelectedDocument}>Done</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <input
        ref={logoAssetInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(event) => { void handleLogoAssetInputChange(event) }}
      />
      <input
        ref={workspaceAssetInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(event) => { void handleWorkspaceAssetInputChange(event) }}
      />
      <main className="workhub-section-stack workhub-notes-content-area">
        <div className="workhub-notes-layout">
          <section className="workhub-panel workhub-documents-panel">
            {taskContextTrail.length > 0 && (
              <div className="workhub-task-context-strip" role="navigation" aria-label="Current item path">
                <div className="workhub-task-context-path">
                  {taskContextTrail.map((project, index) => {
                    const isCurrent = index === taskContextTrail.length - 1
                    const icon = taskContextIconByProjectId[project.id] || '??'
                    const iconKind = icon === '??' ? 'project' : 'folder'
                    return (
                      <div key={project.id} className="workhub-task-context-node-wrap">
                        <button
                          type="button"
                          className={`workhub-task-context-node${isCurrent ? ' is-current' : ''}`}
                          onClick={() => onSelectProject(project.id)}
                          title={project.name}
                          aria-current={isCurrent ? 'page' : undefined}
                        >
                          <span className={`workhub-task-context-node-icon is-${iconKind}-kind`} aria-hidden="true">{icon}</span>
                          <span className="workhub-task-context-node-text">
                            <span className="workhub-task-context-node-title">{project.name}</span>
                          </span>
                        </button>
                        {!isCurrent && <span className="workhub-task-context-sep" aria-hidden="true">�</span>}
                      </div>
                    )
                  })}
                </div>
                {(selectedProjectPeriodLabel || selectedProjectSubmissionTimeLabel) && (
                  <div className="workhub-task-context-period" title="Proposal period">
                    {selectedProjectPeriodLabel && <span><strong>Period:</strong> {selectedProjectPeriodLabel}</span>}
                    {selectedProjectSubmissionTimeLabel && <span className="workhub-ltr-token">{selectedProjectSubmissionTimeLabel}</span>}
                  </div>
                )}
              </div>
            )}
            <div className="workhub-panel-head">
              <div className="workhub-documents-head-main">
                {selectedDocument ? (
                  <div className="workhub-documents-title-row">
                    <span className="workhub-documents-title-icon" aria-hidden="true">{selectedDocumentIcon}</span>
                    <input
                      className="workhub-documents-title-input"
                      value={selectedDocumentTitleDraft}
                      onChange={(event) => setSelectedDocumentTitleDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return
                        event.preventDefault()
                        event.currentTarget.blur()
                        if (!selectedDocumentChanged || busyKey === `document:${selectedDocument?.id || ''}`) return
                        void handleSaveSelectedDocument()
                      }}
                      placeholder="Document name"
                      disabled={selectedDocumentReadOnly}
                    />
                    {showPublicSourceWarning && (
                      <span className="workhub-public-source-chip" title="This is a public source document with active references.">?? Public source</span>
                    )}
                  </div>
                ) : (
                  <h2>Documents</h2>
                )}
              </div>
              <div className="workhub-panel-tools">
                {!selectedDocumentLocked && (
                  <button
                    className="workhub-ghost-btn workhub-doc-tool-btn"
                    title="New document"
                    aria-label="New document"
                    onClick={() => openDocumentCreateDialog(selectedProjectId !== 'all' ? selectedProjectId : '')}
                  >
                    {'??'}
                  </button>
                )}
                {!selectedDocumentLocked && (
                  <button
                    type="button"
                    className={`workhub-doc-ai-btn workhub-doc-ai-btn-secondary workhub-doc-ai-voice-btn${isHeaderVoiceListening ? ' is-listening' : ''}`}
                    title={isHeaderVoiceListening ? 'Stop voice recording' : 'Start voice recording'}
                    aria-label={isHeaderVoiceListening ? 'Stop voice recording' : 'Start voice recording'}
                    disabled={!selectedDocument || !documentEditor || !headerSpeechRecognitionSupported}
                    onClick={() => {
                      handleHeaderVoiceInput()
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 4a3 3 0 0 1 3 3v4a3 3 0 1 1-6 0V7a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M6 11a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M12 17v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span className="workhub-doc-ai-voice-pulse" aria-hidden="true" />
                  </button>
                )}
                {selectedDocument && !selectedDocumentLocked ? (
                  <button
                    className="workhub-ghost-btn workhub-doc-tool-btn"
                    onClick={() => { setShareDocDialogOpen(true) }}
                    title="Share document"
                    aria-label="Share document"
                    disabled={!selectedDocumentCanEdit}
                  >
                    {'??'}
                  </button>
                ) : null}
                {selectedDocument && !selectedDocumentLocked ? (
                  <button
                    className="workhub-ghost-btn workhub-doc-tool-btn"
                    onClick={() => {
                      setCopyTabMode('select')
                      setCopyTabSelection([])
                      setCopyToFolderDialogOpen(true)
                    }}
                    title="Reference in folder"
                    aria-label="Reference document in folder"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8"/>
                      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
                      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                ) : null}
                {/* Lock � anyone who can edit can lock */}
                {selectedDocument && selectedDocumentCanEdit && !selectedDocumentLocked ? (
                  <button
                    className="workhub-ghost-btn workhub-doc-tool-btn"
                    disabled={busyKey === `document-lock:${selectedDocument.id}`}
                    onClick={() => { void handleToggleSelectedDocumentLock() }}
                    title="Lock document"
                    aria-label="Lock document"
                  >
                    {busyKey === `document-lock:${selectedDocument.id}` ? '?' : '??'}
                  </button>
                ) : null}
                {/* Unlock � only creator or admins */}
                {selectedDocument && canUnlockDocument ? (
                  <button
                    className="workhub-ghost-btn workhub-doc-tool-btn"
                    disabled={busyKey === `document-lock:${selectedDocument.id}`}
                    onClick={() => { void handleToggleSelectedDocumentLock() }}
                    title="Unlock document"
                    aria-label="Unlock document"
                  >
                    {busyKey === `document-lock:${selectedDocument.id}` ? '?' : '??'}
                  </button>
                ) : null}

                {selectedDocument && selectedDocumentCanEdit && !selectedDocumentLocked ? (
                  <button
                    className="workhub-danger-btn workhub-doc-tool-btn"
                    title="Delete document"
                    aria-label="Delete document"
                    disabled={busyKey === `document-delete:${selectedDocument.id}`}
                    onClick={() => {
                      if (!window.confirm('Delete this document?')) return
                      void handleDeleteSelectedDocument()
                    }}
                  >
                    {busyKey === `document-delete:${selectedDocument.id}` ? '?' : '??'}
                  </button>
                ) : null}
                {selectedDocument && (
                  <button
                    className={`workhub-ghost-btn workhub-doc-tool-btn${printPreviewMode ? ' is-active' : ''}`}
                    title={printPreviewMode ? 'Close print preview' : 'Open print preview'}
                    aria-label={printPreviewMode ? 'Close print preview' : 'Open print preview'}
                    onClick={() => {
                      const next = !printPreviewMode
                      setPrintPreviewMode(next)
                      if (next) {
                        setEditorPageMode(false)
                        saveDocumentViewMode(selectedDocument?.id, 'preview')
                      } else {
                        saveDocumentViewMode(selectedDocument?.id, editorPageMode ? 'page' : 'default')
                      }
                      if (next && !selectedDocument.referenceSourceDocumentId) {
                        setDetailRailCollapsed(true)
                        localStorage.setItem('workhub:docRailCollapsed', '1')
                      }
                      onPrintPreviewChange?.(next)
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
                      <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                  </button>
                )}
                {selectedDocument && !selectedDocumentReadOnly && !selectedDocument.referenceSourceDocumentId && (
                  <button
                    className={`workhub-ghost-btn workhub-doc-tool-btn${editorPageMode ? ' is-active' : ''}`}
                    title={editorPageMode ? 'Close page editor view' : 'Open page editor view'}
                    aria-label={editorPageMode ? 'Close page editor view' : 'Open page editor view'}
                    onClick={() => {
                      const next = !editorPageMode
                      setEditorPageMode(next)
                      if (next) {
                        setPrintPreviewMode(false)
                        saveDocumentViewMode(selectedDocument?.id, 'page')
                        setDetailRailCollapsed(true)
                        localStorage.setItem('workhub:docRailCollapsed', '1')
                      } else {
                        saveDocumentViewMode(selectedDocument?.id, printPreviewMode ? 'preview' : 'default')
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
                      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                      <line x1="7" y1="8" x2="17" y2="8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                      <line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                      <line x1="7" y1="16" x2="14" y2="16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
                {selectedDocument && (
                  <button
                    className="workhub-ghost-btn workhub-doc-tool-btn"
                    title="Export to PDF"
                    aria-label="Export to PDF"
                    onClick={handleExportPdf}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                      <text x="6" y="18" fontSize="6" fontWeight="700" fill="currentColor" fontFamily="Arial, sans-serif" letterSpacing="0.3">PDF</text>
                    </svg>
                  </button>
                )}
                {!selectedDocumentLocked && (
                  <>
                    <button
                      className="workhub-primary-btn workhub-doc-tool-btn"
                      title="Save document"
                      aria-label="Save document"
                      disabled={!selectedDocument || selectedDocumentReadOnly || !selectedDocumentChanged || busyKey === `document:${selectedDocument?.id || ''}`}
                      onClick={() => { void handleSaveSelectedDocument() }}
                      style={{ display: 'none' }}
                    >
                      {busyKey === `document:${selectedDocument?.id || ''}` ? '?' : '??'}
                    </button>
                    {selectedDocument && (
                      <>
                        {(printPreviewMode || editorPageMode) && (
                          <span className="workhub-preview-mode-badge" aria-live="polite">
                            <strong>{printPreviewMode ? 'Print preview' : 'Page editor'}</strong>
                            <span>{pageLayoutLabel}</span>
                          </span>
                        )}
                        <span className={`workhub-note-autosave-status${showAutoSaveError ? ' is-error' : ''}`} aria-live="polite">
                          {autoSaveStatusText}
                        </span>
                        {canReopenPublishWarning && (
                          <button
                            type="button"
                            className="workhub-ghost-mini"
                            onClick={() => setShowPublishWarningBox(true)}
                          >
                            Show warning
                          </button>
                        )}
                      </>
                    )}
                    {isMobileLayout && selectedDocument && (
                      <button
                        className="workhub-ghost-btn workhub-doc-tool-btn"
                        onClick={() => setMobileDocDetailsOpen(true)}
                        title="Details"
                        aria-label="Details"
                      >
                        ??
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {recoverableDraftAvailable && (
              <div className="workhub-draft-restore-banner" role="status" aria-live="polite">
                <strong>Recovered draft available{recoverableDraftTimeLabel ? ` (${recoverableDraftTimeLabel})` : ''}.</strong>
                <div className="workhub-draft-restore-actions">
                  <button type="button" className="workhub-primary-mini" onClick={handleRestoreRecoverableDraft}>Restore draft</button>
                  <button type="button" className="workhub-ghost-mini" onClick={handleDiscardRecoverableDraft}>Discard draft</button>
                </div>
              </div>
            )}

            {collaborationConflictBlocked && (
              <div className="workhub-collaboration-conflict-banner" role="status" aria-live="polite">
                <strong>Newer collaborator changes detected.</strong>
                <span>
                  {collaborationConflictEditorName}
                  {collaborationConflictTimeLabel ? ` updated this document at ${collaborationConflictTimeLabel}.` : ' updated this document while you were editing.'}
                  {' '}Load latest to review their updates, or keep yours to continue with your local version.
                </span>
                <div className="workhub-draft-restore-actions">
                  <button type="button" className="workhub-primary-mini" onClick={handleApplyCollaborationRemoteUpdate}>Load latest</button>
                  <button type="button" className="workhub-ghost-mini" onClick={handleKeepLocalEditsAfterConflict}>Keep my edits</button>
                </div>
              </div>
            )}

            {showPublishWarningBox && publicReferenceAutoSaveBlocked && selectedDocumentChanged && (
              <div className="workhub-reference-publish-warning" role="status" aria-live="polite">
                <strong>Public update pending.</strong>
                <span>This content is referenced by other folders. Autosave is paused until you publish.</span>
                <button
                  type="button"
                  className="workhub-primary-mini"
                  onClick={() => {
                    dismissPublishWarningForVisit()
                    void handleSaveSelectedDocument()
                  }}
                >
                  Publish update
                </button>
                <button
                  type="button"
                  className="workhub-ghost-mini"
                  onClick={() => {
                    dismissPublishWarningForVisit()
                    setCopyTabMode('select')
                    setCopyTabSelection([])
                    setCopyToFolderDialogOpen(true)
                  }}
                >
                  Manage references
                </button>
                <button
                  type="button"
                  className="workhub-ghost-mini"
                  onClick={dismissPublishWarningForVisit}
                >
                  Dismiss
                </button>
              </div>
            )}

            {selectedDocument ? (
              printPreviewMode ? (
                <div className="workhub-print-preview-wrap">
                  <iframe
                    title="Document print preview"
                    className="workhub-print-preview-frame"
                    srcDoc={debouncedPreviewHtml}
                  />
                </div>
              ) : selectedDocumentReadOnly ? (
                <div
                  className="workhub-document-static-viewer"
                  dir="auto"
                  dangerouslySetInnerHTML={{ __html: staticDocumentBodyHtml }}
                />
              ) : editorPageMode ? (
                <div className="workhub-editor-page-preview-wrap">
                  <div id="workhub-editor-page-toolbar" className="workhub-editor-page-toolbar" />
                  <div className="workhub-editor-page-paper">
                    <TinyRichTextEditor
                      className="workhub-document-body-editor workhub-document-body-editor-page"
                      value={selectedDocumentBodyDraft}
                      onChange={handleEditorChange}
                      minHeight={460}
                      contentPaddingPx={30}
                      placeholder="Write scope of work, requirements, assumptions, or any project details..."
                      onReady={handleDocumentEditorReady}
                      toolbarContainerSelector={pageEditorToolbarContainerSelector}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <TinyRichTextEditor
                    className="workhub-document-body-editor"
                    value={selectedDocumentBodyDraft}
                    onChange={handleEditorChange}
                    minHeight={460}
                    placeholder="Write scope of work, requirements, assumptions, or any project details..."
                    onReady={handleDocumentEditorReady}
                  />
                </>
              )
            ) : scopedWorkspaceDocuments.length === 0 ? (
              <div className="workhub-empty-state workhub-documents-empty-state">No documents yet. Use New document to add your first one.</div>
            ) : (
              <div className="workhub-empty-state workhub-documents-empty-state">Select a document from the sidebar tree to edit.</div>
            )}
          </section>

          {!isMobileLayout && (!selectedDocumentLocked || selectedDocument?.referenceSourceDocumentId) && (
            <div
              className={`workhub-rail-resize-handle${detailRailCollapsed ? ' is-collapsed' : ''}`}
              onPointerDown={handleRailResizePointerDown}
              onPointerMove={handleRailResizePointerMove}
              onPointerUp={handleRailResizePointerUp}
              title={detailRailCollapsed ? 'Expand details panel' : 'Drag to resize details panel'}
            >
              {detailRailCollapsed && (
                <button
                  type="button"
                  className="workhub-rail-toggle-btn"
                  onClick={handleToggleRailCollapse}
                  title="Expand details"
                  aria-label="Expand details"
                >
                  �
                </button>
              )}
            </div>
          )}

          <aside
            ref={detailRailRef}
            className={`workhub-doc-detail-rail${isMobileLayout ? ' is-mobile-drawer' : ''}${isMobileLayout && mobileDocDetailsOpen ? ' is-open' : ''}${!isMobileLayout && (detailRailCollapsed || (selectedDocumentLocked && !selectedDocument?.referenceSourceDocumentId)) ? ' is-hidden' : ''}`}
            style={!isMobileLayout ? { flexBasis: detailRailWidth, width: detailRailWidth } : undefined}
            aria-hidden={isMobileLayout ? !mobileDocDetailsOpen : (detailRailCollapsed || (selectedDocumentLocked && !selectedDocument?.referenceSourceDocumentId))}
          >
            {isMobileLayout && (
              <div className="workhub-mobile-detail-drawer-head">
                <button
                  type="button"
                  className="workhub-mobile-detail-drawer-handle"
                  aria-label="Close document details"
                  onClick={() => setMobileDocDetailsOpen(false)}
                />
                <div className="workhub-mobile-detail-drawer-title-row">
                  <strong>{detailRailTab === 'ai' ? 'AI assistant' : 'Details'}</strong>
                  <button type="button" className="workhub-ghost-mini" onClick={() => setMobileDocDetailsOpen(false)}>?</button>
                </div>
              </div>
            )}
            <div className="workhub-detail-rail-head">
              {selectedDocument?.referenceSourceDocumentId ? (
                <div className="workhub-detail-rail-tabs" role="tablist" aria-label="Detail rail sections">
                  <span className="workhub-detail-rail-tab is-active" style={{ cursor: 'default', padding: '0 14px' }}>Reference</span>
                </div>
              ) : (
                <div className="workhub-detail-rail-tabs" role="tablist" aria-label="Detail rail sections">
                  <button
                    type="button"
                    className={`workhub-detail-rail-tab${detailRailTab === 'details' ? ' is-active' : ''}`}
                    role="tab"
                    aria-selected={detailRailTab === 'details'}
                    onClick={() => setDetailRailTab('details')}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className={`workhub-detail-rail-tab${detailRailTab === 'ai' ? ' is-active' : ''}`}
                    role="tab"
                    aria-selected={detailRailTab === 'ai'}
                    onClick={() => setDetailRailTab('ai')}
                  >
                    AI assistant
                  </button>
                </div>
              )}
              <div className="workhub-detail-rail-head-actions">
                {selectedDocument && selectedDocumentCanEdit && !selectedDocument.referenceSourceDocumentId && (
                  <button
                    type="button"
                    className="workhub-ghost-mini"
                    onClick={() => onOpenDocumentSettings(selectedDocument.id)}
                    title={selectedDocument.type === 'note' ? 'Note settings' : 'Document settings'}
                    aria-label={selectedDocument.type === 'note' ? 'Note settings' : 'Document settings'}
                  >
                    ?
                  </button>
                )}
                {!isMobileLayout && (
                  <button
                    type="button"
                    className="workhub-ghost-mini"
                    onClick={handleToggleRailCollapse}
                    title="Collapse details"
                    aria-label="Collapse details"
                  >
                    �
                  </button>
                )}
              </div>
            </div>

            <div className={`workhub-detail-rail-body${detailRailTab === 'ai' ? ' is-ai' : ' is-details'}`}>
              {selectedDocument ? (
                selectedDocument.referenceSourceDocumentId ? (
                  // Simplified panel for reference documents: tabs list + discussion
                  <>
                    <div className="workhub-detail-card workhub-doc-tabs-card">
                      <div className="workhub-doc-tabs-card-head">
                        <h3>Referenced tabs</h3>
                      </div>
                      {documentTabsDraft.length === 0 ? (
                        <p className="workhub-doc-tabs-empty">No tabs in this reference.</p>
                      ) : (
                        <div className="workhub-doc-tabs-list">
                          {documentTabsDraft.map((tab) => (
                            <div
                              key={tab.id}
                              className={`workhub-doc-tab-row${tab.id === activeTabId ? ' is-active' : ''}`}
                            >
                              <button
                                type="button"
                                className="workhub-doc-tab-row-icon-btn"
                                title="Tab icon"
                                disabled
                              >
                                {tab.icon ?? '??'}
                              </button>
                              <button
                                type="button"
                                className="workhub-doc-tab-row-title"
                                onClick={() => handleSwitchTab(tab.id)}
                              >
                                {tab.title}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <WorkhubDiscussionCard
                      comments={discussionComments}
                      currentUid={currentUid}
                      memberByUid={memberByUid}
                      showAuthorAvatar
                      formatTime={formatTime}
                      editingId={discussionEditingId}
                      editingText={discussionEditingText}
                      onEditStart={onDiscussionEditStart}
                      onEditChange={onDiscussionEditChange}
                      onEditCancel={onDiscussionEditCancel}
                      onEditSave={onDiscussionEditSave}
                      onDelete={onDiscussionDelete}
                      editBusyKey={discussionEditBusyKey}
                      deleteBusyKey={discussionDeleteBusyKey}
                      onComposerSend={onDiscussionSend}
                      composerBusy={discussionBusy}
                      notifyMode={discussionNotifyMode}
                      notifyUids={discussionNotifyUids}
                      notifyCandidates={discussionNotifyCandidates}
                      onNotifyModeChange={onDiscussionNotifyModeChange}
                      onNotifyUidsChange={onDiscussionNotifyUidsChange}
                    />
                  </>
                ) :
                detailRailTab === 'details' ? (
                  <>
                <details className="workhub-detail-collapsible-info">
                  <summary>{selectedDocument.type === 'note' ? 'Note information' : 'Document information'}</summary>
                  <div className="workhub-detail-meta">
                    <span>Created by: {memberByUid[selectedDocument.createdBy]?.displayName || memberByUid[selectedDocument.createdBy]?.email || selectedDocument.createdBy}</span>
                    <span>Created: {formatTime(selectedDocument.createdAt)}</span>
                    <span>Updated: {formatTime(selectedDocument.updatedAt)}</span>
                    {selectedDocument.isLocked && (
                      <span>Locked by: {memberByUid[selectedDocument.lockedBy as string]?.displayName || selectedDocument.lockedBy}</span>
                    )}
                    {selectedDocument.projectId && (
                      <span>Project: {workspaceProjectById[selectedDocument.projectId]?.name || selectedDocument.projectId}</span>
                    )}
                  </div>
                </details>

                {selectedDocument.referenceSourceDocumentId && (
                  <div className="workhub-detail-card workhub-source-document-card">
                    <h3>Source document</h3>
                    <div className="workhub-source-document-meta">
                      <span>Document ID: {selectedDocument.referenceSourceDocumentId}</span>
                      <span>Workspace ID: {selectedDocument.referenceSourceWorkspaceId || 'Unknown'}</span>
                      {selectedDocument.referenceSourceProjectId && <span>Folder ID: {selectedDocument.referenceSourceProjectId}</span>}
                    </div>
                    <button
                      type="button"
                      className="workhub-ghost-btn"
                      onClick={handleOpenReferenceSourceDocument}
                    >
                      Open source document
                    </button>
                  </div>
                )}

                {Array.isArray(selectedDocument.editedBy) && selectedDocument.editedBy.length > 0 && (
                  <div className="workhub-detail-card">
                    <h3>Edit history</h3>
                    <div className="workhub-doc-edit-history">
                      {[...selectedDocument.editedBy].reverse().map((entry) => (
                        <div key={entry.uid + entry.at} className="workhub-doc-edit-entry">
                          <span className="workhub-doc-edit-name">{memberByUid[entry.uid]?.displayName || memberByUid[entry.uid]?.email || entry.uid}</span>
                          <span className="workhub-doc-edit-time">{entry.at ? new Date(entry.at).toLocaleString('en-GB') : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="workhub-detail-card workhub-doc-tabs-card">
                  <div className="workhub-doc-tabs-card-head">
                    <h3>Tabs</h3>
                    {!selectedDocumentReadOnly && (
                      <button
                        type="button"
                        className="workhub-ghost-mini"
                        onClick={handleAddTab}
                        title={documentTabsDraft.length === 0 ? 'Enable tabs for this document' : 'Add a new tab'}
                        aria-label="Add tab"
                      >
                        + Add
                      </button>
                    )}
                  </div>

                  {documentTabsDraft.length === 0 ? (
                    <p className="workhub-doc-tabs-empty">No tabs yet. Add a tab to split this document into sections.</p>
                  ) : (
                    <div className="workhub-doc-tabs-list">
                      {documentTabsDraft.map((tab) => (
                        <div
                          key={tab.id}
                          className={`workhub-doc-tab-row${tab.id === activeTabId ? ' is-active' : ''}`}
                          draggable={!selectedDocumentReadOnly}
                          onDragStart={() => handleTabDragStart(tab.id)}
                          onDragOver={(e) => handleTabDragOver(e, tab.id)}
                          onDragEnd={handleTabDragEnd}
                        >
                          {/* Drag handle */}
                          {!selectedDocumentReadOnly && (
                            <span className="workhub-doc-tab-row-drag" aria-hidden="true" title="Drag to reorder">?</span>
                          )}

                          {/* Icon badge � click to open picker */}
                          <button
                            type="button"
                            className="workhub-doc-tab-row-icon-btn"
                            title="Set icon"
                            aria-label="Set tab icon"
                            disabled={selectedDocumentReadOnly}
                            onClick={(e) => {
                              const next = iconPickerTabId === tab.id ? null : tab.id
                              setIconPickerTabId(next)
                              setIconPickerAnchorEl(next ? e.currentTarget : null)
                            }}
                          >
                            {tab.icon ?? '??'}
                          </button>

                          {/* Title � click to navigate, double-click to rename */}
                          {renamingTabId === tab.id ? (
                            <input
                              ref={renameInputRef}
                              className="workhub-doc-tab-rename-input"
                              value={renamingTabTitle}
                              onChange={(e) => setRenamingTabTitle(e.target.value)}
                              onBlur={handleCommitRename}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); handleCommitRename() }
                                if (e.key === 'Escape') { setRenamingTabId(null); setRenamingTabTitle('') }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className={`workhub-doc-tab-row-title${sourceReferencedTabIds.includes(tab.id) ? ' is-public' : ''}`}
                              onClick={() => handleSwitchTab(tab.id)}
                              onDoubleClick={() => { if (!selectedDocumentReadOnly) handleStartRename(tab) }}
                              title={tab.id === activeTabId ? 'Currently viewing' : 'Switch to this tab'}
                            >
                              {tab.title}
                              {sourceReferencedTabIds.includes(tab.id) ? ' ??' : ''}
                              {selectedDocument.referenceSourceDocumentId ? ' ??' : ''}
                            </button>
                          )}

                          {/* Actions */}
                          {!selectedDocumentReadOnly && (
                            <div className="workhub-doc-tab-row-actions">
                              <button
                                type="button"
                                className="workhub-ghost-mini"
                                title="Rename"
                                aria-label="Rename tab"
                                onClick={() => handleStartRename(tab)}
                              >
                                ?
                              </button>
                              {documentTabsDraft.length > 1 && pendingDeleteTabId !== tab.id && (
                                <button
                                  type="button"
                                  className="workhub-ghost-mini is-danger"
                                  title="Remove tab"
                                  aria-label="Remove tab"
                                  onClick={() => handleDeleteTab(tab.id)}
                                >
                                  �
                                </button>
                              )}
                              {pendingDeleteTabId === tab.id && (
                                <span className="workhub-tab-delete-confirm">
                                  <span className="workhub-tab-delete-confirm-label">Delete?</span>
                                  <button
                                    type="button"
                                    className="workhub-ghost-mini is-danger"
                                    title="Confirm delete"
                                    aria-label="Confirm delete tab"
                                    onClick={handleConfirmDeleteTab}
                                  >
                                    ?
                                  </button>
                                  <button
                                    type="button"
                                    className="workhub-ghost-mini"
                                    title="Cancel"
                                    aria-label="Cancel delete tab"
                                    onClick={handleCancelDeleteTab}
                                  >
                                    ?
                                  </button>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Icon picker popup */}
                          {iconPickerTabId === tab.id && (
                            <EmojiPickerPopover
                              value={tab.icon}
                              emojis={EMOJI_SET_DOCUMENTS}
                              anchorEl={iconPickerAnchorEl}
                              onSelect={(emoji) => {
                                setDocumentTabsDraft((prev) => prev.map((t) => t.id === tab.id ? { ...t, icon: emoji } : t))
                              }}
                              onClear={tab.icon ? () => {
                                setDocumentTabsDraft((prev) => prev.map((t) => t.id === tab.id ? { ...t, icon: undefined } : t))
                              } : undefined}
                              onClose={() => { setIconPickerTabId(null); setIconPickerAnchorEl(null) }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="workhub-doc-print-settings-section">
                  <button
                    type="button"
                    className={`workhub-doc-print-settings-toggle${masterPageSectionExpanded ? ' is-open' : ''}`}
                    onClick={() => setMasterPageSectionExpanded((v) => !v)}
                  >
                    <span className="toggle-label">
                      <span>Page Settings</span>
                      <span className="toggle-status">{normalizedMasterPage.pageSize} � {normalizedMasterPage.orientation}</span>
                    </span>
                    <span className="toggle-chevron">�</span>
                  </button>
                  {masterPageSectionExpanded && (
                    <div className="workhub-doc-print-settings-body">

                <div className="workhub-detail-card workhub-doc-master-page-card">
                  <div className="workhub-doc-tabs-card-head">
                    <h3>Master Page</h3>
                    <span className="workhub-doc-master-page-status">
                      {normalizedMasterPage.pageSize} � {normalizedMasterPage.orientation}
                    </span>
                  </div>
                  <div className="workhub-doc-master-page-grid">
                    <label className="workhub-doc-master-page-field">
                      <span>Page size</span>
                      <select
                        value={normalizedMasterPage.pageSize}
                        disabled={selectedDocumentReadOnly}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, pageSize: e.target.value as WorkhubDocumentMasterPage['pageSize'] }))
                        }}
                      >
                        <option value="A4">A4</option>
                        <option value="Letter">Letter</option>
                        <option value="Legal">Legal</option>
                        <option value="A3">A3</option>
                      </select>
                    </label>
                    <label className="workhub-doc-master-page-field">
                      <span>Orientation</span>
                      <select
                        value={normalizedMasterPage.orientation}
                        disabled={selectedDocumentReadOnly}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, orientation: e.target.value as WorkhubDocumentMasterPage['orientation'] }))
                        }}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                      </select>
                    </label>
                  </div>

                  <div className="workhub-doc-master-page-grid is-margins">
                    <label className="workhub-doc-master-page-field">
                      <span>Top margin</span>
                      <input
                        type="number"
                        min={8}
                        max={40}
                        value={normalizedMasterPage.marginTopMm}
                        disabled={selectedDocumentReadOnly}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => updateMasterPageMargin(current, 'marginTopMm', e.target.value))
                        }}
                      />
                    </label>
                    <label className="workhub-doc-master-page-field">
                      <span>Right margin</span>
                      <input
                        type="number"
                        min={8}
                        max={40}
                        value={normalizedMasterPage.marginRightMm}
                        disabled={selectedDocumentReadOnly}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => updateMasterPageMargin(current, 'marginRightMm', e.target.value))
                        }}
                      />
                    </label>
                    <label className="workhub-doc-master-page-field">
                      <span>Bottom margin</span>
                      <input
                        type="number"
                        min={8}
                        max={40}
                        value={normalizedMasterPage.marginBottomMm}
                        disabled={selectedDocumentReadOnly}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => updateMasterPageMargin(current, 'marginBottomMm', e.target.value))
                        }}
                      />
                    </label>
                    <label className="workhub-doc-master-page-field">
                      <span>Left margin</span>
                      <input
                        type="number"
                        min={8}
                        max={40}
                        value={normalizedMasterPage.marginLeftMm}
                        disabled={selectedDocumentReadOnly}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => updateMasterPageMargin(current, 'marginLeftMm', e.target.value))
                        }}
                      />
                    </label>
                  </div>

                  <div className="workhub-doc-master-page-variant-tabs" role="tablist" aria-label="Master page variants">
                    <button
                      type="button"
                      className={`workhub-doc-master-page-variant-tab${activeMasterVariantKey === 'firstPage' ? ' is-active' : ''}`}
                      onClick={() => setActiveMasterVariantKey('firstPage')}
                    >
                      First page
                    </button>
                    <button
                      type="button"
                      className={`workhub-doc-master-page-variant-tab${activeMasterVariantKey === 'laterPages' ? ' is-active' : ''}`}
                      onClick={() => setActiveMasterVariantKey('laterPages')}
                    >
                      Later pages
                    </button>
                    <button
                      type="button"
                      className="workhub-ghost-mini"
                      disabled={selectedDocumentReadOnly}
                      onClick={() => handleCopyVariant(activeMasterVariantKey, activeMasterVariantKey === 'firstPage' ? 'laterPages' : 'firstPage')}
                    >
                      Copy to {activeMasterVariantKey === 'firstPage' ? 'later pages' : 'first page'}
                    </button>
                  </div>

                  {renderMasterPageBlockEditor('header', 'Header')}
                  {renderMasterPageBlockEditor('footer', 'Footer')}

                  <p className="workhub-doc-master-page-note">
                    Structured fields cover the common logo, title, address, and signature cases. Custom HTML remains available when you need tighter control. Preview shows first and later page variants separately; export still depends on the browser print engine for final pagination.
                  </p>
                </div>

                {/* Cover Page card */}
                <div className="workhub-detail-card">
                  <div className="workhub-doc-tabs-card-head">
                    <h3>Cover Page</h3>
                  </div>
                  <div className="workhub-doc-master-page-grid">
                    <label className="workhub-doc-master-page-field workhub-doc-master-page-field--toggle">
                      <span>Enable cover page</span>
                      <input
                        type="checkbox"
                        checked={normalizedMasterPage.showCoverPage}
                        disabled={selectedDocumentReadOnly}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, showCoverPage: e.target.checked }))
                        }}
                      />
                    </label>
                    <label className="workhub-doc-master-page-field">
                      <span>Cover theme</span>
                      <select
                        value={normalizedMasterPage.coverTheme}
                        disabled={selectedDocumentReadOnly || !normalizedMasterPage.showCoverPage}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, coverTheme: e.target.value }))
                        }}
                      >
                        {COVER_THEMES.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="workhub-doc-master-page-field">
                      <span>Cover date</span>
                      <select
                        value={normalizedMasterPage.coverDateMode}
                        disabled={selectedDocumentReadOnly || !normalizedMasterPage.showCoverPage}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, coverDateMode: e.target.value as WorkhubDocumentMasterPage['coverDateMode'] }))
                        }}
                      >
                        <option value="none">No date</option>
                        <option value="creation">Document creation date</option>
                        <option value="print">Date of printing</option>
                      </select>
                    </label>
                    <label className="workhub-doc-master-page-field workhub-doc-master-page-field--toggle">
                      <span>Show document name</span>
                      <input
                        type="checkbox"
                        checked={normalizedMasterPage.coverShowDocumentName}
                        disabled={selectedDocumentReadOnly || !normalizedMasterPage.showCoverPage}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, coverShowDocumentName: e.target.checked }))
                        }}
                      />
                    </label>
                    <label className="workhub-doc-master-page-field">
                      <span>Cover tag line</span>
                      <input
                        type="text"
                        value={normalizedMasterPage.coverTagLine}
                        disabled={selectedDocumentReadOnly || !normalizedMasterPage.showCoverPage}
                        placeholder="e.g. Confidential � Internal use"
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, coverTagLine: e.target.value }))
                        }}
                      />
                    </label>
                    <label className="workhub-doc-master-page-field workhub-doc-master-page-field--toggle">
                      <span>Show tab name</span>
                      <input
                        type="checkbox"
                        checked={normalizedMasterPage.coverShowTabName}
                        disabled={selectedDocumentReadOnly || !normalizedMasterPage.showCoverPage}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, coverShowTabName: e.target.checked }))
                        }}
                      />
                    </label>
                  </div>
                  <p className="workhub-doc-master-page-note">
                    Cover page inherits the logo and company info from the first page header. Enable the header on the first page tab to set them.
                  </p>
                </div>

                {/* Watermark card */}
                <div className="workhub-detail-card">
                  <div className="workhub-doc-tabs-card-head">
                    <h3>Watermark</h3>
                    {normalizedMasterPage.watermarkLogoUrl ? (
                      <button
                        type="button"
                        className="workhub-ghost-mini is-danger"
                        disabled={selectedDocumentReadOnly}
                        onClick={() => updateMasterPageDraft((current) => ({ ...current, watermarkLogoUrl: '' }))}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <div className="workhub-doc-master-page-grid">
                    <label className="workhub-doc-master-page-field workhub-doc-master-page-field--toggle">
                      <span>Enable watermark</span>
                      <input
                        type="checkbox"
                        checked={normalizedMasterPage.showWatermark}
                        disabled={selectedDocumentReadOnly}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, showWatermark: e.target.checked }))
                        }}
                      />
                    </label>
                    <label className="workhub-doc-master-page-field">
                      <span>Layout</span>
                      <select
                        value={normalizedMasterPage.watermarkLayout}
                        disabled={selectedDocumentReadOnly || !normalizedMasterPage.showWatermark}
                        onChange={(e) => {
                          updateMasterPageDraft((current) => ({ ...current, watermarkLayout: e.target.value as WorkhubDocumentMasterPage['watermarkLayout'] }))
                        }}
                      >
                        <option value="center">Center only</option>
                        <option value="triple">Center + top-right + bottom-left corners</option>
                      </select>
                    </label>
                  </div>

                  {/* Scale + opacity sliders */}
                  <div className="workhub-doc-master-page-grid is-margins">
                    <label className="workhub-doc-master-page-field is-block">
                      <span>Center scale � {normalizedMasterPage.watermarkScale}%</span>
                      <input
                        type="range"
                        min={10} max={100} step={5}
                        value={normalizedMasterPage.watermarkScale}
                        disabled={selectedDocumentReadOnly || !normalizedMasterPage.showWatermark}
                        onChange={(e) => updateMasterPageDraft((current) => ({ ...current, watermarkScale: Number(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                    </label>
                    <label className="workhub-doc-master-page-field is-block">
                      <span>Center opacity � {normalizedMasterPage.watermarkOpacity}%</span>
                      <input
                        type="range"
                        min={1} max={30} step={1}
                        value={normalizedMasterPage.watermarkOpacity}
                        disabled={selectedDocumentReadOnly || !normalizedMasterPage.showWatermark}
                        onChange={(e) => updateMasterPageDraft((current) => ({ ...current, watermarkOpacity: Number(e.target.value) }))}
                        style={{ width: '100%' }}
                      />
                    </label>
                    {normalizedMasterPage.watermarkLayout === 'triple' && (
                      <>
                        <label className="workhub-doc-master-page-field is-block">
                          <span>Corner size � {normalizedMasterPage.watermarkCornerScale}%</span>
                          <input
                            type="range"
                            min={10} max={80} step={5}
                            value={normalizedMasterPage.watermarkCornerScale}
                            disabled={selectedDocumentReadOnly || !normalizedMasterPage.showWatermark}
                            onChange={(e) => updateMasterPageDraft((current) => ({ ...current, watermarkCornerScale: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                        </label>
                        <label className="workhub-doc-master-page-field is-block">
                          <span>Corner opacity � {normalizedMasterPage.watermarkCornerOpacity}%</span>
                          <input
                            type="range"
                            min={1} max={20} step={1}
                            value={normalizedMasterPage.watermarkCornerOpacity}
                            disabled={selectedDocumentReadOnly || !normalizedMasterPage.showWatermark}
                            onChange={(e) => updateMasterPageDraft((current) => ({ ...current, watermarkCornerOpacity: Number(e.target.value) }))}
                            style={{ width: '100%' }}
                          />
                        </label>
                      </>
                    )}
                  </div>

                  {normalizedMasterPage.watermarkLogoUrl ? (
                    <div className="workhub-doc-master-page-logo-preview">
                      <img src={normalizedMasterPage.watermarkLogoUrl} alt="Watermark asset" />
                    </div>
                  ) : (
                    <div className="workhub-doc-master-page-logo-empty">No watermark image selected � pick one from workspace assets below</div>
                  )}
                  <div className="workhub-doc-master-page-asset-grid">
                    {workspaceAssetLibraryUrls.length > 0 ? workspaceAssetLibraryUrls.map((assetUrl) => (
                      <button
                        key={assetUrl}
                        type="button"
                        className={`workhub-doc-master-page-asset-option${normalizedMasterPage.watermarkLogoUrl === assetUrl ? ' is-active' : ''}`}
                        disabled={selectedDocumentReadOnly || !normalizedMasterPage.showWatermark}
                        onClick={() => updateMasterPageDraft((current) => ({ ...current, watermarkLogoUrl: assetUrl }))}
                        title="Use as watermark"
                      >
                        <img src={assetUrl} alt="Workspace asset" />
                      </button>
                    )) : (
                      <div className="workhub-doc-master-page-logo-empty">No workspace assets yet � upload one in the Asset Library below.</div>
                    )}
                  </div>
                  <p className="workhub-doc-master-page-note">
                    Watermark is skipped on the cover page. For best results use a single-color outline logo (PNG with transparency).
                  </p>
                </div>

                <div className="workhub-detail-card workhub-doc-asset-library-card">
                  <div className="workhub-doc-tabs-card-head">
                    <h3>Workspace Asset Library</h3>
                    <button
                      type="button"
                      className="workhub-ghost-mini"
                      disabled={selectedDocumentReadOnly || uploadingWorkspaceAssetLibraryImage}
                      onClick={() => workspaceAssetInputRef.current?.click()}
                    >
                      {uploadingWorkspaceAssetLibraryImage ? 'Uploading�' : 'Upload asset'}
                    </button>
                  </div>
                  <p className="workhub-doc-asset-library-note">
                    Upload workspace-level brand assets once, then reuse them across documents. Choose an asset below to apply it to the current {activeMasterVariantKey === 'firstPage' ? 'first page' : 'later pages'} header or footer.
                  </p>
                  {workspaceAssetLibraryLoading ? (
                    <div className="workhub-doc-master-page-logo-empty">Loading workspace assets�</div>
                  ) : workspaceAssetLibraryUrls.length > 0 ? (
                    <div className="workhub-doc-asset-library-grid">
                      {workspaceAssetLibraryUrls.map((assetUrl) => (
                        <div key={assetUrl} className="workhub-doc-asset-library-item">
                          <button
                            type="button"
                            className="workhub-doc-asset-library-preview"
                            onClick={() => openAttachmentLightbox(assetUrl)}
                            title="Preview asset"
                          >
                            <img src={assetUrl} alt="Workspace asset" />
                          </button>
                          <div className="workhub-doc-asset-library-actions">
                            <button
                              type="button"
                              className="workhub-ghost-mini"
                              disabled={selectedDocumentReadOnly}
                              onClick={() => updateMasterPageBlock(activeMasterVariantKey, 'header', (current) => ({ ...current, logoUrl: assetUrl }))}
                            >
                              Header
                            </button>
                            <button
                              type="button"
                              className="workhub-ghost-mini"
                              disabled={selectedDocumentReadOnly}
                              onClick={() => updateMasterPageBlock(activeMasterVariantKey, 'footer', (current) => ({ ...current, logoUrl: assetUrl }))}
                            >
                              Footer
                            </button>
                            <button
                              type="button"
                              className="workhub-ghost-mini"
                              disabled={selectedDocumentReadOnly}
                              onClick={() => updateMasterPageDraft((current) => ({ ...current, watermarkLogoUrl: assetUrl }))}
                            >
                              Watermark
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="workhub-doc-master-page-logo-empty">No workspace assets uploaded yet.</div>
                  )}
                </div>

                    </div>
                  )}
                </div>

                <WorkhubChecklistCard
                  title="Checklist"
                  items={getDocChecklist(selectedDocument)}
                  readOnly={selectedDocumentReadOnly}
                  draftValue={docChecklistDraft}
                  onDraftChange={setDocChecklistDraft}
                  onAdd={handleDocChecklistAdd}
                  editingItemId={editingDocChecklistItemId}
                  editingItemText={editingDocChecklistItemText}
                  onEditingItemTextChange={setEditingDocChecklistItemText}
                  onEditStart={(item) => {
                    setEditingDocChecklistItemId(item.id)
                    setEditingDocChecklistItemText(item.text)
                  }}
                  onEditSave={(item) => {
                    handleDocChecklistEditSave(item.id)
                  }}
                  onEditCancel={() => {
                    setEditingDocChecklistItemId(null)
                    setEditingDocChecklistItemText('')
                  }}
                  onToggle={(item, checked) => {
                    handleDocChecklistToggle(item.id, checked)
                  }}
                  onRemove={(item) => {
                    handleDocChecklistRemove(item.id)
                  }}
                />

                <WorkhubDiscussionCard
                  comments={discussionComments}
                  currentUid={currentUid}
                  memberByUid={memberByUid}
                  showAuthorAvatar
                  formatTime={formatTime}
                  editingId={discussionEditingId}
                  editingText={discussionEditingText}
                  onEditStart={onDiscussionEditStart}
                  onEditChange={onDiscussionEditChange}
                  onEditCancel={onDiscussionEditCancel}
                  onEditSave={onDiscussionEditSave}
                  onDelete={onDiscussionDelete}
                  editBusyKey={discussionEditBusyKey}
                  deleteBusyKey={discussionDeleteBusyKey}
                  onComposerSend={onDiscussionSend}
                  composerBusy={discussionBusy}
                  notifyMode={discussionNotifyMode}
                  notifyUids={discussionNotifyUids}
                  notifyCandidates={discussionNotifyCandidates}
                  onNotifyModeChange={onDiscussionNotifyModeChange}
                  onNotifyUidsChange={onDiscussionNotifyUidsChange}
                />

                <WorkhubAttachmentCard
                  title="Attachments"
                  attachments={selectedDocument.attachments || []}
                  readOnly={selectedDocumentReadOnly}
                  draftValue={docAttachmentDraft}
                  onDraftChange={setDocAttachmentDraft}
                  onAddUrl={handleDocAttachmentAdd}
                  uploading={uploadingDocAttachment}
                  onUploadFiles={(files) => {
                    void handleDocAttachmentFileUpload(files)
                  }}
                  isImageUrl={isImageAttachmentUrl}
                  onOpenImage={openAttachmentLightbox}
                  onRemove={handleDocAttachmentRemove}
                />

                <div className="workhub-detail-card">
                  <h3>Links</h3>
                  {!selectedDocumentReadOnly && (
                    <div className="workhub-checklist-url-row compact-row">
                      <input
                        type="url"
                        value={docLinkDraft}
                        onChange={(e) => setDocLinkDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleDocLinkAdd() } }}
                        placeholder="Link URL"
                      />
                      <button type="button" onClick={handleDocLinkAdd}>➕ Add link</button>
                    </div>
                  )}
                  {(selectedDocument.links || []).length > 0 && (
                    <div className="workhub-checklist-url-list">
                      {(selectedDocument.links || []).map((url) => (
                        <div key={url} className="workhub-checklist-url-item">
                          <a href={url} target="_blank" rel="noreferrer">{url}</a>
                          {!selectedDocumentReadOnly && (
                            <button
                              type="button"
                              title="Remove link"
                              aria-label="Remove link"
                              onClick={() => {
                                if (!window.confirm('Remove this link?')) return
                                handleDocLinkRemove(url)
                              }}
                            >
                              ??
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </>
                ) : null
              ) : (
                <div className="workhub-empty-state" style={{ margin: '12px 0' }}>Select a document to view its details.</div>
              )}
              {selectedDocument && (
                <div className={`workhub-detail-rail-ai-view${detailRailTab === 'ai' ? ' is-active' : ' is-hidden'}`}>
                  <WorkhubDocumentAiPanel
                    editor={documentEditor}
                    documentTitle={selectedDocumentTitleDraft.trim() || selectedDocument.title}
                    documentBody={selectedDocumentBodyDraft}
                    activeTabTitle={activeTab?.title}
                    readOnly={selectedDocumentReadOnly}
                    layout="sidebar"
                    persistenceKey={aiPanelPersistenceKey}
                    onSendChecklistItemsToDetails={handleDocChecklistBulkAdd}
                  />
                </div>
              )}
            </div>
          </aside>

            </div>
          {isMobileLayout && mobileDocDetailsOpen && (
            <button
              type="button"
              className="workhub-task-detail-drawer-backdrop"
              aria-label="Close document details"
              onClick={() => setMobileDocDetailsOpen(false)}
            />
          )}
      </main>

      {shareDocDialogOpen && selectedDocument && (
        <div className="workhub-share-doc-overlay" onClick={() => setShareDocDialogOpen(false)}>
          <div className="workhub-share-doc-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="workhub-share-doc-head">
              <span>Share � <em>{selectedDocument.title}</em></span>
              <button type="button" className="workhub-share-doc-close" onClick={() => setShareDocDialogOpen(false)}>?</button>
            </div>

            {selectedDocumentCanEdit && (
              <div className="workhub-share-doc-form-grid">
                <label className="workhub-share-doc-form-row">
                  <span>Share with</span>
                  <select
                    className="workhub-share-doc-select"
                    value={selectedShareUid}
                    onChange={(e) => handleSelectShareDocMember(e.target.value)}
                  >
                    <option value="">No one</option>
                    {workhubShareCandidates.map((member) => {
                      const label = member.displayName || member.email || member.uid
                      return <option key={member.uid} value={member.uid}>{label}</option>
                    })}
                  </select>
                </label>
                {selectedShareUid && (
                  <label className="workhub-share-doc-form-row">
                    <span>Access</span>
                    <select
                      className="workhub-share-doc-select"
                      value={selectedShareAccess}
                      onChange={(e) => handleSetShareDocMemberAccess(selectedShareUid, e.target.value === 'view' ? 'view' : 'edit')}
                    >
                      <option value="edit">Edit</option>
                      <option value="view">View</option>
                    </select>
                  </label>
                )}
              </div>
            )}

            {selectedShareMember && (
              <div className="workhub-share-doc-selected">
                <div className="workhub-share-doc-selected-copy">
                  <strong>{selectedShareMember.displayName || selectedShareMember.email || selectedShareMember.uid}</strong>
                  <small>{selectedShareMember.email || 'Internal WorkHub member'}</small>
                </div>
                {selectedDocumentCanEdit && (
                  <button
                    type="button"
                    className="workhub-ghost-btn"
                    onClick={() => handleToggleShareDocMember(selectedShareUid)}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}

            {shareSelectedCount === 0 && (
              <p className="workhub-share-doc-desc">Select one colleague from the list. They will receive an email and an internal notification to check this document.</p>
            )}

            <div className="workhub-share-doc-actions">
              <button type="button" className="workhub-ghost-btn" onClick={() => setShareDocDialogOpen(false)}>Cancel</button>
              <button
                type="button"
                className="workhub-primary-btn"
                disabled={!selectedDocumentCanEdit || shareDocSaving}
                onClick={() => { void handleSaveDocInternalShare() }}
              >
                {shareDocSaving ? 'Saving�' : shareSelectedCount > 0 ? 'Share document' : 'Clear sharing'}
              </button>
            </div>

            {!selectedDocumentCanEdit && (
              <p className="workhub-share-doc-desc">You have view-only access and cannot change sharing.</p>
            )}
          </div>
        </div>
      )}

      {copyToFolderDialogOpen && selectedDocument && (
        <div className="workhub-share-doc-overlay" onClick={() => setCopyToFolderDialogOpen(false)}>
          <div className="workhub-share-doc-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="workhub-share-doc-head">
              <span>Reference in folder � <em>{selectedDocument.title}</em></span>
              <button type="button" className="workhub-share-doc-close" onClick={() => setCopyToFolderDialogOpen(false)}>?</button>
            </div>
            <p className="workhub-share-doc-desc">
              This creates a live read-only reference. Source updates are synced automatically and unsharing removes the reference.
            </p>
            <div className="workhub-share-doc-form-grid">
              <label className="workhub-share-doc-form-row">
                <span>Workspace</span>
                <select
                  className="workhub-share-doc-select"
                  value={copyToFolderWorkspaceId}
                  onChange={(e) => { setCopyToFolderWorkspaceId(e.target.value); setCopyToFolderProjectId('') }}
                >
                  <option value="">Select workspace�</option>
                  {allWorkspaceIds.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="workhub-ghost-btn"
                  onClick={() => setFolderBrowserDialogOpen(true)}
                >
                  Browse...
                </button>
              </label>
              {copyToFolderWorkspaceId && (
                <label className="workhub-share-doc-form-row">
                  <span>Folder</span>
                  <select
                    className="workhub-share-doc-select"
                    value={copyToFolderProjectId}
                    onChange={(e) => setCopyToFolderProjectId(e.target.value)}
                  >
                    <option value="">Select folder�</option>
                    {(() => {
                      const wsProjects = allWorkspaceProjects.filter((p) => p.workspaceId === copyToFolderWorkspaceId)
                      if (wsProjects.length === 0) {
                        return <option value="" disabled>No folders in this workspace</option>
                      }
                      const byParent = new Map<string, typeof wsProjects>()
                      wsProjects.forEach((p) => {
                        const key = p.parentProjectId || ''
                        const bucket = byParent.get(key) || []
                        bucket.push(p)
                        byParent.set(key, bucket)
                      })

                      const buildGroup = (parentId: string, depth: number): React.ReactNode[] => {
                        const children = byParent.get(parentId) || []
                        if (children.length === 0) return []
                        
                        // Sort children by name
                        const sorted = [...children].sort((a, b) => a.name.localeCompare(b.name))
                        
                        return sorted.flatMap((p) => {
                          const indent = '\u00a0'.repeat(depth * 5)
                          const prefix = depth > 0 ? '+ ' : ''
                          
                          const node = (
                            <option key={p.id} value={p.id}>
                              {indent + prefix + p.name}
                            </option>
                          )
                          return [node, ...buildGroup(p.id, depth + 1)]
                        })
                      }
                      
                      return buildGroup('', 0)
                    })()}
                  </select>
                </label>
              )}
              <div className="workhub-share-doc-form-row is-full-width">
                <div className="workhub-share-doc-reference-layout">
                  <div className="workhub-share-doc-reference-pane">
                    <span>Existing references</span>
                    {sourceReferenceDocuments.length === 0 ? (
                      <p className="workhub-share-doc-desc">No active references yet.</p>
                    ) : (
                      <div className="workhub-share-doc-members">
                        {sourceReferenceDocuments.map((refDoc) => {
                          const projectName = referenceProjectById[refDoc.projectId || '']?.name || workspaceProjectById[refDoc.projectId || '']?.name || 'Folder'
                          const workspaceName = referenceWorkspaceById[refDoc.workspaceId]?.name || 'Workspace'
                          const refTabIds = Array.isArray(refDoc.referenceTabIds) && refDoc.referenceTabIds.length > 0
                            ? refDoc.referenceTabIds
                            : documentTabsDraft.map((t) => t.id)
                          const isHighlighted = highlightedRefDocId === refDoc.id
                          return (
                            <div
                              key={refDoc.id}
                              className={`workhub-share-doc-member-row is-ref-item${isHighlighted ? ' is-highlighted' : ''}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setHighlightedRefDocId(refDoc.id)
                                setCopyToFolderWorkspaceId(refDoc.workspaceId)
                                setCopyToFolderProjectId(refDoc.projectId || '')
                                setCopyTabMode('select')
                                setCopyTabSelection(refTabIds)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setHighlightedRefDocId(refDoc.id)
                                  setCopyToFolderWorkspaceId(refDoc.workspaceId)
                                  setCopyToFolderProjectId(refDoc.projectId || '')
                                  setCopyTabMode('select')
                                  setCopyTabSelection(refTabIds)
                                }
                              }}
                            >
                              <div className="workhub-share-doc-member-copy">
                                <strong className="workhub-ref-location">{workspaceName} � {projectName}</strong>
                                <small className="workhub-ref-docname">{refDoc.title}</small>
                              </div>
                              <button
                                type="button"
                                className="workhub-ghost-btn"
                                disabled={!selectedDocumentCanEdit || busyKey === `document-reference-remove:${refDoc.id}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!window.confirm('Remove this reference from its target folder?')) return
                                  if (highlightedRefDocId === refDoc.id) setHighlightedRefDocId(null)
                                  void handleRemoveDocumentReference(refDoc.id)
                                }}
                              >
                                {busyKey === `document-reference-remove:${refDoc.id}` ? 'Removing�' : 'Unshare'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="workhub-share-doc-reference-pane">
                    <span>Tabs to reference</span>
                    {documentTabsDraft.length === 0 ? (
                      <p className="workhub-share-doc-desc">This document has no tabs.</p>
                    ) : (
                      <>
                        <div className="workhub-copy-tab-mode-group">
                          {(['all', 'select'] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              className={`workhub-copy-tab-mode-btn${copyTabMode === mode ? ' is-active' : ''}`}
                              onClick={() => {
                                setCopyTabMode(mode)
                                if (mode === 'all') {
                                  setCopyTabSelection(documentTabsDraft.map((tab) => tab.id))
                                } else {
                                  if (highlightedReferenceDocument) {
                                    setCopyTabSelection(highlightedReferenceTabIds)
                                  } else {
                                    setCopyTabSelection([])
                                  }
                                }
                              }}
                            >
                              {mode === 'all' ? 'All tabs' : 'Choose tabs'}
                            </button>
                          ))}
                        </div>
                        {copyTabMode === 'select' && (
                          <div className="workhub-copy-tab-checklist">
                            {documentTabsDraft.map((tab, index) => {
                              const rawTabTitle = typeof tab.title === 'string' ? tab.title : ''
                              const visibleTabTitle = rawTabTitle
                                .replace(/<[^>]*>/g, ' ')
                                .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
                                .replace(/\s+/g, ' ')
                                .trim()
                              const resolvedTabTitle = visibleTabTitle || `Tab ${index + 1}`
                              return (
                                <label key={tab.id} className="workhub-copy-tab-check-item">
                                  <input
                                    type="checkbox"
                                    checked={copyTabSelection.includes(tab.id)}
                                    onChange={(e) => {
                                      setCopyTabSelection((prev) =>
                                        e.target.checked ? [...prev, tab.id] : prev.filter((id) => id !== tab.id),
                                      )
                                    }}
                                  />
                                  <span className="workhub-copy-tab-check-main">
                                    <span className="workhub-copy-tab-check-text">
                                      {tab.icon ? `${tab.icon} ` : ''}
                                      {resolvedTabTitle}
                                    </span>
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {highlightedReferenceDocument && !highlightedReferenceSelectionDirty && (
              <p className="workhub-share-doc-inline-hint">No tab changes yet. Adjust selection to enable Update reference.</p>
            )}
            <div className="workhub-share-doc-actions">
              <button type="button" className="workhub-ghost-btn" onClick={() => setCopyToFolderDialogOpen(false)}>Cancel</button>
              <button
                type="button"
                className="workhub-primary-btn"
                disabled={
                  copyToFolderSaving ||
                  (highlightedReferenceDocument
                    ? !highlightedReferenceSelectionDirty || busyKey === `document-reference-update:${highlightedReferenceDocument.id}`
                    : (!copyToFolderWorkspaceId || !copyToFolderProjectId)) ||
                  (copyTabMode === 'select' && copyTabSelection.length === 0)
                }
                onClick={() => {
                  if (highlightedReferenceDocument) {
                    void handleUpdateDocumentReference(highlightedReferenceDocument.id)
                    return
                  }
                  void handleCopyDocumentToFolder()
                }}
              >
                {copyToFolderSaving
                  ? 'Saving�'
                  : highlightedReferenceDocument
                    ? (busyKey === `document-reference-update:${highlightedReferenceDocument.id}` ? 'Updating�' : 'Update reference')
                    : 'Create reference'}
              </button>
            </div>
          </div>
        </div>
      )}

      <WorkspaceBrowserDialog
        open={copyToFolderDialogOpen && folderBrowserDialogOpen}
        title="Browse folders"
        confirmLabel="Use folder"
        workspaces={allWorkspaceIds}
        projects={allWorkspaceProjects}
        initialWorkspaceId={copyToFolderWorkspaceId}
        initialProjectId={copyToFolderProjectId}
        onClose={() => setFolderBrowserDialogOpen(false)}
        onConfirm={(workspaceId, projectId) => {
          setCopyToFolderWorkspaceId(workspaceId)
          setCopyToFolderProjectId(projectId)
          setFolderBrowserDialogOpen(false)
        }}
      />
    </>
  )
}
