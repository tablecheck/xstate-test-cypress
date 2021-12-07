/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AnyEventObject,
  EventObject,
  MachineOptions,
  StateMachine,
  Typestate
} from 'xstate';
import { StateSchema } from 'xstate/lib/types';

export type { Model } from 'xstate/lib/model.types';

export interface DoNothingEvent {
  type: 'DO_NOTHING';
}
export interface TestMetaFunction<TTestContext> {
  (testContext: TTestContext): any;
}
export type TestMetaConfig<TTestContext, TStateSchema extends StateSchema> = {
  [K in keyof TStateSchema['states']]: TestMetaFunction<TTestContext>;
};

export interface UpdatableCypressMachine<
  TTestContext = Record<string, any>,
  TEvent extends EventObject = AnyEventObject,
  TContext = Record<never, never>,
  TTypestate extends Typestate<TContext> = {
    value: any;
    context: TContext;
  }
> extends StateMachine<TContext, any, TEvent | DoNothingEvent, TTypestate> {
  /**
   * Pass null if you want to clear the option completely, otherwise it will default to the original value
   * @param testMeta
   * @param options
   */
  update(
    testMeta?: null | Record<string, TestMetaFunction<TTestContext>>,
    options?: null | Partial<MachineOptions<TContext, TEvent | DoNothingEvent>>
  ): StateMachine<TContext, any, TEvent | DoNothingEvent, TTypestate>;
}

export interface EventCase {
  type?: never;
  [prop: string]: any;
}

export type CypressEventExecutor<TTestContext, TEventCase> = (
  /**
   * The testing context used to execute the effect
   */
  testContext: TTestContext,
  /**
   * The represented event that will be triggered when executed
   */
  event: TEventCase
) => ReturnType<TestMetaFunction<TTestContext>>;
export interface CypressTestEventConfig<TTestContext, TEventCase = EventCase> {
  /**
   * Executes an effect that triggers the represented event.
   *
   * @example
   *
   * ```js
   * exec: async (page, event) => {
   *   await page.type('.foo', event.value);
   * }
   * ```
   */
  exec: CypressEventExecutor<TTestContext, TEventCase>;
  /**
   * Sample event object payloads _without_ the `type` property.
   *
   * @example
   *
   * ```js
   * cases: [
   *   { value: 'foo' },
   *   { value: '' }
   * ]
   * ```
   */
  cases: TEventCase[];
}
export interface CypressTestEventsConfig<TTestContext> {
  [eventType: string]:
    | CypressEventExecutor<TTestContext, never>
    | CypressTestEventConfig<TTestContext>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
