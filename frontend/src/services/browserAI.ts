import { pipeline, env } from '@xenova/transformers';
import type { FeatureExtractionPipeline } from '@xenova/transformers';

env.allowLocalModels = false;

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
  'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'mongo', 'redis', 'elasticsearch', 'elastic', 'dynamodb',
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
  'microservices', 'monolith', 'serverless', 'event-driven', 'domain-driven', 'ddd', 'cqrs', 'event sourcing',
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
  'sap', 'abap', 'salesforce', 'oracle', 'erp', 'crm', 'servicenow', 'workday', 'dynamics 365', 'sharepoint',
  'power platform', 'power bi', 'tableau', 'looker', 'qlik', 'sisense', 'metabase', 'superset',
  
  // Data & Analytics
  'data analysis', 'data analytics', 'data science', 'data engineering', 'etl', 'elt', 'data warehouse', 'data lake',
  'business intelligence', 'bi', 'reporting', 'dashboards', 'visualization', 'excel', 'sql', 'dbt', 'airflow', 'dagster',
  'fivetran', 'stitch', 'talend', 'informatica', 'ssis', 'alteryx', 'knime',
  
  // Mobile Development
  'mobile', 'ios', 'android', 'react native', 'flutter', 'xamarin', 'ionic', 'cordova', 'capacitor',
  'swift', 'swiftui', 'kotlin', 'jetpack compose', 'objective-c', 'xcode', 'android studio', 'expo',
  
  // Web3 & Blockchain
  'blockchain', 'web3', 'solidity', 'ethereum', 'smart contracts', 'defi', 'nft', 'crypto', 'cryptocurrency',
  'bitcoin', 'hardhat', 'truffle', 'foundry', 'ipfs', 'polygon', 'solana', 'rust', 'anchor',
  
  // Game Development
  'unity', 'unreal', 'unreal engine', 'godot', 'game development', 'gamedev', 'c#', 'c++', 'opengl', 'directx', 'vulkan',
  
  // Other Technologies
  'devops', 'sre', 'site reliability', 'platform engineering', 'cloud', 'infrastructure', 'iac', 'gitops',
  'agile', 'scrum', 'kanban', 'jira', 'confluence', 'trello', 'asana', 'monday', 'notion', 'linear',
  'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'invision', 'zeplin', 'ui/ux', 'ux', 'ui',
  'storybook', 'chromatic', 'visual testing', 'accessibility', 'a11y', 'wcag', 'aria',
  'redis', 'rabbitmq', 'kafka', 'message queue', 'mq', 'pub/sub', 'sqs', 'sns', 'kinesis', 'nats', 'zeromq',
  'elasticsearch', 'solr', 'algolia', 'meilisearch', 'typesense', 'opensearch',
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

export interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  bonusSkills: string[];
  details: {
    semanticScore: number;
    skillScore: number;
    keywordScore: number;
  };
}

export interface ResumeData {
  skills: string[];
  experience: { title: string; company: string; years: number }[];
  education: { degree: string; institution: string; year: string }[];
  summary: string;
  keywords: string[];
}

export interface SkillGap {
  skill: string;
  demandCount: number;
  category: 'technical' | 'soft' | 'tool';
  priority: 'high' | 'medium' | 'low';
}

type LoadingCallback = (progress: number, status: string) => void;

class BrowserAIService {
  private embeddingPipeline: FeatureExtractionPipeline | null = null;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;
  private modelLoaded = false;
  
  private techSkillsSet = new Set(TECH_SKILLS.map(s => s.toLowerCase()));
  private softSkillsSet = new Set(SOFT_SKILLS.map(s => s.toLowerCase()));

  async initialize(onProgress?: LoadingCallback): Promise<void> {
    if (this.modelLoaded && this.embeddingPipeline) {
      return;
    }

    if (this.isLoading && this.loadingPromise) {
      return this.loadingPromise;
    }

    this.isLoading = true;
    onProgress?.(0, 'Initializing AI model...');

    this.loadingPromise = (async () => {
      try {
        onProgress?.(10, 'Loading embedding model...');
        
        this.embeddingPipeline = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          {
            progress_callback: (data: { progress?: number; status?: string }) => {
              if (data.progress !== undefined) {
                const progress = Math.min(10 + data.progress * 0.8, 90);
                onProgress?.(progress, data.status || 'Loading model...');
              }
            },
          }
        );

        this.modelLoaded = true;
        onProgress?.(100, 'AI model ready!');
      } catch (error) {
        console.error('Failed to load AI model:', error);
        throw error;
      } finally {
        this.isLoading = false;
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  isReady(): boolean {
    return this.modelLoaded && this.embeddingPipeline !== null;
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingPipeline) {
      throw new Error('AI model not initialized. Call initialize() first.');
    }

    const cleanText = text.slice(0, 512).replace(/\s+/g, ' ').trim();
    
    const output = await this.embeddingPipeline(cleanText, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data as Float32Array);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  extractSkills(text: string): { technical: string[]; soft: string[] } {
    if (!text || typeof text !== 'string') {
      return { technical: [], soft: [] };
    }
    
    const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s\.\-\/\+\#]/g, ' ');
    const technical = new Set<string>();
    const soft = new Set<string>();

    for (const skill of TECH_SKILLS) {
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,;|/\\(\\)])${escapedSkill}(?:[\\s,;|/\\(\\)]|$)`, 'gi');
      if (regex.test(normalizedText)) {
        technical.add(skill);
      }
    }

    for (const skill of SOFT_SKILLS) {
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,;|/\\(\\)])${escapedSkill}(?:[\\s,;|/\\(\\)]|$)`, 'gi');
      if (regex.test(normalizedText)) {
        soft.add(skill);
      }
    }

    const words = normalizedText.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const twoWord = i < words.length - 1 ? `${word} ${words[i + 1]}` : '';
      const threeWord = i < words.length - 2 ? `${word} ${words[i + 1]} ${words[i + 2]}` : '';
      
      if (this.techSkillsSet.has(word)) technical.add(word);
      if (this.techSkillsSet.has(twoWord)) technical.add(twoWord);
      if (this.techSkillsSet.has(threeWord)) technical.add(threeWord);
      
      if (this.softSkillsSet.has(word)) soft.add(word);
      if (this.softSkillsSet.has(twoWord)) soft.add(twoWord);
      if (this.softSkillsSet.has(threeWord)) soft.add(threeWord);
    }

    return {
      technical: [...technical].sort(),
      soft: [...soft].sort(),
    };
  }

  parseResume(text: string): ResumeData {
    const skills = this.extractSkills(text);
    const allSkills = [...skills.technical, ...skills.soft];

    const experience = this.extractExperience(text);
    const education = this.extractEducation(text);
    const keywords = this.extractKeywords(text);

    const lines = text.split('\n').filter(l => l.trim());
    const summaryLines = lines.slice(0, 5).join(' ');
    const summary = summaryLines.length > 300 ? summaryLines.slice(0, 300) + '...' : summaryLines;

    return {
      skills: allSkills,
      experience,
      education,
      summary,
      keywords,
    };
  }

  private extractExperience(text: string): { title: string; company: string; years: number }[] {
    const experience: { title: string; company: string; years: number }[] = [];
    const lines = text.split('\n');
    
    const jobTitles = [
      'engineer', 'developer', 'manager', 'lead', 'architect', 'analyst', 'consultant',
      'designer', 'director', 'specialist', 'coordinator', 'administrator', 'intern',
      'scientist', 'researcher', 'technician', 'associate', 'senior', 'junior', 'principal',
      'staff', 'head', 'chief', 'vp', 'president', 'cto', 'ceo', 'cfo', 'coo',
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      for (const title of jobTitles) {
        if (line.includes(title) && line.length < 100) {
          const yearMatch = line.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
          const years = yearMatch ? parseInt(yearMatch[1], 10) : 0;
          
          experience.push({
            title: lines[i].trim().slice(0, 80),
            company: 'Not specified',
            years,
          });
          break;
        }
      }
    }

    return experience.slice(0, 5);
  }

  private extractEducation(text: string): { degree: string; institution: string; year: string }[] {
    const education: { degree: string; institution: string; year: string }[] = [];
    const lines = text.split('\n');
    
    const degreeKeywords = [
      'bachelor', 'master', 'phd', 'doctorate', 'b.tech', 'm.tech', 'b.e', 'm.e',
      'bsc', 'msc', 'mba', 'bba', 'b.s.', 'm.s.', 'associate', 'diploma',
      'bca', 'mca', 'b.com', 'm.com', 'be', 'me', 'bs', 'ms', 'ba', 'ma',
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      for (const keyword of degreeKeywords) {
        if (line.includes(keyword)) {
          const yearMatch = line.match(/\b(19|20)\d{2}\b/);
          
          education.push({
            degree: lines[i].trim().slice(0, 100),
            institution: lines[i + 1]?.trim().slice(0, 100) || 'Not specified',
            year: yearMatch ? yearMatch[0] : 'Not specified',
          });
          break;
        }
      }
    }

    return education.slice(0, 3);
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s\-\.]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const wordFreq = new Map<string, number>();
    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'has',
      'are', 'was', 'were', 'been', 'being', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'shall', 'can', 'need', 'not', 'but', 'our', 'your',
      'his', 'her', 'its', 'their', 'what', 'which', 'who', 'whom', 'when', 'where',
      'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
      'some', 'such', 'any', 'only', 'same', 'than', 'too', 'very', 'just', 'also',
      'using', 'used', 'use', 'work', 'working', 'worked', 'experience', 'experienced',
    ]);

    for (const word of words) {
      if (!/^\d+$/.test(word) && !stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    return Array.from(wordFreq.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word]) => word);
  }

  async calculateMatchScore(
    resumeText: string,
    jobDescription: string,
    resumeSkills?: string[]
  ): Promise<MatchResult> {
    const skills = resumeSkills || this.extractSkills(resumeText).technical;
    const jobSkills = this.extractSkills(jobDescription);
    const allJobSkills = [...jobSkills.technical, ...jobSkills.soft];

    const normalizedSkills = new Set(skills.map(s => s.toLowerCase()));
    const normalizedJobSkills = allJobSkills.map(s => s.toLowerCase());

    const matchedSkills = allJobSkills.filter(js => 
      normalizedSkills.has(js.toLowerCase())
    );
    const missingSkills = allJobSkills.filter(js => 
      !normalizedSkills.has(js.toLowerCase())
    );
    const bonusSkills = skills.filter(s => 
      !normalizedJobSkills.includes(s.toLowerCase())
    );

    const skillScore = allJobSkills.length > 0 
      ? (matchedSkills.length / allJobSkills.length) * 100 
      : 50;

    let semanticScore = 50;
    if (this.isReady()) {
      try {
        const [resumeEmbedding, jobEmbedding] = await Promise.all([
          this.getEmbedding(resumeText),
          this.getEmbedding(jobDescription),
        ]);
        semanticScore = this.cosineSimilarity(resumeEmbedding, jobEmbedding) * 100;
      } catch (error) {
        console.warn('Semantic matching failed, using skill-based score only:', error);
      }
    }

    const resumeKeywords = this.extractKeywords(resumeText);
    const jobKeywords = this.extractKeywords(jobDescription);
    const keywordMatches = resumeKeywords.filter(rk => 
      jobKeywords.some(jk => jk === rk)
    );
    const keywordScore = jobKeywords.length > 0 
      ? (keywordMatches.length / jobKeywords.length) * 100 
      : 50;

    const finalScore = Math.round(
      semanticScore * 0.4 +
      skillScore * 0.4 +
      keywordScore * 0.2
    );

    return {
      score: Math.min(100, Math.max(0, finalScore)),
      matchedSkills,
      missingSkills: missingSkills.slice(0, 10),
      bonusSkills: bonusSkills.slice(0, 10),
      details: {
        semanticScore: Math.round(semanticScore),
        skillScore: Math.round(skillScore),
        keywordScore: Math.round(keywordScore),
      },
    };
  }

  async batchCalculateMatchScores(
    resumeText: string,
    jobs: { id: string; description: string }[],
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, MatchResult>> {
    const results = new Map<string, MatchResult>();
    const resumeSkills = this.extractSkills(resumeText).technical;

    let resumeEmbedding: number[] | null = null;
    if (this.isReady()) {
      try {
        resumeEmbedding = await this.getEmbedding(resumeText);
      } catch (error) {
        console.warn('Failed to get resume embedding:', error);
      }
    }

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      onProgress?.(i + 1, jobs.length);

      try {
        if (resumeEmbedding && this.isReady()) {
          const jobSkills = this.extractSkills(job.description);
          const allJobSkills = [...jobSkills.technical, ...jobSkills.soft];

          const matchedSkills = resumeSkills.filter(s => 
            allJobSkills.some(js => js.toLowerCase() === s.toLowerCase())
          );
          const missingSkills = allJobSkills.filter(js => 
            !resumeSkills.some(s => s.toLowerCase() === js.toLowerCase())
          );
          const bonusSkills = resumeSkills.filter(s => 
            !allJobSkills.some(js => js.toLowerCase() === s.toLowerCase())
          );

          const skillScore = allJobSkills.length > 0 
            ? (matchedSkills.length / allJobSkills.length) * 100 
            : 50;

          let semanticScore = 50;
          try {
            const jobEmbedding = await this.getEmbedding(job.description);
            semanticScore = this.cosineSimilarity(resumeEmbedding, jobEmbedding) * 100;
          } catch {
            // Use default semantic score
          }

          const resumeKeywords = this.extractKeywords(resumeText);
          const jobKeywords = this.extractKeywords(job.description);
          const keywordMatches = resumeKeywords.filter(rk => 
            jobKeywords.some(jk => jk === rk)
          );
          const keywordScore = jobKeywords.length > 0 
            ? (keywordMatches.length / jobKeywords.length) * 100 
            : 50;

          const finalScore = Math.round(
            semanticScore * 0.4 +
            skillScore * 0.4 +
            keywordScore * 0.2
          );

          results.set(job.id, {
            score: Math.min(100, Math.max(0, finalScore)),
            matchedSkills,
            missingSkills: missingSkills.slice(0, 10),
            bonusSkills: bonusSkills.slice(0, 10),
            details: {
              semanticScore: Math.round(semanticScore),
              skillScore: Math.round(skillScore),
              keywordScore: Math.round(keywordScore),
            },
          });
        } else {
          const result = await this.calculateMatchScore(resumeText, job.description, resumeSkills);
          results.set(job.id, result);
        }
      } catch (error) {
        console.error(`Failed to calculate match for job ${job.id}:`, error);
        results.set(job.id, {
          score: 0,
          matchedSkills: [],
          missingSkills: [],
          bonusSkills: [],
          details: { semanticScore: 0, skillScore: 0, keywordScore: 0 },
        });
      }
    }

    return results;
  }

  analyzeSkillGaps(
    userSkills: string[],
    jobDescriptions: string[]
  ): SkillGap[] {
    const skillDemand = new Map<string, number>();
    
    for (const description of jobDescriptions) {
      const skills = this.extractSkills(description);
      const allSkills = [...skills.technical, ...skills.soft];
      
      for (const skill of allSkills) {
        const normalizedSkill = skill.toLowerCase();
        skillDemand.set(normalizedSkill, (skillDemand.get(normalizedSkill) || 0) + 1);
      }
    }

    const normalizedUserSkills = new Set(userSkills.map(s => s.toLowerCase()));
    const gaps: SkillGap[] = [];

    for (const [skill, count] of skillDemand.entries()) {
      if (!normalizedUserSkills.has(skill)) {
        const isTechnical = this.techSkillsSet.has(skill);
        const isSoft = this.softSkillsSet.has(skill);
        
        let priority: 'high' | 'medium' | 'low';
        const percentage = (count / jobDescriptions.length) * 100;
        if (percentage >= 50) priority = 'high';
        else if (percentage >= 25) priority = 'medium';
        else priority = 'low';

        gaps.push({
          skill,
          demandCount: count,
          category: isTechnical ? 'technical' : isSoft ? 'soft' : 'tool',
          priority,
        });
      }
    }

    return gaps.sort((a, b) => b.demandCount - a.demandCount).slice(0, 20);
  }

  getMarketSkillDemand(jobDescriptions: string[]): Map<string, number> {
    const skillDemand = new Map<string, number>();
    
    for (const description of jobDescriptions) {
      const skills = this.extractSkills(description);
      const allSkills = [...skills.technical, ...skills.soft];
      
      for (const skill of allSkills) {
        const normalizedSkill = skill.toLowerCase();
        skillDemand.set(normalizedSkill, (skillDemand.get(normalizedSkill) || 0) + 1);
      }
    }

    return new Map(
      [...skillDemand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)
    );
  }
}

export const browserAI = new BrowserAIService();
export default browserAI;
