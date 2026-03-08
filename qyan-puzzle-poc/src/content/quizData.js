export const quizData = {
  quiz01: {
    id: 'quiz-01',
    items: [
      { id: 'triangle', svg: '/assets/images/shape-triangle.svg' },
      { id: 'circle', svg: '/assets/images/shape-circle.svg' },
      { id: 'square', svg: '/assets/images/shape-square.svg' }
    ],
    // Correct sequence to unlock according to clues: Square -> Triangle -> Circle
    correctOrder: ['square', 'triangle', 'circle']
  }
};
