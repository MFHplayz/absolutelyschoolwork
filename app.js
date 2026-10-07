function setupReaction() {
  let state = 'start';
  let timer;
  let startedAt = 0;
  const target = document.createElement('button');
  target.className = 'reaction-target';
  target.type = 'button';
  stage.append(target);
  const status = document.createElement('p');
  status.className = 'tic-status';
  stage.append(status);

  function render() {
    target.textContent = state === 'start' ? 'Start' : state === 'waiting' ? 'Wait...' : state === 'ready' ? 'TAP' : 'Again';
    target.className = `reaction-target ${state}`;
    status.textContent = state === 'start' ? 'Start when ready' : state === 'waiting' ? 'Do not tap yet' : state === 'ready' ? 'Tap now' : status.textContent;
  }

  function start() {
    clearTimeout(timer);
    state = 'waiting';
    render();
    timer = setTimeout(() => {
      state = 'ready';
      startedAt = performance.now();
      render();
    }, 1200 + Math.random() * 1800);
  }
  target.addEventListener('click', () => {
    if (state === 'start' || state === 'ended') return start();
    if (state === 'waiting') {
      clearTimeout(timer);
      state = 'ended';
      status.textContent = 'Too early';
      render();
      return;
    }
    if (state === 'ready') {
      const reaction = Math.round(performance.now() - startedAt);
      const best = Number(localStorage.getItem('arcade-reaction') || 99999);
      if (reaction < best) {
        localStorage.setItem('arcade-reaction', reaction);
        bestScore.textContent = reaction;
      }
      state = 'ended';
      status.textContent = `${reaction} ms`;
      setMessage(`${reaction} ms reaction`);
      render();
    }
  });
  render();
  cleanupGame = () => clearTimeout(timer);
}

function setupDartsPlayers() {
  let mode = 'solo';
  let turn = 1;
  let throws = 0;
  let phase = 'vertical';
  let position = 8;
  let direction = 1;
  let lockedY = 50;
  let score = [0, 0];
  let running = true;
  let lastFrame = performance.now();
  let animationFrame;
  const options = document.createElement('div');
  options.className = 'darts-options';
  options.innerHTML = '<label>Mode <select><option value="solo">Solo</option><option value="duo">Two player</option></select></label>';
  stage.append(options);
  const modeSelect = options.querySelector('select');
  const target = document.createElement('button');
  target.className = 'darts-target';
  target.type = 'button';
  target.setAttribute('aria-label', 'Tap the moving circle, then tap again to throw a black X');
  target.innerHTML = '<span class="darts-ring darts-ring-double"></span><span class="darts-ring darts-ring-triple"></span><span class="darts-ring darts-ring-center"></span><span class="darts-label darts-label-double">D</span><span class="darts-label darts-label-triple">T</span><span class="darts-aim"></span>';
  stage.append(target);
  const status = document.createElement('p');
  status.className = 'tic-status';
  stage.append(status);
  const instructions = document.createElement('p');
  instructions.className = 'instructions';
  stage.append(instructions);
  const aim = target.querySelector('.darts-aim');

  function render() {
    aim.style.top = `${phase === 'vertical' ? position : lockedY}%`;
    aim.style.left = `${phase === 'vertical' ? 50 : position}%`;
    instructions.textContent = phase === 'vertical' ? 'Tap the circle to lock its height' : 'Tap the circle again to throw';
    status.textContent = running ? (mode === 'duo' ? `Player ${turn} · Turn ${throws + 1} of 10` : `Round ${throws + 1} of 5 · ${score[0]} points`) : (mode === 'duo' ? 'Finished' : `Finished · ${score[0]} points`);
  }

  function loop(timestamp) {
    const elapsed = timestamp - lastFrame;
    lastFrame = timestamp;
    position += direction * elapsed * .055;
    if (position >= 92) {
      position = 92;
      direction = -1;
    }
    if (position <= 8) {
      position = 8;
      direction = 1;
    }
    render();
    if (running) animationFrame = requestAnimationFrame(loop);
  }

  function reset() {
    turn = 1;
    throws = 0;
    phase = 'vertical';
    position = 8;
    direction = 1;
    lockedY = 50;
    score = [0, 0];
    running = true;
    target.querySelectorAll('.darts-dart').forEach(dart => dart.remove());
    render();
    animationFrame = requestAnimationFrame(loop);
  }

  function throwDart() {
    if (!running) return;
    if (phase === 'vertical') {
      lockedY = position;
      phase = 'horizontal';
      position = 8;
      direction = 1;
      sounds.beep();
      render();
      return;
    }
    const distance = Math.hypot(position - 50, lockedY - 50);
    const angle = (Math.atan2(lockedY - 50, position - 50) + Math.PI * 2.5) % (Math.PI * 2);
    const sector = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5][Math.floor(angle / (Math.PI * 2 / 20))];
    const zone = distance <= 7 ? 'Bull' : distance <= 13 ? 'Outer bull' : distance >= 42 ? 'Double' : distance >= 28 && distance <= 36 ? 'Triple' : 'Single';
    const points = zone === 'Bull' ? 50 : zone === 'Outer bull' ? 25 : zone === 'Double' ? sector * 2 : zone === 'Triple' ? sector * 3 : sector;
    const dart = document.createElement('span');
    dart.className = 'darts-dart dart-thrown';
    dart.style.left = `${position}%`;
    dart.style.top = `${lockedY}%`;
    dart.setAttribute('aria-hidden', 'true');
    target.append(dart);
    score[mode === 'duo' ? turn - 1 : 0] += points;
    if (mode === 'solo') setMessage(`${zone} ${sector} · +${points}`);
    throws++;
    sounds.beep();
    const maxThrows = mode === 'duo' ? 10 : 5;
    if (throws >= maxThrows) {
      running = false;
      status.textContent = mode === 'duo' ? `Finished · ${score[0]} - ${score[1]}` : `Finished · ${score[0]} points`;
      setMessage(mode === 'duo' ? (score[0] === score[1] ? 'Draw' : `Player ${score[0] > score[1] ? 1 : 2} wins`) : `Score · ${score[0]}`);
    } else {
      if (mode === 'duo') turn = turn === 1 ? 2 : 1;
      phase = 'vertical';
      position = 8;
      direction = 1;
    }
    render();
  }
  modeSelect.addEventListener('change', event => {
    mode = event.target.value;
    bestScore.parentElement.style.display = mode === 'duo' ? 'none' : '';
    reset();
  });
  target.addEventListener('click', throwDart);
  render();
  animationFrame = requestAnimationFrame(loop);
  cleanupGame = () => {
    running = false;
    cancelAnimationFrame(animationFrame);
  };
}

function setupBlockBlastClears() {
  const size = 8;
  const colors = ['coral', 'blue', 'lime', 'purple'];
  const shapes = [
    [
      [0, 0]
    ],
    [
      [0, 0],
      [1, 0]
    ],
    [
      [0, 0],
      [0, 1]
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1]
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0]
    ],
    [
      [0, 0],
      [0, 1],
      [0, 2]
    ],
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1]
    ]
  ];
  let grid = Array(size * size).fill('');
  let pieces = [];
  let selected = 0;
  let score = 0;
  let dragging = false;
  let preview = {
    x: 0,
    y: 0,
    valid: true
  };
  const board = document.createElement('div');
  board.className = 'block-board';
  stage.append(board);
  const tray = document.createElement('div');
  tray.className = 'block-tray';
  stage.append(tray);
  const status = document.createElement('p');
  status.className = 'tic-status';
  stage.append(status);

  function refill() {
    pieces = Array.from({
      length: 3
    }, () => shapes[Math.floor(Math.random() * shapes.length)]);
    selected = 0;
  }

  function fits(x, y) {
    return pieces[selected].every(([dx, dy]) => x + dx < size && y + dy < size && !grid[(y + dy) * size + x + dx]);
  }

  function drawPreview() {
    board.querySelectorAll('.preview').forEach(cell => cell.classList.remove('preview', 'invalid'));
    if (!dragging) return;
    pieces[selected].forEach(([dx, dy]) => {
      const cell = board.querySelector(`[data-index="${(preview.y + dy) * size + preview.x + dx}"]`);
      if (cell) {
        cell.classList.add('preview');
        if (!preview.valid) cell.classList.add('invalid');
      }
    });
  }

  function render() {
    board.innerHTML = '';
    grid.forEach((color, index) => {
      const cell = button('', `block-cell ${color}`, () => {});
      cell.dataset.index = index;
      board.append(cell);
    });
    tray.innerHTML = '';
    pieces.forEach((shape, index) => {
      const piece = button('', `block-piece ${index === selected ? 'selected' : ''}`, () => {});
      shape.forEach(([x, y]) => {
        const dot = document.createElement('i');
        dot.className = `piece-${colors[index]}`;
        dot.style.left = `${20 + x * 21}px`;
        dot.style.top = `${14 + y * 21}px`;
        piece.append(dot);
      });
      piece.addEventListener('pointerdown', event => {
        event.preventDefault();
        selected = index;
        dragging = true;
        preview = {
          x: 0,
          y: 0,
          valid: fits(0, 0)
        };
        render();
        drawPreview();
      });
      tray.append(piece);
    });
    drawPreview();
    status.textContent = `${score} points · Drag a piece; completed rows and columns clear`;
  }

  function move(event) {
    if (!dragging) return;
    const rect = board.getBoundingClientRect();
    preview.x = Math.max(0, Math.min(size - 1, Math.floor((event.clientX - rect.left) / (rect.width / size))));
    preview.y = Math.max(0, Math.min(size - 1, Math.floor((event.clientY - rect.top) / (rect.height / size))));
    preview.valid = fits(preview.x, preview.y);
    drawPreview();
  }

  function clearLines() {
    const clear = new Set();
    for (let row = 0; row < size; row++)
      if (grid.slice(row * size, row * size + size).every(Boolean))
        for (let column = 0; column < size; column++) clear.add(row * size + column);
    for (let column = 0; column < size; column++)
      if (Array.from({
          length: size
        }, (_, row) => grid[row * size + column]).every(Boolean))
        for (let row = 0; row < size; row++) clear.add(row * size + column);
    clear.forEach(index => {
      grid[index] = '';
    });
    score += clear.size * 5;
  }

  function end() {
    if (!dragging) return;
    dragging = false;
    if (preview.valid) {
      pieces[selected].forEach(([dx, dy]) => {
        grid[(preview.y + dy) * size + preview.x + dx] = colors[selected];
      });
      score += pieces[selected].length * 10;
      clearLines();
      pieces.splice(selected, 1);
      if (!pieces.length) refill();
      saveBest('blockblast', score);
    }
    render();
  }
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);
  refill();
  render();
  cleanupGame = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', end);
  };
}

function setupMemoryColors() {
  const palettes = {
    regular: {
      coral: '#ed7957',
      blue: '#9fc6d3',
      lime: '#f3c85b',
      purple: '#b2a7d7',
      orange: '#e5a15f',
      teal: '#63aaa7',
      pink: '#d99ab0',
      slate: '#879ca6',
      red: '#cf5d5d',
      gold: '#d9ad45',
      aqua: '#72c2c2',
      violet: '#8f83c4',
      green: '#86b477',
      navy: '#52718c',
      rose: '#c47d9c',
      mint: '#9acbb0',
      amber: '#df8d4e',
      indigo: '#6573b5'
    },
    halloween: {
      coral: '#ef7624',
      blue: '#aa7abc',
      lime: '#bfd158',
      purple: '#6a3678',
      orange: '#e58c27',
      teal: '#78984a',
      pink: '#c95b53',
      slate: '#58365f',
      red: '#9b3b34',
      gold: '#d5a72c',
      aqua: '#8eaa4f',
      violet: '#80529a',
      green: '#78984a',
      navy: '#43274b',
      rose: '#ad4361',
      mint: '#9bad4b',
      amber: '#ef7624',
      indigo: '#633449'
    }
  };
  let palette = document.body.classList.contains('halloween-mode') ? palettes.halloween : palettes.regular;
  let size = 4;
  let mode = 'solo';
  let cards = [];
  let open = [];
  let matched = [];
  let moves = 0;
  let currentPlayer = 1;
  let scores = [0, 0];
  let locked = false;
  const controls = document.createElement('div');
  controls.className = 'memory-options';
  controls.innerHTML = '<label>Grid <select class="memory-size"><option value="4">4 × 4</option><option value="6">6 × 6</option></select></label><label>Mode <select class="memory-mode"><option value="solo">Solo</option><option value="duo">Two player</option></select></label>';
  stage.append(controls);
  const board = document.createElement('div');
  board.className = 'memory-board';
  stage.append(board);
  const status = document.createElement('p');
  status.className = 'tic-status';
  stage.append(status);
  const sizeSelect = controls.querySelector('.memory-size');
  const modeSelect = controls.querySelector('.memory-mode');

  function newBoard() {
    size = Number(sizeSelect.value);
    mode = modeSelect.value;
    const names = Object.keys(palette).slice(0, (size * size) / 2);
    cards = names.flatMap(color => [color, color]).sort(() => Math.random() - .5);
    open = [];
    matched = [];
    moves = 0;
    currentPlayer = 1;
    scores = [0, 0];
    locked = false;
    board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    render();
  }

  function render() {
    board.innerHTML = '';
    cards.forEach((color, index) => {
      const visible = matched.includes(index) || open.includes(index);
      const card = button(visible ? '' : '?', `memory-card ${visible ? 'memory-visible' : 'memory-hidden'} ${matched.includes(index) ? 'matched' : ''}`, () => reveal(index));
      if (visible) card.style.backgroundColor = palette[color];
      card.setAttribute('aria-label', visible ? `${color} card` : 'Hidden color card');
      board.append(card);
    });
    status.textContent = mode === 'duo' ? `Player ${currentPlayer} · ${scores[0]} - ${scores[1]} · ${matched.length / 2} of ${cards.length / 2} pairs` : `${matched.length / 2} of ${cards.length / 2} pairs · ${moves} moves`;
  }

  function reveal(index) {
    if (locked || matched.includes(index) || open.includes(index)) return;
    open.push(index);
    render();
    if (open.length !== 2) return;
    moves++;
    locked = true;
    const [first, second] = open;
    if (cards[first] === cards[second]) {
      matched.push(first, second);
      open = [];
      if (mode === 'duo') scores[currentPlayer - 1]++;
      sounds.beep();
      locked = false;
      render();
      if (matched.length === cards.length) setMessage(mode === 'duo' ? (scores[0] === scores[1] ? 'Draw' : `Player ${scores[0] > scores[1] ? 1 : 2} wins`) : `Complete · ${moves} moves`);
    } else setTimeout(() => {
      open = [];
      if (mode === 'duo') currentPlayer = currentPlayer === 1 ? 2 : 1;
      locked = false;
      render();
    }, 650);
  }
  const updatePalette = () => {
    palette = document.body.classList.contains('halloween-mode') ? palettes.halloween : palettes.regular;
    render();
  };
  sizeSelect.addEventListener('change', newBoard);
  modeSelect.addEventListener('change', newBoard);
  document.addEventListener('themechange', updatePalette);
  newBoard();
  cleanupGame = () => document.removeEventListener('themechange', updatePalette);
}

function setupMinesweeperDifficulty() {
  const size = 9;
  const levels = {
    easy: 10,
    medium: 18,
    hard: 28
  };
  let difficulty = 'medium';
  let mineCount = levels[difficulty];
  let mines = new Set();
  let revealed = new Set();
  let flagged = new Set();
  let flagMode = false;
  let finished = false;
  let firstClick = true;
  const controls = document.createElement('div');
  controls.className = 'mine-controls';
  controls.innerHTML = '<label class="mine-level">Difficulty <select><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select></label>';
  const flagButton = button('Flag mode: off', '', () => {
    flagMode = !flagMode;
    flagButton.textContent = `Flag mode: ${flagMode ? 'on' : 'off'}`;
    flagButton.classList.toggle('active', flagMode);
  });
  const resetButton = button('New field', '', reset);
  controls.append(flagButton, resetButton);
  stage.append(controls);
  const board = document.createElement('div');
  board.className = 'mine-board';
  stage.append(board);
  const status = document.createElement('p');
  status.className = 'tic-status';
  stage.append(status);
  const levelSelect = controls.querySelector('select');

  function neighbors(index) {
    const x = index % size;
    const y = Math.floor(index / size);
    const output = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 0 && nx < size && ny >= 0 && ny < size) output.push(ny * size + nx);
      }
    return output;
  }

  function count(index) {
    return neighbors(index).filter(cell => mines.has(cell)).length;
  }

  function generate(safe) {
    const blocked = new Set([safe, ...neighbors(safe)]);
    const candidates = Array.from({
      length: size * size
    }, (_, index) => index).filter(index => !blocked.has(index)).sort(() => Math.random() - .5);
    const chosen = [];
    for (const candidate of candidates) {
      if (chosen.length >= mineCount) break;
      const spaced = chosen.every(mine => Math.abs((mine % size) - (candidate % size)) > 1 || Math.abs(Math.floor(mine / size) - Math.floor(candidate / size)) > 1);
      if (spaced || chosen.length < Math.floor(mineCount / 2)) chosen.push(candidate);
    }
    mines = new Set(chosen);
    firstClick = false;
  }

  function reset() {
    mineCount = levels[difficulty];
    mines = new Set();
    revealed = new Set();
    flagged = new Set();
    finished = false;
    firstClick = true;
    render();
  }

  function flag(index) {
    if (finished || revealed.has(index)) return;
    flagged.has(index) ? flagged.delete(index) : flagged.add(index);
    render();
  }

  function reveal(start) {
    if (finished || flagged.has(start)) return;
    if (firstClick) generate(start);
    if (mines.has(start)) {
      finished = true;
      mines.forEach(mine => revealed.add(mine));
      setMessage('Mine hit');
      render();
      return;
    }
    const pending = [start];
    while (pending.length) {
      const current = pending.pop();
      if (revealed.has(current) || flagged.has(current) || mines.has(current)) continue;
      revealed.add(current);
      if (!count(current)) neighbors(current).forEach(next => pending.push(next));
    }
    if (revealed.size >= size * size - mineCount) {
      finished = true;
      setMessage('Field cleared');
    }
    render();
  }

  function render() {
    board.innerHTML = '';
    for (let index = 0; index < size * size; index++) {
      const visible = revealed.has(index) || (finished && mines.has(index));
      const value = mines.has(index) ? '*' : count(index) || '';
      const cell = button(flagged.has(index) ? '⚑' : visible ? value : '', `mine-cell ${visible ? 'revealed' : 'covered'} ${visible && mines.has(index) ? 'mine' : ''}`, () => flagMode ? flag(index) : reveal(index));
      let pressTimer;
      cell.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => flag(index), 500);
      });
      cell.addEventListener('pointerup', () => clearTimeout(pressTimer));
      cell.addEventListener('pointerleave', () => clearTimeout(pressTimer));
      cell.addEventListener('contextmenu', event => {
        event.preventDefault();
        flag(index);
      });
      board.append(cell);
    }
    status.textContent = finished ? 'Field complete · New field to play again' : `${difficulty[0].toUpperCase() + difficulty.slice(1)} · ${mineCount} mines · ${flagged.size} flags`;
  }
  levelSelect.addEventListener('change', event => {
    difficulty = event.target.value;
    reset();
  });
  reset();
  cleanupGame = () => {};
}

function setupPong() {
  if (!window.Phaser) {
    setMessage('Pong could not load. Check your internet connection and try again.');
    return;
  }

  const width = Math.max(280, Math.min(stage.clientWidth || 400, 420));
  const height = Math.round(width * .72);
  const paddleWidth = 88;
  const paddleHeight = 12;
  let paddle;
  let ball;
  let scoreLabel;
  let livesLabel;
  let score = 0;
  let lives = 3;
  let paddleTargetX = width / 2;
  let canBounce = true;
  let finished = false;

  function bounce() {
    if (finished || !canBounce || ball.body.velocity.y <= 0) return;
    canBounce = false;
    const offset = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddleWidth / 2)));
    const speed = Math.min(310, ball.body.speed + 3);
    const angle = offset * Math.PI / 3;
    ball.body.reset(ball.x, paddle.y - paddleHeight / 2 - 10);
    ball.body.setVelocity(Math.sin(angle) * speed, -Math.cos(angle) * speed);
    score++;
    scoreLabel.setText(String(score));
    saveBest('pong', score);
    setMessage(`${score} bounces · ${lives} lives left`);
    sounds.beep();
  }

  function loseLife() {
    if (finished) return;
    lives--;
    livesLabel.setText(`LIVES ${lives}`);
    if (lives === 0) {
      finished = true;
      setMessage(`Out of lives · ${score} bounces · use Restart to try again`);
      return;
    }
    setMessage(`Missed · ${lives} lives left · ${score} bounces`);
    ball.body.reset(width / 2, height * .38);
    ball.body.setVelocity(45, 145);
    paddleTargetX = width / 2;
    canBounce = true;
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'pong-canvas';
  canvas.setAttribute('aria-label', 'Pong bounce challenge. Move the paddle with your pointer, A and D, or the arrow keys.');
  canvas.tabIndex = 0;
  stage.append(canvas);

  const pong = new window.Phaser.Game({
    type: window.Phaser.CANVAS,
    canvas,
    width,
    height,
    backgroundColor: '#202624',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: {
          y: 0
        }
      }
    },
    scene: {
      create() {
        for (let x = 18; x < width; x += 26) {
          this.add.rectangle(x, 12, 12, 2, 0x71817b, .75);
        }
        paddle = this.add.rectangle(width / 2, height - 28, paddleWidth, paddleHeight, 0xf3c85b);
        this.physics.add.existing(paddle);
        paddle.body.setAllowGravity(false);
        paddle.body.setImmovable(true);
        ball = this.add.circle(width / 2, height * .38, 9, 0xf7f3eb);
        this.physics.add.existing(ball);
        ball.body.setCircle(9);
        ball.body.setAllowGravity(false);
        ball.body.setBounce(1, 1);
        scoreLabel = this.add.text(width / 2, 20, '0', {
          color: '#f7f3eb',
          fontFamily: 'monospace',
          fontSize: '24px',
          fontStyle: 'bold'
        }).setOrigin(.5, 0);
        livesLabel = this.add.text(width - 14, 22, 'LIVES 3', {
          color: '#f7f3eb',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontStyle: 'bold'
        }).setOrigin(1, 0);
        const keys = this.input.keyboard.addKeys('A,D');
        const cursors = this.input.keyboard.createCursorKeys();
        this.input.on('pointermove', pointer => {
          paddleTargetX = pointer.x;
        });
        this.input.on('pointerdown', pointer => {
          paddleTargetX = pointer.x;
        });
        this.events.on('update', (time, delta) => {
          if (finished) return;
          const seconds = delta / 1000;
          if (keys.A.isDown || cursors.left.isDown) paddleTargetX = paddle.x - 320 * seconds;
          else if (keys.D.isDown || cursors.right.isDown) paddleTargetX = paddle.x + 320 * seconds;
          paddle.x = Math.max(paddleWidth / 2 + 8, Math.min(width - paddleWidth / 2 - 8, paddleTargetX));
          paddle.body.updateFromGameObject();
          if (ball.x < 9 && ball.body.velocity.x < 0) {
            const velocityY = ball.body.velocity.y;
            ball.body.reset(9, ball.y);
            ball.body.setVelocity(Math.abs(ball.body.velocity.x), velocityY);
          } else if (ball.x > width - 9 && ball.body.velocity.x > 0) {
            const velocityY = ball.body.velocity.y;
            ball.body.reset(width - 9, ball.y);
            ball.body.setVelocity(-Math.abs(ball.body.velocity.x), velocityY);
          }
          if (ball.y < 9 && ball.body.velocity.y < 0) {
            const velocityX = ball.body.velocity.x;
            ball.body.reset(ball.x, 9);
            ball.body.setVelocity(velocityX, Math.abs(ball.body.velocity.y));
          }
          if (!canBounce && ball.body.velocity.y < 0 && ball.y < paddle.y - paddleHeight - 12) canBounce = true;
          const paddleTop = paddle.y - paddleHeight / 2;
          const paddleLeft = paddle.x - paddleWidth / 2;
          const paddleRight = paddle.x + paddleWidth / 2;
          if (ball.body.velocity.y > 0 && ball.y + 9 >= paddleTop && ball.x + 9 >= paddleLeft && ball.x - 9 <= paddleRight) bounce();
          if (ball.y > height + 12) {
            loseLife();
            if (finished) this.physics.pause();
          }
        });
        ball.body.setVelocity(45, 145);
        setMessage('0 bounces · 3 lives · move the paddle with your pointer, A/D, or ←/→.');
      }
    }
  });

  cleanupGame = () => pong.destroy(true);
}

function setupChess() {
  if (typeof Chess !== 'function') {
    setMessage('Chess could not load. Check your internet connection and try again.');
    return;
  }

  const game = new Chess();
  const pieces = {
    w: {
      k: '♔',
      q: '♕',
      r: '♖',
      b: '♗',
      n: '♘',
      p: '♙'
    },
    b: {
      k: '♚',
      q: '♛',
      r: '♜',
      b: '♝',
      n: '♞',
      p: '♟'
    }
  };
  const files = 'abcdefgh';
  let selected = null;
  const board = document.createElement('div');
  board.className = 'chess-board';
  board.setAttribute('role', 'group');
  board.setAttribute('aria-label', 'Chess board');
  stage.append(board);
  const status = document.createElement('p');
  status.className = 'tic-status';
  stage.append(status);
  const instructions = document.createElement('p');
  instructions.className = 'instructions';
  instructions.textContent = 'Select a piece, then a highlighted square. Pawns promote to queens.';
  stage.append(instructions);

  function gameStatus() {
    if (game.in_checkmate()) return `${game.turn() === 'w' ? 'Black' : 'White'} wins by checkmate`;
    if (game.in_stalemate()) return 'Draw by stalemate';
    if (game.in_draw()) return 'Draw';
    const current = `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
    return game.in_check() ? `${current} · check` : current;
  }

  function render() {
    const legalMoves = selected ? game.moves({
      square: selected,
      verbose: true
    }) : [];
    board.replaceChildren();
    game.board().forEach((rank, row) => rank.forEach((piece, column) => {
      const square = `${files[column]}${8 - row}`;
      const destination = legalMoves.find(move => move.to === square);
      const squareButton = button(piece ? pieces[piece.color][piece.type] : '', `chess-square ${(row + column) % 2 ? 'dark' : 'light'}`, () => selectSquare(square));
      squareButton.dataset.square = square;
      squareButton.setAttribute('aria-label', piece ? `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type} on ${square}` : `Empty ${square}`);
      if (piece) squareButton.classList.add(piece.color === 'w' ? 'white-piece' : 'black-piece');
      if (square === selected) squareButton.classList.add('selected');
      if (destination) squareButton.classList.add(destination.flags.includes('c') || destination.flags.includes('e') ? 'capture-target' : 'legal-target');
      board.append(squareButton);
    }));
    status.textContent = gameStatus();
  }

  function selectSquare(square) {
    if (game.game_over()) return;
    const piece = game.get(square);
    if (selected) {
      const isLegalDestination = game.moves({
        square: selected,
        verbose: true
      }).some(move => move.to === square);
      if (isLegalDestination) {
        game.move({
          from: selected,
          to: square,
          promotion: 'q'
        });
        selected = null;
        render();
        return;
      }
    }
    selected = piece && piece.color === game.turn() ? square : null;
    render();
  }

  render();
}

const overlay = document.querySelector('#game-overlay');
const stage = document.querySelector('#game-stage');
const message = document.querySelector('#game-message');
const title = document.querySelector('#modal-title');
const eyebrow = document.querySelector('#modal-eyebrow');
const bestScore = document.querySelector('#best-score');
let activeGame = null;
let cleanupGame = () => {};
const sounds = {
  enabled: false,
  beep() {
    if (!this.enabled) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    oscillator.connect(context.destination);
    oscillator.frequency.value = 420;
    oscillator.start();
    oscillator.stop(context.currentTime + .06);
  }
};

document.querySelectorAll('[data-game]').forEach(card => {
  card.addEventListener('click', () => openGame(card.dataset.game));
});
document.querySelector('#close-game').addEventListener('click', closeGame);
document.querySelector('#restart-game').addEventListener('click', () => activeGame && openGame(activeGame));
document.querySelector('#halloween-toggle').addEventListener('click', event => {
  const enabled = document.body.classList.toggle('halloween-mode');
  event.currentTarget.setAttribute('aria-pressed', enabled);
  document.querySelector('meta[name="theme-color"]').content = enabled ? '#fff3e3' : '#f5f3ee';
  document.dispatchEvent(new Event('themechange'));
});
document.querySelector('#sound-toggle').addEventListener('click', event => {
  sounds.enabled = !sounds.enabled;
  event.currentTarget.setAttribute('aria-pressed', sounds.enabled);
  event.currentTarget.textContent = sounds.enabled ? '♫' : '♪';
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !overlay.hidden) closeGame();
});

const ownerOverlay = document.querySelector('#owner-overlay');
const ownerOpen = document.querySelector('#owner-open');
const ownerUsername = document.querySelector('#owner-username');
const ownerPassword = document.querySelector('#owner-password');
const ownerLoginStatus = document.querySelector('#owner-login-status');
const ownerSessionKey = 'absolutely-school-work-owner-session';

function updateOwnerAccessVisibility() {
  const chessOnlyView = window.location.hash === '#work';
  document.body.classList.toggle('chess-only-view', chessOnlyView);
  ownerOpen.hidden = chessOnlyView;
  if (ownerOpen.hidden && !ownerOverlay.hidden) {
    ownerOverlay.hidden = true;
    document.body.style.overflow = overlay.hidden ? '' : 'hidden';
  }
}
updateOwnerAccessVisibility();
window.addEventListener('hashchange', updateOwnerAccessVisibility);

function closeOwnerLogin() {
  ownerOverlay.hidden = true;
  document.body.style.overflow = overlay.hidden ? '' : 'hidden';
  ownerOpen.focus();
}
ownerOpen.addEventListener('click', () => {
  ownerOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  ownerUsername.focus();
});
document.querySelector('#owner-close').addEventListener('click', closeOwnerLogin);
ownerOverlay.addEventListener('click', event => {
  if (event.target === ownerOverlay) closeOwnerLogin();
});
document.querySelector('#owner-login-form').addEventListener('submit', event => {
  event.preventDefault();
  if (ownerUsername.value === 'Owner63' && ownerPassword.value === 'Op3nhacks') {
    sessionStorage.setItem(ownerSessionKey, 'active');
    window.location.href = 'owner.html';
    return;
  }
  ownerLoginStatus.textContent = 'Incorrect username or password.';
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !ownerOverlay.hidden) closeOwnerLogin();
});

function openGame(game) {
  cleanupGame();
  activeGame = game;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  stage.innerHTML = '';
  message.textContent = '';

  const details = {
    snake: ['Snake', '01'],
    merge: ['2048', '02'],
    tictactoe: ['Tic-Tac-Toe', '03'],
    connectfour: ['Connect Four', '04'],
    darts: ['Darts', '05'],
    reaction: ['Reaction', '06'],
    memory: ['Memory', '07'],
    blockblast: ['Block Blast', '08'],
    minesweeper: ['Minesweeper', '09'],
    clicker: ['Clicker', '10'],
    dash: ['Dash', '11'],
    checkers: ['Checkers', '12'],
    pong: ['Pong', '13'],
    chess: ['Chess', '14']
  } [game];
  const gameSetup = {
    snake: setupSnake,
    merge: setupMerge,
    tictactoe: setupTicTacToe,
    connectfour: setupConnectFour,
    darts: setupDartsPlayers,
    reaction: setupReaction,
    memory: setupMemoryColors,
    blockblast: setupBlockBlastClears,
    minesweeper: setupMinesweeperDifficulty,
    clicker: setupClicker,
    dash: setupDash,
    checkers: setupCheckers,
    pong: setupPong,
    chess: setupChess
  } [game];

  title.textContent = details[0];
  eyebrow.textContent = details[1];
  bestScore.parentElement.style.display = ['memory', 'checkers', 'chess'].includes(game) ? 'none' : '';
  bestScore.textContent = localStorage.getItem(`arcade-${game}`) || 0;
  gameSetup();
}

function closeGame() {
  cleanupGame();
  overlay.hidden = true;
  document.body.style.overflow = '';
  activeGame = null;
}

function saveBest(game, score) {
  const key = `arcade-${game}`;
  const old = Number(localStorage.getItem(key) || 0);
  if (score > old) {
    localStorage.setItem(key, score);
    bestScore.textContent = score;
  }
}

function setMessage(text) {
  message.textContent = text;
}

function button(text, className, onClick) {
  const element = document.createElement('button');
  element.className = `control-button ${className || ''}`;
  element.type = 'button';
  element.textContent = text;
  element.addEventListener('click', onClick);
  return element;
}

function setupClicker() {
  const storageKey = 'arcade-clicker-state';
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch {}
  let cookies = Number.isFinite(saved.cookies) ? saved.cookies : 0;
  let totalClicks = Number.isFinite(saved.totalClicks) ? saved.totalClicks : 0;
  let clickLevel = Number.isFinite(saved.clickLevel) ? saved.clickLevel : 0;
  let autoLevel = Number.isFinite(saved.autoLevel) ? saved.autoLevel : 0;
  let whiskLevel = Number.isFinite(saved.whiskLevel) ? saved.whiskLevel : 0;
  let ovenLevel = Number.isFinite(saved.ovenLevel) ? saved.ovenLevel : 0;
  let bakeryLevel = Number.isFinite(saved.bakeryLevel) ? saved.bakeryLevel : 0;
  let cookiesBaked = Number.isFinite(saved.cookiesBaked) ? saved.cookiesBaked : cookies;
  let clickPower = 1 + clickLevel + whiskLevel * 5;
  let cookiesPerSecond = autoLevel + ovenLevel * 5 + bakeryLevel * 25;
  const game = document.createElement('div');
  game.className = 'clicker-game';
  game.innerHTML = '<div class="clicker-stats"><div><span>COOKIES</span><strong class="clicker-count">0</strong></div><div><span>PER CLICK</span><strong class="clicker-power">1</strong></div><div><span>PER SECOND</span><strong class="clicker-rate">0</strong></div></div><button class="clicker-target" type="button" aria-label="Click for cookies"><span aria-hidden="true">🍪</span><small>Click me</small></button><section class="clicker-shop" aria-label="Upgrades"><h3>Upgrades</h3><button class="clicker-upgrade" data-upgrade="click" type="button"><span class="upgrade-symbol" aria-hidden="true">＋</span><span class="upgrade-copy"><strong>Better recipe</strong><small>+1 cookie per click · owned <b class="click-level">0</b></small></span><span class="upgrade-cost"><b class="click-cost">15</b><small>cookies</small></span></button><button class="clicker-upgrade" data-upgrade="auto" type="button"><span class="upgrade-symbol" aria-hidden="true">♧</span><span class="upgrade-copy"><strong>Cookie helper</strong><small>+1 cookie per second · owned <b class="auto-level">0</b></small></span><span class="upgrade-cost"><b class="auto-cost">50</b><small>cookies</small></span></button></section><p class="clicker-total" aria-live="polite">Total clicks: <span>0</span></p>';
  stage.append(game);
  game.querySelector('.clicker-shop').insertAdjacentHTML('beforeend', '<button class="clicker-upgrade" data-upgrade="whisk" type="button"><span class="upgrade-symbol" aria-hidden="true">✦</span><span class="upgrade-copy"><strong>Power whisk</strong><small>+5 cookies per click · owned <b class="whisk-level">0</b></small></span><span class="upgrade-cost"><b class="whisk-cost">100</b><small>cookies</small></span></button><button class="clicker-upgrade" data-upgrade="oven" type="button"><span class="upgrade-symbol" aria-hidden="true">♨</span><span class="upgrade-copy"><strong>Bakery oven</strong><small>+5 cookies per second · owned <b class="oven-level">0</b></small></span><span class="upgrade-cost"><b class="oven-cost">250</b><small>cookies</small></span></button><button class="clicker-upgrade" data-upgrade="bakery" type="button"><span class="upgrade-symbol" aria-hidden="true">⌂</span><span class="upgrade-copy"><strong>Cookie factory</strong><small>+25 cookies per second · owned <b class="bakery-level">0</b></small></span><span class="upgrade-cost"><b class="bakery-cost">1000</b><small>cookies</small></span></button>');
  game.insertAdjacentHTML('beforeend', '<section class="clicker-achievements" aria-label="Milestones"><h3>Milestones</h3><div class="achievement-list"><div class="clicker-achievement" data-milestone="clicks"><b>First batch</b><span>Click 10 times</span></div><div class="clicker-achievement" data-milestone="baked"><b>Cookie jar</b><span>Bake 100 cookies</span></div><div class="clicker-achievement" data-milestone="factory"><b>Night shift</b><span>Reach 10 cookies per second</span></div></div></section>');
  const count = game.querySelector('.clicker-count');
  const power = game.querySelector('.clicker-power');
  const rate = game.querySelector('.clicker-rate');
  const clickUpgrade = game.querySelector('[data-upgrade="click"]');
  const autoUpgrade = game.querySelector('[data-upgrade="auto"]');
  const whiskUpgrade = game.querySelector('[data-upgrade="whisk"]');
  const ovenUpgrade = game.querySelector('[data-upgrade="oven"]');
  const bakeryUpgrade = game.querySelector('[data-upgrade="bakery"]');
  const clickCost = game.querySelector('.click-cost');
  const autoCost = game.querySelector('.auto-cost');
  const whiskCost = game.querySelector('.whisk-cost');
  const ovenCost = game.querySelector('.oven-cost');
  const bakeryCost = game.querySelector('.bakery-cost');
  const clickCostAt = () => Math.ceil(15 * 1.7 ** clickLevel);
  const autoCostAt = () => Math.ceil(50 * 1.8 ** autoLevel);
  const whiskCostAt = () => Math.ceil(100 * 1.8 ** whiskLevel);
  const ovenCostAt = () => Math.ceil(250 * 1.9 ** ovenLevel);
  const bakeryCostAt = () => Math.ceil(1000 * 2 ** bakeryLevel);

  function persist() {
    localStorage.setItem(storageKey, JSON.stringify({
      cookies,
      totalClicks,
      clickLevel,
      autoLevel,
      whiskLevel,
      ovenLevel,
      bakeryLevel,
      cookiesBaked
    }));
    saveBest('clicker', Math.floor(cookies));
  }

  function render() {
    count.textContent = Math.floor(cookies).toLocaleString();
    power.textContent = clickPower.toLocaleString();
    rate.textContent = cookiesPerSecond.toLocaleString();
    game.querySelector('.click-level').textContent = clickLevel;
    game.querySelector('.auto-level').textContent = autoLevel;
    game.querySelector('.whisk-level').textContent = whiskLevel;
    game.querySelector('.oven-level').textContent = ovenLevel;
    game.querySelector('.bakery-level').textContent = bakeryLevel;
    clickCost.textContent = clickCostAt().toLocaleString();
    autoCost.textContent = autoCostAt().toLocaleString();
    whiskCost.textContent = whiskCostAt().toLocaleString();
    ovenCost.textContent = ovenCostAt().toLocaleString();
    bakeryCost.textContent = bakeryCostAt().toLocaleString();
    clickUpgrade.disabled = cookies < clickCostAt();
    autoUpgrade.disabled = cookies < autoCostAt();
    whiskUpgrade.disabled = cookies < whiskCostAt();
    ovenUpgrade.disabled = cookies < ovenCostAt();
    bakeryUpgrade.disabled = cookies < bakeryCostAt();
    game.querySelector('.clicker-total span').textContent = totalClicks.toLocaleString();
    game.querySelector('[data-milestone="clicks"]').classList.toggle('earned', totalClicks >= 10);
    game.querySelector('[data-milestone="baked"]').classList.toggle('earned', cookiesBaked >= 100);
    game.querySelector('[data-milestone="factory"]').classList.toggle('earned', cookiesPerSecond >= 10);
  }
  game.querySelector('.clicker-target').addEventListener('click', () => {
    cookies += clickPower;
    cookiesBaked += clickPower;
    totalClicks++;
    render();
    persist();
  });
  clickUpgrade.addEventListener('click', () => {
    const cost = clickCostAt();
    if (cookies < cost) return;
    cookies -= cost;
    clickLevel++;
    clickPower++;
    render();
    persist();
  });
  autoUpgrade.addEventListener('click', () => {
    const cost = autoCostAt();
    if (cookies < cost) return;
    cookies -= cost;
    autoLevel++;
    cookiesPerSecond++;
    render();
    persist();
  });
  whiskUpgrade.addEventListener('click', () => {
    const cost = whiskCostAt();
    if (cookies < cost) return;
    cookies -= cost;
    whiskLevel++;
    clickPower += 5;
    render();
    persist();
  });
  ovenUpgrade.addEventListener('click', () => {
    const cost = ovenCostAt();
    if (cookies < cost) return;
    cookies -= cost;
    ovenLevel++;
    cookiesPerSecond += 5;
    render();
    persist();
  });
  bakeryUpgrade.addEventListener('click', () => {
    const cost = bakeryCostAt();
    if (cookies < cost) return;
    cookies -= cost;
    bakeryLevel++;
    cookiesPerSecond += 25;
    render();
    persist();
  });
  render();
  const timer = window.setInterval(() => {
    if (!cookiesPerSecond) return;
    cookies += cookiesPerSecond;
    cookiesBaked += cookiesPerSecond;
    render();
    persist();
  }, 1000);
  cleanupGame = () => window.clearInterval(timer);
}

function setupDash() {
  const canvas = document.createElement('canvas');
  canvas.className = 'dash-canvas';
  canvas.setAttribute('aria-label', 'Dash endless runner game');
  canvas.tabIndex = 0;
  stage.append(canvas);
  const instructions = document.createElement('p');
  instructions.className = 'instructions dash-instructions';
  instructions.textContent = 'Press Space or ↑, or tap to jump';
  stage.append(instructions);

  const context = canvas.getContext('2d');
  const runner = {
    x: 48,
    y: 0,
    width: 30,
    height: 38,
    velocityY: 0,
    grounded: true
  };
  let obstacles = [];
  let clouds = [{
    x: 95,
    y: 28,
    size: 18
  }, {
    x: 255,
    y: 48,
    size: 13
  }, {
    x: 370,
    y: 24,
    size: 16
  }];
  let score = 0;
  let speed = 250;
  let spawnIn = 1;
  let lastTime = 0;
  let animationFrame = 0;
  let running = true;
  let palette = {};

  function readPalette() {
    const styles = getComputedStyle(document.body);
    palette = {
      paper: styles.getPropertyValue('--paper').trim() || '#f7f3eb',
      ink: styles.getPropertyValue('--ink').trim() || '#202624',
      coral: styles.getPropertyValue('--coral').trim() || '#ed7957',
      purple: styles.getPropertyValue('--purple').trim() || '#b2a7d7',
      lime: styles.getPropertyValue('--lime').trim() || '#f3c85b',
      muted: styles.getPropertyValue('--muted').trim() || '#6d726e'
    };
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    runner.y = Math.min(runner.y, groundY() - runner.height);
    draw();
  }

  function groundY() {
    return canvas.clientHeight - 25;
  }

  function jump() {
    if (!running) {
      reset();
      return;
    }
    if (!runner.grounded) return;
    runner.velocityY = -520;
    runner.grounded = false;
  }

  function reset() {
    obstacles = [];
    score = 0;
    speed = 250;
    spawnIn = .9;
    runner.y = groundY() - runner.height;
    runner.velocityY = 0;
    runner.grounded = true;
    running = true;
    lastTime = 0;
    instructions.textContent = 'Press Space or ↑, or tap to jump';
    message.textContent = '';
    animationFrame = requestAnimationFrame(loop);
  }

  function collide(obstacle) {
    const inset = 5;
    return runner.x + inset < obstacle.x + obstacle.width && runner.x + runner.width - inset > obstacle.x && runner.y + inset < groundY() && runner.y + runner.height > groundY() - obstacle.height && runner.y + runner.height - inset > groundY() - obstacle.height;
  }

  function drawRunner() {
    const ground = groundY();
    const y = runner.y;
    context.fillStyle = palette.ink;
    context.beginPath();
    context.roundRect(runner.x, y + 9, runner.width, runner.height - 9, 9);
    context.fill();
    context.beginPath();
    context.moveTo(runner.x + 5, y + 12);
    context.lineTo(runner.x + 8, y);
    context.lineTo(runner.x + 15, y + 10);
    context.lineTo(runner.x + 21, y);
    context.lineTo(runner.x + 25, y + 13);
    context.closePath();
    context.fill();
    context.fillStyle = palette.paper;
    context.beginPath();
    context.arc(runner.x + 21, y + 18, 2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = palette.coral;
    context.beginPath();
    context.ellipse(runner.x + 4, y + 27, 7, 4, -.35, 0, Math.PI * 2);
    context.fill();
    if (runner.grounded && running) {
      const stride = Math.sin(score * .05) * 3;
      context.strokeStyle = palette.ink;
      context.lineWidth = 4;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(runner.x + 9, ground - 2);
      context.lineTo(runner.x + 8 + stride, ground + 1);
      context.moveTo(runner.x + 22, ground - 2);
      context.lineTo(runner.x + 23 - stride, ground + 1);
      context.stroke();
    }
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const ground = groundY();
    context.clearRect(0, 0, width, height);
    context.fillStyle = palette.paper;
    context.fillRect(0, 0, width, height);
    context.fillStyle = palette.muted;
    clouds.forEach(cloud => {
      context.globalAlpha = .35;
      context.beginPath();
      context.arc(cloud.x, cloud.y, cloud.size, Math.PI, 0);
      context.arc(cloud.x + cloud.size, cloud.y, cloud.size * .72, Math.PI, 0);
      context.fill();
      context.globalAlpha = 1;
    });
    context.strokeStyle = palette.ink;
    context.globalAlpha = .55;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, ground + 3);
    context.lineTo(width, ground + 3);
    context.stroke();
    context.globalAlpha = 1;
    context.fillStyle = palette.muted;
    for (let index = 0; index < 5; index++) {
      const x = (index * 97 - (score * 2) % 97 + width) % width;
      context.fillRect(x, ground + 11 + (index % 2) * 3, 3 + index % 3, 1.5);
    }
    obstacles.forEach(obstacle => {
      context.fillStyle = palette.purple;
      context.beginPath();
      context.roundRect(obstacle.x, ground - obstacle.height, obstacle.width, obstacle.height, 5);
      context.fill();
      context.fillStyle = palette.ink;
      context.fillRect(obstacle.x + 4, ground - obstacle.height + 7, 3, 4);
    });
    drawRunner();
    context.fillStyle = palette.ink;
    context.textAlign = 'right';
    context.font = '700 14px monospace';
    context.fillText(`${Math.floor(score).toString().padStart(5, '0')}`, width - 14, 24);
    if (!running) {
      context.fillStyle = palette.ink;
      context.textAlign = 'center';
      context.font = '700 18px sans-serif';
      context.fillText('RUN OVER', width / 2, height / 2 - 3);
      context.font = '12px sans-serif';
      context.fillText('Tap or press Space to try again', width / 2, height / 2 + 18);
    }
  }

  function loop(timestamp) {
    if (!running) {
      draw();
      return;
    }
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, .04) : 0;
    lastTime = timestamp;
    const ground = groundY();
    score += delta * speed / 10;
    speed = Math.min(520, speed + delta * 5);
    runner.velocityY += 1450 * delta;
    runner.y += runner.velocityY * delta;
    if (runner.y >= ground - runner.height) {
      runner.y = ground - runner.height;
      runner.velocityY = 0;
      runner.grounded = true;
    }
    obstacles.forEach(obstacle => {
      obstacle.x -= speed * delta;
    });
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > -5);
    clouds.forEach(cloud => {
      cloud.x -= speed * delta * .12;
      if (cloud.x < -cloud.size * 2) cloud.x = canvas.clientWidth + cloud.size;
    });
    spawnIn -= delta;
    if (spawnIn <= 0) {
      const height = 21 + Math.random() * 24;
      obstacles.push({
        x: canvas.clientWidth + 12,
        width: 17 + Math.random() * 15,
        height
      });
      spawnIn = .85 + Math.random() * .65 + Math.max(0, 300 - speed) / 450;
    }
    if (obstacles.some(collide)) {
      running = false;
      instructions.textContent = 'Tap the runner or press Space to restart';
      setMessage(`Run over · ${Math.floor(score)} points`);
      saveBest('dash', Math.floor(score));
      draw();
      return;
    }
    draw();
    animationFrame = requestAnimationFrame(loop);
  }

  const keyHandler = event => {
    if ((event.code === 'Space' || event.code === 'ArrowUp') && activeGame === 'dash' && !overlay.hidden) {
      event.preventDefault();
      jump();
    }
  };
  const themeHandler = () => {
    readPalette();
    draw();
  };
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    jump();
  });
  document.addEventListener('keydown', keyHandler);
  document.addEventListener('themechange', themeHandler);
  window.addEventListener('resize', resize);
  readPalette();
  resize();
  runner.y = groundY() - runner.height;
  animationFrame = requestAnimationFrame(loop);
  cleanupGame = () => {
    cancelAnimationFrame(animationFrame);
    document.removeEventListener('keydown', keyHandler);
    document.removeEventListener('themechange', themeHandler);
    window.removeEventListener('resize', resize);
  };
}

function setupSnake() {
  const size = 15;
  const stepTime = 160;
  let snake = [{
    x: 7,
    y: 7
  }, {
    x: 6,
    y: 7
  }, {
    x: 5,
    y: 7
  }];
  let previousSnake = snake.map(part => ({
    ...part
  }));
  let food = {
    x: 11,
    y: 7
  };
  let direction = {
    x: 1,
    y: 0
  };
  let nextDirection = direction;
  let score = 0;
  let running = true;
  let lastStep = performance.now();
  let animationFrame;
  const board = document.createElement('canvas');
  board.className = 'board snake-canvas';
  board.setAttribute('aria-label', 'Snake board');
  stage.append(board);
  const context = board.getContext('2d');
  const controls = document.createElement('div');
  controls.className = 'snake-controls';
  [
    ['↑', 'control-up', {
      x: 0,
      y: -1
    }],
    ['←', 'control-left', {
      x: -1,
      y: 0
    }],
    ['↓', 'control-down', {
      x: 0,
      y: 1
    }],
    ['→', 'control-right', {
      x: 1,
      y: 0
    }]
  ].forEach(([text, cls, dir]) => controls.append(button(text, cls, () => turn(dir))));
  stage.append(controls);
  stage.append(Object.assign(document.createElement('p'), {
    className: 'instructions',
    textContent: 'Swipe the board or use the arrows'
  }));

  function turn(dir) {
    if (dir.x + direction.x !== 0 || dir.y + direction.y !== 0) nextDirection = dir;
  }

  function resizeCanvas() {
    const pixels = board.getBoundingClientRect().width;
    const ratio = window.devicePixelRatio || 1;
    board.width = pixels * ratio;
    board.height = pixels * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(timestamp) {
    const pixels = board.getBoundingClientRect().width;
    const progress = Math.min(1, (timestamp - lastStep) / stepTime);
    const colors = getComputedStyle(document.body);
    const cell = pixels / size;
    context.clearRect(0, 0, pixels, pixels);
    context.fillStyle = colors.getPropertyValue('--snake-board').trim();
    context.fillRect(0, 0, pixels, pixels);
    context.strokeStyle = colors.getPropertyValue('--snake-grid').trim();
    context.lineWidth = 1;
    for (let index = 1; index < size; index++) {
      context.beginPath();
      context.moveTo(index * cell, 0);
      context.lineTo(index * cell, pixels);
      context.moveTo(0, index * cell);
      context.lineTo(pixels, index * cell);
      context.stroke();
    }
    context.fillStyle = colors.getPropertyValue('--coral').trim();
    context.beginPath();
    context.arc((food.x + .5) * cell, (food.y + .5) * cell, cell * .3, 0, Math.PI * 2);
    context.fill();
    snake.forEach((part, index) => {
      const from = previousSnake[index] || part;
      const x = (from.x + (part.x - from.x) * progress + .5) * cell;
      const y = (from.y + (part.y - from.y) * progress + .5) * cell;
      context.fillStyle = index === 0 ? colors.getPropertyValue('--ink').trim() : colors.getPropertyValue('--snake-body').trim();
      context.beginPath();
      context.arc(x, y, cell * .38, 0, Math.PI * 2);
      context.fill();
    });
    if (running) animationFrame = requestAnimationFrame(draw);
  }

  function tick(timestamp) {
    if (!running) return;
    direction = nextDirection;
    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y
    };
    if (head.x < 0 || head.x >= size || head.y < 0 || head.y >= size || snake.some(part => part.x === head.x && part.y === head.y)) {
      running = false;
      setMessage(`Round over · ${score} points`);
      saveBest('snake', score);
      return;
    }
    previousSnake = snake.map(part => ({
      ...part
    }));
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      sounds.beep();
      do food = {
        x: Math.floor(Math.random() * size),
        y: Math.floor(Math.random() * size)
      }; while (snake.some(part => part.x === food.x && part.y === food.y));
    } else snake.pop();
    lastStep = timestamp;
  }

  function loop(timestamp) {
    if (timestamp - lastStep >= stepTime) tick(timestamp);
    if (running) animationFrame = requestAnimationFrame(loop);
  }
  resizeCanvas();
  animationFrame = requestAnimationFrame(draw);
  requestAnimationFrame(loop);
  const keyHandler = event => {
    const dirs = {
      ArrowUp: {
        x: 0,
        y: -1
      },
      ArrowDown: {
        x: 0,
        y: 1
      },
      ArrowLeft: {
        x: -1,
        y: 0
      },
      ArrowRight: {
        x: 1,
        y: 0
      }
    };
    if (dirs[event.key]) {
      event.preventDefault();
      turn(dirs[event.key]);
    }
  };
  document.addEventListener('keydown', keyHandler);
  let startX;
  let startY;
  const start = event => {
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
  };
  const end = event => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) turn(Math.abs(dx) > Math.abs(dy) ? {
      x: Math.sign(dx),
      y: 0
    } : {
      x: 0,
      y: Math.sign(dy)
    });
  };
  board.addEventListener('touchstart', start, {
    passive: true
  });
  board.addEventListener('touchend', end, {
    passive: true
  });
  window.addEventListener('resize', resizeCanvas);
  cleanupGame = () => {
    running = false;
    cancelAnimationFrame(animationFrame);
    document.removeEventListener('keydown', keyHandler);
    window.removeEventListener('resize', resizeCanvas);
  };
}

function setupMerge() {
  let cells = Array(16).fill(0);
  cells[0] = 2;
  cells[1] = 2;
  cells[5] = 4;
  let score = 0;
  let running = true;
  const board = document.createElement('div');
  board.className = 'board merge-board';
  stage.append(board);
  const controls = document.createElement('div');
  controls.className = 'merge-controls';
  [
    ['↑', 'up'],
    ['←', 'left'],
    ['↓', 'down'],
    ['→', 'right']
  ].forEach(([text, dir]) => controls.append(button(text, '', () => move(dir))));
  stage.append(controls);
  stage.append(Object.assign(document.createElement('p'), {
    className: 'instructions',
    textContent: 'Arrow keys or WASD · reach 2048'
  }));

  function render() {
    board.innerHTML = '';
    cells.forEach(value => {
      const tile = document.createElement('div');
      tile.className = `tile ${value ? `tile-${value}` : ''}`;
      tile.textContent = value || '';
      board.append(tile);
    });
    bestScore.textContent = Math.max(Number(localStorage.getItem('arcade-merge') || 0), score);
  }

  function move(direction) {
    if (!running) return;
    const lines = direction === 'left' || direction === 'right' ? Array.from({
      length: 4
    }, (_, line) => [line * 4, line * 4 + 1, line * 4 + 2, line * 4 + 3]) : Array.from({
      length: 4
    }, (_, line) => [line, line + 4, line + 8, line + 12]);
    let changed = false;
    lines.forEach(indexes => {
      let values = indexes.map(index => cells[index]).filter(Boolean);
      if (direction === 'right' || direction === 'down') values.reverse();
      for (let i = 0; i < values.length - 1; i++)
        if (values[i] === values[i + 1]) {
          values[i] *= 2;
          score += values[i];
          values.splice(i + 1, 1);
          sounds.beep();
        } while (values.length < 4) values.push(0);
      if (direction === 'right' || direction === 'down') values.reverse();
      indexes.forEach((index, i) => {
        if (cells[index] !== values[i]) changed = true;
        cells[index] = values[i];
      });
    });
    if (changed) {
      const empty = cells.map((value, i) => value ? -1 : i).filter(i => i >= 0);
      if (empty.length) cells[empty[Math.floor(Math.random() * empty.length)]] = Math.random() > .1 ? 2 : 4;
      saveBest('merge', score);
      render();
      if (!canMove()) {
        running = false;
        setMessage(`No more moves · ${score} points`);
      }
    }
  }

  function canMove() {
    return cells.some((value, i) => !value || (i % 4 < 3 && value === cells[i + 1]) || (i < 12 && value === cells[i + 4]));
  }
  render();
  const keyHandler = event => {
    const dirs = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right'
    };
    const direction = dirs[event.key] || dirs[event.key.toLowerCase()];
    if (direction && !event.repeat) {
      event.preventDefault();
      move(direction);
    }
  };
  document.addEventListener('keydown', keyHandler);
  let startX;
  let startY;
  board.addEventListener('touchstart', event => {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, {
    passive: true
  });
  board.addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, {
    passive: true
  });
  cleanupGame = () => document.removeEventListener('keydown', keyHandler);
}

function setupCheckers() {
  const size = 8;
  const cells = Array(size * size).fill(null);
  let currentPlayer = 1;
  let selected = null;
  let forcedPiece = null;
  let gameOver = false;
  const board = document.createElement('div');
  board.className = 'checkers-board';
  board.setAttribute('role', 'grid');
  board.setAttribute('aria-label', 'Checkers board');
  const status = document.createElement('p');
  status.className = 'checkers-status';
  status.setAttribute('aria-live', 'polite');
  stage.append(status, board);

  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < size; column++) {
      if ((row + column) % 2 === 1) cells[row * size + column] = {
        player: 2,
        king: false
      };
    }
  }
  for (let row = 5; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if ((row + column) % 2 === 1) cells[row * size + column] = {
        player: 1,
        king: false
      };
    }
  }

  function pieceAt(row, column) {
    if (row < 0 || row >= size || column < 0 || column >= size) return null;
    return cells[row * size + column];
  }

  function inBounds(row, column) {
    return row >= 0 && row < size && column >= 0 && column < size;
  }

  function movesFor(row, column, capturesOnly = false) {
    const piece = pieceAt(row, column);
    if (!piece) return [];
    const directions = piece.king ? [-1, 1] : [piece.player === 1 ? -1 : 1];
    const moves = [];
    directions.forEach(rowStep => {
      [-1, 1].forEach(columnStep => {
        const nextRow = row + rowStep;
        const nextColumn = column + columnStep;
        if (!inBounds(nextRow, nextColumn)) return;
        const target = pieceAt(nextRow, nextColumn);
        if (!target && !capturesOnly) moves.push({
          row: nextRow,
          column: nextColumn,
          capture: null
        });
        else if (target && target.player !== piece.player && inBounds(row + rowStep * 2, column + columnStep * 2) && !pieceAt(row + rowStep * 2, column + columnStep * 2)) {
          moves.push({
            row: row + rowStep * 2,
            column: column + columnStep * 2,
            capture: {
              row: nextRow,
              column: nextColumn
            }
          });
        }
      });
    });
    return moves;
  }

  function movesForTurn() {
    if (forcedPiece) return movesFor(forcedPiece.row, forcedPiece.column, true).map(move => ({
      ...move,
      from: forcedPiece
    }));
    const pieces = [];
    cells.forEach((piece, index) => {
      if (piece?.player === currentPlayer) {
        const row = Math.floor(index / size);
        const column = index % size;
        pieces.push(...movesFor(row, column, true).map(move => ({
          ...move,
          from: {
            row,
            column
          }
        })));
      }
    });
    if (pieces.length) return pieces;
    const regularMoves = [];
    cells.forEach((piece, index) => {
      if (piece?.player === currentPlayer) {
        const row = Math.floor(index / size);
        const column = index % size;
        regularMoves.push(...movesFor(row, column).map(move => ({
          ...move,
          from: {
            row,
            column
          }
        })));
      }
    });
    return regularMoves;
  }

  function render() {
    const legalMoves = movesForTurn();
    board.innerHTML = '';
    cells.forEach((piece, index) => {
      const row = Math.floor(index / size);
      const column = index % size;
      const destination = selected && legalMoves.some(move => move.row === row && move.column === column && move.from.row === selected.row && move.from.column === selected.column);
      const isSelected = selected?.row === row && selected?.column === column;
      const cell = button('', `checkers-square ${(row + column) % 2 ? 'dark' : 'light'} ${isSelected ? 'selected' : ''} ${destination ? 'destination' : ''}`,
        () => choose(row, column, legalMoves));
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${piece ? `Player ${piece.player}${piece.king ? ' king' : ''}` : 'Empty'} square, row ${row + 1}, column ${column + 1}${destination ? ', legal move' : ''}`);
      cell.disabled = gameOver;
      if (piece) {
        const token = document.createElement('span');
        token.className = `checkers-piece player-${piece.player} ${piece.king ? 'king' : ''}`;
        token.setAttribute('aria-hidden', 'true');
        token.textContent = piece.king ? '♛' : '';
        cell.append(token);
      }
      board.append(cell);
    });
    status.className = `checkers-status player-${currentPlayer}`;
    status.textContent = gameOver ? `Player ${currentPlayer} wins` : forcedPiece ? `Player ${currentPlayer}: make another jump` : `Player ${currentPlayer}'s turn${legalMoves.some(move => move.capture) ? ' · capture required' : ''}`;
  }

  function choose(row, column, legalMoves) {
    if (gameOver) return;
    const destination = legalMoves.find(move => move.row === row && move.column === column && selected && move.from.row === selected.row && move.from.column === selected.column);
    if (destination) {
      movePiece(destination);
      return;
    }
    const piece = pieceAt(row, column);
    if (piece?.player === currentPlayer && (!forcedPiece || (forcedPiece.row === row && forcedPiece.column === column))) {
      const canMove = legalMoves.some(move => move.from.row === row && move.from.column === column);
      if (canMove) selected = {
        row,
        column
      };
      render();
      return;
    }
    if (!forcedPiece && selected?.row === row && selected?.column === column) {
      selected = null;
      render();
    }
  }

  function movePiece(move) {
    const fromIndex = move.from.row * size + move.from.column;
    const toIndex = move.row * size + move.column;
    const piece = cells[fromIndex];
    cells[fromIndex] = null;
    cells[toIndex] = piece;
    if (move.capture) cells[move.capture.row * size + move.capture.column] = null;
    if ((piece.player === 1 && move.row === 0) || (piece.player === 2 && move.row === size - 1)) piece.king = true;
    sounds.beep();
    if (move.capture && movesFor(move.row, move.column, true).length) {
      selected = {
        row: move.row,
        column: move.column
      };
      forcedPiece = selected;
      render();
      return;
    }
    selected = null;
    forcedPiece = null;
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    const opponentPieces = cells.some(cell => cell?.player === currentPlayer);
    if (!opponentPieces || movesForTurn().length === 0) {
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      gameOver = true;
      setMessage(`Player ${currentPlayer} wins`);
    }
    render();
  }

  render();
  cleanupGame = () => {};
}

function setupTicTacToe() {
  let cells = Array(9).fill('');
  let turn = 'X';
  let running = true;
  const board = document.createElement('div');
  board.className = 'tic-board';
  stage.append(board);
  const status = document.createElement('p');
  status.className = 'tic-status';
  stage.append(status);

  function render() {
    board.innerHTML = '';
    cells.forEach((value, index) => {
      const cell = button(value, `tic-cell ${value.toLowerCase()}`, () => play(index));
      cell.setAttribute('aria-label', value ? `${value} at position ${index + 1}` : `Empty position ${index + 1}`);
      board.append(cell);
    });
    status.textContent = running ? `${turn}'s turn` : status.textContent;
  }

  function play(index) {
    if (cells[index] || !running) return;
    cells[index] = turn;
    sounds.beep();
    const winner = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ].find(line => line.every(i => cells[i] === turn));
    if (winner) {
      running = false;
      status.textContent = `${turn} wins · lovely work`;
      setMessage(status.textContent);
      saveBest('tictactoe', 1);
    } else if (cells.every(Boolean)) {
      running = false;
      status.textContent = 'A thoughtful draw';
      setMessage(status.textContent);
    } else turn = turn === 'X' ? 'O' : 'X';
    render();
  }
  render();
  cleanupGame = () => {};
}

function setupConnectFour() {
  const columns = 7;
  const rows = 6;
  let cells = Array(rows * columns).fill('');
  let turn = 'R';
  let running = true;
  const board = document.createElement('div');
  board.className = 'connect-board';
  stage.append(board);
  const status = document.createElement('p');
  status.className = 'tic-status';
  stage.append(status);

  function render() {
    board.innerHTML = '';
    for (let row = 0; row < rows; row++)
      for (let column = 0; column < columns; column++) {
        const index = row * columns + column;
        const cell = button('', `connect-cell ${cells[index].toLowerCase()}`, () => drop(column));
        cell.setAttribute('aria-label', `Column ${column + 1}, row ${row + 1}`);
        board.append(cell);
      }
    status.textContent = running ? `${turn === 'R' ? 'Red' : 'Blue'}'s turn` : status.textContent;
  }

  function drop(column) {
    if (!running) return;
    for (let row = rows - 1; row >= 0; row--) {
      const index = row * columns + column;
      if (!cells[index]) {
        cells[index] = turn;
        sounds.beep();
        if (hasWon(row, column)) {
          running = false;
          status.textContent = `${turn === 'R' ? 'Red' : 'Blue'} wins`;
          setMessage(status.textContent);
          saveBest('connectfour', 1);
        } else if (cells.every(Boolean)) {
          running = false;
          status.textContent = 'Draw';
          setMessage(status.textContent);
        } else turn = turn === 'R' ? 'Y' : 'R';
        render();
        return;
      }
    }
  }

  function hasWon(row, column) {
    return [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1]
    ].some(([rowStep, columnStep]) => 1 + count(row, column, rowStep, columnStep) + count(row, column, -rowStep, -columnStep) >= 4);
  }

  function count(row, column, rowStep, columnStep) {
    let total = 0;
    const color = cells[row * columns + column];
    for (let distance = 1; distance < 4; distance++) {
      const nextRow = row + rowStep * distance;
      const nextColumn = column + columnStep * distance;
      if (nextRow < 0 || nextRow >= rows || nextColumn < 0 || nextColumn >= columns || cells[nextRow * columns + nextColumn] !== color) break;
      total++;
    }
    return total;
  }
  render();
  cleanupGame = () => {};
}
