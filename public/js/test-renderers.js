/**
 * TEMPORARY TEST MODULE - TO BE REMOVED AFTER V59 TESTING
 * 
 * This file provides a standalone test UI to verify all question type renderers
 * without needing to play a full game. Can be removed once testing is complete.
 */

import { QuestionRendererFactory } from './renderers/QuestionRenderer.js';
import { Sounds } from './utils/sounds.js';

// Test questions for each type
const TEST_QUESTIONS = [
  {
    type: 'single',
    text: 'TEST: What is the capital of France?',
    options: ['Berlin', 'Paris', 'London', 'Madrid'],
    correctIndex: 1
  },
  {
    type: 'multi',
    text: 'TEST: Which of these are programming languages?\n(Select all that apply)',
    options: ['JavaScript', 'HTML', 'Python', 'CSS'],
    correctIndices: [0, 2]
  },
  {
    type: 'type',
    text: 'TEST: What is 2 + 2?',
    inputPlaceholder: 'Type your answer...',
    acceptedAnswers: ['4', 'four']
  },
  {
    type: 'match',
    text: 'TEST: Match each country with its capital',
    lefts: ['France', 'Spain', 'Italy'],
    rights: ['Madrid', 'Paris', 'Rome']
  },
  {
    type: 'order',
    text: 'TEST: Put these numbers in ascending order',
    items: ['5', '1', '3', '2', '4']
  },
  {
    type: 'boss',
    text: 'TEST: Defeat the boss! What is the largest ocean?',
    options: ['Atlantic', 'Pacific', 'Indian', 'Arctic'],
    correctIndex: 1,
    boss: {
      name: 'Test Boss',
      maxHp: 100,
      remainingHp: 75
    }
  }
];

let currentTestIndex = 0;

// Initialize test UI
export function initTestUI() {
  const testPanel = document.getElementById('test-renderer-panel');
  if (!testPanel) return;

  const btnPrev = document.getElementById('btn-test-prev');
  const btnNext = document.getElementById('btn-test-next');
  const testInfo = document.getElementById('test-info');
  const btnSubmitTest = document.getElementById('btn-test-submit');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      currentTestIndex = (currentTestIndex - 1 + TEST_QUESTIONS.length) % TEST_QUESTIONS.length;
      renderTestQuestion();
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      currentTestIndex = (currentTestIndex + 1) % TEST_QUESTIONS.length;
      renderTestQuestion();
    });
  }

  if (btnSubmitTest) {
    btnSubmitTest.addEventListener('click', () => {
      const answer = QuestionRendererFactory.getAnswer();
      console.log('[TEST] Current answer:', answer);
      alert('Answer captured:\n' + JSON.stringify(answer, null, 2));
    });
  }

  // Initial render
  renderTestQuestion();
}

function renderTestQuestion() {
  const question = TEST_QUESTIONS[currentTestIndex];
  const testInfo = document.getElementById('test-info');
  const questionText = document.getElementById('player-question-text');
  
  if (testInfo) {
    testInfo.textContent = `Testing: ${question.type.toUpperCase()} (${currentTestIndex + 1}/${TEST_QUESTIONS.length})`;
  }

  if (questionText) {
    questionText.textContent = question.text;
  }

  // Clear previous renderer
  QuestionRendererFactory.cleanup();
  
  // Reset containers
  document.getElementById('player-options-grid').innerHTML = '';
  document.getElementById('player-options-grid').style.display = '';
  document.getElementById('player-type-container').style.display = 'none';
  document.getElementById('player-match-container').style.display = 'none';
  document.getElementById('player-order-container').style.display = 'none';
  document.getElementById('player-boss-panel').style.display = 'none';
  
  const submitBtn = document.getElementById('btn-submit-answer');
  if (submitBtn) {
    submitBtn.style.display = 'none';
    submitBtn.disabled = false;
    submitBtn.textContent = '✔ Submit Answer';
  }

  // Mock submit callback
  const testSubmitCallback = (answer) => {
    console.log('[TEST] Submit callback triggered:', answer);
    Sounds.correct();
    alert('✅ Submit triggered!\n\nAnswer Data:\n' + JSON.stringify(answer, null, 2));
  };

  // Render the question using the factory
  try {
    QuestionRendererFactory.render(question, false, testSubmitCallback);
    console.log('[TEST] ✅ Successfully rendered:', question.type);
  } catch (err) {
    console.error('[TEST] ❌ Render failed:', err);
    alert('❌ RENDER ERROR:\n' + err.message + '\n\nCheck console for details.');
  }
}

// Show/hide test panel
export function showTestPanel() {
  const panel = document.getElementById('test-renderer-panel');
  if (panel) {
    panel.style.display = 'flex';
    renderTestQuestion();
  }
}

export function hideTestPanel() {
  const panel = document.getElementById('test-renderer-panel');
  if (panel) {
    panel.style.display = 'none';
    QuestionRendererFactory.cleanup();
  }
}

// Auto-initialize if test panel exists
if (document.getElementById('test-renderer-panel')) {
  document.addEventListener('DOMContentLoaded', initTestUI);
}

console.log('[TEST MODULE] Loaded - test-renderers.js');
