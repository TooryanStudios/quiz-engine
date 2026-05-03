import { memo } from 'react'
import { WorkhubEntityIntentDetailForm } from './EntityIntentDetailForms'
import { WorkhubProjectAttachmentCard } from './WorkhubProjectAttachmentCard'

type WorkhubProjectDetailRailProps = Record<string, any>

export const WorkhubProjectDetailRail = memo(function WorkhubProjectDetailRail(props: WorkhubProjectDetailRailProps) {
  const {
    selectedProject,
    selectedProjectIntentMeta,
    selectedProjectColorDraft,
    canEditSelectedProject,
    isPrivilegedMember,
    canEditProjectAttachments,
    selectedProjectEffectiveIntent,
    selectedProjectNameDraft,
    setSelectedProjectNameDraft,
    handleSaveSelectedProjectDetails,
    selectedProjectTypeDraft,
    selectedProjectTypeOptions,
    setSelectedProjectTypeDraft,
    selectedProjectStartDateDraft,
    setSelectedProjectStartDateDraft,
    selectedProjectDeadlineDraft,
    setSelectedProjectDeadlineDraft,
    selectedProjectSubmissionTimeDraft,
    setSelectedProjectSubmissionTimeDraft,
    selectedProjectValueAmountDraft,
    setSelectedProjectValueAmountDraft,
    selectedProjectValueCurrencyDraft,
    setSelectedProjectValueCurrencyDraft,
    selectedProjectNarrativeDraft,
    setSelectedProjectNarrativeDraft,
    handleSelectedProjectDescriptionBlur,
    selectedProjectIntentDetailDrafts,
    setSelectedProjectIntentDetailDrafts,
    proposalServiceOptions,
    selectedProposalServicesDraft,
    setSelectedProposalServicesDraft,
    handleCreateProposalServiceOption,
    projectDiscussionNode,
    projectAttachmentsCollapsed,
    setProjectAttachmentsCollapsed,
    attachmentViewMode,
    setAttachmentViewMode,
    selectedProjectAttachmentTitleDraft,
    setSelectedProjectAttachmentTitleDraft,
    selectedProjectAttachmentDraft,
    setSelectedProjectAttachmentDraft,
    selectedProjectAttachmentFilePathDraft,
    setSelectedProjectAttachmentFilePathDraft,
    selectedProjectAttachmentFileDrafts,
    setSelectedProjectAttachmentFileDrafts,
    uploadingSelectedProjectAttachment,
    handleSelectedProjectAttachmentAdd,
    handleSelectedProjectAttachmentFileUpload,
    selectedProjectAttachments,
    deriveAttachmentTitle,
    handleSelectedProjectAttachmentUpdate,
    isImageAttachmentUrl,
    openAttachmentLightbox,
    handleSelectedProjectAttachmentRemove,
    selectedProjectColorMenuOpen,
    setSelectedProjectColorMenuOpen,
    selectedProjectColorMeaning,
    selectedWorkspaceProjectColorMeanings,
    handleSelectedProjectColorSelect,
    selectedWorkspaceDisplayName,
    projectNameById,
    formatTime,
    setProjectAccessDialogId,
    selectedProjectDetailsChanged,
    busyKey,
  } = props

  if (!selectedProject) {
    return (
      <div className="workhub-detail-card">
        <div className="workhub-empty-state">Select a task or workspace item to view details.</div>
      </div>
    )
  }



  return (
    <div className="workhub-detail-card">
      <div className="workhub-task-row-title detail-title">
        <span className="workhub-project-dot" style={{ background: selectedProjectColorDraft }} />
        <h3 className="workhub-project-properties-title">
          {canEditSelectedProject ? `${selectedProjectIntentMeta.subjectLabel} properties` : `${selectedProjectIntentMeta.subjectLabel} details`}
        </h3>
      </div>

      <WorkhubEntityIntentDetailForm
        intent={selectedProjectEffectiveIntent}
        canEdit={canEditSelectedProject}
        name={selectedProjectNameDraft}
        onNameChange={setSelectedProjectNameDraft}
        onNameEnter={() => { void handleSaveSelectedProjectDetails() }}
        projectType={selectedProjectTypeDraft}
        typeOptions={selectedProjectTypeOptions}
        onProjectTypeChange={setSelectedProjectTypeDraft}
        startDate={selectedProjectStartDateDraft}
        onStartDateChange={setSelectedProjectStartDateDraft}
        deadline={selectedProjectDeadlineDraft}
        onDeadlineChange={setSelectedProjectDeadlineDraft}
        submissionTime={selectedProjectSubmissionTimeDraft}
        onSubmissionTimeChange={setSelectedProjectSubmissionTimeDraft}
        valueAmount={selectedProjectValueAmountDraft}
        onValueAmountChange={setSelectedProjectValueAmountDraft}
        valueCurrency={selectedProjectValueCurrencyDraft}
        onValueCurrencyChange={setSelectedProjectValueCurrencyDraft}
        narrative={selectedProjectNarrativeDraft}
        onNarrativeChange={setSelectedProjectNarrativeDraft}
        onNarrativeBlur={() => { void handleSelectedProjectDescriptionBlur() }}
        detailDrafts={selectedProjectIntentDetailDrafts}
        onDetailDraftChange={(key, value) => {
          setSelectedProjectIntentDetailDrafts((current: any) => ({
            ...current,
            [key]: value,
          }))
        }}
        proposalServiceOptions={proposalServiceOptions}
        selectedProposalServices={selectedProposalServicesDraft}
        onSelectedProposalServicesChange={setSelectedProposalServicesDraft}
        canCreateProposalServiceOption={isPrivilegedMember}
        onCreateProposalServiceOption={(name) => { void handleCreateProposalServiceOption(name) }}
      />

      {projectDiscussionNode}

      <div className="workhub-detail-grid workhub-project-detail-grid">
        <div className="workhub-span-2">
          <WorkhubProjectAttachmentCard
            collapsed={projectAttachmentsCollapsed}
            onToggleCollapsed={() => setProjectAttachmentsCollapsed((current: boolean) => !current)}
            attachmentViewMode={attachmentViewMode}
            onAttachmentViewModeChange={setAttachmentViewMode}
            canEdit={canEditProjectAttachments ?? canEditSelectedProject}
            attachmentTitleDraft={selectedProjectAttachmentTitleDraft}
            onAttachmentTitleDraftChange={setSelectedProjectAttachmentTitleDraft}
            attachmentUrlDraft={selectedProjectAttachmentDraft}
            onAttachmentUrlDraftChange={setSelectedProjectAttachmentDraft}
            attachmentFilePathDraft={selectedProjectAttachmentFilePathDraft}
            attachmentFileDrafts={selectedProjectAttachmentFileDrafts}
            onAttachmentFileDraftsChange={setSelectedProjectAttachmentFileDrafts}
            onAttachmentFilePathDraftChange={setSelectedProjectAttachmentFilePathDraft}
            uploadingAttachment={uploadingSelectedProjectAttachment}
            onAddAttachment={() => { void handleSelectedProjectAttachmentAdd() }}
            onUploadAttachments={() => { void handleSelectedProjectAttachmentFileUpload() }}
            attachments={selectedProjectAttachments}
            getAttachmentTitle={(url) => selectedProject.attachmentTitles?.[url]?.trim() || deriveAttachmentTitle(url)}
            isImageAttachmentUrl={isImageAttachmentUrl}
            onOpenAttachmentLightbox={openAttachmentLightbox}
            onUpdateAttachment={(previousUrl, nextUrl, nextTitle) => { void handleSelectedProjectAttachmentUpdate(previousUrl, nextUrl, nextTitle) }}
            onRemoveAttachment={(url) => { void handleSelectedProjectAttachmentRemove(url) }}
          />
        </div>
      </div>

      <div className="workhub-detail-grid workhub-project-detail-grid">
        <label>
          <span>Status color</span>
          <div className="workhub-project-color-select">
            <button
              type="button"
              className={`workhub-project-color-select-btn${selectedProjectColorMenuOpen ? ' is-open' : ''}`}
              onClick={() => setSelectedProjectColorMenuOpen((current: boolean) => !current)}
              disabled={!canEditSelectedProject}
            >
              <span className="workhub-project-color-swatch" style={{ background: selectedProjectColorDraft }} />
              <span className="workhub-project-color-select-copy">
                <strong>{selectedProjectColorMeaning.label}</strong>
                <small>{selectedProjectColorMeaning.hint}</small>
              </span>
              <span className="workhub-project-color-caret" aria-hidden="true">{selectedProjectColorMenuOpen ? '▴' : '▾'}</span>
            </button>
            {selectedProjectColorMenuOpen && (
              <div className="workhub-project-color-select-menu">
                {selectedWorkspaceProjectColorMeanings.map((option: any) => (
                  <button
                    key={option.color}
                    type="button"
                    className={`workhub-project-color-option${selectedProjectColorDraft === option.color ? ' is-active' : ''}`}
                    onClick={() => { void handleSelectedProjectColorSelect(option.color) }}
                  >
                    <span className="workhub-project-color-swatch" style={{ background: option.color }} />
                    <span className="workhub-project-color-option-copy">
                      <strong>{option.label}</strong>
                      <small>{option.hint}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>
      </div>

      <details className="workhub-detail-collapsible-info">
        <summary>{`${selectedProjectIntentMeta.subjectLabel} information`}</summary>
        <div className="workhub-detail-meta">
          <span>{`Workspace: ${selectedWorkspaceDisplayName}`}</span>
          <span>{`Parent ${selectedProjectIntentMeta.subjectLabel.toLowerCase()}: ${selectedProject.parentProjectId ? (projectNameById[selectedProject.parentProjectId] || 'Unknown item') : 'Root level'}`}</span>
          <span>Created: {formatTime(selectedProject.createdAt)}</span>
          <span>Updated: {formatTime(selectedProject.updatedAt)}</span>
        </div>
      </details>

      {canEditSelectedProject ? (
        <div className="workhub-project-detail-actions">
          <button type="button" className="workhub-ghost-btn" onClick={() => setProjectAccessDialogId(selectedProject.id)}>
            {`Open ${selectedProjectIntentMeta.subjectLabel.toLowerCase()} settings`}
          </button>
          <button
            type="button"
            className="workhub-primary-btn"
            disabled={!selectedProjectDetailsChanged || busyKey === `project-detail:${selectedProject.id}`}
            onClick={() => { void handleSaveSelectedProjectDetails() }}
          >
            {busyKey === `project-detail:${selectedProject.id}` ? 'Saving…' : `Save ${selectedProjectIntentMeta.subjectLabel.toLowerCase()}`}
          </button>
        </div>
      ) : (
        <div className="workhub-project-detail-readonly-note">
          {(canEditProjectAttachments ?? false)
            ? 'Core settings are read-only for your role. Attachments and discussion are still editable.'
            : 'Read-only: contact a workspace admin to edit this item.'}
        </div>
      )}

    </div>
  )
})