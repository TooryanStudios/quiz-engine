const fs = require('fs');
const file = 'C:/Projects/quiz-engine/admin-app/src/pages/QuizEditorPage.tsx';
let c = fs.readFileSync(file, 'utf8');
console.log('original size:', c.length);

c = c.replace(/import \{ EditorHeroSection \} from '\.\.\/components\/editor\/EditorHeroSection'\r?\n/, "");
c = c.replace(/import \{ EditorStickyToolbar \} from '\.\.\/components\/editor\/EditorStickyToolbar'\r?\n/, "import { EditorUnifiedHeader } from '../components/editor/EditorUnifiedHeader'\n");

c = c.replace(/<EditorHeroSection[\s\S]*?\/>/, 
\      {/* -- Unified Workspace Header -- */}
      <EditorUnifiedHeader
        quizId={quizId}
        isMiniGameContent={isMiniGameContent}
        isNarrowScreen={isNarrowScreen}
        contentType={contentType}
        coverImage={coverImage}
        placeholderImage={placeholderImg}
        uploadingCover={uploadingCover}
        title={title}
        visibility={visibility}
        approvalStatus={approvalStatus}
        showToolbarDropdown={showToolbarDropdown}
        questionsCount={questions.length}
        isSaving={status.kind === 'saving'}
        hasUnsavedChanges={hasUnsavedChanges}
        onTitleChange={(value) => {
          setTitle(value)
          setHasUnsavedChanges(true)
        }}
        onPlayQuiz={(id) => { void launchGameFromEditor(id) }}
        onToggleDropdown={() => setShowToolbarDropdown((v) => !v)}
        onCloseDropdown={() => setShowToolbarDropdown(false)}
        onOpenContentTypePicker={() => setShowContentTypePicker(true)}
        onBack={() => navigate(-1)}
        onOpenMetadata={openMetadataDialog}
        onCollapseAll={() => setCollapsedQuestions(Array(questions.length).fill(true))}
        onExpandAll={() => setCollapsedQuestions(Array(questions.length).fill(false))}
        onPreviewQuiz={() => { if (quizId) window.open(\\\/preview/\\\\, '_blank') }}
        onCopyLink={() => { void copyEditorLink() }}
        onShareLink={() => { void shareEditorLink() }}
        onDeleteQuiz={handleDeleteQuiz}
        onAddQuestion={() => showAddQuestionDialog()}
        onGenerateAI={() => { setAiAction('generate'); void incrementPlatformStat('aiGenerateClicks') }}
        onRecheckAI={() => { setAiAction('recheck'); void incrementPlatformStat('aiRecheckClicks') }}
        onSave={() => { void saveQuiz() }}
      />\
);

c = c.replace(/<EditorStickyToolbar[\s\S]*?\/>\r?\n?/, '');

c = c.replace(/return \(\s*<>\s*/, "return (\n    <div className=\"quiz-editor-root\">\n");

const l = c.lastIndexOf('</>');
if (l !== -1) {
  c = c.substring(0, l) + '</div>' + c.substring(l + 3);
}

c = c.replace(/const pureQuestionsCount = [^\r\n]+\r?\n/, '');
c = c.replace('const [saveAfterMetadata, setSaveAfterMetadata] = useState(false)', 'const [, setSaveAfterMetadata] = useState(false)');

fs.writeFileSync(file, c);
console.log('new size:', c.length);
