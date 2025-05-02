declare module '@agoric/swingset-vat' {
  export type ShutdownWithFailure = (...args: any[]) => void;
  export type Bundle = any;
  export type BundleID = string;
  export type BundleCap = any;
}

declare module '@agoric/vat-data' {
  export type Baggage = any;
}

declare module '@agoric/time' {
  export type TimerService = any;
  export type Timestamp = any;
}

declare module '@agoric/cosmic-proto/agoric/bundle.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/agoric/bundle';
}
declare module '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/ibc/applications/transfer/v2/packet';
}
declare module '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js' {
  export * from '@agoric/cosmic-proto/dist/codegen/ibc/core/channel/v1/channel';
}
