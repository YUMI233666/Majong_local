export const state = {
  sessionId: null,
  questions: [],
  answers: {},
};

export function save() {
  localStorage.setItem('maj_quiz_state', JSON.stringify(state));
}

export function load() {
  try{const s=JSON.parse(localStorage.getItem('maj_quiz_state')||'null');if(s){state.sessionId=s.sessionId;state.questions=s.questions;state.answers=s.answers}}catch(e){}
}
