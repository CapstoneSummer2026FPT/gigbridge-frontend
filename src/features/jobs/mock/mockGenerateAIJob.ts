/**
 * ⚠️  MOCK FILE — For testing AI generate job feature when backend is unavailable.
 *
 * HOW TO USE:
 *   In `usePostJob.ts`, inside `handleGenerateInstantJob`, replace the real API call:
 *
 *     const response = await jobAPI.generateAIDescription([prompt.trim()]);
 *
 *   with the mock:
 *
 *     const response = await mockGenerateAIJob(prompt.trim());
 *
 *   Don't forget to import:
 *     import { mockGenerateAIJob } from '../mock/mockGenerateAIJob';
 *
 *   To restore real API, revert the import and function call back to:
 *     const response = await jobAPI.generateAIDescription([prompt.trim()]);
 */

import type { ApiResponse } from '../../../types/common';
import type { GenerateJobDescriptionResponse } from '../../../types/models/Job';

// ─── Simulated delay ─────────────────────────────────────────────────────────
const simulateDelay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

// ─── Mock scenarios ───────────────────────────────────────────────────────────
// Each scenario matches common prompt keywords.
// The IDs (majorId, categoryId, majorCategoryId) should match your real seeded DB.
// Adjust them if your DB uses different UUIDs.
const MOCK_SCENARIOS: Array<{
  keywords: string[];
  data: GenerateJobDescriptionResponse;
}> = [
  {
    keywords: ['react', 'frontend', 'web', 'typescript', 'nextjs', 'vue', 'angular'],
    data: {
      title: 'Senior Frontend Developer (React / TypeScript)',
      majorId: 'major-it-001',
      majorName: 'Information Technology',
      majorCategoryId: 'majcat-web-001',
      categoryId: 'cat-webdev-001',
      categoryName: 'Web Development',
      skills: [
        { skillsId: 'skill-react-001', name: 'React' },
        { skillsId: 'skill-ts-001', name: 'TypeScript' },
        { skillsId: 'skill-tailwind-001', name: 'Tailwind CSS' },
        { skillsId: 'skill-git-001', name: 'Git' },
      ],
      customSkills: ['REST API Integration', 'Performance Optimization'],
      description: `## About the Role
We are looking for a **Senior Frontend Developer** with strong expertise in React and TypeScript to join our growing product team.

## Responsibilities
- Build and maintain high-quality, performant React components
- Collaborate closely with UI/UX designers to implement pixel-perfect interfaces
- Integrate RESTful APIs and manage application state efficiently
- Write clean, testable, and well-documented code
- Participate in code reviews and mentor junior developers

## Requirements
- **3+ years** of professional experience with React
- Strong proficiency in TypeScript and modern ES6+ JavaScript
- Experience with Tailwind CSS or similar utility-first frameworks
- Solid understanding of Git workflows (Git Flow / trunk-based development)
- Strong communication skills and ability to work in an Agile environment

## Nice to Have
- Experience with Next.js or Vite
- Familiarity with CI/CD pipelines
- Knowledge of testing frameworks (Jest, Playwright, Vitest)

## What We Offer
- Competitive compensation ($2,000–$5,000 range, negotiable)
- Fully remote, flexible working hours
- Opportunity to work on a fast-growing product used by thousands of users`,
    },
  },
  {
    keywords: ['backend', 'dotnet', '.net', 'api', 'node', 'nodejs', 'express', 'server', 'microservice'],
    data: {
      title: 'Backend Developer (.NET / Node.js)',
      majorId: 'major-it-001',
      majorName: 'Information Technology',
      majorCategoryId: 'majcat-web-001',
      categoryId: 'cat-backend-001',
      categoryName: 'Backend Development',
      skills: [
        { skillsId: 'skill-dotnet-001', name: '.NET' },
        { skillsId: 'skill-csharp-001', name: 'C#' },
        { skillsId: 'skill-sql-001', name: 'SQL Server' },
        { skillsId: 'skill-rest-001', name: 'REST API Design' },
      ],
      customSkills: ['Microservices Architecture', 'Docker', 'JWT Authentication'],
      description: `## About the Role
We are seeking an experienced **Backend Developer** to design, build, and maintain scalable server-side applications and APIs for our platform.

## Responsibilities
- Design and implement robust RESTful APIs using .NET 8 / ASP.NET Core
- Optimize SQL queries and manage relational databases (SQL Server / PostgreSQL)
- Implement authentication & authorization (JWT, OAuth2)
- Collaborate with frontend developers and DevOps engineers
- Write unit and integration tests to ensure code quality

## Requirements
- **2+ years** of experience in backend development with .NET or Node.js
- Solid understanding of RESTful API design principles
- Proficiency with SQL and relational database management
- Familiarity with Docker and containerized deployments
- Clean Code and SOLID principles advocate

## Nice to Have
- Experience with message queues (RabbitMQ, Kafka)
- Knowledge of Redis caching
- Experience with Azure or AWS cloud services

## Compensation
- Budget: $3,000–$6,000 (fixed project scope)
- Remote, part-time or full-time engagement welcome`,
    },
  },
  {
    keywords: ['ui', 'ux', 'design', 'figma', 'mobile', 'app design', 'wireframe', 'prototype'],
    data: {
      title: 'UI/UX Designer – Mobile & Web Applications',
      majorId: 'major-design-001',
      majorName: 'Design & Creative',
      majorCategoryId: 'majcat-uidesign-001',
      categoryId: 'cat-uxdesign-001',
      categoryName: 'UI/UX Design',
      skills: [
        { skillsId: 'skill-figma-001', name: 'Figma' },
        { skillsId: 'skill-uxresearch-001', name: 'UX Research' },
        { skillsId: 'skill-prototyping-001', name: 'Prototyping' },
        { skillsId: 'skill-designsys-001', name: 'Design Systems' },
      ],
      customSkills: ['Mobile-first Design', 'Accessibility (WCAG 2.1)', 'Developer Handoff'],
      description: `## About the Role
We are looking for a talented **UI/UX Designer** to create visually compelling and user-centered experiences for our mobile and web products.

## Responsibilities
- Conduct user research, interviews, and usability testing
- Design wireframes, high-fidelity mockups, and interactive prototypes in Figma
- Build and maintain a comprehensive design system and component library
- Collaborate with product managers and developers throughout the delivery process
- Deliver developer-ready handoff assets with detailed annotations

## Requirements
- **2+ years** of professional UI/UX design experience
- Expert-level proficiency in Figma
- Portfolio demonstrating mobile-first, user-centered design thinking
- Strong understanding of usability principles and accessibility standards (WCAG 2.1)
- Excellent communication and presentation skills

## Nice to Have
- Motion design experience (Rive, Lottie, Principle)
- Familiarity with front-end basics (HTML/CSS)
- Experience with B2C fintech or e-commerce products

## Compensation
- Budget: $1,500–$3,500 per project milestone
- Remote, async-friendly team`,
    },
  },
  {
    keywords: ['data', 'python', 'ml', 'machine learning', 'ai', 'analytics', 'etl', 'pipeline'],
    data: {
      title: 'Data Engineer / ML Engineer',
      majorId: 'major-it-001',
      majorName: 'Information Technology',
      majorCategoryId: 'majcat-data-001',
      categoryId: 'cat-datascience-001',
      categoryName: 'Data Science & Analytics',
      skills: [
        { skillsId: 'skill-python-001', name: 'Python' },
        { skillsId: 'skill-sql-002', name: 'SQL' },
        { skillsId: 'skill-pandas-001', name: 'Pandas' },
        { skillsId: 'skill-airflow-001', name: 'Apache Airflow' },
      ],
      customSkills: ['ETL Pipeline Design', 'scikit-learn', 'Data Visualization (Power BI / Tableau)'],
      description: `## About the Role
We're hiring a **Data Engineer / ML Engineer** to design data pipelines, build ML models, and deliver data-driven insights for our analytics platform.

## Responsibilities
- Design, build, and maintain scalable ETL/ELT pipelines using Apache Airflow
- Develop and evaluate machine learning models (classification, regression, clustering)
- Collaborate with business stakeholders to define KPIs and reporting dashboards
- Optimize SQL queries and manage data warehouse performance
- Ensure data quality, lineage, and governance best practices

## Requirements
- **2+ years** of hands-on experience with Python for data engineering
- Strong SQL skills and experience with data warehouse tools (BigQuery, Redshift, Snowflake)
- Familiarity with ML frameworks (scikit-learn, XGBoost, or PyTorch)
- Experience with Apache Airflow or equivalent orchestration tools
- Clear communication of complex data findings to non-technical audiences

## Nice to Have
- MLOps experience (MLflow, Kubeflow)
- Cloud platform certifications (GCP, AWS, Azure)
- Experience with real-time streaming (Kafka, Spark Streaming)`,
    },
  },
  {
    keywords: ['content', 'write', 'copy', 'seo', 'blog', 'article', 'marketing', 'social media'],
    data: {
      title: 'Technical Content Writer & SEO Specialist',
      majorId: 'major-marketing-001',
      majorName: 'Marketing & Communications',
      majorCategoryId: 'majcat-content-001',
      categoryId: 'cat-contentwriting-001',
      categoryName: 'Content Writing',
      skills: [
        { skillsId: 'skill-seowriting-001', name: 'SEO Writing' },
        { skillsId: 'skill-copywriting-001', name: 'Copywriting' },
        { skillsId: 'skill-wordpress-001', name: 'WordPress' },
        { skillsId: 'skill-googlesearch-001', name: 'Google Search Console' },
      ],
      customSkills: ['Technical Documentation', 'Long-form Article Writing', 'Keyword Research'],
      description: `## About the Role
We need an expert **Technical Content Writer & SEO Specialist** to produce high-quality blog posts, technical guides, and marketing copy that ranks on Google and converts readers.

## Responsibilities
- Write 1,500–3,000 word SEO-optimized articles on software development, cloud computing, and tech trends
- Conduct comprehensive keyword research using Ahrefs / SEMrush
- Structure articles with proper heading hierarchy, internal links, and CTA placements
- Collaborate with the product marketing team for content calendar planning
- Update and refresh existing articles to maintain search rankings

## Requirements
- **2+ years** of experience in technical content writing
- Strong English writing and editing skills (C1/C2 level)
- Proven SEO knowledge and understanding of search ranking factors
- Ability to write both for technical and general audiences
- Portfolio of published articles with measurable traffic results

## Nice to Have
- Background in software engineering or computer science
- Experience with HubSpot, WordPress, or Webflow
- Familiarity with AI writing tools (used responsibly for research, not generation)`,
    },
  },
];

// ─── Fallback scenario ────────────────────────────────────────────────────────
const FALLBACK_MOCK: GenerateJobDescriptionResponse = {
  title: 'Freelance Specialist – Custom Project',
  majorId: 'major-it-001',
  majorName: 'Information Technology',
  majorCategoryId: 'majcat-web-001',
  categoryId: 'cat-webdev-001',
  categoryName: 'Web Development',
  skills: [
    { skillsId: 'skill-pm-001', name: 'Project Management' },
    { skillsId: 'skill-communication-001', name: 'Communication' },
  ],
  customSkills: ['Problem Solving', 'Agile Methodology'],
  description: `## About the Role
We are looking for a skilled **Freelance Specialist** to help us execute a custom project with high quality and within the agreed timeline.

## Responsibilities
- Understand project requirements and deliver against defined milestones
- Communicate progress and blockers clearly and proactively
- Produce high-quality deliverables with minimal rework
- Participate in review sessions and incorporate feedback promptly

## Requirements
- Proven track record of delivering freelance projects on time
- Strong written and verbal communication skills
- Self-motivated and able to work independently
- Comfortable with asynchronous remote collaboration

## What We Offer
- Competitive project-based compensation
- Flexible schedule within project deadlines
- Long-term engagement potential for exceptional candidates`,
};

// ─── Main mock function ───────────────────────────────────────────────────────
/**
 * Simulates the BE `POST /api/JobPosts/ai/generate` endpoint.
 * Matches prompt keywords to one of the predefined scenarios.
 * Adds a 1.5–2.5s artificial delay to mimic real network latency.
 */
export async function mockGenerateAIJob(
  prompt: string
): Promise<ApiResponse<GenerateJobDescriptionResponse>> {
  // Simulate network latency (1500–2500ms)
  const delay = 1500 + Math.random() * 1000;
  await simulateDelay(delay);

  const lowerPrompt = prompt.toLowerCase();

  // Find first matching scenario
  const matched = MOCK_SCENARIOS.find(scenario =>
    scenario.keywords.some(keyword => lowerPrompt.includes(keyword))
  );

  const data = matched ? matched.data : FALLBACK_MOCK;

  return {
    success: true,
    statusCode: 200,
    message: '[MOCK] AI job details generated successfully.',
    data,
  };
}
