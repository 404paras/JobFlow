import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Copy, RefreshCw, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Job, NormalizedJobData } from '@/lib/types';
import { MatchResult } from '@/services/browserAI';

interface CoverLetterGeneratorProps {
  job: Job;
  normalizedJob?: NormalizedJobData;
  matchResult?: MatchResult;
  userName?: string;
  userSkills?: string[];
  userExperience?: { title: string; company: string; years: number }[];
}

const TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard Professional',
    template: `Dear Hiring Manager,

I am writing to express my strong interest in the {role} position at {company}. With my background in {top_skill} and {years_exp} years of experience in the field, I am confident in my ability to contribute effectively to your team.

Your job description highlights a need for expertise in {matched_skills}. In my previous work, I have successfully applied these skills to deliver high-quality results. I am particularly excited about the opportunity to work at {company} because of your reputation for innovation in the industry.

I would welcome the opportunity to discuss how my technical skills in {bonus_skills} and my passion for {industry_keyword} could benefit your team.

Thank you for considering my application.

Sincerely,
{user_name}`
  },
  {
    id: 'enthusiastic',
    name: 'Enthusiastic & Passionate',
    template: `Dear Hiring Team at {company},

I was thrilled to see the opening for a {role} at {company}! As a long-time admirer of your work, I would love the opportunity to bring my skills in {top_skill} and {second_skill} to your innovative team.

What excites me most about this role is the chance to leverage my experience with {matched_skills}. I thrive in environments that challenge me to grow, and I see {company} as the perfect place to do just that.

I bring {years_exp} years of hands-on experience, including specific achievements in {industry_keyword}. I am eager to discuss how my background aligns with your goals.

Best regards,
{user_name}`
  },
  {
    id: 'technical',
    name: 'Technical & Direct',
    template: `To the {company} Hiring Team,

I am applying for the {role} position. My technical background includes extensive experience with {matched_skills}, which aligns well with the requirements listed in your job description.

Over the past {years_exp} years, I have honed my skills in {top_skill}, {second_skill}, and {third_skill}. I am proficient in {bonus_skills} and have a proven track record of solving complex problems in {industry_keyword}.

I am confident that my technical expertise would make me a valuable addition to your engineering team. I look forward to the possibility of discussing this role further.

Regards,
{user_name}`
  }
];

export function CoverLetterGenerator({
  job,
  normalizedJob,
  matchResult,
  userName = "[Your Name]",
  userSkills = [],
  userExperience = []
}: CoverLetterGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [generatedLetter, setGeneratedLetter] = useState('');

  const generateLetter = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId)?.template || TEMPLATES[0].template;
    
    // Fallback values
    const role = normalizedJob?.normalizedRole || job.title;
    const company = job.company;
    const topSkill = matchResult?.matchedSkills[0] || userSkills[0] || "software development";
    const secondSkill = matchResult?.matchedSkills[1] || userSkills[1] || "problem solving";
    const thirdSkill = matchResult?.matchedSkills[2] || userSkills[2] || "collaboration";
    
    // Calculate total years of experience or default to a reasonable number
    const totalYears = userExperience.reduce((acc, curr) => acc + curr.years, 0) || "several";
    
    const matchedSkillsStr = matchResult?.matchedSkills.slice(0, 3).join(', ') || "relevant technologies";
    const bonusSkillsStr = matchResult?.bonusSkills.slice(0, 3).join(', ') || "complementary tools";
    
    // Simple heuristic for industry keyword
    const industryKeyword = matchResult?.matchedSkills.includes('react') ? 'frontend development' :
                           matchResult?.matchedSkills.includes('python') ? 'data engineering' :
                           'technology solutions';

    let letter = template
      .replace(/{role}/g, role)
      .replace(/{company}/g, company)
      .replace(/{top_skill}/g, topSkill)
      .replace(/{second_skill}/g, secondSkill)
      .replace(/{third_skill}/g, thirdSkill)
      .replace(/{matched_skills}/g, matchedSkillsStr)
      .replace(/{bonus_skills}/g, bonusSkillsStr)
      .replace(/{years_exp}/g, totalYears.toString())
      .replace(/{industry_keyword}/g, industryKeyword)
      .replace(/{user_name}/g, userName);

    setGeneratedLetter(letter);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    toast.success('Cover letter copied to clipboard');
  };

  // Generate initial letter when dialog opens
  React.useEffect(() => {
    if (isOpen && !generatedLetter) {
      generateLetter(selectedTemplate);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wand2 className="w-4 h-4" />
          Cover Letter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Cover Letter</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-4 gap-4 py-4">
          <div className="col-span-1 space-y-2">
            <label className="text-sm font-medium">Template Style</label>
            <div className="flex flex-col gap-2">
              {TEMPLATES.map(t => (
                <Button
                  key={t.id}
                  variant={selectedTemplate === t.id ? "default" : "outline"}
                  className="justify-start text-left"
                  onClick={() => {
                    setSelectedTemplate(t.id);
                    generateLetter(t.id);
                  }}
                >
                  {t.name}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="col-span-3 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Preview</label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => generateLetter(selectedTemplate)}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
              </div>
            </div>
            <Textarea
              value={generatedLetter}
              onChange={(e) => setGeneratedLetter(e.target.value)}
              className="h-[400px] font-mono text-sm leading-relaxed p-4"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

