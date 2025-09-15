// src/app/api/dict/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get('q')?.trim();
  if (!term) return NextResponse.json({ error: 'q required' }, { status: 400 });

  // 1) 캐시 히트: words에서 먼저 찾기
  const { data: cached } = await supabaseAdmin
    .from('words')
    .select('id, kanji, kana, readings, meaning, pos, audio_url, source, last_fetched')
    .eq('kanji', term)
    .limit(1)
    .maybeSingle();

  // 24시간 이내면 캐시 사용
  if (cached && cached.last_fetched && Date.now() - new Date(cached.last_fetched).getTime() < 24*60*60*1000) {
    // 예문도 같이 반환
    const { data: ex } = await supabaseAdmin.from('examples').select('*').eq('word_id', cached.id).limit(10);
    return NextResponse.json({ word: cached, examples: ex ?? [] });
  }

  // 2) 외부 사전에서 가져오기 (예: Jisho API; 필요시 다른 소스로 교체)
  // NOTE: 비공식 API 예시. 상용 전에는 각 서비스의 이용약관/속도 제한을 확인하세요.
  const dictRes = await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(term)}`, {
    // headers: { ... 필요시 키/헤더 세팅 ... }
    cache: 'no-store',
  });
  if (!dictRes.ok) {
    return NextResponse.json({ error: 'dict fetch failed' }, { status: 502 });
  }
  const dict = await dictRes.json();

  // 파싱 (간단 예시: 첫 결과만)
  const entry = dict?.data?.[0];
  if (!entry) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const kanji = entry.japanese?.[0]?.word ?? term;
  const kana = entry.japanese?.[0]?.reading ?? null;
  const senses = entry.senses?.[0];
  const meaning = senses?.english_definitions?.join(', ') ?? null;
  const pos = senses?.parts_of_speech?.join(', ') ?? null;

  // 오디오는 여러 소스가 있는데, 여기선 일단 없음(null) 가정. (필요시 다른 API로 보강)
  const audio_url = null;

  // readings 구성 (kana만 일단)
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
    await supabaseAdmin.from('words').update({
      kana, readings, meaning, pos, audio_url,
      source: 'jisho', last_fetched: new Date().toISOString(),
    }).eq('id', wordId);
  }

  // 4) 예문(간단) 파싱 & upsert (여기선 최대 5개)
  const examples: { sentence: string; translation: string | null }[] =
    (entry?.senses?.[0]?.sentences ?? [])
    .slice(0, 5)
    .map((s: any) => ({ sentence: s.japanese ?? '', translation: s.english ?? null }));

  for (const ex of examples) {
    if (!ex.sentence) continue;
    await supabaseAdmin.from('examples').insert({
      word_id: wordId,
      sentence: ex.sentence,
      translation: ex.translation,
      source: 'jisho',
    }).select('id').maybeSingle(); // 중복처리 개선 원하면 unique key 설계
  }

  // 5) 최종 응답
  const { data: word } = await supabaseAdmin
    .from('words')
    .select('id, kanji, kana, readings, meaning, pos, audio_url, source, last_fetched')
    .eq('id', wordId).single();

  const { data: exRows } = await supabaseAdmin.from('examples').select('*').eq('word_id', wordId).limit(10);
  return NextResponse.json({ word, examples: exRows ?? [] });
}