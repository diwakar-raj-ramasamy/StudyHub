import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  message: string;
  sessionId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message, sessionId }: RequestBody = await req.json();

    const { data: notes, error: notesError } = await supabase
      .from('study_notes')
      .select('id, title, subject, content_text, description')
      .limit(100);

    if (notesError) throw notesError;

    const relevantNotes = findRelevantNotes(message, notes || []);

    const context = relevantNotes
      .map(note => `Title: ${note.title}\nSubject: ${note.subject}\nContent: ${note.content_text || note.description}`)
      .join('\n\n');

    let reply = '';
    const relatedNoteIds: string[] = [];

    if (relevantNotes.length > 0) {
      reply = generateResponse(message, context, relevantNotes);
      relatedNoteIds.push(...relevantNotes.map(n => n.id));
    } else {
      reply = generateGeneralResponse(message);
    }

    return new Response(
      JSON.stringify({ reply, relatedNotes: relatedNoteIds }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function findRelevantNotes(query: string, notes: any[]): any[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const scored = notes.map(note => {
    let score = 0;
    const searchText = `${note.title} ${note.subject} ${note.content_text || ''} ${note.description}`.toLowerCase();

    queryWords.forEach(word => {
      if (searchText.includes(word)) {
        score += 1;
      }
    });

    if (searchText.includes(queryLower)) {
      score += 5;
    }

    return { note, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.note);
}

function generateResponse(query: string, context: string, relevantNotes: any[]): string {
  const queryLower = query.toLowerCase();

  if (queryLower.includes('what') || queryLower.includes('explain') || queryLower.includes('define')) {
    const subjects = relevantNotes.map(n => n.subject).join(', ');
    return `Based on the study notes in ${subjects}, here's what I found:\n\n${extractKeyInfo(context, query)}\n\nThe information above is from the following notes: ${relevantNotes.map(n => n.title).join(', ')}. Would you like me to elaborate on any specific aspect?`;
  }

  if (queryLower.includes('how') || queryLower.includes('steps') || queryLower.includes('process')) {
    return `Here's how to approach this based on your study materials:\n\n${extractKeyInfo(context, query)}\n\nThis information comes from: ${relevantNotes.map(n => n.title).join(', ')}. Let me know if you need more details on any step!`;
  }

  if (queryLower.includes('difference') || queryLower.includes('compare') || queryLower.includes('vs')) {
    return `Let me help you understand the differences:\n\n${extractKeyInfo(context, query)}\n\nReference materials: ${relevantNotes.map(n => n.title).join(', ')}. Would you like me to explain any particular difference in more detail?`;
  }

  if (queryLower.includes('example') || queryLower.includes('instance')) {
    return `Here are some relevant examples from your study notes:\n\n${extractKeyInfo(context, query)}\n\nThese examples are from: ${relevantNotes.map(n => n.title).join(', ')}. Need more examples?`;
  }

  return `Based on your study notes (${relevantNotes.map(n => n.title).join(', ')}), here's what I found:\n\n${extractKeyInfo(context, query)}\n\nFeel free to ask follow-up questions for clarification!`;
}

function extractKeyInfo(context: string, query: string): string {
  const lines = context.split('\n').filter(line => line.trim().length > 0);
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const relevantLines = lines.filter(line => {
    const lineLower = line.toLowerCase();
    return queryWords.some(word => lineLower.includes(word));
  }).slice(0, 10);

  if (relevantLines.length > 0) {
    return relevantLines.join('\n');
  }

  return lines.slice(0, 15).join('\n');
}

function generateGeneralResponse(query: string): string {
  const queryLower = query.toLowerCase();

  if (queryLower.includes('hello') || queryLower.includes('hi') || queryLower.includes('hey')) {
    return "Hello! I'm your AI study assistant. I can help you with questions about your study notes. What would you like to learn about today?";
  }

  if (queryLower.includes('help') || queryLower.includes('what can you do')) {
    return "I can help you with:\n\n• Explaining concepts from your study notes\n• Answering questions about specific topics\n• Providing examples and clarifications\n• Comparing different concepts\n• Breaking down complex topics\n\nJust ask me anything related to your study materials!";
  }

  if (queryLower.includes('thank')) {
    return "You're welcome! Feel free to ask if you have more questions about your study materials.";
  }

  return "I couldn't find specific information about that in your current study notes. Could you try rephrasing your question or asking about a different topic that's covered in your uploaded materials?";
}
