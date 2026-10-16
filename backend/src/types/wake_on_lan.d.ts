declare module 'wake_on_lan' {
  interface WakeOptions {
    address?: string;
    port?: number;
    num_packets?: number;
    interval?: number;
  }

  export function wake(
    macAddress: string,
    callback?: (error: Error | null) => void
  ): void;

  export function wake(
    macAddress: string,
    options: WakeOptions,
    callback?: (error: Error | null) => void
  ): void;

  export function createMagicPacket(macAddress: string): Buffer;
}
