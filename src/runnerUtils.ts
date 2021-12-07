/// <reference types="cypress" />
/* eslint-disable jest/no-export, jest/valid-title, jest/expect-expect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestModel } from '@xstate/test';

export function simpleExecutePlan<TTestContext>(
  plans: ReturnType<TestModel<TTestContext, any>['getTestPlans']>,
  setupFunction?: () =>
    | Cypress.Chainable<void | TTestContext>
    | TTestContext
    | void
): void {
  plans.forEach((plan) => {
    describe(plan.description, () => {
      plan.paths.forEach((path) => {
        it(path.description, () =>
          cy
            .wrap(setupFunction?.())
            .then((maybeContext) =>
              path.test((maybeContext || {}) as TTestContext)
            )
        );
      });
    });
  });
}

export function checkCoverage(model: TestModel<any, any>): void {
  describe('check coverage', () => {
    it('should cover all machine nodes', () => {
      model.testCoverage();
    });
  });
}
/* eslint-enable jest/no-export, jest/valid-title, jest/expect-expect */
/* eslint-enable @typescript-eslint/no-explicit-any */
