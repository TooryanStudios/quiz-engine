import React, { useState } from 'react';
import { useToast } from '../lib/ToastContext';
import { generateQuizQuestions } from '../lib/ai/quizQuestions';

interface Suggestion {
  text: string;
  type: string;
  options?: string[];
  correctIndex?: number;
}

/**
 * AI Lab Page - Testing AI Document & Image OCR to Quiz Conversion
 */
const AILabPage: React.FC = () => {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<Suggestion[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const fileToBase64 = async (file: File) => {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const raw = String(reader.result || '')
          const b64 = raw.split(',')[1] || ''
          resolve(b64)
        } catch (e) {
          reject(e)
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'))
      reader.readAsDataURL(file);
    });
  };

  const handleProcess = async () => {
    if (!file) {
      showToast({ message: 'Please select a file first', type: 'error' });
      return;
    }

    setLoading(true);
    setSuggestedQuestions([]);
    setExtractedText('Listing available models and analyzing...');

    try {
      setExtractedText('Analyzing via server-side AI...');

      const b64 = await fileToBase64(file)

      const prompt = `Analyze this file and perform two tasks:
1) Extract all text content (OCR or direct reading).
2) Create 3 to 5 high-quality multiple-choice questions (MCQs) in Arabic based on the content.

Respond ONLY with a JSON object in this format:
{
  "extractedText": "all extracted text here...",
  "questions": [
    {
      "text": "The question title in Arabic",
      "type": "multiple",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctIndex": 0
    }
  ]
}`;

      const result = await generateQuizQuestions({
        promptText: prompt,
        questionCount: 5,
        contextFiles: [{ name: file.name, type: file.type, data: b64 }],
      })

      const extracted = typeof result.extractedText === 'string' && result.extractedText.trim()
        ? result.extractedText
        : 'Text content has been processed.'

      const mapped: Suggestion[] = (result.questions || []).map((q: any) => {
        const options = Array.isArray(q?.options) ? q.options.map((o: any) => String(o)) : []
        const correctIndex = typeof q?.correctIndex === 'number' ? q.correctIndex : undefined
        return {
          text: String(q?.text ?? ''),
          type: String(q?.type ?? 'multiple'),
          options,
          correctIndex,
        }
      })

      setExtractedText(extracted)
      setSuggestedQuestions(mapped)
      showToast({ message: 'Analysis completed successfully!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      const code = err?.code as string | undefined
      if (typeof code === 'string' && code.includes('resource-exhausted')) {
        showToast({ message: 'You have used all your free AI credits. Please upgrade via bank transfer (manual activation) to continue.', type: 'error', durationMs: 10000 })
      }
      // Stay on screen for 10 seconds if there is an error
      showToast({ 
        message: `Processing error: ${err.message}`, 
        type: 'error',
        durationMs: 10000 
      });
      setExtractedText('Analysis failed. Please check API key permission or try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧪 AI Lab</h1>
      <p className="text-gray-600 mb-8">
        Upload images or documents containing text, and AI will analyze them and suggest quiz questions automatically.
      </p>

      <div className="bg-white p-6 rounded-xl border-2 border-dashed border-gray-300 text-center mb-6">
        <input 
          type="file" 
          accept="image/*,application/pdf,text/html,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
          onChange={handleFileChange}
          className="hidden" 
          id="ai-upload"
        />
        <label htmlFor="ai-upload" className="cursor-pointer block">
          {previewUrl && file?.type.startsWith('image/') ? (
            <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded mb-2 shadow-sm" />
          ) : (
            <>
              <div className="text-4xl mb-2">📄</div>
              <div className="font-semibold text-blue-600">Click to upload Document, Image, or PDF</div>
            </>
          )}
          <div className="text-xs text-gray-400 mt-1">{file ? `Selected: ${file.name}` : 'PDFs, Books, Word, Text, or HTMl files'}</div>
        </label>
      </div>

      <button 
        onClick={handleProcess}
        disabled={loading || !file}
        className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all transform active:scale-95 ${
          loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:shadow-blue-200 hover:-translate-y-0.5'
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg tracking-wide">AI is Thinking...</span>
            </div>
            <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-white animate-[loading-bar_2s_infinite_linear]"></div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span>🚀</span>
            <span>Analyze Document</span>
          </div>
        )}
      </button>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {extractedText && (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 scale-95 opacity-0 animate-[fade-in-up_0.6s_forwards]">
          {/* Status Overview Card */}
          <div className="lg:col-span-12 bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center gap-4 text-blue-800">
            <div className="bg-blue-100 p-2 rounded-lg">🤖</div>
            <div>
              <p className="font-bold text-sm">Analysis Complete</p>
              <p className="text-xs opacity-75">Processed {file?.name}</p>
            </div>
          </div>

          <div className="lg:col-span-12 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-3xl border border-blue-100 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
              <span className="text-9xl">💡</span>
            </div>

            <h3 className="font-black text-blue-900 text-xl mb-6 flex items-center gap-3">
              <span className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-md">Q</span>
              Curated Quiz Questions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              {suggestedQuestions.map((q, i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-white/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 group/card">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Question {i+1}</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-1 rounded-md font-bold border border-indigo-100">Multiple Choice</span>
                  </div>

                  <p className="font-bold text-gray-800 mb-4 leading-relaxed group-hover/card:text-blue-700 transition-colors" dir="rtl">{q.text}</p>
                  
                  <div className="space-y-2">
                    {q.options?.map((opt, optIndex) => (
                      <div 
                        key={optIndex} 
                        className={`text-sm p-3 rounded-xl border flex items-center gap-3 transition-all ${
                          optIndex === q.correctIndex 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold shadow-sm' 
                            : 'bg-white border-gray-100 text-gray-600'
                        }`}
                        dir="rtl"
                      >
                        <div className={`w-2 h-2 rounded-full ${optIndex === q.correctIndex ? 'bg-emerald-500 scale-125' : 'bg-gray-200'} transition-all`}></div>
                        <span>{opt}</span>
                        {optIndex === q.correctIndex && <span className="mr-auto ml-1">✅</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {suggestedQuestions.length === 0 && !loading && (
              <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-blue-200">
                <div className="text-5xl mb-4">🔮</div>
                <p className="font-bold text-blue-900">No questions found</p>
                <p className="text-sm text-blue-600">Try a more descriptive document.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AILabPage;
