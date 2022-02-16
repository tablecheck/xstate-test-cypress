/* eslint-disable @typescript-eslint/no-explicit-any */
import { createModel, TestModel } from '@xstate/test';

import {
  CypressEventExecutor,
  CypressTestEventConfig,
  CypressTestEventsConfig,
  EventCase,
  UpdatableCypressMachine,
  UpdateableCypressModel
} from './types';

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
): UpdateableCypressModel<TTestContext> {
  const cypressEventMap: TestModel<TTestContext, any>['options']['events'] = {};
  machine.events.forEach((eventKey) => {
    const eventLog = () => cy.log(`XState: Trigger Event "${eventKey}"`);
    if (eventKey === 'DO_NOTHING') {
      cypressEventMap[eventKey] = () => {
        cy.log(`XState: Event "${eventKey}"`);
      };
    } else if (!eventMap[eventKey]) {
      cypressEventMap[eventKey] = () => {
        cy.log(`XState: Unhandled Event "${eventKey}"`);
      };
    } else if (typeof eventMap[eventKey] === 'function') {
      const executor = eventMap[eventKey] as CypressEventExecutor<
        TTestContext,
        EventCase
      >;
      cypressEventMap[eventKey] = (testContext, event) => {
        eventLog();
        executor(testContext, event as unknown as EventCase);
      };
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
        exec: (testContext, event) => {
          eventLog();
          executorConfig.exec(testContext, event as unknown as EventCase);
        }
      };
    }
  });
  const result = createModel<TTestContext, any>(machine).withEvents(
    cypressEventMap
  ) as UpdateableCypressModel<TTestContext>;
  result.update = <TNewTestContext = TTestContext>(
    newTestMeta: any,
    newTestEvents: any
  ) =>
    createCypressModel<TMachine, TNewTestContext>(
      machine.update<TNewTestContext>(newTestMeta) as TMachine,
      newTestEvents || eventMap
    );
  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
