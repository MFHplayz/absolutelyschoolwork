if (sessionStorage.getItem('absolutely-school-work-owner-session') !== 'active') {
  window.location.replace('index.html');
}

const hackButton = document.querySelector('#hack-toggle');
const hackStatus = document.querySelector('#hack-status');
const scorePanel = document.querySelector('#score-panel');
const scoreList = document.querySelector('#score-list');
const games = [
  ['snake', 'Snake'],
  ['merge', '2048'],
  ['tictactoe', 'Tic-Tac-Toe'],
  ['connectfour', 'Connect Four'],
  ['darts', 'Darts'],
  ['reaction', 'Reaction'],
  ['memory', 'Memory'],
  ['blockblast', 'Block Blast'],
  ['minesweeper', 'Minesweeper'],
  ['clicker', 'Clicker'],
  ['dash', 'Dash'],
  ['checkers', 'Checkers'],
  ['pong', 'Pong']
];

games.forEach(([id, name]) => {
  const row = document.createElement('form');
  row.className = 'owner-score-row';

  const label = document.createElement('label');
  label.htmlFor = `score-${id}`;
  label.textContent = name;

  const input = document.createElement('input');
  input.id = `score-${id}`;
  input.name = 'score';
  input.type = 'number';
  input.min = '0';
  input.step = '1';
  input.required = true;
  input.value = localStorage.getItem(`arcade-${id}`) || '0';
  input.setAttribute('aria-label', `${name} best score`);

  const saveButton = document.createElement('button');
  saveButton.className = 'submit-button';
  saveButton.type = 'submit';
  saveButton.textContent = 'Save';

  row.addEventListener('submit', event => {
    event.preventDefault();
    const score = Number(input.value);
    if (!Number.isSafeInteger(score) || score < 0) {
      hackStatus.textContent = 'Enter a whole number of zero or more.';
      input.focus();
      return;
    }
    localStorage.setItem(`arcade-${id}`, String(score));
    hackStatus.textContent = `${name} best score set to ${score}.`;
  });

  row.append(label, input, saveButton);
  scoreList.append(row);
});

hackButton.addEventListener('click', () => {
  const enabled = hackButton.getAttribute('aria-pressed') !== 'true';
  hackButton.setAttribute('aria-pressed', String(enabled));
  scorePanel.hidden = !enabled;
  hackStatus.textContent = `Hack mode is ${enabled ? 'on' : 'off'}.`;
});