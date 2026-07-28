import type { IActionPlugin, ITriggerPlugin } from '../contracts/automationContracts';

export class TriggerRegistry {
  private readonly plugins = new Map<string, ITriggerPlugin>();

  register(plugin: ITriggerPlugin): void {
    this.plugins.set(plugin.type, plugin);
  }

  resolve(type: string): ITriggerPlugin | null {
    return this.plugins.get(type) ?? null;
  }

  listTypes(): string[] {
    return Array.from(this.plugins.keys());
  }
}

export class ActionRegistry {
  private readonly plugins = new Map<string, IActionPlugin>();

  register(plugin: IActionPlugin): void {
    this.plugins.set(plugin.type, plugin);
  }

  resolve(type: string): IActionPlugin | null {
    return this.plugins.get(type) ?? null;
  }

  listTypes(): string[] {
    return Array.from(this.plugins.keys());
  }
}
