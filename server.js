const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/voicings', async (req, res) => {
  const { root, qualityId, qualityDesc } = req.body;
  if (!root || !qualityDesc) return res.status(400).json({ error: 'Faltan parámetros' });

  const needsStringFilter = ['maj7','mmaj7','m6','m7'].includes(qualityId);

  const prompt = `You are an expert guitarist. Return ONLY valid JSON, no markdown, no explanation.

Provide 4 common guitar voicings for: ${root} ${qualityDesc}

JSON schema:
{
  "chordName": "chord name e.g. Am7",
  "voicings": [
    { "name": "short Spanish name max 4 words", "fretOffset": 1, "strings": [null,0,2,2,2,0], "barre": null }
  ]
}

Rules:
- strings: 6 values [low E, A, D, G, B, high e]. null=muted, 0=open, 1-12=absolute fret
- fretOffset: lowest fret shown (1-12). All non-null/non-zero frets must be >= fretOffset and <= fretOffset+4
- barre: null or absolute fret number of a full barre
- Exactly 4 voicings, musically correct, varied positions, first one open if possible
${needsStringFilter ? '- Include one voicing using ONLY strings 6,4,3,2 (strings[1] and strings[5] = null)' : ''}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });
    const raw = msg.content.map(c => c.text || '').join('');
    res.json(JSON.parse(raw.replace(/```json|```/g, '').trim()));
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✓ http://localhost:${PORT}`));
