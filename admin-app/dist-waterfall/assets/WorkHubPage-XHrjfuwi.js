const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/WorkhubNotesSection-CsgWqYPa.js","assets/react-vendor-CnHX55eu.js","assets/workhub-repo-BWhh7_g_.js","assets/firebase-firestore-DkJlrTfp.js","assets/firebase-app-DQmPummf.js","assets/workhub-doc-editor-DcJvShmF.js","assets/workhub-tinymce-CXZq4Qfj.js","assets/workhub-emoji-BM7LTgyg.js","assets/WorkhubMoodboardSection-cZkiDe0o.js","assets/workhub-moodboard-Cu9I-oFv.js","assets/workhub-flow-D4nCwCqv.js","assets/workhub-flow-BZV40eAE.css","assets/workhub-moodboard-DHmSjLVo.css","assets/WorkhubTasksSection-CsN2kkWl.js","assets/projectUtils-Bv5sIIer.js","assets/WorkhubProjectDetailRail-DlDP0AEP.js","assets/index-DfgZ0u5T.js","assets/index-DU1-geD1.css","assets/WorkhubUsersSection-B6_wnIdh.js","assets/WorkhubClientsSection-6jgJBasE.js","assets/WorkhubHomeSection-BEnwhG6I.js"])))=>i.map(i=>d[i]);
import{B as Qk,c as Jk,a as Zk,_ as Jo}from"./index-DfgZ0u5T.js";import{r,j as e,a as ew,u as tw,c as ow,i as rw,L as aw}from"./react-vendor-CnHX55eu.js";import{v as iw,z as nw}from"./firebase-app-DQmPummf.js";import{L as $o,M as ai,m as bo,N as Hr,O as Ip,r as nc,i as sc,f as lc,P as sw,e as cc,Q as Jt,B as Ze,h as Vl,R as lw,S as lp,T as cw,U as dw,V as ci,X as uw,a as J,x as hw,I as pw,J as bw,Y as fw,Z as mw,y as gw,_ as kw,$ as ww,a0 as xw,a1 as yw,v as vw,a2 as jw,a3 as Cw,w as cp,a4 as Nw,a5 as Sw,a6 as dp,a7 as Dw,a8 as Mw,a9 as Tw,aa as Hl,b as Iw,ab as zw,ac as Pw,ad as $w,ae as Aw,af as Ew,ag as Kl,K as up,ah as hp,ai as Uw,aj as Lw,ak as Ow,al as Rw,am as _w}from"./workhub-repo-BWhh7_g_.js";import{E as Ww,a as Fw}from"./workhub-emoji-BM7LTgyg.js";import{b as di,f as zp,r as Ft,a as Bw,W as Pp,c as qw,d as Un,e as Wt,g as Vw,n as ve,h as ui,i as ii,j as dc,k as Hw,l as Kw,m as Gw,D as pp,o as Pn,p as Yw,q as Gl,s as Yl,t as fr,u as Xw,v as Qw,w as Jw}from"./projectUtils-Bv5sIIer.js";const Zw=r.memo(function(i){if(!i.projectId)return null;const c=i.workspaceType==="hr"?"folder":i.workspaceType==="finance"?"ledger":"project",s=i.workspaceType==="hr"?"objective":i.workspaceType==="finance"?"record":"task",d=i.selectedProjectId!=="all"?i.selectedProjectId:"";if(i.projectId==="__workspace__"){const w=i.templateCreateActions.filter(f=>f.intent!=="project");return e.jsx("div",{className:"workhub-modal-backdrop transparent",onMouseDown:f=>{f.target===f.currentTarget&&i.onClose()},children:e.jsxs("div",{className:"workhub-action-dialog",onMouseDown:f=>f.stopPropagation(),children:[e.jsxs("div",{className:"workhub-action-dialog-head",children:[e.jsxs("span",{children:["Create new",i.contextName?e.jsx("span",{className:"workhub-action-dialog-context",children:i.contextName}):null]}),e.jsx("button",{type:"button",className:"workhub-action-dialog-close",onClick:i.onClose,"aria-label":"Close",children:"✕"})]}),e.jsxs("div",{className:"workhub-action-dialog-grid",children:[e.jsxs("button",{type:"button",className:"workhub-action-card",disabled:!i.canCreateTopCategory,onClick:()=>{i.onClose(),i.onCreateTask(d)},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"✅"}),e.jsx("span",{className:"workhub-action-card-label",children:"New task"})]}),e.jsxs("button",{type:"button",className:"workhub-action-card",disabled:!i.canCreateTopCategory,onClick:()=>{i.onClose(),i.onCreateDocument(d)},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"📝"}),e.jsx("span",{className:"workhub-action-card-label",children:"New document"})]}),e.jsxs("button",{type:"button",className:"workhub-action-card is-note-action",disabled:!i.canCreateTopCategory,onClick:()=>{i.onClose(),i.onCreateNote(d)},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🗒️"}),e.jsx("span",{className:"workhub-action-card-label",children:"New note"})]}),e.jsx("div",{className:"workhub-action-dialog-divider"}),e.jsxs("button",{type:"button",className:"workhub-action-card is-project-action",disabled:!i.canCreateTopCategory,onClick:()=>{i.onClose(),i.onCreateTemplateEntity("project","")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🚀"}),e.jsx("span",{className:"workhub-action-card-label",children:"New project"})]}),e.jsxs("button",{type:"button",className:"workhub-action-card is-folder-action",disabled:!i.canCreateTopCategory,onClick:()=>{i.onClose(),i.onCreateSubProject("")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"📁"}),e.jsx("span",{className:"workhub-action-card-label",children:"New folder"})]}),d&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{type:"button",className:"workhub-action-card is-project-action",disabled:!i.canCreateTopCategory,onClick:()=>{i.onClose(),i.onCreateTemplateEntity("project",d)},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🚀"}),e.jsx("span",{className:"workhub-action-card-label",children:"Sub-project"})]}),e.jsxs("button",{type:"button",className:"workhub-action-card is-folder-action",disabled:!i.canCreateTopCategory,onClick:()=>{i.onClose(),i.onCreateSubProject(d)},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"📁"}),e.jsx("span",{className:"workhub-action-card-label",children:"Sub-folder"})]})]}),w.map(f=>e.jsxs("button",{type:"button",className:"workhub-action-card",disabled:!i.canCreateTopCategory,onClick:()=>{i.onClose(),i.onCreateTemplateEntity(f.intent,"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:f.icon}),e.jsx("span",{className:"workhub-action-card-label",children:f.label})]},f.id)),i.moodBoardEnabled!==!1&&e.jsxs("button",{type:"button",className:"workhub-action-card is-moodboard-action",onClick:()=>{i.onClose(),i.onOpenMoodBoard(d?"project":"workspace",d||"__workspace__")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🎨"}),e.jsx("span",{className:"workhub-action-card-label",children:"New mood board"})]}),e.jsxs("button",{type:"button",className:"workhub-action-card",onClick:()=>{i.onClose(),i.onOpenMoodBoardV2(d?"project":"workspace",d||"__workspace__")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🧠"}),e.jsx("span",{className:"workhub-action-card-label",children:"Mood Board #2"})]}),e.jsxs("button",{type:"button",className:"workhub-action-card",onClick:()=>{i.onClose(),i.onOpenFlowProjectLab(d?"project":"workspace",d||"__workspace__")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🧭"}),e.jsx("span",{className:"workhub-action-card-label",children:"Flow Project Lab"})]})]})]})})}return e.jsx("div",{className:"workhub-modal-backdrop transparent",onMouseDown:w=>{w.target===w.currentTarget&&i.onClose()},children:e.jsxs("div",{className:"workhub-action-dialog",onMouseDown:w=>w.stopPropagation(),children:[e.jsxs("div",{className:"workhub-action-dialog-head",children:[e.jsxs("span",{children:["Create new",i.contextName?e.jsx("span",{className:"workhub-action-dialog-context",children:i.contextName}):null]}),e.jsx("button",{type:"button",className:"workhub-action-dialog-close",onClick:i.onClose,"aria-label":"Close",children:"✕"})]}),e.jsxs("div",{className:"workhub-action-dialog-grid",children:[e.jsxs("button",{type:"button",className:"workhub-action-card",onClick:()=>{i.onClose(),i.onCreateTask(i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"✓"}),e.jsxs("span",{className:"workhub-action-card-label",style:{textTransform:"capitalize"},children:["New ",s]})]}),e.jsxs("button",{type:"button",className:"workhub-action-card",onClick:()=>{i.onClose(),i.onCreateDocument(i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"📝"}),e.jsx("span",{className:"workhub-action-card-label",children:"New document"})]}),e.jsxs("button",{type:"button",className:"workhub-action-card is-note-action",onClick:()=>{i.onClose(),i.onCreateNote(i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🗒️"}),e.jsx("span",{className:"workhub-action-card-label",children:"New note"})]}),e.jsx("div",{className:"workhub-action-dialog-divider"}),e.jsxs("button",{type:"button",className:"workhub-action-card is-project-action",onClick:()=>{i.onClose(),i.onCreateTemplateEntity("project",i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🚀"}),e.jsxs("span",{className:"workhub-action-card-label",style:{textTransform:"capitalize"},children:["New ",c==="project"?"project":c]})]}),e.jsxs("button",{type:"button",className:"workhub-action-card is-folder-action",onClick:()=>{i.onClose(),i.onCreateSubProject(i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"📁"}),e.jsx("span",{className:"workhub-action-card-label",style:{textTransform:"capitalize"},children:"New folder"})]}),i.templateCreateActions.map(w=>e.jsxs("button",{type:"button",className:"workhub-action-card",onClick:()=>{if(i.onClose(),w.intent==="project"){i.onCreateSubProject(i.projectId||"");return}i.onCreateTemplateEntity(w.intent,i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:w.icon}),e.jsx("span",{className:"workhub-action-card-label",style:w.intent==="project"?{textTransform:"capitalize"}:void 0,children:w.intent==="project"?`New sub-${c}`:w.label})]},w.id)),i.moodBoardEnabled!==!1&&e.jsxs("button",{type:"button",className:"workhub-action-card is-moodboard-action",onClick:()=>{i.onClose(),i.onOpenMoodBoard("project",i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🎨"}),e.jsx("span",{className:"workhub-action-card-label",children:"New mood board"})]}),e.jsxs("button",{type:"button",className:"workhub-action-card",onClick:()=>{i.onClose(),i.onOpenMoodBoardV2("project",i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🧠"}),e.jsx("span",{className:"workhub-action-card-label",children:"Mood Board #2"})]}),e.jsxs("button",{type:"button",className:"workhub-action-card",onClick:()=>{i.onClose(),i.onOpenFlowProjectLab("project",i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"🧭"}),e.jsx("span",{className:"workhub-action-card-label",children:"Flow Project Lab"})]}),i.canManageProject&&e.jsxs("button",{type:"button",className:"workhub-action-card is-settings-action",onClick:()=>{i.onClose(),i.onOpenSettings(i.projectId||"")},children:[e.jsx("span",{className:"workhub-action-card-icon",children:"⚙"}),e.jsx("span",{className:"workhub-action-card-label",children:"Open settings"})]})]})]})})});function ex(o){return o.split(" ").map(i=>i.trim().slice(0,1)).filter(Boolean).slice(0,2).join("").toUpperCase()||"WM"}function tx(o){return o.isOpen?e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:i=>{i.target===i.currentTarget&&o.onClose()},children:e.jsxs("div",{className:"workhub-modal large",onMouseDown:i=>i.stopPropagation(),children:[e.jsxs("div",{className:"workhub-modal-head",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Team"}),e.jsx("p",{children:"Team management is available on demand instead of on the landing page."})]}),e.jsx("button",{className:"workhub-ghost-btn",onClick:o.onClose,children:"Close"})]}),e.jsxs("div",{className:"workhub-member-list compact-list",children:[o.members.map(i=>e.jsxs("div",{className:"workhub-member-row compact-row",children:[e.jsxs("div",{className:"workhub-member-main",children:[i.photoURL?e.jsx("img",{src:i.photoURL,alt:""}):e.jsx("div",{className:"workhub-member-avatar-fallback",children:ex(i.displayName||i.email||i.uid)}),e.jsxs("div",{children:[e.jsx("strong",{children:i.displayName||i.email}),e.jsx("span",{children:i.email})]})]}),e.jsxs("div",{className:"workhub-member-meta",children:[e.jsx("span",{className:`workhub-status-chip status-${i.status}`,children:i.status}),e.jsx("span",{className:"workhub-role-chip",children:i.role})]}),o.isMasterAdmin&&i.uid!==o.currentUserUid&&e.jsxs("div",{className:"workhub-member-actions",children:[i.status!=="approved"&&e.jsx("button",{className:"workhub-primary-mini",disabled:o.busyKey===`member:${i.uid}:approved`,onClick:()=>o.onModerate(i.uid,"approved",i.role==="admin"?"admin":"member"),children:"Approve"}),i.status!=="suspended"&&e.jsx("button",{className:"workhub-ghost-mini",disabled:o.busyKey===`member:${i.uid}:suspended`,onClick:()=>o.onModerate(i.uid,"suspended",i.role),children:"Suspend"})]})]},i.uid)),o.members.length===0&&e.jsx("div",{className:"workhub-empty-state",children:"No members yet."})]}),o.isMasterAdmin&&o.pendingCount>0&&e.jsxs("div",{className:"workhub-admin-note",children:["You have ",o.pendingCount," pending membership request",o.pendingCount>1?"s":""," to review."]})]})}):null}function ox(o){if(!o.workspace)return null;const i=o.deleteTypedName.trim()===o.workspace.name&&o.deletePhrase.trim()==="DELETE WORKSPACE"&&o.deleteAcknowledge,c=i?"All confirmations complete. You can delete this workspace.":"To enable delete: type the exact workspace name, type DELETE WORKSPACE, and check the acknowledgement box in Danger zone.";return e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:s=>{s.target===s.currentTarget&&o.onClose()},children:e.jsxs("div",{className:"workhub-modal large workhub-workspace-settings-modal",onMouseDown:s=>s.stopPropagation(),children:[e.jsxs("div",{className:"workhub-modal-head workhub-workspace-settings-head",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Workspace settings"}),e.jsx("p",{children:"Manage workspace details and lifecycle controls."})]}),e.jsx("button",{className:"workhub-ghost-btn",onClick:o.onClose,children:"Close"})]}),e.jsxs("div",{className:"workhub-settings-tab-panel",children:[e.jsxs("div",{className:"workhub-modal-form",children:[e.jsxs("div",{className:`workhub-workspace-template-id workhub-template-${o.workspaceTemplateId}`,children:[e.jsx("span",{className:"workhub-template-graphic","aria-hidden":"true",children:e.jsx("span",{className:"workhub-template-graphic-code",children:o.workspaceTemplateGraphic})}),e.jsxs("div",{className:"workhub-workspace-template-id-content",children:[e.jsx("strong",{children:o.workspaceTemplateLabel}),e.jsx("span",{children:o.workspaceTemplateDescription})]})]}),o.workspaceTemplateWarning?e.jsx("div",{className:"workhub-template-warning-note",children:o.workspaceTemplateWarning}):null,e.jsxs("label",{children:[e.jsx("span",{children:"Workspace name"}),e.jsx("input",{name:"workspaceSettingsName",value:o.settingsName,onChange:s=>o.onSettingsNameChange(s.target.value),placeholder:"Workspace name"})]}),e.jsxs("label",{children:[e.jsx("span",{children:"Description"}),e.jsx("textarea",{name:"workspaceSettingsDescription",value:o.settingsDescription,onChange:s=>o.onSettingsDescriptionChange(s.target.value),rows:4,placeholder:"Workspace description"})]}),e.jsxs("label",{children:[e.jsx("span",{children:"Project tree meta display"}),e.jsxs("select",{value:o.treeMetaDisplayMode,onChange:s=>o.onTreeMetaDisplayModeChange(s.target.value),children:[e.jsx("option",{value:"counts",children:"Show sub-item counts"}),e.jsx("option",{value:"countdown",children:"Show submission time remaining"}),e.jsx("option",{value:"progress",children:"Show task progress (done/total)"})]})]}),e.jsxs("label",{children:[e.jsx("span",{children:"Task due date display"}),e.jsxs("select",{value:o.taskDueDisplayMode,onChange:s=>o.onTaskDueDisplayModeChange(s.target.value),children:[e.jsx("option",{value:"remaining",children:"Show time left (days/hours)"}),e.jsx("option",{value:"date",children:"Show actual due date"})]})]}),e.jsxs("label",{children:[e.jsx("span",{children:"Team activity window"}),e.jsxs("select",{value:o.activityWindowDays,onChange:s=>o.onActivityWindowDaysChange(Number(s.target.value)),children:[e.jsx("option",{value:7,children:"Last 7 days"}),e.jsx("option",{value:14,children:"Last 14 days"}),e.jsx("option",{value:30,children:"Last 30 days"})]})]}),e.jsxs("label",{className:"workhub-toggle-label",children:[e.jsx("span",{children:"Mood board feature"}),e.jsxs("div",{className:"workhub-toggle-row",children:[e.jsx("button",{type:"button",role:"switch","aria-checked":o.moodBoardEnabled,className:`workhub-toggle-btn${o.moodBoardEnabled?" is-on":""}`,onClick:()=>o.onMoodBoardEnabledChange(!o.moodBoardEnabled),children:o.moodBoardEnabled?"Enabled":"Disabled"}),e.jsx("span",{style:{fontSize:"0.75rem",color:"#7a8faa"},children:o.moodBoardEnabled?"Mood boards are visible in this workspace":"Mood boards are hidden for this workspace"})]})]}),e.jsxs("label",{className:"workhub-toggle-label",children:[e.jsx("span",{children:"Project color dots"}),e.jsxs("div",{className:"workhub-toggle-row",children:[e.jsx("button",{type:"button",role:"switch","aria-checked":o.showProjectColorDots,className:`workhub-toggle-btn${o.showProjectColorDots?" is-on":""}`,onClick:()=>o.onShowProjectColorDotsChange(!o.showProjectColorDots),children:o.showProjectColorDots?"Enabled":"Disabled"}),e.jsx("span",{style:{fontSize:"0.75rem",color:"#7a8faa"},children:o.showProjectColorDots?"Colored dots are visible beside projects in the workspace panel":"Colored dots are hidden from the workspace panel"})]})]}),e.jsxs("details",{className:"workhub-workspace-color-meaning-editor",children:[e.jsx("summary",{className:"workhub-workspace-color-meaning-summary",children:e.jsxs("div",{children:[e.jsx("strong",{children:"Project color meanings"}),e.jsx("span",{children:"Customize what each project color means in this workspace template."})]})}),e.jsxs("div",{className:"workhub-workspace-color-meaning-head",children:[e.jsx("div",{}),e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:o.onResetProjectColorMeanings,children:"Reset defaults"})]}),e.jsx("div",{className:"workhub-workspace-color-meaning-list",children:o.projectColorMeanings.map((s,d)=>e.jsxs("div",{className:"workhub-workspace-color-meaning-row",children:[e.jsxs("label",{className:"workhub-workspace-color-cell",children:[e.jsx("span",{children:"Color"}),e.jsxs("div",{className:"workhub-workspace-color-input-row",children:[e.jsx("input",{type:"color",value:s.color,onChange:w=>o.onProjectColorMeaningChange(d,{color:w.target.value}),"aria-label":`Color ${d+1}`}),e.jsx("small",{children:s.color.toUpperCase()})]})]}),e.jsxs("label",{children:[e.jsx("span",{children:"Label"}),e.jsx("input",{value:s.label,onChange:w=>o.onProjectColorMeaningChange(d,{label:w.target.value}),placeholder:"Running"})]}),e.jsxs("label",{children:[e.jsx("span",{children:"Meaning"}),e.jsx("input",{value:s.hint,onChange:w=>o.onProjectColorMeaningChange(d,{hint:w.target.value}),placeholder:"Approved and currently executing"})]}),e.jsx("div",{className:"workhub-workspace-color-row-actions",children:e.jsx("button",{type:"button",className:"workhub-danger-btn",disabled:o.projectColorMeanings.length<=1,onClick:()=>o.onRemoveProjectColorMeaning(d),title:"Delete this status meaning",children:"Delete"})})]},`workspace-project-color-${d}`))})]})]}),e.jsxs("details",{className:"workhub-collapsible-danger",children:[e.jsx("summary",{children:"Danger zone"}),e.jsxs("div",{className:"workhub-danger-zone",children:[e.jsx("p",{children:"Deleting this workspace is irreversible. You must complete all confirmations below."}),e.jsxs("div",{className:"workhub-meta-line",children:[o.projectCount," project",o.projectCount===1?"":"s"," · ",o.taskCount," task",o.taskCount===1?"":"s"]}),e.jsxs("label",{children:[e.jsxs("span",{children:["Type workspace name exactly: ",o.workspace.name]}),e.jsx("input",{name:"workspaceDeleteTypedName",value:o.deleteTypedName,onChange:s=>o.onDeleteTypedNameChange(s.target.value),placeholder:o.workspace.name})]}),e.jsxs("label",{children:[e.jsx("span",{children:"Type DELETE WORKSPACE"}),e.jsx("input",{name:"workspaceDeletePhrase",value:o.deletePhrase,onChange:s=>o.onDeletePhraseChange(s.target.value),placeholder:"DELETE WORKSPACE"})]}),e.jsxs("label",{className:"workhub-checkline",children:[e.jsx("input",{name:"workspaceDeleteAcknowledge",type:"checkbox",checked:o.deleteAcknowledge,onChange:s=>o.onDeleteAcknowledgeChange(s.target.checked)}),e.jsx("span",{children:"I understand this action permanently removes the workspace."})]}),e.jsx("button",{className:"workhub-danger-btn",disabled:!i||o.busyKey===`workspace-delete:${o.workspace.id}`,onClick:o.onDelete,children:o.busyKey===`workspace-delete:${o.workspace.id}`?"Deleting…":"Delete workspace forever"})]})]})]}),e.jsxs("div",{className:"workhub-workspace-settings-footer",children:[e.jsx("div",{className:"workhub-workspace-delete-hint","aria-live":"polite",children:c}),e.jsx("button",{className:"workhub-danger-btn",disabled:!i||o.busyKey===`workspace-delete:${o.workspace.id}`,onClick:o.onDelete,title:c,children:o.busyKey===`workspace-delete:${o.workspace.id}`?"Deleting…":"Delete workspace forever"}),e.jsx("button",{className:"workhub-primary-btn",disabled:o.busyKey===`workspace-settings:${o.workspace.id}`,onClick:o.onSave,children:o.busyKey===`workspace-settings:${o.workspace.id}`?"Saving…":"Save workspace"})]})]})})}const Xa=r.memo(function({phoneMaxWidth:i=767}){return e.jsx("style",{children:`
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
      @media (max-width: ${i}px) {
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
      @media (max-width: ${i}px) {
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
        transition: background 0.08s ease, box-shadow 0.08s ease;
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
        transition: none;
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
        padding-right: 2px;
        margin-top: 8px;
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
        gap: 3px;
        padding-top: 2px;
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
        gap: 4px;
        border-left: 2px solid #dce8f7;
        padding-left: 8px;
        margin-top: 4px;
        margin-bottom: 4px;
      }
      .workhub-tree-doc-subitem {
        width: 100%;
        border: 1px solid #e4eaf3;
        background: #fcfdff;
        color: #2a3d5c;
        border-radius: 8px;
        padding: 5px 8px;
        text-align: left;
        font: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        min-height: 28px;
        transition: background-color 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease;
        box-shadow: none;
      }
      .workhub-tree-doc-subitem:hover {
        background: #edf3fb;
        border-color: #ced9e8;
        box-shadow: inset 3px 0 0 #8aacd8;
        transition: none;
      }
      .workhub-tree-doc-subitem.is-active {
        background: #eef3fb;
        border-color: #b7c7df;
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
      .workhub-tree-expand-wrap {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
      .workhub-tree-node {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr) auto;
        align-items: center;
        gap: 6px;
        padding: 7px 9px;
        min-height: 36px;
        border-radius: 9px;
        border: 1px solid #e1e8f2;
        background: #fcfdff;
        box-shadow: none;
        transition: background-color 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease;
        cursor: pointer;
      }
      .workhub-tree-node-wrap.is-root > .workhub-tree-node {
        padding: 8px 10px;
        min-height: 40px;
      }
      .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node,
      .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node,
      .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node,
      .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node {
        background: #fcfdff;
      }
      .workhub-tree-node:hover {
        background: #f0f5fc;
        border-color: #cad5e3;
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
        background: linear-gradient(90deg, #e3efff 0%, #f3f8ff 100%);
        border-color: #7ea2da;
        box-shadow: inset 4px 0 0 #2f63c8, 0 0 0 1px rgba(47, 99, 200, 0.2);
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
        border: 1px solid #e1e8f2;
        border-radius: 12px;
        background: #f8fbff;
        cursor: pointer;
        font: inherit;
        transition: background 120ms, border-color 120ms;
      }
      .workhub-action-card:hover {
        background: #edf4ff;
        border-color: #b8cdf7;
      }
      .workhub-action-card:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .workhub-action-card-icon {
        font-size: 1.4rem;
        line-height: 1;
      }
      .workhub-action-card-label {
        font-size: 0.7rem;
        font-weight: 500;
        text-align: center;
        color: #22324a;
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
      @media (max-width: ${i}px) {
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
      @media (max-width: ${i}px) {
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
        gap: 8px;
        height: 100%;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        border-left: 1px solid #e3ecfb;
        padding-left: 10px;
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
        gap: 8px;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0 8px 12px 0;
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
        margin-bottom: 10px;
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
      @media (max-width: ${i}px) {
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
        margin-bottom: 6px;
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
        font-size: 2.4rem;
        font-weight: 700;
        line-height: 1.22;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .workhub-task-description-display {
        font-size: 1.05rem;
        font-weight: 400;
        line-height: 1.4;
        color: #425679;
        min-height: 40px;
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
        margin: 4px 0 8px;
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
        margin-top: 8px;
      }
      .workhub-task-resource-combined-card {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
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
        gap: 10px;
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
        padding: 12px;
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
      @media (max-width: ${i}px) {
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
      .workhub-print-preview-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        border-bottom: 1px solid #d6e2f4;
        background: linear-gradient(180deg, #fafdff 0%, #f3f7ff 100%);
      }
      .workhub-print-preview-bar strong {
        display: block;
        font-size: 0.8rem;
        color: #294573;
      }
      .workhub-print-preview-bar span {
        display: block;
        font-size: 0.71rem;
        color: #6a7d9d;
      }
      .workhub-print-preview-meta {
        white-space: nowrap;
        font-weight: 700;
        color: #48648d;
      }
      .workhub-print-preview-frame {
        width: 100%;
        flex: 1 1 auto;
        min-height: 0;
        border: 0;
        background: #edf3fb;
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
      .workhub-shell.is-mobile .workhub-print-preview-wrap {
        min-height: 340px;
        flex: 0 0 auto;
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
        align-items: center;
        column-gap: 10px;
        font-size: 0.85rem;
        color: #183154;
        cursor: pointer;
        padding: 9px 12px;
        border-bottom: 1px solid #dbe6f7;
        min-width: 0;
        width: 100%;
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
      @media (max-width: 720px) {
        .workhub-share-doc-form-grid {
          grid-template-columns: minmax(0, 1fr);
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
      @media (max-width: ${i}px) {
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
      @media (max-width: ${i}px) {
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
          min-height: 44px;
          padding: 9px 11px;
        }
        .workhub-tree-node-wrap.is-root + .workhub-tree-node-wrap.is-root {
          margin-top: 6px;
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
    `})}),Qo={low:"Low",medium:"Medium",high:"High",urgent:"Urgent"},hi=o=>{switch(o){case"urgent":return"🚩";case"high":return"⚡";case"medium":return"📌";case"low":return"📎";default:return"📎"}},I0=o=>{const i=o.toLowerCase();return i.includes("backlog")?"🕒":i.includes("open")?"📂":i.includes("progress")?"⚙️":i.includes("review")?"👁️":i.includes("complete")||i.includes("done")?"✅":i.includes("cancel")?"⛔":"•"},Do=["#6d5efc","#10b981","#f59e0b","#ef4444","#06b6d4","#8b5cf6","#64748b"],bp={projects:[{color:"#6d5efc",label:"Approved",hint:"Approved and queued for kickoff."},{color:"#10b981",label:"Running",hint:"Active delivery is underway."},{color:"#f59e0b",label:"In progress",hint:"Work is moving through execution milestones."},{color:"#ef4444",label:"Blocked",hint:"Blocked and waiting on a dependency or decision."},{color:"#06b6d4",label:"Submitted",hint:"Submitted to stakeholders for confirmation."},{color:"#8b5cf6",label:"Review",hint:"Under internal review and feedback."},{color:"#64748b",label:"Completed",hint:"Completed and formally closed."}],proposals_leads:[{color:"#6d5efc",label:"Approved",hint:"Approved to proceed with pursuit."},{color:"#10b981",label:"Awarded",hint:"Awarded by the client."},{color:"#f59e0b",label:"Proposal in progress",hint:"Proposal drafting and pricing are in progress."},{color:"#ef4444",label:"Lost / dropped",hint:"Opportunity was lost or withdrawn."},{color:"#06b6d4",label:"Submitted",hint:"Submitted to the client and awaiting response."},{color:"#8b5cf6",label:"Running",hint:"Active client engagement and follow-up."},{color:"#64748b",label:"Closed",hint:"Opportunity closed and archived."}],finance:[{color:"#6d5efc",label:"Approved",hint:"Approved by finance for release."},{color:"#10b981",label:"Running",hint:"Payment operation is currently running."},{color:"#f59e0b",label:"Pending approval",hint:"Waiting for required finance approval."},{color:"#ef4444",label:"Overdue",hint:"Past due date or blocked from release."},{color:"#06b6d4",label:"Submitted",hint:"Submitted for posting or payment processing."},{color:"#8b5cf6",label:"Review",hint:"Under compliance or controller review."},{color:"#64748b",label:"Reconciled",hint:"Posted, settled, and reconciled in ledger."}],marketing:[{color:"#6d5efc",label:"Approved",hint:"Approved for launch."},{color:"#10b981",label:"Running",hint:"Campaign is live and actively running."},{color:"#f59e0b",label:"Production",hint:"Assets and content are in production."},{color:"#ef4444",label:"Blocked",hint:"Blocked by dependencies, approvals, or budget."},{color:"#06b6d4",label:"Submitted",hint:"Submitted for final approval or publishing."},{color:"#8b5cf6",label:"Review",hint:"Creative is under review."},{color:"#64748b",label:"Completed",hint:"Campaign completed and archived."}],hr:[{color:"#6d5efc",label:"Approved",hint:"Requisition or headcount approved."},{color:"#10b981",label:"Running",hint:"Hiring or onboarding workflow is active."},{color:"#f59e0b",label:"Interviewing",hint:"Candidates are in interview stages."},{color:"#ef4444",label:"Blocked",hint:"Process is stalled and needs intervention."},{color:"#06b6d4",label:"Submitted",hint:"Offer or onboarding package submitted for approval."},{color:"#8b5cf6",label:"Review",hint:"Candidate profile or onboarding plan under review."},{color:"#64748b",label:"Filled",hint:"Role is filled and officially closed."}],empty:[{color:"#6d5efc",label:"Approved",hint:"Approved to proceed."},{color:"#10b981",label:"Running",hint:"Currently active and running."},{color:"#f59e0b",label:"In progress",hint:"Work is actively in progress."},{color:"#ef4444",label:"Blocked",hint:"Blocked and awaiting intervention."},{color:"#06b6d4",label:"Submitted",hint:"Submitted for review or approval."},{color:"#8b5cf6",label:"Review",hint:"Under review."},{color:"#64748b",label:"Completed",hint:"Completed and archived."}]};function rx(o){return o.trim().toLowerCase()}function ax(o){return/^#[0-9a-fA-F]{6}$/.test(o.trim())}function fp(o){return typeof o=="string"?o.trim():""}function Qa(o,i){const c=bp[o]||bp.projects,s=Array.isArray(i)?i:[];return c.map((d,w)=>{const f=s[w];if(!f)return{...d};const T=typeof f.color=="string"&&ax(f.color)?rx(f.color):d.color,C=fp(f.label)||d.label,g=fp(f.hint)||d.hint;return{color:T,label:C,hint:g}})}const On=[{value:"tender",label:"Tender"},{value:"lead",label:"Lead"},{value:"direct_award",label:"Direct award"},{value:"other",label:"Other"}],fc=[{value:"critical",label:"Critical",color:"#dc2626"},{value:"high",label:"High",color:"#ea580c"},{value:"medium",label:"Medium",color:"#2563eb"},{value:"low",label:"Low",color:"#64748b"}],mp={critical:4,high:3,medium:2,low:1},Qt="10:00",ix=/[\u0000-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\u2800\u3164\uFEFF\uFFA0]/g;function kr(o){if(!o)return"—";if(typeof o=="object"&&o!==null&&"toDate"in o&&typeof o.toDate=="function")return o.toDate().toLocaleString("en-GB");if(typeof o=="object"&&o!==null&&"seconds"in o){const i=Number(o.seconds||0);return new Date(i*1e3).toLocaleString("en-GB")}if(typeof o=="string"){const i=Date.parse(o);if(Number.isFinite(i))return new Date(i).toLocaleString("en-GB")}return"—"}function Io(o,i){if(!o)return"No due date";const c=Date.parse(o);if(!Number.isFinite(c))return o;const s=new Date(c).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});return i?`${s} ${i}`:s}function $p(o,i,c){if(!o)return"No due date";if(c==="date")return Io(o,i);const s=i?Date.parse(`${o}T${i}`):Date.parse(`${o}T23:59`);if(!Number.isFinite(s))return Io(o,i);const d=Date.now(),w=s-d,f=Math.abs(w),T=3600*1e3,C=24*T;if(f<T){const y=Math.max(1,Math.ceil(f/6e4));return w>=0?`${y}m left`:`${y}m overdue`}if(f<C){const y=Math.max(1,Math.ceil(f/T));return w>=0?`${y}h left`:`${y}h overdue`}const g=Math.max(1,Math.ceil(f/C));return w>=0?`${g}d left`:`${g}d overdue`}function uc(o){const i=(o.projectDeadline||"").trim();if(!i)return Number.NaN;if(o.projectType==="tender"){const s=(o.submissionTime||"").trim()||"23:59",d=Date.parse(`${i}T${s}`);return Number.isFinite(d)?d:Number.NaN}const c=Date.parse(`${i}T23:59`);return Number.isFinite(c)?c:Number.NaN}function pi(o){const i=(o||"").trim(),c=i.split("-");if(c.length===3&&c[0].length===4){const[s,d,w]=c;return`${w}-${d}-${s}`}return i}function Rn(o){const i=o.trim().split(/\s+/);return i.length>=2?(i[0][0]+i[i.length-1][0]).toUpperCase():o.slice(0,2).toUpperCase()}function Xl(o){const i=(o||"").trim().toLowerCase();if(!i)return!1;if(i.startsWith("data:image/"))return!0;try{const c=new URL(i);if(/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(c.pathname))return!0;const s=c.searchParams.get("name")||c.searchParams.get("filename")||"";return/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(s)}catch{return/\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?$/i.test(i)}}function ct(o){return o.replace(ix,"").replace(/\s+/g," ").trim()}function nx(o){const i=ct(o);return i?i.replace(/[\p{P}\p{S}\p{M}\p{Z}\p{C}_]+/gu,"").length===0:!0}function gp(o){return o.split(/[\r\n\u2028\u2029]+/).map(i=>ct(i)).filter(Boolean)}function kp(o,i=!1){const c=(o||"").trim();if(!c)return null;const s=Date.parse(`${c}T${i?"23:59:59":"00:00:00"}`);return Number.isFinite(s)?s:null}function sx(o,i,c){const s=i?c?Date.parse(`${i}T${c}`):kp(i,!0):null;if(!s)return{percent:0,centerValue:"--",centerCaption:"open",textLabel:"No deadline",isOverdue:!1,hasDueDate:!1};const d=Date.now(),w=s-d;if(w<=0)return{percent:0,centerValue:"0%",centerCaption:"left",textLabel:"Overdue",isOverdue:!0,hasDueDate:!0};const f=kp(o,!1),T=f&&f<s?Math.max(s-f,1):336*60*60*1e3,C=Math.max(0,Math.min(100,Math.round(w/T*100))),g=3600*1e3,y=24*g,q=Math.ceil(w/g),F=Math.ceil(w/y),re=w<y?`${Math.max(1,q)}h`:F<31?`${Math.max(1,F)}d`:`${Math.max(1,Math.ceil(F/30))}m`;return{percent:C,centerValue:re,centerCaption:"left",textLabel:$p(i||"",c,"remaining"),isOverdue:!1,hasDueDate:!0}}const z0={checklist:[],checklistDoneCount:0,checklistDetailsCount:0,checklistImagesCount:0,checklistLinksCount:0,taskAttachmentCount:0,financeValue:null},P0=r.memo(function({task:i,dueDisplayMode:c,displayMode:s="list",index:d,isChecked:w,isSelected:f,isLinkedHighlight:T=!1,isDropTarget:C,isDragSource:g,statusMenuOpen:y,priorityMenuOpen:q,moreMenuOpen:F,assigneeMenuOpen:re,editingTitle:Y,editingTitleText:H,checklistExpanded:$,checklistDraft:de,editingChecklistItemId:V,editingChecklistScope:b,editingChecklistText:D,isTaskBusy:N,taskAssignee:x,taskCreator:I,assignableMembers:K,meta:he,unreadCommentCount:_=0,isFinanceLayout:B,callbacks:E}){const{checklist:X}=he,we=r.useRef(null),[L,v]=r.useState({}),M=x?.displayName||x?.email||"Unassigned",z=I?.displayName||I?.email||"Unknown",te=I&&I.uid!==i.assigneeUid,R=I?.uid===i.assigneeUid,se=y||q||F||re,fe=$p(i.dueDate||"",i.dueTime,c),Z=he.taskAttachmentCount+he.checklistImagesCount,ye=X.length,je=Math.min(he.checklistDoneCount,ye),Ie=ye>0?Math.max(8,Math.round(je/ye*100)):0,ee=s==="cards",u=s==="grid",W=sx(i.startDate,i.dueDate,i.dueTime),O=i.dueDate?Io(i.dueDate,i.dueTime):"No deadline",pe=28,Le=2*Math.PI*pe,Fe=Le-W.percent/100*Le,Oe=14,be=2*Math.PI*Oe,Re=be-W.percent/100*be,Ce=re&&ew.createPortal(e.jsxs("div",{className:"workhub-task-assignee-menu",style:L,onClick:k=>k.stopPropagation(),children:[e.jsx("button",{type:"button",className:i.assigneeUid?"":"is-active",onClick:()=>E.onAssigneeSelect(i,""),children:"Unassigned"}),K.map(k=>e.jsx("button",{type:"button",className:i.assigneeUid===k.uid?"is-active":"",onClick:()=>E.onAssigneeSelect(i,k.uid),children:k.displayName||k.email},k.uid))]}),document.body);return r.useEffect(()=>{if(!re)return;const k=we.current;if(!k)return;const ge=k.getBoundingClientRect(),ne=Math.min(300,window.innerHeight*.42),$e=window.innerHeight-ge.bottom,ie=$e<ne+8&&ge.top>$e;v(ie?{position:"fixed",bottom:window.innerHeight-ge.top+4,left:ge.left,minWidth:160,zIndex:9999}:{position:"fixed",top:ge.bottom+4,left:ge.left,minWidth:160,zIndex:9999})},[re,K.length]),e.jsx("article",{className:`workhub-task-row${f?" is-selected":""}${T?" is-linked-highlight":""}${w?" is-checked":""}${d%2===1?" is-alt":""}${se?" has-open-menu":""}${C?" is-drop-target":""}${g?" is-dragging":""}`,onDragOver:k=>E.onDragOver(k,i.id,i.status),onDrop:k=>E.onDrop(k,i.id,i.status),onClick:()=>E.onRowClick(i.id),onContextMenu:k=>{k.preventDefault(),k.stopPropagation(),E.onRowContextMenu(i.id,k.clientX,k.clientY)},children:e.jsxs("div",{className:"workhub-task-row-main",onDoubleClick:k=>{k.stopPropagation(),!k.target.closest(".workhub-task-row-title")&&E.onDoubleClickRow(i.id)},children:[ee?e.jsxs("div",{className:"workhub-task-card-layout",children:[e.jsxs("div",{className:"workhub-task-card-main-col",children:[e.jsxs("div",{className:"workhub-task-col details workhub-task-card-details",children:[e.jsx("input",{type:"checkbox",checked:w,onChange:k=>E.onCheckboxChange(i.id,k.target.checked),onClick:k=>k.stopPropagation()}),e.jsx("div",{className:"workhub-task-row-title workhub-task-card-title",onDoubleClick:k=>{k.stopPropagation(),Y||E.onTitleEditStart(i)},children:Y?e.jsx("input",{type:"text",className:"workhub-task-title-edit-input",value:H,onChange:k=>E.onTitleEditTextChange(k.target.value),onClick:k=>k.stopPropagation(),onDoubleClick:k=>k.stopPropagation(),onKeyDown:k=>{k.stopPropagation(),k.key==="Enter"?(k.preventDefault(),E.onTitleEditSave(i)):k.key==="Escape"&&(k.preventDefault(),E.onTitleEditCancel())},onBlur:()=>E.onTitleEditSave(i),autoFocus:!0}):e.jsx("strong",{onDoubleClick:k=>{k.stopPropagation(),E.onTitleEditStart(i)},children:ct(i.title||"")||"Untitled task"})})]}),e.jsxs("div",{className:"workhub-task-card-meta-grid",children:[e.jsxs("button",{ref:we,type:"button",className:"workhub-task-card-meta-item is-assignee","aria-label":`Assignee: ${M}`,onClick:k=>{k.stopPropagation(),E.onOpenAssigneeMenu(i.id)},children:[e.jsx("span",{className:"workhub-task-card-meta-icon","aria-hidden":"true",children:x?.photoURL?e.jsx("img",{src:x.photoURL,alt:M,className:"workhub-task-card-meta-avatar"}):e.jsx("span",{className:"workhub-task-card-meta-avatar-fallback",children:"👤"})}),e.jsx("span",{className:"workhub-task-card-meta-copy",children:M})]}),e.jsxs("button",{type:"button",className:"workhub-task-card-meta-item is-deadline",onClick:k=>{k.stopPropagation();const ne=k.currentTarget.closest(".workhub-task-card-meta-item")?.querySelector(".workhub-task-due-input");if(!ne)return;ne.showPicker?.(),ne.focus()},title:i.dueDate?`Due date: ${Io(i.dueDate,i.dueTime)}`:"Set due date",children:[e.jsx("span",{className:"workhub-task-card-meta-icon","aria-hidden":"true",children:"📅"}),e.jsx("span",{className:"workhub-task-card-meta-copy",children:O}),e.jsx("input",{type:"date",lang:"en-GB",className:"workhub-task-due-input",value:i.dueDate||"",onClick:k=>k.stopPropagation(),onChange:k=>E.onDueDateChange(i,k.target.value),"aria-label":i.dueDate?`Due date: ${Io(i.dueDate,i.dueTime)}`:"Set due date"})]}),e.jsxs("span",{className:"workhub-task-card-meta-item is-time",title:W.textLabel,children:[e.jsx("span",{className:"workhub-task-card-meta-icon","aria-hidden":"true",children:"⏱"}),e.jsx("span",{className:"workhub-task-card-meta-copy",children:W.textLabel})]}),e.jsxs("span",{className:"workhub-task-card-meta-item is-priority","aria-label":`Priority: ${Qo[i.priority]}`,children:[e.jsx("span",{className:"workhub-task-card-meta-icon","aria-hidden":"true",children:hi(i.priority)}),e.jsx("span",{className:"workhub-task-card-meta-copy",children:Qo[i.priority]})]})]}),e.jsxs("div",{className:"workhub-task-card-supporting",children:[_>0&&e.jsxs("span",{className:"workhub-task-comment-unread-chip",title:`${_} unread comment${_===1?"":"s"}`,"aria-label":`${_} unread comment${_===1?"":"s"}`,children:["💬 ",_]}),Z>0&&e.jsxs("span",{className:"workhub-task-attachment-chip",title:`${Z} attachment${Z===1?"":"s"}`,"aria-label":`${Z} attachment${Z===1?"":"s"}`,children:["📎 ",Z]}),ye>0&&e.jsxs("span",{className:"workhub-task-checklist-progress",title:`${je} of ${ye} checklist items completed`,children:[e.jsx("span",{className:"workhub-task-checklist-progress-track","aria-hidden":"true",children:e.jsx("span",{className:"workhub-task-checklist-progress-fill",style:{width:`${Ie}%`}})}),e.jsxs("span",{className:"workhub-task-checklist-progress-label",children:[je,"/",ye]})]}),e.jsx("button",{className:"workhub-checklist-toggle",onClick:k=>{k.stopPropagation(),E.onToggleChecklist(i.id)},"aria-label":"Toggle checklist",children:ye})]})]}),e.jsx("div",{className:"workhub-task-card-time-col","aria-label":`Remaining time ${W.textLabel}`,children:e.jsxs("div",{className:`workhub-task-time-ring${W.isOverdue?" is-overdue":""}${W.hasDueDate?"":" is-empty"}`,children:[e.jsxs("svg",{viewBox:"0 0 72 72","aria-hidden":"true",children:[e.jsx("circle",{className:"workhub-task-time-ring-track",cx:"36",cy:"36",r:pe}),e.jsx("circle",{className:"workhub-task-time-ring-progress",cx:"36",cy:"36",r:pe,style:{strokeDasharray:`${Le} ${Le}`,strokeDashoffset:Fe}})]}),e.jsxs("div",{className:"workhub-task-time-ring-center",children:[e.jsx("strong",{children:W.centerValue}),e.jsx("span",{children:W.centerCaption})]})]})}),Ce]}):u?e.jsxs("div",{className:"workhub-task-grid-card",style:{display:"flex",flexDirection:"row",alignItems:"center",gap:10,width:"100%",minWidth:0,padding:"10px 8px 10px 6px",boxSizing:"border-box"},children:[e.jsxs("div",{className:"workhub-task-grid-card-body",style:{flex:"1 1 auto",minWidth:0,display:"grid",gridTemplateColumns:"min-content minmax(0, 1fr)",columnGap:"8px",rowGap:"6px",alignItems:"center"},children:[e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("input",{type:"checkbox",style:{margin:0,padding:0},checked:w,onChange:k=>E.onCheckboxChange(i.id,k.target.checked),onClick:k=>k.stopPropagation()})}),e.jsx("div",{className:"workhub-task-row-title workhub-task-grid-title",style:{flex:"1 1 auto",minWidth:0,overflow:"hidden",textAlign:"left",direction:"ltr"},onDoubleClick:k=>{k.stopPropagation(),Y||E.onTitleEditStart(i)},children:Y?e.jsx("input",{type:"text",className:"workhub-task-title-edit-input",style:{width:"100%",boxSizing:"border-box"},value:H,onChange:k=>E.onTitleEditTextChange(k.target.value),onClick:k=>k.stopPropagation(),onDoubleClick:k=>k.stopPropagation(),onKeyDown:k=>{k.stopPropagation(),k.key==="Enter"?(k.preventDefault(),E.onTitleEditSave(i)):k.key==="Escape"&&(k.preventDefault(),E.onTitleEditCancel())},onBlur:()=>E.onTitleEditSave(i),autoFocus:!0}):e.jsx("strong",{style:{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:700,fontSize:"0.82rem"},onDoubleClick:k=>{k.stopPropagation(),E.onTitleEditStart(i)},children:ct(i.title||"")||"Untitled task"})}),e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("button",{ref:we,type:"button",className:"workhub-task-grid-meta-btn is-assignee",style:{display:"flex",alignItems:"center",justifyContent:"center",border:"none",background:"none",padding:"2px",margin:0,cursor:"pointer"},"aria-label":`Assignee: ${M}`,onClick:k=>{k.stopPropagation(),E.onOpenAssigneeMenu(i.id)},children:x?.photoURL?e.jsx("img",{src:x.photoURL,alt:M,style:{width:16,height:16,borderRadius:"50%",objectFit:"cover",display:"block"}}):e.jsx("span",{style:{fontSize:"0.72rem",lineHeight:1},children:"👤"})})}),e.jsxs("div",{className:"workhub-task-grid-line2",style:{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",minWidth:0},children:[e.jsxs("button",{type:"button",className:`workhub-task-grid-meta-btn is-due${i.dueDate?" is-set":""}`,style:{display:"inline-flex",alignItems:"center",gap:4,border:"none",background:"none",color:i.dueDate?"#2a6aa0":"#4a6a90",fontWeight:i.dueDate?600:500,fontSize:"0.71rem",borderRadius:4,padding:"2px 4px",cursor:"pointer",position:"relative"},onClick:k=>{k.stopPropagation();const ne=k.currentTarget.closest(".workhub-task-grid-line2")?.querySelector(".workhub-task-due-input");if(!ne)return;ne.showPicker?.(),ne.focus()},title:i.dueDate?`Due: ${O}`:"Set due date",children:["📅 ",e.jsx("span",{children:O}),e.jsx("input",{type:"date",lang:"en-GB",className:"workhub-task-due-input",style:{position:"absolute",opacity:0,pointerEvents:"none",width:0,height:0},value:i.dueDate||"",onClick:k=>k.stopPropagation(),onChange:k=>E.onDueDateChange(i,k.target.value),"aria-label":"Due date"})]}),e.jsx("span",{className:`workhub-priority-indicator priority-${i.priority}`,style:{fontSize:"0.78rem",lineHeight:1},"aria-label":`Priority: ${Qo[i.priority]}`,children:hi(i.priority)})]})]}),e.jsxs("div",{className:`workhub-task-grid-time-ring${W.isOverdue?" is-overdue":""}${W.hasDueDate?"":" is-empty"}`,style:{flexShrink:0,width:40,height:40,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},"aria-label":W.textLabel,title:W.textLabel,children:[e.jsxs("svg",{viewBox:"0 0 36 36","aria-hidden":"true",style:{position:"absolute",inset:0,width:"100%",height:"100%",transform:"rotate(-90deg)"},children:[e.jsx("circle",{cx:"18",cy:"18",r:Oe,fill:"none",stroke:"#d8e8f5",strokeWidth:"3"}),e.jsx("circle",{cx:"18",cy:"18",r:Oe,fill:"none",stroke:W.isOverdue?"#e05050":W.hasDueDate?"#4a7cbc":"#9ab0cc",strokeWidth:"3",strokeLinecap:"round",strokeDasharray:`${be} ${be}`,strokeDashoffset:Re})]}),e.jsx("div",{style:{position:"relative",zIndex:1,textAlign:"center",lineHeight:1},children:e.jsx("strong",{style:{display:"block",fontSize:"0.62rem",fontWeight:700,color:W.isOverdue?"#c03030":"#2a5585",whiteSpace:"nowrap"},children:W.centerValue})})]}),Ce]}):e.jsxs("div",{className:"workhub-task-row-grid",children:[e.jsxs("div",{className:"workhub-task-col details",children:[e.jsx("button",{type:"button",className:"workhub-task-drag-handle",draggable:!0,onClick:k=>k.stopPropagation(),onDragStart:k=>{k.stopPropagation(),E.onDragStart(k,i.id,i.status)},onDragEnd:()=>E.onDragEnd(),"aria-label":"Drag to reorder",children:"⋮⋮"}),e.jsx("input",{type:"checkbox",checked:w,onChange:k=>E.onCheckboxChange(i.id,k.target.checked),onClick:k=>k.stopPropagation()}),e.jsx("div",{className:"workhub-task-row-title",onDoubleClick:k=>{k.stopPropagation(),Y||E.onTitleEditStart(i)},children:Y?e.jsx("input",{type:"text",className:"workhub-task-title-edit-input",value:H,onChange:k=>E.onTitleEditTextChange(k.target.value),onClick:k=>k.stopPropagation(),onDoubleClick:k=>k.stopPropagation(),onKeyDown:k=>{k.stopPropagation(),k.key==="Enter"?(k.preventDefault(),E.onTitleEditSave(i)):k.key==="Escape"&&(k.preventDefault(),E.onTitleEditCancel())},onBlur:()=>E.onTitleEditSave(i),autoFocus:!0}):e.jsx("strong",{onDoubleClick:k=>{k.stopPropagation(),E.onTitleEditStart(i)},children:ct(i.title||"")||"Untitled task"})})]}),B&&e.jsxs("div",{className:"workhub-task-col finance-value",onClick:k=>k.stopPropagation(),children:[e.jsx("span",{className:"workhub-finance-value-currency",children:i.valueCurrency||"OMR"}),e.jsx("input",{type:"number",min:0,step:.01,className:"workhub-finance-value-input",defaultValue:i.valueAmount??"",placeholder:"0.00",onClick:k=>k.stopPropagation(),onKeyDown:k=>{k.stopPropagation(),k.key==="Enter"&&k.target.blur(),k.key==="Escape"&&k.target.blur()},onBlur:k=>{const ge=k.target.value.trim(),ne=ge===""?null:parseFloat(ge);E.onTaskValueChange&&E.onTaskValueChange(i,ne!==null&&!isNaN(ne)?ne:null)}},i.valueAmount??"empty")]}),e.jsxs("div",{className:"workhub-task-col assignee",children:[e.jsxs("div",{className:"workhub-task-people",children:[te&&e.jsx("span",{className:"workhub-assignee-badge workhub-task-creator-badge",children:I.photoURL?e.jsx("img",{src:I.photoURL,alt:z}):e.jsx("span",{className:"workhub-assignee-initials",children:Rn(z)})}),e.jsx("button",{ref:we,type:"button",className:`workhub-assignee-badge workhub-task-assignee-btn${R?" is-creator":""}`,"aria-label":`Assignee: ${M}`,onClick:k=>{k.stopPropagation(),E.onOpenAssigneeMenu(i.id)},children:x?.photoURL?e.jsx("img",{src:x.photoURL,alt:M}):e.jsx("span",{className:"workhub-assignee-fallback",children:"👤"})})]}),Ce]}),e.jsx("div",{className:"workhub-task-col due",children:e.jsxs("div",{className:"workhub-task-due-inline",children:[e.jsx("button",{type:"button",className:"workhub-task-due-picker-trigger",onClick:k=>{k.stopPropagation();const ne=k.currentTarget.closest(".workhub-task-due-inline")?.querySelector(".workhub-task-due-input");if(!ne)return;ne.showPicker?.(),ne.focus()},"aria-label":"Open due date picker",children:"📅"}),e.jsx("button",{type:"button",className:`workhub-task-due-label${i.dueDate?" is-set":""}`,onClick:k=>{k.stopPropagation();const ne=k.currentTarget.closest(".workhub-task-due-inline")?.querySelector(".workhub-task-due-input");if(!ne)return;ne.showPicker?.(),ne.focus()},title:i.dueDate?`Due date: ${Io(i.dueDate,i.dueTime)}`:"Set due date","aria-label":i.dueDate?`Due date ${fe}`:"Set due date",children:fe}),i.startDate&&e.jsxs("span",{className:"workhub-task-start-inline",title:`Start date: ${Io(i.startDate)}`,children:["▶ ",Io(i.startDate)]}),ye>0&&e.jsxs("span",{className:"workhub-task-title-checklist-progress",title:`${je} of ${ye} checklist items done`,children:[e.jsx("span",{className:"workhub-task-checklist-progress-track","aria-hidden":"true",children:e.jsx("span",{className:"workhub-task-checklist-progress-fill",style:{width:`${Ie}%`}})}),e.jsxs("span",{className:"workhub-task-checklist-progress-label",children:[je,"/",ye]})]}),e.jsx("input",{type:"date",lang:"en-GB",className:"workhub-task-due-input",value:i.dueDate||"",onClick:k=>k.stopPropagation(),onChange:k=>E.onDueDateChange(i,k.target.value),"aria-label":i.dueDate?`Due date: ${Io(i.dueDate,i.dueTime)}`:"Set due date"})]})}),e.jsx("div",{className:"workhub-task-col priority",children:e.jsx("span",{className:`workhub-priority-indicator priority-${i.priority}`,"aria-label":`Priority: ${Qo[i.priority]}`,children:hi(i.priority)})}),e.jsxs("div",{className:"workhub-task-col checklist-inline",children:[_>0&&e.jsxs("span",{className:"workhub-task-comment-unread-chip",title:`${_} unread comment${_===1?"":"s"}`,"aria-label":`${_} unread comment${_===1?"":"s"}`,children:["💬 ",_]}),Z>0&&e.jsx("span",{className:"workhub-task-attachment-chip",title:`${Z} attachment${Z===1?"":"s"}`,"aria-label":`${Z} attachment${Z===1?"":"s"}`,children:"📎"}),ye>0&&e.jsxs("span",{className:"workhub-task-checklist-progress",title:`${je} of ${ye} checklist items completed`,children:[e.jsx("span",{className:"workhub-task-checklist-progress-track","aria-hidden":"true",children:e.jsx("span",{className:"workhub-task-checklist-progress-fill",style:{width:`${Ie}%`}})}),e.jsxs("span",{className:"workhub-task-checklist-progress-label",children:[je,"/",ye]})]}),e.jsx("button",{className:"workhub-checklist-toggle",onClick:k=>{k.stopPropagation(),E.onToggleChecklist(i.id)},"aria-label":"Toggle checklist",children:ye})]})]}),$&&e.jsxs("div",{className:"workhub-task-checklist",onClick:k=>k.stopPropagation(),children:[X.length===0?e.jsx("div",{className:"workhub-checklist-empty",children:"No checklist items yet."}):e.jsx("div",{className:"workhub-checklist-items",children:X.map((k,ge)=>e.jsxs("div",{className:`workhub-checklist-item ${ge%2===0?"even":"odd"}`,children:[e.jsx("div",{className:"workhub-checklist-left",children:e.jsxs("div",{className:"workhub-checklist-item-main",children:[e.jsx("input",{type:"checkbox",checked:k.completed,onChange:ne=>E.onChecklistItemToggle(i,k.id,ne.target.checked),onClick:ne=>ne.stopPropagation()}),b==="inline"&&V===k.id?e.jsx("input",{type:"text",value:D,onChange:ne=>E.onChecklistItemTextChange(ne.target.value),onKeyDown:ne=>{ne.stopPropagation(),ne.key==="Enter"?(ne.preventDefault(),E.onChecklistItemEditSave(i,k.id)):ne.key==="Escape"&&(ne.preventDefault(),E.onChecklistItemEditCancel())},onBlur:()=>E.onChecklistItemEditSave(i,k.id),className:"workhub-checklist-edit-input",autoFocus:!0}):e.jsx("span",{className:`workhub-checklist-item-text${k.completed?" is-checked":""}`,onDoubleClick:()=>E.onChecklistItemEditStart(i.id,k.id,k.text,"inline"),children:k.text})]})}),e.jsxs("div",{className:"workhub-checklist-actions",children:[B&&e.jsx("input",{type:"number",min:0,step:.01,className:"workhub-checklist-value-input",value:k.valueAmount??"",placeholder:"0.00",onClick:ne=>ne.stopPropagation(),onChange:ne=>{const $e=ne.target.value.trim(),ie=$e===""?null:parseFloat($e);E.onChecklistItemValueChange&&E.onChecklistItemValueChange(i,k.id,ie!==null&&!isNaN(ie)?ie:null)},onBlur:ne=>{const $e=ne.target.value.trim(),ie=$e===""?null:parseFloat($e);E.onChecklistItemValueChange&&E.onChecklistItemValueChange(i,k.id,ie!==null&&!isNaN(ie)?ie:null)}}),e.jsx("button",{type:"button",className:"workhub-checklist-edit",onClick:ne=>{ne.stopPropagation(),E.onChecklistItemEditStart(i.id,k.id,k.text,"inline")},"aria-label":"Edit checklist item",children:"✏️"}),e.jsx("button",{type:"button",className:"workhub-checklist-remove",onClick:ne=>{ne.stopPropagation(),E.onChecklistRemove(i,k.id)},"aria-label":"Delete checklist item",children:"🗑️"})]})]},k.id))}),e.jsxs("div",{className:"workhub-checklist-add",children:[e.jsx("input",{type:"text",value:de,placeholder:"Add checklist item",onChange:k=>E.onChecklistDraftChange(i.id,k.target.value),onKeyDown:k=>{k.key==="Enter"&&(k.preventDefault(),E.onChecklistAdd(i))}}),e.jsx("button",{type:"button",onClick:()=>E.onChecklistAdd(i),disabled:!de.trim()||N,children:"Add"})]})]})]})})}),$0=r.memo(function(i){const{status:c,assignableMembersByProjectId:s,workspaceAssignableMembers:d,memberByUid:w,flatVisibleProjectOptions:f,defaultProjectId:T,selectedProjectId:C,isFinanceLayout:g=!1,financeCurrency:y="OMR",currentUid:q,activeDragTaskId:F,activeDragStatusId:re,dropTargetKey:Y,focusTrigger:H,onFocusHandled:$,onDragOverEnd:de,onDropToEnd:V,onCommit:b}=i,[D,N]=r.useState(""),[x,I]=r.useState(""),[K,he]=r.useState("medium"),[_,B]=r.useState(""),[E,X]=r.useState(""),[we,L]=r.useState(""),[v,M]=r.useState(!1),[z,te]=r.useState(!1),[R,se]=r.useState(!1),fe=r.useRef(!1),Z=r.useRef(!1),ye=r.useRef(`${C}|${T}`),je=r.useRef(""),Ie=r.useRef(""),ee=r.useRef("medium"),u=r.useRef(""),W=r.useRef(""),O=r.useRef(""),pe=r.useRef(null),Le=r.useRef(null),Fe=D.trim().length>0,be=s[E||(C!=="all"?C:T)]||d,Re=be.some(p=>p.uid===q),Ce=Re?x||q||"":x||be[0]?.uid||"",k=w[Ce],ge=k?.displayName||k?.email||"Me";r.useEffect(()=>{H&&(Le.current?.scrollIntoView({behavior:"smooth",block:"nearest"}),Le.current?.focus(),$?.())},[H,$]),r.useEffect(()=>{if(be.length===0){x&&(I(""),Ie.current="");return}if(x&&be.some(A=>A.uid===x))return;if(Re){x!==""&&(I(""),Ie.current="");return}const p=be[0]?.uid||"";p!==x&&(I(p),Ie.current=p)},[x,Re,be]);const ne=()=>{N(""),je.current="",I(""),Ie.current="",he("medium"),ee.current="medium",B(""),u.current="",X(""),W.current="",L(""),O.current="",M(!1),te(!1)};r.useEffect(()=>{const p=`${C}|${T}`;ye.current!==p&&(ye.current=p,ne())},[T,C]);const $e=async p=>{const A=ct(p);if(!A||R||fe.current)return!1;fe.current=!0,Z.current=!0;const G={title:je.current,assigneeUid:Ie.current,priority:ee.current,dueDate:u.current,projectId:W.current,valueAmountDraft:O.current};N(""),je.current="",L(""),O.current="",M(!1),te(!1),se(!0);try{const ue=Number(G.valueAmountDraft);return await b({statusId:c.id,title:A,assigneeUid:G.assigneeUid,priority:G.priority,dueDate:G.dueDate,projectId:G.projectId,valueAmount:g&&Number.isFinite(ue)&&ue>=0?Math.round(ue*100)/100:void 0,valueCurrency:g?y:void 0})?(ne(),!0):(N(G.title),je.current=G.title,I(G.assigneeUid),Ie.current=G.assigneeUid,he(G.priority),ee.current=G.priority,B(G.dueDate),u.current=G.dueDate,X(G.projectId),W.current=G.projectId,L(G.valueAmountDraft),O.current=G.valueAmountDraft,!1)}finally{se(!1),fe.current=!1}},ie=async p=>$e(typeof p=="string"?p:D);return e.jsx("article",{ref:pe,className:`workhub-task-row workhub-task-row-draft${Fe?" is-selected":""}${v||z?" has-open-menu":""}${Y===`end:${c.id}`?" is-drop-target":""}`,onDragOver:p=>{!F||re!==c.id||(p.preventDefault(),de(c.id))},onDrop:p=>{!F||re!==c.id||(p.preventDefault(),V(c.id))},onBlurCapture:()=>{window.setTimeout(()=>{if(Z.current){Z.current=!1;return}if(fe.current)return;const p=document.activeElement;if(pe.current?.contains(p))return;const A=je.current;A.trim()?ie(A):(M(!1),te(!1))},0)},children:e.jsx("div",{className:"workhub-task-row-main",children:e.jsxs("div",{className:"workhub-task-row-grid",children:[e.jsxs("div",{className:"workhub-task-col details",children:[e.jsx("span",{className:"workhub-task-drag-handle workhub-task-drag-handle-placeholder","aria-hidden":"true",children:"⋮⋮"}),e.jsx("input",{type:"checkbox",disabled:!0}),e.jsx("div",{className:"workhub-task-row-title",children:e.jsx("input",{ref:Le,type:"text",className:"workhub-task-title-edit-input workhub-quick-add-title-input",placeholder:"+ Add task…",value:D,onChange:p=>{N(p.target.value),je.current=p.target.value},onPaste:p=>{const A=p.clipboardData.getData("text");/\r?\n/.test(A)&&(p.preventDefault(),$e(A))},onKeyDown:p=>{p.key==="Enter"&&(p.preventDefault(),ie(p.currentTarget.value)),p.key==="Escape"&&(p.preventDefault(),ne(),Le.current?.blur())}})})]}),g?e.jsx("div",{className:"workhub-task-col finance-value",children:Fe?e.jsxs("div",{className:"workhub-quick-add-finance-value-wrap",title:"Task value",children:[e.jsx("span",{className:"workhub-finance-value-currency",children:y}),e.jsx("input",{type:"number",min:0,step:.01,className:"workhub-quick-add-value-input",value:we,onChange:p=>{L(p.target.value),O.current=p.target.value},placeholder:"0.00"})]}):e.jsx("span",{className:"workhub-quick-add-placeholder"})}):e.jsx("div",{className:"workhub-task-col status",children:Fe?e.jsx("button",{type:"button",className:"workhub-task-status-btn workhub-task-status-btn-static",style:{"--status-color":c.color},tabIndex:-1,"aria-label":`Status: ${c.label}`,children:e.jsx("span",{className:"status-dot"})}):e.jsx("span",{className:"workhub-quick-add-placeholder"})}),e.jsx("div",{className:"workhub-task-col assignee",children:Fe?e.jsxs("div",{className:"workhub-quick-add-menu-wrap",children:[e.jsx("button",{type:"button",className:"workhub-quick-add-trigger workhub-quick-add-assignee-trigger","aria-label":`Assignee: ${ge}`,onClick:()=>{M(p=>!p),te(!1)},children:e.jsx("span",{className:"workhub-assignee-badge",children:k?.photoURL?e.jsx("img",{src:k.photoURL,alt:ge}):e.jsx("span",{className:"workhub-assignee-fallback",children:"👤"})})}),v&&e.jsxs("div",{className:"workhub-detail-icon-menu workhub-quick-add-menu",children:[Re&&e.jsxs("button",{type:"button",className:x?"":"is-active",onClick:()=>{I(""),Ie.current="",M(!1)},children:[e.jsx("span",{className:"workhub-assignee-fallback",children:"👤"}),e.jsx("span",{children:"Me"})]}),be.map(p=>e.jsxs("button",{type:"button",className:x===p.uid?"is-active":"",onClick:()=>{I(p.uid),Ie.current=p.uid,M(!1)},children:[e.jsx("span",{className:"workhub-assignee-badge",children:p.photoURL?e.jsx("img",{src:p.photoURL,alt:p.displayName||p.email||p.uid}):e.jsx("span",{className:"workhub-assignee-fallback",children:"👤"})}),e.jsx("span",{children:p.displayName||p.email||p.uid})]},p.uid))]})]}):e.jsx("span",{className:"workhub-quick-add-placeholder"})}),e.jsx("div",{className:"workhub-task-col due",children:Fe?e.jsx("input",{className:"workhub-quick-add-date",type:"date",lang:"en-GB",value:_,onChange:p=>{B(p.target.value),u.current=p.target.value}}):e.jsx("span",{className:"workhub-quick-add-placeholder"})}),e.jsx("div",{className:"workhub-task-col priority",children:Fe?e.jsxs("div",{className:"workhub-quick-add-menu-wrap",children:[e.jsx("button",{type:"button",className:`workhub-quick-add-trigger workhub-priority-indicator priority-${K}`,"aria-label":`Priority: ${Qo[K]}`,onClick:()=>{te(p=>!p),M(!1)},children:hi(K)}),z&&e.jsx("div",{className:"workhub-task-priority-menu workhub-quick-add-menu",children:Object.keys(Qo).map(p=>e.jsxs("button",{type:"button",className:K===p?"is-active":"",onClick:()=>{he(p),ee.current=p,te(!1)},children:[e.jsx("span",{className:`workhub-priority-indicator priority-${p}`,children:hi(p)}),e.jsx("span",{children:Qo[p]})]},p))})]}):e.jsx("span",{className:"workhub-quick-add-placeholder"})}),e.jsx("div",{className:"workhub-task-col checklist-inline",children:Fe?e.jsxs(e.Fragment,{children:[C==="all"&&f.length>1?e.jsxs("select",{className:"workhub-quick-add-select workhub-quick-add-project-select",value:E,onChange:p=>{X(p.target.value),W.current=p.target.value},children:[e.jsx("option",{value:"",children:"Auto"}),f.map(p=>e.jsx("option",{value:p.id,children:p.name},p.id))]}):e.jsx("span",{className:"workhub-quick-add-inline-note",children:"List later"}),g&&e.jsx("button",{type:"button",className:"workhub-quick-add-confirm",disabled:R,onMouseDown:p=>p.preventDefault(),onClick:()=>{ie()},children:R?"...":"Add"})]}):e.jsx("span",{className:"workhub-quick-add-placeholder"})}),!g&&e.jsx("div",{className:"workhub-task-col actions-inline",children:Fe?e.jsx("button",{type:"button",className:"workhub-quick-add-confirm",disabled:R,onMouseDown:p=>p.preventDefault(),onClick:()=>{ie()},children:R?"...":"Add"}):e.jsx("span",{className:"workhub-quick-add-placeholder"})})]})})})}),lx={not_started:"Not started",in_progress:"In progress",at_risk:"At risk",completed:"Completed"},cx={not_started:"#94a3b8",in_progress:"#0ea5e9",at_risk:"#f59e0b",completed:"#10b981"};function dx(o){if(!o)return{label:"",isOverdue:!1};const i=new Date(o),c=new Date;c.setHours(0,0,0,0);const s=i<c;return{label:i.toLocaleDateString(void 0,{month:"short",day:"numeric",year:"numeric"}),isOverdue:s}}const ux=r.memo(function({milestone:i,progress:c,canEdit:s,onEdit:d,onDelete:w,onStatusChange:f}){const{label:T,isOverdue:C}=dx(i.dueDate||""),g=i.color||"#6366f1",y=cx[i.status]??"#94a3b8",q=i.status==="completed",F=i.status==="at_risk"||!q&&C;return e.jsxs("div",{className:`workhub-milestone-card${q?" is-completed":""}${F?" is-at-risk":""}`,children:[e.jsxs("div",{className:"workhub-milestone-card-header",children:[e.jsx("span",{className:"workhub-milestone-dot",style:{background:g}}),e.jsx("span",{className:"workhub-milestone-name",children:i.name}),e.jsx("span",{className:"workhub-milestone-status-badge",style:{color:y,borderColor:y},children:lx[i.status]??i.status}),s&&e.jsxs("div",{className:"workhub-milestone-actions",children:[e.jsx("button",{type:"button",className:"workhub-icon-btn",title:"Edit milestone",onClick:()=>d(i),children:"✎"}),e.jsx("button",{type:"button",className:"workhub-icon-btn workhub-icon-btn-danger",title:"Delete milestone",onClick:()=>w(i.id),children:"✕"})]})]}),i.description&&e.jsx("p",{className:"workhub-milestone-description",children:i.description}),e.jsxs("div",{className:"workhub-milestone-meta",children:[T&&e.jsxs("span",{className:`workhub-milestone-due${C&&!q?" is-overdue":""}`,children:[C&&!q?"⚠ Overdue · ":"","Due ",T]}),F&&!C&&e.jsx("span",{className:"workhub-milestone-at-risk-badge",children:"At risk"})]}),e.jsxs("div",{className:"workhub-milestone-progress",children:[e.jsx("div",{className:"workhub-milestone-progress-bar-track",children:e.jsx("div",{className:"workhub-milestone-progress-bar-fill",style:{width:`${c.pct}%`,background:g}})}),e.jsxs("span",{className:"workhub-milestone-progress-label",children:[c.completed,"/",c.total," tasks · ",c.pct,"%"]})]}),s&&e.jsxs("div",{className:"workhub-milestone-status-actions",children:[i.status==="not_started"&&e.jsx("button",{type:"button",className:"workhub-milestone-action-btn is-activate",onClick:()=>f(i.id,"in_progress"),title:"Activate this milestone",children:"▶ Activate"}),(i.status==="in_progress"||i.status==="at_risk")&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"workhub-milestone-action-btn is-complete",onClick:()=>f(i.id,"completed"),title:"Mark as completed",children:"✓ Complete"}),i.status==="in_progress"&&e.jsx("button",{type:"button",className:"workhub-milestone-action-btn is-risk",onClick:()=>f(i.id,"at_risk"),title:"Flag as at risk",children:"⚠ At risk"}),i.status==="at_risk"&&e.jsx("button",{type:"button",className:"workhub-milestone-action-btn is-resume",onClick:()=>f(i.id,"in_progress"),title:"Resume — back to in progress",children:"↩ Resume"})]}),i.status==="completed"&&e.jsx("button",{type:"button",className:"workhub-milestone-action-btn is-reopen",onClick:()=>f(i.id,"in_progress"),title:"Reopen this milestone",children:"↩ Reopen"})]})]})}),hx={not_started:"Not started",in_progress:"In progress",at_risk:"At risk",completed:"Completed"};function px(o,i,c){const s=new Date().toLocaleDateString(void 0,{year:"numeric",month:"long",day:"numeric"}),d=o.map(T=>{const C=i[T.id]??{total:0,completed:0,pct:0},g=T.dueDate?new Date(T.dueDate).toLocaleDateString(void 0,{month:"short",day:"numeric",year:"numeric"}):"—",y=T.dueDate&&T.status!=="completed"&&new Date(T.dueDate)<new Date,q=hx[T.status]??T.status;return`
      <tr>
        <td><span class="dot" style="background:${T.color||"#6366f1"}"></span>${T.name}</td>
        <td>${q}</td>
        <td class="${y?"overdue":""}">${g}</td>
        <td>${C.completed}/${C.total}</td>
        <td>
          <div class="bar-wrap"><div class="bar-fill" style="width:${C.pct}%;background:${T.color||"#6366f1"}"></div></div>
          ${C.pct}%
        </td>
        <td class="desc">${T.description||""}</td>
      </tr>`}).join(""),w=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Milestones${c?` — ${c}`:""}</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 11px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f4f4f5; text-align: left; padding: 6px 10px; font-size: 11px; border-bottom: 2px solid #ddd; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: middle; }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
    .bar-wrap { display: inline-block; width: 60px; height: 6px; background: #e5e7eb; border-radius: 3px; vertical-align: middle; margin-right: 4px; }
    .bar-fill { height: 100%; border-radius: 3px; }
    .overdue { color: #dc2626; font-weight: 600; }
    .desc { color: #555; font-size: 11px; max-width: 200px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Milestones${c?` — ${c}`:""}</h1>
  <div class="meta">Printed on ${s} · ${o.length} milestone${o.length!==1?"s":""}</div>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Status</th>
        <th>Due date</th>
        <th>Tasks</th>
        <th>Progress</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>${d}</tbody>
  </table>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`,f=window.open("","_blank","width=900,height=650");f&&(f.document.write(w),f.document.close())}const bx=r.memo(function({milestones:i,milestoneProgress:c,canEdit:s,projectName:d,onAdd:w,onEdit:f,onDelete:T,onStatusChange:C}){return e.jsxs("div",{className:"workhub-milestones-panel",children:[e.jsxs("div",{className:"workhub-milestones-panel-header",children:[e.jsxs("span",{className:"workhub-milestones-panel-title",children:["Milestones",i.length>0&&e.jsx("span",{className:"workhub-milestones-count-badge",children:i.length})]}),e.jsxs("div",{className:"workhub-milestones-panel-actions",children:[i.length>0&&e.jsx("button",{type:"button",className:"workhub-btn workhub-btn-sm workhub-btn-ghost",title:"Print milestone report",onClick:()=>px(i,c,d),children:"🖨 Print"}),s&&e.jsx("button",{type:"button",className:"workhub-btn workhub-btn-sm workhub-btn-ghost",onClick:w,children:"+ Add"})]})]}),i.length===0?e.jsxs("div",{className:"workhub-empty-state workhub-milestones-empty",children:["No milestones yet.",s&&e.jsxs(e.Fragment,{children:[" ",e.jsx("button",{type:"button",className:"workhub-inline-link",onClick:w,children:"Add the first one."})]})]}):e.jsx("div",{className:"workhub-milestones-list",children:i.map(g=>e.jsx(ux,{milestone:g,progress:c[g.id]??{total:0,completed:0,pct:0},canEdit:s,onEdit:f,onDelete:T,onStatusChange:C},g.id))})]})});function fx(o){if(!o.project)return null;const i=o.entityIcon||"📁",c=o.entityLabel||"Project",s=c.toLowerCase(),d=new Map(o.projectColorMeanings.map(b=>[b.color.toLowerCase(),b])),w=d.get(o.settingsColor.toLowerCase())||{color:o.settingsColor,label:"Custom color",hint:`Custom meaning (${o.settingsColor.toUpperCase()}).`},f=o.intent==="project",T=o.childCount>0||o.taskCount>0,[C,g]=r.useState(o.intent==="proposal"),[y,q]=r.useState(o.settingsTechnicalProposalUrl.trim().length===0),[F,re]=r.useState(o.settingsFinancialProposalUrl.trim().length===0),[Y,H]=r.useState("");r.useEffect(()=>{g(o.intent==="proposal")},[o.intent,o.project.id]),r.useEffect(()=>{q(o.settingsTechnicalProposalUrl.trim().length===0)},[o.project.id,o.settingsTechnicalProposalUrl]),r.useEffect(()=>{re(o.settingsFinancialProposalUrl.trim().length===0)},[o.project.id,o.settingsFinancialProposalUrl]),r.useEffect(()=>{H("")},[o.project.id]);function $(b){const D=(b||"").trim();if(!D)return[];const N=D.match(/(?:https?:\/\/|www\.)[^\s<]+/gi)||[],x=[];for(const I of N){const K=I.replace(/[),.;!?]+$/g,"");K&&(x.includes(K)||x.push(K))}return x}function de(b){const D=r.useRef(null),N=b.rows||4;return r.useEffect(()=>{const x=D.current;if(!x)return;const I=280,K=Math.max(N*22,90);x.style.height="auto";const he=Math.min(I,Math.max(x.scrollHeight,K));x.style.height=`${he}px`,x.style.overflowY=x.scrollHeight>I?"auto":"hidden"},[b.value,N]),e.jsx("textarea",{ref:D,className:"workhub-auto-grow-textarea",name:b.name,value:b.value,onChange:b.onChange,rows:N,placeholder:b.placeholder,disabled:b.disabled})}function V(b){const D=b.value.trim();return!b.editing&&D?e.jsxs("label",{className:"workhub-span-2 workhub-project-settings-link-field",children:[e.jsx("span",{children:b.label}),e.jsxs("div",{className:"workhub-project-settings-link-row",children:[e.jsx("a",{href:D,target:"_blank",rel:"noreferrer",className:"workhub-project-settings-link-value",title:D,children:D}),e.jsx("button",{type:"button",className:"workhub-ghost-mini workhub-project-settings-link-edit-btn",onClick:()=>b.onEditToggle(!0),"aria-label":`Edit ${b.label}`,title:`Edit ${b.label}`,children:"✏"})]})]}):e.jsxs("label",{className:"workhub-span-2 workhub-project-settings-link-field",children:[e.jsx("span",{children:b.label}),e.jsxs("div",{className:"workhub-project-settings-link-editor-row",children:[e.jsx("input",{name:b.name,type:"url",value:b.value,onChange:N=>b.onChange(N.target.value),placeholder:b.placeholder}),D&&e.jsx("button",{type:"button",className:"workhub-ghost-mini workhub-project-settings-link-edit-btn",onClick:()=>b.onEditToggle(!1),"aria-label":`Done editing ${b.label}`,title:`Done editing ${b.label}`,children:"✓"})]})]})}return e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:b=>{b.target===b.currentTarget&&o.onClose()},children:e.jsxs("div",{className:"workhub-modal workhub-project-settings-modal",onMouseDown:b=>b.stopPropagation(),children:[e.jsx("div",{className:"workhub-modal-head workhub-project-settings-head",children:e.jsxs("div",{children:[e.jsx("h2",{children:`${i} ${c} settings`}),e.jsx("span",{className:"workhub-psettings-version",children:`v${Qk} · ${Jk}`})]})}),e.jsx("div",{className:"workhub-project-settings-body",children:e.jsxs("section",{className:"workhub-project-settings-main",children:[e.jsx("h3",{className:"workhub-project-settings-section-title",children:"General details"}),e.jsxs("div",{className:"workhub-project-settings-grid-preview",children:[e.jsxs("label",{className:"workhub-col-span-6",children:[e.jsx("span",{children:`${c} name`}),e.jsx("input",{name:"projectSettingsName",value:o.settingsName,onChange:b=>o.onNameChange(b.target.value),placeholder:`${c} name`})]}),!f&&e.jsxs("label",{className:"workhub-col-span-3",children:[e.jsx("span",{children:o.settingsDeadlineLabel}),e.jsx("input",{type:"date",value:o.settingsDeadline,onChange:b=>o.onDeadlineChange(b.target.value)})]}),!f&&(o.settingsType==="tender"?e.jsxs("label",{className:"workhub-col-span-3",children:[e.jsx("span",{children:"Submission time"}),e.jsx("input",{type:"time",value:o.settingsSubmissionTime,onChange:b=>o.onSubmissionTimeChange(b.target.value)})]}):e.jsxs("label",{className:"workhub-col-span-3",children:[e.jsx("span",{children:"Submission time"}),e.jsx("input",{type:"time",value:"",disabled:!0})]})),e.jsxs("label",{className:"workhub-col-span-6",children:[e.jsx("span",{children:f?"Parent folder/category":"Parent item/category"}),e.jsxs("select",{name:"projectSettingsParent",value:o.settingsParentId,onChange:b=>o.onParentChange(b.target.value),children:[e.jsx("option",{value:"",children:f?"Top-level folder":"Top-level item"}),o.parentOptions.map(b=>e.jsx("option",{value:b.id,children:`${"— ".repeat(b.depth)}${b.name}`},b.id))]})]}),!f&&e.jsxs("div",{className:"workhub-col-span-3 workhub-project-settings-client-field",children:[e.jsxs("label",{children:[e.jsx("span",{children:"Client"}),e.jsxs("select",{name:"projectSettingsClient",value:o.settingsClientId,onChange:b=>o.onClientChange(b.target.value),children:[e.jsx("option",{value:"",children:"No client assigned"}),o.clientOptions.map(b=>e.jsx("option",{value:b.id,children:b.name},b.id))]})]}),e.jsxs("div",{className:"workhub-inline-row workhub-client-quick-add",children:[e.jsx("input",{type:"text",value:Y,onChange:b=>H(b.target.value),placeholder:"Add new client by name"}),e.jsx("button",{type:"button",className:"workhub-ghost-mini",disabled:!Y.trim()||o.busyKey==="client:create",onClick:()=>{const b=Y.trim();b&&o.onCreateClientInline(b).then(D=>{D&&(o.onClientChange(D),H(""))})},children:o.busyKey==="client:create"?"Adding…":"Add client"})]})]}),!f&&e.jsxs("label",{className:"workhub-col-span-3",children:[e.jsx("span",{children:`${c} type`}),e.jsx("select",{name:"projectSettingsType",value:o.settingsType,onChange:b=>o.onTypeChange(b.target.value),children:o.typeOptions.map(b=>e.jsx("option",{value:b.value,children:b.label},b.value))})]}),!f&&e.jsxs("label",{className:"workhub-col-span-3",children:[e.jsx("span",{children:"Tender / RFP number"}),e.jsx("input",{name:"projectSettingsTenderNumber",value:o.settingsTenderNumber,onChange:b=>o.onTenderNumberChange(b.target.value),placeholder:"e.g. RFP-2026-041"})]}),!f&&e.jsxs("label",{className:"workhub-col-span-3",children:[e.jsx("span",{children:"Our proposal ID"}),e.jsx("input",{name:"projectSettingsProposalId",value:o.settingsProposalId,onChange:b=>o.onProposalIdChange(b.target.value),placeholder:"e.g. QYAN-PR-117"})]}),e.jsxs("label",{className:f?"workhub-col-span-6":"workhub-col-span-4",children:[e.jsx("span",{children:"Storage Method (For attachments)"}),e.jsxs("select",{name:"projectSettingsStorageMethod",value:o.settingsStorageMethod,onChange:b=>o.onStorageMethodChange(b.target.value),children:[e.jsx("option",{value:"firebase",children:"Attachments"}),e.jsx("option",{value:"drive",children:"Google Drive"})]})]}),!f&&e.jsxs("label",{className:"workhub-col-span-3",children:[e.jsx("span",{children:`${c} priority`}),e.jsx("select",{name:"projectSettingsPriority",value:o.settingsPriority,onChange:b=>o.onPriorityChange(b.target.value),children:fc.map(b=>e.jsx("option",{value:b.value,children:b.label},b.value))})]}),e.jsxs("div",{className:`${f?"workhub-col-span-6":"workhub-col-span-5"} workhub-project-settings-access-field`,children:[e.jsx("span",{children:"Access and visibility"}),e.jsxs("div",{className:"workhub-project-settings-access-options",children:[e.jsxs("label",{className:"workhub-access-toggle",children:[e.jsx("input",{type:"checkbox",checked:o.accessVisibility==="workspace",onChange:()=>o.onVisibilityChange("workspace")}),e.jsx("span",{className:`workhub-access-label${o.accessVisibility==="workspace"?" is-active":""}`,children:"Visible to workspace"})]}),e.jsxs("label",{className:"workhub-access-toggle",children:[e.jsx("input",{type:"checkbox",checked:o.accessVisibility==="restricted",onChange:()=>o.onVisibilityChange("restricted")}),e.jsx("span",{className:`workhub-access-label${o.accessVisibility==="restricted"?" is-active":""}`,children:"Restricted"})]})]})]})]}),o.accessVisibility==="restricted"&&e.jsx("div",{className:"workhub-member-picker workhub-project-settings-member-picker",children:o.approvedMembers.map(b=>{const D=o.accessMemberUids.includes(b.uid);return e.jsx("button",{type:"button",className:`workhub-member-chip${D?" is-selected":""}`,onClick:()=>o.onToggleMember(b.uid),children:b.displayName||b.email},b.uid)})}),e.jsxs("div",{className:"workhub-project-settings-meta",children:[e.jsxs("div",{className:"workhub-meta-line",children:[o.childCount," child item",o.childCount===1?"":"s"," · ",o.taskCount," task",o.taskCount===1?"":"s"]}),!o.project.driveFolderId&&o.onEnsureDriveFolder&&e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:o.onEnsureDriveFolder,disabled:o.busyKey===`drive:${o.project.id}`,children:o.busyKey===`drive:${o.project.id}`?"Creating...":"📁 Create Drive folder"})]}),e.jsx("div",{className:"workhub-project-settings-divider"}),e.jsxs("div",{className:"workhub-project-settings-bottom-grid",children:[e.jsxs("label",{className:"workhub-project-settings-description-field",children:[e.jsx("span",{children:"Description"}),e.jsx(de,{name:"projectSettingsDescription",value:o.settingsDescription,onChange:b=>o.onDescriptionChange(b.target.value),rows:4,placeholder:`${c} details`}),$(o.settingsDescription).length>0&&e.jsx("div",{className:"workhub-detected-links","aria-label":"Detected links in description",children:$(o.settingsDescription).map(b=>{const D=/^https?:\/\//i.test(b)?b:`https://${b}`;return e.jsx("a",{href:D,target:"_blank",rel:"noreferrer noopener",className:"workhub-detected-link",children:b},b)})})]}),e.jsxs("div",{className:"workhub-project-settings-color-field",children:[e.jsx("span",{children:"Status"}),e.jsx("div",{className:"workhub-status-options",children:o.projectColors.map(b=>{const D=d.get(b.toLowerCase())||{label:b,hint:b},N=`${D.label}: ${D.hint}`;return e.jsxs("button",{type:"button",className:`workhub-status-option${o.settingsColor===b?" active":""}`,onClick:()=>o.onColorChange(b),title:N,"aria-label":N,children:[e.jsx("span",{className:"workhub-status-option-dot",style:{background:b},"aria-hidden":"true"}),e.jsx("span",{className:"workhub-status-option-label",children:D.label})]},b)})}),e.jsxs("div",{className:"workhub-color-meaning-note",children:[e.jsx("strong",{children:w.label}),e.jsx("span",{children:w.hint})]}),o.statusSuggestion&&e.jsxs("div",{className:`workhub-project-settings-suggestion${o.statusSuggestion.applied?" is-applied":""}`,children:[e.jsxs("div",{className:"workhub-project-settings-suggestion-copy",children:[e.jsx("strong",{children:o.statusSuggestion.title}),e.jsx("span",{children:o.statusSuggestion.applied&&o.statusSuggestion.appliedLabel||o.statusSuggestion.description})]}),e.jsxs("div",{className:"workhub-project-settings-suggestion-actions",children:[!o.statusSuggestion.applied&&o.statusSuggestion.onApply&&o.statusSuggestion.buttonLabel&&e.jsx("button",{type:"button",className:"workhub-primary-mini",onClick:o.statusSuggestion.onApply,children:o.statusSuggestion.buttonLabel}),o.statusSuggestion.applied&&o.statusSuggestion.onCancel&&e.jsx("button",{type:"button",className:"workhub-ghost-mini",onClick:o.statusSuggestion.onCancel,children:o.statusSuggestion.cancelLabel||"Cancel"})]})]})]})]}),e.jsxs("details",{className:"workhub-project-settings-advanced",open:C,onToggle:b=>g(b.currentTarget.open),children:[e.jsx("summary",{children:"Advanced options"}),e.jsxs("div",{className:"workhub-settings-group-body",children:[o.showMonetaryValue&&e.jsxs("div",{className:"workhub-field-grid two compact workhub-project-settings-money-grid",children:[e.jsxs("label",{className:"workhub-span-2",children:[e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:"6px",justifyContent:"space-between"},children:[e.jsx("span",{children:o.monetaryValueLabel}),e.jsx("span",{style:{fontWeight:600,color:"#4a5e78",fontSize:"0.78rem"},children:o.settingsValueCurrency||"OMR"})]}),e.jsx("input",{type:"text",inputMode:"decimal",value:o.settingsValueAmount===""||o.settingsValueAmount==="0"?o.settingsValueAmount:(()=>{const b=parseFloat(o.settingsValueAmount.replace(/,/g,""));return Number.isFinite(b)?b.toLocaleString("en-US"):o.settingsValueAmount})(),onChange:b=>o.onValueAmountChange(b.target.value.replace(/,/g,"")),placeholder:"0"})]}),o.intent==="proposal"&&V({label:"Technical proposal URL",value:o.settingsTechnicalProposalUrl,name:"projectSettingsTechnicalProposalUrl",placeholder:"https://...",editing:y,onEditToggle:q,onChange:o.onTechnicalProposalUrlChange}),o.intent==="proposal"&&V({label:"Financial proposal URL",value:o.settingsFinancialProposalUrl,name:"projectSettingsFinancialProposalUrl",placeholder:"https://...",editing:F,onEditToggle:re,onChange:o.onFinancialProposalUrlChange})]}),e.jsxs("div",{children:[e.jsx("span",{children:"Main panel default"}),e.jsxs("div",{className:"workhub-switcher compact-switcher",style:{marginTop:6},children:[e.jsx("button",{type:"button",className:`workhub-switcher-btn${o.settingsMainPanelView==="dashboard"?" is-active":""}`,onClick:()=>o.onMainPanelViewChange("dashboard"),children:"Dashboard summary"}),e.jsx("button",{type:"button",className:`workhub-switcher-btn${o.settingsMainPanelView==="tasks"?" is-active":""}`,onClick:()=>o.onMainPanelViewChange("tasks"),children:"Tasks view"}),e.jsx("button",{type:"button",className:`workhub-switcher-btn${o.settingsMainPanelView==="dashboard_with_details"?" is-active":""}`,onClick:()=>o.onMainPanelViewChange("dashboard_with_details"),children:"Dashboard + details"})]})]}),f&&e.jsx("div",{style:{marginTop:8},children:e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:()=>o.onApplyViewSettingsToSubItems?.(),disabled:!o.onApplyViewSettingsToSubItems||!!o.applyViewSettingsBusy,children:o.applyViewSettingsBusy?"Applying…":"Apply current view settings to all sub-items"})}),f&&e.jsxs("label",{style:{display:"block",marginTop:10},children:[e.jsx("span",{children:"Task items display mode"}),e.jsxs("select",{value:o.settingsTaskItemDisplayMode,onChange:b=>o.onTaskItemDisplayModeChange(b.target.value),style:{marginTop:6},children:[e.jsx("option",{value:"inherit",children:"Inherit from parent folder"}),e.jsx("option",{value:"list",children:"List rows"}),e.jsx("option",{value:"cards",children:"Cards"}),e.jsx("option",{value:"grid",children:"Grid"}),e.jsx("option",{value:"timeline",children:"Timeline"})]})]}),f&&e.jsxs("div",{className:"workhub-project-folder-notify-card",children:[e.jsxs("div",{className:"workhub-project-folder-notify-head",children:[e.jsx("span",{children:"My folder notifications"}),o.settingsFolderNotificationsBusy&&e.jsx("small",{children:"Saving…"})]}),e.jsxs("label",{className:"workhub-project-folder-notify-toggle",children:[e.jsx("input",{type:"checkbox",checked:o.settingsFolderNotifications.enabled,onChange:b=>o.onFolderNotificationsChange({enabled:b.target.checked})}),e.jsx("span",{children:"Activate notifications for this folder"})]}),e.jsxs("div",{className:"workhub-project-folder-notify-grid",children:[e.jsxs("label",{children:[e.jsx("input",{type:"checkbox",checked:o.settingsFolderNotifications.taskCreated,disabled:!o.settingsFolderNotifications.enabled,onChange:b=>o.onFolderNotificationsChange({taskCreated:b.target.checked})}),e.jsx("span",{children:"When new tasks are created"})]}),e.jsxs("label",{children:[e.jsx("input",{type:"checkbox",checked:o.settingsFolderNotifications.taskCompleted,disabled:!o.settingsFolderNotifications.enabled,onChange:b=>o.onFolderNotificationsChange({taskCompleted:b.target.checked})}),e.jsx("span",{children:"When a task is completed"})]}),e.jsxs("label",{children:[e.jsx("input",{type:"checkbox",checked:o.settingsFolderNotifications.folderCompleted,disabled:!o.settingsFolderNotifications.enabled,onChange:b=>o.onFolderNotificationsChange({folderCompleted:b.target.checked})}),e.jsx("span",{children:"When the folder reaches 100% completion"})]})]}),e.jsxs("label",{className:"workhub-project-folder-notify-delivery",children:[e.jsx("span",{children:"Delivery"}),e.jsxs("select",{value:o.settingsFolderNotifications.delivery,disabled:!o.settingsFolderNotifications.enabled,onChange:b=>o.onFolderNotificationsChange({delivery:b.target.value}),children:[e.jsx("option",{value:"in_app",children:"In-app notification only"}),e.jsx("option",{value:"both",children:"In-app + email"})]})]})]}),e.jsxs("div",{className:"workhub-project-statuses-section",style:{marginTop:14},children:[e.jsxs("div",{className:"workhub-project-statuses-header",children:[e.jsx("span",{className:"workhub-project-statuses-title",children:"Task statuses"}),o.settingsTaskStatuses===null?e.jsx("span",{className:"workhub-project-statuses-inherit-badge",children:"Inheriting from parent / workspace"}):e.jsxs("span",{className:"workhub-project-statuses-custom-badge",children:[o.settingsTaskStatuses.length," custom statuses"]})]}),o.settingsTaskStatuses===null?e.jsxs("div",{className:"workhub-project-statuses-inherit-preview",children:[o.workspaceTaskStatuses.map(b=>e.jsx("span",{className:"workhub-project-statuses-inherit-chip",style:{background:b.color+"22",color:b.color,borderColor:b.color+"55"},children:b.label},b.id)),e.jsx("button",{type:"button",className:"workhub-project-statuses-override-btn",onClick:()=>o.onTaskStatusesChange(o.workspaceTaskStatuses.map(b=>({...b}))),children:"Override for this folder"})]}):e.jsxs("div",{className:"workhub-project-statuses-custom-editor",children:[o.settingsTaskStatuses.map((b,D)=>e.jsxs("div",{className:"workhub-project-status-row",children:[e.jsx("input",{type:"color",value:b.color,onChange:N=>{const x=o.settingsTaskStatuses.map((I,K)=>K===D?{...I,color:N.target.value}:I);o.onTaskStatusesChange(x)},className:"workhub-project-status-color-input"}),e.jsx("input",{type:"text",value:b.label,placeholder:"Status label",onChange:N=>{const x=o.settingsTaskStatuses.map((I,K)=>K===D?{...I,label:N.target.value}:I);o.onTaskStatusesChange(x)},className:"workhub-project-status-label-input"}),e.jsx("button",{type:"button",className:"workhub-danger-btn workhub-project-status-remove-btn",disabled:o.settingsTaskStatuses.length<=1,onClick:()=>o.onTaskStatusesChange(o.settingsTaskStatuses.filter((N,x)=>x!==D)),children:"×"})]},b.id)),e.jsxs("div",{className:"workhub-project-statuses-actions",children:[e.jsx("button",{type:"button",className:"workhub-ghost-btn workhub-project-status-add-btn",onClick:()=>{const b=["#6b7280","#3b82f6","#f59e0b","#10b981","#ef4444","#8b5cf6"],D=[...o.settingsTaskStatuses,{id:`status_${Date.now()}`,label:"New status",color:b[o.settingsTaskStatuses.length%b.length]}];o.onTaskStatusesChange(D)},children:"+ Add status"}),e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:()=>o.onTaskStatusesChange(null),children:"Reset to inherited"})]})]})]})]})]})]})}),o.milestones!==void 0&&e.jsx("div",{style:{padding:"0 24px 16px"},children:e.jsx(bx,{milestones:o.milestones,milestoneProgress:o.milestoneProgress??{},canEdit:o.canEditMilestones??!1,projectName:o.project?.name,onAdd:o.onAddMilestone??(()=>{}),onEdit:o.onEditMilestone??(()=>{}),onDelete:o.onDeleteMilestone??(()=>{}),onStatusChange:o.onStatusChangeMilestone??(()=>{})})}),e.jsxs("div",{className:"workhub-project-settings-sticky-actions",children:[o.canDelete&&e.jsxs("div",{className:"workhub-project-settings-delete-action",children:[e.jsx("button",{type:"button",className:"workhub-danger-btn workhub-project-settings-delete-btn",disabled:T||o.busyKey===`delete:${o.project.id}`,onClick:o.onDelete,title:T?"Move or delete child items and tasks first.":`Delete ${s}`,"aria-label":`Delete ${s}`,children:o.busyKey===`delete:${o.project.id}`?"⏳":"🗑"}),e.jsx("span",{className:"workhub-project-settings-delete-note",children:T?"Move or delete child items and tasks first.":`Delete this ${s}.`})]}),e.jsxs("div",{className:"workhub-psettings-footer-btns",children:[e.jsx("button",{className:"workhub-primary-btn",disabled:o.busyKey===`access:${o.project.id}`,onClick:o.onSave,children:o.busyKey===`access:${o.project.id}`?"Saving…":"Save settings"}),e.jsx("button",{className:"workhub-ghost-btn",onClick:o.onClose,children:"Close"})]})]})]})})}function mx(o){const i=o.taskStatusOptions,c=Object.fromEntries(i.map(g=>[g.id,g.label])),s=new Map(o.projectColorMeanings.map(g=>[g.color.toLowerCase(),g])),d=s.get(o.projectColor.toLowerCase())||{color:o.projectColor,label:"Custom color",hint:`Custom meaning (${o.projectColor.toUpperCase()}).`},[w,f]=r.useState(!1),[T,C]=r.useState(!1);return o.isOpen?e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:g=>{g.target===g.currentTarget&&o.onClose()},children:e.jsxs("div",{className:"workhub-modal",onMouseDown:g=>g.stopPropagation(),children:[e.jsxs("div",{className:"workhub-modal-head",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Create"}),e.jsx("p",{children:"Keep creation compact and out of the main page."})]}),e.jsx("button",{className:"workhub-ghost-btn",onClick:o.onClose,children:"Close"})]}),e.jsx("div",{className:"workhub-switcher",children:["project","task"].map(g=>e.jsx("button",{className:`workhub-switcher-btn${o.createDialogType===g?" is-active":""}`,onClick:()=>o.onDialogTypeChange(g),children:g==="project"?"📁 Folder":"✅ Task"},g))}),o.createDialogType==="project"&&e.jsxs("form",{className:"workhub-modal-form compact-create",onSubmit:g=>{g.preventDefault(),o.onCreateProject()},children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📁 Folder name"}),e.jsx("input",{name:"projectName",value:o.projectName,onChange:g=>o.onProjectNameChange(g.target.value),placeholder:"New folder"})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🧭 Parent folder/category"}),e.jsxs("select",{name:"projectParent",value:o.projectParentId,onChange:g=>o.onProjectParentIdChange(g.target.value),children:[e.jsx("option",{value:"",children:"Top-level folder"}),o.projectOptions.map(g=>e.jsx("option",{value:g.id,children:`${"— ".repeat(g.depth)}${g.name}`},g.id))]})]}),e.jsx("button",{type:"button",className:"workhub-collapse-toggle",onClick:()=>f(g=>!g),children:w?"▾ Hide advanced":"▸ Show advanced"}),w&&e.jsxs("div",{className:"workhub-collapsible-panel",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Description"}),e.jsx("textarea",{name:"projectDescription",value:o.projectDescription,onChange:g=>o.onProjectDescriptionChange(g.target.value),placeholder:"Project brief",rows:3})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsxs("span",{children:["💾 Storage Method ",e.jsx("small",{style:{fontWeight:"normal",color:"var(--wh-text-secondary)"},children:"(For attachments)"})]}),e.jsxs("select",{name:"projectStorageMethod",value:o.projectStorageMethod,onChange:g=>o.onProjectStorageMethodChange(g.target.value),children:[e.jsx("option",{value:"firebase",children:"Firebase Storage (Recommended)"}),e.jsx("option",{value:"drive",children:"Google Drive"})]})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🎨 Status color"}),e.jsxs("div",{className:"workhub-inline-row",children:[e.jsx("input",{name:"projectColor",value:o.projectColor,onChange:g=>o.onProjectColorChange(g.target.value),placeholder:"#6d5efc"}),e.jsx("div",{className:"workhub-color-pills",children:o.projectColorOptions.map(g=>{const y=s.get(g.toLowerCase()),q=y?`${y.label}: ${y.hint}`:g;return e.jsx("button",{type:"button",className:`workhub-color-pill${o.projectColor===g?" active":""}`,style:{background:g},onClick:()=>o.onProjectColorChange(g),title:q,"aria-label":q},g)})})]}),e.jsxs("div",{className:"workhub-color-meaning-note",children:[e.jsx("strong",{children:d.label}),e.jsx("span",{children:d.hint})]})]}),e.jsxs("div",{className:"workhub-switcher compact-switcher",children:[e.jsx("button",{className:`workhub-switcher-btn${o.projectVisibility==="workspace"?" is-active":""}`,onClick:()=>o.onProjectVisibilityChange("workspace"),children:"🌍 Visible to workspace"}),e.jsx("button",{className:`workhub-switcher-btn${o.projectVisibility==="restricted"?" is-active":""}`,onClick:()=>o.onProjectVisibilityChange("restricted"),children:"🔒 Restricted"})]}),o.projectVisibility==="restricted"&&e.jsx("div",{className:"workhub-member-picker",children:o.approvedMembers.map(g=>{const y=o.projectMemberUids.includes(g.uid);return e.jsx("button",{type:"button",className:`workhub-member-chip${y?" is-selected":""}`,onClick:()=>o.onProjectMemberToggle(g.uid),children:g.displayName||g.email},g.uid)})})]}),e.jsxs("div",{className:"workhub-create-actions",children:[e.jsxs("label",{className:"workhub-create-option-toggle",children:[e.jsx("input",{type:"checkbox",checked:o.closeProjectAfterCreate,onChange:g=>o.onCloseProjectAfterCreateChange(g.target.checked)}),e.jsx("span",{children:"Close after creation"})]}),e.jsxs("div",{className:"workhub-create-actions-group",children:[e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:o.onClose,children:"Close"}),e.jsx("button",{type:"button",className:"workhub-ghost-btn",disabled:!o.canCreateProject||o.busyKey==="project",onClick:o.onCreateProjectKeepOpen,children:o.busyKey==="project"?"Creating…":"📁 Create folder and keep open"}),e.jsx("button",{type:"submit",className:"workhub-primary-btn",disabled:!o.canCreateProject||o.busyKey==="project",children:o.busyKey==="project"?"Creating…":"📁 Create folder"})]})]})]}),o.createDialogType==="task"&&e.jsxs("form",{className:"workhub-modal-form compact-create",onSubmit:g=>{g.preventDefault(),o.onCreateTask()},children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"✅ Task title"}),e.jsx("textarea",{name:"taskTitle",value:o.taskTitle,onChange:g=>o.onTaskTitleChange(g.target.value),placeholder:"Prepare onboarding checklist",rows:3}),e.jsx("small",{style:{color:"var(--wh-text-secondary)"},children:"One line = one task. Paste multiple lines to create multiple tasks."})]}),e.jsxs("div",{className:"workhub-field-grid two compact compact-core-grid",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📂 Project"}),e.jsx("select",{name:"taskProject",value:o.taskProjectId,onChange:g=>o.onTaskProjectIdChange(g.target.value),children:o.projectOptions.map(g=>e.jsx("option",{value:g.id,children:`${"— ".repeat(g.depth)}${g.name}`},g.id))})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"👤 Assignee"}),e.jsx("select",{name:"taskAssignee",value:o.taskAssigneeUid,onChange:g=>o.onTaskAssigneeChange(g.target.value),children:o.taskAssignableMembers.map(g=>e.jsx("option",{value:g.uid,children:g.displayName||g.email},g.uid))})]})]}),e.jsx("button",{type:"button",className:"workhub-collapse-toggle",onClick:()=>C(g=>!g),children:T?"▾ Hide advanced":"▸ Show advanced"}),T&&e.jsxs("div",{className:"workhub-collapsible-panel",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Description"}),e.jsx("textarea",{name:"taskDescription",value:o.taskDescription,onChange:g=>o.onTaskDescriptionChange(g.target.value),placeholder:"Task details",rows:3})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🚀 Start date"}),e.jsx("input",{name:"taskStartDate",type:"date",lang:"en-GB",value:o.taskStartDate,onChange:g=>o.onTaskStartDateChange(g.target.value)})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🚩 Priority"}),e.jsx("select",{name:"taskPriority",value:o.taskPriority,onChange:g=>o.onTaskPriorityChange(g.target.value),children:Object.entries(Qo).map(([g,y])=>e.jsx("option",{value:g,children:y},g))})]})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📌 Status"}),e.jsx("select",{name:"taskStatus",value:o.taskStatus,onChange:g=>o.onTaskStatusChange(g.target.value),children:Object.entries(c).map(([g,y])=>e.jsx("option",{value:g,children:String(y)},g))})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📅 Due date"}),e.jsx("input",{name:"taskDueDate",type:"date",lang:"en-GB",value:o.taskDueDate,onChange:g=>o.onTaskDueDateChange(g.target.value)})]})]})]}),e.jsx("button",{type:"submit",className:"workhub-primary-btn",disabled:!o.canCreateTask||o.busyKey==="task",children:o.busyKey==="task"?"Creating…":"✅ Create task"})]})]})}):null}function gx(o){if(!o.isOpen)return null;const i=o.workspaceTemplates.find(c=>c.id===o.workspaceTemplateId);return e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:c=>{c.target===c.currentTarget&&o.onClose()},children:e.jsxs("div",{className:"workhub-modal workhub-workspace-create-modal",onMouseDown:c=>c.stopPropagation(),children:[e.jsx("div",{className:"workhub-modal-head",children:e.jsxs("div",{children:[e.jsx("h2",{children:"Create workspace"}),e.jsx("p",{children:"Choose a template and create your workspace."})]})}),e.jsxs("form",{className:"workhub-modal-form workhub-workspace-create-form",onSubmit:c=>{c.preventDefault(),o.onCreateWorkspace()},children:[e.jsxs("div",{className:"workhub-workspace-create-layout",children:[e.jsxs("section",{className:"workhub-workspace-create-fields",children:[e.jsxs("label",{children:[e.jsx("span",{children:"Workspace name"}),e.jsx("input",{name:"workspaceName",value:o.workspaceName,onChange:c=>o.onWorkspaceNameChange(c.target.value),placeholder:"Operations"})]}),e.jsxs("label",{children:[e.jsx("span",{children:"Description"}),e.jsx("textarea",{name:"workspaceDescription",value:o.workspaceDescription,onChange:c=>o.onWorkspaceDescriptionChange(c.target.value),placeholder:"What does this workspace cover?",rows:4})]}),e.jsxs("div",{className:"workhub-template-selection-note",children:[e.jsx("strong",{children:i?.label||"Template"}),e.jsx("span",{children:i?.description||"Select a workspace template to continue."}),i?.highlights?.length?e.jsx("div",{className:"workhub-template-selection-highlights",children:i.highlights.slice(0,3).map(c=>e.jsx("span",{className:"workhub-template-highlight",children:c},c))}):null]})]}),e.jsxs("section",{className:"workhub-template-picker-wrap",children:[e.jsx("span",{className:"workhub-template-picker-label",children:"Workspace template"}),e.jsx("div",{className:"workhub-template-card-grid",role:"radiogroup","aria-label":"Workspace templates",children:o.workspaceTemplates.map(c=>{const s=c.id===o.workspaceTemplateId;return e.jsxs("button",{type:"button",role:"radio","aria-checked":s,className:`workhub-template-card${s?" is-active":""} workhub-template-${c.id}`,onClick:()=>o.onWorkspaceTemplateChange(c.id),children:[e.jsx("span",{className:"workhub-template-graphic","aria-hidden":"true",children:e.jsx("span",{className:"workhub-template-graphic-code",children:c.graphic})}),e.jsxs("div",{className:"workhub-template-card-content",children:[e.jsx("strong",{className:"workhub-template-title",children:c.label}),e.jsx("span",{className:"workhub-template-mode",children:c.mode==="empty"?"Blank canvas":"Preset workflow"})]})]},c.id)})})]})]}),e.jsx("div",{className:"workhub-create-actions",children:e.jsxs("div",{className:"workhub-create-actions-group",children:[e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:o.onClose,children:"Close"}),e.jsx("button",{type:"submit",className:"workhub-primary-btn",disabled:o.busyKey==="workspace"||!o.canCreateWorkspace,children:o.busyKey==="workspace"?"Creating…":"🏢 Create workspace"})]})})]})]})})}function kx(o){return o.isOpen?e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:i=>{i.target===i.currentTarget&&o.onClose()},children:e.jsxs("div",{className:"workhub-modal",onMouseDown:i=>i.stopPropagation(),children:[e.jsxs("div",{className:"workhub-modal-head",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Create document"}),e.jsx("p",{children:"Create a workspace document for scope, requirements, or project details."})]}),e.jsx("button",{className:"workhub-ghost-btn",onClick:o.onClose,children:"Close"})]}),e.jsxs("form",{className:"workhub-modal-form compact-create",onSubmit:i=>{i.preventDefault(),o.onCreate()},children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"Document title"}),e.jsx("input",{value:o.title,onChange:i=>o.onTitleChange(i.target.value),placeholder:"Scope of work",autoFocus:!0})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"Attach to"}),e.jsxs("select",{value:o.projectId,onChange:i=>o.onProjectIdChange(i.target.value),children:[e.jsx("option",{value:"",children:"Workspace (general document)"}),o.projectOptions.map(i=>e.jsx("option",{value:i.id,children:`${"-- ".repeat(i.depth)}${i.name}`},i.id))]})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"Document body"}),e.jsx("textarea",{rows:14,value:o.body,onChange:i=>o.onBodyChange(i.target.value),placeholder:"Start typing..."})]}),e.jsx("div",{className:"workhub-create-actions",children:e.jsxs("div",{className:"workhub-create-actions-group",children:[e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:o.onClose,children:"Cancel"}),e.jsx("button",{type:"submit",className:"workhub-primary-btn",disabled:!o.canCreate||o.busyKey==="document:create",children:o.busyKey==="document:create"?"Creating...":"Create document"})]})})]})]})}):null}function wx({isOpen:o,busyKey:i,document:c,workspaceOptions:s,projectOptions:d,workspaceId:w,projectId:f,icon:T,onWorkspaceIdChange:C,onProjectIdChange:g,onIconChange:y,onClose:q,onSave:F}){const[re,Y]=r.useState(!1),H=r.useMemo(()=>d.filter(b=>b.workspaceId===w),[d,w]);if(!o||!c)return null;const $=c.type==="note"?"🗒️":"📝",de=T||$,V=c.type==="note"?"note":"document";return e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:b=>{b.target===b.currentTarget&&q()},children:e.jsxs("div",{className:"workhub-modal workhub-document-settings-modal",onMouseDown:b=>b.stopPropagation(),children:[e.jsxs("div",{className:"workhub-modal-head",children:[e.jsxs("div",{children:[e.jsx("h2",{children:c.type==="note"?"Note settings":"Document settings"}),e.jsxs("p",{children:["Change the icon and choose where this ",V," is stored."]})]}),e.jsx("button",{className:"workhub-ghost-btn",onClick:q,children:"Close"})]}),e.jsxs("form",{className:"workhub-modal-form compact-create",onSubmit:b=>{b.preventDefault(),F()},children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsxs("span",{children:["Current ",V]}),e.jsx("div",{className:"workhub-doc-settings-note",children:c.title||(c.type==="note"?"Untitled note":"Untitled document")})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"Icon"}),e.jsx("div",{className:"workhub-doc-settings-icon-row",children:e.jsxs("div",{className:"workhub-doc-settings-icon-popover-wrap",children:[e.jsxs("button",{type:"button",className:"workhub-doc-settings-icon-trigger",onClick:()=>Y(b=>!b),title:"Choose icon","aria-label":"Choose icon",children:[e.jsx("span",{className:"workhub-doc-settings-icon-preview","aria-hidden":"true",children:de}),e.jsx("span",{children:T?"Change icon":"Choose icon"})]}),re&&e.jsx(Ww,{value:T,emojis:Fw,onSelect:b=>y(b),onClear:T?()=>y(""):void 0,onClose:()=>Y(!1)})]})})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"Workspace"}),e.jsx("select",{value:w,onChange:b=>C(b.target.value),children:s.map(b=>e.jsx("option",{value:b.id,children:b.name},b.id))})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"Store under"}),e.jsxs("select",{value:f,onChange:b=>g(b.target.value),children:[e.jsx("option",{value:"",children:"Workspace level (no parent project)"}),H.map(b=>e.jsx("option",{value:b.id,children:`${"— ".repeat(b.depth)}${b.name}`},b.id))]})]}),e.jsxs("div",{className:"workhub-doc-settings-note",children:["Moving into a project will inherit that project's visibility rules. Keeping it at workspace level makes it a general workspace ",V,"."]}),e.jsx("div",{className:"workhub-create-actions",children:e.jsxs("div",{className:"workhub-create-actions-group",children:[e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:q,children:"Cancel"}),e.jsx("button",{type:"submit",className:"workhub-primary-btn",disabled:i==="document:settings",children:i==="document:settings"?"Saving...":"Save settings"})]})})]})]})})}function xx(o){return o.referenceSourceDocumentId?"🔗":o.hasOutgoingReferences?"🌐":(o.icon||"").trim()||(o.type==="note"?"🗒️":"📝")}function Ql(o){return o==="v2"?"V2":o==="flow"?"FLOW":""}function Ap(o,i){const c=(o||"").trim();if(!c)return null;const s=(i||"").trim()||"23:59",d=Date.parse(`${c}T${s}`);return Number.isFinite(d)?d:null}function yx(o,i){const c=Ap(o,i);if(!c)return"Submitted";const s=Date.now()-c;if(s<=0)return"Submitted";const d=Math.floor(s/(1e3*60*60*24));return d===0?"Submitted today":d===1?"Submitted 1 day ago":`Submitted ${d}d ago`}function vx(o,i){const c=Ap(o,i),s=(i||"").trim(),d=s?new Intl.DateTimeFormat("en-US",{hour:"2-digit",minute:"2-digit",hour12:!0}).format(new Date(`2000-01-01T${s}`)):"";if(!c)return{label:"No deadline",submissionTimeLabel:"",isNear:!1,isOverdue:!1};const w=c-Date.now(),f=w<0,T=Math.abs(w),C=Math.max(0,Math.floor(T/(1e3*60*60))),g=720,y=Math.floor(C/g),q=C-y*g,F=Math.floor(q/24),re=q%24,Y=!f&&T<=1e3*60*60*72,H=y>0?`${y}mo`:"",$=F>0?`${F}d`:"",de=`${re}h`;return{label:[H,$,de].filter(Boolean).join(" ").trim()||"0h",submissionTimeLabel:d,isNear:Y||f,isOverdue:f}}const Ja=r.memo(function o({nodes:i,treeMetaDisplayMode:c,showProjectColorDots:s=!0,selectedProjectId:d,expandedProjectIds:w,directTaskCountByProjectId:f={},unreadCommentCountByProjectId:T={},taskProgressByProjectId:C={},projectIntentById:g={},projectIntentIconById:y={},selectedDocumentId:q="",selectedMoodBoardId:F="",linkedHighlightedProjectId:re="",linkedHighlightedDocumentId:Y="",linkedHighlightedMoodBoardId:H="",documentsByProjectId:$={},moodBoardsByProjectId:de={},isPrivilegedMember:V,projectColorMeanings:b=[],onSelectProject:D,onSelectDocument:N,onSelectMoodBoard:x=()=>{},onToggleExpansion:I,onOpenActionMenu:K,onOpenSettings:he,depth:_=0}){return e.jsx(e.Fragment,{children:i.map(B=>{const E=w.includes(B.id),X=B.children.length,we=$[B.id]||[],L=de[B.id]||[],v=we.length,M=L.length,z=X>0||v>0||M>0,te=f[B.id]||0,R=T[B.id]||0,se=C[B.id]||{done:te,total:te},fe=Math.max(0,se.total),Z=Math.max(0,Math.min(se.done,fe)),ye=fe>0,je=ye?Math.max(6,Math.round(Z/fe*100)):0,Ie=g[B.id]||"project",ee="🗂️",W=Ie==="project"&&z?E?"📂":ee:y[B.id]||ee,O=W==="🚀"?"project":"folder",pe=vx(B.projectDeadline,B.submissionTime),Fe=b.find(p=>p.color.toLowerCase()===(B.color||"").toLowerCase())?.label?.toLowerCase()==="submitted",Oe=Fe?yx(B.projectDeadline,B.submissionTime):null,be=X>0?`${X} sub-project${X>1?"s":""}${v>0?` • ${v} doc${v===1?"":"s"}`:""}${M>0?` • ${M} board${M===1?"":"s"}`:""}`:v>0||M>0?`${v>0?`${v} doc${v===1?"":"s"}`:""}${v>0&&M>0?" • ":""}${M>0?`${M} board${M===1?"":"s"}`:""}`:`${te} task${te===1?"":"s"}`,Re=c==="countdown"&&X===0,Ce=c==="progress"&&ye,ge=Re?Oe??pe.label:be,ne=!(c==="countdown"&&X>0)&&!Ce,$e=Array.isArray(B.attachments)?B.attachments.length:0,ie=`workhub-tree-node-meta${c==="countdown"&&!Fe&&pe.isNear?" is-near-submission":""}${c==="countdown"&&!Fe&&pe.isOverdue?" is-overdue":""}${Fe?" is-submitted-status":""}`;return e.jsxs("div",{className:`workhub-tree-node-wrap${_===0?" is-root":" is-nested"}`,children:[e.jsxs("div",{className:`workhub-tree-node${d===B.id&&!q&&!F?" is-active":""}${re===B.id?" is-linked-highlight":""}${_===0&&!z?" is-root-leaf-node":""}`,style:{paddingLeft:`${10+_*14}px`},role:"button",tabIndex:0,onClick:()=>D(B.id),onKeyDown:p=>{(p.key==="Enter"||p.key===" ")&&(p.preventDefault(),D(B.id))},onDoubleClick:p=>{p.target.closest(".workhub-tree-toggle, .workhub-tree-node-actions")||z&&I(B.id)},children:[z?e.jsx("button",{type:"button",className:"workhub-tree-toggle",onClick:p=>{p.stopPropagation(),I(B.id)},children:e.jsx("span",{className:`workhub-tree-toggle-icon${E?" is-expanded":""}`,"aria-hidden":"true",children:e.jsx("svg",{viewBox:"0 0 12 12",focusable:"false","aria-hidden":"true",children:e.jsx("path",{d:"M4 2.5L7.8 6L4 9.5"})})})}):e.jsx("span",{className:"workhub-tree-leaf-spacer","aria-hidden":"true"}),e.jsxs("div",{className:"workhub-tree-node-main",children:[s&&e.jsx("span",{className:`workhub-project-dot${_===0?" is-root":""}`,style:{background:B.color}}),e.jsxs("span",{className:"workhub-tree-node-text",children:[e.jsxs("span",{className:"workhub-tree-node-title",children:[e.jsx("span",{className:`workhub-tree-node-intent-icon is-${O}-kind`,"aria-hidden":"true",children:W}),e.jsx("span",{className:"workhub-tree-node-title-text",children:B.name}),R>0&&e.jsxs("span",{className:"workhub-tree-node-comment-indicator",title:`${R} unread comment${R===1?"":"s"}`,"aria-label":`${R} unread comment${R===1?"":"s"}`,children:["💬 ",R]}),$e>0&&e.jsx("span",{className:"workhub-tree-node-attachment-indicator",title:`${$e} attachment${$e===1?"":"s"}`,"aria-label":`${$e} attachment${$e===1?"":"s"}`,children:"📎"})]}),Ce&&e.jsxs("span",{className:"workhub-tree-node-progress",title:`${Z} of ${fe} tasks done`,children:[e.jsx("span",{className:"workhub-tree-node-progress-track","aria-hidden":"true",children:e.jsx("span",{className:"workhub-tree-node-progress-fill",style:{width:`${je}%`}})}),e.jsxs("span",{className:"workhub-tree-node-progress-label",children:[Z,"/",fe]})]}),ne&&e.jsxs("span",{className:ie,children:[e.jsx("span",{className:"workhub-tree-node-meta-bracket","aria-hidden":"true",children:"("}),e.jsx("span",{className:"workhub-tree-node-meta-primary",children:ge}),Re&&!Fe&&pe.submissionTimeLabel&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"workhub-tree-node-meta-separator","aria-hidden":"true",children:" | "}),e.jsx("span",{className:"workhub-tree-node-meta-time workhub-ltr-token",children:pe.submissionTimeLabel})]}),e.jsx("span",{className:"workhub-tree-node-meta-bracket","aria-hidden":"true",children:")"})]})]})]}),e.jsxs("div",{className:"workhub-tree-node-actions",children:[e.jsx("button",{type:"button",className:"workhub-plus-btn",onClick:p=>{p.stopPropagation(),K(B.id,p)},children:"+"}),V&&e.jsx("button",{type:"button",className:"workhub-gear-btn",onClick:p=>{p.stopPropagation(),he(B.id)},children:"⚙"})]})]}),X>0&&e.jsx("div",{className:`workhub-tree-expand-wrap${E?" is-open":""}`,children:e.jsx("div",{className:"workhub-tree-expand-inner",children:e.jsx("div",{className:"workhub-tree-children",children:e.jsx(o,{nodes:B.children,treeMetaDisplayMode:c,depth:_+1,selectedProjectId:d,expandedProjectIds:w,directTaskCountByProjectId:f,unreadCommentCountByProjectId:T,taskProgressByProjectId:C,projectIntentById:g,projectIntentIconById:y,showProjectColorDots:s,selectedDocumentId:q,selectedMoodBoardId:F,linkedHighlightedProjectId:re,linkedHighlightedDocumentId:Y,linkedHighlightedMoodBoardId:H,documentsByProjectId:$,moodBoardsByProjectId:de,isPrivilegedMember:V,projectColorMeanings:b,onSelectProject:D,onSelectDocument:N,onSelectMoodBoard:x,onToggleExpansion:I,onOpenActionMenu:K,onOpenSettings:he})})})}),(v>0||M>0)&&e.jsx("div",{className:`workhub-tree-expand-wrap${E?" is-open":""}`,children:e.jsx("div",{className:"workhub-tree-expand-inner",children:e.jsxs("div",{className:"workhub-tree-doc-sublist",style:{marginLeft:`${36+_*14}px`},children:[we.map(p=>{const A=(p.title||"").trim()||(p.type==="note"?"Untitled note":"Untitled document"),G=p.referenceSourceDocumentId?`${A} (Reference)`:p.hasOutgoingReferences?`${A} (Public source)`:p.isLocked?`${A} (Locked)`:A;return e.jsxs("button",{type:"button",className:`workhub-tree-doc-subitem${q===p.id?" is-active":""}${Y===p.id?" is-linked-highlight":""}${p.hasOutgoingReferences&&!p.referenceSourceDocumentId?" is-public-source":""}`,onClick:ue=>{ue.stopPropagation(),N(p.id)},title:G,children:[e.jsxs("span",{className:"workhub-tree-doc-subitem-title",children:[xx(p)," ",G,!!p.attachments?.length&&e.jsx("span",{className:"workhub-tree-doc-attachment-indicator",title:`${p.attachments.length} attachment${p.attachments.length===1?"":"s"}`,children:"📎"})]}),p.hasOutgoingReferences&&!p.referenceSourceDocumentId&&e.jsx("span",{className:"workhub-tree-doc-lock-badge",title:"Public source document",children:"🌐"}),p.referenceSourceDocumentId&&e.jsx("span",{className:"workhub-tree-doc-lock-badge",title:"Referenced document",children:"🔗"}),p.isLocked&&e.jsx("span",{className:"workhub-tree-doc-lock-badge",title:"Locked document",children:"🔒"})]},p.id)}),L.map(p=>e.jsx("button",{type:"button",className:`workhub-tree-doc-subitem${F===p.id?" is-active":""}${H===p.id?" is-linked-highlight":""}`,onClick:A=>{A.stopPropagation(),x(p.id)},title:p.title,children:e.jsxs("span",{className:"workhub-tree-doc-subitem-title",children:["🎨 ",p.title,Ql(p.panelVariant)&&e.jsx("span",{className:`workhub-tree-moodboard-variant-badge is-${Ql(p.panelVariant).toLowerCase()}`,title:p.panelVariant==="flow"?"Flow Project Plan board":"Mood Board #2","aria-label":p.panelVariant==="flow"?"Flow Project Plan board":"Mood Board #2 board",children:Ql(p.panelVariant)})]})},p.id))]})})})]},B.id)})})}),jx={project:{icon:"📁",title:"Create Folder",subtitle:"Create a folder/container to organize related items.",submitLabel:"Create folder",subjectLabel:"Folder",actionLabel:"Add folder",defaults:{priority:"medium",projectType:"other"}},proposal:{icon:"🧾",title:"Create Proposal",subtitle:"Capture proposal-specific information like submission date, time, and bid scope.",submitLabel:"Create proposal",subjectLabel:"Proposal",actionLabel:"Create proposal",defaults:{priority:"high",projectType:"tender"}},lead:{icon:"🎯",title:"Create Lead",subtitle:"Capture qualification and source details for lead intake.",submitLabel:"Create lead",subjectLabel:"Lead",actionLabel:"Create lead",defaults:{priority:"medium",projectType:"lead"}},finance_invoice_stream:{icon:"🧾",title:"Create Invoice Stream",subtitle:"Set billing-cycle and owner information for recurring invoice operations.",submitLabel:"Create invoice stream",subjectLabel:"Invoice stream",actionLabel:"Create invoice stream",defaults:{priority:"high",projectType:"direct_award",billingCycle:"monthly"}},finance_payment_cycle:{icon:"💸",title:"Create Payment Cycle",subtitle:"Capture payment-cycle timing and approval ownership.",submitLabel:"Create payment cycle",subjectLabel:"Payment cycle",actionLabel:"Create payment cycle",defaults:{priority:"medium",projectType:"other"}},marketing_campaign:{icon:"📣",title:"Create Campaign",subtitle:"Define campaign objective, channel, and launch timeline.",submitLabel:"Create campaign",subjectLabel:"Campaign",actionLabel:"Create campaign",defaults:{priority:"medium",projectType:"other"}},marketing_content_stream:{icon:"🧩",title:"Create Content Stream",subtitle:"Define channel cadence and content production schedule.",submitLabel:"Create content stream",subjectLabel:"Content stream",actionLabel:"Create content stream",defaults:{priority:"medium",projectType:"other"}},hr_requisition:{icon:"👥",title:"Create Requisition",subtitle:"Capture department and hiring-owner context for recruiting.",submitLabel:"Create requisition",subjectLabel:"Requisition",actionLabel:"Create requisition",defaults:{priority:"high",projectType:"other"}},hr_onboarding_track:{icon:"🧭",title:"Create Onboarding Track",subtitle:"Define onboarding ownership and completion targets.",submitLabel:"Create onboarding track",subjectLabel:"Onboarding track",actionLabel:"Create onboarding track",defaults:{priority:"medium",projectType:"other"}}},Cx={icon:"🚀",title:"Create Project",subtitle:"Create a project to organize deliverables and tasks.",submitLabel:"Create project",subjectLabel:"Project",actionLabel:"Add project",defaults:{priority:"medium",projectType:"other"}};function Bt(o,i){return o==="project"&&i==="projects"?Cx:jx[o]}const wp={proposals_leads:[{id:"create-proposal",intent:"proposal",tone:"primary"},{id:"create-lead",intent:"lead",tone:"secondary"}],finance:[{id:"create-invoice-stream",intent:"finance_invoice_stream",tone:"primary"},{id:"create-payment-cycle",intent:"finance_payment_cycle",tone:"secondary"}],marketing:[{id:"create-campaign",intent:"marketing_campaign",tone:"primary"},{id:"create-content-stream",intent:"marketing_content_stream",tone:"secondary"}],hr:[{id:"create-requisition",intent:"hr_requisition",tone:"primary"},{id:"create-onboarding-track",intent:"hr_onboarding_track",tone:"secondary"}],empty:[{id:"create-first-project",intent:"project",tone:"primary",fullWidth:!0,labelOverride:"Create first project"}],projects:[{id:"create-new-project",intent:"project",tone:"primary",fullWidth:!0,labelOverride:"Create new project"}]};function Ep(o){return wp[o]||wp.projects}function xp(o){return Ep(o).map(c=>{const s=Bt(c.intent,o);return{id:c.id,intent:c.intent,icon:s.icon,label:c.labelOverride||s.actionLabel,tone:c.tone,fullWidth:c.fullWidth}})}function ni(o){const i=new Set(Ep(o).map(c=>c.intent));return i.add("project"),Array.from(i)}function mr(o,i){return e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🚩 Priority"}),e.jsx("select",{name:"templatePriority",value:o.priority,onChange:c=>i({priority:c.target.value}),children:fc.map(c=>e.jsx("option",{value:c.value,children:c.label},c.value))})]})}function Za(o,i,c,s,d,w,f,T="🏢 Client"){return e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:T}),e.jsxs("select",{name:"templateClient",value:o.clientId,onChange:C=>c({clientId:C.target.value}),children:[e.jsx("option",{value:"",children:"No client assigned"}),i.map(C=>e.jsx("option",{value:C.id,children:C.name},C.id))]})]}),e.jsxs("div",{className:"workhub-inline-row workhub-client-quick-add",children:[e.jsx("input",{name:"templateQuickClientName",value:s,onChange:C=>d(C.target.value),placeholder:"Add client by name (minimal info)"}),e.jsx("button",{type:"button",className:"workhub-ghost-btn",disabled:!s.trim()||f==="client:create",onClick:()=>{w(s).then(C=>{C&&(c({clientId:C}),d(""))})},children:f==="client:create"?"Adding…":"➕ Add client"})]})]})}function Nx(o){if(!o.isOpen||!o.intent)return null;const[i,c]=r.useState("");r.useEffect(()=>{c("")},[o.intent,o.isOpen]);const s=Bt(o.intent,o.workspaceTemplateId);return e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:d=>{d.target===d.currentTarget&&o.onClose()},children:e.jsxs("div",{className:"workhub-modal",onMouseDown:d=>d.stopPropagation(),children:[e.jsx("div",{className:"workhub-modal-head",children:e.jsxs("div",{children:[e.jsx("h2",{className:`workhub-template-create-title${o.intent==="proposal"?" is-proposal":""}`,children:s.title}),e.jsx("p",{children:s.subtitle})]})}),e.jsxs("form",{className:"workhub-modal-form compact-create",onSubmit:d=>{d.preventDefault(),o.onCreate()},children:[o.intent==="project"&&e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:`${s.icon} ${s.subjectLabel} name`}),e.jsx("input",{value:o.draft.name,onChange:d=>o.onDraftChange({name:d.target.value}),placeholder:`${s.subjectLabel} name`})]}),e.jsxs("div",{className:"workhub-field-grid two compact workhub-create-date-grid",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🗓️ Start date"}),e.jsx("input",{type:"date",value:o.draft.startDate,onChange:d=>o.onDraftChange({startDate:d.target.value})})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🏁 Deadline"}),e.jsx("input",{type:"date",value:o.draft.deadline,onChange:d=>o.onDraftChange({deadline:d.target.value})})]})]}),mr(o.draft,o.onDraftChange),Za(o.draft,o.clientOptions,o.onDraftChange,i,c,o.onCreateClientInline,o.busyKey),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Brief"}),e.jsx("textarea",{value:o.draft.description,onChange:d=>o.onDraftChange({description:d.target.value}),rows:3,placeholder:"Project summary"})]})]}),o.intent==="proposal"&&e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🧾 Proposal title"}),e.jsx("input",{value:o.draft.name,onChange:d=>o.onDraftChange({name:d.target.value}),placeholder:"Proposal title"})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🔢 Tender / RFP number"}),e.jsx("input",{value:o.draft.tenderNumber,onChange:d=>o.onDraftChange({tenderNumber:d.target.value}),placeholder:"e.g. RFP-2026-041"})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🆔 Our proposal ID"}),e.jsx("input",{value:o.draft.proposalId,onChange:d=>o.onDraftChange({proposalId:d.target.value}),placeholder:"e.g. QYAN-PR-117"})]})]}),Za(o.draft,o.clientOptions,o.onDraftChange,i,c,o.onCreateClientInline,o.busyKey,"🏢 Client (required)"),e.jsxs("div",{className:"workhub-field-grid two compact workhub-create-date-grid",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📅 Submission date"}),e.jsx("input",{type:"date",value:o.draft.deadline,onChange:d=>o.onDraftChange({deadline:d.target.value})})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"⏰ Submission time"}),e.jsx("input",{type:"time",value:o.draft.submissionTime,onChange:d=>o.onDraftChange({submissionTime:d.target.value})})]})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"💰 Estimated value"}),e.jsx("input",{value:o.draft.budgetAmount,onChange:d=>o.onDraftChange({budgetAmount:d.target.value}),placeholder:"e.g. 250000 OMR"})]}),mr(o.draft,o.onDraftChange)]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Scope summary"}),e.jsx("textarea",{value:o.draft.description,onChange:d=>o.onDraftChange({description:d.target.value}),rows:3,placeholder:"Proposal scope, deliverables, and assumptions"})]})]}),o.intent==="lead"&&e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🎯 Lead title"}),e.jsx("input",{value:o.draft.name,onChange:d=>o.onDraftChange({name:d.target.value}),placeholder:"Lead title"})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📡 Lead source"}),e.jsx("input",{value:o.draft.leadSource,onChange:d=>o.onDraftChange({leadSource:d.target.value}),placeholder:"Referral, website, outbound, event"})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📅 Expected close date"}),e.jsx("input",{type:"date",value:o.draft.deadline,onChange:d=>o.onDraftChange({deadline:d.target.value})})]})]}),Za(o.draft,o.clientOptions,o.onDraftChange,i,c,o.onCreateClientInline,o.busyKey),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🧪 Qualification notes"}),e.jsx("textarea",{value:o.draft.qualificationNotes,onChange:d=>o.onDraftChange({qualificationNotes:d.target.value}),rows:3,placeholder:"Need, budget, authority, timeline"})]}),mr(o.draft,o.onDraftChange)]}),o.intent==="finance_invoice_stream"&&e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🧾 Stream name"}),e.jsx("input",{value:o.draft.name,onChange:d=>o.onDraftChange({name:d.target.value}),placeholder:"Invoice stream name"})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🔁 Billing cycle"}),e.jsxs("select",{value:o.draft.billingCycle,onChange:d=>o.onDraftChange({billingCycle:d.target.value}),children:[e.jsx("option",{value:"",children:"Select cycle"}),e.jsx("option",{value:"weekly",children:"Weekly"}),e.jsx("option",{value:"monthly",children:"Monthly"}),e.jsx("option",{value:"quarterly",children:"Quarterly"}),e.jsx("option",{value:"milestone",children:"Milestone-based"})]})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📅 First due date"}),e.jsx("input",{type:"date",value:o.draft.deadline,onChange:d=>o.onDraftChange({deadline:d.target.value})})]})]}),Za(o.draft,o.clientOptions,o.onDraftChange,i,c,o.onCreateClientInline,o.busyKey,"🏢 Client / payee"),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"👤 Approval owner"}),e.jsx("input",{value:o.draft.paymentOwner,onChange:d=>o.onDraftChange({paymentOwner:d.target.value}),placeholder:"Finance owner"})]}),mr(o.draft,o.onDraftChange),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Notes"}),e.jsx("textarea",{value:o.draft.description,onChange:d=>o.onDraftChange({description:d.target.value}),rows:3,placeholder:"Controls, thresholds, and review notes"})]})]}),o.intent==="finance_payment_cycle"&&e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"💸 Payment cycle name"}),e.jsx("input",{value:o.draft.name,onChange:d=>o.onDraftChange({name:d.target.value}),placeholder:"Payment cycle name"})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📅 Disbursement date"}),e.jsx("input",{type:"date",value:o.draft.deadline,onChange:d=>o.onDraftChange({deadline:d.target.value})})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"👤 Approval owner"}),e.jsx("input",{value:o.draft.paymentOwner,onChange:d=>o.onDraftChange({paymentOwner:d.target.value}),placeholder:"Approval owner"})]})]}),mr(o.draft,o.onDraftChange),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Notes"}),e.jsx("textarea",{value:o.draft.description,onChange:d=>o.onDraftChange({description:d.target.value}),rows:3,placeholder:"Cycle scope and release checkpoints"})]})]}),o.intent==="marketing_campaign"&&e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📣 Campaign name"}),e.jsx("input",{value:o.draft.name,onChange:d=>o.onDraftChange({name:d.target.value}),placeholder:"Campaign name"})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🎯 Objective"}),e.jsx("input",{value:o.draft.campaignObjective,onChange:d=>o.onDraftChange({campaignObjective:d.target.value}),placeholder:"Awareness, lead-gen, conversion"})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📡 Channel"}),e.jsxs("select",{value:o.draft.campaignChannel,onChange:d=>o.onDraftChange({campaignChannel:d.target.value}),children:[e.jsx("option",{value:"",children:"Select channel"}),e.jsx("option",{value:"social",children:"Social"}),e.jsx("option",{value:"email",children:"Email"}),e.jsx("option",{value:"paid_ads",children:"Paid ads"}),e.jsx("option",{value:"events",children:"Events"}),e.jsx("option",{value:"mixed",children:"Mixed"})]})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🗓️ Launch date"}),e.jsx("input",{type:"date",value:o.draft.startDate,onChange:d=>o.onDraftChange({startDate:d.target.value})})]})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🏁 End date"}),e.jsx("input",{type:"date",value:o.draft.deadline,onChange:d=>o.onDraftChange({deadline:d.target.value})})]}),mr(o.draft,o.onDraftChange)]}),Za(o.draft,o.clientOptions,o.onDraftChange,i,c,o.onCreateClientInline,o.busyKey),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Brief"}),e.jsx("textarea",{value:o.draft.description,onChange:d=>o.onDraftChange({description:d.target.value}),rows:3,placeholder:"Audience, message, and success criteria"})]})]}),o.intent==="marketing_content_stream"&&e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🧩 Content stream name"}),e.jsx("input",{value:o.draft.name,onChange:d=>o.onDraftChange({name:d.target.value}),placeholder:"Content stream"})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📡 Channel"}),e.jsx("input",{value:o.draft.campaignChannel,onChange:d=>o.onDraftChange({campaignChannel:d.target.value}),placeholder:"LinkedIn, YouTube, Blog"})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🔁 Cadence"}),e.jsx("input",{value:o.draft.cadence,onChange:d=>o.onDraftChange({cadence:d.target.value}),placeholder:"Daily, weekly, bi-weekly"})]})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🗓️ Start date"}),e.jsx("input",{type:"date",value:o.draft.startDate,onChange:d=>o.onDraftChange({startDate:d.target.value})})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🏁 Target date"}),e.jsx("input",{type:"date",value:o.draft.deadline,onChange:d=>o.onDraftChange({deadline:d.target.value})})]})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Scope"}),e.jsx("textarea",{value:o.draft.description,onChange:d=>o.onDraftChange({description:d.target.value}),rows:3,placeholder:"Format mix, approvals, and output targets"})]})]}),o.intent==="hr_requisition"&&e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"👥 Requisition title"}),e.jsx("input",{value:o.draft.name,onChange:d=>o.onDraftChange({name:d.target.value}),placeholder:"Role / requisition name"})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🏢 Department"}),e.jsx("input",{value:o.draft.department,onChange:d=>o.onDraftChange({department:d.target.value}),placeholder:"Department"})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"👤 Hiring manager"}),e.jsx("input",{value:o.draft.hiringManager,onChange:d=>o.onDraftChange({hiringManager:d.target.value}),placeholder:"Hiring manager"})]})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📅 Target hire date"}),e.jsx("input",{type:"date",value:o.draft.deadline,onChange:d=>o.onDraftChange({deadline:d.target.value})})]}),mr(o.draft,o.onDraftChange)]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Role notes"}),e.jsx("textarea",{value:o.draft.description,onChange:d=>o.onDraftChange({description:d.target.value}),rows:3,placeholder:"Scope, must-have skills, and hiring notes"})]})]}),o.intent==="hr_onboarding_track"&&e.jsxs(e.Fragment,{children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🧭 Track name"}),e.jsx("input",{value:o.draft.name,onChange:d=>o.onDraftChange({name:d.target.value}),placeholder:"Onboarding track name"})]}),e.jsxs("div",{className:"workhub-field-grid two compact",children:[e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"👤 Onboarding owner"}),e.jsx("input",{value:o.draft.onboardingOwner,onChange:d=>o.onDraftChange({onboardingOwner:d.target.value}),placeholder:"Track owner"})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🗓️ Start date"}),e.jsx("input",{type:"date",value:o.draft.startDate,onChange:d=>o.onDraftChange({startDate:d.target.value})})]})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"🏁 Completion target"}),e.jsx("input",{type:"date",value:o.draft.deadline,onChange:d=>o.onDraftChange({deadline:d.target.value})})]}),e.jsxs("label",{className:"workhub-icon-field",children:[e.jsx("span",{children:"📝 Track details"}),e.jsx("textarea",{value:o.draft.description,onChange:d=>o.onDraftChange({description:d.target.value}),rows:3,placeholder:"Milestones and owner expectations"})]})]}),e.jsx("div",{className:"workhub-create-actions",children:e.jsxs("div",{className:"workhub-create-actions-group",children:[e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:o.onClose,children:"Close"}),e.jsx("button",{type:"submit",className:"workhub-primary-btn",disabled:!o.canCreate||o.busyKey==="template-create",children:o.busyKey==="template-create"?"Creating…":`${s.icon} ${s.submitLabel}`})]})})]})]})})}function Sx({visibleWorkspaceProjects:o,expandedProjectIds:i,selectedProjectId:c,selectedProjectDeadlineDraft:s,selectedProjectSubmissionTimeDraft:d}){const w=r.useMemo(()=>Object.fromEntries(o.map(Y=>[Y.id,Y])),[o]),f=r.useMemo(()=>{const Y=new Map;return o.forEach(H=>{const $=H.parentProjectId||"",de=Y.get($)||[];de.push(H),Y.set($,de)}),Y},[o]),T=r.useMemo(()=>di(o),[o]),C=r.useMemo(()=>T.filter(Y=>/closed/i.test((Y.name||"").trim())).map(Y=>Y.id),[T]),g=r.useMemo(()=>new Set(C.filter(Y=>!i.includes(Y))),[C,i]),y=r.useMemo(()=>{const Y=c&&c!=="all"&&w[c]||null,H=!!Y&&s!==(Y.projectDeadline||""),$=!!Y&&d!==(Y.submissionTime||"");if(!H&&!$)return g.size===0?T:di(o,g);const de=o.map(V=>V.id!==c?V:{...V,...H?{projectDeadline:s}:{},...$?{submissionTime:d}:{}});return di(de,g)},[g,T,o,w,c,s,d]),q=r.useMemo(()=>zp(T),[T]),F=r.useMemo(()=>new Set(o.map(Y=>Y.id)),[o]),re=r.useMemo(()=>w[c]||null,[c,w]);return{visibleProjectById:w,visibleProjectsByParent:f,visibleProjectTree:T,defaultCollapsedClosedRootIds:C,collapsedClosedRootIdSet:g,liveProjectTree:y,flatVisibleProjectOptions:q,visibleProjectIds:F,selectedProject:re}}function Dx({selectedProject:o,visibleProjectById:i,visibleProjectsByParent:c,visibleWorkspaceProjects:s,flatVisibleProjectOptions:d,workspaceByIdForFiltering:w,selectedWorkspaceTemplateIntentSet:f,selectedWorkspaceTemplateId:T,selectedProjectColorDraft:C,selectedProjectNarrativeDraft:g,selectedProjectIntentDetailDrafts:y,selectedProjectTypeDraft:q,selectedWorkspaceProjectColorMeanings:F}){const re=r.useMemo(()=>o?Ft(o,w,f):"project",[o,f,w]),Y=r.useMemo(()=>{const v={};return s.forEach(M=>{v[M.id]=Ft(M,w,f)}),v},[f,s,w]),H=r.useMemo(()=>{const v={};return Object.entries(Y).forEach(([M,z])=>{v[M]=Bt(z,T)}),v},[Y,T]),$=r.useMemo(()=>Object.fromEntries(Object.entries(H).map(([v,M])=>[v,M.icon])),[H]),de=r.useMemo(()=>Object.fromEntries(s.map(v=>{const z=(Y[v.id]||"project")==="project"?"📁":H[v.id]?.icon||"📁";return[v.id,z]})),[Y,H,s]),V=r.useMemo(()=>o&&H[o.id]||Bt(re,T),[H,o,re,T]),b=r.useMemo(()=>{if(!o)return[];const v=[],M=new Set;let z=o;for(;z&&!M.has(z.id);){v.unshift(z),M.add(z.id);const te=z.parentProjectId||"";z=te&&i[te]||null}return v},[o,i]),D=r.useMemo(()=>b.slice(-3),[b]),N=r.useMemo(()=>{for(let v=b.length-1;v>=0;v-=1){const M=b[v];if((Y[M.id]||"project")==="project")return M}return null},[Y,b]),x=r.useCallback(v=>{if(!v||v==="all")return"list";const M=new Set;let z=v;for(;z&&!M.has(z);){M.add(z);const te=i[z];if(!te)break;const R=te.taskItemDisplayMode||"inherit";if(R!=="inherit")return R;z=te.parentProjectId||""}return"list"},[i]),I=r.useMemo(()=>!o||o.id==="all"?"list":x(o.id),[x,o]),K=r.useMemo(()=>{if(!o)return"";const v=pi(o.projectStartDate||""),M=pi(o.projectDeadline||"");return v&&M?`${v} -> ${M}`:M||v||""},[o]),he=r.useMemo(()=>o?.projectType==="tender"&&o.submissionTime||"",[o]),_=r.useMemo(()=>{const v=C.trim().toLowerCase(),M=F.find(z=>z.color.toLowerCase()===v);return M||{color:C,label:"Custom color",hint:`Custom meaning (${C.toUpperCase()}).`}},[C,F]),B=r.useMemo(()=>o?`${V.icon} ${o.name}`:"",[o,V]),E=r.useMemo(()=>d.map(v=>({...v,name:`${de[v.id]||"📁"} ${v.name}`})),[d,de]),X=r.useMemo(()=>Bw(re,g,y),[re,y,g]),we=r.useMemo(()=>{const v=Pp[re],M=new Set(v||On.map(z=>z.value));return q&&!M.has(q)&&M.add(q),On.filter(z=>M.has(z.value))},[re,q]),L=r.useMemo(()=>o?c.get(o.id)||[]:c.get("")||[],[o,c]);return{selectedProjectEffectiveIntent:re,projectIntentById:Y,projectIntentMetaById:H,projectIntentIconById:$,projectSelectorIconById:de,selectedProjectIntentMeta:V,selectedProjectLineage:b,taskContextTrail:D,quickTaskViewTargetProject:N,resolveTaskItemDisplayMode:x,taskItemDisplayMode:I,selectedProjectPeriodLabel:K,selectedProjectSubmissionTimeLabel:he,selectedProjectColorMeaning:_,selectedProjectDisplayName:B,flatVisibleProjectOptionsWithIcons:E,selectedProjectComposedDescriptionDraft:X,selectedProjectTypeOptions:we,selectedProjectChildren:L}}function Pt(o){return Array.isArray(o.checklist)?o.checklist.map(i=>({...i,details:i.details||"",attachments:Array.isArray(i.attachments)?i.attachments:Array.isArray(i.imageUrls)?i.imageUrls:[],imageUrls:Array.isArray(i.imageUrls)?i.imageUrls:[],links:Array.isArray(i.links)?i.links:[]})):[]}function Kr(o){return Array.isArray(o.attachments)?o.attachments:Array.isArray(o.imageUrls)?o.imageUrls:[]}function hc(o){return Array.isArray(o.links)?o.links:[]}function Po(o){const i=(o||"").trim();if(!i)return"Attachment";try{const w=new URL(i).pathname.split("/").filter(Boolean).pop()||"",f=decodeURIComponent(w).replace(/[_-]+/g," ").trim();if(f)return f}catch{}const c=i.split("/").filter(Boolean).pop()||i;return decodeURIComponent(c).replace(/[_-]+/g," ").trim()||"Attachment"}function Mx(o,i){const c=o.attachmentTitles?.[i];return c&&c.trim()?c.trim():Po(i)}function Up(o){const i=(o||"").trim();if(!i)return"Link";try{const c=new URL(i),s=c.hostname.replace(/^www\./i,"");if(/docs\.google\.com$/i.test(c.hostname)){if(c.pathname.includes("/document/"))return"Google Doc";if(c.pathname.includes("/spreadsheets/"))return"Google Sheet";if(c.pathname.includes("/presentation/"))return"Google Slides";if(c.pathname.includes("/forms/"))return"Google Form";if(c.pathname.includes("/drive/"))return"Google Drive file"}const d=Po(i);return d&&!/^[A-Za-z0-9_-]{16,}$/.test(d)?d:s||"Link"}catch{return Po(i)||"Link"}}function Tx(o,i){const c=o.linkTitles?.[i];return c&&c.trim()?c.trim():Up(i)}function Ix(o){const i=(o||"").trim();if(!i)return"link";try{return new URL(i).hostname.replace(/^www\./i,"")||"link"}catch{return i.replace(/^https?:\/\//i,"").split("/")[0]||"link"}}function zx({tasks:o,visibleProjectIds:i,visibleProjectsByParent:c,visibleWorkspaceProjects:s,selectedProjectId:d,selectedAssigneeUid:w,selectedWorkspace:f,selectedWorkspaceScopeType:T,taskFilterRequireAttachments:C,taskFilterRequireChecklist:g,taskFilterPriority:y,selectedTaskStatusTab:q}){const F=r.useMemo(()=>Array.isArray(f?.taskStatuses)&&(f?.taskStatuses?.length??0)>0?f.taskStatuses.map(L=>({...L})):qw("workspace_default",T),[f?.id,f?.taskStatuses,T]),re=r.useMemo(()=>{const L=new Map,v=new Map(s.map(z=>[z.id,z]));function M(z,te=0){if(te>20)return F;if(L.has(z))return L.get(z);const R=v.get(z);if(!R)return L.set(z,F),F;if(Array.isArray(R.taskStatuses)&&R.taskStatuses.length>0){const se=R.taskStatuses.map(fe=>({...fe}));return L.set(z,se),se}if(R.parentProjectId){const se=M(R.parentProjectId,te+1);return L.set(z,se),se}return L.set(z,F),F}return s.forEach(z=>M(z.id)),L},[s,F]),Y=r.useMemo(()=>!d||d==="all"?F:re.get(d)??F,[d,re,F]),H=r.useMemo(()=>F.find(L=>L.id==="backlog")?.id||F[0]?.id||"backlog",[F]),$=r.useMemo(()=>o.filter(L=>!(!i.has(L.projectId)||nx(L.title||"")||w!=="all"&&L.assigneeUid!==w)),[w,o,i]),de=r.useMemo(()=>{const L={};return $.forEach(v=>{L[v.projectId]=(L[v.projectId]||0)+1}),L},[$]),V=r.useMemo(()=>{const L={};return $.forEach(v=>{/done|complete/i.test(v.status)&&(L[v.projectId]=(L[v.projectId]||0)+1)}),L},[$]),b=r.useMemo(()=>{const L={},v=new Set,M=z=>{if(!z)return{done:0,total:0};if(L[z])return L[z];if(v.has(z))return{done:V[z]||0,total:de[z]||0};v.add(z);let te=V[z]||0,R=de[z]||0;(c.get(z)||[]).forEach(Z=>{const ye=M(Z.id);te+=ye.done,R+=ye.total}),v.delete(z);const fe={done:te,total:R};return L[z]=fe,fe};return s.forEach(z=>{L[z.id]=M(z.id)}),L},[c,s,V,de]),D=r.useMemo(()=>d==="all"?$:$.filter(L=>L.projectId===d),[d,$]),N=r.useMemo(()=>o.reduce((L,v)=>(L[v.status]=(L[v.status]||0)+1,L),{}),[o]),x=r.useMemo(()=>D.filter(L=>!(C&&Kr(L).length===0||g&&(!Array.isArray(L.checklist)||L.checklist.length===0)||y!=="all"&&L.priority!==y)),[y,C,g,D]),I=r.useMemo(()=>{let L=0;return C&&(L+=1),g&&(L+=1),y!=="all"&&(L+=1),L},[y,C,g]),K=r.useMemo(()=>q==="all"?x:x.filter(L=>L.status===q),[q,x]),he=r.useMemo(()=>{const L={};for(const v of K)L[v.status]=(L[v.status]||0)+1;return L},[K]),_=r.useMemo(()=>{if(T!=="finance")return{};const L={};for(const v of K)typeof v.valueAmount=="number"&&Number.isFinite(v.valueAmount)&&v.valueAmount>0&&(L[v.status]=Math.round(((L[v.status]||0)+v.valueAmount)*100)/100);return L},[K,T]),B=r.useMemo(()=>{if(T!=="finance")return"";for(const L of K)if(L.valueCurrency)return L.valueCurrency;return"OMR"},[K,T]),E=r.useMemo(()=>{const L={};for(const v of x)L[v.status]=(L[v.status]||0)+1;return L},[x]),X=r.useMemo(()=>{const L=Y.filter(M=>{const z=`${M.id} ${M.label}`.toLowerCase();return z.includes("done")||z.includes("complete")||z.includes("closed")});return L.length===0?null:L.find(M=>(E[M.id]||0)>0)||L[0]||null},[Y,E]),we=r.useMemo(()=>X&&E[X.id]||0,[X,E]);return{workspaceTaskStatuses:F,effectiveStatusesByProjectId:re,selectedProjectEffectiveTaskStatuses:Y,defaultTaskStatusId:H,workspaceScopedTasks:$,workspaceTaskCountByProjectId:de,workspaceDoneTaskCountByProjectId:V,workspaceTaskProgressByProjectId:b,visibleTasks:D,taskCountByStatus:N,taskFilterBaseTasks:x,activeTaskFilterCount:I,filteredTasks:K,filteredTaskCountByStatus:he,financeStatusTotals:_,financeWorkspaceCurrency:B,taskFilterBaseTaskCountByStatus:E,completedStatusForHighlight:X,completedHighlightCount:we}}function Px(o,i){if(!i)return 1;let c=0;o.nameLower===i&&(c+=220),o.nameLower.startsWith(i)&&(c+=140);const s=o.nameLower.indexOf(i);s>=0&&(c+=110-Math.min(s,80));const d=o.workspaceNameLower.indexOf(i);d>=0&&(c+=38-Math.min(d,30)),o.subjectLabelLower.includes(i)&&(c+=24),o.clientNameLower&&o.clientNameLower.includes(i)&&(c+=22),o.descriptionLower.includes(i)&&(c+=18);const w=i.split(/\s+/).filter(f=>f.length>0);if(w.length>1){const f=w.reduce((T,C)=>o.searchableText.includes(C)?T+1:T,0);c+=f*14}return c}function $x({projects:o,visibleWorkspaceById:i,allClientById:c,currentUid:s,isPrivilegedMember:d,workspaceByIdForFiltering:w,onBeforeOpen:f}){const[T,C]=r.useState(!1),[g,y]=r.useState(""),[q,F]=r.useState(0),re=r.useRef(null),Y=r.useRef(f);Y.current=f,r.useEffect(()=>{const b=D=>{(D.ctrlKey||D.metaKey)&&D.key.toLowerCase()==="k"&&(D.preventDefault(),Y.current?.(),y(""),F(0),C(!0))};return window.addEventListener("keydown",b),()=>window.removeEventListener("keydown",b)},[]),r.useEffect(()=>{if(!T)return;const b=window.requestAnimationFrame(()=>{re.current?.focus(),re.current?.select()});return()=>window.cancelAnimationFrame(b)},[T]),r.useEffect(()=>{if(!T)return;const b=D=>{D.key==="Escape"&&(D.preventDefault(),C(!1),y(""),F(0))};return window.addEventListener("keydown",b),()=>window.removeEventListener("keydown",b)},[T]);const H=r.useMemo(()=>{const b=[];return o.forEach((D,N)=>{const x=i[D.workspaceId];if(!x)return;const I=x.memberAccessLevels?.[s]||"custom";if(!Un(D,s,d||I==="full"))return;const he=Wt(x).templateId,_=new Set(ni(he)),B=Ft(D,w,_);if(!_.has(B))return;const E=Bt(B,he),X=(D.clientId&&c[D.clientId]?.name||"").trim(),we=(D.description||"").trim();b.push({projectId:D.id,workspaceId:D.workspaceId,name:D.name,workspaceName:x.name,subjectLabel:E.subjectLabel,clientName:X,nameLower:D.name.toLowerCase(),workspaceNameLower:x.name.toLowerCase(),subjectLabelLower:E.subjectLabel.toLowerCase(),clientNameLower:X.toLowerCase(),descriptionLower:we.toLowerCase(),searchableText:[D.name,x.name,E.subjectLabel,X,we].join(" ").toLowerCase(),order:N})}),b},[c,s,d,o,i,w]),$=r.useMemo(()=>{const b=g.trim().toLowerCase(),D=b?36:18;return H.map(N=>({entry:N,score:Px(N,b)})).filter(({score:N})=>b?N>0:!0).sort((N,x)=>x.score!==N.score?x.score-N.score:N.entry.order!==x.entry.order?N.entry.order-x.entry.order:N.entry.name.localeCompare(x.entry.name)).slice(0,D).map(({entry:N})=>N)},[H,g]),de=r.useMemo(()=>$.length===0?-1:Math.min(q,$.length-1),[q,$.length]);function V(){C(!1),y(""),F(0)}return{globalFinderOpen:T,setGlobalFinderOpen:C,globalFinderQuery:g,setGlobalFinderQuery:y,globalFinderActiveIndex:q,setGlobalFinderActiveIndex:F,globalFinderInputRef:re,globalFinderEntries:H,globalFinderResults:$,globalFinderResolvedActiveIndex:de,closeGlobalFinder:V}}function Ax({notifications:o,tasks:i,selectedWorkspaceId:c,workspaceProjectById:s}){const d=r.useMemo(()=>o.filter(C=>!C.read).length,[o]),w=r.useMemo(()=>Object.fromEntries(i.map(C=>[C.id,C])),[i]),f=r.useMemo(()=>{const C={},g=o.filter(y=>!y.read&&y.entityType==="comment"&&!!y.entityId);return g.length===0||g.forEach(y=>{const q=w[y.entityId];!q||q.workspaceId!==c||(C[q.id]=(C[q.id]||0)+1)}),C},[o,c,w]),T=r.useMemo(()=>{const C={};return Object.keys(f).length===0||Object.entries(f).forEach(([g,y])=>{const q=w[g];if(!q?.projectId||y<=0)return;let F=q.projectId;const re=new Set;for(;F&&!re.has(F);)re.add(F),C[F]=(C[F]||0)+y,F=s[F]?.parentProjectId||""}),C},[w,f,s]);return{unreadNotificationCount:d,unreadCommentCountByTaskId:f,unreadCommentCountByProjectId:T}}function Ex(o,i){return Vw(o).buildHomeWidgets(i)}function Ux({visibleTasks:o,workspaceTaskStatuses:i,taskCounts:c,scopeAssignableMembers:s,workspaceAssignableMembers:d,memberNameByUid:w,workspaceProjects:f,visibleWorkspaceProjects:T,activity:C,currentUid:g,isPrivilegedMember:y,activityWindowDays:q,allClientById:F,clients:re,scopedWorkspaceIds:Y,selectedWorkspaceTemplateId:H,unreadNotificationCount:$,pendingMembersCount:de}){const V=r.useMemo(()=>{const R=new Map;return o.forEach(se=>{R.set(se.status,(R.get(se.status)||0)+1)}),i.map(se=>({id:se.id,label:se.label,color:se.color,count:R.get(se.id)||0}))},[o,i]),b=r.useMemo(()=>{const R=[{id:"urgent",label:"Urgent",count:0,color:"#ef4444"},{id:"high",label:"High",count:0,color:"#f59e0b"},{id:"medium",label:"Medium",count:0,color:"#3b82f6"},{id:"low",label:"Low",count:0,color:"#10b981"}],se=new Map(R.map(fe=>[fe.id,fe]));return o.forEach(fe=>{const Z=se.get(fe.priority);Z&&(Z.count+=1)}),R},[o]),D=r.useMemo(()=>{const R=new Set(i.filter(se=>/done|complete/i.test(se.id)||/done|complete/i.test(se.label)).map(se=>se.id));return R.size===0&&(R.add("done"),R.add("completed")),o.reduce((se,fe)=>se+(R.has(fe.status)?1:0),0)},[o,i]),N=r.useMemo(()=>c.total>0?Math.round(D/c.total*100):0,[D,c.total]),x=r.useMemo(()=>{const R=new Map;for(const se of o){const fe=se.assigneeUid||"";if(!fe)continue;let Z=R.get(fe);Z||(Z={total:0,inProgress:0,done:0},R.set(fe,Z)),Z.total++,se.status==="in_progress"&&Z.inProgress++,/done|complete/i.test(se.status)&&Z.done++}return s.map(se=>{const fe=R.get(se.uid);return fe?{uid:se.uid,name:se.displayName||se.email,...fe}:null}).filter(se=>se!==null&&se.total>0).sort((se,fe)=>fe.total-se.total)},[s,o]),I=r.useMemo(()=>f.filter(R=>R.visibility==="restricted").length,[f]),K=r.useMemo(()=>y?C:C.filter(R=>R.visibility!=="restricted"||(R.memberUids||[]).includes(g)),[C,g,y]),he=r.useMemo(()=>K.slice(0,8).map(R=>({id:R.id,actor:w[R.actorUid]||R.actorUid,message:R.message,createdAt:kr(R.createdAt),action:R.action})),[w,K]),_=r.useMemo(()=>{const R=q??30,se=864e5,fe=Date.now(),Z=[];for(let u=R-1;u>=0;u--){const W=new Date(fe-u*se);Z.push(W.toISOString().slice(0,10))}const ye=new Set(Z);function je(u){return!u||typeof u!="object"?"":"toMillis"in u&&typeof u.toMillis=="function"?new Date(u.toMillis()).toISOString().slice(0,10):"seconds"in u?new Date(Number(u.seconds||0)*1e3).toISOString().slice(0,10):""}const Ie=new Map;for(const u of K){const W=je(u.createdAt);if(!W||!ye.has(W))continue;Ie.has(u.actorUid)||Ie.set(u.actorUid,new Map);const O=Ie.get(u.actorUid);O.set(W,(O.get(W)??0)+1)}const ee=d.map(u=>{const W=Ie.get(u.uid)??new Map,O=Array.from(W.values()).reduce((pe,Le)=>pe+Le,0);return{uid:u.uid,name:w[u.uid]||u.uid,initials:Rn(w[u.uid]||u.uid),totalInWindow:O,dayCounts:Z.map(pe=>W.get(pe)??0)}}).sort((u,W)=>W.totalInWindow-u.totalInWindow);return{days:Z,rows:ee,windowDays:R}},[q,w,K,d]),B=r.useMemo(()=>[..._.days].reverse(),[_.days]),E=r.useMemo(()=>{const R=Date.now(),se=1440*60*1e3,fe=14;return T.map(Z=>{const ye=uc(Z),je=Number.isFinite(ye)?Math.floor((ye-R)/se):Number.POSITIVE_INFINITY,Ie=Z.priority||"medium",ee=mp[Ie],u=je<0,W=u?100:Math.round((fe-Math.min(je,fe))/fe*100),O=u?`Overdue by ${Math.abs(je)} day${Math.abs(je)===1?"":"s"}`:je===0?"Due today":`${je} day${je===1?"":"s"} remaining`;return{project:Z,deadlineMs:ye,daysRemaining:je,priority:Ie,priorityRank:ee,isOverdue:u,urgencyPercent:W,countdownText:O,isHighPriority:ee>=mp.high,isNearTwoDays:je>=0&&je<=2}}).filter(Z=>Number.isFinite(Z.deadlineMs)).filter(Z=>Z.isHighPriority||Z.daysRemaining<=7).sort((Z,ye)=>Z.isNearTwoDays!==ye.isNearTwoDays?Z.isNearTwoDays?-1:1:Z.daysRemaining!==ye.daysRemaining?Z.daysRemaining-ye.daysRemaining:ye.priorityRank-Z.priorityRank).slice(0,8).map(Z=>({id:Z.project.id,name:Z.project.name,type:Z.project.projectType||"other",priority:Z.priority,deadlineDate:pi(Z.project.projectDeadline||""),submissionTime:Z.project.projectType==="tender"?Z.project.submissionTime||Qt:"",daysRemaining:Z.daysRemaining,countdownShort:Z.isOverdue?`${Math.abs(Z.daysRemaining)}d+`:`${Z.daysRemaining}d`,countdownText:Z.countdownText,urgencyPercent:Math.max(8,Z.urgencyPercent),isOverdue:Z.isOverdue,isNearTwoDays:Z.isNearTwoDays,clientName:F[Z.project.clientId||""]?.name||""}))},[F,T]),X=r.useMemo(()=>o.reduce((R,se)=>(R[se.status]=(R[se.status]||0)+1,R),{}),[o]),we=r.useMemo(()=>Object.fromEntries(i.map(R=>[R.id,R.label])),[i]),L=r.useMemo(()=>{if(!Y.length)return 0;const R=new Set(Y);return re.filter(se=>R.has(se.workspaceId)).length},[re,Y]),v=r.useMemo(()=>E.slice(0,6),[E]),M=r.useMemo(()=>E.filter(R=>R.isOverdue).length,[E]),z=r.useMemo(()=>E.filter(R=>!R.isOverdue&&R.daysRemaining<=2).length,[E]),te=r.useMemo(()=>Ex(H,{totalTasks:c.total,activeTasks:Math.max(c.total-D,0),inProgressTasks:c.inProgress,urgentTasks:c.urgent,completionRate:N,projectsCount:T.length,restrictedProjectsCount:I,assignedMembersCount:x.length,workspaceClientCount:L,unreadNotifications:$,pendingMembersCount:de,upcomingDeadlineProjectsCount:E.length,nearTermDeadlineProjectsCount:z,overdueProjectsCount:M,recentActivityCount:he.length,taskStatusCounts:X,taskStatusLabels:we}),[X,we,z,D,N,E.length,he.length,M,de,I,H,c.inProgress,c.total,c.urgent,x.length,$,T.length,L]);return{overviewStatusBuckets:V,overviewPriorityBuckets:b,overviewCompletedCount:D,overviewCompletionRate:N,tasksByAssignee:x,restrictedProjectsCount:I,visibleActivity:K,overviewRecentTimeline:he,teamActivityHeatmap:_,displayedTeamActivityDays:B,overviewPriorityProjects:E,displayedOverviewPriorityProjects:v,overduePriorityProjectsCount:M,nearTermPriorityProjectsCount:z,homeWidgetTaskStatusCounts:X,homeWidgetTaskStatusLabels:we,workspaceClientCount:L,homeTemplateWidgets:te}}const yp="workhub_attachment_reviews_v1";function Ln(){return{notes:"",comments:[],markers:[],modificationChecks:[]}}function si(o){if(typeof o.sortOrder=="number"&&Number.isFinite(o.sortOrder))return o.sortOrder;if(!o.createdAt)return 0;if(typeof o.createdAt=="object"&&o.createdAt!==null&&"toMillis"in o.createdAt&&typeof o.createdAt.toMillis=="function")return o.createdAt.toMillis();if(typeof o.createdAt=="object"&&o.createdAt!==null&&"seconds"in o.createdAt){const i=Number(o.createdAt.seconds||0),c=Number(o.createdAt.nanoseconds||0);return i*1e3+Math.floor(c/1e6)}if(typeof o.createdAt=="string"){const i=Date.parse(o.createdAt);return Number.isFinite(i)?i:0}return 0}function Lp(o,i,c){return o.filter(s=>s.workspaceId===i&&s.status===c).sort((s,d)=>{const w=si(s)-si(d);return w!==0?w:si(s)-si(d)})}function $n(o,i,c){const d=Lp(o,i,c).at(-1);return d?si(d)+1024:Date.now()}function Lx({attachmentReviews:o,setAttachmentReviews:i,markerAuthor:c,showToast:s}){const[d,w]=r.useState(""),[f,T]=r.useState("point"),[C,g]=r.useState("contain"),[y,q]=r.useState(null),[F,re]=r.useState(null),[Y,H]=r.useState(null),[$,de]=r.useState(""),[V,b]=r.useState(""),[D,N]=r.useState(!1),[x,I]=r.useState(!1),K=r.useRef(null),he=r.useRef(null),_=r.useRef(null),B=r.useCallback((ee,u)=>{i(W=>{const O=W[ee]||Ln();return{...W,[ee]:u(O)}})},[i]),E=r.useCallback(ee=>{w(ee),T("point"),g("contain"),q(null),re(null),H(null),de(""),b(""),I(!1),_.current=null},[]),X=r.useCallback((ee,u,W)=>{const O=W.getBoundingClientRect(),pe=(ee-O.left)/O.width*100,Le=(u-O.top)/O.height*100;return{x:Math.min(100,Math.max(0,pe)),y:Math.min(100,Math.max(0,Le))}},[]),we=r.useCallback(ee=>X(ee.clientX,ee.clientY,ee.currentTarget),[X]),L=r.useCallback(ee=>{d&&(B(d,u=>({...u,markers:u.markers.filter(W=>W.id!==ee)})),$===ee&&(de(""),b(""),I(!1)))},[d,$,B]),v=r.useCallback(ee=>{if(!d||(x&&!V.trim()&&$&&(L($),de(""),b(""),I(!1)),f==="line"||f==="freehand"))return;const u=we(ee),W=`mk_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;B(d,O=>({...O,markers:[...O.markers,{id:W,type:f,x:u.x,y:u.y,checked:f==="checkbox"?!1:void 0,text:"",createdBy:c,createdAt:new Date().toISOString()}]})),de(W),b(""),I(!0)},[we,L,d,V,$,x,f,c,B]),M=r.useCallback(ee=>{if(!d||ee.button!==0||f!=="line"&&f!=="freehand")return;x&&!V.trim()&&$&&(L($),de(""),b(""),I(!1));const u=ee.currentTarget,W=X(ee.clientX,ee.clientY,u);if(u.setPointerCapture(ee.pointerId),ee.preventDefault(),f==="line"){_.current={tool:"line",imageUrl:d,pointerId:ee.pointerId,start:W,points:[W]},re({x1:W.x,y1:W.y,x2:W.x,y2:W.y}),H(null);return}_.current={tool:"freehand",imageUrl:d,pointerId:ee.pointerId,start:W,points:[W]},re(null),H([W])},[X,L,d,V,$,x,f]),z=r.useCallback(ee=>{const u=_.current;if(!u||u.pointerId!==ee.pointerId)return;const W=X(ee.clientX,ee.clientY,ee.currentTarget);if(ee.preventDefault(),u.tool==="line"){re({x1:u.start.x,y1:u.start.y,x2:W.x,y2:W.y});return}const O=u.points[u.points.length-1];Math.hypot(W.x-O.x,W.y-O.y)<.35||(u.points=[...u.points,W],H(u.points))},[X]),te=r.useCallback(ee=>{const u=_.current;if(!u||u.pointerId!==ee.pointerId)return;const W=ee.currentTarget;W.hasPointerCapture(ee.pointerId)&&W.releasePointerCapture(ee.pointerId),ee.preventDefault();const O=`mk_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;if(u.tool==="line"){const Oe=X(ee.clientX,ee.clientY,W),be=Math.hypot(Oe.x-u.start.x,Oe.y-u.start.y);if(_.current=null,re(null),be<.6)return;B(u.imageUrl,Re=>({...Re,markers:[...Re.markers,{id:O,type:"line",x:u.start.x,y:u.start.y,x2:Oe.x,y2:Oe.y,text:"",createdBy:c,createdAt:new Date().toISOString()}]})),de(O),b(""),I(!0);return}const pe=u.points.length>1?u.points:[...u.points,X(ee.clientX,ee.clientY,W)];if(_.current=null,H(null),pe.length<2||pe.slice(1).reduce((Oe,be,Re)=>{const Ce=pe[Re];return Oe+Math.hypot(be.x-Ce.x,be.y-Ce.y)},0)<.8)return;const Fe=pe.reduce((Oe,be)=>({x:Oe.x+be.x,y:Oe.y+be.y}),{x:0,y:0});B(u.imageUrl,Oe=>({...Oe,markers:[...Oe.markers,{id:O,type:"freehand",x:Fe.x/pe.length,y:Fe.y/pe.length,path:pe,text:"",createdBy:c,createdAt:new Date().toISOString()}]})),de(O),b(""),I(!0)},[X,c,B]),R=r.useCallback(ee=>{const u=_.current;if(!u||u.pointerId!==ee.pointerId)return;const W=ee.currentTarget;W.hasPointerCapture(ee.pointerId)&&W.releasePointerCapture(ee.pointerId),_.current=null,re(null),H(null)},[]),se=r.useCallback(()=>{d&&(B(d,ee=>({...ee,markers:[]})),_.current=null,re(null),H(null),de(""),b(""),N(!1),I(!1),s({type:"info",message:"Cleared all drawings and annotations for this image."}))},[d,s,B]),fe=r.useCallback((ee,u=!1)=>{if(!d)return;const W=(o[d]||Ln()).markers.find(O=>O.id===ee);W&&(de(ee),b(W.text||""),N(W.resolved??!1),I(u))},[o,d]),Z=r.useCallback(()=>{d&&(x&&!V.trim()&&$&&L($),de(""),b(""),N(!1),I(!1))},[L,d,V,$,x]),ye=r.useCallback(()=>{if(!d||!$)return;const ee=V.trim();if(!ee){s({type:"error",message:"Annotation title is required."});return}B(d,u=>({...u,markers:u.markers.map(W=>W.id===$?{...W,text:ee,resolved:D}:W)})),de(""),b(""),N(!1),I(!1)},[d,V,$,D,s,B]),je=r.useCallback((ee,u)=>{u.stopPropagation();const W=d;if(!W)return;const O=u.currentTarget;O.setPointerCapture(u.pointerId);const pe=u.clientX,Le=u.clientY;he.current=null;function Fe(be){if(!K.current||!he.current&&Math.hypot(be.clientX-pe,be.clientY-Le)<5)return;he.current={markerId:ee,imageUrl:W};const Re=K.current.getBoundingClientRect(),Ce=Math.max(1,Math.min(99,(be.clientX-Re.left)/Re.width*100)),k=Math.max(1,Math.min(99,(be.clientY-Re.top)/Re.height*100));i(ge=>{const ne=ge[W]||Ln();return{...ge,[W]:{...ne,markers:ne.markers.map($e=>$e.id===ee?{...$e,x:Ce,y:k}:$e)}}})}function Oe(){O.removeEventListener("pointermove",Fe),O.removeEventListener("pointerup",Oe),O.removeEventListener("pointercancel",Oe),setTimeout(()=>{he.current=null},100)}O.addEventListener("pointermove",Fe),O.addEventListener("pointerup",Oe),O.addEventListener("pointercancel",Oe)},[d,i]),Ie=r.useCallback(async()=>{const ee=K.current;if(ee){if(document.fullscreenElement){await document.exitFullscreen();return}await ee.requestFullscreen()}},[]);return{lightboxImageUrl:d,setLightboxImageUrl:w,lightboxTool:f,setLightboxTool:T,lightboxImageFit:C,setLightboxImageFit:g,lightboxImageAspect:y,setLightboxImageAspect:q,lightboxDraftLine:F,lightboxDraftFreehandPath:Y,lightboxMarkerEditorId:$,lightboxMarkerDraft:V,setLightboxMarkerDraft:b,lightboxMarkerResolved:D,setLightboxMarkerResolved:N,lightboxStageRef:K,lightboxDragRef:he,openAttachmentLightbox:E,handleLightboxStageClick:v,handleLightboxStagePointerDown:M,handleLightboxStagePointerMove:z,handleLightboxStagePointerUp:te,handleLightboxStagePointerCancel:R,openLightboxMarkerEditor:fe,closeLightboxMarkerEditor:Z,handleLightboxMarkerEditorSave:ye,handleLightboxClearAllMarkers:se,handleMarkerPointerDown:je,handleLightboxFullscreenToggle:Ie}}function Ox({selectedWorkspaceSettings:o,workspaceAccessMemberUids:i,setWorkspaceAccessMemberUids:c,workspaceInviteEmails:s,setWorkspaceInviteEmails:d,workspaceInviteEmailDraft:w,setWorkspaceInviteEmailDraft:f,workspaceMemberAccessLevels:T,setWorkspaceMemberAccessLevels:C,workspaces:g,userAccessSourceByUid:y,userAccessDraftByUid:q,setUserAccessDraftByUid:F,userAccessDraftDirtyByUid:re,currentUserUid:Y,setBusyKey:H,showToast:$}){const de=r.useCallback((v,M)=>{F(z=>{const te=y[v]||{mode:"workspace_based",workspaceById:{}},R=z[v]||te,se=M({mode:R.mode,workspaceById:Object.fromEntries(Object.entries(R.workspaceById).map(([fe,Z])=>[fe,{...Z}]))});return{...z,[v]:se}})},[F,y]),V=r.useCallback((v,M)=>{de(v,z=>{const te=Object.fromEntries(Object.entries(z.workspaceById).map(([R,se])=>[R,{...se}]));return M==="full"?Object.keys(te).forEach(R=>{te[R]={enabled:!0,level:"full"}}):Object.keys(te).forEach(R=>{te[R]={enabled:!1,level:"custom"}}),{mode:M,workspaceById:te}})},[de]),b=r.useCallback((v,M,z)=>{de(v,te=>{const R=te.workspaceById[M]||{level:"custom"};return{...te,workspaceById:{...te.workspaceById,[M]:{enabled:z,level:z?R.level:"custom"}}}})},[de]),D=r.useCallback((v,M,z)=>{de(v,te=>({...te,workspaceById:{...te.workspaceById,[M]:{enabled:!0,level:z}}}))},[de]),N=r.useCallback(v=>{F(M=>{if(!M[v])return M;const z={...M};return delete z[v],z})},[F]),x=r.useCallback(async v=>{const M=q[v];if(!(!M||!re[v])){H(`user-access-save:${v}`);try{await Promise.all(g.map(async z=>{const te=ve(z.accessMemberUids||[]),R={...z.memberAccessLevels||{}},se=te.includes(v),fe=M.workspaceById[z.id]||{enabled:!1,level:"custom"};let Z=fe.enabled,ye=fe.level;M.mode==="full"&&(Z=!0,ye="full");const je=Z?se?te:ve([...te,v]):te.filter(W=>W!==v),Ie={...R};Z?Ie[v]=ye:delete Ie[v];const ee=je.length!==te.length||je.some((W,O)=>W!==te[O]),u=(R[v]||null)!==(Ie[v]||null);!ee&&!u||await $o(z.id,{accessMemberUids:je,memberAccessLevels:Ie})})),F(z=>{const te={...z};return delete te[v],te}),$({type:"success",message:"User access settings saved."})}catch(z){const te=z instanceof Error?z.message:"Could not save user access settings.";$({type:"error",message:te})}finally{H("")}}},[H,F,$,q,re,g]),I=r.useCallback(async(v,M)=>{if(!o)return;const z=i,te=M?ve([...i,v]):i.filter(R=>R!==v);c(te),H(`workspace-access:${o.id}:${v}`);try{await $o(o.id,{accessMemberUids:te,invitedEmails:ui(s)})}catch(R){const se=R instanceof Error?R.message:"Could not update access.";$({type:"error",message:se}),c(z)}finally{H("")}},[o,H,c,$,i,s]),K=r.useCallback(async(v,M,z)=>{const te=g.find(ye=>ye.id===M);if(!te)return;const R=ve(te.accessMemberUids||[]),se={...te.memberAccessLevels||{}},fe=z?ve([...R,v]):R.filter(ye=>ye!==v),Z={...se};z?Z[v]||(Z[v]="custom"):delete Z[v],H(`user-workspace:${M}:${v}`);try{await $o(M,{accessMemberUids:fe,memberAccessLevels:Z})}catch(ye){const je=ye instanceof Error?ye.message:"Could not update workspace access.";$({type:"error",message:je})}finally{H("")}},[H,$,g]),he=r.useCallback(()=>{const v=w.trim().toLowerCase();if(!v||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){$({type:"error",message:"Enter a valid invite email."});return}d(M=>ui([...M,v])),f("")},[f,d,$,w]),_=r.useCallback(v=>{d(M=>M.filter(z=>z!==v))},[d]),B=r.useCallback(async v=>{H(`member-request:${v}`);try{await ai({uid:v,status:"approved",role:"member"}),$({type:"success",message:"User approved. Assign workspace access from Manage access."})}catch(M){const z=M instanceof Error?M.message:"Could not approve request.";$({type:"error",message:z})}finally{H("")}},[H,$]),E=r.useCallback(async v=>{H(`member-request:${v}`);try{await ai({uid:v,status:"suspended",role:"member",reason:"Access request declined by administrator."}),$({type:"success",message:"Access request declined."})}catch(M){const z=M instanceof Error?M.message:"Could not decline request.";$({type:"error",message:z})}finally{H("")}},[H,$]),X=r.useCallback(async v=>{if(!(!Y||!o)){H(`workspace-request:${o.id}:${v}`);try{await ai({uid:v,status:"approved",role:"member"});const M=ve([...i,v]);c(M),await $o(o.id,{accessMemberUids:M,invitedEmails:ui(s)}),await bo({workspaceId:o.id,actorUid:Y,recipientUids:[v],entityType:"workspace",entityId:o.id,action:"approved",message:`you were granted access to workspace "${o.name}"`}),$({type:"success",message:"Request approved and workspace access granted."})}catch(M){const z=M instanceof Error?M.message:"Could not approve request for this workspace.";$({type:"error",message:z})}finally{H("")}}},[Y,o,H,c,$,i,s]),we=r.useCallback(async v=>{if(!(!Y||!o)){H(`workspace-request:${o.id}:${v}`);try{await ai({uid:v,status:"suspended",role:"member",reason:"Workspace access request declined by administrator."}),$({type:"success",message:"Access request declined."})}catch(M){const z=M instanceof Error?M.message:"Could not decline request.";$({type:"error",message:z})}finally{H("")}}},[Y,o,H,$]),L=r.useCallback(async(v,M)=>{if(!o)return;const z=T,te={...T,[v]:M};C(te);try{await $o(o.id,{memberAccessLevels:te})}catch(R){C(z);const se=R instanceof Error?R.message:"Could not update access level.";$({type:"error",message:se})}},[o,C,$,T]);return{handleWorkspaceAccessToggle:I,handleToggleUserWorkspace:K,handleSetUserAccessModeDraft:V,handleToggleUserWorkspaceDraft:b,handleSetUserWorkspaceLevelDraft:D,handleDiscardUserAccessDraft:N,handleSaveUserAccessDraft:x,handleWorkspaceInviteAdd:he,handleWorkspaceInviteRemove:_,handleApproveRequestGlobal:B,handleRejectRequestGlobal:E,handleApproveRequestForWorkspace:X,handleRejectRequestForWorkspace:we,handleMemberAccessLevelChange:L}}function Rx({visibleWorkspaceProjects:o,taskChecklistDrafts:i,setTaskChecklistDrafts:c,taskAttachmentDrafts:s,setTaskAttachmentDrafts:d,taskAttachmentTitleDrafts:w,setTaskAttachmentTitleDrafts:f,taskLinkDrafts:T,setTaskLinkDrafts:C,taskLinkTitleDrafts:g,setTaskLinkTitleDrafts:y,taskLinkEditingDrafts:q,setTaskLinkEditingDrafts:F,checklistDetailsDrafts:re,checklistAttachmentDrafts:Y,setChecklistAttachmentDrafts:H,checklistLinkDrafts:$,setChecklistLinkDrafts:de,setExpandedChecklistDetailKeys:V,editingChecklistItemText:b,setEditingChecklistTaskId:D,setEditingChecklistItemId:N,setEditingChecklistScope:x,setEditingChecklistItemText:I,setUploadingTaskAttachmentId:K,setUploadingChecklistAttachmentKey:he,attachmentDeletePrompt:_,setAttachmentDeletePrompt:B,currentUserUid:E,handleTaskUpdate:X,showToast:we}){const L=r.useCallback((p,A)=>`${p}:${A}`,[]),v=r.useCallback((p,A)=>{const G=L(p,A);V(ue=>ue.includes(G)?ue.filter(ke=>ke!==G):[...ue,G])},[L,V]),M=r.useCallback((p,A,G)=>{const ue=Pt(p).map(ke=>ke.id===A?G(ke):ke);X(p,{checklist:ue},{silent:!0})},[X]),z=r.useCallback((p,A,G)=>{M(p,A,ue=>({...ue,completed:G}))},[M]),te=r.useCallback((p,A)=>{const G=Pt(p).filter(ue=>ue.id!==A);X(p,{checklist:G},{silent:!0})},[X]),R=r.useCallback(p=>{const A=(i[p.id]||"").trim();if(!A)return;const G=[...Pt(p),{id:`chk_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,text:A,completed:!1}];c(ue=>({...ue,[p.id]:""})),X(p,{checklist:G},{silent:!0})},[X,c,i]),se=r.useCallback((p,A,G,ue)=>{D(p),N(A),x(ue),I(G)},[N,I,x,D]),fe=r.useCallback((p,A)=>{const G=b.trim();if(!G){D(null),N(null),x(null),I("");return}const ue=Pt(p).map(ke=>ke.id===A?{...ke,text:G}:ke);D(null),N(null),x(null),I(""),X(p,{checklist:ue},{silent:!0})},[b,X,N,I,x,D]),Z=r.useCallback((p,A)=>{const G=L(p.id,A),ue=(re[G]||"").trim();M(p,A,ke=>({...ke,details:ue}))},[re,L,M]),ye=r.useCallback((p,A)=>{const G=L(p.id,A),ue=(Y[G]||"").trim();ue&&(M(p,A,ke=>({...ke,attachments:[...ke.attachments||[],ue]})),H(ke=>({...ke,[G]:""})))},[Y,L,H,M]),je=r.useCallback((p,A,G)=>{M(p,A,ue=>({...ue,attachments:(ue.attachments||[]).filter(ke=>ke!==G)}))},[M]),Ie=r.useCallback(async p=>new Promise((A,G)=>{const ue=new FileReader;ue.onload=()=>{const ke=typeof ue.result=="string"?ue.result:"",Ae=ke.includes(",")?ke.split(",")[1]:ke;if(!Ae){G(new Error("Could not read file data."));return}A(Ae)},ue.onerror=()=>G(new Error("Could not read file data.")),ue.readAsDataURL(p)}),[]),ee=r.useCallback(async p=>{try{return(await Hr({projectId:p.id,projectName:p.name})).folderId}catch{return}},[]),u=r.useCallback(async(p,A)=>{if(A.storageMethod==="drive"){if(p.size>7340032)throw new Error(`File ${p.name} exceeds 7 MB limit for Drive upload.`);const _n=await Ie(p),Wn=await ee(A);return(await Ip({fileName:p.name,contentType:p.type||"application/octet-stream",dataBase64:_n,parentFolderId:Wn})).url}const ue=p.name.split(".").pop()||"bin",ke=p.type.startsWith("image/"),Ae=p.type.startsWith("video/"),Ye=ke?"images":Ae?"videos":"docs",Ge=`workhub-attachments/${A.workspaceId}/${A.id}/${Ye}/${crypto.randomUUID()}.${ue}`,qe=nc(cc,Ge);return await sc(qe,p,{contentType:p.type||"application/octet-stream"}),await lc(qe)},[Ie,ee]),W=r.useCallback(async(p,A)=>{if(A.length===0)return;const G=o.find(ue=>ue.id===p.projectId);if(G){K(p.id);try{const ue=await Promise.all(A.map(Ye=>u(Ye,G))),ke=[...Kr(p),...ue],Ae={...p.attachmentTitles||{}};ue.forEach((Ye,Ge)=>{const qe=A[Ge]?.name?.trim();qe&&(Ae[Ye]=qe)}),await X(p,{attachments:ke,attachmentTitles:Ae},{silent:!0}),we({type:"success",message:ue.length>1?`${ue.length} attachments uploaded.`:"Attachment uploaded."})}catch(ue){const ke=ue instanceof Error?ue.message:"Could not upload attachment.";we({type:"error",message:ke})}finally{K("")}}},[X,K,we,u,o]),O=r.useCallback(async(p,A,G)=>{if(G.length===0)return;const ue=o.find(Ae=>Ae.id===p.projectId);if(!ue)return;const ke=L(p.id,A);he(ke);try{const Ae=await Promise.all(G.map(Ge=>u(Ge,ue))),Ye=Pt(p).map(Ge=>Ge.id===A?{...Ge,attachments:[...Ge.attachments||[],...Ae]}:Ge);await X(p,{checklist:Ye},{silent:!0}),we({type:"success",message:Ae.length>1?`${Ae.length} checklist attachments uploaded.`:"Checklist attachment uploaded."})}catch(Ae){const Ye=Ae instanceof Error?Ae.message:"Could not upload checklist attachment.";we({type:"error",message:Ye})}finally{he("")}},[L,X,he,we,u,o]),pe=r.useCallback((p,A)=>{const G=L(p.id,A),ue=($[G]||"").trim();ue&&(M(p,A,ke=>({...ke,links:[...ke.links||[],ue]})),de(ke=>({...ke,[G]:""})))},[$,L,de,M]),Le=r.useCallback((p,A,G)=>{M(p,A,ue=>({...ue,links:(ue.links||[]).filter(ke=>ke!==G)}))},[M]),Fe=r.useCallback(p=>{const A=(s[p.id]||"").trim();if(!A)return;const G=(w[p.id]||"").trim(),ue=[...Kr(p),A],ke={...p.attachmentTitles||{},[A]:G||"Attachment"};f(Ae=>({...Ae,[p.id]:""})),d(Ae=>({...Ae,[p.id]:""})),X(p,{attachments:ue,attachmentTitles:ke},{silent:!0})},[X,d,f,s,w]),Oe=r.useCallback((p,A)=>{const G=A.includes("drive.google.com/thumbnail?id=");B({task:p,attachment:A,isDriveFile:G})},[B]),be=r.useCallback(p=>{if(!_)return;const{task:A,attachment:G}=_;if(p==="cancel"){B(null);return}if(p==="delete_permanently"){const Ae=G.match(/id=([^&]+)/);Ae&&Ae[1]&&sw(Ae[1]).catch(Ye=>{console.error("Failed to delete permanently from Drive:",Ye),we({type:"error",message:"Failed to permanently delete from Drive."})})}const ue=Kr(A).filter(Ae=>Ae!==G),ke={...A.attachmentTitles||{}};delete ke[G],X(A,{attachments:ue,attachmentTitles:Object.keys(ke).length>0?ke:{}},{silent:!0}),B(null)},[_,X,B,we]),Re=r.useCallback((p,A)=>{const G=A.trim();G!==(p.description||"")&&X(p,{description:G},{silent:!0})},[X]),Ce=r.useCallback((p,A)=>{const G=ct(A.replace(/\r\n/g,`
`));G&&G!==ct((p.title||"").replace(/\r\n/g,`
`))&&X(p,{title:G},{silent:!0})},[X]),k=r.useCallback((p,A)=>{C(G=>({...G,[p.id]:A})),y(G=>({...G,[p.id]:p.linkTitles?.[A]||""})),F(G=>({...G,[p.id]:A}))},[C,F,y]),ge=r.useCallback(p=>{C(A=>({...A,[p]:""})),y(A=>({...A,[p]:""})),F(A=>({...A,[p]:""}))},[C,F,y]),ne=r.useCallback(p=>{const A=(T[p.id]||"").trim();if(!A)return;const G=(q[p.id]||"").trim(),ue=(g[p.id]||"").trim()||Up(A),ke=hc(p),Ae=Array.from(new Set((G?ke.map(qe=>qe===G?A:qe):[...ke,A]).filter(Boolean))),Ye={...p.linkTitles||{},[A]:ue},Ge={...p.linkCreatedBy||{}};if(G&&G!==A){const qe=Ge[G];delete Ye[G],delete Ge[G],qe&&!Ge[A]&&(Ge[A]=qe)}Ge[A]||(Ge[A]=E||p.createdBy),C(qe=>({...qe,[p.id]:""})),y(qe=>({...qe,[p.id]:""})),F(qe=>({...qe,[p.id]:""})),X(p,{links:Ae,linkTitles:Object.keys(Ye).length>0?Ye:{},linkCreatedBy:Object.keys(Ge).length>0?Ge:{}},{silent:!0})},[E,X,C,F,y,T,q,g]),$e=r.useCallback((p,A)=>{const G=hc(p).filter(Ae=>Ae!==A),ue={...p.linkTitles||{}},ke={...p.linkCreatedBy||{}};delete ue[A],delete ke[A],(q[p.id]||"")===A&&ge(p.id),X(p,{links:G,linkTitles:Object.keys(ue).length>0?ue:{},linkCreatedBy:Object.keys(ke).length>0?ke:{}},{silent:!0})},[ge,X,q]),ie=r.useCallback(()=>{D(null),N(null),x(null),I("")},[N,I,x,D]);return{getChecklistDetailKey:L,toggleChecklistItemDetails:v,handleChecklistItemToggle:z,handleChecklistRemove:te,handleChecklistAdd:R,handleChecklistItemEditStart:se,handleChecklistItemEditSave:fe,handleChecklistItemDetailsSave:Z,handleChecklistAttachmentAdd:ye,handleChecklistAttachmentRemove:je,handleTaskAttachmentFileUpload:W,handleChecklistAttachmentFileUpload:O,handleChecklistLinkAdd:pe,handleChecklistLinkRemove:Le,handleTaskAttachmentAdd:Fe,handleTaskAttachmentRemove:Oe,confirmAttachmentRemoval:be,handleSelectedTaskDescriptionSave:Re,handleSelectedTaskTitleSave:Ce,handleTaskLinkEditStart:k,handleTaskLinkEditCancel:ge,handleTaskLinkAdd:ne,handleTaskLinkRemove:$e,handleChecklistItemEditCancel:ie}}function _x(o){const i=o.trim();if(!i)return 0;const c=Number(i);return!Number.isFinite(c)||c<0?null:Math.round(c*100)/100}function Wx(o){const i=o.trim().toUpperCase().replace(/[^A-Z]/g,"");return((i==="USD"?"OMR":i)||"OMR").slice(0,3)}function Fx({currentUserUid:o,selectedWorkspaceId:i,selectedWorkspaceAccessMemberUids:c,selectedProject:s,selectedProjectIntent:d,canEditSelectedProject:w,selectedProjectNameDraft:f,selectedProjectDescriptionDraft:T,resolvedProjectDescriptionDraft:C,setSelectedProjectDescriptionDraft:g,selectedProjectColorDraft:y,setSelectedProjectColorDraft:q,selectedProjectStartDateDraft:F,selectedProjectDeadlineDraft:re,selectedProjectSubmissionTimeDraft:Y,selectedProjectTypeDraft:H,selectedProjectValueAmountDraft:$,selectedProjectValueCurrencyDraft:de,setProjects:V,setSelectedProjectColorMenuOpen:b,setBusyKey:D,showToast:N}){const x=r.useCallback(async()=>{if(!o||!i||!s)return;if(!w){N({type:"error",message:"You do not have permission to edit this project."});return}const he=f.trim(),_=(C??T).trim();if(!he){N({type:"error",message:"Project name is required."});return}if(!ii(y)){N({type:"error",message:"Pick a valid project color."});return}const B=d==="project";if(!B&&H==="tender"&&!Y.trim()){N({type:"error",message:"Submission time is required for tender projects."});return}if(!B&&F&&re&&dc(F,re)){N({type:"error",message:"Deadline cannot be earlier than the start date."});return}let E=0,X=Wx(de);if(!B){const v=_x($);if(v===null){N({type:"error",message:"Value amount must be zero or a positive number."});return}E=v}const we={name:he,description:_,color:y,...B?{}:{projectStartDate:F,projectDeadline:re,submissionTime:H==="tender"?Y.trim():"",projectType:H,valueAmount:E,valueCurrency:X}},L=s;V(v=>v.map(M=>M.id===s.id?{...M,...we}:M)),D(`project-detail:${s.id}`);try{await Jt(s.id,we),await Ze({workspaceId:i,actorUid:o,entityType:"project",entityId:s.id,action:"settings_update",message:`${he} settings were updated`,visibility:s.visibility,memberUids:s.memberUids}),N({type:"success",message:"Project details updated."})}catch(v){V(z=>z.map(te=>te.id===L.id?L:te));const M=v instanceof Error?v.message:"Could not update project details.";N({type:"error",message:M})}finally{D("")}},[w,o,s,d,y,re,T,f,F,Y,H,$,de,V,C,c,i,D,N]),I=r.useCallback(async()=>{if(!s||!w)return;const he=(C??T).trim();if(he===(s.description||""))return;const _=s;V(B=>B.map(E=>E.id===s.id?{...E,description:he}:E)),D(`project-detail:${s.id}`);try{await Jt(s.id,{description:he})}catch(B){V(X=>X.map(we=>we.id===_.id?_:we));const E=B instanceof Error?B.message:"Could not update project description.";N({type:"error",message:E}),g(s.description||"")}finally{D("")}},[w,C,s,T,V,D,g,N]),K=r.useCallback(async he=>{if(q(he),b(!1),!s||!w||he===s.color)return;const _=s;V(B=>B.map(E=>E.id===s.id?{...E,color:he}:E)),D(`project-detail:${s.id}`);try{await Jt(s.id,{color:he})}catch(B){V(X=>X.map(we=>we.id===_.id?_:we));const E=B instanceof Error?B.message:"Could not update project color.";N({type:"error",message:E}),q(s.color)}finally{D("")}},[w,s,V,D,q,b,N]);return{handleSaveSelectedProjectDetails:x,handleSelectedProjectDescriptionBlur:I,handleSelectedProjectColorSelect:K}}function Bx({notificationMenuOpen:o,setNotificationMenuOpen:i,accountMenuOpen:c,setAccountMenuOpen:s,tasks:d,documents:w,visibleWorkspaceProjects:f,setSelectedProjectId:T,setSelectedNoteProjectId:C,setSelectedTaskId:g,setSelectedDocumentId:y,setActiveSection:q,openDocumentFromNotification:F,resolveProjectMainPanelSection:re,navigateToProfile:Y,showToast:H}){const $=r.useCallback(async D=>{if(i(!1),s(!1),D.entityType==="task"){const N=d.find(x=>x.id===D.entityId);if(!N){H({type:"error",message:"This task is no longer available."});return}T(N.projectId),C(N.projectId),g(N.id),y(""),q("tasks");return}if(D.entityType==="project"){if(!f.some(N=>N.id===D.entityId)){H({type:"error",message:"This project is no longer available."});return}T(D.entityId),C(D.entityId),g(""),y(""),q(re?re(D.entityId):"tasks");return}if(D.entityType==="document"){const N=w.find(I=>I.id===D.entityId);if(!N){if(await F(D))return;H({type:"error",message:"This document is no longer available."});return}const x=N.projectId&&f.some(I=>I.id===N.projectId)?N.projectId:"all";T(x),C(N.projectId||""),g(""),y(N.id),q("notes");return}y(""),q("home")},[i,s,d,w,H,T,C,g,y,q,F,re,f]),de=r.useCallback(()=>{const D=!o;i(D),D&&s(!1)},[o,s,i]),V=r.useCallback(()=>{const D=!c;s(D),D&&i(!1)},[c,s,i]),b=r.useCallback(()=>{s(!1),Y()},[Y,s]);return{handleNotificationClick:$,handleToggleNotificationMenu:de,handleToggleAccountMenu:V,handleOpenAccountSettings:b}}function qx({setActionMenuProjectId:o,setActionMenuPosition:i,setProjectAccessDialogId:c,setSelectedProjectId:s,setSelectedNoteProjectId:d,setSelectedDocumentId:w,setSelectedMoodBoardId:f,setActiveSection:T,setSelectedTaskId:C,setExpandedProjectIds:g,setSidebarCollapsed:y,setProjectsGroupExpanded:q,resolveProjectMainPanelSection:F}){const re=r.useCallback((x,I)=>{const K=I.currentTarget.getBoundingClientRect(),he=window.innerWidth,_=window.innerHeight,B=196,E=236,X=8,we=Math.min(Math.max(K.left,X),Math.max(X,he-B-X)),L=K.bottom+4,v=L+E>_-X,M=K.top-E-4,z=v?Math.max(X,M):Math.min(L,Math.max(X,_-E-X));o(x),i({x:we,y:z})},[i,o]),Y=r.useCallback(()=>{o(null)},[o]),H=r.useCallback(x=>{c(x)},[c]),$=r.useCallback(x=>{s(x),d(x),w(""),f(""),T(F?F(x):"tasks"),C("")},[F,T,w,f,d,s,C]),de=r.useCallback(()=>{s("all"),d(""),w(""),f(""),T("dashboard"),C("")},[T,w,f,d,s,C]),V=r.useCallback(x=>{g(I=>I.includes(x)?I.filter(K=>K!==x):[...I,x])},[g]),b=r.useCallback(()=>{y(!1)},[y]),D=r.useCallback(()=>{y(!0)},[y]),N=r.useCallback(()=>{q(x=>!x)},[q]);return{handleProjectActionMenu:re,closeActionMenu:Y,openProjectSettingsDialog:H,handleSelectProject:$,openWorkspaceOverview:de,toggleProjectExpansion:V,handleExpandSidebar:b,handleCollapseSidebar:D,handleToggleProjectsGroup:N}}function vp(o){return[{id:`tab_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,title:"Main",body:o}]}function Vx({currentUserUid:o,selectedWorkspaceId:i,selectedProjectId:c,workspaceProjectById:s,setBusyKey:d,showToast:w,onDocumentCreated:f}){const[T,C]=r.useState(!1),[g,y]=r.useState(""),[q,F]=r.useState(""),[re,Y]=r.useState(""),H=r.useCallback((D="")=>{const N=D||(c!=="all"?c:""),x=s[N]?N:"";Y(x),y(""),F(""),C(!0)},[c,s]),$=r.useCallback(()=>{C(!1)},[]),de=r.useCallback(async()=>{if(!i||!o)return;const D=g.trim();if(!D){w({type:"error",message:"Document title is required."});return}const N=re?s[re]:null,x=N?.visibility||"workspace",I=x==="restricted"?ve(N?.memberUids?.length?N.memberUids:[o]):[],K=ve(I).filter(_=>_!==o),he=K.length>0?"selected":"all";d("document:create");try{const _=await Vl({workspaceId:i,projectId:N?.id||null,title:D,body:q,tabs:vp(q),visibility:x,memberUids:I,notifyMode:he,notifyUids:K,createdBy:o});await Ze({workspaceId:i,actorUid:o,entityType:"document",entityId:_,action:"create",message:`Created document ${D}`,visibility:x,memberUids:I}),f?.(_,N?.id||null),C(!1),y(""),F(""),Y(""),w({type:"success",message:"Document created."})}catch(_){const B=_ instanceof Error?_.message:"Could not create document.";w({type:"error",message:B})}finally{d("")}},[o,q,re,g,f,i,d,w,s]),V=r.useCallback(async(D="")=>{if(!i||!o)return;const N=D&&s[D]||null,x=N?.visibility||"workspace",I=x==="restricted"?ve(N?.memberUids?.length?N.memberUids:[o]):[],K=ve(I).filter(B=>B!==o),he=K.length>0?"selected":"all",_="New document";d("document:create");try{const B=await Vl({workspaceId:i,projectId:N?.id||null,title:_,body:"",tabs:vp(""),visibility:x,memberUids:I,notifyMode:he,notifyUids:K,createdBy:o});await Ze({workspaceId:i,actorUid:o,entityType:"document",entityId:B,action:"create",message:`Created document ${_}`,visibility:x,memberUids:I}),f?.(B,N?.id||null),w({type:"success",message:"Document created."})}catch(B){const E=B instanceof Error?B.message:"Could not create document.";w({type:"error",message:E})}finally{d("")}},[o,f,i,d,w,s]),b=r.useCallback(async(D="")=>{if(!i||!o)return;const N=D&&s[D]||null,x=N?.visibility||"workspace",I=x==="restricted"?ve(N?.memberUids?.length?N.memberUids:[o]):[],K=ve(I).filter(X=>X!==o),he=K.length>0?"selected":"all",E=`Note – ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}`;d("note:create");try{const X=await Vl({workspaceId:i,projectId:N?.id||null,type:"note",title:E,body:"",visibility:x,memberUids:I,notifyMode:he,notifyUids:K,createdBy:o});f?.(X,N?.id||null)}catch(X){const we=X instanceof Error?X.message:"Could not create note.";w({type:"error",message:we})}finally{d("")}},[o,f,i,d,w,s]);return{documentDialogOpen:T,documentTitleDraft:g,setDocumentTitleDraft:y,documentBodyDraft:q,setDocumentBodyDraft:F,documentProjectIdDraft:re,setDocumentProjectIdDraft:Y,openDocumentCreateDialog:H,closeDocumentCreateDialog:$,handleCreateDocument:de,createDocumentQuick:V,createNoteQuick:b}}function Hx(o){const i=r.useMemo(()=>Hw(o),[o]),c=r.useMemo(()=>Kw(i),[i]);return{selectedTemplate:i,templates:Gw,initialTaskStatuses:c}}const Kx=[{value:"not_started",label:"Not started"},{value:"in_progress",label:"In progress"},{value:"at_risk",label:"At risk"},{value:"completed",label:"Completed"}],Jl=["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#64748b"];function Gx({open:o,milestone:i,project:c,onSave:s,onClose:d}){const[w,f]=r.useState(""),[T,C]=r.useState(""),[g,y]=r.useState(""),[q,F]=r.useState("not_started"),[re,Y]=r.useState(Jl[0]),[H,$]=r.useState(""),[de,V]=r.useState("");if(r.useEffect(()=>{o&&(f(i?.name??""),C(i?.description??""),y(i?.dueDate??""),F(i?.status??"not_started"),Y(i?.color||c?.color||Jl[0]),$(""),V(""))},[o,i,c]),!o)return null;function b(){let N=!0;return w.trim()?$(""):($("Name is required"),N=!1),g&&c?.projectStartDate&&g<c.projectStartDate?(V("Due date cannot be before the project start date"),N=!1):V(""),N}function D(N){N.preventDefault(),b()&&s({name:w.trim(),description:T.trim(),dueDate:g,status:q,color:re})}return e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:N=>{N.target===N.currentTarget&&d()},children:e.jsxs("div",{className:"workhub-modal workhub-milestone-dialog",onMouseDown:N=>N.stopPropagation(),style:{maxWidth:440,width:"100%"},children:[e.jsxs("div",{className:"workhub-modal-header",children:[e.jsx("h2",{className:"workhub-modal-title",children:i?"Edit milestone":"New milestone"}),e.jsx("button",{type:"button",className:"workhub-modal-close",onClick:d,"aria-label":"Close",children:"✕"})]}),e.jsxs("form",{onSubmit:D,className:"workhub-modal-body",noValidate:!0,children:[e.jsxs("div",{className:"workhub-form-field",children:[e.jsx("label",{className:"workhub-field-label",children:"Name *"}),e.jsx("input",{className:`workhub-input${H?" is-error":""}`,type:"text",value:w,onChange:N=>f(N.target.value),placeholder:"e.g. Phase 1 delivery",autoFocus:!0}),H&&e.jsx("span",{className:"workhub-field-error",children:H})]}),e.jsxs("div",{className:"workhub-form-field",children:[e.jsx("label",{className:"workhub-field-label",children:"Description"}),e.jsx("textarea",{className:"workhub-input workhub-textarea",value:T,onChange:N=>C(N.target.value),placeholder:"Optional description or acceptance criteria",rows:3})]}),e.jsxs("div",{className:"workhub-form-row-2col",children:[e.jsxs("div",{className:"workhub-form-field",children:[e.jsx("label",{className:"workhub-field-label",children:"Due date"}),e.jsx("input",{className:`workhub-input${de?" is-error":""}`,type:"date",value:g,onChange:N=>y(N.target.value)}),de&&e.jsx("span",{className:"workhub-field-error",children:de})]}),e.jsxs("div",{className:"workhub-form-field",children:[e.jsx("label",{className:"workhub-field-label",children:"Status"}),e.jsx("select",{className:"workhub-input workhub-select",value:q,onChange:N=>F(N.target.value),children:Kx.map(N=>e.jsx("option",{value:N.value,children:N.label},N.value))})]})]}),e.jsxs("div",{className:"workhub-form-field",children:[e.jsx("label",{className:"workhub-field-label",children:"Color"}),e.jsx("div",{className:"workhub-milestone-color-row",children:Jl.map(N=>e.jsx("button",{type:"button",className:`workhub-milestone-color-swatch${re===N?" is-active":""}`,style:{background:N},onClick:()=>Y(N),"aria-label":N},N))})]}),e.jsxs("div",{className:"workhub-modal-actions",children:[e.jsx("button",{type:"button",className:"workhub-btn workhub-btn-ghost",onClick:d,children:"Cancel"}),e.jsx("button",{type:"submit",className:"workhub-btn workhub-btn-primary",children:i?"Save changes":"Create milestone"})]})]})]})})}function Yx({projectId:o,workspaceId:i,tasks:c,currentUserUid:s,showToast:d}){const[w,f]=r.useState([]),[T,C]=r.useState(!1),[g,y]=r.useState(null);r.useEffect(()=>{if(!o){f([]);return}return lw(o,f)},[o]);const q=r.useMemo(()=>{const x={};return w.forEach(I=>{x[I.id]={total:0,completed:0,pct:0}}),c.forEach(I=>{if(!I.milestoneId||!x[I.milestoneId])return;x[I.milestoneId].total+=1;const K=(I.status||"").toLowerCase();(K==="completed"||K==="complete"||K==="done"||K==="closed")&&(x[I.milestoneId].completed+=1)}),Object.keys(x).forEach(I=>{const K=x[I];K.pct=K.total===0?0:Math.round(K.completed/K.total*100)}),x},[w,c]),F=new Date;F.setHours(0,0,0,0);const re=r.useMemo(()=>{const x=new Date(F);return x.setDate(x.getDate()+7),w.filter(I=>{if(I.status==="completed"||!I.dueDate)return!1;const K=new Date(I.dueDate);return K>=F&&K<=x})},[w]),Y=r.useMemo(()=>{const x=new Date(F);return x.setDate(x.getDate()+3),w.filter(I=>{if(I.status==="completed"||!I.dueDate)return!1;const K=new Date(I.dueDate),he=q[I.id],_=K<=x,B=!he||he.pct<50;return _&&B})},[w,q]),H=r.useCallback(()=>{y(null),C(!0)},[]),$=r.useCallback(x=>{y(x),C(!0)},[]),de=r.useCallback(()=>{C(!1),y(null)},[]),V=r.useCallback(async x=>{if(!(!o||!s))try{if(g)await lp(g.id,{name:x.name.trim(),description:x.description.trim(),dueDate:x.dueDate,status:x.status,color:x.color}),d({message:"Milestone updated",type:"success"});else{const I=w.length>0?Math.max(...w.map(K=>K.sortOrder??0))+1:0;await cw({workspaceId:i,projectId:o,name:x.name.trim(),description:x.description.trim(),dueDate:x.dueDate,status:x.status,color:x.color,sortOrder:I,createdBy:s}),d({message:"Milestone created",type:"success"})}C(!1),y(null)}catch{d({message:"Failed to save milestone",type:"error"})}},[o,i,s,g,w,d]),b=r.useCallback(async x=>{try{await dw(x);const I=c.filter(K=>K.milestoneId===x);await Promise.all(I.map(K=>ci(K.id,{milestoneId:null}))),d({message:"Milestone deleted",type:"success"})}catch{d({message:"Failed to delete milestone",type:"error"})}},[c,d]),D=r.useCallback(async(x,I)=>{try{await ci(x,{milestoneId:I})}catch{d({message:"Failed to update task milestone",type:"error"})}},[d]),N=r.useCallback(async(x,I)=>{try{await lp(x,{status:I})}catch{d({message:"Failed to update milestone status",type:"error"})}},[d]);return{milestones:w,milestoneDialogOpen:T,editingMilestone:g,milestoneProgress:q,upcomingMilestones:re,atRiskMilestones:Y,handleOpenCreateMilestone:H,handleOpenEditMilestone:$,handleCloseMilestoneDialog:de,handleSaveMilestone:V,handleDeleteMilestone:b,handleLinkTaskToMilestone:D,handleStatusChange:N}}let pc="";const bc=new Set;function jp(){return pc}function Xx(o){const i=o||"";i!==pc&&(pc=i,bc.forEach(c=>c()))}function Qx(o){return bc.add(o),()=>{bc.delete(o)}}const gr="tooryanart@gmail.com",Yo=767,Jx=Yo+1,ei=6,Cp=80,Zx=r.lazy(async()=>({default:(await Jo(()=>import("./WorkhubNotesSection-CsgWqYPa.js"),__vite__mapDeps([0,1,2,3,4,5,6,7]))).WorkhubNotesSection})),e0=r.lazy(async()=>({default:(await Jo(()=>import("./WorkhubMoodboardSection-cZkiDe0o.js"),__vite__mapDeps([8,1,2,3,4,9,10,11,12,5,6,7]))).WorkhubMoodboardSection})),t0=r.lazy(async()=>({default:(await Jo(()=>import("./WorkhubTasksSection-CsN2kkWl.js"),__vite__mapDeps([13,1,2,3,4,14,9,10,11,12,15,5,6,7,16,17]))).WorkhubTasksSection})),o0=r.lazy(async()=>({default:(await Jo(()=>import("./WorkhubProjectDetailRail-DlDP0AEP.js"),__vite__mapDeps([15,1]))).WorkhubProjectDetailRail})),r0=r.lazy(async()=>({default:(await Jo(()=>import("./WorkhubUsersSection-B6_wnIdh.js"),__vite__mapDeps([18,1,2,3,4]))).WorkhubUsersSection})),a0=r.lazy(async()=>({default:(await Jo(()=>import("./WorkhubClientsSection-6jgJBasE.js"),__vite__mapDeps([19,1,2,3,4]))).WorkhubClientsSection})),i0=r.lazy(async()=>({default:(await Jo(()=>import("./WorkhubHomeSection-BEnwhG6I.js"),__vite__mapDeps([20,1]))).WorkhubHomeSection})),n0=r.lazy(async()=>({default:(await Jo(()=>import("./workhub-doc-editor-DcJvShmF.js").then(i=>i.c),__vite__mapDeps([5,1,2,3,4,6,7]))).WorkhubDiscussionCard})),Zl={enabled:!1,taskCreated:!1,taskCompleted:!0,folderCompleted:!0,delivery:"in_app"};function ec(o){return{enabled:!!o?.enabled,taskCreated:!!o?.taskCreated,taskCompleted:!!o?.taskCompleted,folderCompleted:!!o?.folderCompleted,delivery:o?.delivery==="both"?"both":"in_app"}}function Np(o){return o?.referenceSourceDocumentId?"🔗":o?.hasOutgoingReferences?"🌐":(o?.icon||"").trim()||(o?.type==="note"?"🗒️":"📝")}function Xo(){const o=new Date,i=o.getTimezoneOffset()*6e4;return new Date(o.getTime()-i).toISOString().slice(0,10)}function Op(o,i="#ffffff"){if(typeof o!="string"||!o.trim())return i;const c=o.trim(),s=c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);if(s){if(s[1].length===6)return c;const[C,g,y]=s[1].split("");return`#${C}${C}${g}${g}${y}${y}`}const d=c.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i);if(!d)return i;const[w,f,T]=d.slice(1,4).map(C=>{const g=Number(C);return Math.max(0,Math.min(255,Number.isFinite(g)?g:0))});return`#${[w,f,T].map(C=>C.toString(16).padStart(2,"0")).join("")}`}function s0(o,i){if(typeof o!="string")return i;const c=o.trim().match(/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*([0-9]*\.?[0-9]+)\s*\)$/i);if(!c)return i;const s=Number(c[1]);return Number.isFinite(s)?Math.max(0,Math.min(1,s)):i}function l0(o,i){const s=Op(o,"#ffffff").slice(1),d=Number.parseInt(s.slice(0,2),16),w=Number.parseInt(s.slice(2,4),16),f=Number.parseInt(s.slice(4,6),16);return`rgba(${d}, ${w}, ${f}, ${i})`}function ti(o,i){const c=o.trim();if(!c)return"";const s=Date.parse(`${c}T00:00:00`);if(!Number.isFinite(s))return"";const d=new Date(s);d.setDate(d.getDate()+i);const w=d.getTimezoneOffset()*6e4;return new Date(d.getTime()-w).toISOString().slice(0,10)}function c0(o){return Wt(o).template.workspaceType}function d0(o){switch(o){case"marketing_campaign":return"Campaign end date cannot be earlier than launch date.";case"marketing_content_stream":return"Target date cannot be earlier than content stream start date.";case"hr_onboarding_track":return"Completion target cannot be earlier than onboarding start date.";default:return"Deadline cannot be earlier than start date."}}function u0(o,i){switch(o){case"proposal":return"Submission date";case"lead":return"Expected close date";case"finance_invoice_stream":return"First due date";case"finance_payment_cycle":return"Disbursement date";case"marketing_campaign":return"Campaign end date";case"marketing_content_stream":return"Target date";case"hr_requisition":return"Target hire date";case"hr_onboarding_track":return"Completion target";default:return i==="tender"?"Submission date":"Final submission deadline"}}function h0(o){return o==="dashboard"||o==="dashboard_with_details"?"dashboard":"tasks"}const p0=new Set(["proposal","lead","finance_invoice_stream","finance_payment_cycle","marketing_campaign","marketing_content_stream"]);function zo(o){const i=(o||"").trim().toUpperCase().replace(/[^A-Z]/g,"");return((i==="USD"?"OMR":i)||"OMR").slice(0,3)}function tc(o){const i=o.trim();if(!i)return 0;const c=Number(i);return!Number.isFinite(c)||c<0?null:Math.round(c*100)/100}function b0(o){const i=o.replace(/,/g,"").match(/-?\d+(?:\.\d+)?/);if(!i)return 0;const c=Number(i[0]);return!Number.isFinite(c)||c<=0?0:Math.round(c*100)/100}function Go(o){if(typeof o.valueAmount=="number"&&Number.isFinite(o.valueAmount)&&o.valueAmount>0)return Math.round(o.valueAmount*100)/100;const i=(o.description||"").split(`
`);for(const c of i){const s=c.indexOf(":");if(s<=0)continue;const d=c.slice(0,s).trim().toLowerCase();if(!/(estimated value|potential value|value|budget|amount|invoice value|payment value)/.test(d))continue;const w=b0(c.slice(s+1));if(w>0)return w}return 0}function An(o){if((o.valueCurrency||"").trim())return zo(o.valueCurrency);const c=(o.description||"").toUpperCase().match(/\b[A-Z]{3}\b/);return zo(c?c[0]:"OMR")}function oi(o,i,c){c<=0||(o[i]=Math.round(((o[i]||0)+c)*100)/100)}function oc(o){const i=o.trim(),c={Proposal:"Proposals",Lead:"Leads",Folder:"Folders",Project:"Projects",Campaign:"Campaigns",Requisition:"Requisitions","Content stream":"Content streams","Invoice stream":"Invoice streams","Payment cycle":"Payment cycles","Onboarding track":"Onboarding tracks"};return c[i]?c[i]:i.endsWith("s")?i:`${i}s`}function f0(o){switch(o){case"proposals_leads":return"Lead & proposal categories";case"finance":return"Finance categories";case"marketing":return"Campaign categories";case"hr":return"HR categories";case"projects":return"Project categories";default:return"Top-level categories"}}function Rp(o,i){try{return new Intl.NumberFormat("en-US",{style:"currency",currency:i,maximumFractionDigits:2}).format(o)}catch{return`${i} ${o.toLocaleString()}`}}function ri(o){const i=Object.entries(o).filter(([,c])=>c>0);return i.length===0?"0":i.sort(([c],[s])=>c.localeCompare(s)).map(([c,s])=>Rp(s,c)).join(" + ")}function m0(o){return p0.has(o)}function g0(o){switch(o){case"proposal":return"Proposal value";case"lead":return"Lead value";case"finance_invoice_stream":return"Invoice stream value";case"finance_payment_cycle":return"Payment cycle value";case"marketing_campaign":return"Campaign budget value";case"marketing_content_stream":return"Content budget value";default:return"Value amount"}}function Sp(o){const i={name:"",description:"",clientId:"",tenderNumber:"",proposalId:"",startDate:"",deadline:Xo(),submissionTime:Qt,priority:"medium",leadSource:"",qualificationNotes:"",billingCycle:"",paymentOwner:"",campaignChannel:"",campaignObjective:"",cadence:"",department:"",hiringManager:"",onboardingOwner:"",budgetAmount:""},c=Bt(o);return{...i,priority:c.defaults.priority,billingCycle:c.defaults.billingCycle||""}}function k0(o,i){const c=[];switch(i.description.trim()&&c.push(i.description.trim()),o){case"proposal":i.tenderNumber.trim()&&c.push(`Tender number: ${i.tenderNumber.trim()}`),i.proposalId.trim()&&c.push(`Proposal ID: ${i.proposalId.trim()}`),i.budgetAmount.trim()&&c.push(`Estimated value: ${i.budgetAmount.trim()}`);break;case"lead":i.leadSource.trim()&&c.push(`Lead source: ${i.leadSource.trim()}`),i.qualificationNotes.trim()&&c.push(`Qualification notes: ${i.qualificationNotes.trim()}`);break;case"finance_invoice_stream":i.billingCycle.trim()&&c.push(`Billing cycle: ${i.billingCycle.trim()}`),i.paymentOwner.trim()&&c.push(`Approval owner: ${i.paymentOwner.trim()}`);break;case"finance_payment_cycle":i.paymentOwner.trim()&&c.push(`Payment owner: ${i.paymentOwner.trim()}`);break;case"marketing_campaign":i.campaignObjective.trim()&&c.push(`Campaign objective: ${i.campaignObjective.trim()}`),i.campaignChannel.trim()&&c.push(`Primary channel: ${i.campaignChannel.trim()}`);break;case"marketing_content_stream":i.campaignChannel.trim()&&c.push(`Channel: ${i.campaignChannel.trim()}`),i.cadence.trim()&&c.push(`Cadence: ${i.cadence.trim()}`);break;case"hr_requisition":i.department.trim()&&c.push(`Department: ${i.department.trim()}`),i.hiringManager.trim()&&c.push(`Hiring manager: ${i.hiringManager.trim()}`);break;case"hr_onboarding_track":i.onboardingOwner.trim()&&c.push(`Onboarding owner: ${i.onboardingOwner.trim()}`);break}return c.join(`
`)}const _p=new Set(["home","users","tasks","notes","dashboard","clients"]),Dp=new Set([..._p,"moodboard"]);function yr(o){return _p.has(o)}function w0(o){const i=o.replace(/^\/workhub\/?/,"").split("/").filter(Boolean);let c="",s="all",d="",w="";if(i[0]&&(c=decodeURIComponent(i[0])),i[1]){const f=decodeURIComponent(i[1]);if(Dp.has(f))d=f,i[2]&&(w=decodeURIComponent(i[2]));else if(s=f,i[2]){const T=decodeURIComponent(i[2]);Dp.has(T)&&(d=T,i[3]&&(w=decodeURIComponent(i[3])))}}return{wsId:c,projId:s,section:d,entityId:w}}function wr(o,i=""){const c=o.replace(/^\/workhub\/?/,"").split("/").filter(Boolean),d=(new URLSearchParams(i).get("p")||"").trim(),w=d&&d!=="all"?d:"all";if(c[0]==="u"||c[0]==="users")return{source:"legacy",kind:"workspace",wsId:decodeURIComponent(c[1]||""),projId:w,section:"users",entityId:""};if(c.length===0)return{source:"canonical",kind:"root",wsId:"",projId:"all",section:"",entityId:""};if(c[0]==="w"){const C=decodeURIComponent(c[1]||"");if(!C)return{source:"canonical",kind:"root",wsId:"",projId:"all",section:"",entityId:""};const g=decodeURIComponent(c[2]||""),y=decodeURIComponent(c[3]||"");if(!g)return{source:"canonical",kind:"workspace",wsId:C,projId:w,section:"dashboard",entityId:""};if(g==="s"){const q=yr(y)?y:"dashboard";return{source:"canonical",kind:"workspace",wsId:C,projId:w,section:q,entityId:""}}return g==="p"&&y?{source:"canonical",kind:"project",wsId:C,projId:y,section:"",entityId:""}:g==="d"&&y?{source:"canonical",kind:"document",wsId:C,projId:w,section:"notes",entityId:y}:g==="m"&&y?{source:"canonical",kind:"moodboard",wsId:C,projId:w,section:"moodboard",entityId:y}:g==="t"&&y?{source:"canonical",kind:"task",wsId:C,projId:w,section:"tasks",entityId:y}:{source:"canonical",kind:"workspace",wsId:C,projId:w,section:"dashboard",entityId:""}}const f=w0(o);if(!f.wsId)return{source:"legacy",kind:"root",wsId:"",projId:"all",section:"",entityId:""};if(f.section==="notes"&&f.entityId)return{source:"legacy",kind:"document",wsId:f.wsId,projId:"all",section:"notes",entityId:f.entityId};if(f.section==="moodboard"&&f.entityId)return{source:"legacy",kind:"moodboard",wsId:f.wsId,projId:"all",section:"moodboard",entityId:f.entityId};if(f.section==="tasks"&&f.entityId)return{source:"legacy",kind:"task",wsId:f.wsId,projId:"all",section:"tasks",entityId:f.entityId};if(f.projId&&f.projId!=="all"&&(!f.section||f.section==="tasks"||f.section==="dashboard"))return{source:"legacy",kind:"project",wsId:f.wsId,projId:f.projId,section:"",entityId:""};if(f.section==="moodboard"&&!f.entityId)return{source:"legacy",kind:"workspace",wsId:f.wsId,projId:f.projId||"all",section:"dashboard",entityId:""};const T=yr(f.section)?f.section:"dashboard";return{source:"legacy",kind:"workspace",wsId:f.wsId,projId:f.projId||"all",section:T,entityId:""}}function x0(o){return!o||o==="all"?"":`?${new URLSearchParams({p:o}).toString()}`}function rc(o){return`?${new URLSearchParams({p:o&&o!=="all"?o:"all"}).toString()}`}function To(o,i,c,s=""){if(!o)return"/workhub";const d=encodeURIComponent(o),w=i&&i!=="all"?encodeURIComponent(i):"",f=s?encodeURIComponent(s):"",T=yr(c)?c:"dashboard";if(T==="notes"&&f)return`/workhub/w/${d}/d/${f}${rc(i)}`;if(c==="moodboard"&&f)return`/workhub/w/${d}/m/${f}${rc(i)}`;if(T==="tasks"&&f)return`/workhub/w/${d}/t/${f}${rc(i)}`;if((T==="tasks"||T==="dashboard")&&w)return`/workhub/w/${d}/p/${w}`;const C=x0(i);return T==="users"?`/workhub/u/${d}${C}`:T==="dashboard"?`/workhub/w/${d}${C}`:`/workhub/w/${d}/s/${T}${C}`}function En(o){return o==="flow"?"flow":"v2"}function li(o){const i=o.trim(),[c="",...s]=i.split("?");return{pathname:c,search:s.length?`?${s.join("?")}`:""}}function ac(o){if(!o)return{};try{const i=localStorage.getItem(o);if(!i)return{};const c=JSON.parse(i);return!c||typeof c!="object"||Array.isArray(c)?{}:Object.fromEntries(Object.entries(c).filter(([s,d])=>s&&typeof d=="string").map(([s,d])=>[s,d.trim()]))}catch{return{}}}function Mp(o,i){if(o){if(Object.keys(i).length===0){localStorage.removeItem(o);return}localStorage.setItem(o,JSON.stringify(i))}}function ic(o){const{pathname:i,search:c}=li(o);if(!i.startsWith("/workhub"))return"";const s=wr(i,c);return s.wsId?To(s.wsId,s.projId,s.section,s.entityId):""}function xr(o){return o.trim().toLowerCase().replace(/\s+/g," ")}function Tp(o){const i=xr(o);return i==="submitted proposals"||i.includes("submitted")&&i.includes("proposal")}function Mo(o){if(!o)return 0;if(typeof o=="object"&&o!==null&&"toMillis"in o&&typeof o.toMillis=="function")return o.toMillis();if(typeof o=="object"&&o!==null&&"seconds"in o){const i=Number(o.seconds||0),c=Number(o.nanoseconds||0);return i*1e3+Math.floor(c/1e6)}if(typeof o=="string"){const i=Date.parse(o);return Number.isFinite(i)?i:0}return 0}function y0(){const o=tw(),i=ow(),c=rw(),{showToast:s}=Zk(),d=r.useRef(o);d.current=o;const[w]=r.useState(()=>wr(i.pathname,i.search)),[f,T]=r.useState(""),[C,g]=r.useState(""),[y,q]=r.useState(null),[F,re]=r.useState(!0),[Y,H]=r.useState(!1),[$,de]=r.useState([]),[V,b]=r.useState([]),[D,N]=r.useState([]),[x,I]=r.useState([]),[K,he]=r.useState([]),[_,B]=r.useState([]),[E,X]=r.useState([]),[we,L]=r.useState([]),[v,M]=r.useState(!1),[z,te]=r.useState(!1),[R,se]=r.useState(!1),[fe,Z]=r.useState([]),[ye,je]=r.useState(ei),[Ie,ee]=r.useState(!1),[u,W]=r.useState(()=>w.wsId||""),[O,pe]=r.useState(()=>w.projId||"all"),[Le,Fe]=r.useState("all"),Oe=r.useSyncExternalStore(Qx,jp),be=r.useCallback(t=>{const a=jp(),n=typeof t=="function"?t(a):t||"";n!==a&&Xx(n)},[]),[Re,Ce]=r.useState(""),[k,ge]=r.useState(()=>w.kind==="document"?w.entityId:""),[ne,$e]=r.useState(null),[ie,p]=r.useState(()=>w.kind==="document"?"notes":w.kind==="moodboard"?"moodboard":w.kind==="task"?"tasks":w.kind==="root"?"home":w.kind==="workspace"&&w.section&&yr(w.section)?w.section:"dashboard"),[A,G]=r.useState("tabs"),[ue,ke]=r.useState(!1),[Ae,Ye]=r.useState("v2"),[Ge,qe]=r.useState(()=>yr(w.section)?w.section:"dashboard"),[mc,_n]=r.useState(0),[Wn,Fn]=r.useState(""),[Wp,Gr]=r.useState(!1),[Fp,Bn]=r.useState("project"),[Bp,gc]=r.useState(!1),[Zt,kc]=r.useState(null),[wc,xc]=r.useState(Sp("project")),[qp,yc]=r.useState(""),[Vp,qn]=r.useState(!1),[Hp,Kp]=r.useState(!1),[vc,bi]=r.useState(""),[fi,vr]=r.useState(""),[mi,jc]=r.useState(""),[Cc,Vn]=r.useState(""),[Hn,gi]=r.useState(""),[Nc,Kn]=r.useState(""),[ki,Sc]=r.useState(""),[Dc,Mc]=r.useState(""),[Tc,Ic]=r.useState(pp),[wi,zc]=r.useState(""),[Pc,$c]=r.useState(""),[Ac,Ec]=r.useState("counts"),[Uc,Lc]=r.useState("remaining"),[Oc,Rc]=r.useState(30),[_c,Wc]=r.useState(!0),[Fc,Bc]=r.useState(!0),[Gn,xi]=r.useState([]),[Yn,qc]=r.useState([]),[Vc,Hc]=r.useState({}),[Xn,Kc]=r.useState([]),[Gc,Qn]=r.useState(""),[Yc,Xc]=r.useState(""),[Qc,Jc]=r.useState(""),[Zc,ed]=r.useState(!1),[Jn,td]=r.useState(""),[od,Zn]=r.useState(""),[rd,ad]=r.useState(""),[es,ts]=r.useState(Do[0]),[id,os]=r.useState(""),[nd,rs]=r.useState(Xo()),[yi,Yr]=r.useState(Qt),[as,is]=r.useState("tender"),[sd,ns]=r.useState("medium"),[ld,ss]=r.useState(""),[cd,Gp]=r.useState(!0),[jr,dd]=r.useState("workspace"),[ud,Yp]=r.useState("firebase"),[Cr,ls]=r.useState([]),[hd,pd]=r.useState(""),[bd,fd]=r.useState(""),[Ao,Xr]=r.useState("backlog"),[md,gd]=r.useState("medium"),[eo,Nr]=r.useState(""),[kd,cs]=r.useState(Xo()),[wd,vi]=r.useState(()=>ti(Xo(),1)),[ht,Qr]=r.useState("all"),[ds,Xp]=r.useState([]),[xd,yd]=r.useState({}),[Qp,vd]=r.useState(!1),[jd,Jp]=r.useState(!1),[Cd,Zp]=r.useState(!1),[Nd,eb]=r.useState("all"),[Jr,us]=r.useState(!1),[ji,dt]=r.useState(!1),[tb,Sd]=r.useState(!1),[st,Zr]=r.useState([]),[Zo,er]=r.useState(""),[ea,Ci]=r.useState(""),[ta,tr]=r.useState(""),[fo,hs]=r.useState("all"),[or,Ni]=r.useState([]),[Dd,ob]=r.useState(""),[We,le]=r.useState(""),[Sr,Eo]=r.useState(null),[Md,Si]=r.useState(""),[Td,Di]=r.useState(""),[Id,Dr]=r.useState(""),[rb,Mr]=r.useState(!1),[zd,ps]=r.useState(!1),[Mi,Pd]=r.useState("workspace"),[Ti,$d]=r.useState([]),[Uo,Tt]=r.useState([]),[Ad,jt]=r.useState(!0),[Ct,Ed]=r.useState(""),[Ud,Ld]=r.useState(""),[oa,Od]=r.useState(Do[0]),[Tr,bs]=r.useState(""),[fs,Rd]=r.useState(""),[Ir,Ii]=r.useState(Qt),[$t,_d]=r.useState("other"),[Wd,Fd]=r.useState("medium"),[Bd,qd]=r.useState(""),[Vd,Hd]=r.useState("OMR"),[Kd,Gd]=r.useState(null),[Yd,Xd]=r.useState(""),[Qd,Jd]=r.useState(""),[Zd,eu]=r.useState(""),[tu,ou]=r.useState(""),[ra,ru]=r.useState("tasks"),[aa,ms]=r.useState("inherit"),[au,iu]=r.useState(""),[zi,ia]=r.useState(Zl),[ab,nu]=r.useState(!1),[su,lu]=r.useState("firebase"),[pt,na]=r.useState(""),[Lo,cu]=r.useState(""),[ib,nb]=r.useState(null),[Pi,sb]=r.useState("all"),[sa,lb]=r.useState({}),[du,uu]=r.useState({}),[gs,ks]=r.useState(""),[ws,xs]=r.useState(""),[la,ys]=r.useState(""),[vs,js]=r.useState(""),[Cs,Ns]=r.useState(""),[Ss,Ds]=r.useState(""),[Ms,Ts]=r.useState(""),[Is,$i]=r.useState(""),[zs,Ps]=r.useState(""),[Ai,cb]=r.useState(null),[db,ub]=r.useState({x:0,y:0}),[ot,hu]=r.useState([]),[zr,$s]=r.useState(!1),[bt,He]=r.useState(()=>w.kind==="moodboard"?w.entityId:""),[hb,pb]=r.useState(""),[bb,fb]=r.useState(null),[mb,gb]=r.useState(""),[,qt]=r.useState(!1),[Pr,Nt]=r.useState(!1),[As,kb]=r.useState(()=>{const t=localStorage.getItem("workhub:treePanelWidth"),a=t?parseInt(t,10):0;return a>=200&&a<=600?a:280}),Oo=r.useRef(null),Es=r.useRef(null),[Xe,wb]=r.useState(()=>typeof window>"u"?!1:window.matchMedia(`(max-width: ${Yo}px)`).matches),[xb,yb]=r.useState(!1),[rr,ca]=r.useState(!1),[pu,bu]=r.useState(!1),Ei=r.useRef(null),At=r.useCallback(()=>{bu(!0),Ei.current&&clearTimeout(Ei.current),Ei.current=setTimeout(()=>{ca(!1),bu(!1),Ei.current=null},300)},[]),[fu,mu]=r.useState([]),[vb,jb]=r.useState([]),[Us,Ui]=r.useState({}),[Cb,Nb]=r.useState({}),[gu,ku]=r.useState({}),[wu,xu]=r.useState({}),[Sb,Db]=r.useState({}),[Mb,Tb]=r.useState({}),[yu,vu]=r.useState({}),[ju,Cu]=r.useState({}),[Nu,Ib]=r.useState({}),[zb,Pb]=r.useState(""),[Su,$b]=r.useState({}),[Du,Mu]=r.useState({}),[Tu,Iu]=r.useState({}),[Ab,Eb]=r.useState(""),[Ub,zu]=r.useState(""),[Lb,Ob]=r.useState(null),[Li,Ls]=r.useState(""),[Rb,Os]=r.useState(""),[Pu,Rs]=r.useState(""),[$u,_s]=r.useState({}),[da,Ws]=r.useState(Do[0]),[Oi,Fs]=r.useState(""),[ua,Bs]=r.useState(""),[Ro,ha]=r.useState(""),[Au,Eu]=r.useState(""),[ar,qs]=r.useState("other"),[Ri,Vs]=r.useState(""),[_i,Hs]=r.useState("OMR"),[Ks,pa]=r.useState(""),[Gs,Wi]=r.useState(""),[ba,Fi]=r.useState([]),[_b,Bi]=r.useState(""),[Wb,Uu]=r.useState(!1),[Fb,fa]=r.useState(!1),[Ys,$r]=r.useState(!1),[Bb,Xs]=r.useState(null),[Lu,qi]=r.useState(""),[qb,Vi]=r.useState(null),[Vb,Hi]=r.useState(null),[Hb,Ki]=r.useState(null),[Qs,Ar]=r.useState(""),[Kb,mo]=r.useState(""),[Gb,to]=r.useState(""),[Yb,oo]=r.useState(""),[Xb,_o]=r.useState(""),[Gi,ir]=r.useState(null),[Ou,ma]=r.useState([]),[Qb,Js]=r.useState(!1),[Jb,Ru]=r.useState(!1),[Zb,_u]=r.useState(!1),[ga,Zs]=r.useState({}),[ef,tf]=r.useState("thumbnail"),[of,rf]=r.useState(!0),[af,Wu]=r.useState(!1),[Er,nf]=r.useState(null),Fu=r.useRef(null),Bu=r.useRef(null),el=r.useRef(new Set),tl=r.useRef(new Set),me=r.useRef({dragTaskId:"",dragStatusId:"",dropTargetKey:"",editingTaskTitleText:"",editingChecklistItemText:"",taskChecklistDrafts:{},selectedTaskIdSet:new Set,selectedTaskCount:0,handleTaskUpdate:async()=>{},handleBulkStatusChange:async()=>{},handleTaskReorder:async()=>{},handleQuickAddTask:async()=>{},clearTaskSelection:()=>{},handleBulkDeleteSelected:async()=>{},handleDeleteSingleTask:async()=>{},handleQuickTaskViewModeChange:async()=>{},handleAddTaskComment:async()=>{},handleAddComment:async()=>{},handleStartCommentEdit:()=>{},handleCancelCommentEdit:()=>{},handleSaveCommentEdit:async()=>{},handleDeleteComment:async()=>{}});r.useEffect(()=>{const t=a=>{const n=a.target;n instanceof Element&&(n.closest(".workhub-task-status-btn, .workhub-task-status-menu, .workhub-priority-indicator, .workhub-task-priority-menu, .workhub-task-more-btn, .workhub-task-more-menu, .workhub-detail-icon-btn, .workhub-detail-icon-menu, .workhub-detail-assignee-picker, .workhub-detail-assignee-trigger, .workhub-detail-assignee-menu, .workhub-task-filter-btn, .workhub-task-filter-menu, .workhub-bulk-status-btn, .workhub-bulk-status-menu, .workhub-task-assignee-btn, .workhub-task-assignee-menu, .workhub-task-context-menu, .workhub-notify-btn, .workhub-notify-menu, .workhub-account-btn, .workhub-account-menu, .workhub-project-color-select-btn, .workhub-project-color-select-menu, .workhub-mobile-workspace-panel, .workhub-mobile-workspace-toggle, .workhub-mobile-footer, .workhub-mobile-footer-btn")||(to(""),oo(""),mo(""),_o(""),ir(null),vd(!1),Js(!1),zu(""),M(!1),te(!1),fa(!1),At(),n.closest(".workhub-gear-btn, .workhub-gear-menu")||dt(!1)))};return document.addEventListener("mousedown",t),()=>document.removeEventListener("mousedown",t)},[]),r.useEffect(()=>{try{const t=localStorage.getItem(yp);if(!t)return;const a=JSON.parse(t);a&&typeof a=="object"&&Zs(a)}catch{Zs({})}},[]),r.useEffect(()=>{localStorage.setItem(yp,JSON.stringify(ga))},[ga]),r.useEffect(()=>{const t=document.documentElement;return t.classList.add("workhub-font-compact"),t.classList.add("workhub-page-active"),()=>{t.classList.remove("workhub-font-compact"),t.classList.remove("workhub-page-active")}},[]),r.useEffect(()=>{if(!Xe)return;const t=[".workhub-task-sections",".workhub-mobile-tree-panel-body",".workhub-mobile-workspace-panel",".workhub-task-detail-rail.is-mobile-drawer.is-open",".workhub-task-detail-rail.is-mobile-drawer.is-open .workhub-detail-card",".workhub-main-stage",".workhub-summary-strip",".workhub-modal",".workhub-project-settings-body",".workhub-settings-tab-panel",".workhub-modal-form"].join(", "),a=n=>{const l=n.target;if(!l){n.preventDefault();return}l.closest(t)||n.preventDefault()};return document.addEventListener("touchmove",a,{passive:!1}),()=>{document.removeEventListener("touchmove",a)}},[Xe]),r.useEffect(()=>{if(!Xe||!rr||!ji){Sd(!1);return}const t=()=>{const a=Fu.current,n=Bu.current;if(!a||!n)return;const l=a.getBoundingClientRect(),h=Math.max(n.offsetHeight||0,92),m=window.innerHeight-l.bottom,S=l.top;Sd(m<h+8&&S>h+8)};return t(),window.addEventListener("resize",t),window.addEventListener("scroll",t,!0),()=>{window.removeEventListener("resize",t),window.removeEventListener("scroll",t,!0)}},[ji,Xe,rr]),r.useEffect(()=>{let t=null;const a=iw(J,n=>{if(t&&(t(),t=null),!n){q(null),re(!1),Mr(!1),ps(!1),d.current("/login",{replace:!0,state:{returnTo:"/workhub"}});return}re(!0),Mr(!1),ps(!1),T(n.email||""),g(n.displayName||n.email?.split("@")[0]||"Member"),t=uw(n.uid,l=>{q(l),re(!1)})});return()=>{t&&t(),a()}},[]),r.useEffect(()=>{if(!y||y.status!=="approved")return;const t=hw(de),a=pw(b);return()=>{t(),a()}},[y]),r.useEffect(()=>{if(!y||y.status!=="approved"){I([]);return}if(A!=="tabs")return;const t=J.currentUser?.uid||"",a=f===gr||y.role==="admin"||y.role==="manager";if(!u){I([]);return}return bw(u,t,a,I)},[y,u,f,A]),r.useEffect(()=>{if(!y||y.status!=="approved"){I([]);return}if(A!=="workspace_tree")return;const t=J.currentUser?.uid||"",a=f===gr||y.role==="admin"||y.role==="manager",n=V.filter(l=>Pn(l,t,f,a)).map(l=>l.id);if(!n.length){I([]);return}return fw(n,t,a,I)},[y,f,A,V]),r.useEffect(()=>{if(!y||y.status!=="approved"){B([]),X([]);return}const t=J.currentUser?.uid||"",a=f===gr||y.role==="admin"||y.role==="manager";if(!u){B([]),X([]);return}const n=mw(u,t,a,B),l=gw(u,t,a,X);return()=>{n(),l()}},[y,u,f]),r.useEffect(()=>{if(!y||y.status!=="approved"){N([]);return}if(A==="workspace_tree"){const t=J.currentUser?.uid||"",a=f===gr||y.role==="admin"||y.role==="manager",n=V.filter(l=>Pn(l,t,f,a)).map(l=>l.id);if(!n.length){N([]);return}return kw(n,N)}if(!u){N([]);return}return ww(u,N)},[y,u,f,A,V]),r.useEffect(()=>{const t=J.currentUser?.uid||"";if(!u||!t||!y||y.status!=="approved"){he([]);return}const a=f===gr||y.role==="admin"||y.role==="manager";return xw(u,t,a,he)},[y,u,f]),r.useEffect(()=>{if(!y||y.status!=="approved"){Z([]),ee(!1),je(ei),Ci(""),tr("");return}let t="",a="";if(ie==="notes"&&k?(t="document",a=K.find(h=>h.id===k)?.referenceSourceDocumentId||k):(ie==="tasks"||ie==="dashboard")&&O&&O!=="all"&&(t="project",a=O),!t||!a){Z([]),ee(!1),je(ei),Ci(""),tr("");return}const n=yw(t,a,Z,{maxCount:ye,onHasMore:ee});return()=>n()},[ie,ye,K,y,k,O]);const qu=r.useMemo(()=>{if(ie==="notes"&&k){const a=K.find(n=>n.id===k)?.referenceSourceDocumentId||k;return a?`document:${a}`:""}return(ie==="tasks"||ie==="dashboard")&&O&&O!=="all"?`project:${O}`:""},[ie,K,k,O]);r.useEffect(()=>{je(ei),ee(!1)},[qu]),r.useEffect(()=>{const t=J.currentUser?.uid||"";if(!t||!y||y.status!=="approved"){L([]);return}return vw(t,L)},[y]),r.useEffect(()=>{if(!u){hu([]),$s(!0);return}return $s(!1),jw(u,t=>{hu(t),$s(!0)})},[u]),r.useEffect(()=>{if(!y||y.status!=="approved")return;const t=Object.fromEntries(V.map(n=>[n.id,n])),a=x.map(n=>({item:n,workspaceIntentSet:new Set(ni(Wt(t[n.workspaceId]).templateId)),inferredIntent:Yw(n,t)})).filter(({item:n,workspaceIntentSet:l,inferredIntent:h})=>!n.intent||!l.has(n.intent)?h!==n.intent:!1).filter(({item:n})=>!tl.current.has(n.id));a.length&&(a.forEach(({item:n})=>tl.current.add(n.id)),Promise.all(a.map(async({item:n,inferredIntent:l})=>{try{await Jt(n.id,{intent:l})}catch(h){tl.current.delete(n.id),console.error("Failed to backfill WorkHub project intent.",{projectId:n.id,error:h})}})))},[y,x,V]);const ce=J.currentUser?.uid||"",Ur=r.useMemo(()=>ce?`workhub:view-mode:${ce}`:"",[ce]),nr=r.useMemo(()=>ce?`workhub:selectedWorkspace:${ce}`:"",[ce]),Et=r.useMemo(()=>ce?`workhub:selectedProjectByWorkspace:${ce}`:"",[ce]),Lr=r.useMemo(()=>ce?`workhub:expandedProjectsByWorkspace:${ce}`:"",[ce]),Vt=r.useMemo(()=>ce?`workhub:lastRouteByWorkspace:${ce}`:"",[ce]),Vu=300,ka=r.useRef(null);function Hu(){if(!Lr)return{};try{const t=localStorage.getItem(Lr);if(!t)return{};const a=JSON.parse(t),n={};return Object.entries(a).forEach(([l,h])=>{if(!Array.isArray(h))return;const m=Array.from(new Set(h.filter(S=>typeof S=="string"))).slice(0,Vu);n[l]=m}),n}catch{return{}}}const Yi=f===gr,wa=gr.trim().toLowerCase(),Ee=!!(Yi||y?.role==="admin"||y?.role==="manager"),Ku=y?.displayName||C||f.split("@")[0]||"Member",sf=y?.email||f||J.currentUser?.email||"",Xi=(y?.photoURL||J.currentUser?.photoURL||"").trim(),Gu=Rn(Ku),{lightboxImageUrl:Qi,setLightboxImageUrl:Yu,lightboxTool:Ji,setLightboxTool:ol,lightboxImageFit:Zi,setLightboxImageFit:rl,lightboxImageAspect:Xu,setLightboxImageAspect:lf,lightboxDraftLine:cf,lightboxMarkerEditorId:Qu,lightboxMarkerDraft:df,setLightboxMarkerDraft:uf,lightboxMarkerResolved:hf,setLightboxMarkerResolved:pf,lightboxStageRef:bf,lightboxDragRef:Ju,openAttachmentLightbox:Zu,handleLightboxStageClick:ff,openLightboxMarkerEditor:al,closeLightboxMarkerEditor:mf,handleLightboxMarkerEditorSave:gf,handleMarkerPointerDown:eh,handleLightboxFullscreenToggle:kf}=Lx({attachmentReviews:ga,setAttachmentReviews:Zs,markerAuthor:J.currentUser?.displayName||J.currentUser?.email||y?.displayName||y?.email||"Member",showToast:s}),Ne=r.useMemo(()=>V.filter(t=>Pn(t,ce,f,Ee)),[ce,Ee,f,V]),[wf,xf]=r.useState([]),Ht=r.useMemo(()=>$.filter(t=>t.status==="approved"),[$]),il=r.useMemo(()=>$.filter(t=>t.status==="pending"),[$]),ze=r.useMemo(()=>Ne.find(t=>t.id===u)||null,[u,Ne]),nl=r.useMemo(()=>Wt(ze),[ze]),De=nl.templateId,sl=nl.template,yf=ze?.taskDueDisplayMode||"remaining",Kt=sl.workspaceType,xa=ze?.treeMetaDisplayMode||"counts",ya=ze?.showProjectColorDots!==!1,St=r.useMemo(()=>new Set(ni(De)),[De]),lt=r.useMemo(()=>Object.fromEntries(V.map(t=>[t.id,t])),[V]),Ut=r.useMemo(()=>Object.fromEntries(D.map(t=>[t.id,t])),[D]),vf=r.useMemo(()=>Object.fromEntries(x.map(t=>{const a=t.clientId?Ut[t.clientId]:void 0;return[t.id,{logoUrl:(a?.logoUrl||"").trim(),clientName:(a?.name||"").trim(),projectName:(t.name||"").trim()}]})),[Ut,x]),sr=r.useMemo(()=>Lo&&Ut[Lo]||null,[Ut,Lo]),th=r.useMemo(()=>ve(ze?.accessMemberUids||[]),[ze]),Or=r.useMemo(()=>new Set(th),[th]),It=r.useMemo(()=>Ht.filter(t=>Or.has(t.uid)),[Ht,Or]),oh=r.useMemo(()=>Ht.filter(t=>t.uid!==ce),[Ht,ce]),ll=r.useMemo(()=>u?Kt==="technical"?[u]:Array.from(new Set([u,...V.filter(t=>c0(t)==="technical").map(t=>t.id)])):[],[u,Kt,V]),Dt=r.useMemo(()=>{const t=new Set(ll);return x.filter(a=>t.has(a.workspaceId))},[x,ll]),en=r.useMemo(()=>{const t=new Map;return Dt.forEach(a=>{const n=a.parentProjectId||"",l=t.get(n)||[];l.push(a),t.set(n,l)}),t},[Dt]),va=ze?.memberAccessLevels?.[ce]||"custom",Wo=Ee||va==="full",Me=r.useMemo(()=>Dt.filter(t=>{if(!Un(t,ce,Wo))return!1;const a=Ft(t,lt,St);return St.has(a)}),[Wo,ce,St,lt,Dt]),rh=r.useMemo(()=>Object.fromEntries(Ne.map(t=>[t.id,t])),[Ne]),go=r.useMemo(()=>{const t={};return Ne.forEach(a=>{const n=Wt(a).templateId,l=new Set(ni(n)),h=a.memberAccessLevels?.[ce]||"custom",m=Ee||h==="full";t[a.id]=x.filter(S=>{if(S.workspaceId!==a.id||!Un(S,ce,m))return!1;const P=Ft(S,lt,l);return l.has(P)})}),t},[ce,Ee,x,Ne,lt]),jf=r.useMemo(()=>{const t={};return Ne.forEach(a=>{t[a.id]=di(go[a.id]||[])}),t},[Ne,go]),ah=r.useMemo(()=>Object.fromEntries(Object.values(go).flat().map(t=>[t.id,t])),[go]),tn=r.useMemo(()=>new Set(Object.values(go).flat().map(t=>t.id)),[go]),cl=r.useMemo(()=>{const t={};return _.forEach(a=>{tn.has(a.projectId)&&(Le!=="all"&&a.assigneeUid!==Le||(t[a.projectId]=(t[a.projectId]||0)+1))}),t},[Le,_,tn]),Cf=r.useMemo(()=>{const t={};_.forEach(l=>{tn.has(l.projectId)&&(Le!=="all"&&l.assigneeUid!==Le||/done|complete/i.test(l.status)&&(t[l.projectId]=(t[l.projectId]||0)+1))});const a={},n=l=>{if(!l)return{done:0,total:0};if(a[l])return a[l];const h=x.find(Q=>Q.id===l),m=t[l]||0,S=cl[l]||0;if(!h){const Q={done:m,total:S};return a[l]=Q,Q}const U=(go[h.workspaceId]||[]).filter(Q=>Q.parentProjectId===l).reduce((Q,oe)=>{const xe=n(oe.id);return{done:Q.done+xe.done,total:Q.total+xe.total}},{done:m,total:S});return a[l]=U,U};return Object.values(go).flat().forEach(l=>{n(l.id)}),a},[x,Le,_,go,cl,tn]),{globalFinderOpen:Nf,setGlobalFinderOpen:Sf,globalFinderQuery:dl,setGlobalFinderQuery:ih,setGlobalFinderActiveIndex:ja,globalFinderInputRef:Df,globalFinderEntries:Mf,globalFinderResults:on,globalFinderResolvedActiveIndex:rn,closeGlobalFinder:an}=$x({projects:x,visibleWorkspaceById:rh,allClientById:Ut,currentUid:ce,isPrivilegedMember:Ee,workspaceByIdForFiltering:lt,onBeforeOpen:()=>{qt(!1),M(!1),te(!1)}}),Tf=r.useMemo(()=>Ne.map(t=>({id:t.id,name:`${Gl(Wt(t).templateId)} ${t.name}`})),[Ne]),ul=r.useMemo(()=>{const t=[];return Ne.forEach(a=>{const n=a.memberAccessLevels?.[ce]||"custom",l=Ee||n==="full",h=x.filter(S=>S.workspaceId===a.id&&Un(S,ce,l));zp(di(h)).forEach(S=>{t.push({id:S.id,workspaceId:a.id,name:S.name,depth:S.depth})})}),t},[ce,Ee,x,Ne]),nh=r.useMemo(()=>Object.fromEntries(ul.map(t=>[t.id,t])),[ul]),ro=r.useCallback(t=>{const a=x.find(n=>n.id===t);return h0(a?.mainPanelView)},[x]),If=r.useCallback(async t=>{const a=await Cw(t.entityId);return a?($e(a),W(a.workspaceId),pe("all"),Ce(a.projectId||""),be(""),ge(a.id),He(""),p("notes"),jt(!0),Nt(!1),!0):!1},[]),{handleNotificationClick:sh,handleToggleNotificationMenu:zf,handleToggleAccountMenu:Pf,handleOpenAccountSettings:lh}=Bx({notificationMenuOpen:v,setNotificationMenuOpen:M,accountMenuOpen:z,setAccountMenuOpen:te,tasks:_,documents:K,visibleWorkspaceProjects:Me,setSelectedProjectId:pe,setSelectedNoteProjectId:Ce,setSelectedTaskId:be,setSelectedDocumentId:ge,setActiveSection:p,openDocumentFromNotification:If,resolveProjectMainPanelSection:ro,navigateToProfile:()=>o("/profile"),showToast:s}),$f=r.useCallback(async t=>{t.read||await cp(t.id).catch(()=>{}),await sh(t)},[sh]),{selectedTemplate:ch,templates:Af,initialTaskStatuses:dh}=Hx(Tc),{visibleProjectById:Ca,visibleProjectsByParent:ko,visibleProjectTree:Na,defaultCollapsedClosedRootIds:uh,liveProjectTree:lr,flatVisibleProjectOptions:cr,visibleProjectIds:rt,selectedProject:j}=Sx({visibleWorkspaceProjects:Me,expandedProjectIds:Uo,selectedProjectId:O,selectedProjectDeadlineDraft:ua,selectedProjectSubmissionTimeDraft:Ro}),kt=r.useMemo(()=>Qa(De,ze?.projectColorMeanings),[ze?.projectColorMeanings,De]),Lt=r.useMemo(()=>kt.map(t=>t.color),[kt]),hl=r.useMemo(()=>ze?`${Gl(De)} ${ze.name}`:"",[ze,De]),{selectedProjectEffectiveIntent:ao,projectIntentById:wo,projectIntentMetaById:pl,projectIntentIconById:Sa,projectSelectorIconById:nn,selectedProjectIntentMeta:Ef,taskContextTrail:bl,quickTaskViewTargetProject:hh,taskItemDisplayMode:ph,selectedProjectPeriodLabel:bh,selectedProjectSubmissionTimeLabel:fh,selectedProjectColorMeaning:Uf,selectedProjectDisplayName:Lf,flatVisibleProjectOptionsWithIcons:fl,selectedProjectComposedDescriptionDraft:ml,selectedProjectTypeOptions:Of}=Dx({selectedProject:j,visibleProjectById:Ca,visibleProjectsByParent:ko,visibleWorkspaceProjects:Me,flatVisibleProjectOptions:cr,workspaceByIdForFiltering:lt,selectedWorkspaceTemplateIntentSet:St,selectedWorkspaceTemplateId:De,selectedProjectColorDraft:da,selectedProjectNarrativeDraft:Pu,selectedProjectIntentDetailDrafts:$u,selectedProjectTypeDraft:ar,selectedWorkspaceProjectColorMeanings:kt}),{workspaceTaskStatuses:wt,effectiveStatusesByProjectId:mh,selectedProjectEffectiveTaskStatuses:io,defaultTaskStatusId:Rr,workspaceTaskCountByProjectId:sn,workspaceTaskProgressByProjectId:dr,visibleTasks:Da,taskCountByStatus:Ma,taskFilterBaseTasks:Rf,activeTaskFilterCount:_f,filteredTasks:gl,filteredTaskCountByStatus:kl,financeStatusTotals:Wf,financeWorkspaceCurrency:Ff,taskFilterBaseTaskCountByStatus:Bf,completedStatusForHighlight:qf,completedHighlightCount:Vf}=zx({tasks:_,visibleProjectIds:rt,visibleProjectsByParent:ko,visibleWorkspaceProjects:Me,selectedProjectId:O,selectedAssigneeUid:Le,selectedWorkspace:ze,selectedWorkspaceScopeType:Kt,taskFilterRequireAttachments:jd,taskFilterRequireChecklist:Cd,taskFilterPriority:Nd,selectedTaskStatusTab:ht}),Ta=Kt!=="technical",ln=r.useMemo(()=>Ta?lr.filter(t=>t.workspaceId!==u):[],[Ta,lr,u]),gh=r.useMemo(()=>Ta?lr.filter(t=>t.workspaceId===u):lr,[Ta,lr,u]),Mt=r.useMemo(()=>st.find(t=>t.id===Zo)||st[0]||null,[Zo,st]),wl=r.useMemo(()=>new Set(io.filter(t=>{const a=`${t.id} ${t.label}`.toLowerCase();return a.includes("done")||a.includes("complete")||a.includes("closed")}).map(t=>t.id)),[io]),cn=r.useMemo(()=>ht==="all"?io.filter((t,a)=>a===0||(kl[t.id]||0)>0):io.filter(t=>t.id===ht),[kl,ht,io]),xl=r.useMemo(()=>ht!=="all"?new Set(cn.map(t=>t.id)):new Set(cn.filter(t=>!wl.has(t.id)||ds.includes(t.id)).map(t=>t.id)),[wl,ds,cn,ht]),Hf=r.useMemo(()=>{const t={},a={};if(xl.size===0)return t;for(const n of gl){if(!xl.has(n.status))continue;const l=a[n.status]||0,h=xd[n.status]||Cp;l>=h||(t[n.status]||(t[n.status]=[]),t[n.status].push(n),a[n.status]=l+1)}return t},[xl,gl,xd]),Kf=r.useMemo(()=>{const t={},a=Kt==="finance";for(const n of _){const l=Pt(n);let h=null;if(a&&typeof n.valueAmount=="number"&&n.valueAmount>0){const m=n.valueAmount,S=n.valueCurrency||"OMR";let P=0;for(const U of l)typeof U.valueAmount=="number"&&Number.isFinite(U.valueAmount)&&(P+=U.valueAmount);h={totalValue:m,usedValue:P,remaining:m-P,currency:S}}t[n.id]={checklist:l,checklistDoneCount:l.reduce((m,S)=>m+(S.completed?1:0),0),checklistDetailsCount:l.reduce((m,S)=>m+((S.details||"").trim().length>0?1:0),0),checklistImagesCount:l.reduce((m,S)=>m+(S.attachments?.length||0),0),checklistLinksCount:l.reduce((m,S)=>m+(S.links?.length||0),0),taskAttachmentCount:Kr(n).length,financeValue:h}}return t},[_,Kt]);r.useEffect(()=>{Wu(!1)},[j?.id]);const dn=r.useMemo(()=>new Set(Ou),[Ou]),Gf=r.useMemo(()=>new Set(fu),[fu]),xt=r.useMemo(()=>_.filter(t=>dn.has(t.id)),[dn,_]),kh=xt.length,xo=r.useMemo(()=>Gi&&_.find(t=>t.id===Gi.taskId)||null,[Gi,_]),Yf=r.useCallback(()=>{ir(null)},[]),Xf=r.useCallback(async()=>{if(!xo)return;const t=To(xo.workspaceId,xo.projectId||"all","tasks",xo.id),a=`${window.location.origin}${t}`;try{await navigator.clipboard.writeText(a),s({type:"success",message:"Task URL copied."}),ir(null)}catch{s({type:"error",message:"Could not copy task URL."})}},[xo,s]),Qf=r.useCallback(async()=>{if(!xo)return;const t=`workhub-task:${xo.workspaceId}:${xo.id}`;try{await navigator.clipboard.writeText(t),s({type:"success",message:"Task token copied."}),ir(null)}catch{s({type:"error",message:"Could not copy task token."})}},[xo,s]),Jf=r.useMemo(()=>({onDragOver:(t,a,n)=>{const{dragTaskId:l,dragStatusId:h,dropTargetKey:m}=me.current;!l||l===a||h!==n||(t.preventDefault(),m!==a&&Dr(a))},onDrop:(t,a,n)=>{const{dragTaskId:l,dragStatusId:h}=me.current;!l||l===a||h!==n||(t.preventDefault(),me.current.handleTaskReorder(l,n,a))},onRowClick:t=>{be(t),ir(null),mo(""),to(""),oo(""),_o("")},onRowContextMenu:(t,a,n)=>{mo(""),to(""),oo(""),_o(""),ir({taskId:t,x:a,y:n})},onDoubleClickRow:t=>{mu(a=>a.includes(t)?a.filter(n=>n!==t):[...a,t])},onDragStart:(t,a,n)=>{t.stopPropagation(),Si(a),Di(n),Dr(""),t.dataTransfer.effectAllowed="move",t.dataTransfer.setData("text/plain",a)},onDragEnd:()=>{Si(""),Di(""),Dr("")},onCheckboxChange:(t,a)=>{ma(n=>a?n.includes(t)?n:[...n,t]:n.filter(l=>l!==t))},onTitleEditStart:t=>{Xs(t.id),qi(t.title)},onTitleEditTextChange:t=>qi(t),onTitleEditSave:t=>{const a=ct(me.current.editingTaskTitleText);Xs(null),qi(""),!(!a||a===ct(t.title||""))&&me.current.handleTaskUpdate(t,{title:a},{silent:!0})},onTitleEditCancel:()=>{Xs(null),qi("")},onOpenStatusMenu:t=>{to(a=>a===t?"":t),mo(""),oo(""),_o("")},onOpenPriorityMenu:t=>{oo(a=>a===t?"":t),to(""),mo(""),_o("")},onOpenMoreMenu:t=>{mo(a=>a===t?"":t),to(""),oo(""),_o("")},onOpenAssigneeMenu:t=>{_o(a=>a===t?"":t),to(""),oo(""),mo("")},onAssigneeSelect:(t,a)=>{me.current.handleTaskUpdate(t,{assigneeUid:a||void 0},{silent:!0}),_o("")},onStatusSelect:(t,a)=>{const{selectedTaskIdSet:n,selectedTaskCount:l}=me.current;n.has(t.id)&&l>1?me.current.handleBulkStatusChange(a):me.current.handleTaskUpdate(t,{status:a},{silent:!0}),to("")},onPrioritySelect:(t,a)=>{me.current.handleTaskUpdate(t,{priority:a},{silent:!0}),oo("")},onToggleChecklist:t=>{mu(a=>a.includes(t)?a.filter(n=>n!==t):[...a,t]),mo(""),to(""),oo("")},onDueDateChange:(t,a)=>{me.current.handleTaskUpdate(t,{dueDate:a},{silent:!0})},onOpenDetails:t=>{be(t),mo(""),to(""),oo("")},onChecklistItemToggle:(t,a,n)=>{const l=Pt(t).map(h=>h.id===a?{...h,completed:n}:h);me.current.handleTaskUpdate(t,{checklist:l},{silent:!0})},onChecklistItemEditStart:(t,a,n,l)=>{Vi(t),Hi(a),Ki(l),Ar(n)},onChecklistItemTextChange:t=>Ar(t),onChecklistItemEditSave:(t,a)=>{const n=me.current.editingChecklistItemText.trim();if(Vi(null),Hi(null),Ki(null),Ar(""),!n)return;const l=Pt(t).map(h=>h.id===a?{...h,text:n}:h);me.current.handleTaskUpdate(t,{checklist:l},{silent:!0})},onChecklistItemEditCancel:()=>{Vi(null),Hi(null),Ki(null),Ar("")},onChecklistRemove:(t,a)=>{const n=Pt(t).filter(l=>l.id!==a);me.current.handleTaskUpdate(t,{checklist:n},{silent:!0})},onChecklistAdd:t=>{const a=(me.current.taskChecklistDrafts[t.id]||"").trim();if(!a)return;const n={id:`chk_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,text:a,completed:!1},l=[...Pt(t),n];Ui(h=>({...h,[t.id]:""})),me.current.handleTaskUpdate(t,{checklist:l},{silent:!0})},onChecklistDraftChange:(t,a)=>{Ui(n=>({...n,[t]:a}))},onChecklistItemValueChange:(t,a,n)=>{const l=Pt(t).map(h=>h.id===a?{...h,valueAmount:n!==null?n:void 0}:h);me.current.handleTaskUpdate(t,{checklist:l},{silent:!0})},onTaskValueChange:(t,a)=>{me.current.handleTaskUpdate(t,{valueAmount:a!==null?a:void 0},{silent:!0})}}),[]),Zf=r.useCallback((t,a,n)=>me.current.handleTaskUpdate(t,a,n),[]),em=r.useCallback((t,a,n)=>me.current.handleTaskReorder(t,a,n),[]),tm=r.useCallback(t=>me.current.handleBulkStatusChange(t),[]),om=r.useCallback(t=>me.current.handleQuickAddTask(t),[]),rm=r.useCallback(()=>me.current.clearTaskSelection(),[]),am=r.useCallback(()=>me.current.handleBulkDeleteSelected(),[]),im=r.useCallback(t=>me.current.handleDeleteSingleTask(t),[]),nm=r.useCallback(t=>me.current.handleQuickTaskViewModeChange(t),[]),sm=r.useCallback((t,a,n)=>me.current.handleAddTaskComment(t,a,n),[]),lm=r.useCallback(t=>me.current.handleAddComment(t),[]),cm=r.useCallback(t=>me.current.handleStartCommentEdit(t),[]),dm=r.useCallback(()=>me.current.handleCancelCommentEdit(),[]),um=r.useCallback(t=>me.current.handleSaveCommentEdit(t),[]),hm=r.useCallback(t=>me.current.handleDeleteComment(t),[]),Se=r.useMemo(()=>V.find(t=>t.id===vc)||null,[vc,V]),yl=r.useMemo(()=>Wt(Se),[Se]),yo=r.useMemo(()=>{const t=yl.template;return{id:t.id,label:t.label,graphic:t.graphic,description:t.description,warning:yl.warning||""}},[yl]),vl=r.useMemo(()=>Qa(yo.id),[yo.id]),pm=r.useMemo(()=>Se?x.filter(t=>t.workspaceId===Se.id).length:0,[x,Se]),bm=r.useMemo(()=>Se?_.filter(t=>t.workspaceId===Se.id).length:0,[Se,_]);r.useEffect(()=>{ma(t=>t.filter(a=>_.some(n=>n.id===a)))},[_]),r.useEffect(()=>{const t=j?.name?.trim();document.title=t?`WorkHub | ${t}`:"WorkHub"},[j?.name]);async function fm(t,a,n){if(!t||!u)return;const l=Lp(_,u,a),h=l.find(U=>U.id===t);if(!h)return;const m=l.filter(U=>U.id!==t),S=n?m.findIndex(U=>U.id===n):m.length;if(m.splice(S<0?m.length:S,0,h),m.filter((U,Q)=>U.sortOrder!==(Q+1)*1024).length===0){Si(""),Di(""),Dr("");return}le("task-sort");try{await Promise.all(m.map((U,Q)=>ci(U.id,{sortOrder:(Q+1)*1024})))}catch(U){const Q=U instanceof Error?U.message:"Could not reorder tasks.";s({type:"error",message:Q})}finally{le(""),Si(""),Di(""),Dr("")}}const Ia=r.useMemo(()=>Me.find(t=>t.id===Re)||null,[Re,Me]),ae=r.useMemo(()=>Dt.find(t=>t.id===fi)||null,[fi,Dt]),et=r.useMemo(()=>ae?Ft(ae,lt,St):"project",[ae,St,lt]),un=r.useMemo(()=>Bt(et,De),[et,De]),wh=r.useMemo(()=>u0(et,$t),[et,$t]),mm=r.useMemo(()=>m0(et),[et]),gm=r.useMemo(()=>g0(et),[et]),km=r.useMemo(()=>{const t=Pp[et],a=new Set(t||On.map(n=>n.value));return $t&&!a.has($t)&&a.add($t),On.filter(n=>a.has(n.value))},[et,$t]),za=r.useMemo(()=>ae?Yl(ae.id,en):new Set,[ae,en]),wm=r.useMemo(()=>(ae?cr.filter(a=>!za.has(a.id)):cr).map(a=>{const l=(wo[a.id]||"project")==="project"?a.id===Tr?"📂":"📁":nn[a.id]||"📁";return{...a,name:`${l} ${a.name}`}}),[cr,wo,nn,ae,za,Tr]),xh=r.useMemo(()=>kt.find(t=>t.color.toLowerCase()===oa.trim().toLowerCase())||null,[kt,oa]),_r=r.useMemo(()=>xr(xh?.label||""),[xh]),Pa=r.useMemo(()=>De!=="proposals_leads"||et!=="proposal"?null:Dt.find(t=>t.workspaceId===u&&Ft(t,lt,St)==="project"&&Tp(t.name))||null,[et,u,De,St,lt,Dt]),Ve=r.useMemo(()=>De!=="proposals_leads"||et!=="proposal"?null:Ne.find(t=>Wt(t).templateId==="projects")||null,[et,De,Ne]),yh=r.useMemo(()=>new Set(ni(Ve?Wt(Ve).templateId:"projects")),[Ve]),$a=r.useMemo(()=>{if(!Ve)return null;const t=xr(Ct);return t&&x.find(a=>a.workspaceId===Ve.id&&Ft(a,lt,yh)==="project"&&xr(a.name)===t)||null},[x,Ve,yh,Ct,lt]),xm=r.useMemo(()=>Ve&&Qa(Wt(Ve).templateId,Ve.projectColorMeanings).find(a=>xr(a.label).includes("running"))?.color||"#10b981",[Ve]),ym=r.useMemo(()=>De!=="proposals_leads"||et!=="proposal"?null:_r.includes("submitted")?Pa?{title:"Move to Submitted proposals",description:"Set the parent item/category to Submitted proposals before saving.",buttonLabel:"Use Submitted proposals",applied:Tr===Pa.id,appliedLabel:`Parent item/category is set to ${Pa.name}.`,onApply:()=>bs(Pa.id)}:{title:"Submitted folder unavailable",description:'No "Submitted proposals" folder was found in this workspace.',buttonLabel:"",applied:!0,appliedLabel:'No "Submitted proposals" folder was found in this workspace.'}:_r.includes("running")?Ve?$a?{title:"Delivery folder already exists",description:"",buttonLabel:"",applied:!0,appliedLabel:`A matching folder already exists in ${Ve.name}.`}:{title:"Create delivery folder in Projects workspace",description:`Create a folder named "${Ct.trim()||"this proposal"}" in ${Ve.name} when you save.`,buttonLabel:`Create in ${Ve.name}`,applied:Ys,appliedLabel:`A new folder will be created in ${Ve.name} when you save.`,onApply:()=>$r(!0),onCancel:()=>$r(!1),cancelLabel:"Cancel"}:{title:"Projects workspace unavailable",description:"No accessible Projects workspace was found for creating a delivery folder.",buttonLabel:"",applied:!0,appliedLabel:"No accessible Projects workspace was found for creating a delivery folder."}:null,[$a,Ve,et,De,Ys,Ct,Tr,_r,Pa]),vm=r.useMemo(()=>_.filter(t=>za.has(t.projectId)).length,[za,_]),jm=r.useMemo(()=>ae?(en.get(ae.id)||[]).length:0,[ae,en]),jl=r.useMemo(()=>Object.fromEntries(Me.map(t=>[t.id,`${nn[t.id]||"📁"} ${t.name}`])),[nn,Me]),Qe=r.useMemo(()=>Object.fromEntries(Dt.map(t=>[t.id,t])),[Dt]),vo=r.useMemo(()=>{const t={};return Dt.forEach(a=>{if(a.visibility!=="restricted"||Ee){t[a.id]=It;return}const n=ve([...a.memberUids||[],a.createdBy]).filter(h=>Or.has(h)),l=new Set(n);t[a.id]=Ht.filter(h=>l.has(h.uid))}),t},[Ht,Ee,Or,It,Dt]),Cl=r.useMemo(()=>{if(O!=="all")return vo[O]||It;if(Me.length===0)return It;const t=new Map;return Me.forEach(a=>{(vo[a.id]||It).forEach(l=>t.set(l.uid,l))}),Array.from(t.values())},[vo,O,Me,It]),vh=r.useMemo(()=>new Set(Cl.map(t=>t.uid)),[Cl]),Cm=r.useMemo(()=>Object.fromEntries($.map(t=>[t.uid,t.displayName||t.email||t.uid])),[$]),Aa=r.useMemo(()=>j?ko.get(j.id)||[]:ko.get("")||[],[j,ko]),Ot=r.useMemo(()=>j?Yl(j.id,ko):new Set,[j,ko]),hn=r.useMemo(()=>j?Me.filter(t=>Ot.has(t.id)):[],[j,Ot,Me]),jh=r.useMemo(()=>j?hn:Me,[j,hn,Me]),pn=r.useMemo(()=>j?hn.filter(t=>t.id!==j.id):Me,[j,hn,Me]),bn=r.useMemo(()=>{const t=new Map;pn.forEach(n=>{const l=wo[n.id]||"project";l!=="project"&&t.set(l,(t.get(l)||0)+1)});const a=Array.from(t.entries()).sort((n,l)=>l[1]-n[1])[0]?.[0];return a||(j&&ao!=="project"?ao:xp(De)[0]?.intent||ao||"project")},[wo,j,ao,pn,De]),Gt=r.useMemo(()=>Bt(bn,De),[bn,De]),Nm=r.useMemo(()=>{if(!j)return hl||"Workspace overview";const t=Gt.subjectLabel,a=oc(t);return ao!=="project"?`${Gt.icon} ${t} summary`:`${Gt.icon} ${a} overview`},[Gt,j,ao,hl]),Ch=r.useMemo(()=>{if(!j)return f0(De);switch(bn){case"proposal":return"Available proposals";case"lead":return"Active leads";case"marketing_campaign":return"Active campaigns";case"marketing_content_stream":return"Content streams";case"finance_invoice_stream":return"Invoice streams";case"finance_payment_cycle":return"Payment cycles";case"hr_requisition":return"Open requisitions";case"hr_onboarding_track":return"Onboarding tracks";default:return oc(Gt.subjectLabel)}},[bn,Gt.subjectLabel,j,De]),at=r.useMemo(()=>{if(!j||Au!==j.id)return null;const t=Date.now(),a=(j.color||"").trim().toLowerCase(),n=kt.find(Ue=>Ue.color.toLowerCase()===a)||null,h=xr(n?.label||"").includes("submitted"),m=uc(j),S=Number.isFinite(m),P=S?m-t:Number.NaN,U=S?P<0:!1,Q=S?Math.abs(P):0,oe=1440*60*1e3,xe=3600*1e3,Be=60*1e3;let _e="No submission deadline set",ft="Time left",nt="--";if(h){ft="Status";const Ue=Mo(j.updatedAt||j.createdAt),po=Ue>0?Math.max(0,t-Ue):0;if(Ue>0)if(po<xe){const mt=Math.max(1,Math.floor(po/Be)||1);_e=`Submitted ${mt} minute${mt===1?"":"s"} ago`,nt=`Sub ${mt}m`}else if(po<oe){const mt=Math.max(1,Math.floor(po/xe));_e=`Submitted ${mt} hour${mt===1?"":"s"} ago`,nt=`Sub ${mt}h`}else{const mt=Math.max(1,Math.floor(po/oe));_e=`Submitted ${mt} day${mt===1?"":"s"} ago`,nt=`Sub ${mt}d`}else _e="Submitted",nt="Sub"}else if(S)if(Q<xe){const Ue=Math.max(1,Math.ceil(Q/Be));_e=U?`Overdue by ${Ue} minute${Ue===1?"":"s"}`:`${Ue} minute${Ue===1?"":"s"} remaining`,nt=U?`${Ue}m+`:`${Ue}m`}else if(Q<oe){const Ue=Math.max(1,Math.ceil(Q/xe));_e=U?`Overdue by ${Ue} hour${Ue===1?"":"s"}`:`${Ue} hour${Ue===1?"":"s"} remaining`,nt=U?`${Ue}h+`:`${Ue}h`}else{const Ue=Math.max(1,Math.ceil(Q/oe));_e=U?`Overdue by ${Ue} day${Ue===1?"":"s"}`:`${Ue} day${Ue===1?"":"s"} remaining`,nt=U?`${Ue}d+`:`${Ue}d`}const ho=(j.clientId&&Ut[j.clientId]?.name||"").trim(),Ho=Go(j),pr=An(j),So=j.projectType==="tender"?"Submission deadline":"Final deadline",Ko=j.projectType==="tender"?j.submissionTime||Qt:j.submissionTime||"",br=S?h?0:U?100:Math.max(8,Math.round((14-Math.min(Math.max(0,Math.ceil((m-t)/oe)),14))/14*100)):0;return{clientName:ho,tenderNumber:(j.tenderNumber||"").trim(),proposalId:(j.proposalId||"").trim(),deadlineLabel:So,deadlineDate:pi(j.projectDeadline||""),submissionTimeLabel:Ko,timeLeftLabel:ft,timeLeftText:_e,countdownShort:nt,hasDeadline:S,isOverdue:h?!1:U,urgencyPercent:br,totalAmount:Ho,totalCurrency:pr,brief:(j.description||"").trim()}},[Ut,j,Au,kt]);function Nh(t,a=0){const n=pl[t.id]||Bt(Ft(t,lt,St),De),l=dr[t.id]||{done:0,total:0},h=l.total>0?Math.round(l.done/l.total*100):0,m=Math.max(0,Math.min(100,h)),S=l.total>0&&m>=100,P=l.total>0?`${m}%`:"--",U=De==="proposals_leads",Q=U?uc(t):Number.NaN,oe=Number.isFinite(Q),xe=pi(t.projectDeadline||""),Be=oe?Q-Date.now():Number.NaN,_e=oe?Math.abs(Be):0,ft=oe?Be<0:!1,nt=4320*60*1e3,ho=oe&&!ft&&_e<=nt,Ho=oe?Math.max(0,Math.floor(_e/(1e3*60*60))):0,pr=720,So=Math.floor(Ho/pr),Ko=Ho-So*pr,br=Math.floor(Ko/24),Ue=Ko%24,po=So>0?`${So}mo`:"",mt=br>0?`${br}d`:"",zn=`${Ue}h`,tt=oe?[po,mt,zn].filter(Boolean).join(" ").trim()||"0h":"No deadline",Te=(t.color||"").trim().toLowerCase(),gt=kt.find(Ya=>Ya.color.toLowerCase()===Te)||null,Va=xr(gt?.label||""),Ha=U&&(Va.includes("submitted")||!!j&&Tp(j.name)),Ka=Go(t),Ga=An(t),ql=(t.submissionTime||"").trim(),Vr=ql?new Intl.DateTimeFormat("en-US",{hour:"2-digit",minute:"2-digit",hour12:!0}).format(new Date(`2000-01-01T${ql}`)):"";return e.jsx("article",{className:`workhub-project-card compact-card is-clickable is-category-card${U?" is-proposal-card":""} depth-${Math.min(a,4)}`,style:{"--workhub-category-accent":t.color},role:"button",tabIndex:0,onClick:()=>ur(t.id),onKeyDown:Ya=>{(Ya.key==="Enter"||Ya.key===" ")&&(Ya.preventDefault(),ur(t.id))},children:e.jsxs("div",{className:"workhub-project-card-minimal-layout",children:[e.jsxs("div",{className:"workhub-project-title-row",children:[e.jsx("span",{className:"workhub-project-category-icon","aria-hidden":"true",children:n.icon||"📁"}),e.jsx("strong",{children:t.name})]}),U&&oe&&e.jsxs(e.Fragment,{children:[e.jsx("strong",{className:`workhub-project-card-days-left workhub-ltr-token${ft?" is-overdue":""}${ho?" is-near":""}`,children:tt}),xe&&e.jsxs("span",{className:"workhub-project-card-date workhub-ltr-token",children:[xe,Vr?` | ${Vr}`:""]})]}),Ha?e.jsxs("div",{className:"workhub-project-card-value-row",children:[e.jsx("span",{className:"workhub-project-card-value-label",children:"Proposal value"}),e.jsx("strong",{className:"workhub-project-card-value-text workhub-ltr-token",children:Rp(Ka,Ga)})]}):e.jsxs("div",{className:"workhub-project-card-progress-row",children:[e.jsx("div",{className:"workhub-project-card-progress-track",children:e.jsx("div",{className:`workhub-project-card-progress-fill${S?" is-complete":""}`,style:{width:l.total>0?`${m}%`:"0%"}})}),e.jsx("span",{className:`workhub-project-card-progress-pct${S?" is-complete":""}`,children:P})]})]})},t.id)}const Sh=r.useMemo(()=>{const t={};return jh.forEach(a=>{const n=Go(a),l=An(a);oi(t,l,n)}),t},[jh]),Sm=r.useMemo(()=>ri(Sh),[Sh]),Fo=r.useMemo(()=>{const t={leads:{},proposals:{},finance:{},marketing:{}};return pn.forEach(a=>{const n=Ft(a,lt,St),l=Go(a);if(l<=0)return;const h=An(a);if(n==="lead"){oi(t.leads,h,l);return}if(n==="proposal"){oi(t.proposals,h,l);return}if(n==="finance_invoice_stream"||n==="finance_payment_cycle"){oi(t.finance,h,l);return}(n==="marketing_campaign"||n==="marketing_content_stream")&&oi(t.marketing,h,l)}),t},[pn,St,lt]),Dm=r.useMemo(()=>ri(Fo.leads),[Fo.leads]),Mm=r.useMemo(()=>ri(Fo.proposals),[Fo.proposals]),Tm=r.useMemo(()=>ri(Fo.finance),[Fo.finance]),Im=r.useMemo(()=>ri(Fo.marketing),[Fo.marketing]),no=r.useMemo(()=>Object.fromEntries($.map(t=>[t.uid,t])),[$]),Dh=r.useMemo(()=>{const t={};return $.forEach(a=>{const n=V.filter(l=>Pn(l,a.uid,a.email||"",!1)).map(l=>l.name);t[a.uid]={count:n.length,names:n}}),t},[$,V]),Ea=r.useMemo(()=>{if(Pi==="all")return $;const t=Ne.find(n=>n.id===Pi);if(!t)return $;const a=new Set(ve(t.accessMemberUids||[]));return $.filter(n=>n.status==="pending"||a.has(n.uid))},[$,Pi,Ne]),zm=r.useMemo(()=>Ea.filter(t=>t.status==="pending"),[Ea]),Pm=r.useMemo(()=>Ea.filter(t=>t.status==="approved"),[Ea]),fn=r.useMemo(()=>{const t={},a=V;return $.forEach(n=>{if(!a.length){t[n.uid]="workspace_based";return}const l=a.every(m=>ve(m.accessMemberUids||[]).includes(n.uid)),h=a.every(m=>(m.memberAccessLevels?.[n.uid]||"custom")==="full");t[n.uid]=l&&h?"full":"workspace_based"}),t},[$,V]),Mh=r.useMemo(()=>Object.entries(fn).filter(([,t])=>t==="full").map(([t])=>t),[fn]),Ua=r.useMemo(()=>{const t={};return $.forEach(a=>{const n={};V.forEach(l=>{const h=ve(l.accessMemberUids||[]).includes(a.uid);n[l.id]={enabled:h,level:l.memberAccessLevels?.[a.uid]||"custom"}}),t[a.uid]={mode:fn[a.uid]||"workspace_based",workspaceById:n}}),t},[$,fn,V]),$m=r.useMemo(()=>{const t={};return $.forEach(a=>{const n=Ua[a.uid]||{mode:"workspace_based",workspaceById:{}},l=sa[a.uid];t[a.uid]=l||n}),t},[$,sa,Ua]),Th=r.useMemo(()=>{const t={};return $.forEach(a=>{const n=Ua[a.uid],l=sa[a.uid];if(!n||!l){t[a.uid]=!1;return}if(l.mode!==n.mode){t[a.uid]=!0;return}const h=new Set([...Object.keys(n.workspaceById),...Object.keys(l.workspaceById)]);t[a.uid]=Array.from(h).some(m=>{const S=n.workspaceById[m]||{enabled:!1,level:"custom"},P=l.workspaceById[m]||{enabled:!1,level:"custom"};return S.enabled!==P.enabled||S.level!==P.level})}),t},[$,sa,Ua]),{handleWorkspaceAccessToggle:Am,handleToggleUserWorkspace:Em,handleSetUserAccessModeDraft:Um,handleToggleUserWorkspaceDraft:Lm,handleSetUserWorkspaceLevelDraft:Om,handleDiscardUserAccessDraft:Rm,handleSaveUserAccessDraft:_m,handleWorkspaceInviteAdd:Wm,handleWorkspaceInviteRemove:Fm,handleApproveRequestGlobal:Bm,handleApproveRequestForWorkspace:qm,handleRejectRequestForWorkspace:Vm,handleMemberAccessLevelChange:Hm}=Ox({selectedWorkspaceSettings:Se,workspaceAccessMemberUids:Yn,setWorkspaceAccessMemberUids:qc,workspaceInviteEmails:Xn,setWorkspaceInviteEmails:Kc,workspaceInviteEmailDraft:Gc,setWorkspaceInviteEmailDraft:Qn,workspaceMemberAccessLevels:Vc,setWorkspaceMemberAccessLevels:Hc,workspaces:V,userAccessSourceByUid:Ua,userAccessDraftByUid:sa,setUserAccessDraftByUid:lb,userAccessDraftDirtyByUid:Th,currentUserUid:ce,setBusyKey:le,showToast:s}),{getChecklistDetailKey:Km,toggleChecklistItemDetails:Gm,handleChecklistItemToggle:Ym,handleChecklistRemove:Xm,handleChecklistAdd:Qm,handleChecklistItemEditStart:Jm,handleChecklistItemEditSave:Zm,handleChecklistItemDetailsSave:eg,handleChecklistAttachmentAdd:tg,handleChecklistAttachmentRemove:og,handleTaskAttachmentFileUpload:rg,handleChecklistAttachmentFileUpload:ag,handleChecklistLinkAdd:ig,handleChecklistLinkRemove:ng,handleTaskAttachmentAdd:sg,handleTaskAttachmentRemove:lg,confirmAttachmentRemoval:La,handleSelectedTaskDescriptionSave:cg,handleSelectedTaskTitleSave:dg,handleTaskLinkEditStart:ug,handleTaskLinkEditCancel:hg,handleTaskLinkAdd:pg,handleTaskLinkRemove:bg,handleChecklistItemEditCancel:fg}=Rx({visibleWorkspaceProjects:Me,taskChecklistDrafts:Us,setTaskChecklistDrafts:Ui,taskAttachmentDrafts:gu,setTaskAttachmentDrafts:ku,taskAttachmentTitleDrafts:wu,setTaskAttachmentTitleDrafts:xu,taskLinkDrafts:yu,setTaskLinkDrafts:vu,taskLinkTitleDrafts:ju,setTaskLinkTitleDrafts:Cu,taskLinkEditingDrafts:Nu,setTaskLinkEditingDrafts:Ib,checklistDetailsDrafts:Su,checklistAttachmentDrafts:Du,setChecklistAttachmentDrafts:Mu,checklistLinkDrafts:Tu,setChecklistLinkDrafts:Iu,setExpandedChecklistDetailKeys:jb,editingChecklistItemText:Qs,setEditingChecklistTaskId:Vi,setEditingChecklistItemId:Hi,setEditingChecklistScope:Ki,setEditingChecklistItemText:Ar,setUploadingTaskAttachmentId:Pb,setUploadingChecklistAttachmentKey:Eb,attachmentDeletePrompt:Er,setAttachmentDeletePrompt:nf,currentUserUid:ce,handleTaskUpdate:Xh,showToast:s}),mg=r.useCallback((t,a,n)=>{const l=a.trim(),h=l===""?null:tc(l),m=zo(n)||"OMR",S=t.valueAmount??null,P=t.valueCurrency||"OMR";if(h===S&&m===P)return;const U={};h!==null&&Number.isFinite(h)?(U.valueAmount=h,U.valueCurrency=m):(U.valueAmount=0,U.valueCurrency=m),me.current.handleTaskUpdate(t,U,{silent:!0})},[]),Yt=r.useMemo(()=>{let t=0,a=0,n=0;for(const l of Da)/done|complete/i.test(l.status)&&t++,l.status==="in_progress"&&a++,l.priority==="urgent"&&n++;return{total:Da.length,done:t,inProgress:a,urgent:n}},[Da]),{unreadNotificationCount:Bo,unreadCommentCountByTaskId:gg,unreadCommentCountByProjectId:mn}=Ax({notifications:we,tasks:_,selectedWorkspaceId:u,workspaceProjectById:Qe}),{overviewStatusBuckets:kg,overviewPriorityBuckets:Ih,overviewCompletedCount:zh,overviewCompletionRate:Ph,tasksByAssignee:wg,restrictedProjectsCount:xg,overviewRecentTimeline:Nl,teamActivityHeatmap:gn,displayedTeamActivityDays:kn,overviewPriorityProjects:yg,displayedOverviewPriorityProjects:$h,homeTemplateWidgets:vg}=Ux({visibleTasks:Da,workspaceTaskStatuses:wt,taskCounts:Yt,scopeAssignableMembers:Cl,workspaceAssignableMembers:It,memberNameByUid:Cm,workspaceProjects:Dt,visibleWorkspaceProjects:Me,activity:E,currentUid:ce,isPrivilegedMember:Ee,activityWindowDays:ze?.activityWindowDays,allClientById:Ut,clients:D,scopedWorkspaceIds:ll,selectedWorkspaceTemplateId:De,unreadNotificationCount:Bo,pendingMembersCount:il.length}),Rt=r.useMemo(()=>{const t=K.filter(a=>a.workspaceId===u);return!ne||ne.workspaceId!==u||t.some(a=>a.id===ne.id)?t:[...t,ne].sort((a,n)=>Mo(n.updatedAt||n.createdAt)-Mo(a.updatedAt||a.createdAt))},[K,ne,u]),Oa=r.useMemo(()=>{const t={};return Rt.forEach(a=>{a.projectId&&rt.has(a.projectId)&&(t[a.projectId]||(t[a.projectId]=[]),t[a.projectId].push(a))}),Object.values(t).forEach(a=>{a.sort((n,l)=>Mo(l.updatedAt||l.createdAt)-Mo(n.updatedAt||n.createdAt))}),t},[rt,Rt]),Ra=r.useMemo(()=>{const t={};return ot.forEach(a=>{!a.entityId||!rt.has(a.entityId)||(t[a.entityId]||(t[a.entityId]=[]),t[a.entityId].push(a))}),t},[rt,ot]),Sl=r.useMemo(()=>{if(!j)return[];const t=[],a=new Set,n=(m,S,P,U)=>{const Q=(m||"").trim();!Q||!Xl(Q)||a.has(Q)||(a.add(Q),t.push({id:S,url:Q,label:P,source:U}))};return(j.attachments||[]).forEach((m,S)=>{n(m,`project-attachment:${S}`,j.attachmentTitles?.[m]||Po(m),"Project attachment")}),Rt.filter(m=>!!m.projectId&&Ot.has(m.projectId)).forEach(m=>{(m.attachments||[]).forEach((S,P)=>{n(S,`doc:${m.id}:${P}`,m.title||"Untitled document",m.type==="note"?"Note":"Document")})}),ot.filter(m=>!!m.entityId&&Ot.has(m.entityId)).forEach(m=>{m.images.slice(0,3).forEach((S,P)=>{n(S.url,`mood:${m.id}:${P}`,m.title||"Mood board","Mood board")})}),t.slice(0,8)},[j,Ot,Rt,ot]),Dl=r.useMemo(()=>{if(!j)return{docs:0,notes:0,moodBoards:0};const t=Rt.filter(h=>!!h.projectId&&Ot.has(h.projectId)),a=t.filter(h=>h.type!=="note").length,n=t.filter(h=>h.type==="note").length,l=ot.filter(h=>!!h.entityId&&Ot.has(h.entityId)).length;return{docs:a,notes:n,moodBoards:l}},[j,Ot,Rt,ot]),Ah=r.useMemo(()=>j?Rt.filter(t=>!!t.projectId&&Ot.has(t.projectId)).sort((t,a)=>Mo(a.updatedAt||a.createdAt)-Mo(t.updatedAt||t.createdAt)).slice(0,6).map(t=>({id:t.id,title:(t.title||"").trim()||(t.type==="note"?"Untitled note":"Untitled document"),type:t.type==="note"?"note":"document",projectName:jl[t.projectId||""]||"",referenceSourceDocumentId:t.referenceSourceDocumentId||null,hasOutgoingReferences:!!t.hasOutgoingReferences})):[],[jl,j,Ot,Rt]),yt=r.useMemo(()=>Object.fromEntries(Rt.map(t=>[t.id,t])),[Rt]),Ml=r.useMemo(()=>[...Rt.filter(a=>O==="all"||!a.projectId||ne?.id===a.id?!0:Ot.has(a.projectId))].sort((a,n)=>{const l=Mo(n.updatedAt||n.createdAt),h=Mo(a.updatedAt||a.createdAt);return l-h}),[ne,Ot,O,Rt]),Pe=r.useMemo(()=>{const t=Ml.find(a=>a.id===k);return t||(ne?.id===k?ne:k&&yt[k]?yt[k]:null)},[ne,Ml,k,yt]),so=r.useMemo(()=>mi&&(yt[mi]||(Pe?.id===mi?Pe:null))||null,[mi,Pe,yt]);function jg(t){const a=yt[t]||(Pe?.id===t?Pe:null);if(!a)return;const n=a.workspaceId||u;jc(a.id),Vn(n),gi(a.projectId||""),Kn(a.icon||"")}function Eh(){jc(""),Vn(""),gi(""),Kn("")}function Cg(t){Vn(t),gi(a=>nh[a]?.workspaceId===t?a:"")}async function Ng(){if(!J.currentUser||!so)return;const t=Cc||so.workspaceId;if(!rh[t]){s({type:"error",message:"Choose an accessible workspace."});return}const a=Hn?nh[Hn]:null,n=a?.workspaceId===t?a.id:"",l=n&&x.find(P=>P.id===n)||null,h=l?.visibility||"workspace",m=h==="restricted"?ve(l?.memberUids?.length?l.memberUids:[J.currentUser.uid]):[],S=h==="restricted"?ve(m).filter(P=>P!==J.currentUser?.uid):[];le("document:settings");try{await Iw(so.id,{projectId:n||null,icon:Nc||void 0,visibility:h,memberUids:m,editMemberUids:h==="restricted"?m:[],notifyMode:h==="restricted"&&S.length>0?"selected":"all",notifyUids:S}),await Ze({workspaceId:t,actorUid:J.currentUser.uid,entityType:"document",entityId:so.id,action:"update",message:`Updated ${so.type==="note"?"note":"document"} settings for ${so.title}`,visibility:h,memberUids:m}),W(t),pe(n||"all"),Ce(n||""),be(""),He(""),ge(so.id),p("notes"),jt(!0),Nt(!1),Eh(),s({type:"success",message:`${so.type==="note"?"Note":"Document"} settings updated.`})}catch(P){s({type:"error",message:P instanceof Error?P.message:"Could not save document settings."})}finally{le("")}}const Je=r.useMemo(()=>ot.find(t=>t.id===bt)??null,[ot,bt]),Sg=r.useMemo(()=>Je?.checklist||[],[Je]),Dg=r.useMemo(()=>En(Je?Je.panelVariant:Ae),[Je,Ae]),Mg=r.useMemo(()=>ie==="moodboard"&&!!bt&&!Je&&!zr,[Je,ie,bt,zr]);r.useEffect(()=>{ie!=="moodboard"||!Je||Ye(En(Je.panelVariant))},[Je,ie]);const zt=r.useMemo(()=>{if(ie==="moodboard"&&Je)return{entityType:"document",entityId:Je.id,workspaceId:Je.workspaceId,label:Je.title?.trim()||"Mood Board",visibility:"workspace",memberUids:[]};if(ie==="notes"&&Pe){const t=Pe.referenceSourceDocumentId||Pe.id,a=(Pe.referenceSourceDocumentId?Pe.referenceSourceWorkspaceId:void 0)||Pe.workspaceId;return{entityType:"document",entityId:t,workspaceId:a,label:Pe.title?.trim()||"Untitled document",visibility:Pe.visibility,memberUids:Pe.memberUids}}return(ie==="tasks"||ie==="dashboard")&&j&&O!=="all"?{entityType:"project",entityId:j.id,workspaceId:j.workspaceId,label:j.name?.trim()||"Untitled item",visibility:j.visibility,memberUids:j.memberUids}:null},[ie,Pe,j,O]),Wr=r.useMemo(()=>{const t=fe.map(a=>a.authorUid);if(!zt)return[];if(ie==="notes"&&Pe){const a=ve(ze?.accessMemberUids||[]),n=ve([...Pe.memberUids||[],...Pe.editMemberUids||[],Pe.createdBy]),l=Pe.visibility==="restricted"?n:a;return ve([...l,...t]).filter(h=>h!==ce)}if(ie==="moodboard"&&Je){const a=Je.entityType==="project"?Qe[Je.entityId]:null,n=a?ve([...a.memberUids||[],a.createdBy,Je.createdBy]):ve([...ze?.accessMemberUids||[],Je.createdBy]);return ve([...n,...t]).filter(l=>l!==ce)}if(zt.entityType==="project"&&j){const a=ve(ze?.accessMemberUids||[]),n=ve([...j.memberUids||[],j.createdBy]),l=j.visibility==="restricted"?n:a;return ve([...l,...t]).filter(h=>h!==ce)}return[]},[Je,ie,fe,ce,zt,Pe,j,ze?.accessMemberUids,Qe]),Tl=r.useMemo(()=>Wr.map(t=>({uid:t,label:no[t]?.displayName||no[t]?.email||t})),[Wr,no]),jo=r.useMemo(()=>new Set(Wr),[Wr]),Fr=r.useMemo(()=>{if(ie==="notes"&&Pe){const t=ve(Array.isArray(Pe.notifyUids)&&Pe.notifyUids.length>0?Pe.notifyUids:[...Pe.editMemberUids||[],...Pe.memberUids||[]]).filter(a=>a!==ce);return{mode:Pe.notifyMode||(t.length>0?"selected":"all"),uids:t}}return{mode:"all",uids:[]}},[ie,ce,Pe]),Tg=r.useCallback(()=>fo==="none"?[]:fo==="selected"?ve(or.filter(t=>jo.has(t))):Wr,[jo,Wr,fo,or]);r.useEffect(()=>{const t=zt?`${zt.entityType}:${zt.entityId}`:"",a=ve(Fr.uids.filter(n=>jo.has(n)));hs(Fr.mode),Ni(a),ob(t)},[jo,Fr,zt]),r.useEffect(()=>{Ni(t=>t.filter(a=>jo.has(a)))},[jo]),r.useEffect(()=>{if(!zt)return;const t=`${zt.entityType}:${zt.entityId}`;if(Dd!==t)return;const a=ve(or.filter(l=>jo.has(l))),n=ve(Fr.uids.filter(l=>jo.has(l)));fo===Fr.mode&&a.join("|")===n.join("|")||ie==="notes"&&Pe&&Nw(Pe.id,fo,a)},[ie,jo,fo,Dd,or,Fr,zt,Pe]);const Il=O==="all"?Ia?.id||cr[0]?.id||"":O,qo=r.useMemo(()=>vo[Il]||It,[vo,Il,It]),Ig=r.useMemo(()=>O!=="all"?O:Ia?.id||cr[0]?.id||"",[cr,Ia?.id,O]),zg=r.useCallback(t=>{if(!t)return"Item";const a=Qe[t];if(!a)return"Item";const n=Ft(a,lt,St);return Bt(n,De).subjectLabel},[De,St,lt,Qe]),Uh=r.useMemo(()=>!!j&&(Ee||va==="full"||j.createdBy===ce),[ce,va,Ee,j]),Co=r.useMemo(()=>!j||!ce?!1:Ee||va==="full"||j.createdBy===ce?!0:j.visibility==="restricted"?ve(j.memberUids||[]).includes(ce):Or.has(ce),[ce,va,Ee,j,Or]),{handleSaveSelectedProjectDetails:Pg,handleSelectedProjectDescriptionBlur:$g,handleSelectedProjectColorSelect:Ag}=Fx({currentUserUid:ce,selectedWorkspaceId:u,selectedWorkspaceAccessMemberUids:ze?.accessMemberUids||[],selectedProject:j,selectedProjectIntent:ao,canEditSelectedProject:Uh,selectedProjectNameDraft:Li,selectedProjectDescriptionDraft:Rb,resolvedProjectDescriptionDraft:ml,setSelectedProjectDescriptionDraft:Os,selectedProjectColorDraft:da,setSelectedProjectColorDraft:Ws,selectedProjectStartDateDraft:Oi,selectedProjectDeadlineDraft:ua,selectedProjectSubmissionTimeDraft:Ro,selectedProjectTypeDraft:ar,selectedProjectValueAmountDraft:Ri,selectedProjectValueCurrencyDraft:_i,setProjects:I,setSelectedProjectColorMenuOpen:fa,setBusyKey:le,showToast:s}),{handleProjectActionMenu:Vo,closeActionMenu:wn,openProjectSettingsDialog:_a,handleSelectProject:ur,toggleProjectExpansion:Wa,handleExpandSidebar:Eg,handleCollapseSidebar:Ug,handleToggleProjectsGroup:Lg}=qx({setActionMenuProjectId:cb,setActionMenuPosition:ub,setProjectAccessDialogId:vr,setSelectedProjectId:pe,setSelectedNoteProjectId:Ce,setSelectedDocumentId:ge,setSelectedMoodBoardId:He,setActiveSection:p,setSelectedTaskId:be,setExpandedProjectIds:Tt,setSidebarCollapsed:Nt,setProjectsGroupExpanded:jt,resolveProjectMainPanelSection:ro}),Og=r.useCallback(t=>{t.preventDefault(),Oo.current={startX:t.clientX,startWidth:As},t.currentTarget.setPointerCapture(t.pointerId)},[As]),Rg=r.useCallback(t=>{if(!Oo.current||!Es.current)return;const a=t.clientX-Oo.current.startX,n=Math.min(600,Math.max(200,Oo.current.startWidth+a));Es.current.style.gridTemplateColumns=`${n}px 4px minmax(0, 1fr)`},[]),_g=r.useCallback(t=>{if(!Oo.current)return;const a=t.clientX-Oo.current.startX,n=Math.min(600,Math.max(200,Oo.current.startWidth+a));kb(n),localStorage.setItem("workhub:treePanelWidth",String(n)),Oo.current=null},[]),xn=r.useCallback(t=>{if(!t||!Vt||!Ne.some(P=>P.id===t))return"";const n=ac(Vt)[t]||"";if(!n)return"";const l=ic(n);if(!l)return"";const{pathname:h,search:m}=li(l);return wr(h,m).wsId===t?l:""},[Ne,Vt]),ut=r.useCallback((t,a=u,n="all")=>{if(pe(n||"all"),Ce(""),ge(""),He(""),be(""),$e(null),qe(t),p(t),jt(!0),Nt(!1),!a){W(""),i.pathname!=="/workhub"&&o("/workhub");return}W(a);const h=To(a,n||"all",t);`${i.pathname}${i.search}`!==h&&o(h)},[i.pathname,i.search,o,u]),yn=r.useCallback(t=>{ut("dashboard",t)},[ut]),Fa=r.useCallback(t=>{if(!t)return;$e(null),jt(!0),Nt(!1);const a=xn(t);if(!a){yn(t);return}const{pathname:n,search:l}=li(a),h=wr(n,l),m=yr(h.section)?h.section:"dashboard",S=h.projId&&h.projId!=="all"?h.projId:"all";pe(S),Ce(m==="notes"&&S!=="all"?S:""),ge(h.kind==="document"?h.entityId:""),He(h.kind==="moodboard"?h.entityId:""),be(h.kind==="task"?h.entityId:""),qe(m),p(m),W(t),`${i.pathname}${i.search}`!==a&&o(a)},[i.pathname,i.search,o,yn,xn]),Lh=r.useCallback(t=>{xf(a=>a.includes(t)?a.filter(n=>n!==t):[...a,t])},[]),Wg=r.useCallback(t=>{t&&(Lh(t),t!==u&&Fa(t))},[Fa,u,Lh]),Fg=r.useCallback((t,a)=>{if(!t||!a)return;const n=fr(a,ah);n.length>0&&Tt(h=>Array.from(new Set([...h,...n]))),W(t),pe(a),Ce(""),ge(""),He(""),be("");const l=ro(a);p(l),qe(l),jt(!0),Nt(!1),o(To(t,a,l))},[o,ro,be,ah]),{documentDialogOpen:Bg,documentTitleDraft:qg,setDocumentTitleDraft:Vg,documentBodyDraft:Hg,setDocumentBodyDraft:Kg,documentProjectIdDraft:Gg,setDocumentProjectIdDraft:Yg,openDocumentCreateDialog:Oh,closeDocumentCreateDialog:Xg,handleCreateDocument:Qg,createDocumentQuick:Jg,createNoteQuick:Zg}=Vx({currentUserUid:ce,selectedWorkspaceId:u,selectedProjectId:O,workspaceProjectById:Qe,setBusyKey:le,showToast:s,onDocumentCreated:(t,a)=>{a&&(pe(a),Ce(a)),ge(t),He(""),p("notes"),jt(!0),Nt(!1)}}),lo=Yx({projectId:fi||null,workspaceId:u,tasks:_,currentUserUid:ce,showToast:s}),ek=r.useMemo(()=>{if(!j)return!1;const t=j.projectType||"other",a=t==="tender"?j.submissionTime||Qt:"",n=Go(j),l=zo(j.valueCurrency),h=tc(Ri),m=zo(_i);return Li.trim()!==j.name||ml.trim()!==(j.description||"")||da!==j.color||Oi!==(j.projectStartDate||"")||ua!==(j.projectDeadline||"")||Ro!==a||ar!==t||h!==null&&h!==n||m!==l},[j,da,ml,ua,Li,Oi,Ro,ar,Ri,_i]),Ke=r.useMemo(()=>wr(i.pathname,i.search),[i.pathname,i.search]),vt=Ke.wsId,it=Ke.projId,No=Ke.entityId,Xt=r.useMemo(()=>yr(Ke.section)?Ke.section:"",[Ke.section]),Rh=r.useRef(null),_h=r.useRef(u),Wh=r.useRef(O),Fh=r.useRef(""),Bh=r.useRef(ie),Br=r.useMemo(()=>u?Ne.some(t=>t.id===u):!1,[u,Ne]);r.useEffect(()=>{if(!j){Eu(""),Ls(""),Os(""),Rs(""),_s({}),Ws(Lt[0]||Do[0]),Fs(""),Bs(""),ha(""),qs("other"),Vs("0"),Hs("OMR"),pa(""),Wi(""),Fi([]),Bi(""),fa(!1);return}const t=j.projectType||"other",a=Xw(ao,j.description||"");Ls(j.name),Os(j.description||""),Rs(a.narrative),_s(a.detailsByKey),Ws(j.color),Fs(j.projectStartDate||""),Bs(j.projectDeadline||""),ha(t==="tender"?j.submissionTime||Qt:""),Eu(j.id),qs(t),Vs(String(Go(j))),Hs(zo(j.valueCurrency)),pa(""),Wi(""),Fi([]),Bi(""),fa(!1)},[j?.color,j?.projectDeadline,j?.description,j?.id,j?.name,j?.projectStartDate,j?.submissionTime,j?.projectType,j?.valueAmount,j?.valueCurrency,j?.attachments,ao,Lt]);const co=r.useMemo(()=>j?.attachments||[],[j?.attachments]),tk=r.useCallback(async()=>{if(!j||!Co)return;const t=Gs.trim();if(!t)return;const a=Ks.trim(),n=Array.from(new Set([...co,t])),l={...j.attachmentTitles||{},[t]:a||Po(t)};le(`project-detail:${j.id}`);try{await Jt(j.id,{attachments:n,attachmentTitles:l}),pa(""),Wi("")}catch(h){const m=h instanceof Error?h.message:"Could not add attachment.";s({type:"error",message:m})}finally{le("")}},[Co,j,Gs,Ks,co,le,s]),ok=r.useCallback(async(t,a,n)=>{if(!j||!Co)return;const l=t.trim(),h=a.trim();if(!h){s({type:"error",message:"Attachment link cannot be empty."});return}if(!co.includes(l))return;const m=co.map(oe=>oe===l?h:oe),S=Array.from(new Set(m));if(S.length!==m.length){s({type:"error",message:"This link already exists in attachments."});return}const P={...j.attachmentTitles||{}},U=P[l]||Po(l),Q=n.trim()||U||Po(h);l!==h&&delete P[l],P[h]=Q,le(`project-detail:${j.id}`);try{await Jt(j.id,{attachments:S,attachmentTitles:P})}catch(oe){const xe=oe instanceof Error?oe.message:"Could not update attachment.";s({type:"error",message:xe})}finally{le("")}},[Co,Po,j,co,le,s]),rk=r.useCallback(async t=>{if(!j||!Co||!window.confirm("Remove this attachment?"))return;const a=co.filter(l=>l!==t),n={...j.attachmentTitles||{}};delete n[t],le(`project-detail:${j.id}`);try{await Jt(j.id,{attachments:a,attachmentTitles:Object.keys(n).length>0?n:{}})}catch(l){const h=l instanceof Error?l.message:"Could not remove attachment.";s({type:"error",message:h})}finally{le("")}},[Co,j,co,le,s]),qh=r.useCallback(async t=>new Promise((a,n)=>{const l=new FileReader;l.onload=()=>{const h=typeof l.result=="string"?l.result:"",m=h.includes(",")?h.split(",")[1]:h;if(!m){n(new Error("Could not read file data."));return}a(m)},l.onerror=()=>n(new Error("Could not read file data.")),l.readAsDataURL(t)}),[]),Vh=r.useCallback(async(t,a)=>{if(a.storageMethod==="drive"){const Q=await qh(t),oe=await Hr({projectId:a.id,projectName:a.name});return(await Ip({fileName:t.name,contentType:t.type||"application/octet-stream",dataBase64:Q,parentFolderId:oe.folderId})).url}const l=t.name.split(".").pop()||"bin",h=t.type.startsWith("image/"),m=t.type.startsWith("video/"),S=h?"images":m?"videos":"docs",P=`workhub-attachments/${a.workspaceId}/${a.id}/${S}/${crypto.randomUUID()}.${l}`,U=nc(cc,P);return await sc(U,t,{contentType:t.type||"application/octet-stream"}),await lc(U)},[qh]),ak=r.useCallback(async()=>{if(!(!j||!Co||ba.length===0)){Uu(!0),le(`project-detail:${j.id}`);try{const t=await Promise.all(ba.map(l=>Vh(l,j))),a=Array.from(new Set([...co,...t])),n={...j.attachmentTitles||{}};t.forEach((l,h)=>{const m=ba[h]?.name?.trim();m&&(n[l]=m)}),await Jt(j.id,{attachments:a,attachmentTitles:n}),pa(""),Fi([]),Bi("")}catch(t){const a=t instanceof Error?t.message:"Could not upload attachment.";s({type:"error",message:a})}finally{Uu(!1),le("")}}},[Co,j,ba,co,le,s,Vh]);r.useEffect(()=>{if(Lt.length===0)return;const t=Lt[0];ts(a=>Lt.includes(a)?a:t)},[Lt]),r.useEffect(()=>{vt&&V.some(t=>t.id===vt)&&u!==vt&&W(vt)},[vt,V]),r.useEffect(()=>{if(Ke.kind!=="workspace"&&Ke.kind!=="project")return;if(it==="all"){pe("all"),Ce("");return}Me.find(a=>a.id===it)&&(pe(it),Ce(it),Ke.kind==="project"&&(ge(""),He(""),be(""),p(ro(it))))},[Ke.kind,ro,it,Me]),r.useEffect(()=>{if(Ke.kind!=="workspace")return;const t=Rh.current;Rh.current=Xt,Xt&&t!==Xt&&(ge(""),He(""),be(""),qe(Xt),p(Xt))},[Ke.kind,Xt]),r.useEffect(()=>{if(!No)return;const t=it&&(it==="all"||rt.has(it))?it:"";if(Ke.kind==="document"){const a=yt[No];if(!a)return;if(a.projectId){const l=fr(a.projectId,Qe);Tt(h=>Array.from(new Set([...h,...l])))}const n=t||(a.projectId&&rt.has(a.projectId)?a.projectId:"all");pe(n),Ce(a.projectId||""),be(""),ge(a.id),He(""),p("notes");return}if(Ke.kind==="moodboard"){const a=ot.find(l=>l.id===No);if(!a)return;const n=t||(a.entityType==="project"&&rt.has(a.entityId)?a.entityId:"all");pe(n),Ce(a.entityType==="project"?a.entityId:""),He(a.id),ge(""),be(""),p("moodboard");return}if(Ke.kind==="task"){const a=_.find(l=>l.id===No);if(!a)return;if(a.projectId){const l=fr(a.projectId,Qe);Tt(h=>Array.from(new Set([...h,...l])))}const n=t||(a.projectId&&rt.has(a.projectId)?a.projectId:"all");pe(n),Ce(a.projectId||""),be(a.id),ge(""),He(""),p("tasks")}},[Ke.kind,No,it,_,rt,yt,ot,Qe]),r.useEffect(()=>{if(!u||!Br)return;const t=Bh.current;Bh.current=ie;const a=t!==ie;if(Ke.kind==="moodboard"&&!zr)return;const n=_h.current;_h.current=u;const l=n!==u,h=ie==="notes"?Re||O||"all":O||"all",m=Wh.current;Wh.current=h;const S=m!==h,P=ie==="notes"?k:ie==="moodboard"?bt:ie==="tasks"?Oe:"",U=Fh.current;Fh.current=P;const Q=U!==P;if(c==="POP"&&vt&&u===vt&&Xt&&ie!==Xt&&!a||c==="POP"&&!l&&!S&&!Q&&(vt&&u!==vt||it&&h!==it||Xt&&ie!==Xt||No&&P!==No)||it&&it!=="all"&&h!==it&&!S||P!==No&&!Q)return;const oe=h,xe=ie==="moodboard"&&!bt?"dashboard":ie;let _e=To(u,oe,xe,xe==="notes"?k:xe==="moodboard"?bt:xe==="tasks"?Oe:"");if(!Ke.wsId)if(Ke.section==="users")_e=To(u,oe,"users");else{const ho=xn(u);ho&&(_e=ho)}if(`${i.pathname}${i.search}`===_e)return;const nt=!Ke.wsId||Ke.source==="legacy";o(_e,{replace:nt})},[ie,Br,i.pathname,i.search,o,c,Ke.source,Ke.wsId,k,No,bt,Re,O,it,Xt,Oe,u,vt,zr,xn]),r.useEffect(()=>{if(!Vt||!u||!Br)return;const t=ic(`${i.pathname}${i.search}`);if(!t)return;const{pathname:a,search:n}=li(t);if(wr(a,n).wsId!==u)return;const h=ac(Vt);h[u]!==t&&Mp(Vt,{...h,[u]:t})},[Br,i.pathname,i.search,u,Vt]),r.useEffect(()=>{if(!Vt||F||y?.status!=="approved")return;const t=ac(Vt);if(Object.keys(t).length===0)return;const a=new Set(Ne.map(h=>h.id)),n={};let l=!1;Object.entries(t).forEach(([h,m])=>{if(!a.has(h)){l=!0;return}const S=ic(m);if(!S){l=!0;return}const{pathname:P,search:U}=li(S);if(wr(P,U).wsId!==h){l=!0;return}n[h]=S,S!==m&&(l=!0)}),!(!l&&Object.keys(n).length===Object.keys(t).length)&&Mp(Vt,n)},[y?.status,F,Ne,Vt]),r.useEffect(()=>{if(!(!Et||!u))try{const t=localStorage.getItem(Et),a=t?JSON.parse(t):{};localStorage.setItem(Et,JSON.stringify({...a,[u]:O||"all"}))}catch{}},[Et,O,u]),r.useEffect(()=>{if(Et)try{const t=localStorage.getItem(Et);if(!t)return;const a=JSON.parse(t),n=new Set(V.map(S=>S.id)),l=new Map(x.map(S=>[S.id,S])),h={};let m=!1;if(Object.entries(a).forEach(([S,P])=>{if(!n.has(S)){m=!0;return}if(P==="all"){h[S]="all";return}const U=l.get(P);if(!U||U.workspaceId!==S){m=!0;return}h[S]=P}),!m&&Object.keys(h).length===Object.keys(a).length)return;if(Object.keys(h).length===0){localStorage.removeItem(Et);return}localStorage.setItem(Et,JSON.stringify(h))}catch{}},[Et,x,V]),r.useEffect(()=>{if(!(it||!Et||!u||!Br))try{const t=localStorage.getItem(Et);if(!t)return;const n=JSON.parse(t)[u]||"";if(!n)return;if(n==="all"){O!=="all"&&pe("all");return}Me.some(l=>l.id===n)&&O!==n&&(pe(n),Ce(n))}catch{}},[Br,Et,O,it,u,Me]),r.useEffect(()=>{if(nr){if(!u){localStorage.removeItem(nr);return}localStorage.setItem(nr,u)}},[u,nr]),r.useEffect(()=>{if(!(u&&Ne.some(t=>t.id===u))){if(vt&&Ne.some(t=>t.id===vt)){u!==vt&&W(vt);return}if(!u&&nr){const t=localStorage.getItem(nr)||"";if(t&&Ne.some(a=>a.id===t)){W(t);return}}W(Ne[0]?.id||"")}},[u,vt,Ne,nr]),r.useEffect(()=>{O!=="all"&&(Me.some(t=>t.id===O)||pe("all"))},[O,Me]),r.useEffect(()=>{if(!O||O==="all")return;const t=fr(O,Ca);t.length!==0&&Tt(a=>Array.from(new Set([...a,...t])))},[O,Ca]),r.useEffect(()=>{if(!u){Tt([]);return}if(Na.length===0){Tt([]);return}const t=Hu();if(Object.prototype.hasOwnProperty.call(t,u)){const n=t[u]||[],l=new Set(Me.map(m=>m.id)),h=n.filter(m=>l.has(m));Tt(h);return}const a=Na.map(n=>n.id).filter(n=>!uh.includes(n));Tt(a)},[uh,Lr,u,Na,Me]),r.useEffect(()=>{if(!(!Lr||!u))return ka.current&&clearTimeout(ka.current),ka.current=setTimeout(()=>{const t=Hu(),a=new Set(V.map(S=>S.id)),l=Object.entries(t).filter(([S])=>a.size===0||a.has(S)).slice(-120),h=Object.fromEntries(l),m=Array.from(new Set(Uo)).slice(0,Vu);localStorage.setItem(Lr,JSON.stringify({...h,[u]:m}))},220),()=>{ka.current&&clearTimeout(ka.current)}},[Uo,Lr,u,V]),r.useEffect(()=>{jt(!0)},[u]),r.useEffect(()=>{Re&&Me.some(t=>t.id===Re)||Ce(Me[0]?.id||"")},[Re,Me]),r.useEffect(()=>{if(!ne||u!==ne.workspaceId)return;if(k&&k!==ne.id){$e(null);return}const t=yt[ne.id];if(!t)return;const a=t.projectId&&rt.has(t.projectId)?t.projectId:"all";if(t.projectId){const n=fr(t.projectId,Qe);Tt(l=>Array.from(new Set([...l,...n])))}pe(a),Ce(t.projectId||""),be(""),ge(t.id),He(""),p("notes"),jt(!0),Nt(!1),K.some(n=>n.id===ne.id&&n.workspaceId===ne.workspaceId)&&$e(null)},[K,ne,k,u,rt,yt,Qe]),r.useEffect(()=>{k&&(yt[k]||ne?.id!==k&&ge(""))},[ne,k,u,yt]),r.useEffect(()=>{bt&&zr&&(ot.some(t=>t.id===bt)||(ie==="moodboard"&&p("dashboard"),He("")))},[ie,bt,ot,zr]),r.useEffect(()=>{Le!=="all"&&(vh.has(Le)||Fe("all"))},[vh,Le]),r.useEffect(()=>{ht!=="all"&&(io.some(t=>t.id===ht)||Qr("all"))},[io,ht]),r.useEffect(()=>{const t={};io.forEach(a=>{t[a.id]=Cp}),yd(t)},[io]),r.useEffect(()=>{Ao&&wt.some(t=>t.id===Ao)||Xr(Rr)},[Rr,Ao,wt]),r.useEffect(()=>{ht!=="all"&&(wt.some(t=>t.id===ht)||Qr("all"))},[ht,wt]),r.useEffect(()=>{Jr&&(Zr(wt.map(t=>({...t}))),er(wt[0]?.id||""))},[Jr,wt]),r.useEffect(()=>{if(Jr){if(!Zo&&st[0]?.id){er(st[0].id);return}Zo&&st.some(t=>t.id===Zo)||er(st[0]?.id||"")}},[Zo,Jr,st]),r.useEffect(()=>{eo||!ce||qo.some(t=>t.uid===ce)&&Nr(ce)},[ce,eo,qo]),r.useEffect(()=>{if(qo.length===0){eo&&Nr("");return}if(eo&&qo.some(a=>a.uid===eo))return;if(ce&&qo.some(a=>a.uid===ce)){eo!==ce&&Nr(ce);return}const t=qo[0]?.uid||"";t!==eo&&Nr(t)},[ce,eo,qo]),r.useEffect(()=>{Se&&(zc(Se.name),$c(Se.description||""),Ec(Se.treeMetaDisplayMode||"counts"),Lc(Se.taskDueDisplayMode||"remaining"),Rc(Se.activityWindowDays??30),Wc(Se.moodBoardEnabled!==!1),Bc(Se.showProjectColorDots!==!1),xi(Qa(yo.id,Se.projectColorMeanings)),qc(ve(Se.accessMemberUids||[])),Hc(Se.memberAccessLevels||{}),Kc(ui(Se.invitedEmails||[])),Qn(""),Xc(""),Jc(""),ed(!1))},[Se,yo.id]),r.useEffect(()=>{if(!ae)return;const t=ae.projectType||"other";Ed(ae.name),Ld(ae.description||""),Od(ae.color),bs(ae.parentProjectId||""),Rd(ae.projectDeadline||""),Ii(t==="tender"?ae.submissionTime||Qt:""),_d(t),Fd(ae.priority||"medium"),Xd(ae.tenderNumber||""),Jd(ae.proposalId||""),eu(ae.technicalProposalUrl||""),ou(ae.financialProposalUrl||""),qd(String(Go(ae))),Hd(zo(ae.valueCurrency)),ru(ae.mainPanelView||"tasks"),ms(ae.taskItemDisplayMode||"inherit"),Gd(Array.isArray(ae.taskStatuses)&&ae.taskStatuses.length>0?ae.taskStatuses.map(a=>({...a})):null),iu(ae.clientId||""),lu(ae.storageMethod||"firebase"),Pd(ae.visibility||"workspace"),$d(ae.memberUids||[]),$r(!1)},[ae]),r.useEffect(()=>{if(!ae?.id||!u||!ce){ia(Zl);return}return Sw(ae.id,ce,t=>{if(!t){ia(Zl);return}ia(ec(t))})},[ce,ae?.id,u]),r.useEffect(()=>{if(!_r.includes("running")){$r(!1);return}(!Ve||$a)&&$r(!1)},[$a,Ve,_r]),r.useEffect(()=>{!u||!ze||!Ee||Array.isArray(ze.taskStatuses)&&ze.taskStatuses.length>0||el.current.has(u)||(el.current.add(u),$o(u,{taskStatuses:Qw()}).catch(()=>{el.current.delete(u)}))},[Ee,ze,u]),r.useEffect(()=>{if(pt==="__new__")return;if(!D.length){na(""),ks(""),xs(""),ys(""),js(""),Ns(""),Ds(""),Ts(""),$i(""),Ps("");return}if(!pt||!Ut[pt]){na(D[0].id);return}const t=Ut[pt];ks(t.name||""),xs(t.contactPerson||""),ys(t.email||""),js(t.phone||""),Ns(t.website||""),Ds(t.address||""),Ts(t.industry||""),$i(t.logoUrl||""),Ps(t.notes||"")},[Ut,D,pt]),r.useEffect(()=>{jr==="restricted"&&Cr.length===0&&ce&&ls([ce])},[ce,Cr.length,jr]),r.useEffect(()=>{if(as==="tender"){yi||Yr(Qt);return}yi&&Yr("")},[yi,as]),r.useEffect(()=>{if($t==="tender"){Ir||Ii(Qt);return}Ir&&Ii("")},[Ir,$t]),r.useEffect(()=>{if(ar==="tender"){Ro||ha(Qt);return}Ro&&ha("")},[Ro,ar]),r.useEffect(()=>{if(!J.currentUser||!Yi)return;if(y?.status==="approved"&&y.role==="admin"){Mr(!1);return}if(F||zd)return;let t=!1;const a=window.setTimeout(()=>{t||Mr(!1)},8e3);return ps(!0),Mr(!0),dp().then(n=>{t||q(n)}).catch(n=>{if(t)return;const l=n instanceof Error?n.message:"Could not prepare your WorkHub admin access.";s({type:"error",message:l})}).finally(()=>{t||(clearTimeout(a),Mr(!1))}),()=>{t=!0,clearTimeout(a)}},[Yi,zd,y?.role,y?.status,F,s]);async function Hh(){H(!0);try{const t=await dp();q(t),s({type:"success",message:t.status==="approved"?"Your WorkHub access is ready.":"Your WorkHub access request was submitted."})}catch(t){const a=t instanceof Error?t.message:"Could not request access.";s({type:"error",message:a})}finally{H(!1)}}async function ik(){if(J.currentUser){if(!ki.trim()){s({type:"error",message:"Workspace name is required."});return}le("workspace");try{const t=await zw({name:ki.trim(),description:Dc.trim(),type:ch.workspaceType,templateId:ch.id,createdBy:J.currentUser.uid}),a=ve([...Mh,J.currentUser.uid]),n=Mh.reduce((h,m)=>(h[m]="full",h),{}),l={accessMemberUids:a,memberAccessLevels:n};dh.length>0&&(l.taskStatuses=dh),await $o(t,{...l}),await Ze({workspaceId:t,actorUid:J.currentUser.uid,entityType:"workspace",entityId:t,action:"create",message:`Created workspace ${ki.trim()}`}),Sc(""),Mc(""),Ic(pp),W(t),qn(!1),p("home"),s({type:"success",message:"Workspace created."})}catch(t){const a=t instanceof Error?t.message:"Could not create workspace.";s({type:"error",message:a})}finally{le("")}}}const nk=r.useCallback((t,a)=>{xi(n=>n.map((l,h)=>h!==t?l:{...l,...a}))},[]),sk=r.useCallback(t=>{xi(a=>a.length<=1?a:a.filter((n,l)=>l!==t))},[]),lk=r.useCallback(()=>{xi(vl.map(t=>({...t})))},[vl]);async function ck(){if(!J.currentUser||!Se)return;if(!wi.trim()){s({type:"error",message:"Workspace name is required."});return}const t=Gn.length>0?Gn:vl,a=[];for(let h=0;h<t.length;h+=1){const m=t[h],S=(m.color||"").trim().toLowerCase(),P=(m.label||"").trim(),U=(m.hint||"").trim();if(!ii(S)){s({type:"error",message:`Color ${h+1} must be a valid hex value.`});return}if(!P){s({type:"error",message:`Color ${h+1} label is required.`});return}if(!U){s({type:"error",message:`Color ${h+1} meaning is required.`});return}a.push({color:S,label:P,hint:U})}const n=Se,l={name:wi.trim(),description:Pc.trim(),treeMetaDisplayMode:Ac,taskDueDisplayMode:Uc,activityWindowDays:Oc,moodBoardEnabled:_c,showProjectColorDots:Fc,projectColorMeanings:a,accessMemberUids:ve(Yn),invitedEmails:ui(Xn)};b(h=>h.map(m=>m.id===Se.id?{...m,...l}:m)),le(`workspace-settings:${Se.id}`);try{await $o(Se.id,l),await Ze({workspaceId:Se.id,actorUid:J.currentUser.uid,entityType:"workspace",entityId:Se.id,action:"update",message:`Updated workspace ${wi.trim()}`}),bi(""),s({type:"success",message:"Workspace settings updated."})}catch(h){b(S=>S.map(P=>P.id===n.id?n:P));const m=h instanceof Error?h.message:"Could not update workspace settings.";s({type:"error",message:m})}finally{le("")}}async function dk(){if(!(!J.currentUser||!Se)){if(Yc.trim()!==Se.name||Qc.trim()!=="DELETE WORKSPACE"||!Zc){s({type:"error",message:"Complete all deletion confirmations exactly."});return}le(`workspace-delete:${Se.id}`);try{if(await Pw(Se.id),u===Se.id){const t=V.find(a=>a.id!==Se.id);yn(t?.id||"")}bi(""),s({type:"success",message:"Workspace deleted."})}catch(t){const a=t instanceof Error?t.message:"Could not delete workspace.";s({type:"error",message:a})}finally{le("")}}}function vn(t){t!==u&&yn(t),bi(t)}function jn(t){return t.trim().toLocaleLowerCase().replace(/\s+/g," ")}async function Cn(t,a,n){const l=n||u;if(!J.currentUser||!l)return null;const h=t.trim();if(!h)return s({type:"error",message:"Client name is required."}),null;const m=jn(h),S=D.find(P=>P.workspaceId===l&&jn(P.name)===m);if(S)return s({type:"error",message:"A client with this name already exists."}),S.id;le("client:create");try{const P=await $w({workspaceId:l,name:h,contactPerson:(a?.contactPerson||"").trim(),email:(a?.email||"").trim(),phone:(a?.phone||"").trim(),website:(a?.website||"").trim(),address:(a?.address||"").trim(),industry:(a?.industry||"").trim(),logoUrl:(a?.logoUrl||"").trim(),notes:(a?.notes||"").trim(),createdBy:J.currentUser.uid});return s({type:"success",message:"Client added."}),P}catch(P){const U=P instanceof Error?P.message:"Could not create client.";return s({type:"error",message:U}),null}finally{le("")}}async function uk(){if(!pt)return;const t=gs.trim();if(!t){s({type:"error",message:"Client name is required."});return}const a=D.find(h=>h.id===pt)||null;if(a){const h=jn(t);if(D.find(S=>S.id!==pt&&S.workspaceId===a.workspaceId&&jn(S.name)===h)){s({type:"error",message:"A client with this name already exists."});return}}if(la.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(la.trim())){s({type:"error",message:"Enter a valid client email."});return}const n=D.find(h=>h.id===pt)||null,l={name:t,contactPerson:ws.trim(),email:la.trim(),phone:vs.trim(),website:Cs.trim(),address:Ss.trim(),industry:Ms.trim(),logoUrl:Is.trim(),notes:zs.trim()};N(h=>h.map(m=>m.id===pt?{...m,...l}:m)),le(`client:save:${pt}`);try{await Aw(pt,l),s({type:"success",message:"Client details updated."})}catch(h){n&&N(S=>S.map(P=>P.id===n.id?n:P));const m=h instanceof Error?h.message:"Could not save client details.";s({type:"error",message:m})}finally{le("")}}async function hk(){!pt||pt==="__new__"||cu(pt)}function Ba(){cu("")}async function pk(){if(!Lo)return;if(!Ut[Lo]){Ba();return}if(x.filter(n=>n.clientId===Lo).length>0){s({type:"error",message:"Unassign this client from projects before deleting it."});return}le(`client:delete:${Lo}`);try{await Ew(Lo),na(""),Ba(),s({type:"success",message:"Client deleted."})}catch(n){const l=n instanceof Error?n.message:"Could not delete client.";s({type:"error",message:l})}finally{le("")}}async function bk(){const t=u||Ne[0]?.id||"";if(!t){s({type:"error",message:"Select a workspace before creating a client."});return}const a=await Cn(gs,{contactPerson:ws,email:la,phone:vs,website:Cs,address:Ss,industry:Ms,logoUrl:Is,notes:zs},t);a&&na(a)}async function fk(t){if(!u)return;if(!t.type.startsWith("image/")){s({type:"error",message:"Please select an image file for the logo."});return}const a=4*1024*1024;if(t.size>a){s({type:"error",message:"Logo size must be 4 MB or smaller."});return}const n=t.name.split(".").pop()||"png",l=`workhub-clients/${u}/logos/${crypto.randomUUID()}.${n}`;le("client:logo-upload");try{const h=nc(cc,l);await sc(h,t,{contentType:t.type});const m=await lc(h);$i(m),s({type:"success",message:"Client logo uploaded."})}catch(h){const m=h instanceof Error?h.message:"Could not upload client logo.";s({type:"error",message:m})}finally{le("")}}async function Kh(t){if(!J.currentUser||!u)return;if(!Jn.trim()){s({type:"error",message:"Folder name is required."});return}if(!ii(es)){s({type:"error",message:"Pick a valid project color."});return}const a=id.trim(),n=nd.trim();if(a&&n&&dc(a,n)){s({type:"error",message:"Deadline cannot be earlier than the start date."});return}const l=jr==="restricted"?ve(Cr.length>0?Cr:[J.currentUser.uid]):[],h=t?.keepDialogOpen===!0||!cd,m=od,S="project";le("project");try{const P=Jn.trim(),U=await Kl({workspaceId:u,parentProjectId:m||null,intent:S,name:P,description:rd.trim(),color:es,projectStartDate:a,projectDeadline:n,projectType:"other",submissionTime:"",priority:sd,clientId:ld,visibility:jr,memberUids:l,storageMethod:ud,createdBy:J.currentUser.uid});if(await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"project",entityId:U,action:"create",message:`Created folder ${P}`,visibility:jr,memberUids:l}),Hr({projectId:U,projectName:P}).catch(oe=>{console.error("Failed to create drive folder:",oe)}),td(""),ad(""),!h){Zn(""),os(""),rs(""),Yr(""),is("other"),ns("medium"),ss("");const oe=Lt.length>0?Lt:Do;ts(oe[Math.floor(Math.random()*oe.length)]),dd("workspace"),ls([])}pe(U),Ce(U),h||Gr(!1),Tt(oe=>Array.from(new Set([...oe,...m?[m]:[],U]))),p("home");const Q=ze?.name?.trim()||"current workspace";s({type:"success",message:`Folder created in ${Q}.`})}catch(P){const U=P instanceof Error?P.message:"Could not create folder.";s({type:"error",message:U})}finally{le("")}}const mk=r.useCallback(async t=>{if(!ce||!u||!ae)return;const a=zi,n=ec({...zi,...t});ia(n),nu(!0);try{await Dw({workspaceId:u,projectId:ae.id,userUid:ce,enabled:n.enabled,taskCreated:n.taskCreated,taskCompleted:n.taskCompleted,folderCompleted:n.folderCompleted,delivery:n.delivery}),s({type:"success",message:"Folder notification preferences updated."})}catch(l){ia(a);const h=l instanceof Error?l.message:"Could not save folder notification preferences.";s({type:"error",message:h})}finally{nu(!1)}},[ce,u,ae,zi,s]),Nn=r.useCallback((t,a)=>{const l=(mh.get(t)||wt).find(m=>m.id===a),h=`${a} ${l?.label||""}`.toLowerCase();return h.includes("done")||h.includes("complete")||h.includes("closed")},[mh,wt]),Gh=r.useCallback((t,a)=>{const n=Yl(t,ko);let l=0,h=0;return a.forEach(m=>{n.has(m.projectId)&&(h+=1,Nn(m.projectId,m.status)&&(l+=1))}),{done:l,total:h}},[Nn,ko]),Yh=r.useCallback(async(t,a)=>{const n=await Mw(t.id);if(n.length===0)return{inAppOnly:[],withEmail:[]};const l=new Set(Ht.map(S=>S.uid));if(t.visibility==="restricted"){const S=new Set(ve([...t.memberUids||[],t.createdBy]));Array.from(l).forEach(P=>{S.has(P)||l.delete(P)})}const h=[],m=[];return n.forEach(S=>{if(!l.has(S.userUid))return;const P=ec(S);!P.enabled||!(a==="task_created"?P.taskCreated:a==="task_completed"?P.taskCompleted:P.folderCompleted)||(P.delivery==="both"?m.push(S.userUid):h.push(S.userUid))}),{inAppOnly:Array.from(new Set(h)),withEmail:Array.from(new Set(m))}},[Ht]),Sn=r.useCallback(async t=>{if(J.currentUser)try{const a=await Yh(t.project,t.eventType);await Promise.all([a.inAppOnly.length>0?bo({workspaceId:t.project.workspaceId,actorUid:J.currentUser.uid,recipientUids:a.inAppOnly,entityType:"project",entityId:t.entityId,projectId:t.project.id,action:t.action,message:t.message,delivery:"in_app"}):Promise.resolve(),a.withEmail.length>0?bo({workspaceId:t.project.workspaceId,actorUid:J.currentUser.uid,recipientUids:a.withEmail,entityType:"project",entityId:t.entityId,projectId:t.project.id,action:t.action,message:t.message,delivery:"both"}):Promise.resolve()])}catch(a){console.error("Failed to send folder event notifications:",a)}},[Yh]);async function gk(){if(!J.currentUser||!u)return;const t=gp(hd);if(t.length===0){s({type:"error",message:"Task title is required."});return}if(!Me[0]&&O==="all"){s({type:"error",message:"Create a project first."});return}const a=O!=="all"?Ca[O]||null:Ia||Me[0]||null,n=a?.id||"";if(!n){s({type:"error",message:"Pick a project for the task."});return}const l=new Set((vo[n]||It).map(P=>P.uid)),h=eo||J.currentUser.uid,m=ve([...a?.memberUids||[],h]).filter(P=>P!==J.currentUser?.uid),S=m.length>0?"selected":"all";if(h&&!Ee&&!l.has(h)){s({type:"error",message:"Assignee must be a member of the selected project."});return}le("task");try{const P=$n(_,u,Ao),U=[];t.length>1&&Eo({total:t.length,created:0,source:"dialog"});for(const[oe,xe]of t.entries()){const Be=await up({workspaceId:u,projectId:n,sortOrder:P+oe,title:xe,description:bd.trim(),visibility:a?.visibility||"workspace",memberUids:a?.memberUids||[],status:Ao,priority:md,assigneeUid:h,assigneeUids:[h],startDate:kd,dueDate:wd,notifyMode:S,notifyUids:m,createdBy:J.currentUser.uid});U.push(Be),t.length>1&&Eo({total:t.length,created:oe+1,source:"dialog"}),await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"task",entityId:Be,action:"create",message:`Created task ${xe}`,visibility:a?.visibility||"workspace",memberUids:a?.memberUids||[]});const _e=ve(S==="selected"?m:[...a?.memberUids||[],h]).filter(ft=>ft!==J.currentUser?.uid);_e.length>0&&await bo({workspaceId:u,actorUid:J.currentUser.uid,recipientUids:_e,entityType:"task",entityId:Be,action:"task_created",message:`created task "${ct(xe)||"Untitled task"}"`}),a&&await Sn({project:a,eventType:"task_created",entityId:a.id,action:"folder_task_created",message:`created task "${ct(xe)||"Untitled task"}" in folder "${a.name}"`})}pd(""),fd(""),Xr(Rr),gd("medium"),Nr(J.currentUser.uid);const Q=Xo();cs(Q),vi(ti(Q,1)),U.length>0&&be(U[U.length-1]),Gr(!1),p("tasks"),s({type:"success",message:U.length===1?"Task created.":`${U.length} tasks created.`}),t.length>1&&window.setTimeout(()=>Eo(null),400)}catch(P){const U=P instanceof Error?P.message:"Could not create task.";s({type:"error",message:U}),Eo(null)}finally{le("")}}async function kk(t){if(!J.currentUser||!u)return;const a=gp(t.title);if(a.length===0)return!1;const n=t.projectId||(O!=="all"?O:Ia?.id||Me[0]?.id||""),l=Me.find(U=>U.id===n)||null;if(!l)return s({type:"error",message:"Select a project first."}),!1;const h=new Set((vo[l.id]||It).map(U=>U.uid)),m=t.assigneeUid||J.currentUser.uid,S=ve([...l.memberUids||[],m]).filter(U=>U!==J.currentUser?.uid),P=S.length>0?"selected":"all";if(m&&!Ee&&!h.has(m))return s({type:"error",message:"Assignee must be a member of the selected project."}),!1;try{const U=$n(_,u,t.statusId),Q=[];a.length>1&&Eo({total:a.length,created:0,source:"quick-add"});for(const[oe,xe]of a.entries()){const Be=await up({workspaceId:u,projectId:l.id,sortOrder:U+oe,title:xe,description:"",visibility:l.visibility||"workspace",memberUids:l.memberUids||[],status:t.statusId,priority:t.priority,assigneeUid:m,assigneeUids:[m],startDate:Xo(),dueDate:t.dueDate||ti(Xo(),1),valueAmount:Kt==="finance"?t.valueAmount:void 0,valueCurrency:Kt==="finance"?t.valueCurrency||"OMR":void 0,notifyMode:P,notifyUids:S,createdBy:J.currentUser.uid});Q.push(Be),a.length>1&&Eo({total:a.length,created:oe+1,source:"quick-add"}),await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"task",entityId:Be,action:"create",message:`Created task ${xe}`,visibility:l.visibility||"workspace",memberUids:l.memberUids||[]});const _e=ve(P==="selected"?S:[...l.memberUids||[],m]).filter(ft=>ft!==J.currentUser?.uid);_e.length>0&&await bo({workspaceId:u,actorUid:J.currentUser.uid,recipientUids:_e,entityType:"task",entityId:Be,action:"task_created",message:`created task "${ct(xe)||"Untitled task"}"`}),await Sn({project:l,eventType:"task_created",entityId:l.id,action:"folder_task_created",message:`created task "${ct(xe)||"Untitled task"}" in folder "${l.name}"`})}return Q.length>0&&be(Q[Q.length-1]),p("tasks"),Q.length>1&&(s({type:"success",message:`${Q.length} tasks created.`}),window.setTimeout(()=>Eo(null),400)),!0}catch(U){const Q=U instanceof Error?U.message:"Could not create task.";return s({type:"error",message:Q}),Eo(null),!1}}async function Xh(t,a,n){if(!J.currentUser)return;const l=vo[t.projectId]||It,h=new Set(l.map(U=>U.uid));if(typeof a.assigneeUid=="string"&&a.assigneeUid!==t.assigneeUid&&a.assigneeUid&&!Ee&&!h.has(a.assigneeUid)){s({type:"error",message:"Assignee must be a member of this project."});return}if(Array.isArray(a.assigneeUids)&&!Ee&&a.assigneeUids.some(Q=>!h.has(Q))){s({type:"error",message:"All assignees must be members of this project."});return}le("task");const m={...a};a.status&&a.status!==t.status&&typeof m.sortOrder!="number"&&(m.sortOrder=$n(_,u,a.status));const S=t;B(U=>U.map(Q=>Q.id!==t.id?Q:{...Q,...m,updatedAt:new Date().toISOString()}));const P=(U,Q)=>{const oe={...U,...Q},xe=ve([...oe.assigneeUids||[],oe.assigneeUid]),Be=ve([...oe.memberUids||[],oe.createdBy,...xe]),_e=oe.notifyMode||"all";return _e==="none"?[]:_e==="selected"?ve(Array.isArray(oe.notifyUids)?oe.notifyUids:[]).filter(nt=>Be.includes(nt)&&nt!==J.currentUser?.uid):Be.filter(ft=>ft!==J.currentUser?.uid)};try{await ci(t.id,m);const U=typeof a.status=="string"&&a.status!==t.status,Q=Ca[t.projectId]||null;if(U&&Q){const Te=Nn(t.projectId,t.status),gt=Nn(t.projectId,a.status);if(!Te&&gt){const Va=typeof a.title=="string"&&a.title.trim()?a.title.trim():t.title,Ha=_.map(Vr=>Vr.id===t.id?{...Vr,...m}:Vr),Ka=Gh(Q.id,_),Ga=Gh(Q.id,Ha);await Sn({project:Q,eventType:"task_completed",entityId:Q.id,action:"folder_task_completed",message:`completed task "${ct(Va)||"Untitled task"}" in folder "${Q.name}"`}),Ka.total>0&&Ga.total>0&&Ka.done<Ka.total&&Ga.done>=Ga.total&&await Sn({project:Q,eventType:"folder_completed",entityId:Q.id,action:"folder_completed",message:`folder "${Q.name}" reached 100% task completion`})}}const oe=[],xe=Te=>Array.isArray(Te)?Te.map(gt=>typeof gt=="string"?gt.trim():"").filter(Boolean).sort():[],Be=(Te,gt)=>Te.length===gt.length&&Te.every((Va,Ha)=>Va===gt[Ha]);if(typeof a.status=="string"&&a.status!==t.status&&oe.push("status"),typeof a.priority=="string"&&a.priority!==t.priority&&oe.push("priority"),typeof a.assigneeUid=="string"&&a.assigneeUid!==t.assigneeUid&&oe.push("assignee"),Array.isArray(a.assigneeUids)&&oe.push("assignees"),typeof a.startDate=="string"&&a.startDate!==t.startDate&&oe.push("start date"),typeof a.dueDate=="string"&&a.dueDate!==t.dueDate&&oe.push("due date"),typeof a.dueTime=="string"&&a.dueTime!==(t.dueTime||"")&&oe.push("due time"),typeof a.title=="string"&&a.title.trim()!==t.title.trim()&&oe.push("title"),typeof a.description=="string"&&a.description.trim()!==(t.description||"").trim()&&oe.push("description"),Object.prototype.hasOwnProperty.call(a,"attachments")){const Te=xe(t.attachments),gt=xe(a.attachments);Be(Te,gt)||oe.push("attachments")}if(Object.prototype.hasOwnProperty.call(a,"links")){const Te=xe(t.links),gt=xe(a.links);Be(Te,gt)||oe.push("links")}const _e=xe(t.attachments),ft=Object.prototype.hasOwnProperty.call(a,"attachments")?xe(a.attachments):_e,nt=ft.filter(Te=>!_e.includes(Te)).length,ho=_e.filter(Te=>!ft.includes(Te)).length,Ho=xe(t.links),pr=Object.prototype.hasOwnProperty.call(a,"links")?xe(a.links):Ho,So=pr.filter(Te=>!Ho.includes(Te)).length,Ko=Ho.filter(Te=>!pr.includes(Te)).length,br=Pt(t),Ue=Array.isArray(a.checklist)?a.checklist:br,po=new Map(br.map(Te=>[Te.id,Te])),mt=Ue.filter(Te=>!po.has(Te.id)).length,zn=Ue.filter(Te=>{const gt=po.get(Te.id);return!!gt&&!gt.completed&&!!Te.completed}).length,tt=[];if(oe.includes("status")&&tt.push("status changed"),oe.includes("priority")&&tt.push("priority changed"),(oe.includes("assignee")||oe.includes("assignees"))&&tt.push("assignees updated"),(oe.includes("due date")||oe.includes("due time"))&&tt.push("due schedule updated"),oe.includes("title")&&tt.push("title updated"),oe.includes("description")&&tt.push("description updated"),nt>0&&tt.push(`attachment${nt===1?"":"s"} added`),ho>0&&tt.push(`attachment${ho===1?"":"s"} removed`),oe.includes("attachments")&&nt===0&&ho===0&&tt.push("attachments updated"),So>0&&tt.push(`link${So===1?"":"s"} added`),Ko>0&&tt.push(`link${Ko===1?"":"s"} removed`),oe.includes("links")&&So===0&&Ko===0&&tt.push("links updated"),mt>0&&tt.push(`checklist item${mt===1?"":"s"} added`),zn>0&&tt.push(`checklist item${zn===1?"":"s"} completed`),oe.length>0&&u){const Te=P(t,m);Te.length>0&&tt.length>0&&await bo({workspaceId:u,actorUid:J.currentUser.uid,recipientUids:Te,entityType:"task",entityId:t.id,action:"task_update",message:`updated task "${ct(t.title||"")||"Untitled task"}": ${tt.join(", ")}`})}else if(u&&tt.length>0){const Te=P(t,m);Te.length>0&&await bo({workspaceId:u,actorUid:J.currentUser.uid,recipientUids:Te,entityType:"task",entityId:t.id,action:"task_update",message:`updated task "${ct(t.title||"")||"Untitled task"}": ${tt.join(", ")}`})}n?.silent||s({type:"success",message:"Task updated."}),a.status&&a.status!==t.status&&be("")}catch(U){B(oe=>oe.map(xe=>xe.id===t.id?S:xe));const Q=U instanceof Error?U.message:"Could not update task.";s({type:"error",message:Q})}finally{le("")}}function zl(){ma([]),Js(!1)}async function wk(t){if(!(!J.currentUser||!u||xt.length===0)){le("bulk-task");try{const a=$n(_,u,t);await Promise.all(xt.map((n,l)=>{const h={status:t};return n.status!==t&&(h.sortOrder=a+l),ci(n.id,h)})),await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"task",entityId:xt[0].id,action:"bulk_status_update",message:`Moved ${xt.length} task${xt.length===1?"":"s"} to ${wt.find(n=>n.id===t)?.label||t}`}),s({type:"success",message:`Updated ${xt.length} task${xt.length===1?"":"s"}.`}),zl(),be("")}catch(a){const n=a instanceof Error?a.message:"Could not update selected tasks.";s({type:"error",message:n})}finally{le("")}}}async function xk(){if(!(!J.currentUser||!u||xt.length===0)){le("bulk-task");try{await Promise.all(xt.map(t=>hp(t.id))),await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"task",entityId:xt[0].id,action:"bulk_delete",message:`Deleted ${xt.length} task${xt.length===1?"":"s"}`}),s({type:"success",message:`Deleted ${xt.length} task${xt.length===1?"":"s"}.`}),zl(),be(""),Ru(!1)}catch(t){const a=t instanceof Error?t.message:"Could not delete selected tasks.";s({type:"error",message:a})}finally{le("")}}}async function yk(t){if(!(!J.currentUser||!u)){le("task-delete");try{await hp(t.id),await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"task",entityId:t.id,action:"delete",message:`Deleted task ${t.title||"Untitled task"}`}),s({type:"success",message:"Task deleted."}),ma(a=>a.filter(n=>n!==t.id)),be(""),_u(!1)}catch(a){const n=a instanceof Error?a.message:"Could not delete task.";s({type:"error",message:n})}finally{le("")}}}async function Qh(t,a,n){await _w({workspaceId:t.workspaceId,entityType:t.entityType,entityId:t.entityId,authorUid:J.currentUser.uid,body:a}),await Ze({workspaceId:t.workspaceId,actorUid:J.currentUser.uid,entityType:"comment",entityId:t.entityId,action:"comment",message:`Commented on ${t.label}`,visibility:t.visibility,memberUids:t.memberUids}),n.length>0&&await bo({workspaceId:t.workspaceId,actorUid:J.currentUser.uid,recipientUids:n,entityType:t.entityType==="task"?"comment":t.entityType,entityId:t.entityId,action:"comment",message:`commented on "${t.label}": ${a.slice(0,88)}${a.length>88?"…":""}`,commentPreview:a})}async function Pl(t){const a=t.trim();if(!(!J.currentUser||!zt||!a)){le("comment");try{await Qh(zt,a,Tg()),s({type:"success",message:"Comment added."})}catch(n){const l=n instanceof Error?n.message:"Could not add comment.";s({type:"error",message:l})}finally{le("")}}}async function vk(t,a,n){const l=a.trim();if(!(!J.currentUser||!l)){le("comment");try{const h={entityType:"task",entityId:t.id,workspaceId:t.workspaceId,label:ct(t.title||"")||"Untitled task",visibility:t.visibility,memberUids:t.memberUids};await Qh(h,l,n),s({type:"success",message:"Comment added."})}catch(h){const m=h instanceof Error?h.message:"Could not add comment.";s({type:"error",message:m})}finally{le("")}}}function $l(t){const a=J.currentUser?.uid||"";!a||t.authorUid!==a||(Ci(t.id),tr(t.body||""))}function qr(){Ci(""),tr("")}async function Al(t){const a=J.currentUser?.uid||"";if(!a||t.authorUid!==a)return;const n=ta.trim();if(!n||n===(t.body||"").trim()){qr();return}le(`comment-edit:${t.id}`);try{await Uw(t.id,{body:n}),s({type:"success",message:"Comment updated."}),qr()}catch(l){const h=l instanceof Error?l.message:"Could not update comment.";s({type:"error",message:h})}finally{le("")}}async function El(t){const a=J.currentUser?.uid||"";if(!(!a||t.authorUid!==a)){le(`comment-delete:${t.id}`);try{await Lw(t.id),ea===t.id&&qr(),s({type:"success",message:"Comment deleted."})}catch(n){const l=n instanceof Error?n.message:"Could not delete comment.";s({type:"error",message:l})}finally{le("")}}}const jk=r.useMemo(()=>e.jsx(r.Suspense,{fallback:e.jsx("div",{className:"workhub-empty-state",children:"Loading discussion…"}),children:e.jsx(n0,{comments:fe,currentUid:ce,memberByUid:no,showAuthorAvatar:!0,formatTime:kr,editingId:ea,editingText:ta,onEditStart:cm,onEditChange:tr,onEditCancel:dm,onEditSave:um,onDelete:hm,editBusyKey:We,deleteBusyKey:We,onComposerSend:lm,composerBusy:We==="comment",notifyMode:fo,notifyUids:or,notifyCandidates:Tl,onNotifyModeChange:hs,onNotifyUidsChange:Ni,hasMoreOlderMessages:Ie,onLoadMoreOlderMessages:()=>je(t=>t+ei),threadKey:qu})}),[fe,ce,no,ea,ta,We,fo,or,Tl]);async function Ck(t){const a=no[t];if(!a)return;const n=(a.email||"").trim().toLowerCase();if(wa&&n===wa){s({type:"error",message:"Master account name cannot be changed."});return}const l=(du[t]??(a.displayName||"")).trim();if(!l){s({type:"error",message:"Display name cannot be empty."});return}if(l!==(a.displayName||"").trim()){le(`member-name:${t}`);try{const h=await Ow({uid:t,displayName:l});uu(m=>({...m,[t]:h.displayName||l})),s({type:"success",message:"Member name updated."})}catch(h){const m=h instanceof Error?h.message:"Could not update member name.";s({type:"error",message:m})}finally{le("")}}}async function Jh(t,a,n,l=""){const m=(no[t]?.email||"").trim().toLowerCase();if(wa&&m===wa){s({type:"error",message:"Master admin status cannot be changed."});return}let S=l.trim();if(a==="suspended"&&!S&&(S=(window.prompt("Suspension reason (required):","Access suspended by administrator.")||"").trim(),!S)){s({type:"info",message:"Suspension cancelled: reason is required."});return}le(`member:${t}:${a}`);try{const P=await ai({uid:t,status:a,role:n,...a==="suspended"?{reason:S}:{}});J.currentUser&&P.status==="approved"&&u&&(await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"member",entityId:t,action:a,message:`${P.displayName||P.email} was ${a}`}),await bo({workspaceId:u,actorUid:J.currentUser.uid,recipientUids:[t],entityType:"member",entityId:t,action:a,message:`your membership was ${a}`})),s({type:"success",message:`Member ${a}.`})}catch(P){const U=P instanceof Error?P.message:"Could not update member.";s({type:"error",message:U})}finally{le("")}}async function Ul(){await nw(J),o("/login",{replace:!0,state:{signedOut:!0}})}async function Nk(){if(!J.currentUser||!u||!ae)return;const t=un.subjectLabel,a=t.toLowerCase(),n=et==="project";if(!Ct.trim()){s({type:"error",message:`${t} name is required.`});return}if(!ii(oa)){s({type:"error",message:`Pick a valid ${a} color.`});return}if(!n&&!fs.trim()){s({type:"error",message:`${t} ${wh.toLowerCase()} is required.`});return}if(!n&&$t==="tender"&&!Ir){s({type:"error",message:`Submission time is required for ${a} settings.`});return}const l=n?Go(ae):tc(Bd);if(!n&&l===null){s({type:"error",message:`${t} value must be zero or a positive number.`});return}const h=zo(n?ae.valueCurrency:Vd),m=De==="proposals_leads"&&et==="proposal"&&_r.includes("running")&&Ys&&!!Ve&&!$a&&!!Ct.trim(),S=Mi==="restricted"?ve(Ti.length>0?Ti:[ae.createdBy]):[],P=ae,U={name:Ct.trim(),description:Ud.trim(),color:oa,parentProjectId:Tr||null,projectDeadline:fs,projectType:$t,submissionTime:$t==="tender"?Ir:"",priority:Wd,valueAmount:l||0,valueCurrency:h,mainPanelView:ra,tenderNumber:Yd.trim(),proposalId:Qd.trim(),technicalProposalUrl:Zd.trim(),financialProposalUrl:tu.trim(),taskItemDisplayMode:n?aa:ae.taskItemDisplayMode||"inherit",taskStatuses:Kd??[],clientId:au,storageMethod:su,visibility:Mi,memberUids:S};I(Q=>Q.map(oe=>oe.id===ae.id?{...oe,...U}:oe)),le(`access:${ae.id}`);try{await Jt(ae.id,U),pe(ae.id),Ce(ae.id),await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"project",entityId:ae.id,action:"settings_update",message:`${t} ${Ct.trim()} settings were updated`,visibility:Mi,memberUids:S});let Q=!1,oe="";if(m&&Ve)try{const xe=await Kl({workspaceId:Ve.id,parentProjectId:null,intent:"project",name:Ct.trim(),description:`Delivery folder created from proposal "${Ct.trim()}".`,color:xm,visibility:"workspace",memberUids:[],storageMethod:"firebase",projectType:"other",submissionTime:"",priority:"medium",clientId:"",createdBy:J.currentUser.uid});await Ze({workspaceId:Ve.id,actorUid:J.currentUser.uid,entityType:"project",entityId:xe,action:"create",message:`Created folder ${Ct.trim()} from proposal ${Ct.trim()}`}),Hr({projectId:xe,projectName:Ct.trim()}).catch(Be=>{console.error("Failed to create drive folder for delivery project:",Be)}),Q=!0}catch(xe){oe=xe instanceof Error?xe.message:"Could not create the Projects workspace folder."}$r(!1),vr(""),s(oe?{type:"warning",message:`${t} settings updated, but the Projects workspace folder could not be created: ${oe}`}:Q&&Ve?{type:"success",message:`${t} settings updated. A delivery folder was created in ${Ve.name}.`}:{type:"success",message:`${t} settings updated.`})}catch(Q){I(xe=>xe.map(Be=>Be.id===P.id?P:Be));const oe=Q instanceof Error?Q.message:`Could not update ${a} settings.`;s({type:"error",message:oe})}finally{le("")}}async function Sk(){if(!J.currentUser||!u||!ae||et!=="project")return;const t=Dt.filter(h=>h.id!==ae.id&&za.has(h.id));if(t.length===0){s({type:"info",message:"No sub-items found to update."});return}const a=new Set(t.filter(h=>Ft(h,lt,St)==="project").map(h=>h.id));if(!window.confirm(`Apply current view settings to ${t.length} sub-item${t.length===1?"":"s"}?

Main panel default: ${ra}
Task items display mode: ${aa} (applies to ${a.size} folder${a.size===1?"":"s"})`))return;const n=x,l=new Map;t.forEach(h=>{l.set(h.id,{mainPanelView:ra,...a.has(h.id)?{taskItemDisplayMode:aa}:{}})}),I(h=>h.map(m=>{const S=l.get(m.id);return S?{...m,...S}:m})),le(`access-propagate:${ae.id}`);try{await Promise.all(t.map(h=>{const m={mainPanelView:ra};return a.has(h.id)&&(m.taskItemDisplayMode=aa),Jt(h.id,m)})),await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"project",entityId:ae.id,action:"settings_propagate",message:`Applied view settings from ${ae.name} to ${t.length} sub-item${t.length===1?"":"s"}`}),s({type:"success",message:`View settings applied to ${t.length} sub-item${t.length===1?"":"s"}.`})}catch(h){I(n);const m=h instanceof Error?h.message:"Could not apply view settings to sub-items.";s({type:"error",message:m})}finally{le("")}}async function Dk(t){const a=hh;if(!J.currentUser||!u||!a||ph===t&&(a.taskItemDisplayMode||"inherit")===t)return;const n=x;I(l=>l.map(h=>h.id===a.id?{...h,taskItemDisplayMode:t}:h)),le(`task-view:${a.id}`);try{await Jt(a.id,{taskItemDisplayMode:t}),fi===a.id&&ms(t)}catch(l){I(n);const h=l instanceof Error?l.message:"Could not change task view mode.";s({type:"error",message:h})}finally{le("")}}async function Mk(){if(ae){le(`drive:${ae.id}`);try{await Hr({projectId:ae.id,projectName:ae.name}),s({type:"success",message:"Drive folder created successfully."})}catch(t){console.error("Error creating drive folder:",t);const a=t instanceof Error?t.message:"Could not create Drive folder.";s({type:"error",message:a})}finally{le("")}}}async function Tk(){if(!J.currentUser||!u||!ae)return;const t=un.subjectLabel,a=t.toLowerCase();if(jm>0){s({type:"error",message:"Move or delete child items first."});return}if(vm>0){s({type:"error",message:`Move or delete ${a} tasks first.`});return}if(window.confirm(`Delete ${a} "${ae.name}"?`)){le(`delete:${ae.id}`);try{await Rw(ae.id),await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"project",entityId:ae.id,action:"delete",message:`Deleted ${a} ${ae.name}`}),O===ae.id&&pe("all"),Re===ae.id&&Ce(""),vr(""),s({type:"success",message:`${t} deleted.`})}catch(n){const l=n instanceof Error?n.message:`Could not delete ${a}.`;s({type:"error",message:l})}finally{le("")}}}function Dn(){us(!1),Zr([]),er("")}function Ll(t,a){Zr(n=>n.map(l=>l.id===t?{...l,...a}:l))}function Ik(t){if((Ma[t]||0)>0){s({type:"error",message:"Move tasks out of this status before deleting it."});return}if(st.length<=1){s({type:"error",message:"Keep at least one task status."});return}Zr(n=>{const l=n.filter(h=>h.id!==t);return Zo===t&&er(l[0]?.id||""),l}),ht===t&&Qr("all"),Ao===t&&Xr(Rr)}function zk(){const a=`New Status ${st.length+1}`,n=Do[st.length%Do.length],l=Jw(a);Zr(h=>[...h,{id:l,label:a,color:n}]),er(l)}async function Pk(){if(!J.currentUser||!u)return;if(st.length===0){s({type:"error",message:"Add at least one status."});return}if(st.some(l=>!l.label.trim())){s({type:"error",message:"Every status needs a name."});return}if(st.some(l=>!ii(l.color))){s({type:"error",message:"Every status needs a valid color."});return}const t=st.map(l=>l.id);if(new Set(t).size!==t.length){s({type:"error",message:"Status ids must be unique."});return}const a=V.find(l=>l.id===u)||null,n=st.map(l=>({...l,label:l.label.trim()}));b(l=>l.map(h=>h.id===u?{...h,taskStatuses:n}:h)),le("status");try{await $o(u,{taskStatuses:n}),await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"workspace",entityId:u,action:"status_update",message:"Updated task statuses"}),!n.some(l=>l.id===ht)&&ht!=="all"&&Qr("all"),n.some(l=>l.id===Ao)||Xr(n[0]?.id||Rr),s({type:"success",message:"Task statuses updated."}),Dn()}catch(l){a&&b(m=>m.map(S=>S.id===a.id?a:S));const h=l instanceof Error?l.message:"Could not update task statuses.";s({type:"error",message:h})}finally{le("")}}function $k(t){cs(t);const a=ti(t,1);a&&vi(n=>!n||n<=t?a:n)}function Ol(t=""){qt(!1),t&&(pe(t),Ce(t));const a=Xo();cs(a),vi(ti(a,1)),Bn("task"),Gr(!0)}function Mn(t=""){qt(!1),Zn(t),is("other"),os(""),rs(""),Yr(""),ns("medium"),ss(""),Bn("project"),Gr(!0)}function Ak(t,a=""){qt(!1),kc(t),yc(a),xc(Sp(t)),gc(!0)}function Zh(t,a=""){if(t==="project"){Mn(a);return}Ak(t,a)}function ep(){gc(!1),kc(null),yc("")}async function Ek(){if(!J.currentUser||!u||!Zt)return;const t=wc,a=t.name.trim();if(!a){s({type:"error",message:"Name is required."});return}const n=(U,Q)=>U.trim()?!0:(s({type:"error",message:Q}),!1);switch(Zt){case"project":if(!n(t.deadline,"Project deadline is required."))return;break;case"proposal":if(!n(t.clientId,"Proposal client is required.")||!n(t.tenderNumber,"Tender / RFP number is required for proposals.")||!n(t.proposalId,"Our proposal ID is required for proposals.")||!n(t.deadline,"Submission date is required for proposals.")||!n(t.submissionTime,"Submission time is required for proposals."))return;break;case"lead":if(!n(t.leadSource,"Lead source is required.")||!n(t.deadline,"Expected close date is required."))return;break;case"finance_invoice_stream":if(!n(t.billingCycle,"Billing cycle is required.")||!n(t.deadline,"First due date is required.")||!n(t.paymentOwner,"Approval owner is required."))return;break;case"finance_payment_cycle":if(!n(t.deadline,"Disbursement date is required.")||!n(t.paymentOwner,"Approval owner is required."))return;break;case"marketing_campaign":if(!n(t.campaignObjective,"Campaign objective is required.")||!n(t.campaignChannel,"Campaign channel is required.")||!n(t.startDate,"Launch date is required.")||!n(t.deadline,"Campaign end date is required."))return;break;case"marketing_content_stream":if(!n(t.campaignChannel,"Content channel is required.")||!n(t.cadence,"Content cadence is required.")||!n(t.startDate,"Content stream start date is required.")||!n(t.deadline,"Target date is required."))return;break;case"hr_requisition":if(!n(t.department,"Department is required.")||!n(t.hiringManager,"Hiring manager is required.")||!n(t.deadline,"Target hire date is required."))return;break;case"hr_onboarding_track":if(!n(t.onboardingOwner,"Onboarding owner is required.")||!n(t.startDate,"Onboarding start date is required.")||!n(t.deadline,"Completion target is required."))return;break}if(t.startDate.trim()&&t.deadline.trim()&&dc(t.startDate.trim(),t.deadline.trim())){s({type:"error",message:d0(Zt)});return}const l=Bt(Zt,De),h=l.defaults.projectType,m=k0(Zt,t),S=l.subjectLabel,P=qp||(O!=="all"?O:"");le("template-create");try{const U=Lt.length>0?Lt:Do,Q=await Kl({workspaceId:u,parentProjectId:P||null,intent:Zt,name:a,description:m,color:U[Math.floor(Math.random()*U.length)],visibility:"workspace",memberUids:[],storageMethod:"firebase",projectStartDate:t.startDate.trim(),projectDeadline:t.deadline.trim(),projectType:h,submissionTime:Zt==="proposal"?t.submissionTime.trim():"",tenderNumber:Zt==="proposal"?t.tenderNumber.trim():"",proposalId:Zt==="proposal"?t.proposalId.trim():"",priority:t.priority,clientId:t.clientId.trim(),createdBy:J.currentUser.uid});await Ze({workspaceId:u,actorUid:J.currentUser.uid,entityType:"project",entityId:Q,action:"create",message:`Created ${S} ${a}`}),Hr({projectId:Q,projectName:a}).catch(xe=>{console.error("Failed to create drive folder:",xe)}),pe(Q),Ce(Q),p("home"),ep();const oe=ze?.name?.trim()||"current workspace";s({type:"success",message:`${S} created in ${oe}.`})}catch(U){const Q=U instanceof Error?U.message:`Could not create ${S.toLowerCase()}.`;s({type:"error",message:Q})}finally{le("")}}function Uk(t){t&&(pe(t),Ce(t));const a=wt.find(n=>n.id==="backlog")?.id||wt[0]?.id||Rr;Fn(a),_n(n=>n+1),p("tasks")}function Lk(){qt(!1),qn(!0)}function Ok(){qt(!1),M(!1),te(!1),ih(""),ja(0),Sf(!0)}function tp(t){W(t.workspaceId),pe(t.projectId),Ce(t.projectId),be(""),p(ro(t.projectId)),jt(!0),Nt(!1),an()}function Tn(t){const a=yt[t];if(!a)return;const n=a.projectId&&rt.has(a.projectId)?a.projectId:"all";if(a.projectId){const l=fr(a.projectId,Qe);Tt(h=>Array.from(new Set([...h,...l])))}pe(n),Ce(a.projectId||""),be(""),ge(a.id),He(""),p("notes"),jt(!0),Nt(!1),wn()}const Rl=r.useCallback(t=>{if(ur(t),!u)return;const a=ro?ro(t):"tasks";o(To(u,t,a))},[ur,o,ro,u]),_l=r.useCallback(t=>{const a=yt[t];if(!a)return;const n=a.projectId&&rt.has(a.projectId)?a.projectId:"all";Tn(t),u&&o(To(u,n,"notes",t))},[Tn,o,u,rt,yt]),Rk=r.useCallback(t=>{dt(!1),t!==u&&Fa(t),ca(!0)},[Fa,u]),_k=r.useCallback(()=>{dt(!1),ut("dashboard"),At()},[ut,At]),Wk=r.useCallback(t=>{dt(!1),pe(t),Ce(""),ge(""),be(""),He(""),p("tasks"),qe("tasks"),jt(!0),Nt(!1),u&&o(`/workhub/w/${encodeURIComponent(u)}/s/tasks?p=${encodeURIComponent(t)}`),At()},[At,o,u,dt,pe,Ce,ge,be,He,p,qe,jt,Nt]),Fk=r.useCallback(t=>{dt(!1),Tn(t),At()},[Tn,At]),In=r.useCallback(t=>{const a=ot.find(n=>n.id===t);if(a?.entityType==="project"&&a.entityId){const n=fr(a.entityId,Qe);n.length>0&&Tt(l=>Array.from(new Set([...l,...n]))),rt.has(a.entityId)&&pe(a.entityId),Ce(a.entityId)}a?.entityType==="workspace"&&(pe("all"),Ce("")),He(t),ge(""),be(""),Ye(En(a?.panelVariant)),p("moodboard"),jt(!0),Nt(!1),wn()},[wn,rt,ot,Qe]),Wl=r.useCallback(t=>{const a=ot.find(l=>l.id===t);if(!a)return;const n=a.entityType==="project"&&rt.has(a.entityId)?a.entityId:"all";In(t),u&&o(To(u,n,"moodboard",t))},[In,o,u,rt,ot]),Bk=r.useCallback(t=>{dt(!1),In(t),At()},[In,At]);me.current.dragTaskId=Md,me.current.dragStatusId=Td,me.current.dropTargetKey=Id,me.current.editingTaskTitleText=Lu,me.current.editingChecklistItemText=Qs,me.current.taskChecklistDrafts=Us,me.current.selectedTaskIdSet=dn,me.current.selectedTaskCount=kh,me.current.handleTaskUpdate=Xh,me.current.handleBulkStatusChange=wk,me.current.handleTaskReorder=fm,me.current.handleQuickAddTask=kk,me.current.clearTaskSelection=zl,me.current.handleBulkDeleteSelected=xk,me.current.handleDeleteSingleTask=yk,me.current.handleQuickTaskViewModeChange=Dk,me.current.handleAddTaskComment=vk,me.current.handleAddComment=Pl,me.current.handleStartCommentEdit=$l,me.current.handleCancelCommentEdit=qr,me.current.handleSaveCommentEdit=Al,me.current.handleDeleteComment=El;const uo=Qi?ga[Qi]||Ln():null,qk=uo?uo.markers.filter(t=>t.type==="checkbox"&&!t.checked):[],Vk=uo?uo.markers.filter(t=>t.type==="point"):[],Hk=uo?uo.markers.filter(t=>t.type==="line"&&t.x2!==void 0&&t.y2!==void 0):[],op=r.useMemo(()=>new Map((uo?.markers||[]).map((t,a)=>[t.id,a+1])),[uo]),_t=uo?.markers.find(t=>t.id===Qu)||null,Fl=_t?{x:_t.type==="line"&&_t.x2!==void 0?(_t.x+_t.x2)/2:_t.x,y:_t.type==="line"&&_t.y2!==void 0?(_t.y+_t.y2)/2:_t.y}:null;if(r.useEffect(()=>{if(typeof window>"u")return;const t=window.matchMedia(`(max-width: ${Yo}px)`),a=l=>wb(l);a(t.matches);const n=l=>a(l.matches);return t.addEventListener("change",n),()=>t.removeEventListener("change",n)},[]),r.useEffect(()=>{if(ke(!1),!Ur)return;const t=localStorage.getItem(Ur);(t==="tabs"||t==="workspace_tree")&&G(t),ke(!0)},[Ur]),r.useEffect(()=>{!Ur||!ue||localStorage.setItem(Ur,A)},[A,ue,Ur]),r.useEffect(()=>{if(typeof window>"u")return;const t=()=>Nt(window.innerWidth<Jx);return t(),window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]),r.useEffect(()=>{Xe||ca(!1)},[Xe]),F||rb&&!y)return e.jsx("div",{className:"workhub-shell",children:e.jsxs("div",{className:"workhub-center-card",children:[e.jsx("div",{className:"workhub-spinner"}),e.jsx("h1",{children:"Loading WorkHub"}),e.jsx("p",{children:"Preparing your private company workspace."}),e.jsx(Xa,{phoneMaxWidth:Yo})]})});if(!y)return e.jsx("div",{className:"workhub-shell",children:e.jsxs("div",{className:"workhub-center-card",children:[e.jsx("span",{className:"workhub-badge",children:"Private Internal Tool"}),e.jsx("h1",{children:"Welcome to WorkHub"}),e.jsx("p",{children:"This area is restricted to approved company members. Request access once and your administrators can approve you."}),e.jsxs("div",{className:"workhub-center-actions",children:[e.jsx("button",{className:"workhub-primary-btn",disabled:Y,onClick:Hh,children:Y?"Requesting…":"Request company access"}),e.jsx(aw,{to:"/dashboard",className:"workhub-secondary-link",children:"Back to admin app"})]}),e.jsxs("div",{className:"workhub-meta-line",children:["Signed in as ",f||C]}),e.jsx(Xa,{phoneMaxWidth:Yo})]})});if(y.status!=="approved")return e.jsx("div",{className:"workhub-shell",children:e.jsxs("div",{className:"workhub-center-card",children:[e.jsx("span",{className:`workhub-badge ${y.status==="suspended"?"is-danger":""}`,children:y.status==="pending"?"Pending approval":"Access suspended"}),e.jsx("h1",{children:y.status==="pending"?"Your request is under review":"Your WorkHub access is currently disabled"}),e.jsx("p",{children:y.status==="pending"?"A company administrator needs to approve your membership before you can enter the private workspace.":"Please contact your company administrator if you believe this was a mistake."}),e.jsxs("div",{className:"workhub-center-actions",children:[y.status==="pending"&&e.jsx("button",{className:"workhub-primary-btn",disabled:Y,onClick:Hh,children:Y?"Refreshing…":"Refresh request"}),e.jsx("button",{className:"workhub-ghost-btn",onClick:Ul,children:"Sign out"})]}),e.jsxs("div",{className:"workhub-meta-line",children:["Requested: ",kr(y.requestedAt)]}),e.jsx(Xa,{phoneMaxWidth:Yo})]})});if(!Ee&&Ne.length===0)return e.jsxs("div",{className:"workhub-shell workhub-no-access-shell",children:[e.jsxs("div",{className:"workhub-no-access-card",children:[e.jsx("div",{className:"workhub-no-access-icon","aria-hidden":"true",children:"🔒"}),e.jsx("div",{className:"workhub-no-access-brand",children:"WorkHub"}),e.jsx("h1",{className:"workhub-no-access-title",children:"No workspace access"}),e.jsxs("p",{className:"workhub-no-access-body",children:["Your account is active, but you haven't been added to any workspace yet.",e.jsx("br",{}),"Contact your administrator to be granted access."]}),e.jsxs("div",{className:"workhub-no-access-user",children:[e.jsx("span",{className:"workhub-no-access-avatar",children:(f||C||"?")[0].toUpperCase()}),e.jsx("span",{children:f||C})]}),e.jsx("button",{className:"workhub-ghost-btn",onClick:Ul,children:"Sign out"})]}),e.jsx(Xa,{phoneMaxWidth:Yo})]});const Kk=u?sl.label:"Workspace",hr={};Ne.forEach(t=>{const a=Wt(t).templateId;hr[t.id]=`${Gl(a)} ${t.name}`});const Gk=[{id:"home",section:"home",icon:"⌂",label:"Home",onClick:()=>ut("home")},{id:"tasks",section:"tasks",icon:"✓",label:"Tasks",onClick:()=>ut("tasks")},{id:"notes",section:"notes",icon:"📝",label:"Editor",onClick:()=>ut("notes")},{id:"dashboard",section:"dashboard",icon:"📊",label:"Dashboard",onClick:()=>ut("dashboard")},{id:"clients",section:"clients",icon:"🏢",label:"Clients",onClick:()=>ut("clients")},...Ee?[{id:"users",section:"users",icon:"👥",label:"Users",onClick:()=>ut("users")}]:[]].filter(t=>!["home","tasks","notes","dashboard"].includes(t.id)),Bl=u?xp(De):[],rp=De==="projects"?"Add project":"Add folder",Yk=De==="projects"?"🚀":"📁",ap=u?Bl.some(a=>a.intent==="project")?Bl.map(a=>a.intent==="project"?{...a,label:rp}:a):[...Bl,{id:"create-folder-shortcut",intent:"project",icon:Yk,label:rp,tone:"secondary",fullWidth:!0}]:[],ip=ap.map(t=>({id:t.id,icon:t.icon,label:t.label,tone:t.tone,fullWidth:t.fullWidth,onClick:()=>Zh(t.intent)})),qa=ip.find(t=>t.tone==="primary")||ip[0]||null,Xk=qa?`No items yet. Use "${qa.label}" to get started.`:"No items yet. Create a top-level category first.",np={isMobileWorkhubLayout:Xe,workhubViewMode:A,onMobileTaskDetailOpenChange:yb,taskItemDisplayMode:ph,taskContextTrail:bl,projectIntentMetaById:pl,handleSelectProject:ur,selectedWorkspaceDisplayName:hl,selectedProjectPeriodLabel:bh,selectedProjectSubmissionTimeLabel:fh,selectedProjectEffectiveTaskStatuses:io,taskFilterBaseTasks:Rf,selectedTaskStatusTab:ht,setSelectedTaskStatusTab:Qr,taskFilterBaseTaskCountByStatus:Bf,completedStatusForHighlight:qf,completedHighlightCount:Vf,quickTaskViewTargetProject:hh,busyKey:We,handleQuickTaskViewModeChange:nm,activeTaskFilterCount:_f,setTaskFilterMenuOpen:vd,taskFilterMenuOpen:Qp,setTaskFilterRequireAttachments:Jp,setTaskFilterRequireChecklist:Zp,setTaskFilterPriority:eb,taskFilterRequireAttachments:jd,taskFilterRequireChecklist:Cd,taskFilterPriority:Nd,selectedTaskCount:kh,setBulkStatusMenuOpen:Js,bulkStatusMenuOpen:Qb,handleBulkStatusChange:tm,clearTaskSelection:rm,setBulkDeleteConfirmOpen:Ru,selectedWorkspaceScopeType:Kt,filteredTasks:gl,setSelectedTaskIds:ma,renderedTaskStatuses:cn,renderedTaskListsByStatus:Hf,filteredTaskCountByStatus:kl,collapsibleStatusIdSet:wl,expandedTaskStatusIds:ds,setExpandedTaskStatusIds:Xp,financeStatusTotals:Wf,financeWorkspaceCurrency:Ff,taskDueDisplayMode:yf,selectedTaskIdSet:dn,taskContextMenuState:Gi,setTaskContextMenuState:ir,dropTargetKey:Id,dragTaskId:Md,dragStatusId:Td,openTaskStatusMenuId:Gb,openTaskPriorityMenuId:Yb,openTaskMoreMenuId:Kb,openTaskAssigneeMenuId:Xb,editingTaskTitleId:Bb,editingTaskTitleText:Lu,expandedTaskChecklistIdsSet:Gf,taskChecklistDrafts:Us,editingChecklistTaskId:qb,editingChecklistItemId:Vb,editingChecklistScope:Hb,editingChecklistItemText:Qs,memberByUid:no,assignableMembersByProjectId:vo,workspaceAssignableMembers:It,taskMetaById:Kf,unreadCommentCountByTaskId:gg,notifications:we,markWorkhubNotificationRead:cp,taskRowCallbacks:Jf,flatVisibleProjectOptionsWithIcons:fl,quickAddDefaultProjectId:Ig,selectedProjectId:O,currentUid:ce,quickAddFocusStatusId:Wn,quickAddFocusTrigger:mc,setQuickAddFocusStatusId:Fn,setDropTargetKey:Dr,handleTaskReorder:em,closeTaskContextMenu:Yf,copyTaskDeepLink:Xf,copyTaskUniqueToken:Qf,handleQuickAddTask:om,setStatusTaskRenderLimitById:yd,selectedProjectIntentMeta:Ef,workspaceProjectById:Qe,workspaceDocumentsByProjectId:Oa,workspaceMoodBoardsByProjectId:Ra,selectedWorkspaceMoodBoardEnabled:ze?.moodBoardEnabled!==!1,selectedDocumentId:k,setSelectedMoodBoardId:He,setSelectedDocumentId:ge,setActiveSection:p,getWorkhubDocumentIcon:Np,selectedMoodBoardId:bt,detailMenuOpen:Ub,setDetailMenuOpen:zu,setDetailMenuCoords:Ob,detailMenuCoords:Lb,handleSelectedTaskValueSave:mg,handleSelectedTaskTitleSave:dg,handleSelectedTaskDescriptionSave:cg,resolveTaskParentEntityLabel:zg,projectNameById:jl,formatTime:kr,buildChecklist:Pt,getChecklistDetailKey:Km,expandedChecklistDetailKeys:vb,toggleChecklistItemDetails:Gm,setEditingChecklistItemText:Ar,handleChecklistItemToggle:Ym,handleChecklistItemEditStart:Jm,handleChecklistItemEditSave:Zm,handleChecklistItemEditCancel:fg,handleChecklistRemove:Xm,checklistDetailsDrafts:Su,setChecklistDetailsDrafts:$b,handleChecklistItemDetailsSave:eg,checklistAttachmentDrafts:Du,setChecklistAttachmentDrafts:Mu,handleChecklistAttachmentAdd:tg,handleChecklistAttachmentFileUpload:ag,uploadingChecklistAttachmentKey:Ab,attachmentViewMode:ef,isImageAttachmentUrl:Xl,openAttachmentLightbox:Zu,attachmentReviews:ga,handleChecklistAttachmentRemove:og,checklistLinkDrafts:Tu,setChecklistLinkDrafts:Iu,handleChecklistLinkAdd:ig,handleChecklistLinkRemove:ng,setTaskChecklistDrafts:Ui,taskChecklistValueDrafts:Cb,setTaskChecklistValueDrafts:Nb,handleChecklistAdd:Qm,handleTaskUpdate:Zf,handleAddTaskComment:sm,projectDiscussionNode:jk,taskAttachmentsCollapsed:of,setTaskAttachmentsCollapsed:rf,setAttachmentViewMode:tf,taskAttachmentTitleDrafts:wu,setTaskAttachmentTitleDrafts:xu,taskAttachmentDrafts:gu,setTaskAttachmentDrafts:ku,taskAttachmentFilePathDrafts:Mb,taskAttachmentFileDrafts:Sb,setTaskAttachmentFileDrafts:Db,setTaskAttachmentFilePathDrafts:Tb,uploadingTaskAttachmentId:zb,handleTaskAttachmentAdd:sg,handleTaskAttachmentFileUpload:rg,getTaskAttachments:Kr,getTaskAttachmentTitle:Mx,handleTaskAttachmentRemove:lg,getTaskLinks:hc,taskLinkTitleDrafts:ju,setTaskLinkTitleDrafts:Cu,taskLinkDrafts:yu,setTaskLinkDrafts:vu,handleTaskLinkAdd:pg,taskLinkEditingDrafts:Nu,handleTaskLinkEditCancel:hg,getTaskLinkTitle:Tx,getUrlHostLabel:Ix,getInitials:Rn,handleTaskLinkEditStart:ug,handleTaskLinkRemove:bg,selectedProject:j,selectedProjectColorDraft:da,canEditSelectedProject:Uh,canEditSelectedProjectAttachments:Co,selectedProjectEffectiveIntent:ao,selectedProjectNameDraft:Li,setSelectedProjectNameDraft:Ls,handleSaveSelectedProjectDetails:Pg,selectedProjectTypeDraft:ar,selectedProjectTypeOptions:Of,setSelectedProjectTypeDraft:qs,selectedProjectStartDateDraft:Oi,setSelectedProjectStartDateDraft:Fs,selectedProjectDeadlineDraft:ua,setSelectedProjectDeadlineDraft:Bs,selectedProjectSubmissionTimeDraft:Ro,setSelectedProjectSubmissionTimeDraft:ha,selectedProjectValueAmountDraft:Ri,setSelectedProjectValueAmountDraft:Vs,selectedProjectValueCurrencyDraft:_i,setSelectedProjectValueCurrencyDraft:Hs,selectedProjectNarrativeDraft:Pu,setSelectedProjectNarrativeDraft:Rs,handleSelectedProjectDescriptionBlur:$g,selectedProjectIntentDetailDrafts:$u,setSelectedProjectIntentDetailDrafts:_s,projectAttachmentsCollapsed:af,setProjectAttachmentsCollapsed:Wu,selectedProjectAttachmentTitleDraft:Ks,setSelectedProjectAttachmentTitleDraft:pa,selectedProjectAttachmentDraft:Gs,setSelectedProjectAttachmentDraft:Wi,selectedProjectAttachmentFilePathDraft:_b,setSelectedProjectAttachmentFilePathDraft:Bi,selectedProjectAttachmentFileDrafts:ba,setSelectedProjectAttachmentFileDrafts:Fi,uploadingSelectedProjectAttachment:Wb,handleSelectedProjectAttachmentAdd:tk,handleSelectedProjectAttachmentFileUpload:ak,selectedProjectAttachments:co,deriveAttachmentTitle:Po,handleSelectedProjectAttachmentUpdate:ok,handleSelectedProjectAttachmentRemove:rk,selectedProjectColorMenuOpen:Fb,setSelectedProjectColorMenuOpen:fa,selectedProjectColorMeaning:Uf,selectedWorkspaceProjectColorMeanings:kt,handleSelectedProjectColorSelect:Ag,setProjectAccessDialogId:vr,selectedProjectDetailsChanged:ek,setTaskDeleteConfirmOpen:_u,taskDeleteConfirmOpen:Zb,bulkDeleteConfirmOpen:Jb,handleBulkDeleteSelected:am,handleDeleteSingleTask:im,visibleTasks:Da,selectedWorkspaceId:u,showToast:s},sp=!Xe&&A==="tabs"&&ie==="dashboard"&&j?.mainPanelView==="dashboard_with_details";return e.jsxs("div",{className:`workhub-shell${Xe?" is-mobile":""}${Xe&&xb?" task-detail-open":""}${Xe&&rr?" workspace-drawer-open":""}`,dir:"ltr",children:[e.jsxs("div",{className:"workhub-app",children:[e.jsxs("header",{className:"workhub-topbar",children:[e.jsxs("div",{className:"workhub-topbar-main",children:[e.jsx("div",{className:"workhub-brand-wrap",children:e.jsxs("span",{className:"workhub-brand","aria-label":"WorkHub",children:[e.jsx("span",{className:"workhub-brand-initial",children:"W"}),"ork",e.jsx("span",{className:"workhub-brand-initial",children:"H"}),"ub"]})}),e.jsx("span",{className:"workhub-topbar-divider","aria-hidden":"true"}),Xe?e.jsx("div",{className:"workhub-mobile-workspace-entry",children:e.jsxs("button",{type:"button",className:`workhub-mobile-workspace-toggle${rr?" is-active":""}`,onClick:()=>ca(t=>!t),"aria-label":"Toggle workspace list","aria-expanded":rr,children:[e.jsx("span",{"aria-hidden":"true",children:"☰"}),e.jsx("span",{className:"workhub-mobile-context-label",children:j?j.name:ze?hr[u]||ze.name:"Workspaces"})]})}):A==="tabs"?e.jsx("div",{className:"workhub-workspace-tabs-wrap",children:e.jsx("div",{className:"workhub-workspace-tabs",role:"tablist","aria-label":"Workspaces",children:Ne.map(t=>{const a=hr[t.id]||t.name;return e.jsx("button",{type:"button",className:`workhub-tab workhub-workspace-tab${u===t.id?" is-active":""}`,onClick:()=>{t.id!==u&&Fa(t.id)},title:a,children:a},t.id)})})}):null]}),e.jsxs("nav",{className:"workhub-header-actions",children:[!Xe&&e.jsxs("div",{className:"workhub-view-mode-switch",role:"group","aria-label":"WorkHub view mode",children:[e.jsxs("button",{type:"button",className:`workhub-view-mode-btn${A==="tabs"?" is-active":""}`,onClick:()=>G("tabs"),"data-active":A==="tabs"?"true":"false",title:"Tabs view",children:[e.jsx("span",{className:"workhub-view-mode-btn-icon","aria-hidden":"true",children:"▥"}),e.jsx("span",{className:"workhub-view-mode-btn-label",children:"Tabs"})]}),e.jsxs("button",{type:"button",className:`workhub-view-mode-btn${A==="workspace_tree"?" is-active":""}`,onClick:()=>G("workspace_tree"),"data-active":A==="workspace_tree"?"true":"false",title:"Workspaces view",children:[e.jsx("span",{className:"workhub-view-mode-btn-icon","aria-hidden":"true",children:"≣"}),e.jsx("span",{className:"workhub-view-mode-btn-label",children:"Workspaces"})]})]}),e.jsx("button",{type:"button",className:"workhub-tab workhub-find-command-btn workhub-top-nav-icon-btn",onClick:Ok,disabled:Mf.length===0,title:"Find entity by name (Ctrl+K)","aria-label":"Find (Ctrl+K)",children:e.jsx("span",{"aria-hidden":"true",children:"⌕"})}),e.jsxs("div",{className:"workhub-notify-wrap",children:[e.jsxs("button",{type:"button",className:`workhub-notify-btn${v?" is-open":""}${Bo>0?" has-unread":""}`,onClick:zf,"aria-label":"Notifications",title:"Notifications",children:[e.jsx("span",{"aria-hidden":"true",className:`workhub-notify-btn-icon${Bo>0?" has-unread":""}`,children:"🔔"}),Bo>0&&e.jsx("span",{className:"workhub-notify-badge",children:Bo>99?"99+":Bo})]}),v&&e.jsxs("div",{className:"workhub-notify-menu",children:[e.jsxs("div",{className:"workhub-notify-head",children:[e.jsx("strong",{children:"Notifications"}),Bo>0&&e.jsxs("span",{children:[Bo," unread"]})]}),e.jsxs("div",{className:"workhub-notify-list",children:[we.length===0&&e.jsx("div",{className:"workhub-notify-empty",children:"No notifications yet."}),we.map(t=>e.jsxs("button",{type:"button",className:`workhub-notify-item${t.read?"":" is-unread"}`,onClick:()=>{$f(t)},children:[e.jsxs("div",{className:"workhub-notify-item-main",children:[e.jsx("span",{"aria-hidden":"true",className:`workhub-notify-item-icon${t.read?" is-hidden":""}`,children:"🔔"}),e.jsx("span",{className:"workhub-notify-message",children:t.message})]}),e.jsx("small",{children:kr(t.createdAt)})]},t.id))]})]})]}),e.jsxs("div",{className:"workhub-account-wrap",children:[e.jsxs("button",{type:"button",className:`workhub-account-btn${z?" is-open":""}`,onClick:Pf,"aria-label":"Account",title:"Account",children:[Xi?e.jsx("img",{className:"workhub-account-avatar",src:Xi,alt:"User avatar"}):e.jsx("span",{className:"workhub-account-avatar","aria-hidden":"true",children:Gu}),e.jsx("span",{className:"workhub-account-caret","aria-hidden":"true",children:z?"▴":"▾"})]}),z&&e.jsxs("div",{className:"workhub-account-menu",children:[e.jsxs("div",{className:"workhub-account-menu-head",children:[Xi?e.jsx("img",{className:"workhub-account-avatar",src:Xi,alt:"User avatar"}):e.jsx("span",{className:"workhub-account-avatar","aria-hidden":"true",children:Gu}),e.jsxs("div",{className:"workhub-account-menu-identity",children:[e.jsx("strong",{children:Ku}),e.jsx("span",{children:sf||"No email"})]})]}),Gk.map(t=>e.jsx("button",{type:"button",className:"workhub-account-menu-action",onClick:()=>{te(!1),t.onClick()},children:t.label},t.id)),Ee&&e.jsx("button",{type:"button",className:"workhub-account-menu-action",onClick:()=>{te(!1),Lk()},children:"Create workspace"}),e.jsx("button",{type:"button",className:"workhub-account-menu-action",onClick:()=>{te(!1),o("/mood-board-v2")},children:"Open Mood Board #2"}),e.jsx("button",{type:"button",className:"workhub-account-menu-action",onClick:()=>{te(!1),o("/flow-project-plan")},children:"Open Flow Project Plan"}),u&&e.jsx("button",{type:"button",className:"workhub-account-menu-action",onClick:()=>{te(!1),vn(u)},children:"Workspace settings"}),e.jsx("button",{type:"button",className:"workhub-account-menu-action",onClick:lh,children:"Account settings"}),e.jsx("button",{type:"button",className:"workhub-account-menu-action",onClick:()=>{te(!1),Ul()},children:"Sign out"})]})]})]})]}),Xe&&(rr||pu)&&e.jsx("div",{className:`workhub-mobile-workspace-panel-backdrop${pu?" is-closing":""}`,onClick:()=>{dt(!1),At()},children:e.jsxs("aside",{className:"workhub-mobile-workspace-panel",role:"dialog","aria-modal":"true","aria-label":"Workspace list",onClick:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"workhub-mobile-detail-drawer-head workhub-mobile-workspace-panel-head",children:[e.jsx("button",{type:"button",className:"workhub-mobile-detail-drawer-handle","aria-label":"Close workspace list",onClick:()=>{dt(!1),At()}}),e.jsxs("div",{className:"workhub-mobile-workspace-picker-row workhub-mobile-workspace-toolbar",children:[e.jsx("select",{id:"workhub-mobile-workspace-select",className:"workhub-mobile-workspace-picker-select",value:u,onChange:t=>Rk(t.target.value),children:Ne.map(t=>{const a=hr[t.id]||t.name;return e.jsx("option",{value:t.id,children:a},t.id)})}),e.jsxs("div",{className:"workhub-mobile-workspace-picker-actions",children:[e.jsx("button",{type:"button",className:`workhub-ghost-mini workhub-mobile-workspace-overview-btn${O==="all"&&ie==="dashboard"?" is-active":""}`,onClick:_k,title:"Workspace overview","aria-label":"Workspace overview",disabled:!u,children:"📊"}),Ee&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"workhub-plus-btn",onClick:t=>Vo("__workspace__",t),title:"Create items","aria-label":"Create items",disabled:!u,children:"+"}),u&&e.jsxs("div",{className:"workhub-mobile-gear-wrap",ref:Fu,children:[e.jsx("button",{type:"button",className:"workhub-gear-btn",onClick:()=>dt(t=>!t),title:"Workspace options","aria-label":"Workspace options",children:"⚙"}),ji&&e.jsxs("div",{ref:Bu,className:`workhub-gear-menu${tb?" is-up":""}`,children:[e.jsx("button",{type:"button",className:"workhub-gear-menu-item",onClick:()=>{dt(!1),vn(u)},children:"Workspace settings"}),e.jsx("button",{type:"button",className:"workhub-gear-menu-item",onClick:()=>{dt(!1),us(!0)},children:"Status settings"})]})]})]}),e.jsx("button",{type:"button",className:"workhub-ghost-mini",onClick:()=>{dt(!1),At()},children:"✕"})]})]})]}),e.jsx("div",{className:"workhub-mobile-workspace-panel-body",children:e.jsx("div",{className:"workhub-mobile-tree-panel",children:e.jsx("div",{className:"workhub-mobile-tree-panel-body",children:Na.length>0?e.jsx(Ja,{nodes:lr,treeMetaDisplayMode:xa,showProjectColorDots:ya,selectedProjectId:O,expandedProjectIds:Uo,directTaskCountByProjectId:sn,unreadCommentCountByProjectId:mn,taskProgressByProjectId:dr,projectIntentById:wo,projectIntentIconById:Sa,selectedDocumentId:ie==="notes"?k:"",selectedMoodBoardId:ie==="moodboard"?bt:"",documentsByProjectId:Oa,moodBoardsByProjectId:Ra,isPrivilegedMember:Wo,onSelectProject:t=>{Wk(t)},onSelectDocument:t=>{Fk(t)},onSelectMoodBoard:t=>{Bk(t)},onToggleExpansion:Wa,onOpenActionMenu:Vo,onOpenSettings:_a,projectColorMeanings:kt}):e.jsx("div",{className:"workhub-empty-state",children:"No project tree items yet."})})})})]})}),e.jsxs("div",{ref:Es,className:`workhub-shell-layout${Pr?" sidebar-collapsed":""}`,style:!Xe&&!Pr?{gridTemplateColumns:`${As}px 4px minmax(0, 1fr)`}:void 0,children:[!Xe&&e.jsxs("aside",{className:`workhub-panel workhub-tree-sidebar${Pr?" is-collapsed":""}`,children:[Pr?e.jsx("div",{className:"workhub-panel-head compact is-collapsed-head",children:e.jsx("button",{className:"workhub-sidebar-toggle",onClick:Eg,title:"Expand sidebar","aria-label":"Expand sidebar",children:"⟩"})}):e.jsxs("div",{className:"workhub-panel-head compact",children:[e.jsx("div",{className:"workhub-panel-head-title",children:e.jsx("h2",{children:Kk})}),e.jsx("button",{className:"workhub-sidebar-toggle",onClick:Ug,title:"Collapse sidebar","aria-label":"Collapse sidebar",children:"⟨"})]}),!Pr&&e.jsxs(e.Fragment,{children:[A==="tabs"?e.jsx("div",{className:"workhub-tree-actions workhub-sidebar-template-actions",children:e.jsxs("div",{className:"workhub-tree-overview-row",children:[e.jsx("button",{className:`workhub-tree-overview${O==="all"&&ie==="dashboard"?" is-active":""}`,onClick:()=>ut("dashboard"),children:"Workspace overview"}),Ee&&e.jsxs("div",{className:"workhub-tree-overview-actions",children:[e.jsx("button",{type:"button",className:"workhub-plus-btn",title:"Create items","aria-label":"Create items",onClick:t=>Vo("__workspace__",t),disabled:!u,children:"+"}),e.jsxs("div",{style:{position:"relative"},children:[e.jsx("button",{type:"button",className:"workhub-gear-btn",title:"Workspace options","aria-label":"Workspace options",onClick:()=>dt(t=>!t),disabled:!u,children:"⚙"}),ji&&u&&e.jsxs("div",{className:"workhub-gear-menu",children:[e.jsx("button",{type:"button",className:"workhub-gear-menu-item",onClick:()=>{dt(!1),vn(u)},children:"Workspace settings"}),e.jsx("button",{type:"button",className:"workhub-gear-menu-item",onClick:()=>{dt(!1),us(!0)},children:"Status settings"})]})]})]})]})}):null,e.jsx("div",{className:"workhub-tree-scroll",children:A==="workspace_tree"?e.jsx("div",{className:"workhub-tree-workspace-list",children:Ne.map(t=>{const a=t.id,n=jf[a]||[],l=wf.includes(a),h=Wt(t).templateId,m=hr[a]||t.name;return e.jsxs("div",{className:`workhub-tree-workspace-group${u===a?" is-active":""}`,children:[e.jsxs("div",{className:"workhub-tree-workspace-head",children:[e.jsxs("button",{type:"button",className:"workhub-tree-workspace-btn",onClick:()=>Wg(a),children:[e.jsxs("span",{className:"workhub-tree-workspace-label",children:[e.jsx("span",{className:`workhub-tree-workspace-caret${l?" is-expanded":""}`,children:"▸"}),e.jsx("span",{children:m})]}),e.jsxs("span",{className:"workhub-tree-workspace-summary",children:[n.length," root item",n.length===1?"":"s"]})]}),e.jsx("button",{type:"button",className:`workhub-tree-workspace-overview-btn${u===a&&O==="all"&&ie==="dashboard"?" is-active":""}`,onClick:S=>{S.stopPropagation(),ut("dashboard",a)},title:"Workspace overview","aria-label":`Open ${m} overview`,children:e.jsx("span",{"aria-hidden":"true",children:"⌂"})})]}),e.jsx("div",{className:`workhub-tree-workspace-expand-wrap${l?" is-open":""}`,children:e.jsx("div",{className:"workhub-tree-workspace-expand-inner",children:e.jsx("div",{className:"workhub-tree-workspace-body",children:n.length>0?e.jsx(Ja,{nodes:n,treeMetaDisplayMode:xa,showProjectColorDots:ya,selectedProjectId:O,expandedProjectIds:Uo,directTaskCountByProjectId:cl,unreadCommentCountByProjectId:{},taskProgressByProjectId:Cf,projectIntentById:wo,projectIntentIconById:Sa,selectedDocumentId:"",selectedMoodBoardId:"",documentsByProjectId:{},moodBoardsByProjectId:{},isPrivilegedMember:Wo,onSelectProject:S=>Fg(a,S),onSelectDocument:()=>{},onSelectMoodBoard:()=>{},onToggleExpansion:Wa,onOpenActionMenu:Vo,onOpenSettings:_a,projectColorMeanings:Qa(h,t.projectColorMeanings)}):e.jsx("div",{className:"workhub-empty-state",children:"No project items in this workspace yet."})})})})]},a)})}):Ta?e.jsxs(e.Fragment,{children:[Kt!=="finance"&&e.jsxs("div",{className:"workhub-tree-group",children:[e.jsxs("button",{type:"button",className:"workhub-tree-group-toggle",onClick:Lg,children:[e.jsxs("span",{className:"workhub-tree-group-label",children:[e.jsx("span",{className:"workhub-tree-group-caret",children:Ad?"▾":"▸"}),e.jsx("strong",{children:"Projects"})]}),e.jsxs("small",{children:[ln.length," root item",ln.length===1?"":"s"]})]}),Ad&&(ln.length>0?e.jsx("div",{className:"workhub-tree-group-body",children:e.jsx(Ja,{nodes:ln,treeMetaDisplayMode:xa,showProjectColorDots:ya,selectedProjectId:O,expandedProjectIds:Uo,directTaskCountByProjectId:sn,unreadCommentCountByProjectId:mn,taskProgressByProjectId:dr,projectIntentById:wo,projectIntentIconById:Sa,selectedDocumentId:ie==="notes"?k:"",selectedMoodBoardId:ie==="moodboard"?bt:"",documentsByProjectId:Oa,moodBoardsByProjectId:Ra,isPrivilegedMember:Wo,onSelectProject:Rl,onSelectDocument:_l,onSelectMoodBoard:Wl,onToggleExpansion:Wa,onOpenActionMenu:Vo,onOpenSettings:_a,projectColorMeanings:kt})}):e.jsx("div",{className:"workhub-empty-state",children:"No technical projects found yet. Create a project in a technical workspace first."}))]}),gh.length>0&&e.jsx("div",{className:"workhub-tree-group-body",children:e.jsx(Ja,{nodes:gh,treeMetaDisplayMode:xa,showProjectColorDots:ya,selectedProjectId:O,expandedProjectIds:Uo,directTaskCountByProjectId:sn,unreadCommentCountByProjectId:mn,taskProgressByProjectId:dr,projectIntentById:wo,projectIntentIconById:Sa,selectedDocumentId:ie==="notes"?k:"",selectedMoodBoardId:ie==="moodboard"?bt:"",documentsByProjectId:Oa,moodBoardsByProjectId:Ra,isPrivilegedMember:Wo,onSelectProject:Rl,onSelectDocument:_l,onSelectMoodBoard:Wl,onToggleExpansion:Wa,onOpenActionMenu:Vo,onOpenSettings:_a,projectColorMeanings:kt})})]}):Na.length>0?e.jsx(Ja,{nodes:lr,treeMetaDisplayMode:xa,showProjectColorDots:ya,selectedProjectId:O,expandedProjectIds:Uo,directTaskCountByProjectId:sn,unreadCommentCountByProjectId:mn,taskProgressByProjectId:dr,projectIntentById:wo,projectIntentIconById:Sa,selectedDocumentId:ie==="notes"?k:"",selectedMoodBoardId:ie==="moodboard"?bt:"",documentsByProjectId:Oa,moodBoardsByProjectId:Ra,isPrivilegedMember:Wo,onSelectProject:Rl,onSelectDocument:_l,onSelectMoodBoard:Wl,onToggleExpansion:Wa,onOpenActionMenu:Vo,onOpenSettings:_a,projectColorMeanings:kt}):e.jsxs("div",{className:"workhub-empty-state workhub-empty-projects-cta",children:[e.jsx("span",{children:Xk}),e.jsxs("div",{className:"workhub-row",children:[e.jsx("button",{type:"button",className:"workhub-primary-mini",onClick:()=>qa?.onClick(),disabled:!u||!qa,children:qa?.label||"Create first item"}),e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:()=>o("/mood-board-v2"),children:"Mood Board #2"}),e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:()=>o("/flow-project-plan"),children:"Flow Project Plan"})]})]})})]})]}),!Xe&&!Pr&&e.jsx("div",{className:"workhub-tree-resize-handle",onPointerDown:Og,onPointerMove:Rg,onPointerUp:_g}),e.jsxs("section",{className:"workhub-main-stage",children:[ie==="dashboard"&&e.jsxs("main",{className:`workhub-section-stack is-dashboard${sp?" workhub-dashboard-with-details":""}`,children:[e.jsxs("div",{className:"workhub-dashboard-stack",children:[e.jsxs("section",{className:"workhub-panel",children:[e.jsxs("div",{className:"workhub-panel-head compact",children:[e.jsx("div",{children:e.jsx("h2",{children:Nm})}),e.jsxs("div",{className:"workhub-panel-head-controls",children:[e.jsx("span",{className:"workhub-badge",children:j?`${Aa.length} direct children`:`${Me.length} visible projects`}),e.jsx("button",{type:"button",className:"workhub-collapse-toggle",onClick:()=>se(t=>!t),"aria-expanded":!R,"aria-label":R?"Expand proposal summary":"Collapse proposal summary",title:R?"Expand proposal summary":"Collapse proposal summary",children:R?"▾":"▴"})]})]}),!R&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"workhub-summary-strip",children:[e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Yt.total}),e.jsx("span",{children:"Tasks in view"})]}),e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Yt.inProgress}),e.jsx("span",{children:"In progress"})]}),e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Yt.urgent}),e.jsx("span",{children:"Urgent"})]}),e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:xg}),e.jsx("span",{children:"Restricted projects"})]})]}),Ee&&e.jsxs("div",{className:"workhub-summary-strip",children:[e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Sm}),e.jsx("span",{children:j?`${oc(Gt.subjectLabel)} summary value`:"Workspace total value"})]}),e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Dm}),e.jsx("span",{children:j?"Sub-leads value":"Leads value"})]}),e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Mm}),e.jsx("span",{children:j?"Sub-proposals value":"Proposals value"})]}),e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Tm}),e.jsx("span",{children:j?"Sub-finance value":"Finance value"})]}),e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Im}),e.jsx("span",{children:j?"Sub-marketing value":"Marketing value"})]})]}),!Xe&&e.jsxs("div",{className:"workhub-home-actions",children:[j&&e.jsx("button",{className:"workhub-primary-btn",onClick:()=>Mn(j.id),children:`${Gt.icon} ${Gt.actionLabel}`}),j&&e.jsx("button",{className:"workhub-ghost-btn",onClick:()=>Ol(j.id),children:"✅ Add task"}),j&&(dr[j.id]?.total??0)>0&&e.jsx("button",{className:"workhub-ghost-btn",onClick:()=>ut("tasks",u,j.id),children:"View tasks"})]}),Xe&&e.jsxs("div",{className:"workhub-mobile-dashboard-actions",children:[j&&e.jsx("button",{className:"workhub-primary-btn",onClick:()=>Mn(j.id),children:`${Gt.icon} ${Gt.actionLabel}`}),j&&e.jsx("button",{className:"workhub-ghost-btn",onClick:()=>Ol(j.id),children:"✅ Add task"}),j&&(dr[j.id]?.total??0)>0&&e.jsx("button",{className:"workhub-ghost-btn",onClick:()=>ut("tasks",u,j.id),children:"View tasks"})]})]}),De==="proposals_leads"&&j&&e.jsxs("div",{className:"workhub-inline-children-block",children:[e.jsx("div",{className:"workhub-inline-children-head",children:e.jsx("h3",{children:Ch})}),e.jsxs("div",{className:"workhub-project-card-grid",children:[Aa.map(t=>Nh(t,0)),Aa.length===0&&e.jsx("div",{className:"workhub-empty-state",children:"No child projects here yet."})]})]}),j&&at&&e.jsxs("div",{className:"workhub-proposal-focus-grid",children:[e.jsxs("article",{className:"workhub-overview-card workhub-proposal-focus-card",children:[e.jsxs("div",{className:"workhub-overview-head",children:[e.jsx("h3",{children:"Proposal intelligence"}),e.jsx("span",{children:at.countdownShort})]}),e.jsxs("div",{className:"workhub-proposal-focus-meta",children:[at.tenderNumber&&e.jsxs("span",{className:"workhub-proposal-chip",children:[e.jsx("strong",{children:"Tender #"}),e.jsx("em",{className:"workhub-ltr-token",children:at.tenderNumber})]}),at.proposalId&&e.jsxs("span",{className:"workhub-proposal-chip",children:[e.jsx("strong",{children:"Proposal ID"}),e.jsx("em",{className:"workhub-ltr-token",children:at.proposalId})]}),at.clientName&&e.jsxs("span",{className:"workhub-proposal-chip",children:[e.jsx("strong",{children:"Client"}),e.jsx("em",{dir:"auto",children:at.clientName})]}),e.jsxs("span",{className:"workhub-proposal-chip",children:[e.jsx("strong",{children:"Value"}),e.jsxs("em",{className:"workhub-ltr-token",children:[at.totalCurrency," ",at.totalAmount.toLocaleString("en-US")]})]})]}),e.jsxs("div",{className:"workhub-proposal-deadline-row",children:[e.jsxs("div",{className:"workhub-proposal-deadline-col",children:[e.jsx("span",{children:at.deadlineLabel}),e.jsx("strong",{className:"workhub-ltr-token",children:at.deadlineDate||"Not set"})]}),e.jsxs("div",{className:"workhub-proposal-deadline-col",children:[e.jsx("span",{children:"Submission time"}),e.jsx("strong",{className:"workhub-ltr-token",children:at.submissionTimeLabel||"Not set"})]}),e.jsxs("div",{className:`workhub-proposal-deadline-col is-countdown${at.isOverdue?" is-over":""}`,children:[e.jsx("span",{children:at.timeLeftLabel}),e.jsx("strong",{className:"workhub-ltr-token",children:at.timeLeftText})]})]}),at.hasDeadline&&e.jsx("div",{className:"workhub-project-risk-progress-track workhub-proposal-countdown-track","aria-hidden":"true",children:e.jsx("span",{style:{width:`${at.urgencyPercent}%`}})}),e.jsx("p",{className:"workhub-proposal-brief",children:at.brief||"Add a short brief in the description to keep the team aligned on this submission."})]}),e.jsxs("article",{className:"workhub-overview-card workhub-proposal-focus-card",children:[e.jsxs("div",{className:"workhub-overview-head",children:[e.jsx("h3",{children:"Documents and mood boards"}),e.jsxs("span",{children:[Sl.length," previews"]})]}),e.jsxs("div",{className:"workhub-summary-strip workhub-proposal-doc-counters",children:[e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Dl.docs}),e.jsx("span",{children:"Docs"})]}),e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Dl.notes}),e.jsx("span",{children:"Notes"})]}),e.jsxs("div",{className:"workhub-summary-tile",children:[e.jsx("strong",{children:Dl.moodBoards}),e.jsx("span",{children:"Mood boards"})]})]}),Sl.length>0?e.jsx("div",{className:"workhub-proposal-thumb-grid",children:Sl.map(t=>e.jsxs("figure",{className:"workhub-proposal-thumb",title:`${t.label} · ${t.source}`,children:[e.jsx("img",{src:t.url,alt:t.label,loading:"lazy"}),e.jsxs("figcaption",{children:[e.jsx("strong",{dir:"auto",children:t.label}),e.jsx("span",{children:t.source})]})]},t.id))}):e.jsx("div",{className:"workhub-empty-state",children:"No document or mood board image previews yet for this scope."}),Ah.length>0&&e.jsx("div",{className:"workhub-proposal-doc-list",children:Ah.map(t=>e.jsxs("button",{type:"button",className:`workhub-proposal-doc-item${t.hasOutgoingReferences&&!t.referenceSourceDocumentId?" is-public-source":""}`,onClick:()=>{ge(t.id),p("notes")},title:t.projectName?`${t.title} · ${t.projectName}`:t.title,children:[e.jsx("span",{className:"workhub-proposal-doc-icon","aria-hidden":"true",children:Np(t)}),e.jsxs("span",{className:"workhub-proposal-doc-copy",children:[e.jsxs("strong",{dir:"auto",children:[t.title,t.hasOutgoingReferences&&!t.referenceSourceDocumentId?" (Public source)":""]}),e.jsxs("small",{children:[t.projectName||(t.type==="note"?"Note":"Document"),t.referenceSourceDocumentId?" • Reference":"",t.hasOutgoingReferences&&!t.referenceSourceDocumentId?" • Public source":""]})]})]},t.id))})]})]}),O==="all"&&e.jsxs("div",{className:"workhub-overview-dashboard",children:[e.jsxs("article",{className:"workhub-overview-card",children:[e.jsxs("div",{className:"workhub-overview-head",children:[e.jsx("h3",{children:"Status distribution"}),e.jsxs("span",{children:[Yt.total," tasks"]})]}),e.jsx("div",{className:"workhub-overview-status-list",children:kg.map(t=>{const a=Yt.total>0?Math.round(t.count/Yt.total*100):0;return e.jsxs("div",{className:"workhub-overview-status-row",children:[e.jsxs("div",{className:"workhub-overview-status-label",children:[e.jsx("span",{className:"status-dot",style:{background:t.color}}),e.jsx("span",{children:t.label}),e.jsx("strong",{children:t.count})]}),e.jsx("div",{className:"workhub-overview-status-bar",children:e.jsx("span",{style:{width:`${Math.max(a,t.count>0?6:0)}%`,background:t.color}})})]},t.id)})})]}),e.jsxs("article",{className:"workhub-overview-card",children:[e.jsxs("div",{className:"workhub-overview-head",children:[e.jsx("h3",{children:"Priority load"}),e.jsxs("span",{children:[Yt.urgent," urgent"]})]}),e.jsx("div",{className:"workhub-overview-priority-stack",children:Ih.map(t=>{const a=Math.max(Yt.total,1),n=Math.max(Math.round(t.count/a*100),t.count>0?7:0);return e.jsx("div",{className:"workhub-overview-priority-segment",style:{width:`${n}%`,background:t.color,opacity:t.count>0?1:.24},title:`${t.label}: ${t.count}`},t.id)})}),e.jsx("div",{className:"workhub-overview-priority-legend",children:Ih.map(t=>e.jsxs("span",{children:[e.jsx("i",{style:{background:t.color}}),t.label," ",t.count]},t.id))})]}),e.jsxs("article",{className:"workhub-overview-card",children:[e.jsxs("div",{className:"workhub-overview-head",children:[e.jsx("h3",{children:"Priority projects & deadlines"}),e.jsxs("span",{children:[yg.length," tracked"]})]}),e.jsxs("div",{className:"workhub-project-risk-list",children:[$h.length===0&&e.jsx("div",{className:"workhub-empty-state",children:"No high-priority projects with upcoming deadlines."}),$h.map(t=>e.jsxs("button",{type:"button",className:`workhub-project-risk-item${t.isNearTwoDays?" is-near-deadline":""}`,onClick:()=>ur(t.id),children:[e.jsxs("div",{className:"workhub-project-risk-item-main",children:[e.jsxs("div",{className:"workhub-project-risk-title-wrap",children:[e.jsx("strong",{dir:"auto",children:t.name}),t.clientName&&e.jsx("span",{className:"workhub-project-risk-client",dir:"auto",children:t.clientName})]}),e.jsx("span",{className:`workhub-project-risk-priority-chip priority-${t.priority}`,children:fc.find(a=>a.value===t.priority)?.label||t.priority})]}),e.jsxs("div",{className:"workhub-project-risk-meta-row",children:[e.jsxs("div",{className:"workhub-project-risk-calendar","aria-hidden":"true",children:[e.jsx("span",{className:"workhub-project-risk-calendar-head",children:"DUE"}),e.jsx("span",{className:"workhub-project-risk-calendar-date workhub-ltr-token",children:t.deadlineDate})]}),e.jsxs("div",{className:"workhub-project-risk-date-wrap",children:[e.jsx("span",{children:t.type==="tender"?"Submission deadline":"Final submission deadline"}),e.jsxs("div",{className:"workhub-project-risk-date-values",children:[e.jsx("span",{className:"workhub-ltr-token",children:t.deadlineDate}),t.submissionTime&&e.jsx("span",{className:"workhub-ltr-token",children:t.submissionTime})]})]}),e.jsx("div",{className:`workhub-project-risk-clock${t.isOverdue?" is-overdue":""}`,style:{"--wh-risk-progress":`${t.urgencyPercent}%`},"aria-label":t.countdownText,children:e.jsx("span",{className:"workhub-ltr-token",children:t.countdownShort})})]}),e.jsx("div",{className:"workhub-project-risk-progress-track","aria-hidden":"true",children:e.jsx("span",{style:{width:`${t.urgencyPercent}%`}})}),e.jsx("small",{className:"workhub-project-risk-countdown",children:t.countdownText})]},t.id))]})]}),e.jsxs("article",{className:"workhub-overview-card",children:[e.jsxs("div",{className:"workhub-overview-head",children:[e.jsx("h3",{children:"Completion progress"}),e.jsxs("span",{children:[Ph,"%"]})]}),e.jsx("div",{className:"workhub-overview-progress-track",children:e.jsx("span",{style:{width:`${Ph}%`}})}),e.jsxs("div",{className:"workhub-overview-progress-meta",children:[e.jsxs("span",{children:[zh," completed"]}),e.jsxs("span",{children:[Math.max(Yt.total-zh,0)," remaining"]})]})]}),e.jsxs("article",{className:"workhub-overview-card",children:[e.jsxs("div",{className:"workhub-overview-head",children:[e.jsx("h3",{children:"Recent timeline"}),e.jsxs("span",{children:[Nl.length," events"]})]}),e.jsxs("div",{className:"workhub-overview-timeline",children:[Nl.length===0&&e.jsx("div",{className:"workhub-empty-state",children:"No activity yet."}),Nl.map(t=>e.jsxs("div",{className:"workhub-overview-timeline-item",children:[e.jsx("span",{className:"timeline-dot"}),e.jsxs("div",{children:[e.jsx("strong",{children:t.actor}),e.jsx("p",{children:t.message}),e.jsx("small",{children:t.createdAt})]})]},t.id))]})]}),e.jsxs("article",{className:"workhub-overview-card workhub-overview-card-full",children:[e.jsxs("div",{className:"workhub-overview-head",children:[e.jsx("h3",{children:"Team activity"}),e.jsxs("span",{children:["Last ",gn.windowDays," days"]})]}),gn.rows.length===0?e.jsx("div",{className:"workhub-empty-state",children:"No team members or activity in this period."}):e.jsx("div",{className:"workhub-team-activity-wrap",children:e.jsxs("div",{className:"workhub-team-activity-grid",style:{gridTemplateColumns:`160px repeat(${gn.days.length}, 32px)`},children:[e.jsx("div",{className:"workhub-tah-label-cell"}),kn.map((t,a)=>{const n=new Date(t+"T12:00:00").getDay(),l=n===0||n===6,h=kn[a-1],m=a===0||t.slice(5,7)!==h.slice(5,7),S=new Date(t+"T12:00:00").toLocaleString(void 0,{month:"short"});return e.jsxs("div",{className:`workhub-tah-day-head${l?" is-weekend":""}${m?" is-month-start":""}`,title:t,children:[e.jsx("span",{className:`workhub-tah-month-label${m?" is-visible":""}`,children:m?S:""}),e.jsx("span",{children:t.slice(8)})]},t)}),gn.rows.map(t=>e.jsxs(r.Fragment,{children:[e.jsxs("div",{className:"workhub-tah-label-cell",children:[e.jsx("span",{className:"workhub-tah-avatar",children:t.initials}),e.jsx("span",{className:"workhub-tah-name",children:t.name}),e.jsx("span",{className:"workhub-tah-total",children:t.totalInWindow})]}),kn.map((a,n)=>{const l=t.dayCounts[t.dayCounts.length-1-n]??0,h=new Date(a+"T12:00:00").getDay(),m=h===0||h===6,S=kn[n-1],P=n===0||a.slice(5,7)!==S.slice(5,7),U=l===0?0:l===1?1:l<=3?2:l<=6?3:4;return e.jsx("div",{className:`workhub-tah-cell lv${U}${m?" is-weekend":""}${P?" is-month-start":""}`,title:`${t.name} · ${a} · ${l} action${l!==1?"s":""}`},a)})]},t.uid))]})})]})]})]}),!(De==="proposals_leads"&&j)&&e.jsxs("section",{className:"workhub-panel",children:[e.jsx("div",{className:"workhub-panel-head compact",children:e.jsx("div",{children:e.jsx("h2",{children:Ch})})}),e.jsxs("div",{className:"workhub-project-card-grid",children:[Aa.map(t=>Nh(t,0)),Aa.length===0&&e.jsx("div",{className:"workhub-empty-state",children:"No child projects here yet."})]})]})]}),sp&&e.jsx("aside",{className:"workhub-task-detail-rail is-expanded",children:e.jsx(r.Suspense,{fallback:e.jsx("div",{className:"workhub-empty-state",children:"Loading details…"}),children:e.jsx(o0,{...np})})})]}),ie==="users"&&Ee&&e.jsx(r.Suspense,{fallback:e.jsx("main",{className:"workhub-section-stack",children:e.jsx("section",{className:"workhub-panel",children:e.jsx("div",{className:"workhub-empty-state",children:"Loading user management…"})})}),children:e.jsx(r0,{userWorkspaceFilter:Pi,setUserWorkspaceFilter:sb,expandedUserPickerUid:ib,setExpandedUserPickerUid:nb,visibleWorkspaces:Ne,workspaceDisplayNameById:hr,userManagementApprovedMembers:Pm,userManagementPendingMembers:zm,userManagementMembers:Ea,normalizedMasterEmail:wa,memberWorkspaceSummaryByUid:Dh,userAccessEffectiveByUid:$m,busyKey:We,userAccessDraftDirtyByUid:Th,memberNameDraftByUid:du,setMemberNameDraftByUid:uu,handleSaveMemberDisplayName:Ck,handleApproveRequestGlobal:Bm,handleMemberModeration:Jh,handleSetUserAccessModeDraft:Um,handleToggleUserWorkspaceDraft:Lm,handleSetUserWorkspaceLevelDraft:Om,handleDiscardUserAccessDraft:Rm,handleSaveUserAccessDraft:_m,selectedWorkspaceId:u})}),ie==="clients"&&e.jsx(r.Suspense,{fallback:e.jsx("main",{className:"workhub-section-stack",children:e.jsx("section",{className:"workhub-panel",children:e.jsx("div",{className:"workhub-empty-state",children:"Loading client management…"})})}),children:e.jsx(a0,{selectedClientId:pt,setSelectedClientId:na,busyKey:We,handleCreateClientFromManager:bk,handleSaveClientDetails:uk,handleDeleteClientDetails:hk,clients:D,projects:x,visibleWorkspaces:Ne,workspaceDisplayNameById:hr,clientNameDraft:gs,setClientNameDraft:ks,clientContactPersonDraft:ws,setClientContactPersonDraft:xs,clientEmailDraft:la,setClientEmailDraft:ys,clientPhoneDraft:vs,setClientPhoneDraft:js,clientWebsiteDraft:Cs,setClientWebsiteDraft:Ns,clientAddressDraft:Ss,setClientAddressDraft:Ds,clientIndustryDraft:Ms,setClientIndustryDraft:Ts,clientLogoUrlDraft:Is,setClientLogoUrlDraft:$i,clientNotesDraft:zs,setClientNotesDraft:Ps,handleClientLogoFileUpload:fk})}),ie==="notes"&&e.jsx(r.Suspense,{fallback:e.jsx("main",{className:"workhub-section-stack",children:e.jsx("section",{className:"workhub-panel",children:e.jsx("div",{className:"workhub-empty-state",children:"Loading document editor…"})})}),children:e.jsx(Zx,{hookInput:{selectedDocument:Pe??void 0,selectedWorkspaceId:u,workspaceProjectById:Qe,workhubShareCandidates:oh,allWorkspaceIds:Ne.map(t=>({id:t.id,name:t.name})),allWorkspaceProjects:x.map(t=>({id:t.id,name:t.name,workspaceId:t.workspaceId})),isPrivilegedMember:Ee,showToast:s,setBusyKey:le,setSelectedDocumentId:ge,createActivity:Ze,createNotifications:bo,deleteDocument:Tw,normalizeMemberUids:ve},selectedDocument:Pe??void 0,scopedWorkspaceDocuments:Ml,selectedProjectId:O,projectBrandingByProjectId:vf,taskContextTrail:bl,taskContextIconByProjectId:Object.fromEntries(bl.map(t=>[t.id,pl[t.id]?.icon||"📁"])),selectedProjectPeriodLabel:bh,selectedProjectSubmissionTimeLabel:fh,onSelectProject:ur,busyKey:We,memberByUid:no,workspaceProjectById:Qe,workhubShareCandidates:oh,isImageAttachmentUrl:Xl,openAttachmentLightbox:Zu,formatTime:kr,openDocumentCreateDialog:Oh,onOpenDocumentSettings:jg,isMobileLayout:Xe,discussionComments:fe,onDiscussionSend:Pl,discussionBusy:We==="comment",discussionNotifyMode:fo,discussionNotifyUids:or,discussionNotifyCandidates:Tl,onDiscussionNotifyModeChange:hs,onDiscussionNotifyUidsChange:Ni,discussionEditingId:ea,discussionEditingText:ta,onDiscussionEditStart:$l,onDiscussionEditChange:tr,onDiscussionEditCancel:qr,onDiscussionEditSave:Al,discussionEditBusyKey:We,onDiscussionDelete:El,discussionDeleteBusyKey:We,currentUid:J.currentUser?.uid||"",allWorkspaceIds:Ne.map(t=>({id:t.id,name:t.name})),allWorkspaceProjects:x.map(t=>({id:t.id,name:t.name,workspaceId:t.workspaceId})),isPrivilegedMember:Ee})}),ie==="moodboard"&&e.jsx(r.Suspense,{fallback:e.jsx("main",{className:"workhub-section-stack",children:e.jsx("section",{className:"workhub-panel",children:e.jsx("div",{className:"workhub-empty-state",children:"Loading mood board editor…"})})}),children:e.jsx(e0,{isResolvingActiveMoodBoard:Mg,activeMoodBoard:Je,selectedWorkspaceId:u,resolvedMoodboardPanelMode:Dg,setSelectedMoodBoardId:He,setActiveSection:p,showToast:s,activeMoodBoardChecklist:Sg,moodBoardChecklistDraft:hb,setMoodBoardChecklistDraft:pb,moodBoardEditingChecklistId:bb,setMoodBoardEditingChecklistId:fb,moodBoardEditingChecklistText:mb,setMoodBoardEditingChecklistText:gb,comments:fe,currentUid:J.currentUser?.uid||"",memberByUid:no,formatTime:kr,editingCommentId:ea,editingCommentText:ta,onDiscussionEditStart:$l,onDiscussionEditChange:tr,onDiscussionEditCancel:qr,onDiscussionEditSave:Al,onDiscussionDelete:El,onDiscussionSend:Pl,busyKey:We,normalizeColorInputValue:Op,hexToRgba:l0,getColorAlpha:s0})}),ie==="tasks"&&e.jsx(r.Suspense,{fallback:e.jsx("main",{className:"workhub-section-stack",children:e.jsx("section",{className:"workhub-panel",children:e.jsx("div",{className:"workhub-empty-state",children:"Loading tasks…"})})}),children:e.jsx(t0,{...np})}),ie==="home"&&e.jsx(r.Suspense,{fallback:e.jsx("main",{className:"workhub-section-stack",children:e.jsx("section",{className:"workhub-panel",children:e.jsx("div",{className:"workhub-empty-state",children:"Loading home…"})})}),children:e.jsx(i0,{selectedWorkspaceId:u,selectedWorkspaceName:ze?.name||"",selectedProjectDisplayName:j?Lf:"All projects",taskTotal:Yt.total,membersWithAssignedTasks:wg.length,selectedWorkspaceHomeTemplate:sl,selectedWorkspaceWarning:nl.warning||"",homeTemplateWidgets:vg,navigateToWorkspaceSection:ut,openWorkspaceSettings:vn})}),Xe&&e.jsxs("nav",{className:"workhub-mobile-footer","aria-label":"Mobile navigation",children:[e.jsxs("button",{type:"button",className:`workhub-mobile-footer-btn${Ge==="home"?" is-active":""}`,onClick:()=>{qt(!1),ut("home")},"aria-label":"Home",title:"Home",children:[e.jsx("span",{"aria-hidden":"true",children:"⌂"}),e.jsx("small",{children:"Home"})]}),e.jsxs("button",{type:"button",className:`workhub-mobile-footer-btn${Ge==="tasks"?" is-active":""}`,onClick:()=>{qt(!1),ut("tasks")},"aria-label":"Tasks",title:"Tasks",children:[e.jsx("span",{"aria-hidden":"true",children:"☑"}),e.jsx("small",{children:"Tasks"})]}),e.jsxs("button",{type:"button",className:"workhub-mobile-footer-btn workhub-mobile-footer-btn-quick",onClick:t=>{qt(!1),Vo("__workspace__",t)},"aria-label":"Quick add",title:"Quick add",disabled:!u,children:[e.jsx("span",{"aria-hidden":"true",children:"+"}),e.jsx("small",{children:"Add"})]}),e.jsxs("button",{type:"button",className:`workhub-mobile-footer-btn${rr?" is-active":""}`,onClick:()=>{qt(!1),dt(!1),ca(t=>!t)},"aria-label":"Workspaces",title:"Workspaces",children:[e.jsx("span",{"aria-hidden":"true",children:"▤"}),e.jsx("small",{children:"Workspaces"})]}),e.jsxs("button",{type:"button",className:"workhub-mobile-footer-btn",onClick:()=>{qt(!1),te(!1),lh()},"aria-label":"Account settings",title:"Account settings",children:[e.jsx("span",{"aria-hidden":"true",children:"◯"}),e.jsx("small",{children:"Account"})]})]})]})]}),Nf&&e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:t=>{t.target===t.currentTarget&&an()},children:e.jsxs("div",{className:"workhub-modal workhub-global-finder-modal",onMouseDown:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"workhub-modal-head",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Find entity by name"}),e.jsx("p",{children:"Search leads, proposals, and projects across every workspace you can access."})]}),e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:an,children:"Close"})]}),e.jsxs("div",{className:"workhub-global-finder-body",children:[e.jsxs("label",{className:"workhub-global-finder-input-wrap",children:[e.jsx("span",{children:"Search"}),e.jsx("input",{ref:Df,type:"text",value:dl,onChange:t=>{ih(t.target.value),ja(0)},onKeyDown:t=>{if(t.key==="ArrowDown"){t.preventDefault(),ja(a=>Math.min(a+1,Math.max(on.length-1,0)));return}if(t.key==="ArrowUp"){t.preventDefault(),ja(a=>Math.max(a-1,0));return}if(t.key==="Enter"){t.preventDefault();const a=rn>=0?rn:0,n=on[a];n&&tp(n);return}t.key==="Escape"&&(t.preventDefault(),an())},placeholder:"Type an entity name"})]}),e.jsx("div",{className:"workhub-global-finder-results",role:"listbox","aria-label":"Entity search results",children:on.length===0?e.jsx("div",{className:"workhub-global-finder-empty",children:dl.trim()?`No entities match "${dl.trim()}".`:"No entities available yet."}):on.map((t,a)=>e.jsxs("button",{type:"button",className:`workhub-global-finder-result${a===rn?" is-active":""}`,onMouseEnter:()=>ja(a),onClick:()=>tp(t),role:"option","aria-selected":a===rn,children:[e.jsxs("div",{className:"workhub-global-finder-result-main",children:[e.jsx("strong",{children:t.name}),e.jsx("span",{className:"workhub-global-finder-result-type",children:t.subjectLabel})]}),e.jsxs("div",{className:"workhub-global-finder-result-meta",children:[e.jsx("span",{children:t.workspaceName}),t.clientName&&e.jsx("span",{children:t.clientName})]})]},t.projectId))})]})]})}),e.jsx(gx,{isOpen:Vp,onClose:()=>qn(!1),workspaceName:ki,workspaceDescription:Dc,workspaceTemplateId:Tc,workspaceTemplates:Af,busyKey:We,canCreateWorkspace:Ee,onWorkspaceNameChange:Sc,onWorkspaceDescriptionChange:Mc,onWorkspaceTemplateChange:Ic,onCreateWorkspace:()=>{ik()}}),e.jsx(mx,{isOpen:Wp,createDialogType:Fp,onClose:()=>Gr(!1),onDialogTypeChange:Bn,projectName:Jn,projectParentId:od,projectDescription:rd,projectColor:es,projectStartDate:id,projectDeadline:nd,projectSubmissionTime:yi,projectType:as,projectPriority:sd,projectClientId:ld,clientOptions:D,closeProjectAfterCreate:cd,projectStorageMethod:ud,projectVisibility:jr,projectMemberUids:Cr,taskTitle:hd,taskDescription:bd,taskStatus:Ao,taskProjectId:Il,taskAssigneeUid:eo,taskPriority:md,taskStartDate:kd,taskDueDate:wd,taskStatusOptions:wt,projectColorOptions:Lt,projectColorMeanings:kt,projectOptions:fl,approvedMembers:Ht,taskAssignableMembers:qo,busyKey:We,canCreateProject:!!u,canCreateTask:!!u,onProjectNameChange:td,onProjectParentIdChange:Zn,onProjectDescriptionChange:ad,onProjectColorChange:ts,onProjectStartDateChange:os,onProjectDeadlineChange:rs,onProjectSubmissionTimeChange:Yr,onProjectTypeChange:is,onProjectPriorityChange:ns,onProjectClientIdChange:ss,onCreateClientInline:t=>Cn(t,void 0,u),onCloseProjectAfterCreateChange:Gp,onProjectStorageMethodChange:Yp,onProjectVisibilityChange:dd,onProjectMemberToggle:t=>{const a=Cr.includes(t);ls(n=>a?n.filter(l=>l!==t):[...n,t])},onTaskTitleChange:pd,onTaskDescriptionChange:fd,onTaskStatusChange:Xr,onTaskProjectIdChange:pe,onTaskAssigneeChange:Nr,onTaskPriorityChange:gd,onTaskStartDateChange:$k,onTaskDueDateChange:vi,onCreateProject:()=>{Kh()},onCreateProjectKeepOpen:()=>{Kh({keepDialogOpen:!0})},onCreateTask:()=>{gk()}}),e.jsx(Nx,{isOpen:Bp,intent:Zt,workspaceTemplateId:De,draft:wc,clientOptions:D,busyKey:We,canCreate:!!u,onCreateClientInline:t=>Cn(t,void 0,u),onDraftChange:t=>xc(a=>({...a,...t})),onClose:ep,onCreate:()=>{Ek()}}),e.jsx(kx,{isOpen:Bg,busyKey:We,canCreate:!!u,title:qg,body:Hg,projectId:Gg,projectOptions:fl,onTitleChange:Vg,onBodyChange:Kg,onProjectIdChange:Yg,onClose:Xg,onCreate:()=>{Qg()}}),e.jsx(wx,{isOpen:!!so,busyKey:We,document:so,workspaceOptions:Tf,projectOptions:ul,workspaceId:Cc,projectId:Hn,icon:Nc,onWorkspaceIdChange:Cg,onProjectIdChange:gi,onIconChange:Kn,onClose:Eh,onSave:()=>{Ng()}}),e.jsx(tx,{isOpen:Hp,onClose:()=>Kp(!1),members:$,isMasterAdmin:Yi,currentUserUid:J.currentUser?.uid||"",pendingCount:il.length,busyKey:We,onModerate:(t,a,n)=>{Jh(t,a,n)}}),e.jsx(ox,{workspace:Se,workspaceTemplateId:yo.id,workspaceTemplateLabel:yo.label,workspaceTemplateGraphic:yo.graphic,workspaceTemplateDescription:yo.description,workspaceTemplateWarning:yo.warning,busyKey:We,projectCount:pm,taskCount:bm,members:$,pendingMembers:il,approvedMembers:Ht,memberWorkspaceSummaryByUid:Dh,workspaceAccessMemberUids:Yn,workspaceInviteEmails:Xn,workspaceInviteEmailDraft:Gc,deleteTypedName:Yc,deletePhrase:Qc,deleteAcknowledge:Zc,settingsName:wi,settingsDescription:Pc,treeMetaDisplayMode:Ac,taskDueDisplayMode:Uc,activityWindowDays:Oc,moodBoardEnabled:_c,showProjectColorDots:Fc,onMoodBoardEnabledChange:Wc,onShowProjectColorDotsChange:Bc,projectColorMeanings:Gn,onClose:()=>bi(""),onSettingsNameChange:zc,onSettingsDescriptionChange:$c,onTreeMetaDisplayModeChange:Ec,onTaskDueDisplayModeChange:Lc,onActivityWindowDaysChange:Rc,onProjectColorMeaningChange:nk,onRemoveProjectColorMeaning:sk,onResetProjectColorMeanings:lk,onWorkspaceAccessToggle:Am,onToggleUserWorkspace:(t,a,n)=>{Em(t,a,n)},workspaces:V,onWorkspaceInviteDraftChange:Qn,onWorkspaceInviteAdd:Wm,onWorkspaceInviteRemove:Fm,onApproveRequest:qm,onRejectRequest:Vm,workspaceMemberAccessLevels:Vc,onMemberAccessLevelChange:(t,a)=>{Hm(t,a)},onDeleteTypedNameChange:Xc,onDeletePhraseChange:Jc,onDeleteAcknowledgeChange:ed,onSave:()=>{ck()},onDelete:()=>{dk()}}),e.jsx(Zw,{projectId:Ai,contextName:Ai&&Ai!=="__workspace__"?Qe[Ai]?.name??void 0:void 0,workspaceType:Kt,workspaceTemplateId:De,selectedProjectId:O,position:db,canManageProject:Wo,canCreateTopCategory:!!u,templateCreateActions:ap,onClose:wn,onCreateTask:t=>{if(t){Uk(t);return}Ol(t)},onCreateSubProject:t=>Mn(t),onCreateDocument:t=>{if(t){Jg(t);return}Oh(t||"")},onCreateNote:t=>{Zg(t||"")},onCreateTemplateEntity:(t,a)=>Zh(t,a||""),onOpenSettings:t=>vr(t),moodBoardEnabled:ze?.moodBoardEnabled!==!1,onOpenMoodBoardV2:async(t,a)=>{if(!u)return;const n=t==="workspace"?u:a,l=t==="workspace"?ze?.name||"Workspace":Qe[n]?.name||"Project",h=ot.filter(P=>P.entityType===t&&P.entityId===n&&P.panelVariant==="v2").length,m=h===0?`${l} — Mood Board 2`:`${l} — Mood Board 2 ${h+1}`,S=await Hl({workspaceId:u,entityType:t,entityId:n,title:m,panelVariant:"v2",createdBy:ce});He(S),ge(""),be(""),Ye("v2"),p("moodboard")},onOpenFlowProjectLab:async(t,a)=>{if(!u)return;const n=t==="workspace"?u:a,l=t==="workspace"?ze?.name||"Workspace":Qe[n]?.name||"Project",h=ot.filter(P=>P.entityType===t&&P.entityId===n&&P.panelVariant==="flow").length,m=h===0?`${l} — Flow Project Plan`:`${l} — Flow Project Plan ${h+1}`,S=await Hl({workspaceId:u,entityType:t,entityId:n,title:m,panelVariant:"flow",createdBy:ce});He(S),ge(""),be(""),Ye("flow"),p("moodboard")},onOpenMoodBoard:async(t,a)=>{if(!u)return;const n=t==="workspace"?u:a,l=t==="workspace"?ze?.name||"Workspace":Qe[n]?.name||"Project",h=ot.filter(P=>P.entityType===t&&P.entityId===n).length,m=h===0?`${l} — Mood Board`:`${l} — Mood Board ${h+1}`,S=await Hl({workspaceId:u,entityType:t,entityId:n,title:m,panelVariant:"v2",createdBy:ce});He(S),ge(""),be(""),Ye("v2"),p("moodboard")}}),e.jsx(fx,{project:ae,intent:et,entityIcon:un.icon,entityLabel:un.subjectLabel,canDelete:ae?.workspaceId===u,parentOptions:wm,clientOptions:D,approvedMembers:Ht,projectColors:Lt,projectColorMeanings:kt,settingsName:Ct,settingsDescription:Ud,settingsColor:oa,statusSuggestion:ym,settingsParentId:Tr,settingsDeadline:fs,settingsDeadlineLabel:wh,settingsSubmissionTime:Ir,settingsType:$t,typeOptions:km,settingsPriority:Wd,settingsTenderNumber:Yd,settingsProposalId:Qd,settingsTechnicalProposalUrl:Zd,settingsFinancialProposalUrl:tu,showMonetaryValue:mm,monetaryValueLabel:gm,settingsValueAmount:Bd,settingsValueCurrency:Vd,settingsMainPanelView:ra,settingsTaskItemDisplayMode:aa,settingsTaskStatuses:Kd,workspaceTaskStatuses:wt,settingsFolderNotifications:zi,settingsFolderNotificationsBusy:ab,settingsClientId:au,settingsStorageMethod:su,accessVisibility:Mi,accessMemberUids:Ti,childCount:ae?x.filter(t=>t.parentProjectId===ae.id).length:0,taskCount:ae?_.filter(t=>t.projectId===ae.id).length:0,busyKey:We,onClose:()=>vr(""),onNameChange:Ed,onDescriptionChange:Ld,onColorChange:Od,onParentChange:bs,onDeadlineChange:Rd,onSubmissionTimeChange:Ii,onTypeChange:_d,onPriorityChange:Fd,onTenderNumberChange:Xd,onProposalIdChange:Jd,onTechnicalProposalUrlChange:eu,onFinancialProposalUrlChange:ou,onValueAmountChange:qd,onValueCurrencyChange:Hd,onMainPanelViewChange:ru,onTaskItemDisplayModeChange:ms,onTaskStatusesChange:Gd,onFolderNotificationsChange:mk,onApplyViewSettingsToSubItems:()=>{Sk()},applyViewSettingsBusy:We===`access-propagate:${ae?.id||""}`,onClientChange:iu,onCreateClientInline:Cn,onStorageMethodChange:lu,onVisibilityChange:Pd,onToggleMember:t=>{const a=Ti.includes(t);$d(n=>a?n.filter(l=>l!==t):[...n,t])},onDelete:Tk,onSave:Nk,onEnsureDriveFolder:Mk,milestones:lo.milestones,milestoneProgress:lo.milestoneProgress,canEditMilestones:Ee,onAddMilestone:lo.handleOpenCreateMilestone,onEditMilestone:lo.handleOpenEditMilestone,onDeleteMilestone:lo.handleDeleteMilestone,onStatusChangeMilestone:lo.handleStatusChange}),e.jsx(Gx,{open:lo.milestoneDialogOpen,milestone:lo.editingMilestone,project:ae,onSave:t=>{lo.handleSaveMilestone(t)},onClose:lo.handleCloseMilestoneDialog}),Qi&&uo&&e.jsx("div",{className:"workhub-modal-backdrop workhub-image-review-backdrop",onMouseDown:t=>{t.target===t.currentTarget&&Yu("")},children:e.jsxs("div",{className:"workhub-modal workhub-image-review-modal",onMouseDown:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"workhub-image-review-topbar",children:[e.jsxs("div",{className:"workhub-image-review-topbar-title",children:[e.jsx("span",{className:"workhub-image-review-topbar-label",children:"Image review"}),e.jsx("span",{className:"workhub-image-review-topbar-hint",children:"Tap image to place markers · Double-click marker to edit"})]}),e.jsx("button",{className:"workhub-ghost-btn workhub-image-review-close-btn",onClick:()=>Yu(""),children:"Close"})]}),e.jsx("div",{className:"workhub-image-review-layout",children:e.jsxs("div",{className:"workhub-image-review-stage-wrap",children:[e.jsxs("div",{className:"workhub-image-review-toolbar",children:[e.jsxs("div",{className:"workhub-image-tool-group",children:[e.jsx("button",{type:"button",className:Ji==="point"?"is-active":"",onClick:()=>ol("point"),children:"Point"}),e.jsx("button",{type:"button",className:Ji==="line"?"is-active":"",onClick:()=>ol("line"),children:"Line"}),e.jsx("button",{type:"button",className:Ji==="checkbox"?"is-active":"",onClick:()=>ol("checkbox"),children:"Checkbox"})]}),e.jsx("span",{className:"workhub-image-review-tip",children:Ji==="line"&&cf?"Tap second point to finish line":"Tap image to add annotation"}),e.jsxs("div",{className:"workhub-image-review-fit-group",children:[e.jsx("button",{type:"button",className:Zi==="contain"?"is-active":"",onClick:()=>rl("contain"),children:"Fit"}),e.jsx("button",{type:"button",className:Zi==="cover"?"is-active":"",onClick:()=>rl("cover"),children:"Fill"}),e.jsx("button",{type:"button",className:Zi==="scale-down"?"is-active":"",onClick:()=>rl("scale-down"),children:"Smart"})]}),e.jsx("button",{type:"button",onClick:()=>{kf()},children:"Fullscreen"})]}),e.jsxs("div",{ref:bf,className:"workhub-image-review-stage",onClick:ff,style:Xu?{"--img-aspect":Xu}:void 0,children:[e.jsx("img",{src:Qi,alt:"Attachment",className:"workhub-image-review-image",style:{objectFit:Zi},onLoad:t=>{const a=t.currentTarget;lf(a.naturalWidth/a.naturalHeight)}}),e.jsx("svg",{className:"workhub-image-review-lines",viewBox:"0 0 100 100",preserveAspectRatio:"none",children:Hk.map(t=>e.jsx("line",{x1:t.x,y1:t.y,x2:t.x2,y2:t.y2,stroke:"#ff5f56",strokeWidth:"0.6",onClick:a=>{a.stopPropagation(),al(t.id)}},t.id))}),e.jsxs("div",{className:"workhub-image-review-pin-layer",children:[Vk.map(t=>e.jsx("button",{type:"button",className:`workhub-image-marker point${t.resolved?" is-resolved":""}`,style:{left:`${t.x}%`,top:`${t.y}%`},onClick:a=>{a.stopPropagation(),!Ju.current&&al(t.id)},onPointerDown:a=>eh(t.id,a),title:t.text||"Point annotation",children:op.get(t.id)||"?"},t.id)),qk.map(t=>e.jsx("button",{type:"button",className:`workhub-image-marker ${t.type}${t.resolved?" is-resolved":""}`,style:{left:`${t.x}%`,top:`${t.y}%`},onClick:a=>{a.stopPropagation(),!Ju.current&&al(t.id)},onPointerDown:a=>eh(t.id,a),title:t.text||"Checkbox annotation",children:op.get(t.id)||"?"},t.id))]}),Qu&&_t&&Fl&&e.jsxs("div",{className:"workhub-image-marker-inline-editor",style:{left:`min(calc(${Fl.x}% + 14px), calc(100% - 296px))`,top:`${Fl.y}%`},onClick:t=>t.stopPropagation(),children:[e.jsx("textarea",{value:df,onChange:t=>uf(t.target.value),placeholder:"Annotation note…",autoFocus:!0}),e.jsxs("label",{className:"workhub-image-marker-resolve-row",children:[e.jsx("input",{type:"checkbox",checked:hf,onChange:t=>pf(t.target.checked)}),e.jsx("span",{children:"Mark as resolved"})]}),e.jsxs("div",{className:"workhub-image-marker-editor-actions",children:[e.jsx("button",{type:"button",className:"workhub-image-inline-btn",onClick:mf,children:"Cancel"}),e.jsx("button",{type:"button",className:"workhub-image-inline-btn is-primary",onClick:gf,children:"Save"})]})]})]})]})})]})}),Jr&&e.jsx("div",{className:"workhub-modal-backdrop",onMouseDown:t=>{t.target===t.currentTarget&&Dn()},children:e.jsxs("div",{className:"workhub-modal workhub-status-editor-modal",onMouseDown:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"workhub-modal-head",children:[e.jsx("h2",{children:"Task Statuses"}),e.jsx("button",{className:"workhub-ghost-btn",onClick:Dn,children:"Close"})]}),e.jsxs("div",{className:"workhub-modal-form",children:[e.jsxs("div",{className:"workhub-status-editor-layout",children:[e.jsxs("div",{className:"workhub-status-editor-sidebar",children:[e.jsx("div",{className:"workhub-status-editor-list compact-list",children:st.map(t=>{const a=Ma[t.id]||0,n=Mt?.id===t.id;return e.jsx("button",{type:"button",className:`workhub-status-list-item${n?" is-active":""}`,onClick:()=>er(t.id),children:e.jsxs("span",{className:"workhub-status-list-item-main",children:[e.jsx("span",{className:"workhub-status-list-swatch",style:{background:t.color}}),e.jsxs("span",{className:"workhub-status-list-text",children:[e.jsx("strong",{children:t.label}),e.jsxs("small",{children:[a," task",a===1?"":"s"]})]})]})},t.id)})}),e.jsx("button",{type:"button",className:"workhub-status-add-btn",onClick:zk,children:"+ Add status"})]}),e.jsx("div",{className:"workhub-status-editor-detail",children:Mt?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"workhub-status-editor-detail-head",children:e.jsxs("div",{className:"workhub-inline-row",children:[e.jsx("span",{className:"workhub-status-list-swatch large",style:{background:Mt.color}}),e.jsxs("div",{children:[e.jsx("h3",{children:Mt.label}),e.jsxs("div",{className:"workhub-meta-line",children:[Ma[Mt.id]||0," task",(Ma[Mt.id]||0)===1?"":"s"]})]})]})}),e.jsxs("label",{children:[e.jsx("span",{children:"Name"}),e.jsx("input",{value:Mt.label,onChange:t=>Ll(Mt.id,{label:t.target.value}),placeholder:"Status name"})]}),e.jsxs("label",{children:[e.jsx("span",{children:"Color"}),e.jsx("input",{value:Mt.color,onChange:t=>Ll(Mt.id,{color:t.target.value}),placeholder:"#6d5efc"}),e.jsx("div",{className:"workhub-color-pills",style:{marginTop:6},children:Do.map(t=>e.jsx("button",{type:"button",className:`workhub-color-pill${Mt.color===t?" active":""}`,style:{background:t},onClick:()=>Ll(Mt.id,{color:t})},t))})]}),e.jsx("div",{className:"workhub-status-editor-detail-actions",children:e.jsx("button",{type:"button",className:"workhub-danger-btn",disabled:(Ma[Mt.id]||0)>0||st.length<=1,onClick:()=>Ik(Mt.id),children:"Delete"})})]}):e.jsx("div",{className:"workhub-empty-state",children:"Select a status to edit."})})]}),e.jsxs("div",{className:"workhub-project-settings-actions",children:[e.jsx("button",{className:"workhub-ghost-btn",onClick:Dn,children:"Cancel"}),e.jsx("button",{type:"button",className:"workhub-primary-btn",disabled:We==="status",onClick:()=>{Pk()},children:We==="status"?"Saving…":"Save"})]})]})]})}),Er&&e.jsx("div",{className:"workhub-modal-backdrop workhub-delete-prompt-backdrop",onMouseDown:t=>{t.target===t.currentTarget&&La("cancel")},children:e.jsxs("div",{className:"workhub-modal workhub-delete-prompt-modal",onMouseDown:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"workhub-modal-head",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Remove attachment"}),Er.isDriveFile?e.jsx("p",{children:"Choose how to remove this file."}):e.jsx("p",{children:"Are you sure you want to remove this attachment?"})]}),e.jsx("button",{className:"workhub-ghost-btn",onClick:()=>La("cancel"),children:"✕"})]}),e.jsxs("div",{className:"workhub-delete-prompt-filename",children:[e.jsx("span",{children:"📎"}),e.jsx("span",{children:Er.attachment.split("id=")[1]?.slice(0,32)||Er.attachment.split("/").pop()?.slice(0,48)||"Attachment"})]}),e.jsxs("div",{className:"workhub-delete-prompt-actions",children:[e.jsx("button",{type:"button",className:"workhub-primary-btn",onClick:()=>La("remove_only"),children:"Remove from list only"}),Er.isDriveFile&&e.jsx("button",{type:"button",className:"workhub-danger-btn",onClick:()=>La("delete_permanently"),children:"Remove & delete from Drive"}),e.jsx("button",{type:"button",className:"workhub-ghost-btn",onClick:()=>La("cancel"),children:"Cancel"})]})]})}),sr&&e.jsx("div",{className:"workhub-modal-backdrop workhub-delete-prompt-backdrop",onMouseDown:t=>{t.target===t.currentTarget&&We!==`client:delete:${sr.id}`&&Ba()},children:e.jsxs("div",{className:"workhub-modal workhub-delete-prompt-modal",onMouseDown:t=>t.stopPropagation(),children:[e.jsxs("div",{className:"workhub-modal-head",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Delete client"}),e.jsx("p",{children:"Are you sure you want to delete this client?"})]}),e.jsx("button",{className:"workhub-ghost-btn",disabled:We===`client:delete:${sr.id}`,onClick:Ba,children:"✕"})]}),e.jsxs("div",{className:"workhub-delete-prompt-filename",children:[e.jsx("span",{children:"🗑"}),e.jsx("span",{children:sr.name})]}),e.jsxs("div",{className:"workhub-delete-prompt-actions",children:[e.jsx("button",{type:"button",className:"workhub-danger-btn",disabled:We===`client:delete:${sr.id}`,onClick:()=>{pk()},children:We===`client:delete:${sr.id}`?"Deleting…":"Delete client"}),e.jsx("button",{type:"button",className:"workhub-ghost-btn",disabled:We===`client:delete:${sr.id}`,onClick:Ba,children:"Cancel"})]})]})}),Sr&&e.jsxs("div",{className:"workhub-batch-progress",role:"status","aria-live":"polite",children:[e.jsxs("div",{className:"workhub-batch-progress-head",children:[e.jsx("strong",{children:Sr.source==="dialog"?"Creating tasks":"Adding tasks"}),e.jsxs("span",{children:[Sr.created,"/",Sr.total]})]}),e.jsx("div",{className:"workhub-batch-progress-bar","aria-hidden":"true",children:e.jsx("span",{style:{width:`${Math.max(4,Math.round(Sr.created/Math.max(1,Sr.total)*100))}%`}})})]})]}),e.jsx(Xa,{phoneMaxWidth:Yo})]})}const A0=Object.freeze(Object.defineProperty({__proto__:null,default:y0},Symbol.toStringTag,{value:"Module"}));export{Qo as P,$0 as Q,P0 as T,A0 as W,jp as a,Xx as b,I0 as c,hi as d,z0 as e,Io as f,Rn as g,ct as n,Qx as s,Yx as u};
