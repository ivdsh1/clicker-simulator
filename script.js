document.addEventListener('dblclick', function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener('DOMContentLoaded', async () => {

    // --- CONFIGURAÇÃO ---
    // Adicione aqui os IPs que terão acesso ao painel de configurações.
    const allowedIPs = ['127.0.0.1', '::1']; 
    const SAVE_KEY = 'clickerSimulatorSaveData';
    const WIN_SCORE = 10000; // Objetivo para vencer

    // --- ESTADO DO JOGO ---
    let score = 0;
    let clicksPerClick = 1;
    let clicksPerSecond = 0;
    let hasWon = false;

    // --- DEFINIÇÃO DOS UPGRADES ---
    let upgrades = [
        { id: 'cursor', name: 'Ponteiro Melhorado', description: 'Ganha +1 por clique.', baseCost: 15, costMultiplier: 1.15, increase: 1, type: 'perClick', level: 0 },
        { id: 'superCursor', name: 'Super Ponteiro', description: 'Ganha +5 por clique.', baseCost: 100, costMultiplier: 1.2, increase: 5, type: 'perClick', level: 0 },
        { id: 'auto1', name: 'Estagiário', description: 'Gera +1 por segundo.', baseCost: 50, costMultiplier: 1.25, increase: 1, type: 'perSecond', level: 0 },
        { id: 'auto2', name: 'Dev. Júnior', description: 'Gera +10 por segundo.', baseCost: 500, costMultiplier: 1.3, increase: 10, type: 'perSecond', level: 0 },
        { id: 'megaCursor', name: 'Ponteiro de Platina', description: 'Ganha +100 por clique.', baseCost: 10000, costMultiplier: 1.25, increase: 100, type: 'perClick', level: 0 },
        { id: 'auto3', name: 'Dev. Pleno', description: 'Gera +50 por segundo.', baseCost: 3000, costMultiplier: 1.35, increase: 50, type: 'perSecond', level: 0 },
        { id: 'auto4', name: 'Dev. Sênior', description: 'Gera +250 por segundo.', baseCost: 15000, costMultiplier: 1.4, increase: 250, type: 'perSecond', level: 0 },
        { id: 'auto5', name: 'Servidor Dedicado', description: 'Gera +1.000 por segundo.', baseCost: 100000, costMultiplier: 1.5, increase: 1000, type: 'perSecond', level: 0 },
    ];

    // --- ELEMENTOS DO DOM ---
    const scoreDisplay = document.getElementById('score-display'), cpsDisplay = document.getElementById('cps-display'), clickButton = document.getElementById('click-button'), upgradesList = document.getElementById('upgrades-list'), settingsButton = document.getElementById('settings-button'), settingsPanel = document.getElementById('settings-panel'), closeSettingsButton = document.getElementById('close-settings-button'), saveSettingsButton = document.getElementById('save-settings-button'), configScoreInput = document.getElementById('config-score'), configCpcInput = document.getElementById('config-cpc'), configCpsInput = document.getElementById('config-cps'), resetProgressButton = document.getElementById('reset-progress-button'), dataConsole = document.getElementById('data-console'), importDataButton = document.getElementById('import-data-button'), exportDataButton = document.getElementById('export-data-button'), winScreen = document.getElementById('win-screen'), showWinScreenButton = document.getElementById('show-win-screen-button'), continuePlayingButton = document.getElementById('continue-playing-button'), restartWinButton = document.getElementById('restart-win-button');

    // --- FUNÇÕES DE ADMIN E CONFIGURAÇÃO ---
    async function checkAdminAccess() { try { const response = await fetch('https://api.ipify.org?format=json'); if (!response.ok) return; const data = await response.json(); if (allowedIPs.includes(data.ip)) { settingsButton.classList.remove('hidden'); } } catch (error) { console.error('Falha ao verificar acesso de admin:', error); } }
    function openSettings() { configScoreInput.value = Math.floor(score); configCpcInput.value = clicksPerClick; configCpsInput.value = clicksPerSecond; settingsPanel.classList.add('visible'); }
    function closeSettings() { settingsPanel.classList.remove('visible'); }
    function saveSettings() { score = parseInt(configScoreInput.value) || 0; clicksPerClick = parseInt(configCpcInput.value) || 1; clicksPerSecond = parseInt(configCpsInput.value) || 0; updateDisplay(); closeSettings(); }
    function exportData() { const saveDataString = localStorage.getItem(SAVE_KEY); if (saveDataString) { navigator.clipboard.writeText(saveDataString).then(() => alert('Dados do save copiados!')).catch(() => alert('Falha ao copiar.')); } else { alert('Nenhum dado encontrado.'); } }
    function importData() { const dataToImport = dataConsole.value; if (!dataToImport.trim()) return alert('Cole os dados do save primeiro.'); try { JSON.parse(dataToImport); localStorage.setItem(SAVE_KEY, dataToImport); alert('Dados importados! O jogo será recarregado.'); location.reload(); } catch (error) { alert('Erro: Dados inválidos.'); } }
    
    function resetGame(silent = false) {
        const confirmation = silent ? true : confirm("Tem certeza que deseja apagar todo o seu progresso?");
        if (confirmation) {
            localStorage.removeItem(SAVE_KEY);
            location.reload();
        }
    }
    
    // --- FUNÇÕES DE DADOS (SAVE/LOAD) ---
    function saveGame() {
        const gameState = {
            score: score, clicksPerClick: clicksPerClick, clicksPerSecond: clicksPerSecond,
            upgrades: upgrades.map(u => ({ id: u.id, level: u.level })),
            lastSaveTimestamp: Date.now(), hasWon: hasWon
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    }

    function loadGame() {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (!savedData) return;
        try {
            const gameState = JSON.parse(savedData);
            score = gameState.score || 0; clicksPerClick = gameState.clicksPerClick || 1;
            clicksPerSecond = gameState.clicksPerSecond || 0; hasWon = gameState.hasWon || false;
            if (gameState.upgrades) { gameState.upgrades.forEach(savedUpgrade => { const gameUpgrade = upgrades.find(u => u.id === savedUpgrade.id); if (gameUpgrade) { gameUpgrade.level = savedUpgrade.level; } }); }
            if (hasWon) { showWinScreenButton.classList.remove('hidden'); }
        } catch (error) { console.error('Falha ao carregar save. Resetando...', error); resetGame(true); }
    }
    
    // --- FUNÇÕES DE VITÓRIA ---
    function winGame() { hasWon = true; saveGame(); showWinScreen(); }
    function showWinScreen() { winScreen.classList.add('visible'); }
    function hideWinScreen() { winScreen.classList.remove('visible'); }

    // --- FUNÇÕES DE JOGO ---
    function updateDisplay() { scoreDisplay.textContent = Math.floor(score).toLocaleString('pt-BR'); cpsDisplay.textContent = `${clicksPerSecond.toLocaleString('pt-BR')} por segundo`; updateUpgradeButtons(); if (score >= WIN_SCORE && !hasWon) { winGame(); } }
    function handleManualClick(event) { score += clicksPerClick; showFloatingNumber(event.clientX, event.clientY, `+${clicksPerClick.toLocaleString('pt-BR')}`); updateDisplay(); }
    function showFloatingNumber(x, y, text) { const number = document.createElement('div'); number.classList.add('floating-number'); number.textContent = text; number.style.left = `${x}px`; number.style.top = `${y - 30}px`; document.body.appendChild(number); setTimeout(() => { number.remove(); }, 1000); }
    function buyUpgrade(upgradeId) { const upgrade = upgrades.find(u => u.id === upgradeId); const cost = calculateCost(upgrade); if (score >= cost) { score -= cost; upgrade.level++; if (upgrade.type === 'perClick') { clicksPerClick += upgrade.increase; } else if (upgrade.type === 'perSecond') { clicksPerSecond += upgrade.increase; } renderUpgrades(); updateDisplay(); } }
    function calculateCost(upgrade) { return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level)); }
    function updateUpgradeButtons() { upgrades.forEach(upgrade => { const button = document.getElementById(`buy-${upgrade.id}`); if (button) { button.disabled = score < calculateCost(upgrade); } }); }
    function renderUpgrades() { upgradesList.innerHTML = ''; upgrades.forEach(upgrade => { const cost = calculateCost(upgrade); const upgradeElement = document.createElement('div'); upgradeElement.className = 'upgrade-item'; upgradeElement.innerHTML = ` <div class="upgrade-details"> <h3>${upgrade.name} (Nível ${upgrade.level})</h3> <p>${upgrade.description}</p> </div> <button id="buy-${upgrade.id}" class="buy-button"> Comprar (${cost.toLocaleString('pt-BR')}) </button> `; upgradesList.appendChild(upgradeElement); document.getElementById(`buy-${upgrade.id}`).addEventListener('click', () => buyUpgrade(upgrade.id)); }); updateUpgradeButtons(); }

    // --- INICIALIZAÇÃO ---
    async function init() {
        loadGame();
        await checkAdminAccess();
        renderUpgrades();
        updateDisplay();

        // Game Loops
        setInterval(() => { score += clicksPerSecond; updateDisplay(); }, 1000);
        setInterval(saveGame, 10000);

        // Event Listeners
        clickButton.addEventListener('click', handleManualClick);
        settingsButton.addEventListener('click', openSettings);
        closeSettingsButton.addEventListener('click', closeSettings);
        saveSettingsButton.addEventListener('click', saveSettings);
        resetProgressButton.addEventListener('click', () => resetGame(false));
        importDataButton.addEventListener('click', importData);
        exportDataButton.addEventListener('click', exportData);
        continuePlayingButton.addEventListener('click', () => { hideWinScreen(); showWinScreenButton.classList.remove('hidden'); });
        restartWinButton.addEventListener('click', () => resetGame(false));
        showWinScreenButton.addEventListener('click', showWinScreen);
    }
    
    init();
});
