export async function startQuiz() {
  try {
    const res = await fetch('/api/quiz/start');
    if (!res.ok) throw new Error('api fail');
    const j = await res.json();
    if (j && j.success) return j.data;
  } catch (e) {
    // fallback: try to build questions minimally from题目.txt is not possible in browser.
    // Return null to let app use local mock.
    return null;
  }
}

export async function submitQuiz(payload) {
  try {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('api fail');
    const j = await res.json();
    if (j && j.success) return j.data;
  } catch (e) {
    // fallback: try to read generated result.json
    try {
      const r = await fetch('/output/result.json');
      if (!r.ok) throw new Error('no local result');
      return (await r.json());
    } catch (err) {
      return null;
    }
  }
}
