// src/app/api/dict/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';

// 타입 선언
type JishoSense = {
  english_definitions?: string[];
  parts_of_speech?: string[];
  sentences?: unknown; // 비공식 필드
};
type JishoJapanese = { word?: string; reading?: string };
type JishoEntry = { japanese?: JishoJapanese[]; senses?: JishoSense[] };
type JishoResponse = { data?: JishoEntry[] };

type SentenceLike = { japanese?: string; english?: string };

// 타입 가드: sentences 형태 점검
function isSentenceArray(x: unknown): x is SentenceLike[] {
  return Array.isArray(x) && x.every(it =>
    it && typeof it === 'object' &&
    ('japanese' in (it as Record<string, unknown>) || 'english' in (it as Record<string, unknown>))
  );
}

export async function GET(request: Request) {
  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    console.error('Supabase admin client unavailable', err);
    return NextResponse.json({ error: 'Server misconfigured: Supabase credentials missing.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const term = searchParams.get('q')?.trim();
  if (!term) return NextResponse.json({ error: 'q required' }, { status: 400 });

  // 1) 캐시 히트
  const { data: cached } = await supabaseAdmin
    .from('words')
    .select('id, kanji, kana, readings, meaning, pos, audio_url, source, last_fetched')
    .eq('kanji', term)
    .limit(1)
    .maybeSingle();

  if (cached && cached.last_fetched && Date.now() - new Date(cached.last_fetched).getTime() < 24 * 60 * 60 * 1000) {
    const { data: ex } = await supabaseAdmin.from('examples').select('*').eq('word_id', cached.id).limit(10);
    return NextResponse.json({ word: cached, examples: ex ?? [] });
  }

  // 2) 외부 사전 호출
  const dictRes = await fetch(
    `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(term)}`,
    { cache: 'no-store' }
  );
  if (!dictRes.ok) return NextResponse.json({ error: 'dict fetch failed' }, { status: 502 });

  const dict = (await dictRes.json()) as JishoResponse;
  const entry = dict?.data?.[0];
  if (!entry) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // 파싱
  const kanji = entry.japanese?.[0]?.word ?? term;
  const kana = entry.japanese?.[0]?.reading ?? null;
  const senses = entry.senses?.[0];
  const meaning = senses?.english_definitions?.join(', ') ?? null;
  const pos = senses?.parts_of_speech?.join(', ') ?? null;
  const audio_url = null;

  const readings: string[] = [];
  if (kana) readings.push(kana);

  // 3) upsert words
  let wordId = cached?.id;
  if (!wordId) {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('words')
      .insert({
        kanji, kana, readings, meaning, pos, audio_url,
        source: 'jisho', last_fetched: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    wordId = inserted.id;
  } else {
    await supabaseAdmin
      .from('words')
      .update({
        kana, readings, meaning, pos, audio_url,
        source: 'jisho', last_fetched: new Date().toISOString(),
      })
      .eq('id', wordId);
  }

  // 4) 예문 파싱 & upsert
  const rawSentences: unknown =
    entry?.senses?.[0] && (entry.senses[0] as { sentences?: unknown }).sentences;

  const examples: { sentence: string; translation: string | null }[] =
    isSentenceArray(rawSentences)
      ? rawSentences.slice(0, 5).map((s) => ({
          sentence: s.japanese ?? '',
          translation: s.english ?? null,
        }))
      : [];

  for (const ex of examples) {
    if (!ex.sentence) continue;
    await supabaseAdmin
      .from('examples')
      .insert({
        word_id: wordId,
        sentence: ex.sentence,
        translation: ex.translation,
        source: 'jisho',
      })
      .select('id')
      .maybeSingle();
  }

  // 5) 최종 응답
  const { data: word } = await supabaseAdmin
    .from('words')
    .select('id, kanji, kana, readings, meaning, pos, audio_url, source, last_fetched')
    .eq('id', wordId)
    .single();

  const { data: exRows } = await supabaseAdmin
    .from('examples')
    .select('*')
    .eq('word_id', wordId)
    .limit(10);

  return NextResponse.json({ word, examples: exRows ?? [] });
}
