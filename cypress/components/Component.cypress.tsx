import { mount } from '@cypress/react';

import {
  createCypressMachine,
  createCypressModel,
  simpleExecutePlan,
  checkCoverage
} from '../../src';

import { happyMachine, Component } from './Component';

interface TestContext {
  sadText: string;
  happyText: string;
}

const testMeta = {
  sad: (testContext: TestContext) =>
    cy.get('button').should('have.text', testContext.sadText),
  happy: (testContext: TestContext) =>
    cy.get('button').should('have.text', testContext.happyText)
};

const basicModel = createCypressModel(
  createCypressMachine(happyMachine.config, testMeta),
  {
    TOGGLE: () => cy.get('button').click()
  }
);

context('basic machine', () => {
  beforeEach(() => {
    mount(<Component happyLabel="happy" sadLabel="sad" />);
  });
  simpleExecutePlan(basicModel.getSimplePathPlans(), () => ({
    sadText: 'sad',
    happyText: 'happy'
  }));
  checkCoverage(basicModel);
});

const propsTestModel = createCypressModel(
  createCypressMachine(
    {
      initial: 'init',
      states: {
        init: { on: { INIT: 'sad' } },
        sad: { on: { TOGGLE: 'happy' } },
        happy: {}
      }
    },
    testMeta
  ),
  {
    INIT: {
      cases: [{ prefix: 'one' }, { prefix: 'two' }],
      exec: (testContext, event) => {
        testContext.happyText = `${event.prefix} => happy`;
        testContext.sadText = `${event.prefix} => sad`;
        mount(
          <Component
            happyLabel={testContext.happyText}
            sadLabel={testContext.sadText}
          />
        );
        return cy.get('button').should('exist');
      }
    },
    TOGGLE: () => cy.get('button').click()
  }
);

context('mount in machine step', () => {
  simpleExecutePlan(propsTestModel.getSimplePathPlans());
  checkCoverage(propsTestModel);
});
