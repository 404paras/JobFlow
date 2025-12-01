import { Resume, IResumeDocument } from './resume.model';
import { logger } from '../../shared/utils/logger';

const TECH_SKILLS = [
  // Programming Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'csharp', 'go', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin',
  'scala', 'perl', 'r', 'matlab', 'julia', 'haskell', 'elixir', 'erlang', 'clojure', 'f#', 'objective-c', 'dart', 'lua',
  'groovy', 'cobol', 'fortran', 'assembly', 'bash', 'shell', 'powershell', 'vba', 'sql', 'plsql', 'tsql',
  
  // Frontend Frameworks/Libraries
  'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs', 'vue.js', 'svelte', 'next.js', 'nextjs', 'nuxt', 'nuxtjs',
  'gatsby', 'remix', 'astro', 'qwik', 'solid', 'solidjs', 'preact', 'ember', 'emberjs', 'backbone', 'jquery', 'alpinejs',
  
  // Backend Frameworks
  'node.js', 'nodejs', 'node', 'express', 'expressjs', 'fastapi', 'django', 'flask', 'fastify', 'koa', 'hapi',
  'spring', 'spring boot', 'springboot', 'laravel', 'rails', 'ruby on rails', '.net', 'dotnet', 'asp.net', 'aspnet',
  'nestjs', 'adonisjs', 'strapi', 'gin', 'echo', 'fiber', 'actix', 'rocket', 'phoenix', 'ktor',
  
  // APIs & Communication
  'graphql', 'rest', 'restful', 'api', 'apis', 'grpc', 'websocket', 'websockets', 'soap', 'json', 'xml', 'protobuf',
  'openapi', 'swagger', 'postman', 'insomnia', 'apollo', 'trpc',
  
  // Frontend Technologies
  'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'stylus', 'tailwind', 'tailwindcss', 'bootstrap',
  'material-ui', 'mui', 'chakra', 'chakra ui', 'styled-components', 'emotion', 'antd', 'ant design', 'radix',
  'shadcn', 'headless ui', 'framer motion', 'gsap', 'three.js', 'threejs', 'd3', 'd3.js', 'chart.js', 'recharts',
  
  // Databases
  'mysql', 'postgresql', 'postgres', 'mongodb', 'mongo', 'redis', 'elasticsearch', 'elastic', 'dynamodb',
  'firebase', 'firestore', 'supabase', 'cassandra', 'couchdb', 'couchbase', 'neo4j', 'mariadb', 'sqlite', 'oracle',
  'mssql', 'sql server', 'cockroachdb', 'timescaledb', 'influxdb', 'clickhouse', 'snowflake', 'bigquery', 'redshift',
  'prisma', 'sequelize', 'typeorm', 'mongoose', 'knex', 'drizzle',
  
  // Cloud & DevOps
  'aws', 'amazon web services', 'azure', 'microsoft azure', 'gcp', 'google cloud', 'google cloud platform',
  'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'puppet', 'chef', 'vagrant', 'packer',
  'jenkins', 'github actions', 'gitlab ci', 'gitlab', 'ci/cd', 'cicd', 'circleci', 'travis ci', 'bamboo', 'teamcity',
  'argocd', 'flux', 'helm', 'istio', 'envoy', 'consul', 'vault', 'prometheus', 'grafana', 'datadog', 'splunk',
  'newrelic', 'dynatrace', 'cloudwatch', 'cloudformation', 'cdk', 'pulumi', 'serverless', 'lambda', 'fargate', 'ecs', 'eks',
  
  // Version Control & Tools
  'git', 'github', 'bitbucket', 'svn', 'mercurial', 'perforce',
  
  // Operating Systems & Infrastructure
  'linux', 'unix', 'ubuntu', 'centos', 'debian', 'redhat', 'rhel', 'windows server', 'macos',
  'nginx', 'apache', 'tomcat', 'iis', 'caddy', 'haproxy', 'traefik',
  
  // Architecture & Design
  'microservices', 'monolith', 'event-driven', 'domain-driven', 'ddd', 'cqrs', 'event sourcing',
  'clean architecture', 'hexagonal', 'mvc', 'mvvm', 'design patterns', 'solid principles',
  
  // AI/ML
  'machine learning', 'ml', 'deep learning', 'dl', 'ai', 'artificial intelligence', 'nlp', 'natural language processing',
  'computer vision', 'cv', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'pandas', 'numpy', 'scipy',
  'opencv', 'huggingface', 'transformers', 'langchain', 'llm', 'gpt', 'chatgpt', 'openai', 'claude', 'gemini',
  'bert', 'stable diffusion', 'generative ai', 'gen ai', 'rag', 'vector database', 'pinecone', 'weaviate', 'milvus',
  'mlops', 'kubeflow', 'mlflow', 'sagemaker', 'vertex ai', 'databricks', 'spark', 'pyspark', 'hadoop', 'hive',
  
  // Testing
  'testing', 'unit testing', 'integration testing', 'e2e', 'end-to-end', 'jest', 'mocha', 'chai', 'jasmine',
  'cypress', 'selenium', 'playwright', 'puppeteer', 'testcafe', 'pytest', 'junit', 'xunit', 'nunit', 'rspec',
  'tdd', 'bdd', 'cucumber', 'mock', 'mocking', 'storybook', 'chromatic', 'vitest', 'testing-library',
  
  // Build Tools & Package Managers
  'webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'babel', 'swc', 'turbopack',
  'npm', 'yarn', 'pnpm', 'pip', 'poetry', 'maven', 'gradle', 'cargo', 'composer', 'bundler', 'cocoapods',
  'lerna', 'nx', 'turborepo', 'monorepo',
  
  // Security
  'oauth', 'oauth2', 'jwt', 'authentication', 'authorization', 'security', 'cybersecurity', 'penetration testing',
  'owasp', 'ssl', 'tls', 'https', 'encryption', 'hashing', 'cors', 'csrf', 'xss', 'sql injection',
  'keycloak', 'auth0', 'okta', 'cognito', 'firebase auth', 'passport', 'bcrypt',
  
  // Enterprise & Business
  'sap', 'abap', 'salesforce', 'erp', 'crm', 'servicenow', 'workday', 'dynamics 365', 'sharepoint',
  'power platform', 'power bi', 'tableau', 'looker', 'qlik', 'sisense', 'metabase', 'superset',
  
  // Data & Analytics
  'data analysis', 'data analytics', 'data science', 'data engineering', 'etl', 'elt', 'data warehouse', 'data lake',
  'business intelligence', 'bi', 'reporting', 'dashboards', 'visualization', 'excel', 'dbt', 'airflow', 'dagster',
  'fivetran', 'stitch', 'talend', 'informatica', 'ssis', 'alteryx', 'knime',
  
  // Mobile Development
  'mobile', 'ios', 'android', 'react native', 'flutter', 'xamarin', 'ionic', 'cordova', 'capacitor',
  'swiftui', 'jetpack compose', 'xcode', 'android studio', 'expo',
  
  // Web3 & Blockchain
  'blockchain', 'web3', 'solidity', 'ethereum', 'smart contracts', 'defi', 'nft', 'crypto', 'cryptocurrency',
  'bitcoin', 'hardhat', 'truffle', 'foundry', 'ipfs', 'polygon', 'solana', 'anchor',
  
  // Game Development
  'unity', 'unreal', 'unreal engine', 'godot', 'game development', 'gamedev', 'opengl', 'directx', 'vulkan',
  
  // Other Technologies
  'devops', 'sre', 'site reliability', 'platform engineering', 'cloud', 'infrastructure', 'iac', 'gitops',
  'agile', 'scrum', 'kanban', 'jira', 'confluence', 'trello', 'asana', 'monday', 'notion', 'linear',
  'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'invision', 'zeplin', 'ui/ux', 'ux', 'ui',
  'accessibility', 'a11y', 'wcag', 'aria',
  'rabbitmq', 'kafka', 'message queue', 'mq', 'pub/sub', 'sqs', 'sns', 'kinesis', 'nats', 'zeromq',
  'solr', 'algolia', 'meilisearch', 'typesense', 'opensearch',
];

const SOFT_SKILLS = [
  'leadership', 'communication', 'teamwork', 'collaboration', 'problem-solving', 'problem solving', 'analytical',
  'analytical thinking', 'critical thinking', 'creativity', 'creative', 'innovation', 'innovative',
  'project management', 'time management', 'organization', 'organizational', 'adaptability', 'flexibility', 'flexible',
  'attention to detail', 'detail-oriented', 'detail oriented', 'mentoring', 'coaching', 'training',
  'presentation', 'presentations', 'public speaking', 'negotiation', 'negotiating',
  'stakeholder management', 'client facing', 'client-facing', 'customer service', 'customer facing',
  'self-motivated', 'self motivated', 'proactive', 'initiative', 'ownership', 'accountability',
  'decision making', 'decision-making', 'strategic thinking', 'strategic', 'planning',
  'conflict resolution', 'interpersonal', 'interpersonal skills', 'emotional intelligence', 'empathy',
  'work under pressure', 'deadline driven', 'deadline-driven', 'multitasking', 'multi-tasking',
  'cross-functional', 'cross functional', 'team player', 'independent', 'autonomous',
  'continuous learning', 'fast learner', 'quick learner', 'eager to learn', 'growth mindset',
  'remote work', 'distributed teams', 'async communication', 'written communication', 'verbal communication',
];

const EXPERIENCE_PATTERNS = [
  /(\d+)\+?\s*years?\s*(?:of\s+)?experience/gi,
  /experience[:\s]+(\d+)\+?\s*years?/gi,
  /(\d+)\+?\s*yrs?\s*(?:of\s+)?exp/gi,
];

const EDUCATION_KEYWORDS = [
  'bachelor', 'master', 'phd', 'doctorate', 'b.tech', 'm.tech', 'b.e', 'm.e',
  'bsc', 'msc', 'mba', 'bba', 'b.s.', 'm.s.', 'computer science', 'engineering',
  'information technology', 'software', 'data science', 'bca', 'mca', 'b.com', 'm.com',
  'be', 'me', 'bs', 'ms', 'ba', 'ma',
];

const techSkillsSet = new Set(TECH_SKILLS.map(s => s.toLowerCase()));
const softSkillsSet = new Set(SOFT_SKILLS.map(s => s.toLowerCase()));

export class ResumeService {
  async uploadResume(
    userId: string,
    fileName: string,
    fileType: 'pdf' | 'docx' | 'txt' | 'latex' | 'markdown',
    fileSize: number,
    rawText: string
  ): Promise<IResumeDocument> {
    logger.info('Processing resume upload', {
      userId,
      fileName,
      fileType,
      textLength: rawText.length,
    });

    const skills = this.extractSkills(rawText);
    const experience = this.extractExperience(rawText);
    const education = this.extractEducation(rawText);
    const keywords = this.extractKeywords(rawText);

    logger.info('Resume analysis complete', {
      userId,
      skillsFound: skills.length,
      experienceFound: experience.length,
      educationFound: education.length,
      keywordsFound: keywords.length,
    });

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

    logger.info('Resume saved successfully', {
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
    if (!text || typeof text !== 'string') {
      return [];
    }

    const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s\.\-\/\+\#]/g, ' ');
    const foundSkills = new Set<string>();

    for (const skill of TECH_SKILLS) {
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,;|/\\(\\)])${escapedSkill}(?:[\\s,;|/\\(\\)]|$)`, 'gi');
      if (regex.test(normalizedText)) {
        foundSkills.add(skill);
      }
    }

    for (const skill of SOFT_SKILLS) {
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,;|/\\(\\)])${escapedSkill}(?:[\\s,;|/\\(\\)]|$)`, 'gi');
      if (regex.test(normalizedText)) {
        foundSkills.add(skill);
      }
    }

    const words = normalizedText.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const twoWord = i < words.length - 1 ? `${word} ${words[i + 1]}` : '';
      const threeWord = i < words.length - 2 ? `${word} ${words[i + 1]} ${words[i + 2]}` : '';
      
      if (techSkillsSet.has(word)) foundSkills.add(word);
      if (techSkillsSet.has(twoWord)) foundSkills.add(twoWord);
      if (techSkillsSet.has(threeWord)) foundSkills.add(threeWord);
      
      if (softSkillsSet.has(word)) foundSkills.add(word);
      if (softSkillsSet.has(twoWord)) foundSkills.add(twoWord);
      if (softSkillsSet.has(threeWord)) foundSkills.add(threeWord);
    }

    return Array.from(foundSkills).sort();
  }

  extractExperience(text: string): { title: string; company: string; duration: string }[] {
    const experience: { title: string; company: string; duration: string }[] = [];
    
    const jobTitles = [
      'engineer', 'developer', 'manager', 'lead', 'architect', 'analyst', 'consultant',
      'designer', 'director', 'specialist', 'coordinator', 'administrator', 'intern',
      'scientist', 'researcher', 'technician', 'associate', 'senior', 'junior', 'principal',
      'staff', 'head', 'chief', 'vp', 'president', 'cto', 'ceo', 'cfo', 'coo',
    ];

    const lines = text.split('\n');
    let currentTitle = '';
    let currentCompany = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      const lowerLine = trimmedLine.toLowerCase();
      
      for (const title of jobTitles) {
        if (lowerLine.includes(title) && trimmedLine.length < 100) {
          currentTitle = trimmedLine.replace(/[•\-–—]/g, '').trim();
          break;
        }
      }
      
      if (/\b(inc\.|llc|ltd|corp|company|technologies|solutions|software|systems|pvt|private|limited)\b/i.test(trimmedLine)) {
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
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'has',
      'are', 'was', 'were', 'been', 'being', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'shall', 'can', 'need', 'not', 'but', 'our', 'your',
      'his', 'her', 'its', 'their', 'what', 'which', 'who', 'whom', 'whose', 'when',
      'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
      'other', 'some', 'such', 'any', 'only', 'same', 'than', 'too', 'very', 'just',
      'also', 'using', 'used', 'use', 'work', 'working', 'worked', 'experience', 'experienced',
    ]);

    for (const word of words) {
      if (!/^\d+$/.test(word) && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    const keywords = Array.from(wordFreq.entries())
      .filter(([word, count]) => count >= 2 && !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word]) => word);

    return keywords;
  }

  calculateJobMatchScore(resumeSkills: string[], jobDescription: string): number {
    if (resumeSkills.length === 0) return 0;

    const jobSkills = this.extractSkills(jobDescription);
    if (jobSkills.length === 0) return 50;

    const normalizedResumeSkills = new Set(resumeSkills.map(s => s.toLowerCase()));
    let matchedSkills = 0;

    for (const skill of jobSkills) {
      if (normalizedResumeSkills.has(skill.toLowerCase())) {
        matchedSkills++;
      }
    }

    return Math.round((matchedSkills / jobSkills.length) * 100);
  }
}

export const resumeService = new ResumeService();
export default resumeService;
