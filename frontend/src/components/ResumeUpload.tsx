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
import { toast } from 'sonner';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Briefcase, GraduationCap, Code } from 'lucide-react';

interface ResumeData {
  id: string;
  fileName: string;
  fileType: string;
  skills: string[];
  experience: { title: string; company: string; duration: string }[];
  education: { degree: string; institution: string; year: string }[];
  keywords: string[];
  uploadedAt: string;
}

export function ResumeUpload() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadResume = async () => {
    try {
      const data = await api.getResume();
      setResume(data);
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

    const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      toast.error('Invalid file type', {
        description: 'Please upload a PDF, DOCX, or TXT file.',
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
      const text = await file.text();
      const fileType = file.name.endsWith('.pdf') ? 'pdf' : 
                       file.name.endsWith('.docx') ? 'docx' : 'txt';

      const result = await api.uploadResume(text, file.name, fileType);
      setResume({
        ...result,
        fileType,
      });

      toast.success('Resume uploaded!', {
        description: `Found ${result.skills.length} skills in your resume.`,
      });
    } catch (error: any) {
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
      toast.success('Resume deleted');
    } catch (error: any) {
      toast.error('Failed to delete resume');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          <FileText size={16} className="mr-2" />
          Resume
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Your Resume
          </DialogTitle>
          <DialogDescription>
            Upload your resume to auto-extract skills and match with job listings.
          </DialogDescription>
        </DialogHeader>

        {!resume ? (
          <div
            className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Drag & drop your resume here, or
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
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
            <p className="text-xs text-gray-500 mt-3">
              Supported: PDF, DOCX, TXT (max 5MB)
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{resume.fileName}</p>
                  <p className="text-xs text-green-600">
                    Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </Button>
            </div>

            {resume.skills.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Code size={16} className="text-indigo-600" />
                  Skills Found ({resume.skills.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {resume.skills.slice(0, 15).map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                  {resume.skills.length > 15 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                      +{resume.skills.length - 15} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {resume.experience.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Briefcase size={16} className="text-amber-600" />
                  Experience
                </h4>
                <div className="space-y-1">
                  {resume.experience.slice(0, 3).map((exp, i) => (
                    <div key={i} className="text-sm text-gray-600">
                      <span className="font-medium">{exp.title}</span>
                      {exp.company !== 'Not specified' && <span> at {exp.company}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resume.education.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <GraduationCap size={16} className="text-green-600" />
                  Education
                </h4>
                <div className="space-y-1">
                  {resume.education.slice(0, 2).map((edu, i) => (
                    <div key={i} className="text-sm text-gray-600">
                      {edu.degree}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
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
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700">
              Your resume is processed locally to extract skills. For best results, use a plain text or simple PDF format.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ResumeUpload;

