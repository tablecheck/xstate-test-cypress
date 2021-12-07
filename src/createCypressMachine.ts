/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AnyEventObject,
  createMachine,
  EventObject,
  MachineConfig,
  MachineOptions,
  StatesConfig,
  Typestate
} from 'xstate';

import {
  DoNothingEvent,
  TestMetaConfig,
  UpdatableCypressMachine,
  Model,
  TestMetaFunction
} from './types';

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
      stateConfig[stateKey].meta.test = (testContext: any) => {
        cy.log(`XState: Test state "${keyPath}"`);
        metaTest(testContext);
      };
    } else if (stateConfig[stateKey].meta?.test) {
      const originalTest = stateConfig[stateKey].meta.test;
      stateConfig[stateKey].meta.test = (testContext: any, state: any) => {
        cy.log(`XState: Test state "${keyPath}"`);
        originalTest(testContext, state);
      };
    } else {
      stateConfig[stateKey].meta = stateConfig[stateKey].meta || {};
      stateConfig[stateKey].meta.test = () => {
        cy.log(`XState: state "${keyPath}"`);
      };
    }
    if (stateConfig[stateKey].states) {
      adaptCypressMeta(stateConfig[stateKey].states!, testMeta, keyPath);
    }
  });
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
  config: TContext extends Model<any, any, any, any>
    ? never
    : MachineConfig<TContext, any, TEvent | DoNothingEvent>,
  // Technically there is a way of properly typing this, but the state schema in config can't be inferred
  // see https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object
  testMeta?: Record<string, TestMetaFunction<TTestContext>>,
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
/* eslint-enable @typescript-eslint/no-explicit-any */
