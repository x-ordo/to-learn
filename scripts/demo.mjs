#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const samplesDir = path.join(rootDir, 'samples');
const resultsDir = path.join(rootDir, 'results');
const apiBase = (process.env.DEMO_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
const sampleTextPath = path.join(samplesDir, 'lecture-intro.txt');
const quizTextPath = path.join(samplesDir, 'valuation-memo.txt');
const pdfPath = path.join(samplesDir, 'pf-risk-notes.pdf');

const endpoints = {
  upload: `${apiBase}/upload`,
  summary: `${apiBase}/summary`,
  qna: `${apiBase}/qna`,
  quiz: `${apiBase}/quiz`,
  recommend: `${apiBase}/recommend`
};

async function ensureResultsDir() {
  await fs.mkdir(resultsDir, { recursive: true });
}

async function saveResult(filename, payload) {
  const filePath = path.join(resultsDir, filename);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`✔ Saved ${path.relative(rootDir, filePath)}`);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with ${response.status}`);
  }
  return response.json();
}

async function uploadPdf() {
  const buffer = await fs.readFile(pdfPath);
  const form = new FormData();
  form.append('file', new Blob([buffer]), 'pf-risk-notes.pdf');
  const response = await fetch(endpoints.upload, {
    method: 'POST',
    body: form
  });
  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
  return response.json();
}

async function run() {
  console.log('Running demo workflow against', apiBase);
  await ensureResultsDir();

  const uploadResult = await uploadPdf();
  await saveResult('01-upload.json', uploadResult);

  const summaryText = await fs.readFile(sampleTextPath, 'utf-8');
  const summaryResult = await postJson(endpoints.summary, {
    text: summaryText,
    maxSentences: 5
  });
  await saveResult('02-summary.json', summaryResult);

  const qnaResult = await postJson(endpoints.qna, {
    text: summaryText,
    count: 3
  });
  await saveResult('03-qna.json', qnaResult);

  const quizText = await fs.readFile(quizTextPath, 'utf-8');
  const quizResult = await postJson(endpoints.quiz, {
    text: quizText,
    type: 'objective',
    count: 3
  });
  await saveResult('04-quiz.json', quizResult);

  const recommendResult = await postJson(endpoints.recommend, {
    topic: 'PF 리스크 관리',
    keywords: ['PF', '리스크', '유동성'],
    limit: 3
  });
  await saveResult('05-recommend.json', recommendResult);

  console.log('Demo complete. Inspect the results/ directory for JSON outputs.');
}

run().catch((error) => {
  console.error('Demo failed:', error.message);
  process.exit(1);
});
