import { InstrumentationBase, InstrumentationModuleDefinition } from "@opentelemetry/instrumentation";
import { CerebrasInstrumentationConfig } from "./types";
import type * as cerebras from "@cerebras/cerebras_cloud_sdk";
export declare class CerebrasInstrumentation extends InstrumentationBase {
    protected _config: CerebrasInstrumentationConfig;
    constructor(config?: CerebrasInstrumentationConfig);
    setConfig(config?: CerebrasInstrumentationConfig): void;
    manuallyInstrument(module: typeof cerebras): void;
    protected init(): InstrumentationModuleDefinition;
    private patch;
    private unpatch;
    private patchCerebras;
    private startSpan;
    private _streamingWrapPromise;
    private _wrapPromise;
    private _endSpan;
    private _shouldSendPrompts;
}
//# sourceMappingURL=instrumentation.d.ts.map