import JSZip from 'jszip';
import type { Chapter, BookType } from '../types';

const CHAPTER_REGEX = /^(第[\s]*[一二三四五六七八九十百千零〇壹贰叁肆伍陆柒捌玖拾\d]+[\s]*[章节回卷篇]|Chapter[\s]*\d+|CHAPTER[\s]*\d+|第[\s]*\d+[\s]*[章节回卷篇])/im;

export function detectFileType(fileName: string): BookType | 'pdf' | 'unknown' {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return 'txt';
  if (ext === 'epub') return 'epub';
  if (ext === 'pdf') return 'pdf';
  return 'unknown';
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'UTF-8');
  });
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function fetchUrlAsText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.text();
}

export async function fetchUrlAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

export function parseTxtChapters(text: string): Chapter[] {
  const chapters: Chapter[] = [];
  const lines = text.split(/\r?\n/);
  let currentChapter: Chapter | null = null;
  let chapterIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(CHAPTER_REGEX);

    if (match) {
      if (currentChapter) {
        currentChapter.wordCount = currentChapter.content.length;
        chapters.push(currentChapter);
      }
      chapterIndex++;
      currentChapter = {
        index: chapterIndex - 1,
        title: match[0].trim(),
        content: '',
        wordCount: 0,
      };
    } else if (currentChapter) {
      if (currentChapter.content) {
        currentChapter.content += '\n';
      }
      currentChapter.content += lines[i];
    } else if (line) {
      chapterIndex++;
      currentChapter = {
        index: 0,
        title: '序章',
        content: lines[i],
        wordCount: 0,
      };
    }
  }

  if (currentChapter) {
    currentChapter.wordCount = currentChapter.content.length;
    chapters.push(currentChapter);
  }

  if (chapters.length === 0) {
    chapters.push({
      index: 0,
      title: '正文',
      content: text,
      wordCount: text.length,
    });
  }

  return chapters;
}

export async function parseEpub(buffer: ArrayBuffer): Promise<{ chapters: Chapter[]; title: string; author: string; coverImage?: string }> {
  const zip = await JSZip.loadAsync(buffer);

  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) {
    throw new Error('Invalid EPUB: missing container.xml');
  }

  const opfPathMatch = containerXml.match(/full-path="([^"]+)"/);
  if (!opfPathMatch) {
    throw new Error('Invalid EPUB: missing OPF path');
  }

  const opfPath = opfPathMatch[1];
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) {
    throw new Error('Invalid EPUB: missing OPF file');
  }

  const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  const authorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);

  let coverImage: string | undefined;
  const coverMetaMatch = opfXml.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"[^>]*>/i);
  if (coverMetaMatch) {
    const coverId = coverMetaMatch[1];
    const coverItemMatch = new RegExp(`<item[^>]*id="${coverId}"[^>]*href="([^"]+)"`, 'i').exec(opfXml);
    if (coverItemMatch) {
      const coverPath = opfDir + coverItemMatch[1];
      const coverFile = zip.file(coverPath);
      if (coverFile) {
        const coverBuffer = await coverFile.async('base64');
        const coverExt = coverPath.split('.').pop()?.toLowerCase();
        const mimeType = coverExt === 'png' ? 'image/png' : coverExt === 'jpg' || coverExt === 'jpeg' ? 'image/jpeg' : 'image/jpeg';
        coverImage = `data:${mimeType};base64,${coverBuffer}`;
      }
    }
  }

  const manifest: Record<string, string> = {};
  const itemRegex = /<item[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
    manifest[itemMatch[1]] = opfDir + itemMatch[2];
  }

  const spine: string[] = [];
  const itemrefRegex = /<itemref[^>]*idref="([^"]+)"[^>]*>/g;
  let itemrefMatch;
  while ((itemrefMatch = itemrefRegex.exec(opfXml)) !== null) {
    const href = manifest[itemrefMatch[1]];
    if (href) {
      spine.push(href);
    }
  }

  const chapters: Chapter[] = [];
  for (let i = 0; i < spine.length; i++) {
    const filePath = spine[i];
    const fileContent = await zip.file(filePath)?.async('string');
    if (!fileContent) continue;

    const text = extractHtmlText(fileContent);
    if (!text.trim()) continue;

    const titleMatch = fileContent.match(/<title[^>]*>([^<]+)<\/title>|<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || `第${i + 1}章`).trim() : `第${i + 1}章`;

    chapters.push({
      index: i,
      title,
      content: text,
      wordCount: text.length,
    });
  }

  return {
    chapters,
    title: titleMatch?.[1]?.trim() || '未知书名',
    author: authorMatch?.[1]?.trim() || '未知作者',
    coverImage,
  };
}

function extractHtmlText(html: string): string {
  let text = html;
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<[^>]+>/g, '\n');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function generateSummary(chapters: Chapter[], maxLength: number = 1000): string {
  let summary = '';
  for (const chapter of chapters) {
    if (summary.length >= maxLength) break;
    const remaining = maxLength - summary.length;
    const content = chapter.content.replace(/\s+/g, ' ').trim();
    if (content.length <= remaining) {
      summary += content + ' ';
    } else {
      summary += content.substring(0, remaining);
      break;
    }
  }
  return summary.trim();
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function generateDefaultCover(title: string, author: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 280;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 200, 280);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';

  const titleLines = wrapText(title, 160);
  const titleY = 100 - (titleLines.length - 1) * 25;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, 100, titleY + i * 28);
  });

  ctx.font = '14px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(author, 100, 200);

  return canvas.toDataURL('image/jpeg', 0.8);
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    if (testLine.length * 12 > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.slice(0, 3);
}
