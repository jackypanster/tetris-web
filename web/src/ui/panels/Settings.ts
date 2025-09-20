/**
 * Settings panel for game configuration
 */

export interface GameSettings {
  // Control settings
  das: number; // Delayed Auto Shift (ms)
  arr: number; // Auto Repeat Rate (ms)
  lockDelay: number; // Lock delay (ms)

  // Visual settings
  ghostPiece: boolean;
  showGrid: boolean;
  backgroundBrightness: number; // 0-100

  // Audio settings
  musicVolume: number; // 0-100
  sfxVolume: number; // 0-100

  // Accessibility
  colorBlindMode: boolean;
  reduceFlashing: boolean;
  vibrationEnabled: boolean;

  // Tutorial
  showTutorial: boolean;

  // Advanced
  enable180Rotation: boolean;
  softDropSpeed: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  das: 167,
  arr: 33,
  lockDelay: 500,
  ghostPiece: true,
  showGrid: true,
  backgroundBrightness: 80,
  musicVolume: 70,
  sfxVolume: 80,
  colorBlindMode: false,
  reduceFlashing: false,
  vibrationEnabled: true,
  showTutorial: true,
  enable180Rotation: false,
  softDropSpeed: 2,
};

export class SettingsPanel {
  private container: HTMLElement;
  private isVisible = false;
  private settings: GameSettings;
  private onSettingsChange?: (settings: GameSettings) => void;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.settings = { ...DEFAULT_SETTINGS };
    this.render();
  }

  public setSettings(settings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.updateUI();
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public onUpdate(callback: (settings: GameSettings) => void): void {
    this.onSettingsChange = callback;
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'block';
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="settings-panel" style="display: none;">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="close-btn">&times;</button>
        </div>

        <div class="settings-content">
          <div class="settings-section">
            <h3>Controls</h3>
            <div class="setting-row">
              <label>DAS (Delayed Auto Shift)</label>
              <input type="range" id="das" min="50" max="500" step="1">
              <span class="value-display"></span>
            </div>
            <div class="setting-row">
              <label>ARR (Auto Repeat Rate)</label>
              <input type="range" id="arr" min="0" max="100" step="1">
              <span class="value-display"></span>
            </div>
            <div class="setting-row">
              <label>Lock Delay</label>
              <input type="range" id="lockDelay" min="100" max="1000" step="50">
              <span class="value-display"></span>
            </div>
          </div>

          <div class="settings-section">
            <h3>Visual</h3>
            <div class="setting-row">
              <label>Ghost Piece</label>
              <input type="checkbox" id="ghostPiece">
            </div>
            <div class="setting-row">
              <label>Show Grid</label>
              <input type="checkbox" id="showGrid">
            </div>
            <div class="setting-row">
              <label>Background Brightness</label>
              <input type="range" id="backgroundBrightness" min="0" max="100" step="5">
              <span class="value-display"></span>
            </div>
          </div>

          <div class="settings-section">
            <h3>Audio</h3>
            <div class="setting-row">
              <label>Music Volume</label>
              <input type="range" id="musicVolume" min="0" max="100" step="5">
              <span class="value-display"></span>
            </div>
            <div class="setting-row">
              <label>SFX Volume</label>
              <input type="range" id="sfxVolume" min="0" max="100" step="5">
              <span class="value-display"></span>
            </div>
          </div>

          <div class="settings-section">
            <h3>Accessibility</h3>
            <div class="setting-row">
              <label>Color Blind Mode</label>
              <input type="checkbox" id="colorBlindMode">
            </div>
            <div class="setting-row">
              <label>Reduce Flashing</label>
              <input type="checkbox" id="reduceFlashing">
            </div>
            <div class="setting-row">
              <label>Vibration</label>
              <input type="checkbox" id="vibrationEnabled">
            </div>
          </div>

          <div class="settings-section">
            <h3>Advanced</h3>
            <div class="setting-row">
              <label>180° Rotation</label>
              <input type="checkbox" id="enable180Rotation">
            </div>
            <div class="setting-row">
              <label>Soft Drop Speed</label>
              <input type="range" id="softDropSpeed" min="1" max="10" step="1">
              <span class="value-display"></span>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <button class="reset-btn">Reset to Defaults</button>
          <button class="save-btn">Save</button>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.updateUI();
  }

  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Setting inputs
    const inputs = this.container.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('input', () => this.handleInputChange(input));
    });

    // Reset button
    const resetBtn = this.container.querySelector('.reset-btn');
    resetBtn?.addEventListener('click', () => this.resetToDefaults());

    // Save button
    const saveBtn = this.container.querySelector('.save-btn');
    saveBtn?.addEventListener('click', () => this.saveSettings());
  }

  private handleInputChange(input: HTMLInputElement): void {
    const key = input.id as keyof GameSettings;

    if (input.type === 'checkbox') {
      (this.settings as any)[key] = input.checked;
    } else if (input.type === 'range') {
      (this.settings as any)[key] = parseInt(input.value);
    }

    this.updateValueDisplay(input);
  }

  private updateUI(): void {
    Object.entries(this.settings).forEach(([key, value]) => {
      const input = this.container.querySelector(`#${key}`) as HTMLInputElement;
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = value as boolean;
        } else {
          input.value = value.toString();
        }
        this.updateValueDisplay(input);
      }
    });
  }

  private updateValueDisplay(input: HTMLInputElement): void {
    const valueDisplay = input.parentElement?.querySelector('.value-display');
    if (valueDisplay && input.type === 'range') {
      let suffix = '';
      if (input.id.includes('Volume') || input.id.includes('Brightness')) {
        suffix = '%';
      } else if (input.id.includes('Delay') || input.id === 'das' || input.id === 'arr') {
        suffix = 'ms';
      }
      valueDisplay.textContent = input.value + suffix;
    }
  }

  private resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.updateUI();
    this.onSettingsChange?.(this.settings);
  }

  private saveSettings(): void {
    this.onSettingsChange?.(this.settings);
    this.hide();
  }
}