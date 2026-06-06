import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';

export async function POST(request, { params }) {
  try {
    const auth = await isAuthenticated(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { input } = await request.json();

    if (!input) {
      return NextResponse.json({ error: 'Campo obrigatório: input' }, { status: 400 });
    }

    const db = supabaseAdmin;

    // Busca a skill
    const { data: skill, error: skillErr } = await db
      .from('skills')
      .select('*')
      .eq('id', id)
      .single();

    if (skillErr) throw skillErr;
    if (!skill) return NextResponse.json({ error: 'Skill não encontrada' }, { status: 404 });

    const prompt = skill.prompt_template.replace('{{input}}', input);

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!groqResponse.ok) {
      const groqErr = await groqResponse.text();
      throw new Error(`Groq error: ${groqErr}`);
    }

    const groqData = await groqResponse.json();
    const output = groqData.choices?.[0]?.message?.content ?? '';

    // Salva execução
    const { data: execucao, error: execErr } = await db
      .from('skill_execucoes')
      .insert({
        skill_id: id,
        input,
        output,
        executado_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (execErr) throw execErr;

    return NextResponse.json(execucao, { status: 201 });
  } catch (err) {
    console.error('[skills/[id]/executar POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
