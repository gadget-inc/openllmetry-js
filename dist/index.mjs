import { __asyncGenerator, __asyncValues, __await } from 'tslib';
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { InstrumentationBase, InstrumentationNodeModuleDefinition, safeExecuteInTheMiddle } from '@opentelemetry/instrumentation';
import { SpanAttributes, CONTEXT_KEY_ALLOW_TRACE_CONTENT } from '@traceloop/ai-semantic-conventions';

var version = "0.13.0";

class CerebrasInstrumentation extends InstrumentationBase {
    constructor(config = {}) {
        super("@traceloop/instrumentation-cerebras", version, config);
    }
    setConfig(config = {}) {
        super.setConfig(config);
    }
    manuallyInstrument(module) {
        this._diag.debug(`Patching @cerebras/cerebras_cloud_sdk manually`);
        this._wrap(module.Cerebras.Completions.prototype, "create", this.patchCerebras("completion"));
        this._wrap(module.Cerebras.Chat.Completions.prototype, "create", this.patchCerebras("chat"));
    }
    init() {
        const module = new InstrumentationNodeModuleDefinition("@cerebras/cerebras_cloud_sdk", [">=0.9.1"], this.patch.bind(this), this.unpatch.bind(this));
        return module;
    }
    patch(moduleExports, moduleVersion) {
        this._diag.debug(`Patching  @cerebras/cerebras_cloud_sdk@${moduleVersion}`);
        this._wrap(moduleExports.Cerebras.Completions.prototype, "create", this.patchCerebras("completion"));
        this._wrap(moduleExports.Cerebras.Chat.Completions.prototype, "create", this.patchCerebras("chat"));
        return moduleExports;
    }
    unpatch(moduleExports, moduleVersion) {
        this._diag.debug(`Unpatching @cerebras/cerebras_cloud_sdk@${moduleVersion}`);
        this._unwrap(moduleExports.Cerebras.Completions.prototype, "create");
        this._unwrap(moduleExports.Cerebras.Chat.Completions.prototype, "create");
    }
    patchCerebras(type) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const plugin = this;
        // eslint-disable-next-line
        return (original) => {
            return function method(...args) {
                const span = type === "chat"
                    ? plugin.startSpan({
                        type,
                        params: args[0],
                    })
                    : plugin.startSpan({
                        type,
                        params: args[0],
                    });
                const execContext = trace.setSpan(context.active(), span);
                const execPromise = safeExecuteInTheMiddle(() => {
                    return context.with(execContext, () => {
                        var _a;
                        if ((_a = args === null || args === void 0 ? void 0 : args[0]) === null || _a === void 0 ? void 0 : _a.extraAttributes) {
                            delete args[0].extraAttributes;
                        }
                        return original.apply(this, args);
                    });
                }, (e) => {
                    if (e) {
                        plugin._diag.error("Error in Cerebras instrumentation", e);
                    }
                });
                if (args[0].stream) {
                    return context.bind(execContext, plugin._streamingWrapPromise({
                        span,
                        type,
                        promise: execPromise,
                    }));
                }
                const wrappedPromise = plugin._wrapPromise(type, span, execPromise);
                return context.bind(execContext, wrappedPromise);
            };
        };
    }
    startSpan({ type, params, }) {
        var _a, _b;
        const attributes = {
            [SpanAttributes.LLM_SYSTEM]: "Cerebras",
            [SpanAttributes.LLM_REQUEST_TYPE]: type,
        };
        try {
            attributes[SpanAttributes.LLM_REQUEST_MODEL] = params.model;
            if (typeof params.temperature === "number") {
                attributes[SpanAttributes.LLM_REQUEST_TEMPERATURE] = params.temperature;
            }
            if (typeof params.top_p === "number") {
                attributes[SpanAttributes.LLM_REQUEST_TOP_P] = params.top_p;
            }
            if (typeof params.max_tokens === "number") {
                attributes[SpanAttributes.LLM_REQUEST_MAX_TOKENS] = params.max_tokens;
            }
            if (params.extraAttributes !== undefined &&
                typeof params.extraAttributes === "object") {
                Object.keys(params.extraAttributes).forEach((key) => {
                    attributes[key] = params.extraAttributes[key];
                });
            }
            if (this._shouldSendPrompts()) {
                if (type === "chat") {
                    params.messages.forEach((message, index) => {
                        attributes[`${SpanAttributes.LLM_PROMPTS}.${index}.role`] =
                            message.role;
                        if (typeof message.content === "string") {
                            attributes[`${SpanAttributes.LLM_PROMPTS}.${index}.content`] =
                                message.content || "";
                        }
                        else {
                            attributes[`${SpanAttributes.LLM_PROMPTS}.${index}.content`] =
                                JSON.stringify(message.content);
                        }
                    });
                }
                else {
                    attributes[`${SpanAttributes.LLM_PROMPTS}.0.role`] = "user";
                    attributes[`${SpanAttributes.LLM_PROMPTS}.0.content`] =
                        params.prompt;
                }
            }
        }
        catch (e) {
            this._diag.debug(e);
            (_b = (_a = this._config).exceptionLogger) === null || _b === void 0 ? void 0 : _b.call(_a, e);
        }
        return this.tracer.startSpan(`cerebras.${type}`, {
            kind: SpanKind.CLIENT,
            attributes,
        });
    }
    _streamingWrapPromise(_a) {
        return __asyncGenerator(this, arguments, function* _streamingWrapPromise_1({ span, type, promise, }) {
            var _b, e_1, _c, _d, _e, e_2, _f, _g;
            var _h, _j, _k, _l, _m, _o, _p, _q, _r;
            if (type === "chat") {
                const message = {
                    id: "0",
                    type: "message",
                    role: "assistant",
                    stop_reason: null,
                    stop_sequence: null,
                    usage: { prompt_tokens: 0, completion_tokens: 0 },
                    content: "",
                };
                const result = {
                    id: "0",
                    choices: [
                        {
                            finish_reason: "stop",
                            index: 0,
                            message,
                        },
                    ],
                    created: 0,
                    model: "",
                    object: "chat.completion",
                    system_fingerprint: "",
                    time_info: {},
                    usage: {},
                };
                try {
                    for (var _s = true, _t = __asyncValues(yield __await(promise)), _u; _u = yield __await(_t.next()), _b = _u.done, !_b; _s = true) {
                        _d = _u.value;
                        _s = false;
                        const chunk = _d;
                        yield yield __await(chunk);
                        if (!("error" in chunk)) {
                            try {
                                const text = ((_k = (_j = (_h = chunk.choices) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.delta) === null || _k === void 0 ? void 0 : _k.content) || "";
                                message.content += text;
                            }
                            catch (e) {
                                this._diag.debug(e);
                                (_m = (_l = this._config).exceptionLogger) === null || _m === void 0 ? void 0 : _m.call(_l, e);
                            }
                            if (chunk.usage) {
                                result.usage = chunk.usage;
                            }
                            if (chunk.model) {
                                result.model = chunk.model;
                            }
                            if (chunk.finish_reason) {
                                message.finish_reason = chunk.finish_reason;
                            }
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_s && !_b && (_c = _t.return)) yield __await(_c.call(_t));
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                this._endSpan({ span, type, result });
            }
            else {
                const result = {
                    id: "0",
                    choices: [
                        {
                            finish_reason: "stop",
                            index: 0,
                            text: "",
                        },
                    ],
                    created: 0,
                    model: "",
                    object: "text_completion",
                    system_fingerprint: "",
                    time_info: {},
                    usage: {},
                };
                try {
                    for (var _v = true, _w = __asyncValues(yield __await(promise)), _x; _x = yield __await(_w.next()), _e = _x.done, !_e; _v = true) {
                        _g = _x.value;
                        _v = false;
                        const chunk = _g;
                        yield yield __await(chunk);
                        if (!("error" in chunk)) {
                            try {
                                const text = ((_p = (_o = chunk.choices) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p.text) || "";
                                result.choices[0].text += text;
                            }
                            catch (e) {
                                this._diag.debug(e);
                                (_r = (_q = this._config).exceptionLogger) === null || _r === void 0 ? void 0 : _r.call(_q, e);
                            }
                            if (chunk.usage) {
                                result.usage = chunk.usage;
                            }
                            if (chunk.model) {
                                result.model = chunk.model;
                            }
                            if (chunk.finish_reason) {
                                result.choices[0].finish_reason = chunk.finish_reason;
                            }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (!_v && !_e && (_f = _w.return)) yield __await(_f.call(_w));
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                this._endSpan({ span, type, result });
            }
        });
    }
    _wrapPromise(type, span, promise) {
        return promise
            .then((result) => {
            return new Promise((resolve) => {
                if (type === "chat") {
                    this._endSpan({
                        type,
                        span,
                        result: result,
                    });
                }
                else {
                    this._endSpan({
                        type,
                        span,
                        result: result,
                    });
                }
                resolve(result);
            });
        })
            .catch((error) => {
            return new Promise((_, reject) => {
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error.message,
                });
                span.recordException(error);
                span.end();
                reject(error);
            });
        });
    }
    _endSpan({ span, type, result, }) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            span.setAttribute(SpanAttributes.LLM_RESPONSE_MODEL, result.model);
            if (result.usage) {
                span.setAttribute(SpanAttributes.LLM_USAGE_TOTAL_TOKENS, ((_a = result.usage.prompt_tokens) !== null && _a !== void 0 ? _a : 0) +
                    ((_b = result.usage.completion_tokens) !== null && _b !== void 0 ? _b : 0));
                span.setAttribute(SpanAttributes.LLM_USAGE_COMPLETION_TOKENS, (_c = result.usage.completion_tokens) !== null && _c !== void 0 ? _c : 0);
                span.setAttribute(SpanAttributes.LLM_USAGE_PROMPT_TOKENS, (_d = result.usage.prompt_tokens) !== null && _d !== void 0 ? _d : 0);
            }
            if ((_f = (_e = result.choices) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.finish_reason) {
                span.setAttribute(`${SpanAttributes.LLM_COMPLETIONS}.0.finish_reason`, result.choices[0].finish_reason);
            }
            if (this._shouldSendPrompts()) {
                if (type === "chat") {
                    span.setAttribute(`${SpanAttributes.LLM_COMPLETIONS}.0.role`, "assistant");
                    span.setAttribute(`${SpanAttributes.LLM_COMPLETIONS}.0.content`, result.choices[0].message.content);
                }
                else {
                    span.setAttribute(`${SpanAttributes.LLM_COMPLETIONS}.0.role`, "assistant");
                    span.setAttribute(`${SpanAttributes.LLM_COMPLETIONS}.0.content`, result.choices[0].text || "");
                }
            }
        }
        catch (e) {
            this._diag.debug(e);
            (_h = (_g = this._config).exceptionLogger) === null || _h === void 0 ? void 0 : _h.call(_g, e);
        }
        span.end();
    }
    _shouldSendPrompts() {
        const contextShouldSendPrompts = context
            .active()
            .getValue(CONTEXT_KEY_ALLOW_TRACE_CONTENT);
        if (contextShouldSendPrompts !== undefined) {
            return contextShouldSendPrompts;
        }
        return this._config.traceContent !== undefined
            ? this._config.traceContent
            : true;
    }
}

export { CerebrasInstrumentation };
//# sourceMappingURL=index.mjs.map
