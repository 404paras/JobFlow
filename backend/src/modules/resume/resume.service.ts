import { Resume, IResumeDocument } from './resume.model';
import { logger } from '../../shared/utils/logger';

const TECH_SKILLS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt', 'node.js', 'express', 'fastapi', 'django', 'flask',
  'spring', 'laravel', 'rails', '.net', 'asp.net',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'material-ui', 'chakra',
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'firebase', 'supabase',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'github actions', 'gitlab ci',
  'git', 'linux', 'nginx', 'apache',
  'rest', 'graphql', 'grpc', 'websocket', 'microservices', 'serverless',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
  'agile', 'scrum', 'jira', 'confluence',
  'figma', 'sketch', 'adobe xd',
  'testing', 'jest', 'mocha', 'cypress', 'selenium', 'playwright',
];

const SOFT_SKILLS = [
  'leadership', 'communication', 'teamwork', 'problem-solving', 'analytical',
  'project management', 'time management', 'collaboration', 'adaptability',
  'critical thinking', 'creativity', 'attention to detail', 'organization',
];

const EXPERIENCE_PATTERNS = [
  /(\d+)\+?\s*years?\s*(?:of\s+)?experience/gi,
  /experience[:\s]+(\d+)\+?\s*years?/gi,
  /(\d+)\+?\s*yrs?\s*(?:of\s+)?exp/gi,
];

const EDUCATION_KEYWORDS = [
  'bachelor', 'master', 'phd', 'doctorate', 'b.tech', 'm.tech', 'b.e', 'm.e',
  'bsc', 'msc', 'mba', 'bba', 'b.s.', 'm.s.', 'computer science', 'engineering',
  'information technology', 'software', 'data science',
];

export class ResumeService {
  async uploadResume(
    userId: string,
    fileName: string,
    fileType: 'pdf' | 'docx' | 'txt',
    fileSize: number,
    rawText: string
  ): Promise<IResumeDocument> {
    const skills = this.extractSkills(rawText);
    const experience = this.extractExperience(rawText);
    const education = this.extractEducation(rawText);
    const keywords = this.extractKeywords(rawText);

    const resume = await Resume.findOneAndUpdate(
      { userId },
      {
        fileName,
        fileType,
        fileSize,
        rawText,
        skills,
        experience,
        education,
        keywords,
        uploadedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    logger.info('Resume uploaded and processed', {
      userId,
      fileName,
      skillsFound: skills.length,
      keywordsFound: keywords.length,
    });

    return resume;
  }

  async getResume(userId: string): Promise<IResumeDocument | null> {
    return Resume.findOne({ userId });
  }

  async deleteResume(userId: string): Promise<boolean> {
    const result = await Resume.deleteOne({ userId });
    return result.deletedCount > 0;
  }

  extractSkills(text: string): string[] {
    const lowerText = text.toLowerCase();
    const foundSkills = new Set<string>();

    for (const skill of TECH_SKILLS) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(lowerText)) {
        foundSkills.add(skill);
      }
    }

    for (const skill of SOFT_SKILLS) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(lowerText)) {
        foundSkills.add(skill);
      }
    }

    return Array.from(foundSkills).sort();
  }

  extractExperience(text: string): { title: string; company: string; duration: string }[] {
    const experience: { title: string; company: string; duration: string }[] = [];
    
    const jobTitlePatterns = [
      /(?:worked as|position[:\s]+|role[:\s]+|title[:\s]+)([^,.\n]+)/gi,
      /(software engineer|developer|architect|manager|lead|analyst|consultant|designer)[^,.\n]*/gi,
    ];

    const lines = text.split('\n');
    let currentTitle = '';
    let currentCompany = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (/\b(engineer|developer|manager|lead|analyst|architect|designer|consultant)\b/i.test(trimmedLine)) {
        if (trimmedLine.length < 100) {
          currentTitle = trimmedLine.replace(/[•\-–—]/g, '').trim();
        }
      }
      
      if (/\b(inc\.|llc|ltd|corp|company|technologies|solutions|software|systems)\b/i.test(trimmedLine)) {
        if (trimmedLine.length < 100) {
          currentCompany = trimmedLine.replace(/[•\-–—]/g, '').trim();
        }
      }
      
      for (const pattern of EXPERIENCE_PATTERNS) {
        const match = pattern.exec(trimmedLine);
        if (match && currentTitle) {
          experience.push({
            title: currentTitle.substring(0, 100),
            company: currentCompany.substring(0, 100) || 'Not specified',
            duration: match[0],
          });
          currentTitle = '';
          currentCompany = '';
        }
      }
    }

    return experience.slice(0, 5);
  }

  extractEducation(text: string): { degree: string; institution: string; year: string }[] {
    const education: { degree: string; institution: string; year: string }[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      for (const keyword of EDUCATION_KEYWORDS) {
        if (line.includes(keyword)) {
          const yearMatch = line.match(/\b(19|20)\d{2}\b/);
          const fullLine = lines[i].trim();
          
          if (fullLine.length < 200) {
            education.push({
              degree: fullLine.substring(0, 100),
              institution: lines[i + 1]?.trim().substring(0, 100) || 'Not specified',
              year: yearMatch ? yearMatch[0] : 'Not specified',
            });
          }
          break;
        }
      }
    }

    return education.slice(0, 3);
  }

  extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s\-\.]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const wordFreq = new Map<string, number>();
    for (const word of words) {
      if (!/^\d+$/.test(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'has', 'are', 'was', 'were', 'been', 'being', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'not', 'but', 'our', 'your', 'his', 'her', 'its', 'their', 'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'any', 'only', 'same', 'than', 'too', 'very']);

    const keywords = Array.from(wordFreq.entries())
      .filter(([word, count]) => count >= 2 && !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word]) => word);

    return keywords;
  }

  calculateJobMatchScore(resumeSkills: string[], jobDescription: string): number {
    if (resumeSkills.length === 0) return 0;

    const jobLower = jobDescription.toLowerCase();
    let matchedSkills = 0;

    for (const skill of resumeSkills) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(jobLower)) {
        matchedSkills++;
      }
    }

    return Math.round((matchedSkills / resumeSkills.length) * 100);
  }
}

export const resumeService = new ResumeService();
export default resumeService;

