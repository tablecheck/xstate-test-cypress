/// <reference types="cypress" />
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createModel, TestModel } from '@xstate/test';
import {
  AnyEventObject,
  createMachine,
  EventObject,
  MachineConfig,
  MachineOptions,
  StateMachine,
  StatesConfig,
  Typestate
} from 'xstate';
import { Model } from 'xstate/lib/model.types';
import { StateSchema } from 'xstate/lib/types';

function adaptCypressMeta(
  stateConfig: StatesConfig<any, any, any>,
  testMeta?: Partial<TestMetaConfig<any, any>>,
  parentKeyPath = ''
): void {
  Object.keys(stateConfig).forEach((stateKey) => {
    const keyPath = parentKeyPath ? `${parentKeyPath}.${stateKey}` : stateKey;
    const metaTest = testMeta?.[keyPath];
    if (metaTest) {
      stateConfig[stateKey].meta = stateConfig[stateKey].meta || {};
      stateConfig[stateKey].meta.test = (testContext: any) =>
        new Cypress.Promise((resolve) => {
          cy.log(`XState: Test state "${keyPath}"`);
          metaTest(testContext).then(resolve);
        });
    } else if (stateConfig[stateKey].meta?.test) {
      const originalTest = stateConfig[stateKey].meta.test;
      stateConfig[stateKey].meta.test = (testContext: any, state: any) =>
        new Cypress.Promise((resolve) => {
          cy.log(`XState: Test state "${keyPath}"`);
          originalTest(testContext, state).then(resolve);
        });
    } else {
      stateConfig[stateKey].meta = stateConfig[stateKey].meta || {};
      stateConfig[stateKey].meta.test = () =>
        cy.log(`XState: state "${keyPath}"`);
    }
    if (stateConfig[stateKey].states) {
      adaptCypressMeta(stateConfig[stateKey].states!, testMeta, keyPath);
    }
  });
}

interface DoNothingEvent {
  type: 'DO_NOTHING';
}

type TestMetaConfig<TTestContext, TStateSchema extends StateSchema> = {
  [K in keyof TStateSchema['states']]: (
    testContext: TTestContext
  ) => Cypress.Chainable;
};

interface UpdatableCypressMachine<
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
    testMeta?: null | Record<
      string,
      (testContext: TTestContext) => Cypress.Chainable
    >,
    options?: null | Partial<MachineOptions<TContext, TEvent | DoNothingEvent>>
  ): StateMachine<TContext, any, TEvent | DoNothingEvent, TTypestate>;
}

export function createCypressMachine<
  TTestContext = Record<string, any>,
  TEvent extends EventObject = AnyEventObject,
  TContext = Record<never, never>,
  TTypestate extends Typestate<TContext> = {
    value: any;
    context: TContext;
  }
>(
  config: TContext extends Model<any, any, any>
    ? never
    : MachineConfig<TContext, any, TEvent | DoNothingEvent>,
  // Technically there is a way of properly typing this, but the state schema in config can't be inferred
  // see https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object
  testMeta?: Record<string, (testContext: TTestContext) => Cypress.Chainable>,
  options?: Partial<MachineOptions<TContext, TEvent | DoNothingEvent>>
): UpdatableCypressMachine<TTestContext, TEvent, TContext, TTypestate> {
  if (config.states) {
    adaptCypressMeta(config.states, testMeta);
  }
  const result = createMachine<TContext, TEvent | DoNothingEvent, TTypestate>(
    config,
    options
  ) as UpdatableCypressMachine<TTestContext, TEvent, TContext, TTypestate>;
  result.update = (newTestMeta, newOptions) =>
    createCypressMachine<TTestContext, TEvent, TContext, TTypestate>(
      config,
      newTestMeta === null ? undefined : newTestMeta || testMeta,
      newOptions === null ? undefined : newOptions || options
    );
  return result;
}

export interface EventCase {
  type?: never;
  [prop: string]: any;
}

type CypressEventExecutor<TTestContext, TEventCase> = (
  /**
   * The testing context used to execute the effect
   */
  testContext: TTestContext,
  /**
   * The represented event that will be triggered when executed
   */
  event: TEventCase
) => Cypress.Chainable<any>;
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

export function createCypressModel<
  TMachine extends UpdatableCypressMachine<any, any, any, any>,
  TTestContext = TMachine extends UpdatableCypressMachine<
    infer TContext,
    any,
    any,
    any
  >
    ? TContext
    : never
>(
  machine: TMachine,
  eventMap: CypressTestEventsConfig<TTestContext>
): TestModel<TTestContext, any> {
  const cypressEventMap: TestModel<TTestContext, any>['options']['events'] = {};
  machine.events.forEach((eventKey) => {
    const eventLog = () => cy.log(`XState: Trigger Event "${eventKey}"`);
    if (eventKey === 'DO_NOTHING') {
      cypressEventMap[eventKey] = () =>
        new Cypress.Promise((resolve) => {
          cy.log(`XState: Event "${eventKey}"`).then(resolve);
        });
    } else if (!eventMap[eventKey]) {
      cypressEventMap[eventKey] = () =>
        new Cypress.Promise((resolve) => {
          cy.log(`XState: Unhandled Event "${eventKey}"`).then(resolve);
        });
    } else if (typeof eventMap[eventKey] === 'function') {
      const executor = eventMap[eventKey] as CypressEventExecutor<
        TTestContext,
        EventCase
      >;
      cypressEventMap[eventKey] = (testContext, event) =>
        new Cypress.Promise((resolve) => {
          eventLog();
          const result = executor(testContext, event as unknown as EventCase);
          if (!result) resolve();
          else result.then(resolve);
        });
    } else if (
      typeof eventMap[eventKey] === 'object' &&
      typeof (
        eventMap[eventKey] as CypressTestEventConfig<TTestContext, EventCase>
      ).exec === 'function'
    ) {
      const executorConfig = eventMap[eventKey] as CypressTestEventConfig<
        TTestContext,
        EventCase
      >;
      cypressEventMap[eventKey] = {
        ...executorConfig,
        exec: (testContext, event) =>
          new Cypress.Promise((resolve) => {
            eventLog();
            const result = executorConfig.exec(
              testContext,
              event as unknown as EventCase
            );
            if (!result) resolve();
            else result.then(resolve);
          })
      };
    }
  });
  return createModel<TTestContext, any>(machine).withEvents(cypressEventMap);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
