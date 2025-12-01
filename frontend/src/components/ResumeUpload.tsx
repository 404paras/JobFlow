import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '../lib/api';
import { useBrowserAI } from '../hooks/useBrowserAI';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Briefcase, GraduationCap, Code, Brain } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ResumeData {
  id: string;
  fileName: string;
  fileType: string;
  skills: string[];
  experience: { title: string; company: string; duration: string }[];
  education: { degree: string; institution: string; year: string }[];
  keywords: string[];
  uploadedAt: string;
  rawText?: string;
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF. Make sure it contains text (not scanned images).');
  }
}

async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from DOCX file.');
  }
}

function extractTextFromLatex(text: string): string {
  let cleaned = text
    .replace(/\\documentclass\{[^}]*\}/g, '')
    .replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, '')
    .replace(/\\begin\{document\}/g, '')
    .replace(/\\end\{document\}/g, '')
    .replace(/\\begin\{[^}]*\}/g, '')
    .replace(/\\end\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+\*?\{([^}]*)\}/g, '$1')
    .replace(/\\[a-zA-Z]+\*?/g, '')
    .replace(/\{|\}/g, '')
    .replace(/%.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

function extractTextFromMarkdown(text: string): string {
  let cleaned = text
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/---+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

function getFileType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'tex' || ext === 'latex') return 'latex';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  return 'txt';
}

export function ResumeUpload() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localSkills, setLocalSkills] = useState<{ technical: string[]; soft: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { extractSkills } = useBrowserAI();

  const loadResume = async () => {
    try {
      const data = await api.getResume();
      setResume(data);
      if (data?.skills) {
        setLocalSkills({ technical: data.skills, soft: [] });
      }
    } catch {
      setResume(null);
    }
  };

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open) {
      await loadResume();
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.tex', '.latex', '.md', '.markdown'];
    const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    
    if (!allowedExtensions.includes(fileExt)) {
      toast.error('Invalid file type', {
        description: 'Please upload a PDF, DOCX, TXT, LaTeX (.tex), or Markdown (.md) file.',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 5MB.',
      });
      return;
    }

    setIsLoading(true);

    try {
      let text = '';
      const fileType = getFileType(file.name);

      toast.info(`Processing ${fileType.toUpperCase()} file...`, { duration: 2000 });

      switch (fileType) {
        case 'pdf':
          text = await extractTextFromPDF(file);
          break;
        case 'docx':
          text = await extractTextFromDOCX(file);
          break;
        case 'latex':
          const latexContent = await file.text();
          text = extractTextFromLatex(latexContent);
          break;
        case 'markdown':
          const mdContent = await file.text();
          text = extractTextFromMarkdown(mdContent);
          break;
        default:
          text = await file.text();
      }

      if (!text || text.trim().length < 30) {
        toast.error('Could not extract text', {
          description: 'The file appears to be empty or in an unsupported format.',
        });
        setIsLoading(false);
        return;
      }

      console.log('Extracted text length:', text.length);
      console.log('First 500 chars:', text.substring(0, 500));

      const browserSkills = extractSkills(text);
      console.log('Browser extracted skills:', browserSkills);
      setLocalSkills(browserSkills);

      const result = await api.uploadResume(text, file.name, fileType as any);
      
      const combinedSkills = [...new Set([
        ...result.skills,
        ...browserSkills.technical,
        ...browserSkills.soft,
      ])];

      setResume({
        ...result,
        skills: combinedSkills,
        fileType,
        rawText: text,
      });

      toast.success('Resume uploaded!', {
        description: `Found ${combinedSkills.length} skills in your resume.`,
      });
    } catch (error: any) {
      console.error('Resume upload error:', error);
      toast.error('Upload failed', {
        description: error.message || 'Failed to process resume.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDelete = async () => {
    try {
      await api.deleteResume();
      setResume(null);
      setLocalSkills(null);
      toast.success('Resume deleted');
    } catch {
      toast.error('Failed to delete resume');
    }
  };

  const allSkills = resume?.skills || [];
  const technicalSkills = localSkills?.technical || [];
  const softSkills = localSkills?.soft || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
        >
          <FileText size={16} className="mr-2" />
          Resume
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Your Resume
          </DialogTitle>
          <DialogDescription>
            Upload your resume to auto-extract skills and match with job listings.
          </DialogDescription>
        </DialogHeader>

        {!resume ? (
          <div
            className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Drag & drop your resume here, or
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.tex,.latex,.md,.markdown"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Browse Files'
              )}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
              Supported: PDF, DOCX, TXT, LaTeX, Markdown (max 5MB)
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">{resume.fileName}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 size={16} />
              </Button>
            </div>

            {(technicalSkills.length > 0 || allSkills.length > 0) && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Code size={16} className="text-indigo-600 dark:text-indigo-400" />
                  Technical Skills ({technicalSkills.length || allSkills.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(technicalSkills.length > 0 ? technicalSkills : allSkills).slice(0, 20).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {(technicalSkills.length > 20 || allSkills.length > 20) && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                      +{(technicalSkills.length || allSkills.length) - 20} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {softSkills.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Brain size={16} className="text-purple-600 dark:text-purple-400" />
                  Soft Skills ({softSkills.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {softSkills.slice(0, 10).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {resume.experience && resume.experience.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Briefcase size={16} className="text-amber-600 dark:text-amber-400" />
                  Experience
                </h4>
                <div className="space-y-1">
                  {resume.experience.slice(0, 3).map((exp, i) => (
                    <div key={i} className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{exp.title}</span>
                      {exp.company !== 'Not specified' && <span> at {exp.company}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resume.education && resume.education.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <GraduationCap size={16} className="text-green-600 dark:text-green-400" />
                  Education
                </h4>
                <div className="space-y-1">
                  {resume.education.slice(0, 2).map((edu, i) => (
                    <div key={i} className="text-sm text-gray-600 dark:text-gray-400">
                      {edu.degree}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t dark:border-gray-700">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <Upload size={16} className="mr-2" />
                Upload New Resume
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.tex,.latex,.md,.markdown"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Skills are extracted using in-browser AI. For PDFs, ensure they contain text (not scanned images).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ResumeUpload;
