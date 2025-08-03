export {};

interface ElectronAPI {
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

class VelocityApp {
  private getStartedBtn: HTMLButtonElement | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    document.addEventListener('DOMContentLoaded', () => {
      this.setupEventListeners();
      this.displaySystemInfo();
    });
  }

  private setupEventListeners(): void {
    this.getStartedBtn = document.getElementById('get-started-btn') as HTMLButtonElement;
    
    if (this.getStartedBtn) {
      this.getStartedBtn.addEventListener('click', this.handleGetStarted.bind(this));
    }
  }

  private handleGetStarted(): void {
    console.log('Get Started button clicked!');
    
    if (this.getStartedBtn) {
      this.getStartedBtn.textContent = 'Ready to build!';
      this.getStartedBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
      
      setTimeout(() => {
        this.getStartedBtn!.textContent = 'Get Started';
        this.getStartedBtn!.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      }, 2000);
    }
  }

  private displaySystemInfo(): void {
    console.log('Velocity app initialized');
    console.log('Platform:', navigator.platform);
    console.log('User Agent:', navigator.userAgent);
  }
}

new VelocityApp();