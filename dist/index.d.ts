import { InstrumentationConfig, InstrumentationBase, InstrumentationModuleDefinition } from '@opentelemetry/instrumentation';
import * as cerebras from '@cerebras/cerebras_cloud_sdk';

interface CerebrasInstrumentationConfig extends InstrumentationConfig {
    /**
     * Whether to log prompts, completions and embeddings on traces.
     * @default true
     */
    traceContent?: boolean;
    /**
     * A custom logger to log any exceptions that happen during span creation.
     */
    exceptionLogger?: (e: Error) => void;
}

declare class CerebrasInstrumentation extends InstrumentationBase {
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

export { CerebrasInstrumentation, type CerebrasInstrumentationConfig };
