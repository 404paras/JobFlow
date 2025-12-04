import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Sparkles, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Job } from '@/lib/types';
import { MatchResult } from '@/services/browserAI';

interface ApplicationHelperProps {
  job: Job;
  matchResult?: MatchResult;
  userSkills?: string[];
}

const COMMON_QUESTIONS = [
  {
    id: 'why_us',
    label: 'Why do you want to work here?',
    prompt: 'Generate an answer highlighting the company\'s mission and my relevant skills.'
  },
  {
    id: 'challenge',
    label: 'Describe a challenge you faced.',
    prompt: 'Generate a STAR method response about a technical challenge using my top skills.'
  },
  {
    id: 'strengths',
    label: 'What are your greatest strengths?',
    prompt: 'List my top matched technical and soft skills with context.'
  },
  {
    id: 'weakness',
    label: 'What is your greatest weakness?',
    prompt: 'Generate a professional "weakness" that is actually a growth area, unrelated to core job requirements.'
  }
];

export function ApplicationHelper({
  job,
  matchResult,
  userSkills = []
}: ApplicationHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(COMMON_QUESTIONS[0].id);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const generateAnswer = (questionId: string) => {
    let answer = '';
    const skillsToHighlight = matchResult?.matchedSkills.slice(0, 3).join(', ') || userSkills.slice(0, 3).join(', ');
    const company = job.company;
    const role = job.title;

    switch (questionId) {
      case 'why_us':
        answer = `I have been following ${company}'s work in the industry and am impressed by your commitment to innovation. I am particularly excited about this ${role} position because it aligns perfectly with my expertise in ${skillsToHighlight}. I am eager to bring my problem-solving skills to a team that values quality and impact.`;
        break;
      case 'challenge':
        answer = `In a previous project, we faced a significant performance bottleneck that threatened our launch timeline. Using my knowledge of ${skillsToHighlight}, I led the debugging effort. I identified inefficient database queries and implemented caching strategies. This not only resolved the latency issue but also improved overall system throughput by 40%. It taught me the importance of proactive performance monitoring.`;
        break;
      case 'strengths':
        answer = `My greatest strengths lie in my technical proficiency with ${skillsToHighlight}. Beyond the code, I pride myself on my ability to translate complex technical concepts for non-technical stakeholders. I am a continuous learner who adapts quickly to new technologies and enjoys collaborating to solve difficult problems.`;
        break;
      case 'weakness':
        answer = `I sometimes find it hard to step away from a problem until it's solved perfectly, which can occasionally lead to over-optimizing. I've learned to balance this by setting strict timeboxes for tasks and focusing on delivering value incrementally. This helps me maintain high quality without sacrificing velocity.`;
        break;
      default:
        answer = 'Select a question to generate an answer.';
    }

    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Answer copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <MessageSquare className="w-4 h-4" />
          Helper
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Application Question Assistant</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {COMMON_QUESTIONS.map(q => (
              <TabsTrigger key={q.id} value={q.id} className="text-xs truncate">
                {q.label.split(' ')[0]}...
              </TabsTrigger>
            ))}
          </TabsList>

          {COMMON_QUESTIONS.map(q => (
            <TabsContent key={q.id} value={q.id} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{q.label}</Label>
                <div className="relative">
                  <Textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Click generate to get a suggested answer..."
                    className="min-h-[200px] pr-12"
                  />
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                     <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopy(answers[q.id] || '')}
                      disabled={!answers[q.id]}
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                 <Button onClick={() => generateAnswer(q.id)} className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  {answers[q.id] ? 'Regenerate Answer' : 'Generate Answer'}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

