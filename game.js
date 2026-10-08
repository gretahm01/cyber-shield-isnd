const GAME_WIDTH = 1000;
const GAME_HEIGHT = 562;
const COLORS = { cyan: 0x20dcff, blue: 0x1177cc, red: 0xff4665, green: 0x37f5a2, dark: 0x07111f };
const SUPABASE_URL = 'https://yidmwwckebagxjpidxma.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZG13d2NrZWJhZ3hqcGlkeG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDUxOTgsImV4cCI6MjEwNTYyMTE5OH0.i6ZuT2JvZ9xe1IJV8VJuCf9LkMYVr3Zm2-u2DzzLUsI';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function initMobileGame(gameChannel) {
  window.playMode = 'mobile';

  const qrModal = document.getElementById('qr-modal');
  if (qrModal) {
    qrModal.style.display = 'none';
    qrModal.style.pointerEvents = 'none';
  }

  gameChannel.send({ type: 'broadcast', event: 'PC_READY', payload: {} });

  const activeScenes = window.game?.scene?.getScenes(true) || [];
  activeScenes.forEach((scene) => {
    if (scene.scene.key === 'StartScene' || scene.scene.key === 'MenuScene') {
      scene.scene.start('MainScene');
    }
  });
}

let retroAudioContext;

function playRetroSound(type) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  retroAudioContext ??= new AudioContext();
  const context = retroAudioContext;
  context.resume().catch(() => {});
  const now = context.currentTime;

  const createTone = (frequency, endFrequency, startTime, duration, wave = 'square', volume = 0.08) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startTime + duration);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  if (type === 'laser') {
    createTone(600, 120, now, 0.1, 'square', 0.06);
  } else if (type === 'explosion') {
    const duration = 0.3;
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    const gain = context.createGain();
    noise.buffer = buffer;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noise.connect(gain).connect(context.destination);
    noise.start(now);
  } else if (type === 'boss_hit') {
    createTone(350, 80, now, 0.12, 'triangle', 0.1);
  } else if (type === 'win') {
    [261.63, 329.63, 392.0, 523.25].forEach((frequency, index) => {
      createTone(frequency, frequency, now + index * 0.09, 0.08, 'square', 0.06);
    });
  }
}

class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#07111f');
    this.scene.start('MenuScene');
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this.connectMobileController();
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.dark);
    this.add.text(GAME_WIDTH / 2, 64, 'CYBER SHIELD ISND', {
      fontFamily: 'Arial Black, Arial', fontSize: '46px', color: '#20dcff', stroke: '#07283a', strokeThickness: 8
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 125, 'Defiende la red. Neutraliza las amenazas.', {
      fontSize: '20px', color: '#a7dceb'
    }).setOrigin(0.5);

    const panel = this.add.rectangle(GAME_WIDTH / 2, 300, 880, 285, 0x0c2035, 0.94)
      .setStrokeStyle(2, COLORS.blue);
    panel.setDepth(0);

    this.add.rectangle(270, 298, 275, 190, 0x07111f, 0.85).setStrokeStyle(1, COLORS.cyan);
    this.add.rectangle(675, 298, 505, 190, 0x07111f, 0.85).setStrokeStyle(1, COLORS.cyan);
    this.add.text(150, 198, 'INTEGRANTES', { fontSize: '22px', color: '#37f5a2', fontStyle: 'bold' });
    this.add.text(150, 239, 'EQUIPO DE DESARROLLO\n\nGreta Hernández\nCamila Martínez', {
      fontSize: '20px', color: '#d5efff', lineSpacing: 9
    });
    this.add.text(435, 198, 'INSTRUCCIONES', { fontSize: '22px', color: '#37f5a2', fontStyle: 'bold' });
    this.add.text(435, 235, 'CONTROLES: Flechas / WASD para moverte | ESPACIO para disparar.\n\nOBJETIVO: Dispara Parches de Seguridad para neutralizar el Malware antes de que llegue abajo.\n\nREGLA: Si el Malware toca el fondo, la Energía del Servidor cae 10%.\n\nMETA: Sobrevive a los 3 niveles para ganar.', {
      fontSize: '15px', color: '#d5efff', lineSpacing: 4, wordWrap: { width: 460 }
    });

    const button = this.add.rectangle(GAME_WIDTH / 2, 485, 280, 52, COLORS.blue).setInteractive({ useHandCursor: true });
    const label = this.add.text(GAME_WIDTH / 2, 485, 'INICIAR JUEGO', {
      fontFamily: 'Arial Black, Arial', fontSize: '23px', color: '#ffffff'
    }).setOrigin(0.5);
    button.on('pointerover', () => button.setFillStyle(COLORS.cyan));
    button.on('pointerout', () => button.setFillStyle(COLORS.blue));
    const startGame = () => {
      const modal = document.getElementById('qr-modal');
      if (modal) {
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
      }
      window.qrClosedManual = true;
      this.scene.start('MainScene');
    };

    button.on('pointerdown', startGame);
    label.setInteractive({ useHandCursor: true }).on('pointerdown', startGame);
  }

  connectMobileController() {
    if (typeof supabaseClient === 'undefined') return;

    const roomId = window.GAME_ROOM_ID || (new URLSearchParams(window.location.search)).get('room') || '1234';
    window.mobileInputs ??= { left: false, right: false, shoot: false };
    const gameChannel = supabaseClient.channel('room_' + roomId, {
      config: { broadcast: { ack: false, self: false } }
    });
    this.channel = gameChannel;

    gameChannel
      .on('broadcast', { event: 'MOBILE_CONNECT' }, () => {
        console.log('¡Móvil detectado exitosamente!');
        initMobileGame(gameChannel);
        const roomTxt = document.getElementById('room-code-txt');
        if (roomTxt) roomTxt.innerText = '✓ CELULAR CONECTADO';
      })
      .on('broadcast', { event: 'GAME_INPUT' }, ({ payload }) => {
        initMobileGame(gameChannel);
        if (!payload || !['left', 'right', 'shoot'].includes(payload.action)) return;
        window.mobileInputs = window.mobileInputs || { left: false, right: false, shoot: false };
        window.mobileInputs[payload.action] = Boolean(payload.state);
      })
      .subscribe();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.channel) supabaseClient.removeChannel(this.channel);
    });
  }
}

class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    create() {
        this.score = 0;
        this.energy = 100;
        this.level = 1;
        const roomId = window.GAME_ROOM_ID || (new URLSearchParams(window.location.search)).get('room') || '1234';
        this.roomId = roomId;
        window.mobileInputs ??= { left: false, right: false, shoot: false };
        this.mobileInputs = window.mobileInputs;
        this.nextMobileShotAt = 0;
        this.mobileConnectedNotified = false;
        this.createMobileControllerRoom();
        this.connectMobileController();

        this.add.text(16, 12, '◆ CYBER SHIELD // ISND', {
            fontFamily: 'monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#00dcf0'
        });

        const hudStyle = {
            fontFamily: 'monospace',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#dffcff',
            backgroundColor: '#071c31',
            padding: { left: 8, right: 8, top: 4, bottom: 4 },
            stroke: '#0b4155',
            strokeThickness: 1
        };

        this.scoreText = this.add.text(16, 42, 'AMENAZAS NEUTRALIZADAS: 0', hudStyle);
        this.energyText = this.add.text(GAME_WIDTH / 2, 42, 'INTEGRIDAD INFRAESTRUCTURA: 100%', {
            ...hudStyle,
            color: '#00ffcc'
        }).setOrigin(0.5, 0);
        this.levelText = this.add.text(GAME_WIDTH - 16, 42, 'FASE: 1 - Phishing & Malware', hudStyle)
            .setOrigin(1, 0);

        this.add.text(
            GAME_WIDTH / 2,
            76,
            'Flechas/WASD: mover  •  ESPACIO: parche de seguridad',
            { fontFamily: 'monospace', fontSize: '13px', color: '#7090a0' }
        ).setOrigin(0.5);

        // Jugador (Nave)
        this.player = this.add.polygon(500, 520, [0, -22, 18, 22, -18, 22], 0x00ffff);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);

        // Grupos
        this.bullets = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.firewalls = this.physics.add.group();
        this.bossBullets = this.physics.add.group();
        this.boss = null;
        this.isVictory = false;

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Generador de Malware (Enemigos Rojos cada 1.2 segundos)
        this.spawnTimer = this.time.addEvent({
            delay: 1600,
            callback: this.spawnMalware,
            callbackScope: this,
            loop: true
        });

        this.firewallTimer = this.time.addEvent({
            delay: 15000,
            callback: this.spawnFirewall,
            callbackScope: this,
            loop: true
        });

        // Colisión disparo vs malware
        this.physics.add.overlap(this.bullets, this.enemies, this.destroyEnemy, null, this);
        this.physics.add.overlap(this.player, this.firewalls, this.collectFirewall, null, this);
        this.physics.add.overlap(this.player, this.bossBullets, this.hitByBossProjectile, null, this);
    }

    createMobileControllerRoom() {
        const modal = document.getElementById('qr-modal');
        const closeButton = document.getElementById('close-qr-btn');
        if (!window.qrClosedManual && window.playMode !== 'keyboard' && window.playMode !== 'mobile') {
            modal.style.display = 'block';
            modal.style.pointerEvents = 'auto';
        }
        closeButton.onclick = () => {
            window.playMode = 'keyboard';
            window.qrClosedManual = true;
            modal.style.display = 'none';
            modal.style.pointerEvents = 'none';
        };

        this.add.text(
            GAME_WIDTH / 2,
            104,
            `ESCANEA EL QR CON TU CELULAR PARA USARLO COMO CONTROL · SALA ${this.roomId}`,
            { fontFamily: 'monospace', fontSize: '12px', color: '#00dcf0' }
        ).setOrigin(0.5);

    }

    connectMobileController() {
        if (typeof supabaseClient === 'undefined') return;

        const gameChannel = supabaseClient.channel('room_' + this.roomId, {
            config: { broadcast: { ack: false, self: false } }
        });
        this.channel = gameChannel;

        gameChannel
            .on('broadcast', { event: 'MOBILE_CONNECT' }, () => {
                console.log('¡Móvil detectado exitosamente!');
                initMobileGame(gameChannel);
                const roomTxt = document.getElementById('room-code-txt');
                if (roomTxt) roomTxt.innerText = '✓ CELULAR CONECTADO';
                if (!this.mobileConnectedNotified) {
                    this.mobileConnectedNotified = true;
                    const notice = this.add.text(GAME_WIDTH / 2, 126, '✓ CELULAR CONECTADO', {
                        fontFamily: 'monospace', fontSize: '18px', fontStyle: 'bold', color: '#00ff88'
                    }).setOrigin(0.5).setDepth(20);
                    this.time.delayedCall(1800, () => notice.destroy());
                }
            })
            .on('broadcast', { event: 'GAME_INPUT' }, ({ payload }) => {
                initMobileGame(gameChannel);
                if (!payload || !['left', 'right', 'shoot'].includes(payload.action)) return;

                const qrModal = document.getElementById('qr-modal');
                if (qrModal) {
                    qrModal.style.display = 'none';
                    qrModal.style.pointerEvents = 'none';
                }
                window.mobileInputs = window.mobileInputs || { left: false, right: false, shoot: false };
                window.mobileInputs[payload.action] = Boolean(payload.state);
            })
            .subscribe();

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.channel) supabaseClient.removeChannel(this.channel);
        });
    }

    update() {
        const speed = 480;
        this.player.body.setVelocity(0);

        const mobileLeft = window.mobileInputs && window.mobileInputs.left;
        const mobileRight = window.mobileInputs && window.mobileInputs.right;
        const mobileShoot = window.mobileInputs && window.mobileInputs.shoot;
        const moveLeft = this.cursors.left.isDown || this.wasd.left.isDown || mobileLeft;
        const moveRight = this.cursors.right.isDown || this.wasd.right.isDown || mobileRight;
        const isShooting = Phaser.Input.Keyboard.JustDown(this.spaceKey) || mobileShoot;

        if (moveLeft) {
            this.player.body.setVelocityX(-speed);
        } else if (moveRight) {
            this.player.body.setVelocityX(speed);
        }

        if (isShooting && this.time.now >= this.nextMobileShotAt) {
            this.shootPatch();
            this.nextMobileShotAt = this.time.now + 130;
        }

        // Limpiar disparos fuera de pantalla
        this.bullets.children.each((bullet) => {
            if (bullet && bullet.y < 0) {
                bullet.destroy();
            }
        });

        // Detectar si el malware tocó el fondo
        this.enemies.children.each((enemy) => {
            if (enemy && enemy.y > 550) {
                const damage = enemy.getData('isDdos') ? 5 : 10;
                enemy.destroy();
                this.damageServer(damage);
            }
        });

        this.firewalls.children.each((firewall) => {
            if (firewall && firewall.y > 580) firewall.destroy();
        });

        this.bossBullets.children.each((projectile) => {
            if (projectile && (projectile.y > GAME_HEIGHT + 30 || projectile.x < -30 || projectile.x > GAME_WIDTH + 30)) {
                projectile.destroy();
            }
        });

        if (this.boss && this.boss.active) {
            this.updateBossHealthBar();
        }
    }

    shootPatch() {
        playRetroSound('laser');
        [-14, 14].forEach((offsetX) => {
            const bullet = this.add.rectangle(
                this.player.x + offsetX,
                this.player.y - 10,
                6,
                16,
                0x00ff88
            );
            this.physics.add.existing(bullet);
            this.bullets.add(bullet);
            bullet.body.setVelocityY(-480);
        });
    }

    spawnMalware() {
        if (this.level === 3) return;
        const isDdos = this.level === 2;
        const amount = 1;
        for (let index = 0; index < amount; index += 1) {
            const enemy = this.add.rectangle(
                Phaser.Math.Between(40, 960),
                20 - index * 26,
                isDdos ? 18 : 22,
                isDdos ? 18 : 22,
                isDdos ? 0xffaa00 : 0xff3344
            );
            this.physics.add.existing(enemy);
            this.enemies.add(enemy);
            enemy.setData('isDdos', isDdos);
            enemy.body.setVelocityY(isDdos ? 160 : 90);
        }
    }

    spawnFirewall() {
        if (Math.random() > 0.65) return;
        const firewall = this.add.rectangle(Phaser.Math.Between(35, 965), -20, 28, 28, 0x1687ff)
            .setStrokeStyle(2, 0xa8e8ff);
        this.physics.add.existing(firewall);
        firewall.body.setVelocityY(110);
        this.firewalls.add(firewall);
    }

    collectFirewall(player, firewall) {
        firewall.destroy();
        this.energy = Math.min(100, this.energy + 10);
        this.energyText.setText('INTEGRIDAD INFRAESTRUCTURA: ' + this.energy + '%');
    }

    destroyEnemy(bullet, enemy) {
        bullet.destroy();

        if (enemy.isBoss) {
            playRetroSound('boss_hit');
            enemy.hp -= 1;
            enemy.setFillStyle(enemy.hp % 2 === 0 ? 0xff6688 : 0xcc0033);
            this.updateBossHealthBar();

            if (enemy.hp <= 0 && !this.isVictory) {
                this.isVictory = true;
                const originX = enemy.x;
                const originY = enemy.y;
                enemy.setVisible(false);
                enemy.body.enable = false;
                this.bossAttackTimer?.remove(false);
                this.bossBar?.destroy();
                this.bossBullets.clear(true, true);
                this.score += 100;
                this.scoreText.setText('AMENAZAS NEUTRALIZADAS: ' + this.score);
                this.triggerVictory(originX, originY);
            }
            return;
        }

        enemy.destroy();
        playRetroSound('explosion');

        this.score += 10;
        this.scoreText.setText('AMENAZAS NEUTRALIZADAS: ' + this.score);

        if (this.score >= 100 && this.level === 1) {
            this.level = 2;
            this.levelText.setText('FASE: 2 - Ataque DDoS');
            this.spawnTimer.delay = 1200;
        } else if (this.score >= 250 && this.level === 2) {
            this.level = 3;
            this.levelText.setText('FASE: 3 - Ransomware Boss');
            this.spawnTimer.remove();
            this.enemies.clear(true, true);
            this.spawnBoss();
        }
    }

    spawnBoss() {
        const enemy = this.add.rectangle(500, 100, 80, 80, 0xcc0033)
            .setStrokeStyle(4, 0xff6688);
        enemy.isBoss = true;
        enemy.hp = 40;
        enemy.maxHp = 40;
        this.boss = enemy;
        this.physics.add.existing(enemy);
        enemy.body.setAllowGravity(false).setVelocity(320, 0).setCollideWorldBounds(true).setBounce(1, 0);
        this.enemies.add(enemy);
        this.bossBar = this.add.graphics().setDepth(900);
        this.updateBossHealthBar();
        this.bossAttackTimer = this.time.addEvent({
            delay: 900,
            callback: this.fireBossProjectiles,
            callbackScope: this,
            loop: true
        });
    }

    updateBossHealthBar() {
        if (!this.boss?.active || !this.bossBar) return;
        const width = 100;
        const height = 10;
        const x = this.boss.x - width / 2;
        const y = this.boss.y - 58;
        this.bossBar.clear();
        this.bossBar.fillStyle(0x4a0714, 1).fillRect(x, y, width, height);
        this.bossBar.fillStyle(0x00ffcc, 1).fillRect(x + 2, y + 2, (width - 4) * (this.boss.hp / this.boss.maxHp), height - 4);
        this.bossBar.lineStyle(1, 0xffffff, 0.8).strokeRect(x, y, width, height);
    }

    fireBossProjectiles() {
        if (!this.boss?.active) return;
        [-22, 22].forEach((offsetX) => {
            const startX = this.boss.x + offsetX;
            const projectile = this.add.rectangle(startX, this.boss.y + 48, 12, 18, 0x9900ff);
            this.physics.add.existing(projectile);
            projectile.body.setAllowGravity(false).setVelocity(
                Phaser.Math.Clamp((this.player.x - startX) * 0.55, -150, 150),
                240
            );
            this.bossBullets.add(projectile);
        });
    }

    hitByBossProjectile(player, projectile) {
        projectile.destroy();
        this.damageServer(3);
    }

    triggerVictory(x, y) {
        if (this.gameEnding) return;
        this.gameEnding = true;
        this.cameras.main.flash(600, 0, 255, 200);
        playRetroSound('win');

        this.enemies.children.each((threat) => threat.body?.setVelocity(0, 0));
        this.bossBullets.children.each((projectile) => projectile.body?.setVelocity(0, 0));
        this.spawnTimer?.remove(false);
        this.bossAttackTimer?.remove(false);

        for (let index = 0; index < 80; index += 1) {
            const particle = this.add.rectangle(x, y, 6, 6, [0x00ff88, 0x00ffff, 0xffffff][index % 3]).setDepth(1000);
            this.physics.add.existing(particle);
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const velocity = Phaser.Math.Between(140, 360);
            particle.body.setAllowGravity(false).setVelocity(Math.cos(angle) * velocity, Math.sin(angle) * velocity).setGravityY(160);
            this.tweens.add({ targets: particle, alpha: 0, duration: 1000, onComplete: () => particle.destroy() });
        }

        const victoryText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '¡SISTEMA PROTEGIDO!', {
            fontFamily: 'monospace', fontSize: '52px', fontStyle: 'bold', color: '#00ff88',
            stroke: '#062d22', strokeThickness: 8
        }).setOrigin(0.5).setDepth(1100).setScale(0);
        this.tweens.add({ targets: victoryText, scale: 1.2, duration: 650, ease: 'Bounce.Out' });

        this.time.delayedCall(3000, () => {
            this.scene.start('GameOverScene', { score: this.score, victory: true });
        });
    }

    triggerDefeat() {
        if (this.gameEnding) return;
        this.gameEnding = true;
        this.cameras.main.shake(600, 0.03);
        this.cameras.main.flash(600, 255, 0, 0);
        playRetroSound('explosion');

        this.enemies.children.each((threat) => threat.body?.setVelocity(0, 0));
        this.bossBullets.children.each((projectile) => projectile.body?.setVelocity(0, 0));
        this.spawnTimer?.remove(false);
        this.bossAttackTimer?.remove(false);

        const defeatText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '¡SISTEMA COMPROMETIDO!', {
            fontFamily: 'monospace', fontSize: '46px', fontStyle: 'bold', color: '#ff1133',
            stroke: '#2b0008', strokeThickness: 8
        }).setOrigin(0.5).setDepth(1100);
        this.tweens.add({ targets: defeatText, alpha: 0.15, duration: 120, yoyo: true, repeat: 9 });

        this.time.delayedCall(2000, () => {
            this.scene.start('GameOverScene', { score: this.score, victory: false });
        });
    }

    damageServer(damage = 10) {
        this.energy = Math.max(0, this.energy - damage);
        this.energyText.setText('INTEGRIDAD INFRAESTRUCTURA: ' + this.energy + '%');

        if (this.energy === 0) this.triggerDefeat();
    }
}
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this.finalScore = data.score ?? 0;
    this.victory = data.victory ?? false;
  }

  create() {
    this.nameInput = null;
    this.input.keyboard.enabled = false;
    const background = this.victory ? 0x061a17 : 0x120914;
    const title = this.victory
      ? '¡VICTORIA - INFRAESTRUCTURA SALVADA!'
      : '¡ACCESO CONCEDIDO A HACKERS - RED CAÍDA!';
    const color = this.victory ? '#37f5a2' : '#ff4665';
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, background);
    this.add.text(GAME_WIDTH / 2, 185, title, {
      fontSize: this.victory ? '27px' : '30px', color, fontStyle: 'bold',
      stroke: '#06111e', strokeThickness: 5
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 250, `Puntaje final: ${this.finalScore}`, { fontSize: '26px', color: '#ffffff' }).setOrigin(0.5);
    this.statusText = this.add.text(GAME_WIDTH / 2, 292, 'Ingresa tu nombre para guardar tu puntaje', { fontSize: '16px', color: '#a7dceb' }).setOrigin(0.5);
    this.rankingText = this.add.text(590, 330, 'Cargando ranking...', { fontSize: '16px', color: '#d5efff', lineSpacing: 7 });

    this.createNameInput();

    const saveButton = this.add.text(350, 375, 'GUARDAR PUNTAJE', { fontSize: '18px', color: '#ffffff', backgroundColor: '#1177cc', padding: { x: 18, y: 11 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    saveButton.on('pointerdown', () => this.saveScore());

    const restart = this.add.text(350, 445, 'VOLVER A INTENTAR', { fontSize: '20px', color: '#20dcff', backgroundColor: '#10334f', padding: { x: 18, y: 12 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    restart.on('pointerdown', () => {
      this.removeNameInput();
      this.scene.start('MainScene');
    });

    const menuButton = this.add.text(350, 515, 'VOLVER AL INICIO', {
      fontSize: '18px', color: '#ffffff', backgroundColor: '#24506f', padding: { x: 20, y: 11 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuButton.on('pointerdown', () => {
      this.removeNameInput();
      this.scene.start('MenuScene');
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeNameInput();
      this.input.keyboard.enabled = true;
    });
    this.loadLeaderboard();
  }

  createNameInput() {
    const host = document.getElementById('game-container');
    host.style.position = 'relative';
    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.maxLength = 16;
    this.nameInput.placeholder = 'Nombre del jugador';
    this.nameInput.setAttribute('autocomplete', 'off');
    this.nameInput.setAttribute('name', 'player_no_autocomplete_' + Date.now());
    this.nameInput.addEventListener('keydown', (event) => event.stopPropagation());
    Object.assign(this.nameInput.style, {
      position: 'absolute', left: '35%', top: '55%', transform: 'translateX(-50%)',
      width: '220px', height: '35px', boxSizing: 'border-box', padding: '6px 10px',
      color: '#ffffff', background: '#0c2035', border: '1px solid #20dcff',
      borderRadius: '4px', fontSize: '16px', textAlign: 'center'
    });
    host.appendChild(this.nameInput);
    this.nameInput.focus();
  }

  removeNameInput() {
    this.nameInput?.remove();
    this.nameInput = null;
  }

  async saveScore() {
    const nombreJugador = this.nameInput?.value.trim();
    const puntajeFinal = this.finalScore;
    if (!nombreJugador) {
      this.statusText.setText('Escribe un nombre para continuar.');
      return;
    }
    this.statusText.setText('Guardando puntaje...');

    const { data: existing } = await supabaseClient
      .from('leaderboard')
      .select('score')
      .eq('name', nombreJugador)
      .single();

    if (existing) {
      if (puntajeFinal <= existing.score) {
        this.statusText.setText('Se conserva tu récord previo: ' + existing.score);
        this.loadLeaderboard();
        return;
      }

      const { error } = await supabaseClient
        .from('leaderboard')
        .update({ score: puntajeFinal })
        .eq('name', nombreJugador);

      if (error) {
        this.statusText.setText('No fue posible actualizar el puntaje.');
        return;
      }

      this.statusText.setText('¡Nuevo récord guardado!');
      this.loadLeaderboard();
      return;
    }

    const { error } = await supabaseClient
      .from('leaderboard')
      .insert([{ name: nombreJugador, score: puntajeFinal }]);
    if (error) {
      this.statusText.setText('No fue posible guardar el puntaje.');
      return;
    }
    this.statusText.setText('Puntaje guardado correctamente.');
    this.loadLeaderboard();
  }

  async loadLeaderboard() {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(5);

    if (error) {
      this.rankingText.setText('TOP 5\nNo se pudo cargar el ranking.');
      return;
    }

    const rows = data.length
      ? data.map((entry, index) => `${index + 1}. ${entry.name}  -  ${entry.score}`).join('\n')
      : 'Aún no hay puntajes registrados.';
    this.rankingText.setText(`TOP 5 ONLINE\n${rows}`);
  }
}

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [BootScene, MenuScene, MainScene, GameOverScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
});
